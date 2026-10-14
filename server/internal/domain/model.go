package domain

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

type Scalar string

func (s *Scalar) UnmarshalJSON(b []byte) error {
	if bytes.Equal(b, []byte("null")) {
		*s = ""
		return nil
	}
	if len(b) > 0 && b[0] == '"' {
		var v string
		if e := json.Unmarshal(b, &v); e != nil {
			return e
		}
		*s = Scalar(v)
		return nil
	}
	var v json.Number
	d := json.NewDecoder(bytes.NewReader(b))
	d.UseNumber()
	var x any
	if e := d.Decode(&x); e != nil {
		return e
	}
	var ok bool
	v, ok = x.(json.Number)
	if !ok {
		return fmt.Errorf("读数必须是字符串或数字")
	}
	*s = Scalar(v.String())
	return nil
}

type Table struct {
	Title   string     `json:"title"`
	Headers []string   `json:"headers"`
	Rows    [][]string `json:"rows"`
}
type Payload struct {
	ExperimentID string              `json:"experimentId"`
	Data         map[string][]Scalar `json:"data"`
	Parameters   map[string]Scalar   `json:"parameters"`
	ReportInfo   map[string]string   `json:"reportInfo,omitempty"`
	SourceTables []Table             `json:"sourceTables,omitempty"`
	Geometry     map[string][]Scalar `json:"geometryReadings,omitempty"`
}

func Decode(b []byte) (Payload, error) {
	var p Payload
	d := json.NewDecoder(bytes.NewReader(b))
	e := d.Decode(&p)
	if e == nil {
		var extra any
		if d.Decode(&extra) != io.EOF {
			e = fmt.Errorf("只允许一个 JSON 对象")
		}
	}
	return p, e
}

type Image struct {
	Name    string
	Content []byte
}
type Job struct {
	ID           string  `json:"id"`
	ExperimentID string  `json:"experimentId"`
	Status       string  `json:"status"`
	Progress     int     `json:"progress"`
	Stage        string  `json:"stage"`
	Error        *string `json:"error"`
	QueueAhead   int     `json:"queueAhead"`
	CreatedAt    string  `json:"createdAt"`
	ImageCount   int     `json:"imageCount"`
}
type Session struct {
	UserID     string `json:"userId"`
	DailyLimit int    `json:"dailyLimit"`
	UsedToday  int    `json:"usedToday"`
	QueueAhead int    `json:"queueAheadIfSubmitted"`
	Jobs       []Job  `json:"jobs"`
}
