package render

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"time"
)

type Renderer struct{ TemplateDir, WorkDir string }

func (r Renderer) Render(ctx context.Context, p domain.Payload, archive string, progress func(int, string)) ([]byte, error) {
	fields, p, e := experiments.Calculate(p)
	if e != nil {
		return nil, e
	}
	source, e := Template(r.TemplateDir, p, fields)
	if e != nil {
		return nil, e
	}
	progress(10, "正在检查编译环境")
	if e = os.MkdirAll(r.WorkDir, 0700); e != nil {
		return nil, e
	}
	work, e := os.MkdirTemp(r.WorkDir, p.ExperimentID+"-")
	if e != nil {
		return nil, e
	}
	defer os.RemoveAll(work)
	for _, name := range []string{"physics_report_base.tex", "tongji_logo.jpeg", "figures"} {
		if e = copyTree(filepath.Join(r.TemplateDir, name), filepath.Join(work, name)); e != nil {
			return nil, e
		}
	}
	images, e := prepareImages(ctx, archive, work)
	if e != nil {
		return nil, e
	}
	if p.ExperimentID == "oscilloscope" && len(images) > 2 {
		return nil, fmt.Errorf("示波器最多附两张图片")
	}
	progress(25, "正在整理原始数据图片")
	filled, e := Fill(source, fields, p, images)
	if e != nil {
		return nil, e
	}
	if e = os.WriteFile(filepath.Join(work, "report.tex"), []byte(filled), 0600); e != nil {
		return nil, e
	}
	for i := 0; i < 2; i++ {
		progress(45+30*i, fmt.Sprintf("正在进行第 %d 次 LaTeX 编译", i+1))
		if _, e = run(ctx, work, 120*time.Second, "xelatex", "-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "report.tex"); e != nil {
			return nil, e
		}
	}
	progress(95, "正在保存 PDF")
	return os.ReadFile(filepath.Join(work, "report.pdf"))
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
