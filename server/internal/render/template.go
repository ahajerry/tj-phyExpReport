package render

import (
	"encoding/json"
	"fmt"
	"math"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

const TypstVersion = "0.15.1"

type templateData struct {
	Title  string                     `json:"title"`
	Fields map[string]string          `json:"fields"`
	Data   map[string][]domain.Scalar `json:"data"`
	Plots  map[string][][2]string     `json:"plots"`
	Tables []domain.Table             `json:"tables"`
	Images []string                   `json:"images"`
}

var pointRE = regexp.MustCompile(`\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*\)`)

var plotFields = map[string][]string{
	"young-modulus":     {"young_graph_points", "young_graph_line", "young_graph_a", "young_graph_b"},
	"millikan":          {"charge_graph_points", "charge_graph_fit_points"},
	"moment-of-inertia": {"slider_graph_points", "slider_graph_theory_points"},
	"forced-vibration":  {"normalized_amplitude_graph_points", "half_power_line_points", "phase_graph_points"},
}

// Plot coordinates are calculated in Go. Only this rendering adapter parses
// the existing coordinate representation; physical calculations stay in Go.
func parsePoints(raw string) ([][2]string, error) {
	if strings.TrimSpace(pointRE.ReplaceAllString(raw, "")) != "" {
		return nil, fmt.Errorf("作图坐标无效")
	}
	matches := pointRE.FindAllStringSubmatch(raw, -1)
	if len(matches) == 0 || len(matches) > 10000 {
		return nil, fmt.Errorf("作图坐标数量无效")
	}
	points := make([][2]string, 0, len(matches))
	for _, m := range matches {
		for _, v := range m[1:] {
			n, err := strconv.ParseFloat(v, 64)
			if err != nil || math.IsNaN(n) || math.IsInf(n, 0) {
				return nil, fmt.Errorf("作图坐标无效")
			}
		}
		points = append(points, [2]string{m[1], m[2]})
	}
	return points, nil
}

func ValidateTables(tables []domain.Table) error {
	if len(tables) > 3 {
		return fmt.Errorf("原始数据表最多三张")
	}
	for _, t := range tables {
		if len(t.Headers) < 2 || len(t.Headers) > 8 || len(t.Rows) > 60 || utf8.RuneCountInString(t.Title) > 200 {
			return fmt.Errorf("原始数据表格式无效")
		}
		for _, row := range append([][]string{t.Headers}, t.Rows...) {
			if len(row) != len(t.Headers) {
				return fmt.Errorf("原始数据表列数不一致")
			}
			for _, cell := range row {
				if utf8.RuneCountInString(cell) > 80 {
					return fmt.Errorf("表格单元格过长")
				}
			}
		}
	}
	return nil
}

func DataJSON(fields map[string]string, p domain.Payload, images []string) ([]byte, error) {
	if err := ValidateTables(p.SourceTables); err != nil {
		return nil, err
	}
	d := templateData{Title: experiments.Title(p.ExperimentID), Fields: fields, Data: p.Data,
		Plots: map[string][][2]string{}, Tables: []domain.Table{}, Images: append([]string{}, images...)}
	for _, key := range plotFields[p.ExperimentID] {
		points, err := parsePoints(fields[key])
		if err != nil {
			return nil, fmt.Errorf("%s: %w", key, err)
		}
		d.Plots[key] = points
	}
	for _, table := range p.SourceTables {
		if p.ExperimentID == "millikan" && len(table.Headers) == 4 {
			empty := true
			for _, row := range table.Rows {
				if strings.TrimSpace(row[3]) != "" {
					empty = false
					break
				}
			}
			if empty {
				table.Headers = table.Headers[:3]
				rows := make([][]string, len(table.Rows))
				for i, row := range table.Rows {
					rows[i] = row[:3]
				}
				table.Rows = rows
			}
		}
		d.Tables = append(d.Tables, table)
	}
	// JSON strings, never source interpolation or eval, are the user-data boundary.
	return json.MarshalIndent(d, "", "  ")
}
