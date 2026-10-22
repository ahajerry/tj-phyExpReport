package experiments

import (
	"fmt"
	"phyexp/server/internal/domain"
	"strings"
)

var sizes = []string{"cylinder", "tube_inner", "tube_outer", "ball", "rod"}
var objects = []string{"cylinder", "disk", "tube", "ball", "rod"}
var oilColumns = []string{"current_voltage", "balance_voltage", "fall_time", "instrument_charge"}
var oilHeaders = []string{"当前电压Uc(V)", "平衡电压U(V)", "时间t(s)", "电荷量(C)"}

func scalar(v D) domain.Scalar { return domain.Scalar(v.String()) }
func normalize(p *domain.Payload) {
	switch p.ExperimentID {
	case "focal-length":
		if p.Parameters == nil {
			p.Parameters = map[string]domain.Scalar{}
		}
		if _, ok := p.Parameters["position_direction"]; !ok {
			p.Parameters["position_direction"] = "1"
		}
	case "young-modulus":
		if a, ok := p.Data["diameter"]; ok && len(p.Data) == 3 {
			p.Data["diameter_initial"] = []domain.Scalar{"0", "0", "0", "0", "0"}
			p.Data["diameter_final"] = a
			delete(p.Data, "diameter")
		}
		if p.Parameters != nil {
			if _, ok := p.Parameters["diameter_error_mm"]; !ok {
				p.Parameters["diameter_error_mm"] = "0.004"
			}
			if _, ok := p.Parameters["scale_error_cm"]; !ok {
				p.Parameters["scale_error_cm"] = "0.05"
			}
		}
	case "forced-vibration":
		p.SourceTables = nil // Dynamic measurement tables already preserve every final reading.
		for _, k := range []string{"drive", "damped"} {
			if a, ok := p.Data[k+"_time_10"]; ok {
				if _, exists := p.Data[k+"_period"]; exists || len(a) == 0 {
					fail("10T 和单周期不能同时填写")
				}
				b := []domain.Scalar{}
				for _, v := range a {
					b = append(b, scalar(div(pos(number(v), "10T 计时"), n(10))))
				}
				p.Data[k+"_period"] = b
				delete(p.Data, k+"_time_10")
			}
		}
	case "millikan":
		if _, ok := p.Data["balance_voltage"]; !ok {
			return
		}
		if len(p.Data) != 4 {
			fail("油滴原始记录字段无效")
		}
		for _, k := range oilColumns {
			if len(p.Data[k]) != 32 {
				fail("油滴原始记录需有 32 行")
			}
		}
		last := -1
		for i := 0; i < 32; i++ {
			for _, k := range oilColumns {
				if strings.TrimSpace(string(p.Data[k][i])) != "" {
					last = i
				}
			}
		}
		count := last/4 + 1
		if last < 0 || count < 3 || count > 8 {
			fail("油滴需填写 3 至 8 组")
		}
		d := map[string][]domain.Scalar{}
		rows := [][]string{}
		for drop := 0; drop < count; drop++ {
			volts := []D{}
			for trial := 0; trial < 4; trial++ {
				i := drop*4 + trial
				v := pos(number(p.Data["balance_voltage"][i]), "平衡电压")
				volts = append(volts, v)
				pos(number(p.Data["fall_time"][i]), "下降时间")
				for _, k := range []string{"current_voltage", "instrument_charge"} {
					if p.Data[k][i] != "" {
						number(p.Data[k][i])
					}
				}
				k := fmt.Sprintf("time_%d", trial+1)
				d[k] = append(d[k], p.Data["fall_time"][i])
				row := []string{}
				for _, k := range oilColumns {
					row = append(row, strings.TrimSpace(string(p.Data[k][i])))
				}
				rows = append(rows, row)
			}
			d["voltage"] = append(d["voltage"], scalar(mean(volts)))
		}
		for k, a := range d {
			for len(a) < 8 {
				a = append(a, "")
			}
			d[k] = a
		}
		p.Data = d
		p.SourceTables = []domain.Table{{Title: "密立根油滴原始记录（当前表格）", Headers: oilHeaders, Rows: rows}}
	case "moment-of-inertia":
		if _, ok := p.Data["size_cylinder_cm"]; !ok {
			return
		}
		if len(p.Data) != 14 || len(p.Parameters) != 7 {
			fail("扭摆法读数或参数字段不完整")
		}
		for _, a := range p.Data {
			if len(a) != 3 {
				fail("扭摆法每种状态需三次读数")
			}
		}
		params := map[string]domain.Scalar{}
		for _, k := range []string{"cylinder", "tube", "ball", "rod"} {
			params["mass_"+k+"_g"] = scalar(pos(number(p.Parameters["mass_"+k+"_kg"]), "质量").Mul(n(1000)))
		}
		p.Geometry = map[string][]domain.Scalar{}
		targets := []string{"diameter_cylinder_mm", "diameter_tube_inner_mm", "diameter_tube_outer_mm", "diameter_ball_mm", "length_rod_mm"}
		labels := map[string]string{"cylinder": "塑料圆柱", "disk": "载物盘", "tube": "金属圆筒", "tube_inner": "金属圆筒内径", "tube_outer": "金属圆筒外径", "ball": "圆球", "rod": "金属细杆"}
		geometryRows := [][]string{}
		for i, k := range sizes {
			a, ok := p.Data["size_"+k+"_cm"]
			if !ok {
				fail("缺少几何尺寸")
			}
			nums := values(a)
			for _, v := range nums {
				pos(v, "尺寸")
			}
			params[targets[i]] = domain.Scalar(fixed(mean(nums).Mul(n(10)), 3))
			p.Geometry[k] = a
			mk := k
			if strings.HasPrefix(k, "tube_") {
				mk = "tube"
			}
			geometryRows = append(geometryRows, append([]string{labels[k], string(p.Parameters["mass_"+mk+"_kg"])}, textValues(a)...))
			delete(p.Data, "size_"+k+"_cm")
		}
		s1 := pos(number(p.Parameters["slider_mass_1_kg"]), "滑块质量")
		s2 := pos(number(p.Parameters["slider_mass_2_kg"]), "滑块质量")
		si := nonneg(number(p.Parameters["slider_pair_inertia_scaled"]), "滑块惯量")
		params["slider_mass_g"] = scalar(div(s1.Add(s2), n(2)).Mul(n(1000)))
		params["slider_self_inertia"] = scalar(div(si.Mul(dec("1e-4")), n(2)))
		timeRows := [][]string{}
		for _, k := range objects {
			cycles := "10"
			if k == "disk" {
				cycles = "20"
			}
			timeRows = append(timeRows, append([]string{labels[k], cycles}, textValues(p.Data["time_"+k])...))
		}
		for _, x := range []int{5, 10, 15, 20} {
			timeRows = append(timeRows, append([]string{fmt.Sprintf("滑块 %d cm", x), "5"}, textValues(p.Data[fmt.Sprintf("slider_time_%d", x)])...))
		}
		p.SourceTables = []domain.Table{{Title: "扭摆法质量与尺寸记录（当前表格）", Headers: []string{"物体", "质量/kg", "尺寸1/cm", "尺寸2/cm", "尺寸3/cm"}, Rows: geometryRows}, {Title: "扭摆法周期计时记录（当前表格）", Headers: []string{"物体/位置", "周期数", "时长1/s", "时长2/s", "时长3/s"}, Rows: timeRows}, {Title: "扭摆法滑块参数（当前表格）", Headers: []string{"滑块1质量/kg", "滑块2质量/kg", "两滑块自身惯量/×10⁻⁴ kg·m²"}, Rows: [][]string{{string(p.Parameters["slider_mass_1_kg"]), string(p.Parameters["slider_mass_2_kg"]), string(p.Parameters["slider_pair_inertia_scaled"])}}}}
		p.Parameters = params
	}
}
func Editable(input domain.Payload) (out domain.Payload, err error) {
	defer guard(&err)
	p := clone(input)
	if p.Data == nil || p.Parameters == nil {
		fail("导入数据缺少读数或参数")
	}
	switch p.ExperimentID {
	case "forced-vibration":
		for _, k := range []string{"drive", "damped"} {
			a := []domain.Scalar{}
			for _, v := range p.Data[k+"_period"] {
				a = append(a, scalar(number(v).Mul(n(10))))
			}
			p.Data[k+"_time_10"] = a
			delete(p.Data, k+"_period")
		}
	case "millikan":
		if len(p.SourceTables) != 1 {
			fail("缺少油滴原始记录")
		}
		d := map[string][]domain.Scalar{}
		for j, k := range oilColumns {
			for _, row := range p.SourceTables[0].Rows {
				if len(row) != 4 && len(row) != 6 {
					fail("油滴表格行无效")
				}
				// Older saved imports included drop and trial index columns.
				d[k] = append(d[k], domain.Scalar(row[j+len(row)-4]))
			}
			if len(d[k]) > 32 {
				fail("油滴行数过多")
			}
			for len(d[k]) < 32 {
				d[k] = append(d[k], "")
			}
		}
		p.Data = d
	case "moment-of-inertia":
		if len(p.SourceTables) != 3 || len(p.SourceTables[0].Rows) != 5 || len(p.SourceTables[2].Rows) != 1 {
			fail("扭摆原始记录无效")
		}
		for k, v := range p.Geometry {
			p.Data["size_"+k+"_cm"] = v
		}
		params := map[string]domain.Scalar{}
		for k, i := range map[string]int{"cylinder": 0, "tube": 1, "ball": 3, "rod": 4} {
			row := p.SourceTables[0].Rows[i]
			if len(row) < 2 {
				fail("扭摆质量记录无效")
			}
			params["mass_"+k+"_kg"] = domain.Scalar(row[1])
		}
		r := p.SourceTables[2].Rows[0]
		if len(r) != 3 {
			fail("滑块记录无效")
		}
		for i, k := range []string{"slider_mass_1_kg", "slider_mass_2_kg", "slider_pair_inertia_scaled"} {
			params[k] = domain.Scalar(r[i])
		}
		p.Parameters = params
	default:
		fail("不支持的数据导入")
	}
	p.SourceTables = nil
	p.Geometry = nil
	return p, nil
}
