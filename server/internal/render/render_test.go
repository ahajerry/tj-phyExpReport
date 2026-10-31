package render

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"reflect"
	"regexp"
	"strings"
	"testing"
	"time"
)

func TestAllTemplates(t *testing.T) {
	b, err := os.ReadFile("../../testdata/calculations.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name    string
		Payload domain.Payload
	}
	if err = json.Unmarshal(b, &cases); err != nil {
		t.Fatal(err)
	}
	dir, _ := filepath.Abs("../../../typst/templates")
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			fields, p, err := experiments.Calculate(c.Payload)
			if err != nil {
				t.Fatal(err)
			}
			source, err := os.ReadFile(filepath.Join(dir, p.ExperimentID+".typ"))
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Contains(source, []byte("#cover()")) || !bytes.Contains(source, []byte("#records()")) {
				t.Fatal("missing cover or original records")
			}
			checkTemplateContent(t, string(source), p, fields)
			data, err := DataJSON(fields, p, nil)
			if err != nil {
				t.Fatal(err)
			}
			var decoded templateData
			if err = json.Unmarshal(data, &decoded); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(fields, decoded.Fields) || !reflect.DeepEqual(p.Data, decoded.Data) {
				t.Fatal("renderer changed the calculation/reading text")
			}
			for _, key := range plotFields[p.ExperimentID] {
				if len(decoded.Plots[key]) == 0 {
					t.Fatalf("missing plot %s", key)
				}
			}
			if os.Getenv("REPORT_TEST_PDF") != "1" {
				return
			}
			r := Renderer{TemplateDir: dir, WorkDir: t.TempDir(), FontDir: os.Getenv("REPORT_FONT_DIR")}
			artifacts, err := r.Render(context.Background(), p, filepath.Join(t.TempDir(), "absent"), func(int, string) {})
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.HasPrefix(artifacts.PDF, []byte("%PDF-")) {
				t.Fatal("invalid PDF")
			}
			archive, err := zip.NewReader(bytes.NewReader(artifacts.SourceZIP), int64(len(artifacts.SourceZIP)))
			if err != nil {
				t.Fatal(err)
			}
			files := map[string][]byte{}
			for _, file := range archive.File {
				if !filepath.IsLocal(file.Name) || strings.Contains(file.Name, "\\") {
					t.Fatal("unsafe archive path")
				}
				if strings.HasSuffix(file.Name, ".pdf") || strings.HasSuffix(file.Name, ".log") {
					t.Fatal("non-source artifact in ZIP")
				}
				reader, err := file.Open()
				if err != nil {
					t.Fatal(err)
				}
				content, err := io.ReadAll(reader)
				reader.Close()
				if err != nil {
					t.Fatal(err)
				}
				files[file.Name] = content
			}
			if !bytes.Equal(files["report.typ"], source) || !bytes.Equal(files["data.json"], data) {
				t.Fatal("ZIP is not the compiled input snapshot")
			}
			if len(files["tongji_logo.jpeg"]) == 0 || len(files["base.typ"]) == 0 || len(files["README.md"]) == 0 {
				t.Fatal("incomplete source bundle")
			}
			if output := os.Getenv("REPORT_TEST_OUTPUT"); output != "" {
				out := filepath.Join(output, c.Name)
				if err := os.MkdirAll(out, 0700); err != nil {
					t.Fatal(err)
				}
				for name, b := range files {
					path := filepath.Join(out, name)
					if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
						t.Fatal(err)
					}
					if err := os.WriteFile(path, b, 0600); err != nil {
						t.Fatal(err)
					}
				}
				if err := os.WriteFile(filepath.Join(out, "report.pdf"), artifacts.PDF, 0600); err != nil {
					t.Fatal(err)
				}
			}
		})
	}
}

