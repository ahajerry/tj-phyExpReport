"""波尔共振：自由周期、阻尼系数和受迫振幅。"""
try:
    from .structured_report import parse_report, render
    from .report_calculations import resonance
except ImportError:
    from structured_report import parse_report, render
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


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    resonance(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir)
