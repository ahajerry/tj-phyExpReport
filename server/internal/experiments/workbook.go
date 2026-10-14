package experiments

// Read only worksheet values (including cached formula values), never execute
// formulas or follow external relationships. Bound both ZIP and XML expansion.
import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"math"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type sheet struct {
	cells          map[[2]int]string
	maxRow, maxCol int
	merges         [][4]int
}

func cellCoords(s string) (row, col int) {
	i := 0
	for i < len(s) && s[i] >= 'A' && s[i] <= 'Z' {
		col = col*26 + int(s[i]-'A'+1)
		i++
	}
	row, _ = strconv.Atoi(s[i:])
	return
}
func (s *sheet) get(r, c int) string  { return s.cells[[2]int{r, c}] }
func (s *sheet) at(ref string) string { r, c := cellCoords(ref); return s.get(r, c) }
func (s *sheet) adjacent(r, c int) string {
	for _, m := range s.merges {
		if r >= m[0] && r <= m[2] && c >= m[1] && c <= m[3] {
			return s.get(r, m[3]+1)
		}
	}
	return s.get(r, c+1)
}
func workbook(content []byte, wanted string) *sheet {
	z, e := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if e != nil {
		fail("XLSX 文件损坏")
	}
	files := map[string]*zip.File{}
	var total uint64
	for _, f := range z.File {
		total += f.UncompressedSize64
		if total > 32<<20 || len(z.File) > 2000 {
			fail("XLSX 解压内容过大")
		}
		files[f.Name] = f
	}
	read := func(name string) []byte {
		f := files[name]
		if f == nil {
			fail("XLSX 缺少 " + name)
		}
		r, e := f.Open()
		if e != nil {
			fail("无法读取 XLSX")
		}
		defer r.Close()
		b, e := io.ReadAll(io.LimitReader(r, 32<<20+1))
		if e != nil || len(b) > 32<<20 {
			fail("XLSX 内容无效")
		}
		return b
	}
	var wb struct {
		Properties struct {
			Date1904 bool `xml:"date1904,attr"`
		} `xml:"workbookPr"`
		Sheets []struct {
			Name string `xml:"name,attr"`
			ID   string `xml:"id,attr"`
		} `xml:"sheets>sheet"`
		Views []struct {
			Active int `xml:"activeTab,attr"`
		} `xml:"bookViews>workbookView"`
	}
	if xml.Unmarshal(read("xl/workbook.xml"), &wb) != nil || len(wb.Sheets) == 0 {
		fail("XLSX 工作簿无效")
	}
	idx := 0
	if wanted != "" {
		idx = -1
		for i, s := range wb.Sheets {
			if s.Name == wanted {
				idx = i
			}
		}
		if idx < 0 {
			fail("XLSX 缺少“" + wanted + "”工作表")
		}
	} else if len(wb.Views) > 0 && wb.Views[0].Active < len(wb.Sheets) {
		idx = wb.Views[0].Active
	}
	var rel struct {
		Items []struct {
			ID     string `xml:"Id,attr"`
			Target string `xml:"Target,attr"`
			Mode   string `xml:"TargetMode,attr"`
		} `xml:"Relationship"`
	}
	if xml.Unmarshal(read("xl/_rels/workbook.xml.rels"), &rel) != nil {
		fail("XLSX 关系无效")
	}
	target := ""
	for _, r := range rel.Items {
		if r.ID == wb.Sheets[idx].ID && r.Mode != "External" {
			target = path.Join("xl", r.Target)
			if strings.HasPrefix(r.Target, "/") {
				target = strings.TrimPrefix(r.Target, "/")
			}
		}
	}
	if target == "" {
		fail("XLSX 工作表不存在")
	}
	type rich struct {
		Text string `xml:"t"`
		Runs []struct {
			Text string `xml:"t"`
		} `xml:"r"`
	}
	str := func(r rich) string {
		v := r.Text
		for _, x := range r.Runs {
			v += x.Text
		}
		return v
	}
	shared := []string{}
	dateStyles := map[int]bool{}
	if files["xl/styles.xml"] != nil {
		var styles struct {
			Formats []struct {
				ID   int    `xml:"numFmtId,attr"`
				Code string `xml:"formatCode,attr"`
			} `xml:"numFmts>numFmt"`
			Cells []struct {
				ID int `xml:"numFmtId,attr"`
			} `xml:"cellXfs>xf"`
		}
		if xml.Unmarshal(read("xl/styles.xml"), &styles) != nil {
			fail("XLSX 样式无效")
		}
		formats := map[int]bool{}
		for _, f := range styles.Formats {
			code := regexp.MustCompile(`"[^"]*"|\[[^\]]*\]|\\.`).ReplaceAllString(strings.ToLower(f.Code), "")
			formats[f.ID] = strings.ContainsAny(code, "yd")
		}
		for i, cell := range styles.Cells {
			dateStyles[i] = cell.ID >= 14 && cell.ID <= 22 || formats[cell.ID]
		}
	}
	if files["xl/sharedStrings.xml"] != nil {
		var ss struct {
			Items []rich `xml:"si"`
		}
		if xml.Unmarshal(read("xl/sharedStrings.xml"), &ss) != nil {
			fail("XLSX 字符串无效")
		}
		for _, r := range ss.Items {
			shared = append(shared, str(r))
		}
	}
	var ws struct {
		Rows []struct {
			Cells []struct {
				Ref    string `xml:"r,attr"`
				Type   string `xml:"t,attr"`
				Style  int    `xml:"s,attr"`
				Value  string `xml:"v"`
				Inline rich   `xml:"is"`
			} `xml:"c"`
		} `xml:"sheetData>row"`
		Merges []struct {
			Ref string `xml:"ref,attr"`
		} `xml:"mergeCells>mergeCell"`
	}
	if xml.Unmarshal(read(target), &ws) != nil {
		fail("XLSX 表内容无效")
	}
	s := &sheet{cells: map[[2]int]string{}}
	for _, row := range ws.Rows {
		for _, c := range row.Cells {
			r, col := cellCoords(c.Ref)
			if r < 1 || r > 10000 || col < 1 || col > 256 {
				fail("XLSX 行列超出限制")
			}
			v := c.Value
			if c.Type == "s" {
				i, e := strconv.Atoi(v)
				if e != nil || i < 0 || i >= len(shared) {
					fail("XLSX 字符串引用无效")
				}
				v = shared[i]
			} else if c.Type == "inlineStr" {
				v = str(c.Inline)
			} else if c.Type == "b" {
				v = "False"
				if c.Value == "1" {
					v = "True"
				}
			} else if (c.Type == "" || c.Type == "n") && dateStyles[c.Style] && v != "" {
				serial, err := strconv.ParseFloat(v, 64)
				if err != nil || math.IsNaN(serial) || math.IsInf(serial, 0) || serial < 0 || serial > 2958465 {
					fail("XLSX 日期无效")
				}
				epoch := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC)
				if wb.Properties.Date1904 {
					epoch = time.Date(1904, 1, 1, 0, 0, 0, 0, time.UTC)
				} else if serial > 0 && serial < 60 {
					serial++
				}
				day := int(serial)
				v = epoch.AddDate(0, 0, day).Add(time.Duration(math.Round((serial-float64(day))*86400000)) * time.Millisecond).Format("2006-01-02 15:04:05")
			}
			s.cells[[2]int{r, col}] = v
			if r > s.maxRow {
				s.maxRow = r
			}
			if col > s.maxCol {
				s.maxCol = col
			}
		}
	}
	for _, m := range ws.Merges {
		p := strings.Split(m.Ref, ":")
		if len(p) == 2 {
			a, b := cellCoords(p[0])
			c, d := cellCoords(p[1])
			s.merges = append(s.merges, [4]int{a, b, c, d})
		}
	}
	return s
}
func tableNumber(v, label string) string {
	x := dec(v)
	if !x.IsPositive() || !x.LessThan(dec("1e12")) {
		fail(label + " 必须为有效正数")
	}
	return strings.TrimSpace(v)
}
func (s *sheet) reading(r, c int) string {
	return tableNumber(s.get(r, c), fmt.Sprintf("第%d行%d列", r, c))
}
