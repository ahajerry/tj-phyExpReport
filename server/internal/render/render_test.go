package render

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"regexp"
	"strings"
	"testing"
)

func TestAllTemplates(t *testing.T) {
	b, e := os.ReadFile("../../testdata/calculations.json")
	if e != nil {
		t.Fatal(e)
	}
	var cases []struct {
		Name    string
		Payload domain.Payload
	}
	if e = json.Unmarshal(b, &cases); e != nil {
		t.Fatal(e)
	}
	dir := "../../../tex/templates"
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			f, p, e := experiments.Calculate(c.Payload)
			if e != nil {
				t.Fatal(e)
			}
			source, e := Template(dir, p, f)
			if e != nil {
				t.Fatal(e)
			}
			if p.ExperimentID == "millikan" {
				for _, title := range []string{"7.1 静态平衡法", "表 8.3.2", "（1）模糊统计法", "（2）反向验证法", "（3）图解法", "（4）最小二乘法"} {
					if !strings.Contains(source, title) {
						t.Errorf("missing lecture content %s", title)
					}
				}
				if strings.Contains(source, "$t_5$") || strings.Contains(source, "charge_per_e_") {
					t.Fatal("extra table column")
				}
				for i := 1; i <= 8; i++ {
					if !strings.Contains(source, fmt.Sprintf("{voltage_%02d}", i)) {
						t.Errorf("missing drop %d", i)
					}
				}
				if !strings.Contains(source, `\PlotCoordinates{charge_graph_points}`) || f["charge_graph_points"] == "" {
					t.Fatal("missing graph data")
				}
			}
			if p.ExperimentID == "focal-length" {
				for _, key := range []string{"single_object", "single_lens", "single_image", "bessel_object", "bessel_image", "bessel_lens_large", "bessel_lens_small", "auto_object", "auto_lens"} {
					for _, row := range []struct {
						index string
						count int
					}{{"03", 3}, {"04", 4}, {"05", 5}} {
						marker := `\Field[10mm]{` + key + "_" + row.index + "}"
						if strings.Contains(source, marker) != (len(p.Data[key]) >= row.count) {
							t.Errorf("table row %s does not match reading count", marker)
						}
					}
				}
				if strings.Contains(source, "凹透镜") || strings.Contains(source, "concave") {
					t.Fatal("removed concave experiment remains in template")
				}
			}
			if p.ExperimentID == "moment-of-inertia" {
				for _, title := range []string{"7. 数据记录与处理", "表 3.5.1", "表 3.5.2"} {
					if !strings.Contains(source, title) {
						t.Errorf("missing lecture table heading %s", title)
					}
				}
				// Each merged object block must still include all three
				// period readings and all available raw geometry readings.
				for _, object := range []string{"disk", "cylinder", "tube", "ball", "rod"} {
					for _, index := range []string{"01", "02", "03"} {
						if !strings.Contains(source, "{period_"+object+"_"+index+"}") {
							t.Errorf("missing raw period %s %s", object, index)
						}
					}
				}
				for geometry := range p.Geometry {
					for _, index := range []string{"01", "02", "03"} {
						if !strings.Contains(source, "{geometry_"+geometry+"_"+index+"}") {
							t.Errorf("missing raw geometry %s %s", geometry, index)
						}
					}
				}
			}
			tex, e := Fill(source, f, p, nil)
			if e != nil {
				t.Fatal(e)
			}
			if p.ExperimentID == "millikan" {
				for _, key := range []string{"electron_charge_reverse_u95", "electron_charge_ls_u95"} {
					if !strings.Contains(tex, `\SetField{math_`+key+`}{`+mathNumber(f[key])+`}`) || f[key] == "" {
						t.Errorf("missing filled lecture uncertainty %s", key)
					}
				}
			}
			if p.ExperimentID == "heat-capacity-ratio" || p.ExperimentID == "focal-length" || p.ExperimentID == "moment-of-inertia" {
				for _, match := range regexp.MustCompile(`\\(?:MathField|Field)(?:\[[^\]]*\])?\{([^}]+)\}`).FindAllStringSubmatch(source, -1) {
					key := match[1]
					if key == "experiment" || key == "student" || key == "student_id" || key == "group" || key == "date" {
						continue
					}
					// Legacy torsion payloads only contain mean dimensions, not raw geometry.
					if p.ExperimentID == "moment-of-inertia" && strings.HasPrefix(key, "geometry_") && len(p.Geometry) == 0 {
						continue
					}
					if _, ok := f[key]; !ok {
						t.Errorf("uncomputed %s field %s", p.ExperimentID, key)
					}
				}
			}
			if strings.Contains(tex, `\PlotCoordinates{`) || strings.Contains(tex, imageMarker) {
				t.Fatal("unfilled marker")
			}
			if os.Getenv("REPORT_TEST_PDF") == "1" {
				r := Renderer{TemplateDir: dir, WorkDir: t.TempDir()}
				r.TemplateDir, _ = filepath.Abs(dir)
				pdf, e := r.Render(context.Background(), p, filepath.Join(t.TempDir(), "absent"), func(int, string) {})
				if e != nil {
					t.Fatal(e)
				}
				if !strings.HasPrefix(string(pdf), "%PDF-") {
					t.Fatal("invalid PDF")
				}
			}
		})
	}
}
func TestTeXEscape(t *testing.T) {
	s := escape(`a\input{x}&%$_~^`)
	if strings.Contains(s, `a\input`) || !strings.Contains(s, `\textbackslash{}`) {
		t.Fatal(s)
	}
	if mathNumber("1.20e-19") != `1.20\times 10^{-19}` {
		t.Fatal("scientific notation")
	}
	if mathNumber(`\input{x}`) != "" {
		t.Fatal("math injection")
	}
}
