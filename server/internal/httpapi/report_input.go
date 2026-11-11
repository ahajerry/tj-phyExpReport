package httpapi

import (
	"context"
	"fmt"

	"phyexp/server/internal/domain"
	"phyexp/server/internal/experiments"
	"phyexp/server/internal/render"
)

func validateReport(p domain.Payload) error {
	_, normalized, err := experiments.Calculate(p)
	if err != nil {
		return err
	}
	return render.ValidateTables(normalized.SourceTables)
}

func importReport(experiment, name string, content []byte, info map[string]string) (domain.Payload, error) {
	p, err := experiments.Import(experiment, name, content)
	if err != nil {
		return p, err
	}
	if p.ReportInfo == nil {
		p.ReportInfo = map[string]string{}
	}
	for key, value := range info {
		if value != "" {
			p.ReportInfo[key] = value
		}
	}
	return p, nil
}

func reportImage(ctx context.Context, content []byte, index int) (domain.Image, error) {
	extension := render.ImageExtension(content)
	if extension == "" {
		return domain.Image{}, fmt.Errorf("不支持的图片格式")
	}
	image := domain.Image{Name: fmt.Sprintf("%02d_image.%s", index, extension), Content: content}
	return image, render.ValidateImage(ctx, image)
}
