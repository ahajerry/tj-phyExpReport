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
             "diameter_initial": (5, "diameter_initial_{i:02d}"),
             "diameter_final": (5, "diameter_final_{i:02d}")}
PARAMETERS = ("mass_step_kg", "preload_kg", "wire_length_cm", "mirror_distance_cm",
              "lever_arm_cm", "gravity_ms2", "reference_modulus_pa",
              "diameter_error_mm", "scale_error_cm")


def report_fields(payload):
    # Older clients supplied corrected diameters, equivalent to a zero initial reading.
    if isinstance(payload, dict):
        payload = dict(payload)
        if isinstance(payload.get("data"), dict):
            data = dict(payload["data"])
            if set(data) == {"load_up", "load_down", "diameter"}:
                data["diameter_initial"] = ["0"] * 5
                data["diameter_final"] = data.pop("diameter")
            payload["data"] = data
        if isinstance(payload.get("parameters"), dict):
            payload["parameters"] = {"diameter_error_mm": "0.004", "scale_error_cm": "0.05",
                                     **payload["parameters"]}
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    data["diameter"] = [end - start for start, end in
                        zip(data["diameter_initial"], data["diameter_final"])]
    young(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir)
