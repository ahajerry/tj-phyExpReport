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
	_, current := d["time_100"]
	diameters, ts := d["diameter"], d["period"]
	if current {
		diameters, ts = nil, nil
		for i, x := range d["diameter_final"] {
			diameters = append(diameters, x.Sub(d["diameter_initial"][i]))
		}
		for _, x := range d["time_100"] {
			ts = append(ts, div(pos(x, "100T 总时长"), n(100)))
		}
		f["heat_reading_note"] = "直径由末读数减初读数得到，单周期由 100T 总时长除以 100 得到。"
	} else {
		f["heat_reading_note"] = "旧任务仅保存净直径和单周期；初读数未记录，以横线表示，末读数列显示原净直径；直径行包含原零点修正。100T 为单周期乘以 100 的换算值。旧任务的不确定度沿用原输入规则。"
	}
	ds := []D{}
	for i, x := range diameters {
		if !current {
			x = x.Add(p["diameter_zero_mm"])
			f[fmt.Sprintf("diameter_initial_%02d", i+1)] = "—"
			f[fmt.Sprintf("diameter_final_%02d", i+1)] = f[fmt.Sprintf("diameter_%02d", i+1)]
		}
		x = pos(x, "修正直径")
		ds = append(ds, x)
		put(f, fmt.Sprintf("diameter_corrected_%02d", i+1), x)
	}
	tm := pos(mean(ts), "振动周期")
	for i, x := range ts {
		put(f, fmt.Sprintf("period_calculated_%02d", i+1), x)
		if !current {
			put(f, fmt.Sprintf("time_100_%02d", i+1), x.Mul(n(100)))
		}
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
	udb, utb, uvL := zero, zero, zero
	if current {
		udb, utb, uvL = div(dec(".004"), r3), dec(".001"), dec(".002")
		f["diameter_error_mm"] = "0.004"
		f["period_error_s"] = "0.1"
		f["volume_error_l"] = "0.002"
	} else {
		udb, utb, uvL = err("diameter_error_mm"), err("period_error_s"), err("volume_error_l")
	}
	uda, uta := sem(ds), sem(ts)
	ud := hypot(uda, udb).Mul(dec(".001"))
	ut := hypot(uta, utb)
	um := err("mass_error_g").Mul(dec(".001"))
	uv := uvL.Mul(dec(".001"))
	up := err("pressure_error_kpa").Mul(n(1000))
	ur := hypot(div(um, mass), div(uv, volume), div(n(2).Mul(ut), tm), div(up, pressure), div(n(4).Mul(ud), dm))
	pair(f, "diameter_mean_mm", "diameter_mean_u_mm", mean(ds), ud.Mul(n(1000)))
	pair(f, "period_mean_s", "period_mean_u_s", tm, ut)
	pair(f, "pressure_mean_kpa", "pressure_mean_u_kpa", div(pl, n(1000)), div(up, n(1000)))
	put(f, "pressure_inside_pa", pressure)
	pair(f, "pressure_inside_result_pa", "pressure_inside_u_pa", pressure, up)
	pair(f, "mass_result_g", "mass_u_g", p["mass_g"], um.Mul(n(1000)))
	pair(f, "volume_result_m3", "volume_u_m3", volume, uv)
	put(f, "volume_m3", volume)
	put(f, "volume_standard_u_l", uvL)
	put(f, "diameter_u_a_mm", uda)
	put(f, "diameter_u_b_mm", udb)
	put(f, "period_u_a_s", uta)
	put(f, "period_u_b_s", utb)
	put(f, "period_time_mean_s", tm.Mul(n(100)))
	for key, value := range map[string]D{
		"diameter_relative_u_percent": div(ud, dm), "period_relative_u_percent": div(ut, tm),
		"mass_relative_u_percent": div(um, mass), "volume_relative_u_percent": div(uv, volume),
		"pressure_atmos_relative_u_percent": div(up, pl), "pressure_relative_u_percent": div(up, pressure),
		"gamma_relative_u_percent": ur,
	} {
		put(f, key, value.Mul(n(100)))
	}
	pair(f, "gamma_result", "gamma_uncertainty", gamma, gamma.Mul(ur))
	f["gamma_error_percent"] = percent(div(gamma.Sub(dec("1.402")).Abs(), dec("1.402")).Mul(n(100)), ur)
}
func lens(f map[string]string, d map[string][]D, direction D) {
	if !direction.Equal(one) && !direction.Equal(n(-1)) {
		fail("物屏位置方向必须为 1（坐标最小）或 -1（坐标最大）")
	}
	distance := func(to, from D) D { return to.Sub(from).Mul(direction) }
	for i, o := range d["single_object"] {
		l, image := d["single_lens"][i], d["single_image"][i]
		u, v := pos(distance(l, o), "物距（请检查物屏所在侧和透镜位置）"), pos(distance(image, l), "像距（请检查物屏所在侧和像屏位置）")
		d["object_distance"] = append(d["object_distance"], u)
		d["image_distance"] = append(d["image_distance"], v)
		f[fmt.Sprintf("object_distance_%02d", i+1)] = u.String()
		f[fmt.Sprintf("image_distance_%02d", i+1)] = v.String()
	}
	for i, o := range d["bessel_object"] {
		image, large, small := d["bessel_image"][i], d["bessel_lens_large"][i], d["bessel_lens_small"][i]
		if !distance(large, o).IsPositive() || !distance(small, large).IsPositive() || !distance(image, small).IsPositive() {
			if direction.IsNegative() {
				fail("共轭法位置须满足：物屏 > 成大像时透镜 > 成小像时透镜 > 像屏")
			}
			fail("共轭法位置须满足：物屏 < 成大像时透镜 < 成小像时透镜 < 像屏")
		}
		l, separation := distance(image, o), distance(small, large)
		d["bessel_length"] = append(d["bessel_length"], l)
		d["bessel_separation"] = append(d["bessel_separation"], separation)
		f[fmt.Sprintf("bessel_length_%02d", i+1)] = l.String()
		f[fmt.Sprintf("bessel_separation_%02d", i+1)] = separation.String()
	}
	for i, o := range d["auto_object"] {
		pos(distance(d["auto_lens"][i], o), "自准直焦距（请检查物屏所在侧和透镜位置）")
	}
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
		focus["auto"] = append(focus["auto"], pos(distance(d["auto_lens"][i], u), "自准直焦距"))
	}
	for k, a := range focus {
		p := pair(f, "focus_"+k+"_mean_mm", "focus_"+k+"_u_mm", mean(a), sem(a))
		for i, v := range a {
			f[fmt.Sprintf("%s_focus_%02d", k, i+1)] = reportAt(v, p, nil)
		}
	}
}
