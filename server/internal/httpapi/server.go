package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"phyexp/server/internal/render"
	"phyexp/server/internal/storage"
	"regexp"
	"strings"
	"time"
)

type Server struct {
	Queue       *storage.Queue
	Revision    string
	Secure      bool
	StaticDir   string
	submissions chan struct{}
}

func New(q *storage.Queue, revision, staticDir string, secure bool) *Server {
	return &Server{Queue: q, Revision: revision, Secure: secure, StaticDir: staticDir, submissions: make(chan struct{}, 2)}
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func apiError(w http.ResponseWriter, status int, err error) {
	jsonResponse(w, status, map[string]string{"error": err.Error()})
}

var tokenRE = regexp.MustCompile(`^[a-f0-9]{64}$`)
var jobRE = regexp.MustCompile(`^[a-f0-9]{32}$`)

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if v := recover(); v != nil {
			log.Printf("request panic: %v", v)
			apiError(w, 500, fmt.Errorf("服务器内部错误"))
		}
	}()
	if !strings.HasPrefix(r.URL.Path, "/api/") {
		s.static(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.Method == "GET" && r.URL.Path == "/api/health" {
		jsonResponse(w, 200, map[string]string{"service": "report-generator", "revision": s.Revision, "backend": "go"})
		return
	}
	user := ""
	if c, e := r.Cookie("report_user"); e == nil && tokenRE.MatchString(c.Value) {
		user = c.Value
	}
	if user == "" {
		user = storage.Token(32)
		http.SetCookie(w, &http.Cookie{Name: "report_user", Value: user, Path: "/", MaxAge: 31536000, HttpOnly: true, Secure: s.Secure, SameSite: http.SameSiteLaxMode})
	}
	if r.Method == "GET" {
		if r.URL.Path == "/api/reports/session" {
			v, e := s.Queue.Session(r.Context(), user)
			if e != nil {
				apiError(w, 500, e)
			} else {
				jsonResponse(w, 200, v)
			}
			return
		}
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 && strings.Join(parts[:3], "/") == "api/reports/jobs" && jobRE.MatchString(parts[3]) {
			id := parts[3]
			if len(parts) == 4 {
				v, e := s.Queue.Job(r.Context(), id, user)
				if e != nil {
					status := 500
					if errors.Is(e, storage.ErrNotFound) {
						status = 404
					}
					apiError(w, status, e)
				} else {
					jsonResponse(w, 200, v)
				}
				return
			}
			if len(parts) == 5 && (parts[4] == "download" || parts[4] == "source") {
				download := s.Queue.Download
				contentType, suffix := "application/pdf", "report.pdf"
				if parts[4] == "source" {
					download = s.Queue.DownloadSource
					contentType, suffix = "application/zip", "report-source.zip"
				}
				j, path, e := download(r.Context(), id, user)
				if e != nil {
					apiError(w, 404, fmt.Errorf("报告尚未生成或任务不存在"))
					return
				}
				w.Header().Set("Content-Type", contentType)
				w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s"`, j.ExperimentID, suffix))
				http.ServeFile(w, r, path)
				return
			}
		}
	}
	if r.Method == "POST" && (r.URL.Path == "/api/reports/jobs" || r.URL.Path == "/api/reports/import-table") {
		select {
		case s.submissions <- struct{}{}:
			defer func() { <-s.submissions }()
		case <-r.Context().Done():
			return
		}
		p, images, e := s.submission(w, r)
		if e != nil {
			apiError(w, 400, e)
			return
		}
		if r.URL.Path == "/api/reports/import-table" {
			if len(images) > 0 || len(p.SourceTables) == 0 {
				apiError(w, 400, fmt.Errorf("请上传对应实验的原始数据表"))
				return
			}
			editable, e := experiments.Editable(p)
			if e == nil {
				_, _, e = experiments.Calculate(editable)
			}
			if e != nil {
				apiError(w, 400, e)
				return
			}
			jsonResponse(w, 200, map[string]any{"data": editable.Data, "parameters": editable.Parameters, "reportInfo": editable.ReportInfo})
			return
		}
		_, normalized, e := experiments.Calculate(p)
		if e == nil {
			e = render.ValidateTables(normalized.SourceTables)
		}
		if e != nil {
			apiError(w, 400, e)
			return
		}
		j, e := s.Queue.Create(r.Context(), user, p, images)
		if e != nil {
			status := 500
			if errors.Is(e, storage.ErrQuota) {
				status = 429
			}
			apiError(w, status, e)
		} else {
			jsonResponse(w, 202, j)
		}
		return
	}
	apiError(w, 404, fmt.Errorf("接口不存在"))
}
func (s *Server) submission(w http.ResponseWriter, r *http.Request) (domain.Payload, []domain.Image, error) {
	var p domain.Payload
	images := []domain.Image{}
	media, params, e := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if e != nil {
		return p, nil, fmt.Errorf("无效 Content-Type")
	}
	limit := int64(64 << 10)
	if media == "multipart/form-data" {
		limit = 30 << 20
		if r.Header.Get("X-Report-Request") != "1" {
			return p, nil, fmt.Errorf("缺少报告上传标识")
		}
	}
	if r.ContentLength <= 0 || r.ContentLength > limit {
		return p, nil, fmt.Errorf("请求体为空或过大")
	}
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	if media == "application/json" {
		b, e := io.ReadAll(r.Body)
		if e != nil {
			return p, nil, e
		}
		p, e = domain.Decode(b)
		return p, images, e
	}
	if media != "multipart/form-data" {
		return p, nil, fmt.Errorf("请使用 JSON 或 multipart/form-data")
	}
	reader := multipart.NewReader(r.Body, params["boundary"])
	var payload, table []byte
	tableName := ""
	for {
		part, e := reader.NextPart()
		if e == io.EOF {
			break
		}
		if e != nil {
			return p, nil, e
		}
		name := part.FormName()
		max := int64(64 << 10)
		switch name {
		case "images":
			max = 8 << 20
		case "table":
			max = 2 << 20
		case "payload":
		default:
			part.Close()
			return p, nil, fmt.Errorf("未知上传字段")
		}
		content, e := io.ReadAll(io.LimitReader(part, max+1))
		part.Close()
		if e != nil || int64(len(content)) > max {
			return p, nil, fmt.Errorf("上传字段过大或损坏")
		}
		switch name {
		case "payload":
			if payload != nil {
				return p, nil, fmt.Errorf("重复 payload")
			}
			payload = content
		case "table":
			if table != nil {
				return p, nil, fmt.Errorf("重复 table")
			}
			table = content
			tableName = part.FileName()
		case "images":
			if len(images) >= 5 {
				return p, nil, fmt.Errorf("最多五张图片")
			}
			ext := render.ImageExtension(content)
			if ext == "" {
				return p, nil, fmt.Errorf("不支持的图片格式")
			}
			im := domain.Image{Name: fmt.Sprintf("%02d_image.%s", len(images)+1, ext), Content: content}
			if e = render.ValidateImage(r.Context(), im); e != nil {
				return p, nil, e
			}
			images = append(images, im)
		}
	}
	if payload == nil {
		return p, nil, fmt.Errorf("缺少报告数据")
	}
	p, e = domain.Decode(payload)
	if e != nil {
		return p, nil, e
	}
	if table != nil {
		imported, e := experiments.Import(p.ExperimentID, tableName, table)
		if e != nil {
			return p, nil, e
		}
		if imported.ReportInfo == nil {
			imported.ReportInfo = map[string]string{}
		}
		for k, v := range p.ReportInfo {
			if v != "" {
				imported.ReportInfo[k] = v
			}
		}
		p = imported
	}
	if p.ExperimentID == "oscilloscope" && len(images) > 2 {
		return p, nil, fmt.Errorf("示波器报告最多附两张原始记录图片")
	}
	return p, images, nil
}
func (s *Server) static(w http.ResponseWriter, r *http.Request) {
	if s.StaticDir == "" || r.Method != "GET" && r.Method != "HEAD" {
		http.NotFound(w, r)
		return
	}
	clean := filepath.Clean("/" + r.URL.Path)
	path := filepath.Join(s.StaticDir, clean)
	info, e := os.Stat(path)
	if e == nil && !info.IsDir() {
		http.ServeFile(w, r, path)
		return
	}
	if filepath.Ext(clean) != "" {
		http.NotFound(w, r)
		return
	}
	b, e := os.ReadFile(filepath.Join(s.StaticDir, "index.html"))
	if e != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(b))
}
