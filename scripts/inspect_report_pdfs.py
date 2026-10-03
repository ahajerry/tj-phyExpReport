"""Render all report pages to contact sheets for visual QA."""

from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output" / "report-review"
DEST = ROOT / "tmp" / "pdf-review"


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    for source in sorted(SOURCE.glob("*.pdf")):
        with pymupdf.open(source) as document:
            pages = []
            for page in document:
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1, 1), alpha=False)
                preview = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                preview.thumbnail((340, 460))
                pages.append(preview)
            sheet = Image.new("RGB", (1080, ((len(pages) + 2) // 3) * 500), "white")
            draw = ImageDraw.Draw(sheet)
            for index, preview in enumerate(pages):
                x, y = (index % 3) * 360, (index // 3) * 500
                draw.text((x + 5, y + 5), str(index + 1), fill="black")
                sheet.paste(preview, (x + 10, y + 25))
            sheet.save(DEST / f"{source.stem}-contact.png")
            print(source.name, len(pages), "pages")


if __name__ == "__main__":
    main()
