"""将 JSON 数据填入声速测定 LaTeX 报告的空字段。

命令行：python backend/fill_sound_speed.py data.json
后端调用：fill_report({"student": "张三", "res_l01": 30.40})
"""

from __future__ import annotations

import argparse
import json
import math
import re
from decimal import Decimal
from pathlib import Path
from typing import Mapping, Sequence


TEMPLATE = Path(__file__).resolve().parents[1] / "tex" / "templates" / "speed-of-sound.tex"
BEGIN = "% ===== 数据输入区开始 ====="
END = "% ===== 数据输入区结束 ====="
IMAGE_MARKER = "% ===== 原始数据图片插入区 ====="

FIELD_PATTERN = re.compile(r"\\(?:Math)?Field(?:\[[^\]]+\])?\{([a-z][a-z0-9_]*)\}")
PLOT_PATTERN = re.compile(r"\\PlotCoordinates\{([a-z][a-z0-9_]*)\}")
POINTS_PATTERN = re.compile(r"(?:\s*\([-+\d.eE]+,[-+\d.eE]+\))+\s*")
COVER_PATTERN = re.compile(r"\\coverfield\{(?:[^{}]|\{[^{}]*\})*\}\{([a-z][a-z0-9_]*)\}")

TEX_SPECIAL = {
    "\\": r"\textbackslash{}",
    "{": r"\{",
    "}": r"\}",
    "%": r"\%",
    "&": r"\&",
    "#": r"\#",
    "$": r"\$",
    "_": r"\_",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}
NUMBER_PATTERN = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\Z")


def _tex_text(value: str | int | float | Decimal) -> str:
    """把普通文本和数字安全地放入 LaTeX 文本框。"""
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise TypeError("字段值只能是字符串或数字")
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("字段值不能是 NaN 或无穷大")
    if isinstance(value, Decimal) and not value.is_finite():
        raise ValueError("字段值不能是 NaN 或无穷大")
    return "".join(TEX_SPECIAL.get(char, char) for char in str(value))


def _tex_math_number(value: str | int | float | Decimal) -> str | None:
    """Render a numeric field in math mode, preserving its chosen decimal places."""
    raw = str(value)
    if not NUMBER_PATTERN.fullmatch(raw):
        return None
    if "e" not in raw.lower():
        return raw
    mantissa, exponent = re.split("[eE]", raw)
    return rf"{mantissa}\times 10^{{{int(exponent)}}}"


