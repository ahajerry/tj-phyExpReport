package experiments

import (
	"fmt"
	"phyexp/server/internal/domain"
	"strings"
)

func sound(f map[string]string, p domain.Payload) {
	if len(p.Data) != 2 {
		fail("data 必须包含 resonance 和 phase")
	}
	legacy := p.Parameters == nil
	if !legacy && len(p.Parameters) != 9 {
		fail("声速参数不完整")
	}
	cal := dec(".02")
	if !legacy {
		cal = pos(number(p.Parameters["caliper_error"]), "卡尺误差")
	}
	f["caliper_error"] = cal.String()
	speeds, errors := []D{}, []D{}
	var places []*int
	for index, quantity := range []string{"resonance", "phase"} {
		prefix := []string{"res", "phase"}[index]
		readings := []D{}
		for _, raw := range p.Data[quantity] {
			if strings.TrimSpace(string(raw)) == "" {
				continue
			}
			readings = append(readings, number(raw))
			f[fmt.Sprintf("%s_l%02d", prefix, len(readings))] = string(raw)
			if len(readings) == 20 {
				break
			}
		}
		if len(readings) != 20 {
			fail("声速每组至少需要 20 个有效读数")
		}
		wl := []D{}
		for i := 0; i < 10; i++ {
			wl = append(wl, pos(div(readings[i+10].Sub(readings[i]), n(5)), "逐差波长"))
		}
		m := mean(wl)
		ua := sem(wl)
		ub := div(cal, sqrt(n(3)))
		ul := hypot(ua, ub)
		place := finish(f, prefix+"_lambda_avg", prefix+"_u_lambda", m, ul, false)
		for i, v := range wl {
			f[fmt.Sprintf("%s_lambda%02d", prefix, i+1)] = at(v, place)
		}
		f[prefix+"_u_a"] = uncertainty(ua)
		f[prefix+"_u_b"] = uncertainty(ub)
		f[prefix+"_u_r_lambda"] = uncertainty(div(ul, m))
		if legacy {
			continue
		}
		get := func(k string) D {
			raw, ok := p.Parameters[prefix+"_"+k]
			if !ok {
				fail("缺少声速参数")
			}
			return number(raw)
		}
		t0, t1 := get("t_start"), get("t_end")
		if t0.LessThanOrEqual(n(-273)) || t1.LessThanOrEqual(n(-273)) {
			fail("温度低于绝对零度")
		}
		temp := div(t0.Add(t1), n(2))
		f[prefix+"_t_start"] = string(p.Parameters[prefix+"_t_start"])
		f[prefix+"_t_end"] = string(p.Parameters[prefix+"_t_end"])
		f[prefix+"_t_avg"] = fixed(temp, 2)
		freq := pos(get("frequency"), "频率")
		ferr := nonneg(get("frequency_error"), "频率误差")
		f[prefix+"_frequency_error"] = string(p.Parameters[prefix+"_frequency_error"])
		uf := div(ferr, sqrt(n(3)))
		urf := div(uf, freq)
		speed := m.Mul(freq)
		urv := hypot(div(ul, m), urf)
		uv := urv.Mul(speed)
		theory := n(331).Mul(sqrt(div(n(273).Add(temp), n(273))))
		errorPercent := div(speed.Sub(theory).Abs(), theory).Mul(n(100))
		speeds = append(speeds, speed)
		errors = append(errors, errorPercent)
		finish(f, prefix+"_frequency", prefix+"_u_f", freq, uf, false)
		f[prefix+"_u_r_f"] = uncertainty(urf)
		sp := finish(f, prefix+"_speed", prefix+"_u_v", speed, uv, false)
		places = append(places, sp)
		f[prefix+"_speed_result"] = f[prefix+"_speed"]
		f[prefix+"_u_v_result"] = f[prefix+"_u_v"]
		f[prefix+"_speed_theory"] = at(theory, sp)
		f[prefix+"_u_r_v"] = uncertainty(urv)
		finish(f, prefix+"_error_percent", prefix+"_u_r_v_percent", errorPercent, urv.Mul(n(100)), false)
	}
	if !legacy {
		var p *int
		for _, v := range places {
			if v != nil && (p == nil || *v > *p) {
				p = v
			}
		}
		f["method_difference"] = at(speeds[0].Sub(speeds[1]).Abs(), p)
		f["final_speed"] = at(mean(speeds), p)
		f["closer_method"] = "两种方法"
		if errors[0].LessThan(errors[1]) {
			f["closer_method"] = "共振干涉法"
		}
		if errors[1].LessThan(errors[0]) {
			f["closer_method"] = "相位比较法"
		}
	}
}