// Preserve the previous report-content regressions across the engine change:
// a successful compile alone cannot detect a misspelled, silently blank field.
func checkTemplateContent(t *testing.T, source string, p domain.Payload, fields map[string]string) {
	t.Helper()
	require := func(marker string) {
		if !strings.Contains(source, marker) {
			t.Errorf("missing report content: %s", marker)
		}
	}
	if p.ExperimentID == "millikan" {
		for _, heading := range []string{"7.1 静态平衡法", "表 8.3.2", "（1）模糊统计法", "（2）反向验证法", "（3）图解法", "（4）最小二乘法"} {
			require(heading)
		}
		for _, index := range []string{"01", "02", "03", "04", "05", "06", "07", "08"} {
			require(`f("voltage_` + index + `")`)
		}
		for _, key := range []string{"electron_charge_reverse_u95", "electron_charge_ls_u95"} {
			require(`mf("` + key + `")`)
			if fields[key] == "" {
				t.Errorf("missing uncertainty %s", key)
			}
		}
		if strings.Contains(source, "charge_per_e_") || strings.Contains(source, "$t _(5)$") {
			t.Fatal("removed oil-drop column remains")
		}
	}
	if p.ExperimentID == "moment-of-inertia" {
		for _, heading := range []string{"7. 数据记录与处理", "表 3.5.1", "表 3.5.2"} {
			require(heading)
		}
		for _, object := range []string{"disk", "cylinder", "tube", "ball", "rod"} {
			for _, index := range []string{"01", "02", "03"} {
				require(`f("period_` + object + `_` + index + `")`)
			}
		}
		for geometry := range p.Geometry {
			for _, index := range []string{"01", "02", "03"} {
				require(`f("geometry_` + geometry + `_` + index + `")`)
			}
		}
	}
	if p.ExperimentID == "focal-length" {
		for key, values := range p.Data {
			if len(values) == 3 {
				require(`f("` + key + `_03")`)
			}
		}
		if strings.Contains(source, "凹透镜") || strings.Contains(source, "concave") {
			t.Fatal("removed concave experiment remains")
		}
	}
	if p.ExperimentID == "heat-capacity-ratio" || p.ExperimentID == "focal-length" || p.ExperimentID == "moment-of-inertia" {
		for _, match := range regexp.MustCompile(`#m?f\("([a-z][a-z0-9_]*)"\)`).FindAllStringSubmatch(source, -1) {
			key := match[1]
			if strings.HasPrefix(key, "geometry_") && len(p.Geometry) == 0 {
				continue // Old inputs did not record the three raw dimensions.
			}
			if _, exists := fields[key]; !exists {
				t.Errorf("uncomputed report field: %s", key)
			}
		}
	}
}

