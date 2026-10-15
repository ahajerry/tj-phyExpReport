"""声速测定实验的数据验证、计算与 LaTeX 编译。"""

from __future__ import annotations

import shutil
import subprocess
import uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path

try:
    from .fill_sound_speed import TEMPLATE, fill_report
    from .report_images import prepare_report_images
    from .result_precision import finish_result, format_at_place, format_uncertainty
except ImportError:
    from fill_sound_speed import TEMPLATE, fill_report
    from report_images import prepare_report_images
    from result_precision import finish_result, format_at_place, format_uncertainty


EXPERIMENT_ID = "speed-of-sound"
TITLE = "声速测定"
QUANTITY_PREFIXES = {"resonance": "res", "phase": "phase"}
PARAMETER_FIELDS = {
    "caliper_error",
    "res_t_start", "res_t_end", "res_frequency", "res_frequency_error",
    "phase_t_start", "phase_t_end", "phase_frequency", "phase_frequency_error",
}
REPORT_INFO_FIELDS = {"student", "student_id", "group", "date", "partner"}
TEMPLATE_REPORT_INFO_FIELDS = REPORT_INFO_FIELDS - {"partner"}


def report_fields(payload: object) -> dict[str, str]:
    """将与前端 experiments 数组一致的物理量 id 映射到 LaTeX 字段。"""
    if not isinstance(payload, dict) or payload.get("experimentId") != EXPERIMENT_ID:
        raise ValueError("此接口只支持声速测定实验")
    data = payload.get("data")
    if not isinstance(data, dict) or set(data) != set(QUANTITY_PREFIXES):
        raise ValueError("data 必须包含 resonance 和 phase 两组测量位置")
    parameters = payload.get("parameters")
    legacy_job = parameters is None  # 升级前已排队的任务仍可生成原有的波长报告。
    if not legacy_job and (not isinstance(parameters, dict) or set(parameters) != PARAMETER_FIELDS):
        raise ValueError("parameters 必须包含两种方法的室温、频率、频率误差及游标卡尺误差")
    report_info = payload.get("reportInfo", {})
    if not isinstance(report_info, dict) or not set(report_info) <= REPORT_INFO_FIELDS:
        raise ValueError("reportInfo 包含无效字段")

    def number(key: str, *, positive=False, nonnegative=False) -> tuple[str, Decimal]:
        raw = parameters[key]
        if isinstance(raw, bool) or not isinstance(raw, (str, int, float, Decimal)):
            raise ValueError(f"{key} 必须是数字")
        value_text = str(raw).strip()
        try:
            value = Decimal(value_text)
        except InvalidOperation as exc:
            raise ValueError(f"{key} 必须是数字") from exc
        if not value.is_finite() or (positive and value <= 0) or (nonnegative and value < 0):
            raise ValueError(f"{key} 的数值超出允许范围")
        return value_text, value

    caliper_text, caliper_error = ("0.02", Decimal("0.02")) if legacy_job else number("caliper_error", positive=True)
    fields = {"caliper_error": caliper_text}
    for key, raw in report_info.items():
        if not isinstance(raw, str) or len(raw) > 120 or any(ord(char) < 32 for char in raw):
            raise ValueError(f"{key} 必须是 120 字以内的单行文本")
        if raw.strip() and key in TEMPLATE_REPORT_INFO_FIELDS:
            fields[key] = raw.strip()

    speeds: list[Decimal] = []
    errors: list[Decimal] = []
    for quantity_id, prefix in QUANTITY_PREFIXES.items():
        if not legacy_job:
            t_start_text, t_start = number(f"{prefix}_t_start")
            t_end_text, t_end = number(f"{prefix}_t_end")
            if t_start <= -273 or t_end <= -273:
                raise ValueError(f"{quantity_id} 的室温低于绝对零度")
            frequency_text, frequency = number(f"{prefix}_frequency", positive=True)
            frequency_error_text, frequency_error = number(f"{prefix}_frequency_error", nonnegative=True)
            mean_temperature = (t_start + t_end) / 2
            fields[f"{prefix}_t_start"] = t_start_text
            fields[f"{prefix}_t_end"] = t_end_text
            fields[f"{prefix}_t_avg"] = f"{mean_temperature:.2f}"
            fields[f"{prefix}_frequency"] = frequency_text
            fields[f"{prefix}_frequency_error"] = frequency_error_text
        raw = data[quantity_id]
        if not isinstance(raw, list):
            raise ValueError(f"{quantity_id} 必须是数组")

        readings: list[tuple[str, Decimal]] = []
        for item in raw:
            if item is None or isinstance(item, str) and not item.strip():
                continue
            if isinstance(item, bool) or not isinstance(item, (str, int, float, Decimal)):
                raise ValueError(f"{quantity_id} 中包含无效读数")
            text = str(item).strip()
            try:
                value = Decimal(text)
            except InvalidOperation as exc:
                raise ValueError(f"{quantity_id} 中包含无效读数：{text}") from exc
            if not value.is_finite():
                raise ValueError(f"{quantity_id} 中包含非有限读数")
            readings.append((text, value))
            if len(readings) == 20:
                break

        if len(readings) < 20:
            raise ValueError(f"{quantity_id} 至少需要 20 个有效读数，当前只有 {len(readings)} 个")

        positions = [number for _, number in readings]
        for index, (text, _) in enumerate(readings, start=1):
            fields[f"{prefix}_l{index:02d}"] = text

        wavelengths = [(positions[index + 10] - positions[index]) / 5 for index in range(10)]
        if any(wavelength <= 0 for wavelength in wavelengths):
            raise ValueError(f"{quantity_id} 的后 10 个位置须大于对应的前 10 个位置")
        for index, wavelength in enumerate(wavelengths, start=1):
            fields[f"{prefix}_lambda{index:02d}"] = str(wavelength)

        mean = sum(wavelengths) / len(wavelengths)
        ua = (sum((value - mean) ** 2 for value in wavelengths) / (10 * 9)).sqrt()
        ub = caliper_error / Decimal(3).sqrt()
        u_lambda = (ua * ua + ub * ub).sqrt()
        fields[f"{prefix}_lambda_avg"] = str(mean)
        fields[f"{prefix}_u_a"] = str(ua)
        fields[f"{prefix}_u_b"] = str(ub)
        fields[f"{prefix}_u_lambda"] = str(u_lambda)
        fields[f"{prefix}_u_r_lambda"] = str(u_lambda / mean)
        if not legacy_job:
            u_f = frequency_error / Decimal(3).sqrt()
            u_r_f = u_f / frequency
            speed = mean * frequency  # mm × kHz = m/s
            u_r_v = ((u_lambda / mean) ** 2 + u_r_f ** 2).sqrt()
            u_v = u_r_v * speed
            # OpenStax University Physics: 331 sqrt(1 + t_C/273) m/s for dry air.
            speed_theory = Decimal(331) * ((Decimal(273) + mean_temperature) / Decimal(273)).sqrt()
            error_percent = abs(speed - speed_theory) / speed_theory * 100
            speeds.append(speed)
            errors.append(error_percent)
            fields[f"{prefix}_u_f"] = str(u_f)
            fields[f"{prefix}_u_r_f"] = str(u_r_f)
            fields[f"{prefix}_speed"] = str(speed)
            fields[f"{prefix}_u_r_v"] = str(u_r_v)
            fields[f"{prefix}_u_v"] = str(u_v)
            fields[f"{prefix}_speed_result"] = str(speed)
            fields[f"{prefix}_u_v_result"] = str(u_v)
            fields[f"{prefix}_u_r_v_percent"] = str(u_r_v * 100)
            fields[f"{prefix}_speed_theory"] = str(speed_theory)
            fields[f"{prefix}_error_percent"] = str(error_percent)

    if not legacy_job:
        difference = abs(speeds[0] - speeds[1])
        fields["method_difference"] = str(difference)
        fields["closer_method"] = (
            "共振干涉法" if errors[0] < errors[1] else
            "相位比较法" if errors[1] < errors[0] else "两种方法"
        )
        fields["final_speed"] = str(sum(speeds) / 2)
    return finish_report_fields(fields, legacy_job)


