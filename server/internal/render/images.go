package render

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"strconv"
	"strings"
	"time"
)

func ImageExtension(b []byte) string {
	switch {
	case bytes.HasPrefix(b, []byte("\x89PNG\r\n\x1a\n")):
		return "png"
	case bytes.HasPrefix(b, []byte{255, 216, 255}):
		return "jpg"
	case bytes.HasPrefix(b, []byte("GIF87a")) || bytes.HasPrefix(b, []byte("GIF89a")):
		return "gif"
	case bytes.HasPrefix(b, []byte("II*\x00")) || bytes.HasPrefix(b, []byte("MM\x00*")):
		return "tif"
	case len(b) >= 12 && string(b[:4]) == "RIFF" && string(b[8:12]) == "WEBP":
		return "webp"
	case len(b) >= 12 && string(b[4:8]) == "ftyp":
		switch string(b[8:12]) {
		case "heic", "heix", "heif", "mif1":
			return "heic"
		case "avif", "avis":
			return "avif"
		}
	}
	return ""
}
func validateImageFile(ctx context.Context, name string) error {
	out, e := run(ctx, "", 20*time.Second, "identify", "-limit", "memory", "256MiB", "-limit", "map", "256MiB", "-format", "%w %h", name+"[0]")
	if e != nil {
		return fmt.Errorf("无法读取图片: %w", e)
	}
	parts := strings.Fields(string(out))
	if len(parts) != 2 {
		return fmt.Errorf("无效图片尺寸")
	}
	w, e1 := strconv.ParseInt(parts[0], 10, 64)
	h, e2 := strconv.ParseInt(parts[1], 10, 64)
	if e1 != nil || e2 != nil || w < 1 || h < 1 || w > 40000000/h {
		return fmt.Errorf("图片超过 4000 万像素")
	}
	return nil
}
func ValidateImage(ctx context.Context, image domain.Image) error {
	ext := ImageExtension(image.Content)
	if ext == "" {
		return fmt.Errorf("不支持的图片格式")
	}
	dir, e := os.MkdirTemp("", "report-image-")
	if e != nil {
		return e
	}
	defer os.RemoveAll(dir)
	name := filepath.Join(dir, "image."+ext)
	if e = os.WriteFile(name, image.Content, 0600); e != nil {
		return e
	}
	if e = validateImageFile(ctx, name); e != nil {
		return e
	}
	_, e = run(ctx, dir, 30*time.Second, "convert", "-limit", "memory", "256MiB", "-limit", "map", "256MiB", name+"[0]", "-resize", "1x1!", "null:")
	return e
}
func prepareImages(ctx context.Context, archive, work string) ([]string, error) {
	files := []string{}
	entries, e := os.ReadDir(archive)
	if os.IsNotExist(e) {
		return files, nil
	}
	if e != nil {
		return nil, e
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		source := filepath.Join(archive, entry.Name())
		if e := validateImageFile(ctx, source); e != nil {
			return nil, e
		}
		name := fmt.Sprintf("original_%02d.jpg", len(files)+1)
		_, e := run(ctx, work, 30*time.Second, "convert", "-limit", "memory", "256MiB", "-limit", "map", "256MiB", source+"[0]", "-auto-orient", "-background", "white", "-alpha", "remove", "-alpha", "off", "-colorspace", "sRGB", "-resize", "3000x3600>", "-quality", "90", filepath.Join(work, name))
		if e != nil {
			return nil, e
		}
		files = append(files, name)
	}
	return files, nil
}
