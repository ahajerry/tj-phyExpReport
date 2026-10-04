"""Build a deployable archive with every runtime report template and figure."""

from __future__ import annotations

from pathlib import Path
import tarfile


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "phyExpCal-upload.tar.gz"
EXPERIMENT_IDS = (
    "speed-of-sound", "heat-capacity-ratio", "millikan",
    "moment-of-inertia", "young-modulus", "forced-vibration", "focal-length", "oscilloscope",
)
TOP_LEVEL = (
    "src", "backend", "public", "scripts", "tex/templates", "package.json",
    "package-lock.json", "index.html", "vite.config.ts", "tsconfig.json",
    "tsconfig.app.json", "tsconfig.node.json", "eslint.config.js",
    "components.json",
    "tongji_logo.jpeg", "README.md", "CHANGELOG.md",
)
REQUIRED = (
    "backend/main.py", "backend/structured_report.py",
    "tongji_logo.jpeg", "tex/templates/physics_report_base.tex",
    "tex/templates/tongji_logo.jpeg",
    *(f"tex/templates/{experiment_id}.tex" for experiment_id in EXPERIMENT_IDS),
    *(f"tex/templates/figures/{name}.png" for name in (
        "forced-reference-curves", "heat-apparatus", "lens-ray-diagrams",
        "millikan-chamber", "torsion-apparatus", "young-optical-lever",
    )),
)


def included_files() -> list[Path]:
    missing = [name for name in REQUIRED if not (ROOT / name).is_file()]
    if missing:
        raise FileNotFoundError("部署资源缺失：" + "、".join(missing)
                                + "；请先运行 python scripts/build_report_templates.py")
    files: list[Path] = []
    for name in TOP_LEVEL:
        path = ROOT / name
        if not path.exists():
            raise FileNotFoundError(f"部署资源缺失：{name}")
        candidates = path.rglob("*") if path.is_dir() else (path,)
        files.extend(file for file in candidates if file.is_file()
                     and not file.is_symlink()
                     and "__pycache__" not in file.parts
                     and file.suffix != ".pyc")
    return sorted(set(files))


def main() -> None:
    files = included_files()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(OUTPUT, "w:gz") as archive:
        for file in files:
            archive.add(file, arcname=file.relative_to(ROOT).as_posix(), recursive=False)
    with tarfile.open(OUTPUT, "r:gz") as archive:
        members = set(archive.getnames())
    missing = set(REQUIRED) - members
    if missing:
        raise RuntimeError("部署包缺少资源：" + "、".join(sorted(missing)))
    print(f"{OUTPUT}：{len(files)} 个文件，{OUTPUT.stat().st_size} 字节；{len(EXPERIMENT_IDS)} 份模板和插图齐全")


if __name__ == "__main__":
    main()
