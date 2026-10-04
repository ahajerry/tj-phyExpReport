"""密立根油滴：单滴电荷与两种元电荷估计。"""
try:
    from .structured_report import parse_report, render
    from .report_calculations import millikan
except ImportError:
    from structured_report import parse_report, render
    from report_calculations import millikan

EXPERIMENT_ID = "millikan"
TITLE = "密立根油滴实验"
DATA_SPEC = {"voltage": (10, "voltage_{i:02d}"), **{
    f"time_{j}": (10, f"time_{{i:02d}}_{j}") for j in range(1, 5)
}}
PARAMETERS = ()


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    millikan(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir,
                  source_tables=payload.get("sourceTables"))
