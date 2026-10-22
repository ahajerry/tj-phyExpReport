package experiments

import (
	"fmt"
	"strings"
)

// Torsion's grading rule applies only to final values. Preserve trailing zeros
// and round once from the full decimal result, independently of uncertainty.
func torsionSignificant(value D, digits int) string {
	if value.IsZero() {
		return "0"
	}
	rounded := value.RoundBank(int32(digits - 1 - adjusted(value)))
	exponent := adjusted(rounded)
	// Percentages such as 386% become 390%, keeping the table's narrow
	// percentage column readable. The final zero marks the rounded tens.
	if digits == 2 && exponent >= 2 && exponent < 6 {
		return rounded.StringFixedBank(0)
	}
	if exponent < -4 || exponent >= digits {
		return rounded.Shift(int32(-exponent)).StringFixedBank(int32(digits-1)) + fmt.Sprintf("e%+d", exponent)
	}
	return rounded.StringFixedBank(int32(digits - 1 - exponent))
}

func torsion(f map[string]string, d map[string][]D, p map[string]D) {
	periods, us := map[string]D{}, map[string]D{}
	for _, k := range []string{"disk", "cylinder", "tube", "ball", "rod"} {
		ts := d["time_"+k]
		for _, x := range ts {
			pos(x, "计时")
		}
		cycles := 10
		if k == "disk" {
			cycles = 20
		}
		for i, x := range ts {
			f[fmt.Sprintf("period_%s_%02d", k, i+1)] = div(x, n(cycles)).String()
		}
		periods[k] = div(mean(ts), n(cycles))
		us[k] = div(sem(ts), n(cycles))
		pair(f, "period_"+k, "period_"+k+"_u", periods[k], us[k])
	}
	mass := map[string]D{}
	for _, k := range []string{"cylinder", "tube", "ball", "rod"} {
		mass[k] = div(pos(p["mass_"+k+"_g"], "质量"), n(1000))
		put(f, "mass_"+k+"_kg", mass[k])
	}
	for _, k := range []string{"diameter_cylinder_mm", "diameter_tube_outer_mm", "diameter_tube_inner_mm", "diameter_ball_mm", "length_rod_mm"} {
		put(f, strings.Replace(k, "_mm", "_cm", 1), div(p[k], n(10)))
	}
	size := func(k string) D { return div(pos(p[k], "尺寸"), n(1000)) }
	cd, to, ti, bd, rl := size("diameter_cylinder_mm"), size("diameter_tube_outer_mm"), size("diameter_tube_inner_mm"), size("diameter_ball_mm"), size("length_rod_mm")
	if !ti.LessThan(to) {
		fail("圆筒内径必须小于外径")
	}
	theory := map[string]D{"cylinder": div(mass["cylinder"].Mul(sq(cd)), n(8)), "tube": div(mass["tube"].Mul(sq(to).Add(sq(ti))), n(8)), "ball": div(mass["ball"].Mul(sq(bd)), n(10)), "rod": div(mass["rod"].Mul(sq(rl)), n(12))}
	t0, t1, i1 := periods["disk"], periods["cylinder"], theory["cylinder"]
	u0, u1 := us["disk"], us["cylinder"]
	diff := pos(sq(t1).Sub(sq(t0)), "圆柱与圆盘周期平方差")
	kappa := div(n(4).Mul(sq(pi)).Mul(i1), diff)
	ku := kappa.Mul(hypot(div(n(2).Mul(t1).Mul(u1), diff), div(n(2).Mul(t0).Mul(u0), diff)))
	i0 := div(i1.Mul(sq(t0)), diff)
	i0u := hypot(div(n(2).Mul(i1).Mul(t0).Mul(sq(t1)).Mul(u0), sq(diff)), div(n(2).Mul(i1).Mul(t1).Mul(sq(t0)).Mul(u1), sq(diff)))
	pair(f, "torsion_constant", "torsion_constant_u", kappa, ku)
	pair(f, "empty_inertia", "empty_inertia_u", i0, i0u)
	f["torsion_constant"] = torsionSignificant(kappa, 4)
	f["empty_inertia"] = torsionSignificant(i0, 4)
	iu := func(t, u D, standard, disk bool) D {
		if standard {
			return zero
		}
		a := div(n(2).Mul(i1).Mul(t).Mul(u), diff)
		if !disk {
			return hypot(a, div(div(i1.Mul(sq(t)), diff).Mul(ku), kappa))
		}
		return hypot(a, div(n(2).Mul(i1).Mul(t0).Mul(sq(t).Sub(sq(t1))).Mul(u0), sq(diff)), div(n(2).Mul(i1).Mul(t1).Mul(sq(t).Sub(sq(t0))).Mul(u1), sq(diff)))
	}
	for k, expected := range theory {
		disk := k == "cylinder" || k == "tube"
		numerator := sq(periods[k])
		if disk {
			numerator = numerator.Sub(sq(t0))
		}
		measured := div(i1.Mul(numerator), diff)
		u := iu(periods[k], us[k], k == "cylinder", disk)
		pair(f, "experiment_"+k, "experiment_"+k+"_u", measured, u)
		f["experiment_"+k] = torsionSignificant(measured, 4)
		f["theory_"+k] = torsionSignificant(expected, 4)
		f["error_"+k] = torsionSignificant(div(measured.Sub(expected).Abs(), expected).Mul(n(100)), 2)
	}
	// Trial rows use the same calibration as the mean result, with each
	// trial's own period and geometry. Older payloads only have mean sizes.
	sizeAt := func(k, parameter string, i int) D {
		if a := d["size_"+k+"_cm"]; len(a) == 3 {
			return div(a[i], n(100))
		}
		return size(parameter)
	}
	for i := 0; i < 3; i++ {
		suffix := fmt.Sprintf("_%02d", i+1)
		t := div(d["time_disk"][i], n(20))
		f["empty_inertia"+suffix] = torsionSignificant(div(kappa.Mul(sq(t)), n(4).Mul(sq(pi))), 4)
		cd := sizeAt("cylinder", "diameter_cylinder_mm", i)
		to := sizeAt("tube_outer", "diameter_tube_outer_mm", i)
		ti := sizeAt("tube_inner", "diameter_tube_inner_mm", i)
		if !ti.LessThan(to) {
			fail("圆筒每次测量的内径必须小于外径")
		}
		bd := sizeAt("ball", "diameter_ball_mm", i)
		rl := sizeAt("rod", "length_rod_mm", i)
		trialTheory := map[string]D{"cylinder": div(mass["cylinder"].Mul(sq(cd)), n(8)), "tube": div(mass["tube"].Mul(sq(to).Add(sq(ti))), n(8)), "ball": div(mass["ball"].Mul(sq(bd)), n(10)), "rod": div(mass["rod"].Mul(sq(rl)), n(12))}
		for k, expected := range trialTheory {
			t := div(d["time_"+k][i], n(10))
			numerator := sq(t)
			if k == "cylinder" || k == "tube" {
				numerator = numerator.Sub(sq(t0))
			}
			measured := div(i1.Mul(numerator), diff)
			f["theory_"+k+suffix] = torsionSignificant(expected, 4)
			f["experiment_"+k+suffix] = torsionSignificant(measured, 4)
			f["error_"+k+suffix] = torsionSignificant(div(measured.Sub(expected).Abs(), expected).Mul(n(100)), 2)
		}
	}
	sm := div(pos(p["slider_mass_g"], "滑块质量"), n(1000))
	si := nonneg(p["slider_self_inertia"], "滑块惯量")
	f["slider_pair_inertia"] = torsionSignificant(si.Mul(n(2)), 4)
	rodInertia := div(i1.Mul(sq(periods["rod"])), diff)
	points, tp := []string{}, []string{}
	for _, x := range []int{5, 10, 15, 20} {
		suffix := fmt.Sprint(x)
		ts := d["slider_time_"+suffix]
		for _, t := range ts {
			pos(t, "滑块计时")
		}
		t, u := div(mean(ts), n(5)), div(sem(ts), n(5))
		for i, elapsed := range ts {
			f[fmt.Sprintf("slider_period_%s_%02d", suffix, i+1)] = div(elapsed, n(5)).String()
		}
		expected := rodInertia.Add(n(2).Mul(si)).Add(n(2).Mul(sm).Mul(sq(div(n(x), n(100)))))
		measured := div(i1.Mul(sq(t)), diff)
		mu := iu(t, u, false, false)
		points = append(points, point(n(x*x), measured.Mul(n(1000))))
		tp = append(tp, point(n(x*x), expected.Mul(n(1000))))
		pair(f, "slider_period_"+suffix, "slider_period_"+suffix+"_u", t, u)
		pair(f, "slider_experiment_"+suffix, "slider_experiment_"+suffix+"_u", measured, mu)
		f["slider_experiment_"+suffix] = torsionSignificant(measured, 4)
		f["slider_theory_"+suffix] = torsionSignificant(expected, 4)
		f["slider_error_"+suffix] = torsionSignificant(div(measured.Sub(expected).Abs(), expected).Mul(n(100)), 2)
	}
	f["slider_graph_points"] = strings.Join(points, " ")
	f["slider_graph_theory_points"] = strings.Join(tp, " ")
}
