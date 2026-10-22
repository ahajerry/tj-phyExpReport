package experiments

import (
	"fmt"
	"phyexp/server/internal/domain"
	"strings"
	"testing"
)

func TestTorsionTrialRows(t *testing.T) {
	p := domain.Payload{ExperimentID: "moment-of-inertia", Data: map[string][]domain.Scalar{
		"size_cylinder_cm":   {"10.00", "12.00", "8.00"},
		"size_tube_outer_cm": {"12", "12", "12"}, "size_tube_inner_cm": {"10", "10", "10"},
		"size_ball_cm": {"10", "10", "10"}, "size_rod_cm": {"100", "100", "100"},
		"time_disk": {"20", "20", "20"}, "time_cylinder": {"20", "21", "19"},
		"time_tube": {"30", "30", "30"}, "time_ball": {"40", "40", "40"}, "time_rod": {"50", "50", "50"},
		"slider_time_5": {"25", "26", "24"}, "slider_time_10": {"30", "30", "30"},
		"slider_time_15": {"35", "35", "35"}, "slider_time_20": {"40", "40", "40"},
	}, Parameters: map[string]domain.Scalar{
		"mass_cylinder_kg": "1", "mass_tube_kg": "1", "mass_ball_kg": "1", "mass_rod_kg": "1",
		"slider_mass_1_kg": "0.1", "slider_mass_2_kg": "0.2", "slider_pair_inertia_scaled": "1",
	}}
	f, _, err := Calculate(p)
	if err != nil {
		t.Fatal(err)
	}
	// Cylinder mean diameter is 0.1 m: I1=0.00125 kg m²,
	// T0=1 s and T1=2 s. Trial 2 has D=0.12 m and T=2.1 s.
	for key, want := range map[string]string{
		"theory_cylinder_01": "0.001250", "theory_cylinder_02": "0.001800", "theory_cylinder_03": "0.0008000",
		"experiment_cylinder_02": "0.001421", "empty_inertia_01": "0.0004167",
		"experiment_ball_01": "0.006667", "experiment_tube_01": "0.003333",
		"slider_period_5_02": "5.2", "slider_pair_inertia": "0.0001000",
	} {
		if f[key] != want {
			t.Errorf("%s: got %s want %s", key, f[key], want)
		}
	}
	for _, k := range []string{"cylinder", "tube", "ball", "rod"} {
		for i := 1; i <= 3; i++ {
			for _, prefix := range []string{"theory_", "experiment_", "error_"} {
				key := fmt.Sprintf("%s%s_%02d", prefix, k, i)
				if f[key] == "" {
					t.Errorf("missing trial field %s", key)
				}
			}
		}
	}
	// Lecture table 3.5.2 uses measured rod inertia I4=0.00125*25/3,
	// plus (m1+m2)*0.05² and the pair's own inertia 0.0001.
	if !strings.HasPrefix(f["slider_graph_theory_points"], "(25,11.2667)") {
		t.Errorf("parallel-axis reference must use measured I4: %s", f["slider_graph_theory_points"])
	}
	// The displayed inertias coincide at four digits, but their unrounded
	// difference is nonzero. Do not derive the error from displayed strings.
	p.Data["slider_time_5"] = []domain.Scalar{"26.00005", "26.00005", "26.00005"}
	f, _, err = Calculate(p)
	if err != nil {
		t.Fatal(err)
	}
	if f["slider_experiment_5"] != "0.01127" || f["slider_theory_5"] != "0.01127" || f["slider_error_5"] != "0.00038" {
		t.Errorf("premature rounding: I=%s I'=%s error=%s", f["slider_experiment_5"], f["slider_theory_5"], f["slider_error_5"])
	}
}

func TestTorsionSignificantDigits(t *testing.T) {
	for _, c := range []struct {
		value  string
		digits int
		want   string
	}{
		{"0.00013", 4, "0.0001300"}, {"8.139e-5", 4, "8.139e-5"},
		{"0.0012345", 4, "0.001234"}, {"0.0012355", 4, "0.001236"},
		{"9.9995", 4, "10.00"}, {"9999.5", 4, "1.000e+4"},
		{"0.000099995", 4, "0.0001000"}, {"-0.0012345", 4, "-0.001234"},
		{"27.81", 2, "28"}, {"386.1", 2, "390"},
		{"0.0786443", 2, "0.079"}, {"1.04", 2, "1.0"},
		{"0", 2, "0"}, {"0", 4, "0"},
	} {
		if got := torsionSignificant(dec(c.value), c.digits); got != c.want {
			t.Errorf("%s (%d digits): got %s want %s", c.value, c.digits, got, c.want)
		}
	}
}
