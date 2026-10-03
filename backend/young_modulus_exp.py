"""杨氏模量：光杠杆逐差法。"""
try:
    from .structured_report import parse_report, render
    from .report_calculations import young
except ImportError:
    from structured_report import parse_report, render
    from report_calculations import young

EXPERIMENT_ID = "young-modulus"
TITLE = "金属丝杨氏模量的测定"
DATA_SPEC = {"load_up": (10, "load_up_{i:02d}"),
             "load_down": (10, "load_down_{i:02d}"),
             "diameter": (5, "diameter_{i:02d}")}
PARAMETERS = ("mass_step_kg", "preload_kg", "wire_length_cm", "mirror_distance_cm",
              "lever_arm_cm", "gravity_ms2", "reference_modulus_pa")


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    young(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir)
