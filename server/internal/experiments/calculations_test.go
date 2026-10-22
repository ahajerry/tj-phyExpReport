package experiments

import (
	"encoding/json"
	"github.com/shopspring/decimal"
	"os"
	"phyexp/server/internal/domain"
	"regexp"
	"strings"
	"testing"
)

func TestReferenceCalculations(t *testing.T) {
	b, e := os.ReadFile("../../testdata/calculations.json")
	if e != nil {
		t.Fatal(e)
	}
	var cases []struct {
		Name    string
		Payload domain.Payload
		Fields  map[string]string
	}
	if e = json.Unmarshal(b, &cases); e != nil {
		t.Fatal(e)
	}
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			got, _, e := Calculate(c.Payload)
			if e != nil {
				t.Fatal(e)
			}
			for k, want := range c.Fields {
				v, ok := got[k]
				if !ok {
					t.Errorf("missing %s", k)
					continue
				}
				if v == want {
					continue
				}
				if c.Payload.ExperimentID == "moment-of-inertia" && !strings.HasSuffix(k, "_u") &&
					(k == "torsion_constant" || k == "slider_pair_inertia" || strings.HasPrefix(k, "empty_inertia") ||
						strings.HasPrefix(k, "theory_") || strings.HasPrefix(k, "experiment_") || strings.HasPrefix(k, "error_") ||
						strings.HasPrefix(k, "slider_theory_") || strings.HasPrefix(k, "slider_experiment_") || strings.HasPrefix(k, "slider_error_")) {
					t.Errorf("torsion final precision %s: got %q want %q", k, v, want)
					continue
				}
				// Final result strings must retain the uncertainty's decimal place.
				strict := map[string]string{
					"oscilloscope":        "lissajous_mean_khz lissajous_u_khz",
					"speed-of-sound":      "res_speed res_u_v phase_speed phase_u_v final_speed",
					"heat-capacity-ratio": "gamma_result gamma_uncertainty",
					"millikan":            "electron_charge_reverse electron_charge_reverse_u electron_charge_graph electron_charge_graph_u electron_charge_ls electron_charge_ls_u",
					"moment-of-inertia":   "torsion_constant torsion_constant_u empty_inertia empty_inertia_u experiment_tube experiment_tube_u slider_experiment_5 slider_experiment_5_u",
					"young-modulus":       "young_modulus_pa young_uncertainty_pa",
					"forced-vibration":    "damping_beta_s_inv damping_beta_u_s_inv",
					"focal-length":        "focus_single_mean_mm focus_single_u_mm focus_bessel_mean_mm focus_bessel_u_mm focus_auto_mean_mm focus_auto_u_mm",
				}
				if strings.Contains(" "+strict[c.Payload.ExperimentID]+" ", " "+k+" ") {
					zeroUncertainty := false
					keys := strings.Fields(strict[c.Payload.ExperimentID])
					for i := 0; i+1 < len(keys); i += 2 {
						if k == keys[i] && c.Fields[keys[i+1]] == "0" {
							zeroUncertainty = true
						}
					}
					if !zeroUncertainty {
						t.Errorf("final precision %s: got %q want %q", k, v, want)
						continue
					}
				}
				a, e1 := decimal.NewFromString(v)
				b, e2 := decimal.NewFromString(want)
				if e1 == nil && e2 == nil && a.Equal(b) {
					continue
				}
				if regexp.MustCompile(`^\(`).MatchString(want) {
					nums := regexp.MustCompile(`[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?`)
					a, b := nums.FindAllString(v, -1), nums.FindAllString(want, -1)
					equal := len(a) == len(b)
					for i := range a {
						if i >= len(b) {
							break
						}
						x, e1 := decimal.NewFromString(a[i])
						y, e2 := decimal.NewFromString(b[i])
						if e1 != nil || e2 != nil || !x.Equal(y) {
							equal = false
						}
					}
					if equal {
						continue
					}
				}
				t.Errorf("%s: got %q want %q", k, v, want)
			}
		})
	}
}
func TestPrecision(t *testing.T) {
	for _, c := range [][4]string{{"1.245", ".1", "1.24", "0.10"}, {"1.255", ".1", "1.26", "0.10"}, {"12.345", ".35", "12.3", "0.4"}, {"2.95", ".1", "2.95", "0.10"}} {
		f := map[string]string{}
		finish(f, "v", "u", dec(c[0]), dec(c[1]), false)
		if f["v"] != c[2] || f["u"] != c[3] {
			t.Errorf("%v: %v", c, f)
		}
	}
}

func TestInvalidReferenceInputs(t *testing.T) {
	b, e := os.ReadFile("../../testdata/invalid.json")
	if e != nil {
		t.Fatal(e)
	}
	var cases []struct {
		Name    string
		Payload json.RawMessage
	}
	if e = json.Unmarshal(b, &cases); e != nil {
		t.Fatal(e)
	}
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			p, e := domain.Decode(c.Payload)
			if e == nil {
				_, _, e = Calculate(p)
			}
			if e == nil {
				t.Errorf("accepted invalid payload %s", c.Payload)
			}
		})
	}
}
func TestReferenceImports(t *testing.T) {
	b, e := os.ReadFile("../../testdata/imports.json")
	if e != nil {
		t.Fatal(e)
	}
	var cases []struct {
		File, ExperimentID string
		Editable           domain.Payload
	}
	if e = json.Unmarshal(b, &cases); e != nil {
		t.Fatal(e)
	}
	for _, c := range cases {
		t.Run(c.File, func(t *testing.T) {
			b, e := os.ReadFile("../../testdata/" + c.File)
			if e != nil {
				t.Fatal(e)
			}
			p, e := Import(c.ExperimentID, c.File, b)
			if e != nil {
				t.Fatal(e)
			}
			p, e = Editable(p)
			if e != nil {
				t.Fatal(e)
			}
			if _, _, e = Calculate(p); e != nil {
				t.Fatal(e)
			}
			for k, want := range c.Editable.Data {
				got := p.Data[k]
				if len(got) != len(want) {
					t.Errorf("%s length %d != %d", k, len(got), len(want))
					continue
				}
				for i, w := range want {
					if got[i] == w {
						continue
					}
					a, e1 := decimal.NewFromString(string(got[i]))
					b, e2 := decimal.NewFromString(string(w))
					if e1 != nil || e2 != nil || !a.Equal(b) {
						t.Errorf("%s[%d]: %s != %s", k, i, got[i], w)
					}
				}
			}
			for k, w := range c.Editable.Parameters {
				if p.Parameters[k] != w {
					t.Errorf("parameter %s: %s != %s", k, p.Parameters[k], w)
				}
			}
			for k, w := range c.Editable.ReportInfo {
				if p.ReportInfo[k] != w {
					t.Errorf("cover %s mismatch", k)
				}
			}
		})
	}
}
