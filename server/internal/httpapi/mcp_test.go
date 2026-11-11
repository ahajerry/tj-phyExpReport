package httpapi

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"phyexp/server/internal/storage"
)

func TestMCPGuestEnrollment(t *testing.T) {
	dir := t.TempDir()
	q, err := storage.Open(dir, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = q.Close() })
	build := func(enabled bool) http.Handler {
		t.Helper()
		h, err := New(q, "test", "", true).WithMCP("", enabled)
		if err != nil {
			t.Fatal(err)
		}
		return h
	}
	handler := build(false)
	request := func(method, path, token, peer, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, bytes.NewBufferString(body))
		r.RemoteAddr = peer
		r.Header.Set("Authorization", "Bearer "+token)
		r.Header.Set("X-Forwarded-For", storage.Token(4))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Accept", "application/json, text/event-stream")
		r.Header.Set("MCP-Protocol-Version", "2025-11-25")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	enroll := func(token, peer string) int {
		return request("POST", "/api/mcp/guest", token, peer, "").Code
	}
	first, second := storage.Token(32), storage.Token(32)
	const peer = "192.0.2.1:1000"
	const statusPath = "/mcp"
	if got := enroll(first, peer); got != 404 {
		t.Fatal("guest enrollment disabled", got)
	}
	handler = build(true)
	if got := request("POST", statusPath, first, peer, "{}"); got.Code != 401 {
		t.Fatal("unregistered bearer accepted", got.Code)
	}
	if got := enroll(first, peer); got != 204 {
		t.Fatal("first enrollment", got)
	}
	if got := enroll(second, peer); got != 204 {
		t.Fatal("second enrollment", got)
	}
	for i := range 28 {
		if got := enroll(storage.Token(32), fmt.Sprintf("192.0.2.1:%d", 1001+i)); got != 204 {
			t.Fatal(i, got)
		}
	}
	if got := enroll(storage.Token(32), peer); got != 429 {
		t.Fatal("source limit", got)
	}
	if got := enroll(first, peer); got != 204 {
		t.Fatal("enrollment replay", got)
	}
	ctx := context.Background()
	subject, err := q.GuestPrincipal(ctx, sha256.Sum256([]byte(first)))
	if err != nil || subject == "" {
		t.Fatal(subject, err)
	}
	payload := webSamples(t)["oscilloscope"]
	var job domain.Job
	for i := range 10 {
		job, err = q.CreateRequest(ctx, subject, fmt.Sprint(i), "test", payload, nil)
		if err != nil {
			t.Fatal(i, err)
		}
	}
	if _, err = q.CreateRequest(ctx, subject, "extra", "test", payload, nil); !errors.Is(err, storage.ErrQuota) {
		t.Fatal("per-guest quota", err)
	}
	if err := q.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := storage.Open(dir, nil)
	if err != nil {
		t.Fatal(err)
	}
	q = reopened
	handler = build(true)
	rpc := fmt.Sprintf(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_report_status","arguments":{"jobId":%q}}}`, job.ID)
	if got := request("POST", statusPath, first, peer, rpc); got.Code != 200 || !bytes.Contains(got.Body.Bytes(), []byte(job.ID)) {
		t.Fatal("guest did not recover its job", got.Code, got.Body)
	}
	if got := request("POST", statusPath, second, peer, rpc); got.Code != 200 || !bytes.Contains(got.Body.Bytes(), []byte("NOT_FOUND")) {
		t.Fatal("foreign guest saw job", got.Code, got.Body)
	}
}