def finish_report_fields(fields: dict[str, str], legacy_job: bool) -> dict[str, str]:
    """所有物理运算完成后，统一舍入报告中带不确定度的成品数据。"""
    speed_places: list[Decimal] = []
    for prefix in QUANTITY_PREFIXES.values():
        wavelength = finish_result(Decimal(fields[f"{prefix}_lambda_avg"]), Decimal(fields[f"{prefix}_u_lambda"]))
        fields[f"{prefix}_lambda_avg"] = wavelength.value
        fields[f"{prefix}_u_lambda"] = wavelength.uncertainty
        for index in range(1, 11):
            key = f"{prefix}_lambda{index:02d}"
            fields[key] = format_at_place(Decimal(fields[key]), wavelength.place)
        for suffix in ("u_a", "u_b", "u_r_lambda"):
            key = f"{prefix}_{suffix}"
            fields[key] = format_uncertainty(Decimal(fields[key]))
        if legacy_job:
            continue

        frequency = finish_result(Decimal(fields[f"{prefix}_frequency"]), Decimal(fields[f"{prefix}_u_f"]))
        fields[f"{prefix}_frequency"] = frequency.value
        fields[f"{prefix}_u_f"] = frequency.uncertainty
        fields[f"{prefix}_u_r_f"] = format_uncertainty(Decimal(fields[f"{prefix}_u_r_f"]))

        speed = finish_result(Decimal(fields[f"{prefix}_speed"]), Decimal(fields[f"{prefix}_u_v"]))
        fields[f"{prefix}_speed"] = speed.value
        fields[f"{prefix}_speed_result"] = speed.value
        fields[f"{prefix}_u_v"] = speed.uncertainty
        fields[f"{prefix}_u_v_result"] = speed.uncertainty
        fields[f"{prefix}_speed_theory"] = format_at_place(Decimal(fields[f"{prefix}_speed_theory"]), speed.place)
        if speed.place is not None:
            speed_places.append(speed.place)

        relative_speed = Decimal(fields[f"{prefix}_u_r_v"])
        percent = finish_result(Decimal(fields[f"{prefix}_error_percent"]), relative_speed * 100)
        fields[f"{prefix}_u_r_v"] = format_uncertainty(relative_speed)
        fields[f"{prefix}_u_r_v_percent"] = percent.uncertainty
        fields[f"{prefix}_error_percent"] = percent.value

    if not legacy_job:
        coarsest_place = max(speed_places) if speed_places else None
        for key in ("method_difference", "final_speed"):
            fields[key] = format_at_place(Decimal(fields[key]), coarsest_place)
    return fields


