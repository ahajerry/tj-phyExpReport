package experiments

import (
	"fmt"
	"strings"
)

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
		place := pair(f, "experiment_"+k, "experiment_"+k+"_u", measured, u)
		f["theory_"+k] = reportAt(expected, place, nil)
		f["error_"+k] = "0"
		if !measured.Equal(expected) {
			f["error_"+k] = percent(div(measured.Sub(expected).Abs(), expected).Mul(n(100)), div(u, expected))
		}
	}
	sm := div(pos(p["slider_mass_g"], "滑块质量"), n(1000))
	si := nonneg(p["slider_self_inertia"], "滑块惯量")
	put(f, "slider_pair_inertia", si.Mul(n(2)))
	points, tp := []string{}, []string{}
	for _, x := range []int{5, 10, 15, 20} {
		suffix := fmt.Sprint(x)
		ts := d["slider_time_"+suffix]
		for _, t := range ts {
			pos(t, "滑块计时")
		}
		t, u := div(mean(ts), n(5)), div(sem(ts), n(5))
		expected := theory["rod"].Add(n(2).Mul(si)).Add(n(2).Mul(sm).Mul(sq(div(n(x), n(100)))))
		measured := div(i1.Mul(sq(t)), diff)
		mu := iu(t, u, false, false)
		points = append(points, point(n(x*x), measured.Mul(n(1000))))
		tp = append(tp, point(n(x*x), expected.Mul(n(1000))))
		pair(f, "slider_period_"+suffix, "slider_period_"+suffix+"_u", t, u)
		place := pair(f, "slider_experiment_"+suffix, "slider_experiment_"+suffix+"_u", measured, mu)
		f["slider_theory_"+suffix] = reportAt(expected, place, nil)
		f["slider_error_"+suffix] = percent(div(measured.Sub(expected).Abs(), expected).Mul(n(100)), div(mu, expected))
	}
	f["slider_graph_points"] = strings.Join(points, " ")
	f["slider_graph_theory_points"] = strings.Join(tp, " ")
}
