package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path"
	"strings"
	"time"

	"phyexp/server/internal/render"
	"phyexp/server/internal/storage"
)

type mcpUpload struct {
	user    string
	kind    string
	name    string
	data    []byte
	expires time.Time
}

func (s *reportMCP) upload(w http.ResponseWriter, r *http.Request, user string) {
	r.Body = http.MaxBytesReader(w, r.Body, (8<<20)+(16<<10))
	reader, err := r.MultipartReader()
	if err != nil {
		apiError(w, http.StatusBadRequest, fmt.Errorf("请使用 multipart/form-data 上传"))
		return
	}
	part, err := reader.NextPart()
	if err != nil || part.FileName() == "" {
		apiError(w, http.StatusBadRequest, fmt.Errorf("缺少上传文件"))
		return
	}
	kind, name := part.FormName(), part.FileName()
	limit := 0
	switch kind {
	case "json":
		limit = 64 << 10
	case "table":
		limit = 2 << 20
	case "image":
		limit = 8 << 20
	default:
		apiError(w, http.StatusBadRequest, fmt.Errorf("不支持的上传类型"))
		return
	}
	data, err := io.ReadAll(io.LimitReader(part, int64(limit)+1))
	if err != nil || len(data) == 0 || len(data) > limit {
		apiError(w, http.StatusBadRequest, fmt.Errorf("上传文件为空、过大或损坏"))
		return
	}
	if _, err = reader.NextPart(); err != io.EOF {
		apiError(w, http.StatusBadRequest, fmt.Errorf("每次只允许上传一个文件"))
		return
	}
	ext := strings.ToLower(path.Ext(name))
	switch kind {
	case "json":
		if ext != ".json" || !json.Valid(data) {
			apiError(w, http.StatusBadRequest, fmt.Errorf("请上传有效的 JSON 文件"))
			return
		}
	case "table":
		if ext != ".csv" && ext != ".xlsx" {
			apiError(w, http.StatusBadRequest, fmt.Errorf("请上传 CSV 或 XLSX 表格"))
			return
		}
	case "image":
		if render.ImageExtension(data) == "" {
			apiError(w, http.StatusBadRequest, fmt.Errorf("不支持的图片格式"))
			return
		}
	}
	file := mcpUpload{user: user, kind: kind, name: "upload" + ext, data: data, expires: time.Now().Add(15 * time.Minute)}
	id, ok := s.storeUpload(file)
	if !ok {
		apiError(w, http.StatusTooManyRequests, fmt.Errorf("暂存文件数量或容量已达上限，请稍后再试"))
		return
	}
	jsonResponse(w, http.StatusCreated, map[string]any{"uploadId": id, "expiresAt": file.expires})
}

func (s *reportMCP) storeUpload(file mcpUpload) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var count, userBytes, total int
	for _, existing := range s.uploads {
		total += len(existing.data)
		if existing.user == file.user {
			count++
			userBytes += len(existing.data)
		}
	}
	if count >= 24 || len(s.uploads) >= 256 || userBytes+len(file.data) > 32<<20 || total+len(file.data) > 64<<20 {
		return "", false
	}
	id := storage.Token(16)
	s.uploads[id] = file
	time.AfterFunc(time.Until(file.expires), func() {
		s.mu.Lock()
		delete(s.uploads, id)
		s.mu.Unlock()
	})
	return id, true
}

func (s *reportMCP) readUpload(user, id, kind string) (mcpUpload, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	file, ok := s.uploads[id]
	if !ok || file.user != user || file.kind != kind || !time.Now().Before(file.expires) {
		return mcpUpload{}, toolError{"UPLOAD_NOT_FOUND", "上传文件不存在、类型不符或已过期，请重新上传"}
	}
	// The slice is immutable; a submit already holding it can finish after expiry.
	return file, nil
}
