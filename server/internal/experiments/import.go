package experiments

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"golang.org/x/text/encoding/simplifiedchinese"
	"io"
	"path/filepath"
	"phyexp/server/internal/domain"
	"strings"
	"unicode/utf8"
)

func Import(id, name string, content []byte) (p domain.Payload, err error) {
	defer guard(&err)
	if len(content) == 0 || len(content) > 2<<20 {
		fail("数据表必须小于 2 MiB 且不能为空")
	}
	ext := strings.ToLower(filepath.Ext(name))
	switch {
	case id == "millikan" && ext == ".csv":
		p = importOil(content)
	case id == "moment-of-inertia" && ext == ".xlsx":
		p = importTorsion(content)
	case id == "forced-vibration" && ext == ".xlsx":
		p = importVibration(content)
	default:
		fail("密立根油滴请上传 CSV，扭摆法和波尔共振请上传 XLSX")
	}
	p.ExperimentID = id
	return p, nil
}
func importOil(content []byte) domain.Payload {
	if !utf8.Valid(content) {
		var e error
		content, e = simplifiedchinese.GB18030.NewDecoder().Bytes(content)
		if e != nil {
			fail("CSV 编码无效")
		}
	}
	content = bytes.TrimPrefix(content, []byte{239, 187, 191})
	r := csv.NewReader(bytes.NewReader(content))
	r.FieldsPerRecord = -1
	rows := [][]string{}
	for {
		row, e := r.Read()
		if e == io.EOF {
			break
		}
		if e != nil {
			fail("CSV 格式无效")
		}
		rows = append(rows, row)
	}
	if len(rows) == 0 || !strings.Contains(strings.Join(rows[0], ""), "平衡电压") || !strings.Contains(strings.Join(rows[0], ""), "时间") {
		fail("CSV 表头需包含平衡电压和时间")
	}
	records := [][]string{}
	for _, row := range rows[1:] {
		if strings.TrimSpace(strings.Join(row, "")) != "" {
			records = append(records, row)
		}
	}
	if len(records)%4 != 0 || len(records) < 12 || len(records) > 32 {
		fail("CSV 需要 3 至 8 颗油滴，每颗连续四行")
	}
	p := domain.Payload{Data: map[string][]domain.Scalar{}, Parameters: map[string]domain.Scalar{}}
	source := [][]string{}
	for i := 0; i < len(records); i += 4 {
		vs := []D{}
		for j := 0; j < 4; j++ {
			row := records[i+j]
			if len(row) < 3 {
				fail("CSV 缺少电压或时间")
			}
			v, t := tableNumber(row[1], "平衡电压"), tableNumber(row[2], "下降时间")
			vs = append(vs, dec(v))
			key := fmt.Sprintf("time_%d", j+1)
			p.Data[key] = append(p.Data[key], domain.Scalar(t))
			original := make([]string, 4)
			copy(original, row)
			source = append(source, original)
		}
		p.Data["voltage"] = append(p.Data["voltage"], scalar(mean(vs)))
	}
	for k, a := range p.Data {
		for len(a) < 8 {
			a = append(a, "")
		}
		p.Data[k] = a
	}
	headers := oilHeaders
	if len(rows[0]) == 4 {
		headers = rows[0]
	}
	p.SourceTables = []domain.Table{{Title: "密立根油滴仪 CSV 原始记录", Headers: headers, Rows: source}}
	return p
}
func importTorsion(content []byte) domain.Payload {
	s := workbook(content, "")
	if !strings.Contains(s.at("A1"), "扭摆") || !strings.Contains(s.at("A34"), "滑块质量") {
		fail("XLSX 不是扭摆实验数据表")
	}
	p := domain.Payload{Data: map[string][]domain.Scalar{}, Parameters: map[string]domain.Scalar{}, Geometry: map[string][]domain.Scalar{}, ReportInfo: map[string]string{"student": s.at("E3"), "student_id": s.at("H3"), "date": s.at("H4")}}
	if len(p.ReportInfo["date"]) > 10 {
		p.ReportInfo["date"] = p.ReportInfo["date"][:10]
	}
	for k, row := range map[string]int{"cylinder": 16, "disk": 17, "tube": 29, "ball": 30, "rod": 31} {
		for c := 3; c <= 5; c++ {
			p.Data["time_"+k] = append(p.Data["time_"+k], domain.Scalar(s.reading(row, c)))
		}
	}
	for i, x := range []int{5, 10, 15, 20} {
		row := 37 + i
		if !dec(s.reading(row, 1)).Equal(n(x)) {
			fail("滑块距离与模板不一致")
		}
		for c := 3; c <= 5; c++ {
			k := fmt.Sprintf("slider_time_%d", x)
			p.Data[k] = append(p.Data[k], domain.Scalar(s.reading(row, c)))
		}
	}
	for k, row := range map[string]int{"cylinder": 12, "tube_inner": 22, "tube_outer": 23, "ball": 24, "rod": 25} {
		a := []D{}
		for c := 3; c <= 5; c++ {
			v := s.reading(row, c)
			p.Geometry[k] = append(p.Geometry[k], domain.Scalar(v))
			a = append(a, dec(v))
		}
		target := "diameter_" + k + "_mm"
		if k == "rod" {
			target = "length_rod_mm"
		}
		p.Parameters[target] = domain.Scalar(fixed(mean(a).Mul(n(10)), 3))
	}
	for k, row := range map[string]int{"cylinder": 12, "tube": 22, "ball": 24, "rod": 25} {
		p.Parameters["mass_"+k+"_g"] = scalar(dec(s.reading(row, 2)).Mul(n(1000)))
	}
	p.Parameters["slider_mass_g"] = scalar(mean([]D{dec(s.reading(34, 2)), dec(s.reading(34, 3))}).Mul(n(1000)))
	p.Parameters["slider_self_inertia"] = scalar(div(dec(s.reading(34, 8)).Mul(dec("1e-4")), n(2)))
	gr, tr := [][]string{}, [][]string{}
	for _, r := range []int{12, 22, 23, 24, 25} {
		gr = append(gr, []string{s.get(r, 1), s.get(r, 2), s.get(r, 3), s.get(r, 4), s.get(r, 5)})
	}
	for _, r := range []int{16, 17, 29, 30, 31, 37, 38, 39, 40} {
		label := s.get(r, 1)
		if r == 29 && label == "" {
			label = "圆筒"
		}
		tr = append(tr, []string{label, s.get(r, 2), s.get(r, 3), s.get(r, 4), s.get(r, 5)})
	}
	p.SourceTables = []domain.Table{{Title: "扭摆仪 XLSX 质量与尺寸记录", Headers: []string{"物体", "质量/kg", "尺寸1/cm", "尺寸2/cm", "尺寸3/cm"}, Rows: gr}, {Title: "扭摆仪 XLSX 周期计时记录", Headers: []string{"物体/位置", "周期数", "时长1/s", "时长2/s", "时长3/s"}, Rows: tr}, {Title: "扭摆仪 XLSX 滑块参数", Headers: []string{"滑块1质量/kg", "滑块2质量/kg", "两滑块自身惯量/×10⁻⁴ kg·m²"}, Rows: [][]string{{s.at("B34"), s.at("C34"), s.at("H34")}}}}
	return p
}
