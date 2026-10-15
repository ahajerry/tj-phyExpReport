"""波尔共振：自由周期、阻尼系数和受迫振幅。"""
from pathlib import Path
import re

try:
    from .structured_report import parse_report, render, number
    from .report_calculations import resonance
    from .forced_vibration_tables import measurement_tables
except ImportError:
    from structured_report import parse_report, render, number
    from report_calculations import resonance
    from forced_vibration_tables import measurement_tables

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


def report_fields(payload):
    # New forms record ten drive cycles; old exports/API records use one cycle.
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict) and "drive_time_10" in payload["data"]:
        data = dict(payload["data"])
        timings = data.pop("drive_time_10")
        if "drive_period" in data or not isinstance(timings, list) or not timings:
            raise ValueError("强迫力矩周期请仅填写 10T 计时或单周期 T")
        data["drive_period"] = [str(number(value, "强迫力矩 10T 计时", positive=True) / 10) for value in timings]
        payload = {**payload, "data": data}
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict) and "damped_time_10" in payload["data"]:
        data = dict(payload["data"])
        timings = data.pop("damped_time_10")
        if "damped_period" in data or not isinstance(timings, list) or not timings:
            raise ValueError("阻尼振动需要至少 1 次 10T 计时")
        data["damped_period"] = [str(number(value, "阻尼振动 10T 计时", positive=True) / 10) for value in timings]
        payload = {**payload, "data": data}
    spec = DATA_SPEC
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        data = payload["data"]
        for keys, low in ((('free_angle', 'free_period'), 2),
                          (('drive_period', 'amplitude', 'phase'), 3),
                          (('damped_period',), 1)):
            values = [data.get(key) for key in keys]
            if (any(not isinstance(value, list) for value in values)
                    or len(values[0]) < low
                    or any(len(value) != len(values[0]) for value in values)):
                raise ValueError(f"{'、'.join(keys)} 需要数量一致的至少 {low} 组读数")
        if not isinstance(data.get('damped_peak'), list) or len(data['damped_peak']) != 10 * len(data['damped_period']):
            raise ValueError("每次阻尼测量需要 10 个峰值和一次计时")
        spec = {key: (len(data[key]), pattern if key != "damped_period" else "damped_period_{i:02d}")
                for key, (_, pattern) in DATA_SPEC.items()}
    fields, data, params = parse_report(payload, EXPERIMENT_ID, spec, PARAMETERS)
    resonance(fields, data, params)
    if spec is not DATA_SPEC:
        fields["damped_period_s"] = format(sum(data["damped_period"]) / len(data["damped_period"]), ".4f")
    return fields


def editable_source_tables(payload):
    """Build record pages from the final editable values, including any corrections."""
    data = payload["data"]
    return [
        {"title": "波尔共振自由振动记录（各列依次续接）",
         "headers": ["振幅1/°", "周期1/s", "振幅2/°", "周期2/s", "振幅3/°", "周期3/s"],
         "rows": [[str(data[key][row + offset]) if row + offset < len(data[key]) else ""
                   for offset in (0, 30, 60) for key in ("free_angle", "free_period")]
                  for row in range(30)]} if len(data['free_angle']) <= 90 else
        {"title": "波尔共振自由振动记录", "headers": ["振幅/°", "周期/s"],
         "rows": list(map(list, zip(data['free_angle'], data['free_period'])))},
        {"title": "波尔共振阻尼记录（档位 " + str(payload["parameters"]["damping_setting"]) + "）",
         "headers": ["测量组", "10T/s", "n", "峰值n/°", "峰值(n+5)/°"],
         "rows": [[str(trial + 1), str(data["damped_time_10"][trial]), str(row + 1),
                   str(data["damped_peak"][trial * 10 + row]), str(data["damped_peak"][trial * 10 + row + 5])]
                  for trial in range(len(data['damped_time_10'])) for row in range(5)]},
        {"title": "波尔共振受迫振动记录", "headers": ["序号", "强迫力矩 10T/s", "稳定振幅/°", "滞后角正读数/°"],
         "rows": [[str(row + 1), str(timing), str(data['amplitude'][row]), str(data['phase'][row])]
                  for row, timing in enumerate(data.get('drive_time_10',
                      [str(number(value, '驱动周期') * 10) for value in data.get('drive_period', [])]))]},
    ]


def uploaded_template(free_count=90, trial_count=3, forced_count=20):
    """Expand the measurement tables without truncating the instrument export."""
    template = Path(__file__).resolve().parents[1] / "tex/templates/forced-vibration.tex"
    source = template.read_text(encoding="utf-8")

    for name, table in measurement_tables(free_count, trial_count, forced_count).items():
        source = re.sub(r"% BEGIN " + name + r"_TABLE.*?% END " + name + r"_TABLE",
                        lambda _: "% BEGIN " + name + "_TABLE\n" + table + "\n% END " + name + "_TABLE",
                        source, flags=re.S)
    return source


def render_report(payload, progress, image_dir):
    fields = report_fields(payload)
    return render(fields, EXPERIMENT_ID, TITLE, progress, image_dir,
                  template_source=uploaded_template(len(payload['data']['free_angle']),
                      len(payload['data'].get('damped_time_10', payload['data'].get('damped_period', []))),
                      len(payload['data'].get('drive_time_10', payload['data'].get('drive_period', [])))))
