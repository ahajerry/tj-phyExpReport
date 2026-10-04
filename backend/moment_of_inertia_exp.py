"""扭摆惯量：标定、规则物体和平行轴验证。"""
try:
    from .structured_report import parse_report, render
    from .report_calculations import torsion
except ImportError:
    from structured_report import parse_report, render
    from report_calculations import torsion

EXPERIMENT_ID = "moment-of-inertia"
TITLE = "用扭摆法测定物体转动惯量"
DATA_SPEC = {
    **{f"time_{key}": (3, f"time_{key}_{{i:02d}}") for key in
       ("disk", "cylinder", "tube", "ball", "rod")},
    **{f"slider_time_{x}": (3, f"slider_time_{x}_{{i:02d}}") for x in (5, 10, 15, 20)},
}
PARAMETERS = ("mass_cylinder_g", "diameter_cylinder_mm", "mass_tube_g",
              "diameter_tube_outer_mm", "diameter_tube_inner_mm", "mass_ball_g",
              "diameter_ball_mm", "mass_rod_g", "length_rod_mm",
              "slider_mass_g", "slider_self_inertia")


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    torsion(fields, data, params)
    geometry = payload.get("geometryReadings", {})
    for key in ("cylinder", "tube_outer", "tube_inner", "ball", "rod"):
        values = geometry.get(key, []) if isinstance(geometry, dict) else []
        if values:
            if not isinstance(values, list) or len(values) != 3:
                raise ValueError("几何尺寸读数格式错误")
            for index, value in enumerate(values, 1):
                fields[f"geometry_{key}_{index:02d}"] = str(value)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir,
                  source_tables=payload.get("sourceTables"))
