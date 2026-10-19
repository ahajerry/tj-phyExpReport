package experiments

import (
	"embed"
	"encoding/json"
	"fmt"
	"phyexp/server/internal/domain"
	"strings"
	"unicode/utf8"
)

//go:embed specs.json
var specsFS embed.FS

type spec struct {
	Title      string         `json:"title"`
	Data       map[string]int `json:"data"`
	Parameters []string       `json:"parameters"`
}

var specs map[string]spec

func init() {
	b, _ := specsFS.ReadFile("specs.json")
	if e := json.Unmarshal(b, &specs); e != nil {
		panic(e)
	}
}

type inputError string

func (e inputError) Error() string { return string(e) }
func fail(s string)                { panic(inputError(s)) }
func guard(err *error) {
	if r := recover(); r != nil {
		if e, ok := r.(inputError); ok {
			*err = e
		} else {
			panic(r)
		}
	}
}
func Title(id string) string {
	if id == "speed-of-sound" {
		return "声速测定"
	}
	return specs[id].Title
}
func number(s domain.Scalar) D {
	v := dec(string(s))
	if v.Abs().GreaterThan(dec("1e15")) {
		fail("数值超出允许范围")
	}
	return v
}
func textValues(v []domain.Scalar) []string {
	a := []string{}
	for _, x := range v {
		a = append(a, string(x))
	}
	return a
}
func values(v []domain.Scalar) []D {
	a := []D{}
	for _, x := range v {
		a = append(a, number(x))
	}
	return a
}
func clone(p domain.Payload) domain.Payload {
	b, _ := json.Marshal(p)
	var q domain.Payload
	_ = json.Unmarshal(b, &q)
	return q
}
func Calculate(input domain.Payload) (fields map[string]string, normalized domain.Payload, err error) {
	defer guard(&err)
	p := clone(input)
	normalize(&p)
	normalized = p
	f := map[string]string{}
	for k, v := range p.ReportInfo {
		if k != "student" && k != "student_id" && k != "group" && k != "date" && !(p.ExperimentID == "speed-of-sound" && k == "partner") {
			fail("封面信息包含无效字段")
		}
		if utf8.RuneCountInString(v) > 120 {
			fail("封面信息超过 120 字")
		}
		for _, c := range v {
			if c < 32 {
				fail("封面信息必须为单行文本")
			}
		}
		if k != "partner" {
			f[k] = strings.TrimSpace(v)
		}
	}
	if p.ExperimentID == "speed-of-sound" {
		sound(f, p)
		return f, p, nil
	}
	s, ok := specs[p.ExperimentID]
	if !ok {
		fail("不支持的实验")
	}
	if p.ExperimentID == "heat-capacity-ratio" {
		if _, legacy := p.Data["diameter"]; legacy {
			s.Data = map[string]int{"diameter": 5, "period": 5}
			s.Parameters = append(append([]string{}, s.Parameters...), "diameter_zero_mm", "diameter_error_mm", "period_error_s", "volume_error_l")
		}
	}
	counts := map[string]int{}
	for k, v := range s.Data {
		counts[k] = v
	}
	if p.ExperimentID == "forced-vibration" {
		for _, group := range [][]string{{"free_angle", "free_period"}, {"drive_period", "amplitude", "phase"}, {"damped_period"}} {
			min := len(group)
			l := len(p.Data[group[0]])
			if l < min || l > 500 {
				fail("振动读数数量无效")
			}
			for _, k := range group {
				if len(p.Data[k]) != l {
					fail("振动读数数量必须一致")
				}
			}
		}
		if len(p.Data["damped_peak"]) != 10*len(p.Data["damped_period"]) {
			fail("每组阻尼测量需要十个峰值")
		}
		for k := range counts {
			counts[k] = len(p.Data[k])
		}
	}
	if len(p.Data) != len(counts) {
		fail("实验读数字段与模板不一致")
	}
	if p.Parameters == nil || len(p.Parameters) != len(s.Parameters) {
		fail("报告参数字段与模板不一致")
	}
	d := map[string][]D{}
	params := map[string]D{}
	for k, count := range counts {
		raw, ok := p.Data[k]
		if !ok || len(raw) != count {
			fail(fmt.Sprintf("%s 需要 %d 个读数", k, count))
		}
		tail := false
		for i, x := range raw {
			if p.ExperimentID == "millikan" && x == "" {
				tail = true
				continue
			}
			if tail {
				fail("油滴空白只能位于末尾")
			}
			d[k] = append(d[k], number(x))
			field := fmt.Sprintf("%s_%02d", k, i+1)
			if p.ExperimentID == "millikan" && strings.HasPrefix(k, "time_") {
				field = fmt.Sprintf("time_%02d_%s", i+1, strings.TrimPrefix(k, "time_"))
			}
			f[field] = strings.TrimSpace(string(x))
		}
		if p.ExperimentID == "millikan" && len(d[k]) < 3 {
			fail("油滴至少需要三组")
		}
	}
	for _, k := range s.Parameters {
		x, ok := p.Parameters[k]
		if !ok {
			fail("缺少参数 " + k)
		}
		params[k] = number(x)
		f[k] = strings.TrimSpace(string(x))
	}
	switch p.ExperimentID {
	case "oscilloscope":
		oscilloscope(f, d, params)
	case "heat-capacity-ratio":
		heat(f, d, params)
	case "focal-length":
		lens(f, d)
	case "millikan":
		millikan(f, d)
	case "moment-of-inertia":
		torsion(f, d, params)
		for k, a := range p.Geometry {
			if len(a) != 3 {
				fail("几何尺寸读数格式错误")
			}
			for i, v := range a {
				f[fmt.Sprintf("geometry_%s_%02d", k, i+1)] = string(v)
			}
		}
	case "young-modulus":
		d["diameter"] = nil
		for i, x := range d["diameter_final"] {
			d["diameter"] = append(d["diameter"], x.Sub(d["diameter_initial"][i]))
		}
		young(f, d, params)
	case "forced-vibration":
		resonance(f, d)
		f["damped_period_s"] = fixed(mean(d["damped_period"]), 4)
	}
	return f, p, nil
}
