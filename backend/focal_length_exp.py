"""透镜焦距：单次成像、共轭、自准直与凹透镜辅助成像。"""
from pathlib import Path
import re
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
    spec = DATA_SPEC
    if isinstance(payload, dict) and isinstance(payload.get('data'), dict):
        data = payload['data']
        keys = [key for key in DATA_SPEC if key.startswith('concave_')]
        if all(key not in data or isinstance(data[key], list) and all(value == '' for value in data[key]) for key in keys):
            payload = {**payload, 'data': {key: value for key, value in data.items() if key not in keys}}
            spec = {key: value for key, value in DATA_SPEC.items() if key not in keys}
    fields, data, params = parse_report(payload, EXPERIMENT_ID, spec, PARAMETERS)
    lens(fields, data, params)
    return fields


def render_report(payload, progress, image_dir):
    fields = report_fields(payload)
    source = None
    if 'focus_concave_mean_mm' not in fields:
        source = (Path(__file__).resolve().parents[1] / 'tex/templates/focal-length.tex').read_text(encoding='utf-8')
        source = re.sub(r'\\ReportSubsection\{凹透镜辅助成像\}.*?(?=\\ReportSection)', '', source, flags=re.S)
        source = re.sub(r'\\ReportSection\{凹透镜辅助成像\}.*?(?=\\\[)', '', source, flags=re.S)
        source = re.sub(r'\\ReportSubsection\{凹透镜符号\}.*?(?=\\ReportSubsection)', '', source, flags=re.S)
        source = '\n'.join(line for line in source.split('\n') if r'\bar f_{\rm concave}' not in line)
        source = source.replace('掌握四种焦距测量方法', '掌握三种凸透镜焦距测量方法')
        source = source.replace('，再用辅助成像测凹透镜焦距', '')
        source = source.replace('凸透镜、凹透镜、平面镜', '凸透镜、平面镜')
        source = re.sub('对凹透镜，.*?十分敏感。', '', source)
        source = re.sub(r'；辅助成像得到凹透镜焦距 .*?。', '。', source)
        source = source.replace('三法一致性与符号约定', '三法一致性')
    return render(fields, EXPERIMENT_ID, TITLE, progress, image_dir, template_source=source)
