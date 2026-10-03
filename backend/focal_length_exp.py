"""透镜焦距：单次成像、共轭、自准直与凹透镜辅助成像。"""
try:
    from .structured_report import parse_report, render
    from .report_calculations import lens
except ImportError:
    from structured_report import parse_report, render
    from report_calculations import lens

EXPERIMENT_ID = "focal-length"
TITLE = "透镜焦距的测量"
DATA_SPEC = {"object_distance": (3, "object_distance_{i:02d}"),
             "image_distance": (3, "image_distance_{i:02d}"),
             "bessel_length": (5, "bessel_length_{i:02d}"),
             "bessel_separation": (5, "bessel_separation_{i:02d}"),
             "auto_object": (5, "auto_object_{i:02d}"),
             "auto_lens": (5, "auto_lens_{i:02d}"),
             "concave_object": (5, "concave_object_{i:02d}"),
             "concave_lens": (5, "concave_lens_{i:02d}"),
             "concave_image": (5, "concave_image_{i:02d}")}
PARAMETERS = ()


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    lens(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    return render(report_fields(payload), EXPERIMENT_ID, TITLE, progress, image_dir)
