"""Crop apparatus and optical figures from the scanned source handouts."""

from pathlib import Path

import pymupdf
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tex" / "original"
DEST = ROOT / "tex" / "templates" / "figures"

# PDF page numbers are one-based; rectangles are fractions of the rendered page.
FIGURES = {
    "heat-apparatus": ("比热容.pdf", 2, (.42, .245, .79, .50)),
    "millikan-chamber": ("密立根油滴.pdf", 5, (.13, .105, .73, .40)),
    "torsion-apparatus": ("扭摆惯量.pdf", 1, (.48, .64, .80, .92)),
    "young-optical-lever": ("杨氏模量.pdf", 3, (.12, .06, .67, .32)),
    "forced-reference-curves": ("波尔共振.pdf", 4, (.245, .605, .96, .855)),
    "lens-ray-diagrams": ("透镜焦距.pdf", 2, (.02, .06, .75, .29)),
}


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    for name, (pdf_name, page, box) in FIGURES.items():
        with pymupdf.open(SOURCE / pdf_name) as document:
            sheet = document[page - 1]
            scale = 3000 / max(sheet.rect.width, sheet.rect.height)
            pixmap = sheet.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            width, height = image.size
            crop = image.crop(tuple(round(v * dimension) for v, dimension in
                                    zip(box, (width, height, width, height))))
            crop.save(DEST / f"{name}.png", optimize=True)
        print(name, pdf_name, page)


if __name__ == "__main__":
    main()
