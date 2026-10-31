package render

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"regexp"
	"sort"
	"strings"
	"time"
)

type Renderer struct{ TemplateDir, WorkDir, FontDir string }

var assetRE = regexp.MustCompile(`image\("([^"\n]+)"`)

func (r Renderer) Render(ctx context.Context, p domain.Payload, archive string, progress func(int, string)) (domain.ReportArtifacts, error) {
	var result domain.ReportArtifacts
	fields, p, err := experiments.Calculate(p)
	if err != nil {
		return result, err
	}
	progress(10, "正在检查 Typst 编译环境")
	version, err := run(ctx, "", 10*time.Second, "typst", "--version")
	if err != nil {
		return result, err
	}
	if v := strings.Fields(string(version)); len(v) < 2 || v[1] != TypstVersion {
		return result, fmt.Errorf("需要 Typst %s，当前为 %s", TypstVersion, strings.TrimSpace(string(version)))
	}
	fontArgs := []string{"fonts"}
	if r.FontDir != "" {
		fontArgs = append(fontArgs, "--ignore-system-fonts", "--font-path", r.FontDir)
	}
	fonts, err := run(ctx, "", 10*time.Second, "typst", fontArgs...)
	if err != nil {
		return result, err
	}
	for _, font := range []string{"Noto Serif CJK SC", "Noto Sans CJK SC"} {
		if !strings.Contains("\n"+string(fonts), "\n"+font+"\n") {
			return result, fmt.Errorf("缺少报告字体 %s，请检查 REPORT_FONT_DIR", font)
		}
	}
	if err = os.MkdirAll(r.WorkDir, 0700); err != nil {
		return result, err
	}
	work, err := os.MkdirTemp(r.WorkDir, p.ExperimentID+"-")
	if err != nil {
		return result, err
	}
	defer os.RemoveAll(work)
	files := []string{"report.typ", "base.typ", "charts.typ", "data.json", "README.md"}
	assets := map[string]bool{}
	for _, name := range []string{p.ExperimentID + ".typ", "base.typ", "charts.typ", "README.md"} {
		source, e := os.ReadFile(filepath.Join(r.TemplateDir, name))
		if e != nil {
			return result, e
		}
		dest := name
		if name == p.ExperimentID+".typ" {
			dest = "report.typ"
		}
		if e = os.WriteFile(filepath.Join(work, dest), source, 0600); e != nil {
			return result, e
		}
		if strings.HasSuffix(name, ".typ") {
			for _, m := range assetRE.FindAllStringSubmatch(string(source), -1) {
				assets[m[1]] = true
			}
		}
	}
	for name := range assets {
		if !filepath.IsLocal(name) || strings.Contains(name, "..") {
			return result, fmt.Errorf("模板资源路径无效")
		}
		if err = os.MkdirAll(filepath.Dir(filepath.Join(work, name)), 0700); err != nil {
			return result, err
		}
		if err = copyTree(filepath.Join(r.TemplateDir, name), filepath.Join(work, name)); err != nil {
			return result, err
		}
		files = append(files, name)
	}
	images, err := prepareImages(ctx, archive, work)
	if err != nil {
		return result, err
	}
	if p.ExperimentID == "oscilloscope" && len(images) > 2 {
		return result, fmt.Errorf("示波器最多附两张图片")
	}
	progress(25, "正在整理报告数据与图片")
	data, err := DataJSON(fields, p, images)
	if err != nil {
		return result, err
	}
	if err = os.WriteFile(filepath.Join(work, "data.json"), data, 0600); err != nil {
		return result, err
	}
	files = append(files, images...)
	progress(45, "正在使用 Typst 排版 PDF")
	args := []string{"compile", "--root", work, "--creation-timestamp", "0", "--jobs", "1"}
	if r.FontDir != "" {
		args = append(args, "--ignore-system-fonts", "--font-path", r.FontDir)
	}
	args = append(args, "report.typ", "report.pdf")
	if _, err = run(ctx, work, 120*time.Second, "typst", args...); err != nil {
		return result, err
	}
	result.PDF, err = os.ReadFile(filepath.Join(work, "report.pdf"))
	if err != nil {
		return result, err
	}
	if !bytes.HasPrefix(result.PDF, []byte("%PDF-")) {
		return result, fmt.Errorf("编译器未生成有效 PDF")
	}
	progress(85, "正在打包 Typst 源码")
	result.SourceZIP, err = sourceZIP(ctx, work, files)
	if err != nil {
		return domain.ReportArtifacts{}, err
	}
	progress(95, "正在保存 PDF 与源码")
	return result, nil
}

// An explicit input list excludes PDFs, diagnostics and any compiler output.
func sourceZIP(ctx context.Context, work string, files []string) ([]byte, error) {
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	sort.Strings(files)
	for _, name := range files {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if !filepath.IsLocal(name) {
			return nil, fmt.Errorf("源码资源路径无效")
		}
		path := filepath.Join(work, name)
		info, err := os.Lstat(path)
		if err != nil {
			return nil, err
		}
		if !info.Mode().IsRegular() {
			return nil, fmt.Errorf("源码资源必须为普通文件")
		}
		header := &zip.FileHeader{Name: filepath.ToSlash(name), Method: zip.Deflate}
		header.SetMode(0644)
		header.Modified = time.Date(1980, 1, 1, 0, 0, 0, 0, time.UTC)
		entry, err := writer.CreateHeader(header)
		if err != nil {
			return nil, err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		if _, err = entry.Write(data); err != nil {
			return nil, err
		}
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func copyTree(src, dst string) error {
	info, e := os.Stat(src)
	if e != nil {
		return e
	}
	if info.IsDir() {
		if e = os.MkdirAll(dst, 0700); e != nil {
			return e
		}
		entries, e := os.ReadDir(src)
		if e != nil {
			return e
		}
		for _, x := range entries {
			if e = copyTree(filepath.Join(src, x.Name()), filepath.Join(dst, x.Name())); e != nil {
				return e
			}
		}
		return nil
	}
	in, e := os.Open(src)
	if e != nil {
		return e
	}
	defer in.Close()
	out, e := os.Create(dst)
	if e != nil {
		return e
	}
	_, e = io.Copy(out, in)
	ce := out.Close()
	if e != nil {
		return e
	}
	return ce
}
