"""空气比热容比：振动法与不确定度传播。"""
try:
    from .structured_report import parse_report, render
    from .report_calculations import heat
except ImportError:
    from structured_report import parse_report, render
    from report_calculations import heat

EXPERIMENT_ID = "heat-capacity-ratio"
TITLE = "空气比热容比的测定"
DATA_SPEC = {
    "diameter": (5, "diameter_{i:02d}"),
    "period": (5, "period_{i:02d}"),
}
PARAMETERS = ("mass_g", "volume_l", "pressure_start_kpa", "pressure_end_kpa",
              "diameter_zero_mm", "diameter_error_mm", "mass_error_g",
              "period_error_s", "pressure_error_kpa", "volume_error_l")


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    heat(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir)
