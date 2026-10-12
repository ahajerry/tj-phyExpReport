"""波尔共振：自由周期、阻尼系数和受迫振幅。"""
from pathlib import Path
from decimal import Decimal
import re

try:
    from .structured_report import parse_report, render, number
    from .report_calculations import resonance
except ImportError:
    from structured_report import parse_report, render, number
    from report_calculations import resonance

EXPERIMENT_ID = "forced-vibration"
TITLE = "用波尔共振仪研究物体受迫振动"
DATA_SPEC = {"free_angle": (10, "free_angle_{i:02d}"),
             "free_period": (10, "free_period_{i:02d}"),
             "damped_peak": (10, "damped_peak_{i:02d}"),
             "damped_period": (1, "damped_period_s"),
             "drive_period": (15, "drive_period_{i:02d}"),
             "amplitude": (15, "amplitude_{i:02d}"),
             "phase": (15, "phase_{i:02d}")}
PARAMETERS = ("damping_setting",)
UPLOAD_COUNTS = {"free_angle": 90, "free_period": 90, "damped_peak": 30,
                 "damped_period": 3, "drive_period": 20, "amplitude": 20, "phase": 20}


def report_fields(payload):
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict) and "damped_time_10" in payload["data"]:
        data = dict(payload["data"])
        timings = data.pop("damped_time_10")
        if "damped_period" in data or not isinstance(timings, list) or len(timings) != 3:
            raise ValueError("阻尼振动需要三次 10T 计时")
        data["damped_period"] = [str(number(value, "阻尼振动 10T 计时", positive=True) / 10) for value in timings]
        payload = {**payload, "data": data}
    spec = DATA_SPEC
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        free = payload["data"].get("free_angle")
        if isinstance(free, list) and len(free) == UPLOAD_COUNTS["free_angle"]:
            spec = {key: (UPLOAD_COUNTS[key], pattern if key != "damped_period" else "damped_period_{i:02d}")
                    for key, (_, pattern) in DATA_SPEC.items()}
    fields, data, params = parse_report(payload, EXPERIMENT_ID, spec, PARAMETERS)
    resonance(fields, data, params)
    if spec is not DATA_SPEC:
        fields["damped_period_s"] = format(sum(data["damped_period"]) / Decimal(3), ".4f")
    return fields


def editable_source_tables(payload):
    """Build record pages from the final editable values, including any corrections."""
    data = payload["data"]
    return [
        {"title": "波尔共振自由振动记录（各列依次续接）",
         "headers": ["振幅1/°", "周期1/s", "振幅2/°", "周期2/s", "振幅3/°", "周期3/s"],
         "rows": [[str(data[key][row + offset]) for offset in (0, 30, 60) for key in ("free_angle", "free_period")]
                  for row in range(30)]},
        {"title": "波尔共振阻尼记录（档位 " + str(payload["parameters"]["damping_setting"]) + "）",
         "headers": ["测量组", "10T/s", "n", "峰值n/°", "峰值(n+5)/°"],
         "rows": [[str(trial + 1), str(data["damped_time_10"][trial]), str(row + 1),
                   str(data["damped_peak"][trial * 10 + row]), str(data["damped_peak"][trial * 10 + row + 5])]
                  for trial in range(3) for row in range(5)]},
        {"title": "波尔共振受迫振动记录", "headers": ["序号", "驱动单周期/s", "稳定振幅/°", "滞后角正读数/°"],
         "rows": [[str(row + 1), *[str(data[key][row]) for key in ("drive_period", "amplitude", "phase")]]
                  for row in range(20)]},
    ]


def uploaded_template():
    """Expand the measurement tables without truncating the instrument export."""
    template = Path(__file__).resolve().parents[1] / "tex/templates/forced-vibration.tex"
    source = template.read_text(encoding="utf-8")

    def field(key, index):
        return rf"\Field[10mm]{{{key}_{index:02d}}}"

    tables = [
        ("free_angle_01", [r"$\theta$/°", "$T_0$/s"] * 3,
         [[field(key, i+offset) for offset in (0, 30, 60) for key in ("free_angle", "free_period")]
          for i in range(1, 31)]),
        ("damped_peak_01", ["组次", "$T_d$/s", "$i$", r"$\theta_i$/°", r"$\theta_{i+5}$/°", r"$\ln(\theta_i/\theta_{i+5})$"],
         [[str(trial+1), field("damped_period", trial+1), str(i), field("damped_peak", trial*10+i),
           field("damped_peak", trial*10+i+5), field("damped_log_ratio", trial*5+i)]
          for trial in range(3) for i in range(1, 6)]),
        ("table_drive_period_01", ["强迫力矩周期 (s)", r"\shortstack{相位差 $\phi$ ($^\circ$)\\读取值}",
                                  r"\shortstack{$\theta$ ($^\circ$)\\测量值}", r"$\omega/\omega_r$",
                                  r"$\theta^2/\theta_r^2$", r"\shortstack{相位差 $\phi$ ($^\circ$)\\计算值}"],
         [[field(key, i) for key in ("table_drive_period", "table_phase_reading", "amplitude", "table_frequency_ratio", "table_amplitude_ratio", "table_phase_calculated")]
          for i in range(1, 21)]),
    ]
    for marker, headers, rows in tables:
        def replace(match):
            if marker not in match.group():
                return match.group()
            head = " & ".join(headers) + r"\\\hline"
            body = "\n".join(" & ".join(row) + r"\\\hline" for row in rows)
            columns = "|" + "c|" * len(headers)
            spacing = ""
            if marker == "table_drive_period_01":
                columns = "|" + "|".join(r">{\centering\arraybackslash}p{" + width + "cm}" for width in ("2.8", "2.25", "1.4", "1.8", "1.9", "2.25")) + "|"
                spacing = r"\setlength{\tabcolsep}{3pt}"
            style = (r"{\footnotesize\renewcommand{\arraystretch}{1}" if marker != "table_drive_period_01"
                     else r"{\small\renewcommand{\arraystretch}{1.15}")
            return "\n".join((style + spacing,
                              r"\begin{longtable}{" + columns + r"}\hline",
                              head, r"\endfirsthead\hline", head, r"\endhead", body,
                              r"\end{longtable}}"))
        source = re.sub(r"\\begin\{center\}\\small.*?\\end\{center\}", replace, source, flags=re.S)
    source = source.replace("记录十组周期", "记录九十组周期")
    source = source.replace("记录连续十个同侧阻尼峰值", "分别记录三次测量的十个同侧阻尼峰值")
    source = source.replace("十五个设置点", "二十个设置点")
    source = source.replace("阻尼振动单周期 $T_d=", "三次阻尼振动平均单周期 $\\bar T_d=")
    return source


def render_report(payload, progress, image_dir):
    fields = report_fields(payload)
    return render(fields, EXPERIMENT_ID, TITLE, progress, image_dir,
                  template_source=uploaded_template() if len(payload["data"]["free_angle"]) == 90 else None)
