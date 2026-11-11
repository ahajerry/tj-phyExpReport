package httpapi

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/storage"
)

var requestIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,80}$`)

type reportMCP struct {
	web         *Server
	credentials map[[32]byte]string
	catalog     []catalogEntry
	mu          sync.Mutex
	guests      bool
	rateWindow  int64
	rate        map[string]int
	uploads     map[string]mcpUpload
	concurrent  chan struct{}
}

// WithMCP enables remote endpoints for configured and optionally self-enrolled callers.
func (s *Server) WithMCP(credentialsPath string, guests bool) (http.Handler, error) {
	if credentialsPath == "" && !guests {
		return s, nil
	}
	var credentials map[[32]byte]string
	if credentialsPath != "" {
		config, err := os.ReadFile(credentialsPath)
		if err != nil {
			return nil, fmt.Errorf("读取 MCP 凭据文件: %w", err)
		}
		credentials, err = parseMCPCredentials(config)
		if err != nil {
			return nil, err
		}
	}
	catalog, err := readCatalog()
	if err != nil {
		return nil, err
	}
	service := &reportMCP{
		web: s, credentials: credentials, guests: guests, catalog: catalog, rate: map[string]int{},
		uploads: map[string]mcpUpload{}, concurrent: make(chan struct{}, 16),
	}
	server := mcp.NewServer(&mcp.Implementation{Name: "phyexp", Version: "1.0.0"}, &mcp.ServerOptions{
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	service.register(server)
	stream := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return server }, &mcp.StreamableHTTPOptions{
		Stateless: true, JSONResponse: true, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	mux := http.NewServeMux()
	mux.Handle("/mcp", service.authorize(func(w http.ResponseWriter, r *http.Request, _ string) {
		r.Body = http.MaxBytesReader(w, r.Body, 384<<10)
		stream.ServeHTTP(w, r)
	}))
	mux.Handle("POST /api/mcp/uploads", service.authorize(service.upload))
	mux.Handle("GET /api/mcp/jobs/{jobId}/artifacts/{kind}", service.authorize(service.download))
	if guests {
		mux.Handle("POST /api/mcp/guest", service.limitRequests(service.enrollGuest))
	}
	// Delegate the remaining paths directly so the existing website keeps its routing semantics.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/mcp" || strings.HasPrefix(r.URL.Path, "/api/mcp/") {
			mux.ServeHTTP(w, r)
			return
		}
		s.ServeHTTP(w, r)
	}), nil
}

func parseMCPCredentials(config []byte) (map[[32]byte]string, error) {
	var subjects map[string][]string
	if err := json.Unmarshal(config, &subjects); err != nil || len(subjects) == 0 {
		return nil, fmt.Errorf("MCP 凭据须为主体到 SHA-256 摘要列表的 JSON 对象")
	}
	result := map[[32]byte]string{}
	for subject, digests := range subjects {
		if !requestIDPattern.MatchString(subject) || len(digests) == 0 {
			return nil, fmt.Errorf("MCP 主体或摘要列表无效")
		}
		for _, digest := range digests {
			raw, err := hex.DecodeString(digest)
			if err != nil || len(raw) != sha256.Size {
				return nil, fmt.Errorf("MCP 凭据摘要无效")
			}
			key := [32]byte(raw)
			if _, exists := result[key]; exists {
				return nil, fmt.Errorf("MCP 凭据摘要重复")
			}
			result[key] = "mcp:" + subject
		}
	}
	return result, nil
}

func bearerDigest(header http.Header) ([32]byte, bool) {
	fields := strings.Fields(header.Get("Authorization"))
	if len(fields) != 2 || !strings.EqualFold(fields[0], "Bearer") || !tokenRE.MatchString(fields[1]) {
		return [32]byte{}, false
	}
	return sha256.Sum256([]byte(fields[1])), true
}

func (s *reportMCP) principal(ctx context.Context, header http.Header) (string, error) {
	digest, ok := bearerDigest(header)
	if !ok {
		return "", nil
	}
	if user := s.credentials[digest]; user != "" || !s.guests {
		return user, nil
	}
	return s.web.Queue.GuestPrincipal(ctx, digest)
}

func (s *reportMCP) limitRequests(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.Header.Get("Origin") != "" {
			apiError(w, http.StatusForbidden, fmt.Errorf("MCP 端点仅接受服务端客户端请求"))
			return
		}
		select {
		case s.concurrent <- struct{}{}:
			defer func() { <-s.concurrent }()
		default:
			apiError(w, http.StatusTooManyRequests, fmt.Errorf("MCP 服务繁忙，请稍后再试"))
			return
		}
		handler(w, r)
	}
}

func (s *reportMCP) authorize(handler func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return s.limitRequests(func(w http.ResponseWriter, r *http.Request) {
		user, err := s.principal(r.Context(), r.Header)
		if err != nil {
			apiError(w, http.StatusInternalServerError, fmt.Errorf("服务器内部错误"))
			return
		}
		if user == "" {
			w.Header().Set("WWW-Authenticate", "Bearer")
			apiError(w, http.StatusUnauthorized, fmt.Errorf("需要有效的 MCP 凭据"))
			return
		}
		window := time.Now().Unix() / 60
		s.mu.Lock()
		if s.rateWindow != window {
			clear(s.rate)
			s.rateWindow = window
		}
		s.rate[user]++
		count := s.rate[user]
		s.mu.Unlock()
		if count > 120 {
			w.Header().Set("Retry-After", "60")
			apiError(w, http.StatusTooManyRequests, fmt.Errorf("MCP 请求过于频繁，请稍后再试"))
			return
		}
		handler(w, r, user)
	})
}

func (s *reportMCP) enrollGuest(w http.ResponseWriter, r *http.Request) {
	digest, ok := bearerDigest(r.Header)
	if !ok || s.credentials[digest] != "" {
		apiError(w, http.StatusBadRequest, fmt.Errorf("匿名开通需要新的个人令牌"))
		return
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	// RemoteAddr comes from the connection. Forwarding headers are not trusted here.
	source := fmt.Sprintf("%x", sha256.Sum256([]byte(host)))
	switch err := s.web.Queue.EnrollGuest(r.Context(), digest, source); {
	case errors.Is(err, storage.ErrGuestEnrollmentLimit):
		w.Header().Set("Retry-After", fmt.Sprint(3600-time.Now().Unix()%3600))
		apiError(w, http.StatusTooManyRequests, err)
	case err != nil:
		apiError(w, http.StatusInternalServerError, fmt.Errorf("服务器内部错误"))
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

type mcpSubmit struct {
	ExperimentID   string            `json:"experimentId"`
	RequestID      string            `json:"requestId"`
	ReportInfo     map[string]string `json:"reportInfo,omitempty"`
	ImageUploadIDs []string          `json:"imageUploadIds,omitempty"`
	Input          struct {
		Kind     string          `json:"kind"`
		Readings json.RawMessage `json:"readings,omitempty"`
		UploadID string          `json:"uploadId,omitempty"`
	} `json:"input"`
}

func (s *reportMCP) register(server *mcp.Server) {
	object := func(props map[string]any, required ...string) map[string]any {
		schema := map[string]any{"type": "object", "properties": props, "additionalProperties": false}
		if len(required) != 0 {
			schema["required"] = required
		}
		return schema
	}
	str := map[string]any{"type": "string"}
	server.AddTool(&mcp.Tool{Name: "get_experiment_input", Description: "列出实验或返回指定实验的字段、单位、文件格式和 OCR 提示词",
		InputSchema: object(map[string]any{"experimentId": str})}, s.tool(s.describe))
	server.AddTool(&mcp.Tool{Name: "submit_report", Description: "提交实验数据并返回报告任务。相同请求重试须复用 requestId",
		InputSchema: object(map[string]any{
			"experimentId": str, "requestId": str,
			"reportInfo":     object(map[string]any{"student": str, "student_id": str, "group": str, "date": str}),
			"imageUploadIds": map[string]any{"type": "array", "items": str},
			"input": object(map[string]any{
				"kind":     map[string]any{"type": "string", "enum": []string{"flat_json", "json_file", "instrument_table"}},
				"readings": map[string]any{"type": "object"},
				"uploadId": str,
			}, "kind"),
		}, "experimentId", "requestId", "input")}, s.tool(s.submit))
	server.AddTool(&mcp.Tool{Name: "get_report_status", Description: "查询本人的报告任务和可用下载文件",
		InputSchema: object(map[string]any{"jobId": str}, "jobId")}, s.tool(s.status))
}

type toolError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e toolError) Error() string { return e.Message }

func invalidInput(err error) toolError { return toolError{"INVALID_INPUT", err.Error()} }

func queueError(err error) toolError {
	switch {
	case errors.Is(err, storage.ErrNotFound):
		return toolError{"NOT_FOUND", err.Error()}
	case errors.Is(err, storage.ErrRequestConflict):
		return toolError{"REQUEST_CONFLICT", err.Error()}
	case errors.Is(err, storage.ErrQuota), errors.Is(err, storage.ErrGuestQueueLimit):
		return toolError{"QUOTA", err.Error()}
	default:
		return toolError{"SERVER_ERROR", "服务器内部错误"}
	}
}

func (s *reportMCP) tool(handler func(context.Context, string, json.RawMessage) (any, error)) mcp.ToolHandler {
	return func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		user := ""
		if req.Extra != nil {
			var err error
			user, err = s.principal(ctx, req.Extra.Header)
			if err != nil {
				return toolResult(nil, err)
			}
		}
		if user == "" {
			return toolResult(nil, toolError{"UNAUTHORIZED", "需要有效的 MCP 凭据"})
		}
		return toolResult(handler(ctx, user, req.Params.Arguments))
	}
}

func toolResult(value any, err error) (*mcp.CallToolResult, error) {
	if err != nil {
		var public toolError
		if !errors.As(err, &public) {
			public = queueError(err)
		}
		value = public
	}
	data, encodeErr := json.Marshal(value)
	if encodeErr != nil {
		return nil, encodeErr
	}
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(data)}}, StructuredContent: value, IsError: err != nil,
	}, nil
}

func decodeArgs(raw json.RawMessage, target any) error {
	if len(raw) == 0 {
		raw = json.RawMessage("{}")
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(target); err != nil {
		return toolError{"INVALID_INPUT", "工具参数格式无效"}
	}
	return nil
}

func (s *reportMCP) experiment(id string) (catalogEntry, bool) {
	for _, entry := range s.catalog {
		if entry.ID == id {
			return entry, true
		}
	}
	return catalogEntry{}, false
}

func (s *reportMCP) describe(_ context.Context, _ string, raw json.RawMessage) (any, error) {
	var args struct {
		ExperimentID string `json:"experimentId"`
	}
	if err := decodeArgs(raw, &args); err != nil {
		return nil, err
	}
	if args.ExperimentID == "" {
		list := make([]map[string]string, 0, len(s.catalog))
		for _, entry := range s.catalog {
			list = append(list, map[string]string{"experimentId": entry.ID, "title": entry.Title})
		}
		return map[string]any{"experiments": list}, nil
	}
	entry, ok := s.experiment(args.ExperimentID)
	if !ok {
		return nil, toolError{"INVALID_INPUT", "不支持的实验"}
	}
	var details map[string]any
	if err := json.Unmarshal(entry.Details, &details); err != nil {
		return nil, err
	}
	formats := []string{"json"}
	switch entry.ID {
	case "millikan":
		formats = append(formats, "csv")
	case "moment-of-inertia", "forced-vibration":
		formats = append(formats, "xlsx")
	}
	details["experimentId"] = entry.ID
	details["fileFormats"] = formats
	return details, nil
}

func (s *reportMCP) submit(ctx context.Context, user string, raw json.RawMessage) (any, error) {
	var args mcpSubmit
	if err := decodeArgs(raw, &args); err != nil {
		return nil, err
	}
	entry, ok := s.experiment(args.ExperimentID)
	if !ok || !requestIDPattern.MatchString(args.RequestID) {
		return nil, toolError{"INVALID_INPUT", "实验或请求编号无效"}
	}
	if len(args.ImageUploadIDs) > 5 || entry.ID == "oscilloscope" && len(args.ImageUploadIDs) > 2 {
		return nil, toolError{"INVALID_INPUT", "上传图片数量超过该实验限制"}
	}
	if args.Input.Kind == "flat_json" && (args.Input.UploadID != "" || len(args.Input.Readings) == 0) ||
		args.Input.Kind != "flat_json" && (args.Input.UploadID == "" || len(args.Input.Readings) != 0) {
		return nil, toolError{"INVALID_INPUT", "报告输入须指定一种数据来源"}
	}
	// Re-encode object keys in stable order while keeping each decimal token intact.
	if len(args.Input.Readings) > 0 {
		var readings map[string]json.RawMessage
		if err := json.Unmarshal(args.Input.Readings, &readings); err != nil || readings == nil {
			return nil, toolError{"INVALID_INPUT", "实验读数须为 JSON 对象"}
		}
		args.Input.Readings, _ = json.Marshal(readings)
	}
	encoded, err := json.Marshal(args)
	if err != nil {
		return nil, err
	}
	fingerprint := fmt.Sprintf("%x", sha256.Sum256(encoded))
	job, err := s.web.Queue.FindRequest(ctx, user, args.RequestID, fingerprint)
	if err != nil {
		return nil, queueError(err)
	}
	if job.ID != "" {
		return job, nil
	}
	select {
	case s.web.submissions <- struct{}{}:
		defer func() { <-s.web.submissions }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	var payload domain.Payload
	total := 0
	switch args.Input.Kind {
	case "flat_json":
		payload, err = entry.flatPayload(args.Input.Readings, args.ReportInfo)
		total = len(args.Input.Readings)
	case "json_file", "instrument_table":
		kind := "json"
		if args.Input.Kind == "instrument_table" {
			kind = "table"
		}
		file, e := s.readUpload(user, args.Input.UploadID, kind)
		if e != nil {
			return nil, e
		}
		total = len(file.data)
		if kind == "json" {
			payload, err = entry.flatPayload(file.data, args.ReportInfo)
		} else {
			payload, err = importReport(entry.ID, file.name, file.data, args.ReportInfo)
		}
	default:
		return nil, toolError{"INVALID_INPUT", "不支持的报告输入类型"}
	}
	if err != nil {
		return nil, invalidInput(err)
	}
	images := make([]domain.Image, 0, len(args.ImageUploadIDs))
	for i, id := range args.ImageUploadIDs {
		file, err := s.readUpload(user, id, "image")
		if err != nil {
			return nil, err
		}
		total += len(file.data)
		if total > 30<<20 {
			return nil, toolError{"INVALID_INPUT", "报告附件总大小超过 30 MiB"}
		}
		im, err := reportImage(ctx, file.data, i+1)
		if err != nil {
			return nil, invalidInput(err)
		}
		images = append(images, im)
	}
	if err := validateReport(payload); err != nil {
		return nil, invalidInput(err)
	}
	job, err = s.web.Queue.CreateRequest(ctx, user, args.RequestID, fingerprint, payload, images)
	if err != nil {
		return nil, queueError(err)
	}
	return job, nil
}

type mcpArtifact struct {
	Path     string `json:"path"`
	Filename string `json:"filename"`
}

func artifact(id, experiment, kind string) mcpArtifact {
	name := experiment + "-report.pdf"
	if kind == "source" {
		name = experiment + "-report-source.zip"
	}
	return mcpArtifact{"/api/mcp/jobs/" + id + "/artifacts/" + kind, name}
}

func (s *reportMCP) status(ctx context.Context, user string, raw json.RawMessage) (any, error) {
	var args struct {
		JobID string `json:"jobId"`
	}
	if err := decodeArgs(raw, &args); err != nil {
		return nil, err
	}
	if !jobRE.MatchString(args.JobID) {
		return nil, queueError(storage.ErrNotFound)
	}
	job, err := s.web.Queue.Job(ctx, args.JobID, user)
	if err != nil {
		return nil, queueError(err)
	}
	result := struct {
		domain.Job
		PollAfterMs int                    `json:"pollAfterMs,omitempty"`
		Artifacts   map[string]mcpArtifact `json:"artifacts,omitempty"`
	}{Job: job}
	switch job.Status {
	case "queued", "running":
		result.PollAfterMs = 2000
	case "done":
		result.Artifacts = map[string]mcpArtifact{
			"pdf":    artifact(job.ID, job.ExperimentID, "pdf"),
			"source": artifact(job.ID, job.ExperimentID, "source"),
		}
	}
	return result, nil
}

func (s *reportMCP) download(w http.ResponseWriter, r *http.Request, user string) {
	id, kind := r.PathValue("jobId"), r.PathValue("kind")
	if !jobRE.MatchString(id) || (kind != "pdf" && kind != "source") {
		apiError(w, http.StatusNotFound, storage.ErrNotFound)
		return
	}
	download, contentType := s.web.Queue.Download, "application/pdf"
	if kind == "source" {
		download, contentType = s.web.Queue.DownloadSource, "application/zip"
	}
	job, path, err := download(r.Context(), id, user)
	if err != nil {
		apiError(w, http.StatusNotFound, fmt.Errorf("报告尚未生成或任务不存在"))
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, artifact(id, job.ExperimentID, kind).Filename))
	http.ServeFile(w, r, path)
}
