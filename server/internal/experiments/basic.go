package experiments

import (
	"fmt"
)

func oscilloscope(f map[string]string, d map[string][]D, p map[string]D) {
	for k, a := range d {
		for _, x := range a {
			pos(x, k)
			if (k == "nx" || k == "ny") && (!x.Equal(x.Truncate(0)) || x.GreaterThan(n(100))) {
				fail("切点数必须为 1–100 的正整数")
			}
		}
	}
	pos(p["probe_factor"], "探头倍率")
	frequencies := []D{}
	wave := []D{}
	for i := 0; i < 4; i++ {
		suffix := fmt.Sprintf("_%02d", i+1)
		v := d["voltage_scale"][i].Mul(d["voltage_divisions"][i]).Mul(p["probe_factor"])
		t := d["time_scale"][i].Mul(d["period_divisions"][i])
		freq := div(one, t)
		wave = append(wave, freq)
		put(f, "voltage_pp"+suffix, v)
		put(f, "period_ms"+suffix, t)
		put(f, "frequency_hz"+suffix, freq.Mul(n(1000)))
		x, y := int(d["nx"][i].IntPart()), int(d["ny"][i].IntPart())
		a, b := x, y
		for b != 0 {
			a, b = b, a%b
		}
		fy := div(d["reference_frequency"][i].Mul(n(x)), n(y))
		frequencies = append(frequencies, fy)
		put(f, "lissajous_frequency"+suffix, fy)
		f["frequency_ratio"+suffix] = fmt.Sprintf("%d:%d", x/a, y/a)
	}
	center := mean(frequencies)
	pair(f, "lissajous_mean_khz", "lissajous_u_khz", center, sem(frequencies))
	put(f, "sine_frequency_khz", wave[1])
	put(f, "method_difference_percent", div(center.Sub(wave[1]).Abs(), wave[1]).Mul(n(100)))
}
func heat(f map[string]string, d map[string][]D, p map[string]D) {
	ds := []D{}
	for i, x := range d["diameter"] {
		x = pos(x.Add(p["diameter_zero_mm"]), "修正直径")
		ds = append(ds, x)
		put(f, fmt.Sprintf("diameter_corrected_%02d", i+1), x)
	}
	ts := d["period"]
	tm := pos(mean(ts), "振动周期")
	for i, x := range ts {
		put(f, fmt.Sprintf("period_deviation_%02d", i+1), x.Sub(tm))
	}
	dm := mean(ds).Mul(dec(".001"))
	mass := pos(p["mass_g"], "质量").Mul(dec(".001"))
	volume := pos(p["volume_l"], "容积").Mul(dec(".001"))
	pl := div(pos(p["pressure_start_kpa"], "气压").Add(pos(p["pressure_end_kpa"], "气压")), n(2)).Mul(n(1000))
	pressure := pl.Add(div(n(4).Mul(mass).Mul(dec("9.794")), pi.Mul(sq(dm))))
	gamma := div(n(64).Mul(mass).Mul(volume), sq(tm).Mul(pressure).Mul(sq(sq(dm))))
	r3 := sqrt(n(3))
	err := func(k string) D { return div(nonneg(p[k], k), r3) }
	ud := hypot(sem(ds), err("diameter_error_mm")).Mul(dec(".001"))
	ut := hypot(sem(ts), err("period_error_s"))
	um := err("mass_error_g").Mul(dec(".001"))
	uv := err("volume_error_l").Mul(dec(".001"))
	up := err("pressure_error_kpa").Mul(n(1000))
	ur := hypot(div(um, mass), div(uv, volume), div(n(2).Mul(ut), tm), div(up, pressure), div(n(4).Mul(ud), dm))
	pair(f, "diameter_mean_mm", "diameter_mean_u_mm", mean(ds), ud.Mul(n(1000)))
	pair(f, "period_mean_s", "period_mean_u_s", tm, ut)
	pair(f, "pressure_mean_kpa", "pressure_mean_u_kpa", div(pl, n(1000)), div(up, n(1000)))
	put(f, "pressure_inside_pa", pressure)
	pair(f, "gamma_result", "gamma_uncertainty", gamma, gamma.Mul(ur))
	f["gamma_error_percent"] = percent(div(gamma.Sub(dec("1.402")).Abs(), dec("1.402")).Mul(n(100)), ur)
}
func lens(f map[string]string, d map[string][]D) {
	focus := map[string][]D{}
	for i, u := range d["object_distance"] {
		v := pos(d["image_distance"][i], "像距")
		pos(u, "物距")
		focus["single"] = append(focus["single"], div(u.Mul(v), u.Add(v)))
	}
	for i, l := range d["bessel_length"] {
		pos(l, "物屏间距")
		s := nonneg(d["bessel_separation"][i], "共轭间距")
		if !s.LessThan(l) {
			fail("共轭间距必须小于物屏间距")
		}
		focus["bessel"] = append(focus["bessel"], div(sq(l).Sub(sq(s)), n(4).Mul(l)))
	}
	for i, u := range d["auto_object"] {
		focus["auto"] = append(focus["auto"], pos(d["auto_lens"][i].Sub(u).Abs(), "自准直焦距"))
	}
	for i, o := range d["concave_object"] {
		l := d["concave_lens"][i]
		u, v := l.Sub(o), d["concave_image"][i].Sub(l)
		if !u.IsNegative() || !v.IsPositive() || u.Add(v).IsZero() {
			fail("凹透镜位置顺序无效")
		}
		x := div(u.Mul(v), u.Add(v))
		if !x.IsNegative() {
			fail("凹透镜焦距应为负值")
		}
		focus["concave"] = append(focus["concave"], x)
	}
	for k, a := range focus {
		p := pair(f, "focus_"+k+"_mean_mm", "focus_"+k+"_u_mm", mean(a), sem(a))
		for i, v := range a {
			f[fmt.Sprintf("%s_focus_%02d", k, i+1)] = reportAt(v, p, nil)
		}
	}
}