func TestDataBoundaryAndTablePresentation(t *testing.T) {
	attack := `#read("/etc/passwd") [*] \\ ${name}`
	fields := map[string]string{"student": attack, "reading": "1.200", "result": "1.20e-19"}
	table := domain.Table{Title: attack, Headers: []string{"Uc", "U", "t", "Q"}, Rows: [][]string{{"1.00", "2.00", "3.00", ""}}}
	p := domain.Payload{ExperimentID: "oscilloscope", SourceTables: []domain.Table{table}}
	data, err := DataJSON(fields, p, []string{"original_01.jpg"})
	if err != nil {
		t.Fatal(err)
	}
	var decoded templateData
	if err = json.Unmarshal(data, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Fields["student"] != attack || decoded.Fields["reading"] != "1.200" || decoded.Tables[0].Title != attack {
		t.Fatal("data changed")
	}
	p.ExperimentID = "millikan"
	fields["charge_graph_points"] = "(1,2)"
	fields["charge_graph_fit_points"] = "(1,2) (2,4)"
	data, err = DataJSON(fields, p, nil)
	if err != nil {
		t.Fatal(err)
	}
	json.Unmarshal(data, &decoded)
	if len(decoded.Tables[0].Headers) != 3 || len(p.SourceTables[0].Headers) != 4 {
		t.Fatal("empty charge hiding changed source data")
	}
	p.SourceTables[0].Rows[0][3] = "1.00e-19"
	data, err = DataJSON(fields, p, nil)
	if err != nil {
		t.Fatal(err)
	}
	json.Unmarshal(data, &decoded)
	if len(decoded.Tables[0].Headers) != 4 {
		t.Fatal("nonempty charge hidden")
	}
	for _, invalid := range []string{"", "(1,2) #eval(42)", "(NaN,2)", "(1e9999,2)", "(1,2,3)"} {
		if _, err := parsePoints(invalid); err == nil {
			t.Fatalf("accepted %q", invalid)
		}
	}
}

func TestSourceZIPIsolationAndCancellation(t *testing.T) {
	work := t.TempDir()
	os.WriteFile(filepath.Join(work, "report.typ"), []byte("test"), 0600)
	os.WriteFile(filepath.Join(work, "report.pdf"), []byte("private output"), 0600)
	b, err := sourceZIP(context.Background(), work, []string{"report.typ"})
	if err != nil {
		t.Fatal(err)
	}
	z, err := zip.NewReader(bytes.NewReader(b), int64(len(b)))
	if err != nil {
		t.Fatal(err)
	}
	if len(z.File) != 1 || z.File[0].Name != "report.typ" {
		t.Fatal("unexpected archive entries")
	}
	if _, err := sourceZIP(context.Background(), work, []string{"../outside"}); err == nil {
		t.Fatal("path traversal")
	}
	os.Symlink("report.pdf", filepath.Join(work, "link"))
	if _, err := sourceZIP(context.Background(), work, []string{"link"}); err == nil {
		t.Fatal("symlink accepted")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := sourceZIP(ctx, work, []string{"report.typ"}); err == nil {
		t.Fatal("cancellation ignored")
	}
}

func TestTypstProjectRoot(t *testing.T) {
	if os.Getenv("REPORT_TEST_PDF") != "1" {
		t.Skip("requires Typst")
	}
	outer := t.TempDir()
	work := filepath.Join(outer, "project")
	os.Mkdir(work, 0700)
	os.WriteFile(filepath.Join(outer, "secret"), []byte("synthetic private data"), 0600)
	os.WriteFile(filepath.Join(work, "report.typ"), []byte(`#read("../secret")`), 0600)
	if _, err := run(context.Background(), work, 10*time.Second, "typst", "compile", "--root", work, "report.typ", "report.pdf"); err == nil {
		t.Fatal("project root escape")
	}
}

func TestCompilerWarningsPreventPublication(t *testing.T) {
	if os.Getenv("REPORT_TEST_PDF") != "1" {
		t.Skip("requires Typst and report fonts")
	}
	b, err := os.ReadFile("../../testdata/calculations.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct{ Payload domain.Payload }
	if err = json.Unmarshal(b, &cases); err != nil {
		t.Fatal(err)
	}
	p := cases[0].Payload
	templates := t.TempDir()
	// A missing font produces a PDF and exit code 0. It must still be rejected
	// instead of silently publishing a report in a different font.
	for name, content := range map[string]string{
		p.ExperimentID + ".typ": "#set text(font: \"Missing Report Font Regression Test\")\nReport",
		"base.typ":              "", "charts.typ": "", "README.md": "",
	} {
		if err := os.WriteFile(filepath.Join(templates, name), []byte(content), 0600); err != nil {
			t.Fatal(err)
		}
	}
	r := Renderer{TemplateDir: templates, WorkDir: t.TempDir(), FontDir: os.Getenv("REPORT_FONT_DIR")}
	artifacts, err := r.Render(context.Background(), p, filepath.Join(t.TempDir(), "absent"), func(int, string) {})
	if err == nil || !strings.Contains(err.Error(), "unknown font family") {
		t.Fatalf("expected compiler warning to fail rendering, got %v", err)
	}
	if len(artifacts.PDF) != 0 || len(artifacts.SourceZIP) != 0 {
		t.Fatal("artifacts published despite a compiler warning")
	}
}

func TestLiteralUserTextAndIntegerReadings(t *testing.T) {
	if os.Getenv("REPORT_TEST_PDF") != "1" {
		t.Skip("requires Typst and report fonts")
	}
	b, err := os.ReadFile("../../testdata/calculations.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct{ Payload domain.Payload }
	if err = json.Unmarshal(b, &cases); err != nil {
		t.Fatal(err)
	}
	p := cases[0].Payload
	p.Data["nx"] = []domain.Scalar{"1.00", "2e0", "3.0", "3"}
	p.Data["ny"] = []domain.Scalar{"1e0", "1.00", "1", "2.0"}
	attack := `#panic("injected") [*] $x$ \\ 中文 1.200`
	p.ReportInfo = map[string]string{"student": attack}
	p.SourceTables = []domain.Table{{Title: attack, Headers: []string{"读数", "备注"}, Rows: [][]string{{"1.200", attack}}}}
	dir, _ := filepath.Abs("../../../typst/templates")
	r := Renderer{TemplateDir: dir, WorkDir: t.TempDir(), FontDir: os.Getenv("REPORT_FONT_DIR")}
	if _, err := r.Render(context.Background(), p, filepath.Join(t.TempDir(), "absent"), func(int, string) {}); err != nil {
		t.Fatalf("user text must compile literally, without executing markup: %v", err)
	}
}
