package experiments

import (
	"fmt"
	"strings"
)

func young(f map[string]string, d map[string][]D, p map[string]D) {
	nonneg(p["preload_kg"], "预载质量")
	positions, displacements, diffs := []D{}, []D{}, []D{}
	step := pos(p["mass_step_kg"], "质量增量")
	for i, up := range d["load_up"] {
		x := div(up.Add(d["load_down"][i]), n(2))
		positions = append(positions, x)
		put(f, fmt.Sprintf("load_mean_%02d", i+1), x)
		put(f, fmt.Sprintf("load_mass_%02d", i+1), n(i).Mul(step))
	}
	for i, x := range positions {
		v := x.Sub(positions[0]).Abs()
		if i > 0 && !v.GreaterThan(displacements[i-1]) {
			fail("标尺位移应随载荷严格增大")
		}
		displacements = append(displacements, v)
		put(f, fmt.Sprintf("load_displacement_%02d", i+1), v)
	}
	for i := 0; i < 5; i++ {
		diffs = append(diffs, positions[i+5].Sub(positions[i]).Abs())
	}
	l := div(pos(mean(diffs), "逐差位移"), n(100))
	for _, x := range d["diameter"] {
		pos(x, "金属丝净直径")
	}
	dm := mean(d["diameter"])
	diam := div(dm, n(1000))
	length := div(pos(p["wire_length_cm"], "金属丝长度"), n(100))
	distance := div(pos(p["mirror_distance_cm"], "镜尺距离"), n(100))
	arm := div(pos(p["lever_arm_cm"], "光杠杆臂长"), n(100))
	gravity := pos(p["gravity_ms2"], "重力加速度")
	reference := pos(p["reference_modulus_pa"], "参考模量")
	factor := div(n(8).Mul(length).Mul(distance).Mul(gravity), pi.Mul(sq(diam)).Mul(arm))
	result := div(factor.Mul(n(5)).Mul(step), l)
	da := dec("1.14").Mul(sem(d["diameter"]))
	db := div(nonneg(p["diameter_error_mm"], "测微计误差"), sqrt(n(3)))
	du := hypot(da, db)
	la := dec("1.14").Mul(sem(diffs))
	lb := div(nonneg(p["scale_error_cm"], "逐差误差"), sqrt(n(3)))
	lu := hypot(la, lb)
	rd, rl := div(du, dm), div(lu, mean(diffs))
	rlen, rdist, rarm := div(dec(".1"), p["wire_length_cm"]), div(dec(".2"), p["mirror_distance_cm"]), div(dec(".02"), p["lever_arm_cm"])
	relative := hypot(rlen, rdist, rarm, n(2).Mul(rd), rl)
	dsum, lsum := zero, zero
	for i, x := range d["diameter"] {
		v := sq(x.Sub(dm))
		dsum = dsum.Add(v)
		put(f, fmt.Sprintf("diameter_%02d", i+1), x)
		f[fmt.Sprintf("diameter_square_%02d", i+1)] = v.Mul(dec("1e6")).String()
	}
	for i, x := range diffs {
		v := sq(x.Sub(mean(diffs)))
		lsum = lsum.Add(v)
		put(f, fmt.Sprintf("difference_square_%02d", i), v)
	}
	f["diameter_square_sum"] = dsum.Mul(dec("1e6")).String()
	put(f, "difference_square_sum", lsum)
	put(f, "difference_mass_kg", n(5).Mul(step))
	masses := []D{}
	for i := 0; i < 10; i++ {
		masses = append(masses, n(i).Mul(step))
	}
	xb, yb := mean(displacements), mean(masses)
	sxx, sxy := zero, zero
	for i, x := range displacements {
		sxx = sxx.Add(sq(x.Sub(xb)))
		sxy = sxy.Add(x.Sub(xb).Mul(masses[i].Sub(yb)))
	}
	slope := pos(div(sxy, sxx), "图解法斜率")
	intercept := yb.Sub(slope.Mul(xb))
	low, high := displacements[0], displacements[9]
	a, b := low.Add(high.Sub(low).Mul(dec(".1"))), low.Add(high.Sub(low).Mul(dec(".9")))
	ay, by := intercept.Add(slope.Mul(a)), intercept.Add(slope.Mul(b))
	graphResult := factor.Mul(slope).Mul(n(100))
	points := []string{}
	for i, x := range displacements {
		points = append(points, point(x, masses[i]))
	}
	f["young_graph_points"] = strings.Join(points, " ")
	f["young_graph_line"] = point(low, intercept.Add(slope.Mul(low))) + " " + point(high, intercept.Add(slope.Mul(high)))
	f["young_graph_a"], f["young_graph_b"] = point(a, ay), point(b, by)
	for k, x := range map[string]D{"graph_a_l": a, "graph_a_m": ay, "graph_b_l": b, "graph_b_m": by} {
		put(f, k, x)
	}
	pair(f, "diameter_mean_mm", "diameter_mean_u_mm", dm, du)
	place := pair(f, "difference_mean_cm", "difference_mean_u_cm", mean(diffs), lu)
	for i, x := range diffs {
		f[fmt.Sprintf("load_difference_%02d", i)] = reportAt(x, place, nil)
	}
	pair(f, "young_modulus_pa", "young_uncertainty_pa", result, result.Mul(relative))
	f["young_error_percent"] = percent(div(result.Sub(reference).Abs(), reference).Mul(n(100)), relative)
	for k, x := range map[string]D{"diameter_u_a": da, "diameter_u_b": db, "difference_u_a": la, "difference_u_b": lb, "diameter_relative_percent": rd.Mul(n(100)), "difference_relative_percent": rl.Mul(n(100)), "length_relative_percent": rlen.Mul(n(100)), "distance_relative_percent": rdist.Mul(n(100)), "arm_relative_percent": rarm.Mul(n(100)), "young_relative_percent": relative.Mul(n(100))} {
		f[k] = uncertainty(x)
	}
	tmp := map[string]string{}
	pair(tmp, "v", "u", graphResult, graphResult.Mul(relative))
	f["young_graph_modulus_pa"] = tmp["v"]
	f["young_graph_error_percent"] = percent(div(graphResult.Sub(reference).Abs(), reference).Mul(n(100)), relative)
	pair(tmp, "v", "u", slope, slope.Mul(rl))
	f["graph_slope_kg_cm"] = tmp["v"]
	ds := div(n(5).Mul(step), mean(diffs))
	pair(tmp, "v", "u", ds, ds.Mul(rl))
	f["difference_slope_kg_cm"] = tmp["v"]
	for _, row := range [][3]string{{"length_result_cm", "wire_length_cm", ".1"}, {"distance_result_cm", "mirror_distance_cm", ".2"}, {"arm_result_cm", "lever_arm_cm", ".02"}} {
		pair(tmp, "v", "u", p[row[1]], dec(row[2]))
		f[row[0]] = tmp["v"]
	}
}
