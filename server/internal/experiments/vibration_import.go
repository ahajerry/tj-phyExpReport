package experiments

import (
	"fmt"
	"golang.org/x/text/unicode/norm"
	"phyexp/server/internal/domain"
	"regexp"
	"strings"
	"unicode"
)

func header(s string) string {
	return strings.ToLower(strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return -1
		}
		return r
	}, norm.NFKC.String(s)))
}

type vibrationHeader struct {
	row                                       int
	kind                                      string
	periods, angles, indices, timings, phases []int
	pairs                                     [][2]int
	raw                                       bool
}

func importVibration(content []byte) domain.Payload {
	s := workbook(content, "学生实验数据")
	found := false
	headers := []vibrationHeader{}
	p := domain.Payload{Data: map[string][]domain.Scalar{}, Parameters: map[string]domain.Scalar{}, ReportInfo: map[string]string{}}
	cover := map[string]string{"姓名": "student", "学号": "student_id", "班号": "group", "时间": "date", "日期": "date"}
	for r := 1; r <= s.maxRow; r++ {
		h := vibrationHeader{row: r, raw: true}
		for c := 1; c <= s.maxCol; c++ {
			v := s.get(r, c)
			if strings.Contains(v, "波尔共振") {
				found = true
			}
			label := header(v)
			clean := strings.TrimSuffix(label, ":")
			if k, ok := cover[clean]; ok {
				p.ReportInfo[k] = s.adjacent(r, c)
			}
			if clean == "阻尼档位" && p.Parameters["damping_setting"] == "" && s.adjacent(r, c) != "" {
				p.Parameters["damping_setting"] = domain.Scalar(tableNumber(s.adjacent(r, c), "阻尼档位"))
			}
			if strings.Contains(label, "周期") && !strings.Contains(label, "查表") {
				h.periods = append(h.periods, c)
			}
			if strings.Contains(label, "相位差") && !strings.Contains(label, "计算") {
				h.phases = append(h.phases, c)
			}
			if strings.Contains(label, "振幅") || strings.Contains(label, "θ") {
				exclude := false
				for _, word := range []string{"ln", "查表", "计算", "/θ", "²"} {
					if strings.Contains(label, word) {
						exclude = true
					}
				}
				if !exclude {
					h.angles = append(h.angles, c)
				}
			}
			if strings.HasPrefix(label, "10t") {
				h.timings = append(h.timings, c)
			}
			if label == "n" || label == "次数" || label == "序号" {
				h.indices = append(h.indices, c)
			}
			if strings.Contains(label, "计算") || strings.Contains(label, "ω") {
				h.raw = false
			}
		}
		if len(h.periods) > 0 && len(h.phases) > 0 && len(h.angles) > 0 {
			h.kind = "forced"
		} else if len(h.periods) > 0 && len(h.angles) > 0 {
			intersects := false
			for _, a := range h.angles {
				for _, b := range h.periods {
					if a == b {
						intersects = true
					}
				}
			}
			if !intersects {
				h.kind = "free"
				for i, c := range h.angles {
					next := s.maxCol + 1
					if i+1 < len(h.angles) {
						next = h.angles[i+1]
					}
					match := 0
					for _, pc := range h.periods {
						if pc > c && pc < next {
							match = pc
							break
						}
					}
					if match == 0 {
						fail("振幅与周期表头不成对")
					}
					h.pairs = append(h.pairs, [2]int{c, match})
				}
			}
		} else if len(h.angles) >= 2 && len(h.indices) > 0 {
			h.kind = "damped"
		}
		if h.kind != "" {
			headers = append(headers, h)
		}
	}
	if !found {
		fail("XLSX 不是波尔共振数据表")
	}
	if p.Parameters["damping_setting"] == "" {
		fail("XLSX 缺少阻尼档位")
	}
	if len(p.ReportInfo["date"]) > 10 {
		p.ReportInfo["date"] = p.ReportInfo["date"][:10]
	}
	kinds := map[string]bool{}
	headerRows := map[int]bool{}
	rawForced := false
	for _, h := range headers {
		kinds[h.kind] = true
		headerRows[h.row] = true
		if h.kind == "forced" && h.raw {
			rawForced = true
		}
	}
	if !kinds["free"] || !kinds["damped"] || !kinds["forced"] {
		fail("XLSX 缺少自由、阻尼或受迫振动表头")
	}
	boundary := regexp.MustCompile(`^(?:表\d+|\d+[.、]?(?:自由|振幅|阻尼|强迫|受迫|幅频))`)
	freeRows, dampedRows, forcedRows := [][]string{}, [][]string{}, [][]string{}
	width := 0
	occupied := func(r int, cols []int) bool {
		for _, c := range cols {
			if s.get(r, c) != "" {
				return true
			}
		}
		return false
	}
	appendValue := func(k, v string) { p.Data[k] = append(p.Data[k], domain.Scalar(v)) }
	for _, h := range headers {
		end := s.maxRow + 1
		for r := h.row + 1; r <= s.maxRow; r++ {
			stop := headerRows[r]
			for c := 1; c <= s.maxCol; c++ {
				if boundary.MatchString(header(s.get(r, c))) {
					stop = true
				}
			}
			if stop {
				end = r
				break
			}
		}
		switch h.kind {
		case "free":
			rows := [][]string{}
			if len(h.pairs)*2 > width {
				width = len(h.pairs) * 2
			}
			for r := h.row + 1; r < end; r++ {
				row := []string{}
				any := false
				for _, pair := range h.pairs {
					if occupied(r, []int{pair[0], pair[1]}) {
						row = append(row, s.reading(r, pair[0]), s.reading(r, pair[1]))
						any = true
					} else {
						row = append(row, "", "")
					}
				}
				if any {
					rows = append(rows, row)
				}
			}
			freeRows = append(freeRows, rows...)
			for i := range h.pairs {
				for _, row := range rows {
					if row[2*i] != "" {
						appendValue("free_angle", row[2*i])
						appendValue("free_period", row[2*i+1])
					}
				}
			}
		case "damped":
			type record struct {
				r    int
				a, b string
			}
			groups := [][]record{}
			group := []record{}
			below := []string{}
			for r := h.row + 1; r < end; r++ {
				summary := false
				for c := 1; c <= s.maxCol; c++ {
					v := s.get(r, c)
					if strings.HasPrefix(header(v), "10t") {
						below = append(below, s.adjacent(r, c))
						summary = true
					}
					if strings.Contains(v, "平均") {
						summary = true
					}
				}
				if summary || !occupied(r, h.angles[:2]) {
					continue
				}
				index := dec(s.reading(r, h.indices[0]))
				if index.Equal(one) && len(group) > 0 {
					groups = append(groups, group)
					group = nil
				}
				if !index.Equal(n(len(group) + 1)) {
					fail("阻尼峰值序号不连续")
				}
				if len(h.indices) > 1 && !dec(s.reading(r, h.indices[1])).Equal(index.Add(n(5))) {
					fail("阻尼第二次数应为 n+5")
				}
				group = append(group, record{r, s.reading(r, h.angles[0]), s.reading(r, h.angles[1])})
			}
			if len(group) > 0 {
				groups = append(groups, group)
			}
			for i, g := range groups {
				if len(g) != 5 {
					fail("每次阻尼测量需要十个峰值")
				}
				timing := ""
				if len(h.timings) > 0 {
					timing = s.reading(g[0].r, h.timings[0])
				} else if i < len(below) {
					timing = tableNumber(below[i], "10T")
				} else {
					fail("缺少阻尼 10T 计时")
				}
				appendValue("damped_period", div(dec(timing), n(10)).String())
				trial := fmt.Sprint(len(p.Data["damped_period"]))
				for _, r := range g {
					appendValue("damped_peak", r.a)
				}
				for j, r := range g {
					appendValue("damped_peak", r.b)
					dampedRows = append(dampedRows, []string{trial, timing, fmt.Sprint(j + 1), r.a, r.b})
				}
			}
		case "forced":
			if rawForced && !h.raw {
				continue
			}
			count := 0
			for r := h.row + 1; r < end; r++ {
				cols := []int{h.periods[0], h.angles[0], h.phases[0]}
				if !occupied(r, cols) {
					continue
				}
				instruction := false
				for c := 1; c <= s.maxCol; c++ {
					if strings.Contains(s.get(r, c), "利用表") {
						instruction = true
					}
				}
				if instruction {
					break
				}
				count++
				if len(h.indices) > 0 && !dec(s.reading(r, h.indices[0])).Equal(n(count)) {
					fail("受迫振动序号不连续")
				}
				period, amplitude := s.reading(r, cols[0]), s.reading(r, cols[1])
				if strings.Contains(header(s.get(h.row, cols[0])), "10t") {
					period = div(dec(period), n(10)).String()
				}
				phaseText := strings.TrimSpace(s.get(r, cols[2]))
				phase := dec(phaseText)
				if phase.IsNegative() || phase.GreaterThan(n(180)) {
					fail("相位应在 0 至 180 度之间")
				}
				appendValue("drive_period", period)
				appendValue("amplitude", amplitude)
				appendValue("phase", phaseText)
				forcedRows = append(forcedRows, []string{fmt.Sprint(len(forcedRows) + 1), period, amplitude, phaseText})
			}
		}
	}
	for _, k := range []string{"free_angle", "free_period", "damped_peak", "damped_period", "drive_period", "amplitude", "phase"} {
		if len(p.Data[k]) == 0 {
			fail("XLSX 测量表缺少有效数据")
		}
	}
	for i, row := range freeRows {
		for len(row) < width {
			row = append(row, "")
		}
		freeRows[i] = row
	}
	fh := []string{}
	for i := 1; i <= width/2; i++ {
		fh = append(fh, fmt.Sprintf("振幅%d/°", i), fmt.Sprintf("周期%d/s", i))
	}
	p.SourceTables = []domain.Table{{Title: "波尔共振 XLSX 自由振动原始记录（各列依次续接）", Headers: fh, Rows: freeRows}, {Title: "波尔共振 XLSX 阻尼原始记录（档位 " + string(p.Parameters["damping_setting"]) + "）", Headers: []string{"测量组", "10T/s", "n", "峰值n/°", "峰值(n+5)/°"}, Rows: dampedRows}, {Title: "波尔共振 XLSX 受迫振动原始记录", Headers: []string{"序号", "驱动单周期/s", "稳定振幅/°", "滞后角正读数/°"}, Rows: forcedRows}}
	return p
}
