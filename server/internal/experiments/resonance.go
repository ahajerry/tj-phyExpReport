package experiments

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

type xy struct{ x, y D }

func grouped(xs, ys []D) []xy {
	groups := map[string][]D{}
	for i, x := range xs {
		groups[x.String()] = append(groups[x.String()], ys[i])
	}
	points := []xy{}
	for k, a := range groups {
		points = append(points, xy{dec(k), mean(a)})
	}
	sort.Slice(points, func(i, j int) bool { return points[i].x.LessThan(points[j].x) })
	return points
}
func lookup(angles, periods []D, a D) *D {
	points := grouped(angles, periods)
	for _, p := range points {
		if p.x.Equal(a) {
			v := p.y
			return &v
		}
	}
	for i := 1; i < len(points); i++ {
		l, r := points[i-1], points[i]
		if a.GreaterThan(l.x) && a.LessThan(r.x) {
			v := l.y.Add(div(r.y.Sub(l.y).Mul(a.Sub(l.x)), r.x.Sub(l.x)))
			return &v
		}
	}
	return nil
}
func coords(points []xy, sorted bool) string {
	if sorted {
		sort.SliceStable(points, func(i, j int) bool {
			return points[i].x.LessThan(points[j].x) || points[i].x.Equal(points[j].x) && points[i].y.LessThan(points[j].y)
		})
	}
	s := []string{}
	for _, p := range points {
		s = append(s, point(p.x, p.y))
	}
	return strings.Join(s, " ")
}
func halfPower(drive, amplitudes []D) (*D, *D) {
	peak := amplitudes[0]
	for _, a := range amplitudes {
		if a.GreaterThan(peak) {
			peak = a
		}
	}
	xs, ys := []D{}, []D{}
	for i, t := range drive {
		xs = append(xs, div(n(2).Mul(pi), t))
		ys = append(ys, sq(div(amplitudes[i], peak)))
	}
	p := grouped(xs, ys)
	center := 0
	for i := range p {
		if p[i].y.GreaterThan(p[center].y) {
			center = i
		}
	}
	cross := func(step int) *D {
		for i := center; i+step >= 0 && i+step < len(p); i += step {
			a, b := p[i], p[i+step]
			h := dec(".5")
			if a.y.GreaterThanOrEqual(h) && b.y.LessThanOrEqual(h) {
				v := b.x
				if !b.y.Equal(h) {
					v = a.x.Add(div(h.Sub(a.y).Mul(b.x.Sub(a.x)), b.y.Sub(a.y)))
				}
				return &v
			}
		}
		return nil
	}
	return cross(-1), cross(1)
}
func resonance(f map[string]string, d map[string][]D) {
	for _, k := range []string{"free_angle", "free_period", "damped_period", "damped_peak", "drive_period", "amplitude"} {
		for _, v := range d[k] {
			pos(v, k)
		}
	}
	for _, v := range d["phase"] {
		if v.IsNegative() || v.GreaterThan(n(180)) {
			fail("相位滞后角应在 0 至 180 度之间")
		}
	}
	free, peaks, drive, amps := d["free_period"], d["damped_peak"], d["drive_period"], d["amplitude"]
	samples, trials := []D{}, []D{}
	for trial, t := range d["damped_period"] {
		local := []D{}
		for i := 0; i < 5; i++ {
			v := div(floatD(math.Log(fl(div(peaks[trial*10+i], peaks[trial*10+i+5])))), n(5).Mul(t))
			local = append(local, v)
			samples = append(samples, v)
			f[fmt.Sprintf("damped_log_ratio_%02d", trial*5+i+1)] = fixed(v.Mul(n(5)).Mul(t), 4)
		}
		beta := mean(local)
		trials = append(trials, beta)
		f[fmt.Sprintf("damped_time_10_%02d", trial+1)] = fixed(t.Mul(n(10)), 4)
		f[fmt.Sprintf("damped_log_mean_%02d", trial+1)] = fixed(beta.Mul(n(5)).Mul(t), 5)
		put(f, fmt.Sprintf("damped_beta_%02d", trial+1), beta)
	}
	beta := pos(mean(trials), "阻尼系数（峰值应衰减）")
	peak := amps[0]
	for _, a := range amps {
		if a.GreaterThan(peak) {
			peak = a
		}
	}
	pts := []D{}
	for i, a := range amps {
		if a.Equal(peak) {
			pts = append(pts, drive[i])
		}
	}
	tr := mean(pts)
	missing := 0
	ag, ng, pg, pmg := []xy{}, []xy{}, []xy{}, []xy{}
	ratios := []D{}
	for i, t := range drive {
		a, reading := amps[i], d["phase"][i]
		ratio := div(tr, t)
		ratios = append(ratios, ratio)
		norm := sq(div(a, peak))
		suffix := fmt.Sprintf("_%02d", i+1)
		put(f, "frequency_ratio"+suffix, ratio)
		put(f, "normalized_amplitude"+suffix, norm)
		put(f, "signed_phase"+suffix, reading.Neg())
		f["table_drive_period"+suffix] = fixed(t, 4)
		f["table_drive_time_10"+suffix] = fixed(t.Mul(n(10)), 4)
		f["table_phase_reading"+suffix] = fixed(reading, 1)
		f["table_signed_phase"+suffix] = fixed(reading.Neg(), 1)
		f["table_frequency_ratio"+suffix] = fixed(ratio, 4)
		f["table_amplitude_ratio"+suffix] = fixed(norm, 4)
		ag = append(ag, xy{ratio, a})
		ng = append(ng, xy{ratio, norm})
		pg = append(pg, xy{ratio, reading.Neg()})
		pmg = append(pmg, xy{ratio, reading})
		t0 := lookup(d["free_angle"], free, a)
		if t0 == nil {
			missing++
			for _, k := range []string{"table_phase_calculated", "table_signed_theory", "matched_period", "matched_omega", "theoretical_phase", "phase_residual"} {
				f[k+suffix] = "需补测"
			}
			continue
		}
		w0, w := div(n(2).Mul(pi), *t0), div(n(2).Mul(pi), t)
		phi := floatD(-math.Atan2(fl(n(2).Mul(beta).Mul(w)), fl(sq(w0).Sub(sq(w)))) * 180 / math.Pi)
		f["table_phase_calculated"+suffix] = fixed(phi.Abs(), 1)
		f["table_signed_theory"+suffix] = fixed(phi, 1)
		for k, v := range map[string]D{"matched_period": *t0, "matched_omega": w0, "theoretical_phase": phi, "phase_residual": reading.Neg().Sub(phi)} {
			put(f, k+suffix, v)
		}
	}
	dg := []xy{}
	for i := 0; i < 10; i++ {
		a := []D{}
		for j := i; j < len(peaks); j += 10 {
			a = append(a, peaks[j])
		}
		dg = append(dg, xy{n(i + 1), mean(a)})
	}
	f["damped_graph_points"] = coords(dg, false)
	f["amplitude_graph_points"] = coords(ag, false)
	f["normalized_amplitude_graph_points"] = coords(ng, true)
	f["phase_graph_points"] = coords(pg, true)
	f["phase_magnitude_graph_points"] = coords(pmg, false)
	sort.Slice(ratios, func(i, j int) bool { return ratios[i].LessThan(ratios[j]) })
	f["half_power_line_points"] = point(ratios[0], dec(".5")) + " " + point(ratios[len(ratios)-1], dec(".5"))
	left, right := halfPower(drive, amps)
	f["half_power_omega_1"], f["half_power_omega_2"] = "需补测", "需补测"
	if left != nil {
		put(f, "half_power_omega_1", *left)
	}
	if right != nil {
		put(f, "half_power_omega_2", *right)
	}
	if left != nil && right != nil && right.GreaterThan(*left) {
		gb := div(right.Sub(*left), n(2))
		put(f, "graph_beta_s_inv", gb)
		f["graph_beta_difference_percent"] = fixed(div(gb.Sub(beta).Abs(), beta).Mul(n(100)), 2)
		f["graph_beta_note"] = "在实测归一化振幅平方曲线的峰值两侧，对相邻测量点作线性内插，确定半峰高交点。该方法适用于小阻尼及共振附近。"
	} else {
		f["graph_beta_s_inv"], f["graph_beta_difference_percent"] = "需补测", "需补测"
		f["graph_beta_note"] = "实测曲线未覆盖峰值两侧的半峰高交点，需扩大测量范围或加密共振附近测点；不外推计算作图法阻尼系数。"
	}
	for k, v := range map[string]D{"free_period_mean_s": mean(free), "peak_amplitude_deg": peak, "resonance_period_s": tr, "resonance_omega_rad_s": div(n(2).Mul(pi), tr), "peak_point_count": n(len(pts))} {
		put(f, k, v)
	}
	peakT := lookup(d["free_angle"], free, peak)
	f["matched_period_peak_s"] = "需补测"
	f["theoretical_resonance_omega_rad_s"] = "不适用"
	if peakT != nil {
		put(f, "matched_period_peak_s", *peakT)
		r := sq(div(n(2).Mul(pi), *peakT)).Sub(n(2).Mul(sq(beta)))
		if r.IsPositive() {
			put(f, "theoretical_resonance_omega_rad_s", sqrt(r))
		}
	}
	f["phase_coverage_note"] = "全部受迫振幅均在自由振动测量范围内，已完成查表或线性内插。"
	if missing > 0 {
		f["phase_coverage_note"] = fmt.Sprintf("有 %d 个受迫振幅超出自由振动测量范围，需补测对应振幅的自由周期；这些点不计算理论相位。", missing)
	}
	summary := []string{}
	for i, v := range trials {
		summary = append(summary, fmt.Sprintf("第 %d 组：%s", i+1, general(v)))
	}
	f["beta_trial_summary"] = strings.Join(summary, "；")
	uncSamples := samples
	f["beta_uncertainty_note"] = "本次只有一组阻尼测量，按该组五个逐差估计值的均值标准误计算，仅表示组内统计分散。"
	if len(trials) > 1 {
		uncSamples = trials
		f["beta_uncertainty_note"] = "本次按各组阻尼系数的均值标准误计算，仅表示组间统计分散。"
	}
	pair(f, "damping_beta_s_inv", "damping_beta_u_s_inv", beta, sem(uncSamples))
}
