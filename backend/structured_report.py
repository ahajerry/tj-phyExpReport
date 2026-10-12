"""Shared validation and PDF rendering for reports with tabular measurements."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from pathlib import Path
import re
import shutil
import subprocess
import uuid

try:
    from .fill_sound_speed import fill_report, FIELD_PATTERN, PLOT_PATTERN, COVER_PATTERN
    from .report_images import prepare_report_images
except ImportError:
    from fill_sound_speed import fill_report, FIELD_PATTERN, PLOT_PATTERN, COVER_PATTERN
    from report_images import prepare_report_images

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / "tex" / "templates"
WORK_DIR = ROOT / ".report-data" / "work"
INFO_FIELDS = {"student", "student_id", "group", "date"}


def number(value: object, label: str, *, positive: bool = False, nonnegative: bool = False) -> Decimal:
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValueError(f"{label} 必须是数字")
    try:
        result = Decimal(str(value).strip())
    except InvalidOperation as exc:
        raise ValueError(f"{label} 必须是数字") from exc
    if not result.is_finite() or abs(result) > Decimal("1e15"):
        raise ValueError(f"{label} 的数值超出允许范围")
    if positive and result <= 0 or nonnegative and result < 0:
        raise ValueError(f"{label} 必须为{'正数' if positive else '非负数'}")
    return result


def fmt(value: Decimal | float | int) -> str:
    return f"{value:.6g}"


def mean(values: list[Decimal]) -> Decimal:
    return sum(values) / len(values)


def sem(values: list[Decimal]) -> Decimal:
    if len(values) < 2:
        return Decimal(0)
    center = mean(values)
    return (sum((value - center) ** 2 for value in values) / (len(values) * (len(values) - 1))).sqrt()


def parse_report(
    payload: object,
    experiment_id: str,
    data_spec: dict[str, tuple[int, str]],
    parameter_names: tuple[str, ...],
) -> tuple[dict[str, str], dict[str, list[Decimal]], dict[str, Decimal]]:
    if not isinstance(payload, dict) or payload.get("experimentId") != experiment_id:
        raise ValueError(f"此接口只支持 {experiment_id} 实验")
    data = payload.get("data")
    parameters = payload.get("parameters")
    report_info = payload.get("reportInfo", {})
    if not isinstance(data, dict) or set(data) != set(data_spec):
        raise ValueError("实验读数字段与模板不一致")
    if not isinstance(parameters, dict) or set(parameters) != set(parameter_names):
        raise ValueError("报告参数字段与模板不一致")
    if not isinstance(report_info, dict) or not set(report_info) <= INFO_FIELDS:
        raise ValueError("封面信息包含无效字段")
    fields: dict[str, str] = {}
    for key, value in report_info.items():
        if not isinstance(value, str) or len(value) > 120 or any(ord(char) < 32 for char in value):
            raise ValueError(f"{key} 必须是 120 字以内的单行文本")
        fields[key] = value.strip()
    numbers: dict[str, list[Decimal]] = {}
    for key, (count, pattern) in data_spec.items():
        values = data[key]
        if not isinstance(values, list) or len(values) != count:
            raise ValueError(f"{key} 需要 {count} 个读数")
        optional_tail = experiment_id == "millikan" and key in ("voltage", "time_1", "time_2", "time_3", "time_4")
        parsed = [number(value, f"{key} 第 {index} 个读数") for index, value in enumerate(values, 1)
                  if not (optional_tail and value == "")]
        if optional_tail and (len(parsed) < 3 or values != values[:len(parsed)] + [""] * (count - len(parsed))):
            raise ValueError("油滴数据必须至少 3 组，空白只能位于末尾")
        numbers[key] = parsed
        for index, value in enumerate(values, 1):
            if value != "":
                fields[pattern.format(i=index)] = str(value).strip()
    params = {key: number(value, key) for key, value in parameters.items()}
    fields.update({key: str(parameters[key]).strip() for key in parameter_names})
    return fields, numbers, params


def render(fields: dict[str, str], experiment_id: str, title: str,
           progress=lambda _value, _stage: None, image_dir: Path | None = None,
           source_tables=None, template_source: str | None = None) -> bytes:
    template = TEMPLATE_DIR / f"{experiment_id}.tex"
    progress(10, "正在检查编译环境")
    files = (template, TEMPLATE_DIR / "physics_report_base.tex",
             TEMPLATE_DIR / "tongji_logo.jpeg")
    missing = [str(path) for path in files if not path.is_file()]
    if not (TEMPLATE_DIR / "figures").is_dir():
        missing.append(str(TEMPLATE_DIR / "figures"))
    if template.is_file():
        referenced_figures = re.findall(
            r"\\includegraphics(?:\[[^\]]*\])?\{(figures/[^{}]+)\}",
            template.read_text(encoding="utf-8"),
        )
        missing.extend(str(TEMPLATE_DIR / figure) for figure in referenced_figures
                       if not (TEMPLATE_DIR / figure).is_file())
    if missing:
        raise RuntimeError("部署缺少报告模板资源：" + "、".join(missing)
                           + "。请重新打包并部署 tex/templates/。")
    source = template_source if template_source is not None else template.read_text(encoding="utf-8")
    allowed = set(FIELD_PATTERN.findall(source)) | set(PLOT_PATTERN.findall(source)) | set(COVER_PATTERN.findall(source))
    allowed.update(("experiment", "student", "student_id", "group", "date"))
    fields = {key: value for key, value in fields.items() if key in allowed}
    if shutil.which("xelatex") is None:
        raise RuntimeError("未找到 XeLaTeX，请先将其加入 PATH")
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    workdir = WORK_DIR / f".{experiment_id}-report-{uuid.uuid4().hex}"
    workdir.mkdir()
    try:
        if template_source is not None:
            template = workdir / "template.tex"
            template.write_text(source, encoding="utf-8")
        images = prepare_report_images(image_dir, workdir)
        progress(25, "正在整理原始数据图片")
        tex_file = fill_report(fields, workdir / "report.tex", template,
                               image_files=images, experiment_title=title,
                               source_tables=source_tables)
        shutil.copyfile(TEMPLATE_DIR / "physics_report_base.tex", workdir / "physics_report_base.tex")
        shutil.copyfile(TEMPLATE_DIR / "tongji_logo.jpeg", workdir / "tongji_logo.jpeg")
        shutil.copytree(TEMPLATE_DIR / "figures", workdir / "figures")
        progress(30, "正在填充报告模板")
        for pass_number in range(2):
            progress(45 if pass_number == 0 else 75, f"正在进行第 {pass_number + 1} 次 LaTeX 编译")
            result = subprocess.run(
                ["xelatex", "-interaction=nonstopmode", "-halt-on-error", "report.tex"],
                cwd=workdir, capture_output=True, text=True, encoding="utf-8", errors="replace",
                timeout=120, check=False,
            )
            if result.returncode:
                raise RuntimeError(f"XeLaTeX 编译失败：\n{result.stdout[-2500:]}")
        progress(95, "正在保存 PDF")
        return tex_file.with_suffix(".pdf").read_bytes()
    finally:
        shutil.rmtree(workdir)
