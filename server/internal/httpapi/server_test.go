package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/storage"
	"testing"
	"time"
)

func TestAPIQueueOwnershipQuotaAndRestart(t *testing.T) {
	dir := t.TempDir()
	q, e := storage.Open(dir, func(_ context.Context, _ domain.Payload, _ string, progress func(int, string)) ([]byte, error) {
		progress(50, "test")
		return []byte("%PDF-test"), nil
	})
	if e != nil {
		t.Fatal(e)
	}
	s := New(q, "test", "", true)
	request := func(method, path string, body []byte, cookie *http.Cookie) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, bytes.NewReader(body))
		if cookie != nil {
			r.AddCookie(cookie)
		}
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		s.ServeHTTP(w, r)
		return w
	}
	health := request("GET", "/api/health", nil, nil)
	if health.Code != 200 || len(health.Result().Cookies()) != 0 {
		t.Fatal(health)
	}
	session := request("GET", "/api/reports/session", nil, nil)
	cookie := session.Result().Cookies()[0]
	if !cookie.Secure || !cookie.HttpOnly || len(cookie.Value) != 64 {
		t.Fatal(cookie)
	}
	data, e := os.ReadFile("../../testdata/calculations.json")
	if e != nil {
		t.Fatal(e)
	}
	var cases []struct{ Payload domain.Payload }
	json.Unmarshal(data, &cases)
	payload, _ := json.Marshal(cases[0].Payload)
	bad := request("POST", "/api/reports/jobs", []byte(`{"experimentId":"unknown"}`), cookie)
	if bad.Code != 400 {
		t.Fatal(bad.Code)
	}
	submit := request("POST", "/api/reports/jobs", payload, cookie)
	if submit.Code != 202 {
		t.Fatal(submit.Code, submit.Body.String())
	}
	var job domain.Job
	json.Unmarshal(submit.Body.Bytes(), &job)
	if job.Status != "queued" {
		t.Fatal(job)
	}
	foreign := request("GET", "/api/reports/jobs/"+job.ID, nil, nil)
	if foreign.Code != 404 {
		t.Fatal("ownership", foreign.Code)
	}
	q.Start()
	for i := 0; i < 100; i++ {
		current := request("GET", "/api/reports/jobs/"+job.ID, nil, cookie)
		json.Unmarshal(current.Body.Bytes(), &job)
		if job.Status == "done" {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if job.Status != "done" {
		t.Fatal(job)
	}
	download := request("GET", "/api/reports/jobs/"+job.ID+"/download", nil, cookie)
	if download.Code != 200 || download.Body.String() != "%PDF-test" {
		t.Fatal(download.Code, download.Body.String())
	}
	if request("GET", "/api/reports/jobs/"+job.ID+"/download", nil, nil).Code != 404 {
		t.Fatal("download leaked")
	}
	if e = q.Close(); e != nil {
		t.Fatal(e)
	}
	q, e = storage.Open(dir, nil)
	if e != nil {
		t.Fatal(e)
	}
	defer q.Close()
	s.Queue = q
	recovered := request("GET", "/api/reports/session", nil, cookie)
	var state domain.Session
	json.Unmarshal(recovered.Body.Bytes(), &state)
	if state.UsedToday != 1 || len(state.Jobs) != 1 || state.Jobs[0].Status != "done" {
		t.Fatal(state)
	}
	for i := 1; i < 50; i++ {
		if w := request("POST", "/api/reports/jobs", payload, cookie); w.Code != 202 {
			t.Fatalf("job %d: %d %s", i, w.Code, w.Body.String())
		}
	}
	if w := request("POST", "/api/reports/jobs", payload, cookie); w.Code != 429 {
		t.Fatal(w.Code, w.Body.String())
	}
	if _, e = storage.Open(dir, nil); e == nil {
		t.Fatal("second writer accepted")
	}
}
func TestMultipartImports(t *testing.T) {
	q, e := storage.Open(t.TempDir(), nil)
	if e != nil {
		t.Fatal(e)
	}
	defer q.Close()
	s := New(q, "test", "", false)
	content, e := os.ReadFile("../../testdata/vibration-shifted.xlsx")
	if e != nil {
		t.Fatal(e)
	}
	boundary := "test-boundary"
	body := []byte(fmt.Sprintf("--%s\r\nContent-Disposition: form-data; name=\"payload\"\r\n\r\n{\"experimentId\":\"forced-vibration\",\"reportInfo\":{\"student\":\"覆盖姓名\"}}\r\n--%s\r\nContent-Disposition: form-data; name=\"table\"; filename=\"data.xlsx\"\r\nContent-Type: application/octet-stream\r\n\r\n", boundary, boundary))
	body = append(body, content...)
	body = append(body, []byte("\r\n--"+boundary+"--\r\n")...)
	for _, header := range []string{"", "1"} {
		r := httptest.NewRequest("POST", "/api/reports/import-table", bytes.NewReader(body))
		r.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)
		r.Header.Set("X-Report-Request", header)
		w := httptest.NewRecorder()
		s.ServeHTTP(w, r)
		if header == "" {
			if w.Code != 400 {
				t.Fatal(w.Code)
			}
			continue
		}
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		var p domain.Payload
		if e = json.Unmarshal(w.Body.Bytes(), &p); e != nil {
			t.Fatal(e)
		}
		if p.ReportInfo["student"] != "覆盖姓名" || len(p.Data["drive_time_10"]) == 0 {
			t.Fatal(p)
		}
		cookie := w.Result().Cookies()[0]
		session, e := q.Session(context.Background(), cookie.Value)
		if e != nil || session.UsedToday != 0 {
			t.Fatal(session, e)
		}
	}
}
