package render

import (
	"fmt"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

const begin = "% ===== 数据输入区开始 ====="
const end = "% ===== 数据输入区结束 ====="
const imageMarker = "% ===== 原始数据图片插入区 ====="

var fieldRE = regexp.MustCompile(`\\(?:Math)?Field(?:\[[^\]]+\])?\{([a-z][a-z0-9_]*)\}`)
var plotRE = regexp.MustCompile(`\\PlotCoordinates\{([a-z][a-z0-9_]*)\}`)
var pointsRE = regexp.MustCompile(`^(?:\s*\([-+\d.eE]+,[-+\d.eE]+\))+\s*$`)
var numberRE = regexp.MustCompile(`^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`)
var texEscaper = strings.NewReplacer(`\`, `\textbackslash{}`, `{`, `\{`, `}`, `\}`, `&`, `\&`, `#`, `\#`, `%`, `\%`, `$`, `\$`, `_`, `\_`, `~`, `\textasciitilde{}`, `^`, `\textasciicircum{}`)

func escape(s string) string { return texEscaper.Replace(s) }
func mathNumber(s string) string {
	if !numberRE.MatchString(s) {
		return ""
	}
	parts := regexp.MustCompile(`[eE]`).Split(s, -1)
	if len(parts) == 1 {
		return s
	}
	e, err := strconv.Atoi(parts[1])
	if err != nil {
		return ""
	}
	return fmt.Sprintf(`%s\times 10^{%d}`, parts[0], e)
}
func ValidateTables(tables []domain.Table) error {
	if len(tables) > 3 {
		return fmt.Errorf("原始数据表最多三张")
	}
	for _, t := range tables {
		if len(t.Headers) < 2 || len(t.Headers) > 8 || len(t.Rows) > 60 || utf8.RuneCountInString(t.Title) > 200 {
			return fmt.Errorf("原始数据表格式无效")
		}
		for _, r := range append([][]string{t.Headers}, t.Rows...) {
			if len(r) != len(t.Headers) {
				return fmt.Errorf("原始数据表列数不一致")
			}
			for _, c := range r {
				if utf8.RuneCountInString(c) > 80 {
					return fmt.Errorf("表格单元格过长")
				}
			}
		}
	}
	return nil
}
func Fill(source string, fields map[string]string, p domain.Payload, images []string) (string, error) {
	if strings.Count(source, begin) != 1 || strings.Count(source, end) != 1 || strings.Count(source, imageMarker) != 1 {
		return "", fmt.Errorf("模板标记缺失或重复")
	}
	start, stop := strings.Index(source, begin)+len(begin), strings.Index(source, end)
	if start >= stop {
		return "", fmt.Errorf("模板标记顺序错误")
	}
	allowed := map[string]bool{"experiment": true, "student": true, "student_id": true, "group": true, "date": true}
	for _, m := range fieldRE.FindAllStringSubmatch(source, -1) {
		allowed[m[1]] = true
	}
	plots := map[string]bool{}
	for _, m := range plotRE.FindAllStringSubmatch(source, -1) {
		plots[m[1]] = true
		if !pointsRE.MatchString(fields[m[1]]) {
			return "", fmt.Errorf("%s 作图坐标无效", m[1])
		}
	}
	values := map[string]string{"experiment": experiments.Title(p.ExperimentID)}
	for k, v := range fields {
		if allowed[k] {
			values[k] = v
		}
	}
	keys := []string{}
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	lines := []string{}
	for _, k := range keys {
		lines = append(lines, `\SetField{`+k+`}{`+escape(values[k])+`}`)
	}
	if len(images) > 0 || len(p.SourceTables) > 0 {
		lines = append(lines, `\reportimagestrue`)
	}
	for _, k := range keys {
		if v := mathNumber(values[k]); v != "" {
			lines = append(lines, `\SetField{math_`+k+`}{`+v+`}`)
		}
	}
	filled := source[:start] + "\n" + strings.Join(lines, "\n") + "\n" + source[stop:]
	filled = plotRE.ReplaceAllStringFunc(filled, func(m string) string { return fields[plotRE.FindStringSubmatch(m)[1]] })
	if err := ValidateTables(p.SourceTables); err != nil {
		return "", err
	}
	pages := []string{}
	for _, table := range p.SourceTables {
		width := fmt.Sprintf("%.2f", (14.3-.45*float64(len(table.Headers)))/float64(len(table.Headers)))
		row := func(cells []string) string {
			v := []string{}
			for _, c := range cells {
				v = append(v, escape(c))
			}
			return strings.Join(v, " & ") + `\\\hline`
		}
		body := []string{}
		for _, r := range table.Rows {
			body = append(body, row(r))
		}
		keep := ""
		if strings.Contains(source, `\input{physics_report_base.tex}`) {
			keep = `\Needspace{6\baselineskip}`
		}
		pages = append(pages, strings.Join([]string{keep, `\par\medskip\noindent{\heiti ` + escape(table.Title) + `}\par`, `{\footnotesize\renewcommand{\arraystretch}{1.15}`, `\begin{longtable}{|` + strings.Repeat("p{"+width+"cm}|", len(table.Headers)) + `}\hline`, row(table.Headers), `\endfirsthead\hline`, row(table.Headers), `\endhead`, strings.Join(body, "\n"), `\end{longtable}}`}, "\n"))
	}
	for i, name := range images {
		prefix := ""
		if i > 0 {
			prefix = "\\clearpage\n\\thispagestyle{record}\n"
			if !strings.Contains(source, `\input{physics_report_base.tex}`) {
				prefix += "\\bindingline[3.03]\n"
			}
		}
		pages = append(pages, prefix+fmt.Sprintf("\\begin{center}\n{\\heiti 原始数据记录（第 %d 张）\\par}\n\\vspace{0.5cm}\n\\includegraphics[width=\\textwidth,height=19cm,keepaspectratio]{%s}\n\\end{center}", i+1, name))
	}
	return strings.Replace(filled, imageMarker, strings.Join(pages, "\n"), 1), nil
}
func Template(dir string, p domain.Payload, fields map[string]string) (string, error) {
	b, e := os.ReadFile(filepath.Join(dir, p.ExperimentID+".tex"))
	if e != nil {
		return "", e
	}
	s := string(b)
	if p.ExperimentID == "heat-capacity-ratio" {
		if _, current := p.Data["time_100"]; !current {
			s = strings.ReplaceAll(s, `U_{TB}=\frac{0.1}{100}`, `U_{TB}=\frac{\MathField{period_error_s}}{\sqrt3}`)
		}
	}
	if p.ExperimentID == "forced-vibration" {
		for key, table := range measurementTables(len(p.Data["free_angle"]), len(p.Data["damped_period"]), len(p.Data["drive_period"])) {
			re := regexp.MustCompile(`(?s)% BEGIN ` + key + `_TABLE.*?% END ` + key + `_TABLE`)
			s = re.ReplaceAllStringFunc(s, func(_ string) string { return "% BEGIN " + key + "_TABLE\n" + table + "\n% END " + key + "_TABLE" })
		}
	}
	return s, nil
}
