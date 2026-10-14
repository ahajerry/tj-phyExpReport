package render

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
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
			tex, e := Fill(source, f, p, nil)
			if e != nil {
				t.Fatal(e)
			}
			if strings.Contains(tex, `\PlotCoordinates{`) || strings.Contains(tex, imageMarker) {
				t.Fatal("unfilled marker")
			}
			if c.Name == "focal-length-optional" && strings.Contains(tex, `\Field{focus_concave`) {
				t.Fatal("optional concave not removed")
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
