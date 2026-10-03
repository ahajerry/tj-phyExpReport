"""校验上传图片，并为 LaTeX 生成兼容的临时 JPEG。原图不修改。"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

try:
    from pillow_heif import register_heif_opener
except ImportError:
    register_heif_opener = None
else:
    register_heif_opener()


MAX_PIXELS = 40_000_000


def validate_image_bytes(content: bytes) -> None:
    try:
        with Image.open(BytesIO(content)) as image:
            if image.width * image.height > MAX_PIXELS:
                raise ValueError("图片像素过多，请缩小后上传")
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("无法读取图片；HEIC 图片需要服务器安装 pillow-heif") from exc


def prepare_report_images(image_dir: Path | None, workdir: Path) -> list[str]:
    if image_dir is None or not image_dir.exists():
        return []
    filenames = []
    for index, original in enumerate(sorted(image_dir.iterdir()), start=1):
        if not original.is_file():
            continue
        filename = f"original_{index:02d}.jpg"
        with Image.open(original) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.width * image.height > MAX_PIXELS:
                raise ValueError("图片像素过多，请缩小后上传")
            image = image.convert("RGB")
            image.thumbnail((3000, 3600), Image.Resampling.LANCZOS)
            image.save(workdir / filename, "JPEG", quality=90, optimize=True)
        filenames.append(filename)
    return filenames
