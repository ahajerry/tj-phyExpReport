package httpapi

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"phyexp/server/internal/domain"
)

//go:embed mcp-catalog.json
var catalogJSON []byte

type catalogField struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Count    int    `json:"count"`
	Optional bool   `json:"optional"`
	Initial  string `json:"initial"`
}

type catalogEntry struct {
	ID           string          `json:"id"`
	Title        string          `json:"title"`
	Measurements []catalogField  `json:"measurements"`
	Parameters   []catalogField  `json:"parameters"`
	Details      json.RawMessage `json:"-"`
}

func readCatalog() ([]catalogEntry, error) {
	var raw []json.RawMessage
	if err := json.Unmarshal(catalogJSON, &raw); err != nil {
		return nil, err
	}
	entries := make([]catalogEntry, len(raw))
	for i, entry := range raw {
		if err := json.Unmarshal(entry, &entries[i]); err != nil {
			return nil, err
		}
		entries[i].Details = entry
	}
	return entries, nil
}

var decimalReading = regexp.MustCompile(`^([+-]?)([0-9]*)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?$`)
var productReading = regexp.MustCompile(`^([+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s*[×xX*]\s*10\s*(?:\^\s*([+−-]?[0-9]+)|([⁺⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))$`)
var superscriptReading = strings.NewReplacer("⁺", "+", "⁻", "-", "⁰", "0", "¹", "1", "²", "2", "³", "3", "⁴", "4", "⁵", "5", "⁶", "6", "⁷", "7", "⁸", "8", "⁹", "9")

func readingText(value domain.Scalar, shift int, blank bool) (domain.Scalar, error) {
	text := strings.TrimSpace(string(value))
	if blank && text == "" {
		return "", nil
	}
	if match := productReading.FindStringSubmatch(text); match != nil {
		text = match[1] + "e" + strings.ReplaceAll(match[2], "−", "-") + superscriptReading.Replace(match[3])
	}
	parts := decimalReading.FindStringSubmatch(text)
	if parts == nil || parts[2]+parts[3] == "" {
		return "", fmt.Errorf("需要填写有效数字")
	}
	exponent := 0
	if parts[4] != "" {
		var err error
		exponent, err = strconv.Atoi(parts[4])
		if err != nil || exponent < -1000 || exponent > 1000 {
			return "", fmt.Errorf("数字指数超出范围")
		}
	}
	if shift == 0 {
		return domain.Scalar(text), nil
	}
	digits := parts[2] + parts[3]
	point := len(parts[2]) + exponent + shift
	switch {
	case point <= 0:
		digits = "0." + strings.Repeat("0", -point) + digits
	case point >= len(digits):
		digits += strings.Repeat("0", point-len(digits))
	default:
		digits = digits[:point] + "." + digits[point:]
	}
	digits = strings.TrimLeft(digits, "0")
	if digits == "" || digits[0] == '.' {
		digits = "0" + digits
	}
	return domain.Scalar(parts[1] + digits), nil
}

func (e catalogEntry) flatPayload(raw json.RawMessage, info map[string]string) (domain.Payload, error) {
	p := domain.Payload{ExperimentID: e.ID, Data: map[string][]domain.Scalar{}, Parameters: map[string]domain.Scalar{}, ReportInfo: info}
	var fields map[string]json.RawMessage
	if len(raw) > 64<<10 || json.Unmarshal(raw, &fields) != nil || fields == nil {
		return p, fmt.Errorf("实验数据须为不超过 64 KiB 的 JSON 对象")
	}
	for _, field := range e.Measurements {
		var values []domain.Scalar
		if value, ok := fields[field.ID]; ok {
			if err := json.Unmarshal(value, &values); err != nil || values == nil {
				return p, fmt.Errorf("%s必须是读数数组", field.Label)
			}
			delete(fields, field.ID)
		}
		if e.ID == "millikan" {
			if !(field.Optional && len(values) == 0) && (len(values) < 12 || len(values) > field.Count) {
				return p, fmt.Errorf("%s需要 12 至 %d 个读数", field.Label, field.Count)
			}
		} else if e.ID != "forced-vibration" && len(values) != field.Count {
			return p, fmt.Errorf("%s需要 %d 个读数", field.Label, field.Count)
		}
		for i, value := range values {
			reading, err := readingText(value, 0, field.Optional || e.ID == "millikan")
			if err != nil {
				return p, fmt.Errorf("%s第 %d 项%s", field.Label, i+1, err)
			}
			values[i] = reading
		}
		if e.ID == "millikan" {
			values = append(values, make([]domain.Scalar, field.Count-len(values))...)
		}
		p.Data[field.ID] = values
	}
	for _, field := range e.Parameters {
		value := domain.Scalar(field.Initial)
		if input, ok := fields[field.ID]; ok {
			if bytes.Equal(input, []byte("null")) || json.Unmarshal(input, &value) != nil {
				return p, fmt.Errorf("%s需要填写数字", field.Label)
			}
			delete(fields, field.ID)
		}
		shift := 0
		if e.ID == "speed-of-sound" && (strings.HasPrefix(field.ID, "res_frequency") || strings.HasPrefix(field.ID, "phase_frequency")) {
			shift = -3
		}
		reading, err := readingText(value, shift, false)
		if err != nil {
			return p, fmt.Errorf("%s%s", field.Label, err)
		}
		p.Parameters[field.ID] = reading
	}
	if len(fields) != 0 {
		return p, fmt.Errorf("实验数据含有未知字段，请核对实验字段")
	}
	return p, nil
}