def render_report(payload: object, progress=lambda _value, _stage: None, image_dir: Path | None = None) -> bytes:
    fields = report_fields(payload)
    progress(10, "正在检查编译环境")
    if shutil.which("xelatex") is None:
        raise RuntimeError("未找到 XeLaTeX，请先将其加入 PATH")

    workdir = TEMPLATE.parent / f".sound-speed-report-{uuid.uuid4().hex}"
    workdir.mkdir()
    try:
        image_files = prepare_report_images(image_dir, workdir)
        progress(25, "正在整理原始数据图片")
        tex_file = fill_report(fields, workdir / "report.tex", image_files=image_files)
        shutil.copyfile(TEMPLATE.with_name("tongji_logo.jpeg"), workdir / "tongji_logo.jpeg")
        progress(30, "正在填充报告模板")
        command = ["xelatex", "-interaction=nonstopmode", "-halt-on-error", "report.tex"]
        for pass_number in range(2):  # 页码引用需要第二次编译
            progress(45 if pass_number == 0 else 75, f"正在进行第 {pass_number + 1} 次 LaTeX 编译")
            result = subprocess.run(
                command, cwd=workdir, capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=90, check=False,
            )
            if result.returncode != 0:
                raise RuntimeError(f"XeLaTeX 编译失败：\n{result.stdout[-2500:]}")
        progress(95, "正在保存 PDF")
        return tex_file.with_suffix(".pdf").read_bytes()
    finally:
        shutil.rmtree(workdir)


