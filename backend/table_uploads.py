"""Parse the two instrument exports into report readings and source tables."""

from __future__ import annotations

import csv
from decimal import Decimal, InvalidOperation
from io import BytesIO, StringIO
from statistics import mean
from zipfile import BadZipFile

from openpyxl import load_workbook


MAX_TABLE_BYTES = 2 * 1024 * 1024


def _number(value, label):
    try:
        result = Decimal(str(value).strip())
    except (TypeError, InvalidOperation) as exc:
        raise ValueError(f"{label} 缺少有效数字") from exc
    if not result.is_finite() or not 0 < result < Decimal("1e12"):
        raise ValueError(f"{label} 必须为正数")
    return str(value).strip()


def _reading(ws, cell):
    return _number(ws[cell].value, cell)


def _plain(value: Decimal) -> str:
    return format(value.normalize(), "f")


def parse_table(experiment_id: str, filename: str, content: bytes) -> dict:
    if not content or len(content) > MAX_TABLE_BYTES:
        raise ValueError("数据表必须小于 2 MiB 且不能为空")
    suffix = filename.lower().rsplit(".", 1)[-1]
    if experiment_id == "millikan" and suffix == "csv":
        return _millikan(content)
    if experiment_id == "moment-of-inertia" and suffix == "xlsx":
        return _torsion(content)
    raise ValueError("密立根油滴请上传 CSV，扭摆法请上传 XLSX")


def _millikan(content: bytes) -> dict:
    try:
        source = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        source = content.decode("gb18030")
    rows = list(csv.reader(StringIO(source)))
    if not rows or "平衡电压" not in "".join(rows[0]) or "时间" not in "".join(rows[0]):
        raise ValueError("CSV 表头需包含平衡电压和时间")
    readings = [row for row in rows[1:] if any(cell.strip() for cell in row)]
    if len(readings) % 4 or not 3 <= len(readings) // 4 <= 10:
        raise ValueError("CSV 每颗油滴需有连续 4 行记录，共需 3 至 10 颗")
    data = {"voltage": [], **{f"time_{j}": [] for j in range(1, 5)}}
    source_rows = []
    for index in range(0, len(readings), 4):
        group = readings[index:index + 4]
        if any(len(row) < 3 for row in group):
            raise ValueError(f"第 {index + 2} 行缺少电压或时间")
        voltages = [_number(row[1], "平衡电压") for row in group]
        times = [_number(row[2], "下降时间") for row in group]
        data["voltage"].append(str(mean(Decimal(value) for value in voltages)))
        for j, value in enumerate(times, 1):
            data[f"time_{j}"].append(value)
        for j, row in enumerate(group, 1):
            source_rows.append([str(index // 4 + 1), str(j), row[0].strip(),
                                voltages[j - 1], times[j - 1], row[3].strip() if len(row) > 3 else ""])
    for values in data.values():
        values.extend([""] * (10 - len(values)))
    return {"data": data, "parameters": {}, "sourceTables": [{
        "title": "密立根油滴仪 CSV 原始记录",
        "headers": ["油滴", "次数", "当前电压/V", "平衡电压/V", "时间/s", "电荷量/C"], "rows": source_rows,
    }]}


def _torsion(content: bytes) -> dict:
    try:
        workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
        ws = workbook.active
        if "扭摆" not in str(ws["A1"].value) or "滑块质量" not in str(ws["A34"].value):
            raise ValueError("XLSX 不是所给格式的扭摆实验数据表")
        data = {}
        for key, row in (("cylinder", 16), ("disk", 17), ("tube", 29),
                         ("ball", 30), ("rod", 31)):
            data[f"time_{key}"] = [_reading(ws, f"{col}{row}") for col in "CDE"]
        for x, row in ((5, 37), (10, 38), (15, 39), (20, 40)):
            if float(_reading(ws, f"A{row}")) != x:
                raise ValueError(f"滑块距离 A{row} 与模板不一致")
            data[f"slider_time_{x}"] = [_reading(ws, f"{col}{row}") for col in "CDE"]
        def average_mm(row):
            return str((mean(Decimal(_reading(ws, f"{col}{row}")) for col in "CDE") * 10).quantize(Decimal("0.001")))
        parameters = {
            "mass_cylinder_g": _plain(Decimal(_reading(ws, "B12")) * 1000),
            "diameter_cylinder_mm": average_mm(12),
            "mass_tube_g": _plain(Decimal(_reading(ws, "B22")) * 1000),
            "diameter_tube_outer_mm": average_mm(23),
            "diameter_tube_inner_mm": average_mm(22),
            "mass_ball_g": _plain(Decimal(_reading(ws, "B24")) * 1000),
            "diameter_ball_mm": average_mm(24),
            "mass_rod_g": _plain(Decimal(_reading(ws, "B25")) * 1000),
            "length_rod_mm": average_mm(25),
            "slider_mass_g": _plain(mean(Decimal(_reading(ws, cell)) for cell in ("B34", "C34")) * 1000),
            "slider_self_inertia": str(Decimal(_reading(ws, "H34")) * Decimal("1e-4") / 2),
        }
        geometry = {key: [_reading(ws, f"{col}{row}") for col in "CDE"] for key, row in (
            ("cylinder", 12), ("tube_inner", 22), ("tube_outer", 23),
            ("ball", 24), ("rod", 25))}
        tables = [{"title": "扭摆仪 XLSX 质量与尺寸记录", "headers": ["物体", "质量/kg", "尺寸1/cm", "尺寸2/cm", "尺寸3/cm"],
                   "rows": [[str(ws[f"A{r}"].value or ""), str(ws[f"B{r}"].value or ""),
                             *[str(ws[f"{c}{r}"].value or "") for c in "CDE"]]
                            for r in (12, 22, 23, 24, 25)]},
                  {"title": "扭摆仪 XLSX 周期计时记录", "headers": ["物体/位置", "周期数", "时长1/s", "时长2/s", "时长3/s"],
                   "rows": [[str(ws[f"A{r}"].value or ("圆筒" if r == 29 else "")), str(ws[f"B{r}"].value or ""),
                             *[str(ws[f"{c}{r}"].value or "") for c in "CDE"]]
                            for r in (16, 17, 29, 30, 31, 37, 38, 39, 40)]},
                  {"title": "扭摆仪 XLSX 滑块参数", "headers": ["滑块1质量/kg", "滑块2质量/kg", "两滑块自身惯量/×10⁻⁴ kg·m²"],
                   "rows": [[str(ws["B34"].value), str(ws["C34"].value), str(ws["H34"].value)]]}]
        return {"data": data, "parameters": parameters, "geometryReadings": geometry,
                "sourceTables": tables,
                "reportInfo": {"student": str(ws["E3"].value or ""),
                               "student_id": str(ws["H3"].value or "")}}
    except (KeyError, OSError, BadZipFile, ValueError) as exc:
        if isinstance(exc, ValueError):
            raise
        raise ValueError("XLSX 文件损坏或格式不正确") from exc
