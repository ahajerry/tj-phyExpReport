"""Compile the blank and two-image reports and enforce the requested page budget.

Run after scripts/verify_reports.py --render --only oscilloscope.
Requires the same PyMuPDF/Pillow QA dependencies as inspect_report_pdfs.py.
"""
from pathlib import Path
import shutil
import sys
import uuid

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.oscilloscope_exp import render_report  # noqa: E402
from backend.structured_report import render  # noqa: E402
from verify_reports import samples  # noqa: E402


def check_pages(path, expected):
    with pymupdf.open(path) as doc:
        assert len(doc) == expected, f"{path.name}: {len(doc)} pages, expected {expected}"
        print(path.name, len(doc), "pages OK", flush=True)


def main():
    output = ROOT / "output/report-review"
    output.mkdir(parents=True, exist_ok=True)
    check_pages(output / "oscilloscope.pdf", 6)
    blank = output / "oscilloscope-blank.pdf"
    blank.write_bytes(render({}, "oscilloscope", "阴极射线示波器"))
    check_pages(blank, 6)
    fixtures = ROOT / "tmp" / f"oscilloscope-images-{uuid.uuid4().hex}"
    fixtures.mkdir(parents=True)
    try:
        for i in (1, 2):
            image = Image.new("RGB", (900, 1200), "white")
            draw = ImageDraw.Draw(image)
            draw.text((60, 60), f"TEST ONLY - raw record image {i}; not real measurements", fill="black", font_size=24)
            draw.text((60, 140), "V/div: 0.5    NU: 6.0    ms/div: 0.5    NT: 4.0", fill="black", font_size=22)
            draw.rectangle((60, 220, 840, 1000), outline="black", width=2)
            image.save(fixtures / f"{i:02d}.png")
        payload = {"experimentId": "oscilloscope", **samples["oscilloscope"],
                   "reportInfo": {"student": "图片分页测试", "date": "2026-10-04"}}
        target = output / "oscilloscope-two-images.pdf"
        target.write_bytes(render_report(payload, image_dir=fixtures))
        check_pages(target, 7)
    finally:
        assert fixtures.resolve().is_relative_to((ROOT / "tmp").resolve())
        shutil.rmtree(fixtures)


if __name__ == "__main__":
    main()