def fill_report(
    data: Mapping[str, str | int | float | Decimal | None],
    output_path: str | Path | None = None,
    template_path: str | Path = TEMPLATE,
    image_files: Sequence[str] = (),
    experiment_title: str = "声速测定",
    source_tables: Sequence[dict] | None = None,
) -> Path:
    """生成填好数据的 .tex；缺省或 None 的字段继续显示为空白横线。"""
    template = Path(template_path).resolve()
    if output_path:
        requested = Path(output_path)
        output = (requested if requested.is_absolute() else template.parent / requested).resolve()
    else:
        output = template.with_name("声速测定_已填充.tex")
    if output == template:
        raise ValueError("输出路径不能覆盖原始模板")
    source = template.read_text(encoding="utf-8")
    if source.count(BEGIN) != 1 or source.count(END) != 1:
        raise ValueError("模板中缺少唯一的数据输入区标记")
    start = source.index(BEGIN) + len(BEGIN)
    end = source.index(END)
    if start >= end:
        raise ValueError("模板的数据输入区标记顺序错误")

    plot_fields = set(PLOT_PATTERN.findall(source))
    allowed = set(FIELD_PATTERN.findall(source)) | set(COVER_PATTERN.findall(source)) | plot_fields
    # Report metadata may be supplied even when a source-specific template has no cover.
    allowed.update({"experiment", "student", "student_id", "group", "date"})
    values = {"experiment": experiment_title}
    values.update({key: value for key, value in data.items() if value is not None})
    unknown = set(values) - allowed
    if unknown:
        raise ValueError(f"模板中不存在这些字段：{', '.join(sorted(unknown))}")

    lines = [f"\\SetField{{{key}}}{{{_tex_text(value)}}}" for key, value in sorted(values.items())
             if key not in plot_fields]
    if image_files or source_tables:
        lines.append(r"\reportimagestrue")
    lines.extend(f"\\SetField{{math_{key}}}{{{math_value}}}"
                 for key, value in sorted(values.items()) if key not in plot_fields
                 if (math_value := _tex_math_number(value)) is not None)
    filled = source[:start] + "\n" + "\n".join(lines) + "\n" + source[end:]
    def plot_value(match: re.Match[str]) -> str:
        key = match.group(1)
        value = str(values.get(key, ""))
        if not POINTS_PATTERN.fullmatch(value):
            raise ValueError(f"{key} 的作图坐标无效")
        return value
    filled = PLOT_PATTERN.sub(plot_value, filled)
    if filled.count(IMAGE_MARKER) != 1:
        raise ValueError("模板中缺少唯一的原始数据图片插入区标记")
    pages = []
    if source_tables:
        if not isinstance(source_tables, list) or len(source_tables) > 3:
            raise ValueError("原始数据表数量无效")
        for table in source_tables:
            if not isinstance(table, dict):
                raise ValueError("原始数据表格式无效")
            headers, rows = table.get("headers"), table.get("rows")
            title = table.get("title")
            if (not isinstance(title, str) or not isinstance(headers, list) or
                not 2 <= len(headers) <= 8 or not isinstance(rows, list) or len(rows) > 60 or
                any(not isinstance(row, list) or len(row) != len(headers) for row in rows)):
                raise ValueError("原始数据表格式无效")
            if any(not isinstance(cell, str) or len(cell) > 80 for cell in [*headers, *(c for row in rows for c in row)]):
                raise ValueError("原始数据表内容过长")
            # Account for tabular's padding on both sides of every column.
            width = round((14.3 - 0.45 * len(headers)) / len(headers), 2)
            cells = "|" + f"p{{{width}cm}}|" * len(headers)
            head = " & ".join(_tex_text(cell) for cell in headers) + r"\\\hline"
            body = "\n".join(" & ".join(_tex_text(cell) for cell in row) + r"\\\hline" for row in rows)
            # Keep a source-table title with its header and first rows.
            keep_title = r"\Needspace{6\baselineskip}" if r"\input{physics_report_base.tex}" in source else ""
            pages.append("\n".join((keep_title, r"\par\medskip\noindent{\heiti " + _tex_text(title) + r"}\par",
                                    r"{\footnotesize\renewcommand{\arraystretch}{1.15}",
                                    rf"\begin{{longtable}}{{{cells}}}\hline",
                                    head, r"\endfirsthead\hline", head, r"\endhead",
                                    body, r"\end{longtable}}")))
    for index, filename in enumerate(image_files, start=1):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", filename) or filename in (".", ".."):
            raise ValueError("图片文件名无效")
        page_start = ""
        if index > 1:
            page_start = "\\clearpage\n\\thispagestyle{record}\n"
            if r"\input{physics_report_base.tex}" not in source:
                page_start += "\\bindingline[3.03]\n"
        pages.append(
            page_start +
            "\\begin{center}\n"
            f"{{\\heiti 原始数据记录（第 {index} 张）\\par}}\n"
            "\\vspace{0.5cm}\n"
            f"\\includegraphics[width=\\textwidth,height=19cm,keepaspectratio]{{{filename}}}\n"
            "\\end{center}\n"
        )
    filled = filled.replace(IMAGE_MARKER, "\n".join(pages))
    output.write_text(filled, encoding="utf-8")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="用 JSON 填充声速测定实验报告")
    parser.add_argument("data", type=Path, help="UTF-8 编码的 JSON 对象文件")
    parser.add_argument("-o", "--output", type=Path, help="输出 .tex，默认在模板旁生成声速测定_已填充.tex")
    args = parser.parse_args()

    # Decimal 保留 JSON 数字中的末尾零，例如 30.40。
    data = json.loads(args.data.read_text(encoding="utf-8"), parse_float=Decimal)
    if not isinstance(data, dict):
        parser.error("JSON 顶层必须是对象，例如 {\"student\": \"张三\"}")
    try:
        output = fill_report(data, args.output)
    except (TypeError, ValueError) as exc:
        parser.error(str(exc))
    print(output)


if __name__ == "__main__":
    main()