func TestMCPReportWorkflow(t *testing.T) {
	dir := t.TempDir()
	queue, err := storage.Open(dir, func(_ context.Context, p domain.Payload, _ string, _ func(int, string)) (domain.ReportArtifacts, error) {
		return domain.ReportArtifacts{PDF: []byte("%PDF-test"), SourceZIP: []byte("test archive")}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = queue.Close() }()
	owner, foreign, replacement := storage.Token(32), storage.Token(32), storage.Token(32)
	config := filepath.Join(dir, "credentials.json")
	newHandler := func(ownerToken string) http.Handler {
		t.Helper()
		if err := os.WriteFile(config, fmt.Appendf(nil, `{"owner":["%x"],"foreign":["%x"]}`, sha256.Sum256([]byte(ownerToken)), sha256.Sum256([]byte(foreign))), 0600); err != nil {
			t.Fatal(err)
		}
		handler, err := New(queue, "test", "", true).WithMCP(config, false)
		if err != nil {
			t.Fatal(err)
		}
		return handler
	}
	handler := newHandler(owner)
	request := func(method, path, token, media string, data []byte) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, bytes.NewReader(data))
		r.Header.Set("Authorization", "Bearer "+token)
		r.Header.Set("Content-Type", media)
		r.Header.Set("Accept", "application/json, text/event-stream")
		r.Header.Set("MCP-Protocol-Version", "2025-11-25")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	rpc := func(token, method string, params any) *httptest.ResponseRecorder {
		data, _ := json.Marshal(map[string]any{"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
		return request("POST", "/mcp", token, "application/json", data)
	}
	call := func(token, name string, args any) (map[string]any, error) {
		response := rpc(token, "tools/call", map[string]any{"name": name, "arguments": args})
		var reply struct {
			Result struct {
				StructuredContent map[string]any
			}
		}
		if response.Code != 200 || json.Unmarshal(response.Body.Bytes(), &reply) != nil || reply.Result.StructuredContent == nil {
			return nil, fmt.Errorf("%s: %d %s", name, response.Code, response.Body)
		}
		return reply.Result.StructuredContent, nil
	}
	mustCall := func(token, name string, args any) map[string]any {
		t.Helper()
		result, err := call(token, name, args)
		if err != nil {
			t.Fatal(err)
		}
		return result
	}
	if got := rpc("", "tools/list", nil); got.Code != 401 {
		t.Fatal(got.Code)
	}
	if got := rpc(owner, "initialize", map[string]any{"protocolVersion": "2025-11-25", "capabilities": map[string]any{}, "clientInfo": map[string]string{"name": "test", "version": "1"}}); got.Code != 200 || !bytes.Contains(got.Body.Bytes(), []byte("phyexp")) {
		t.Fatal(got.Code, got.Body)
	}
	if got := rpc(owner, "tools/list", map[string]any{}); got.Code != 200 || !bytes.Contains(got.Body.Bytes(), []byte("submit_report")) {
		t.Fatal(got.Code, got.Body)
	}
	details := mustCall(owner, "get_experiment_input", map[string]string{"experimentId": "oscilloscope"})
	if prompt, ok := details["ocrPrompt"].(string); !ok || prompt == "" {
		t.Fatal(details)
	}
	var input bytes.Buffer
	writer := multipart.NewWriter(&input)
	part, err := writer.CreateFormFile("json", "readings.json")
	if err != nil {
		t.Fatal(err)
	}
	samples := webSamples(t)
	if err := json.NewEncoder(part).Encode(flatReadings(samples["oscilloscope"])); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	uploaded := request("POST", "/api/mcp/uploads", owner, writer.FormDataContentType(), input.Bytes())
	var upload map[string]string
	if uploaded.Code != 201 || json.Unmarshal(uploaded.Body.Bytes(), &upload) != nil {
		t.Fatal(uploaded.Code, uploaded.Body)
	}
	args := map[string]any{
		"experimentId": "oscilloscope", "requestId": "request-1",
		"input": map[string]string{"kind": "json_file", "uploadId": upload["uploadId"]},
	}
	if got := mustCall(foreign, "submit_report", args); got["code"] != "UPLOAD_NOT_FOUND" {
		t.Fatal(got)
	}
	if got := mustCall(owner, "submit_report", map[string]any{
		"experimentId": "oscilloscope", "requestId": "invalid",
		"input": map[string]any{"kind": "flat_json", "readings": map[string]any{}},
	}); got["code"] != "INVALID_INPUT" {
		t.Fatal(got)
	}
	results := make(chan string, 4)
	for range cap(results) {
		go func() {
			result, err := call(owner, "submit_report", args)
			if err != nil {
				results <- err.Error()
				return
			}
			results <- fmt.Sprint(result["id"])
		}()
	}
	id := <-results
	if !jobRE.MatchString(id) {
		t.Fatal(id)
	}
	for range cap(results) - 1 {
		if other := <-results; id != other {
			t.Fatal("duplicate or failed submit", id, other)
		}
	}
	jobArgs := map[string]string{"jobId": id}
	if got := mustCall(foreign, "get_report_status", jobArgs); got["code"] != "NOT_FOUND" {
		t.Fatal(got)
	}
	path := artifact(id, "oscilloscope", "pdf").Path
	if got := request("GET", path, owner, "", nil); got.Code != 404 {
		t.Fatal("premature download", got.Code)
	}
	queue.Start()
	deadline := time.Now().Add(3 * time.Second)
	for {
		current := mustCall(owner, "get_report_status", jobArgs)
		if current["status"] == "done" {
			break
		}
		if time.Now().After(deadline) || current["status"] == "failed" {
			t.Fatal(current)
		}
		time.Sleep(20 * time.Millisecond)
	}
	state, err := queue.Session(context.Background(), "mcp:owner")
	if err != nil || state.UsedToday != 1 || len(state.Jobs) != 1 {
		t.Fatal(state, err)
	}
	if err := queue.Close(); err != nil {
		t.Fatal(err)
	}
	queue, err = storage.Open(dir, nil)
	if err != nil {
		t.Fatal(err)
	}
	handler = newHandler(replacement)
	if got := request("GET", path, owner, "", nil); got.Code != 401 {
		t.Fatal("old token still valid", got.Code)
	}
	if got := mustCall(replacement, "submit_report", args); got["id"] != id {
		t.Fatal("replay with expired upload", got)
	}
	args["reportInfo"] = map[string]string{"group": "2"}
	if got := mustCall(replacement, "submit_report", args); got["code"] != "REQUEST_CONFLICT" {
		t.Fatal(got)
	}
	for kind, content := range map[string]string{"pdf": "%PDF-test", "source": "test archive"} {
		path := artifact(id, "oscilloscope", kind).Path
		if got := request("GET", path, foreign, "", nil); got.Code != 404 {
			t.Fatal("foreign download", got.Code)
		}
		if got := request("GET", path, replacement, "", nil); got.Code != 200 || got.Body.String() != content {
			t.Fatal(kind, got.Code, got.Body)
		}
	}
}

func webSamples(t *testing.T) map[string]domain.Payload {
	t.Helper()
	raw, err := os.ReadFile("../../testdata/web-samples.json")
	if err != nil {
		t.Fatal(err)
	}
	var samples map[string]domain.Payload
	if err := json.Unmarshal(raw, &samples); err != nil {
		t.Fatal(err)
	}
	return samples
}

func flatReadings(p domain.Payload) map[string]any {
	flat := map[string]any{}
	for key, value := range p.Data {
		flat[key] = value
	}
	for key, value := range p.Parameters {
		flat[key] = value
	}
	return flat
}

func TestMCPFlatReadingsMatchWebSamples(t *testing.T) {
	catalog, err := readCatalog()
	if err != nil {
		t.Fatal(err)
	}
	samples := webSamples(t)
	for _, entry := range catalog {
		t.Run(entry.ID, func(t *testing.T) {
			sample, ok := samples[entry.ID]
			if !ok {
				t.Fatal("missing sample")
			}
			flat := flatReadings(sample)
			if entry.ID == "speed-of-sound" {
				for _, key := range []string{"res_frequency", "res_frequency_error", "phase_frequency", "phase_frequency_error"} {
					flat[key], err = readingText(sample.Parameters[key], 3, false)
					if err != nil {
						t.Fatal(err)
					}
				}
			}
			raw, err := json.Marshal(flat)
			if err != nil {
				t.Fatal(err)
			}
			payload, err := entry.flatPayload(raw, sample.ReportInfo)
			if err != nil {
				t.Fatal(err)
			}
			got, _, err := experiments.Calculate(payload)
			if err != nil {
				t.Fatal(err)
			}
			want, _, err := experiments.Calculate(sample)
			if err != nil {
				t.Fatal(err)
			}
			for key, value := range want {
				if got[key] != value {
					t.Errorf("%s: got %q want %q", key, got[key], value)
				}
			}
		})
	}
}
