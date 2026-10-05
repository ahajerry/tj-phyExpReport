"""阴极射线示波器：四种波形测量和四组李萨如测频。"""
from math import gcd

try:
    from .structured_report import parse_report, render, fmt, mean, sem
    from .report_calculations import positive, finish_pair
except ImportError:
    from structured_report import parse_report, render, fmt, mean, sem
    from report_calculations import positive, finish_pair

EXPERIMENT_ID = "oscilloscope"
TITLE = "阴极射线示波器"
WAVEFORMS = ("方波", "正弦波", "三角波", "半波")
DATA_SPEC = {
    **{key: (4, key + "_{i:02d}") for key in
       ("voltage_scale", "voltage_divisions", "time_scale", "period_divisions")},
    **{key: (4, key + "_{i:02d}") for key in ("reference_frequency", "nx", "ny")},
}
PARAMETERS = ("probe_factor",)


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    for key, values in data.items():
        for index, value in enumerate(values, 1):
            positive(value, f"{key} 第 {index} 组")
            if key in ("nx", "ny") and (value != value.to_integral_value() or value > 100):
                raise ValueError(f"{key} 切点数必须为 1–100 的正整数")
    for key, value in params.items():
        positive(value, key)
    waveform_frequencies = []
    for index in range(1, len(WAVEFORMS) + 1):
        i = index - 1
        voltage = data["voltage_scale"][i] * data["voltage_divisions"][i] * params["probe_factor"]
        period = data["time_scale"][i] * data["period_divisions"][i]
        frequency = 1 / period  # ms 的倒数为 kHz。
        waveform_frequencies.append(frequency)
        fields.update({f"voltage_pp_{index:02d}": fmt(voltage),
                       f"period_ms_{index:02d}": fmt(period),
                       f"frequency_hz_{index:02d}": fmt(frequency * 1000)})
    frequencies = []
    for index, (fx, nx, ny) in enumerate(zip(data["reference_frequency"], data["nx"], data["ny"]), 1):
        fy = fx * nx / ny
        divisor = gcd(int(nx), int(ny))
        frequencies.append(fy)
        fields[f"lissajous_frequency_{index:02d}"] = fmt(fy)
        fields[f"frequency_ratio_{index:02d}"] = f"{int(nx) // divisor}:{int(ny) // divisor}"
    center = mean(frequencies)
    finish_pair(fields, "lissajous_mean_khz", "lissajous_u_khz", center, sem(frequencies))
    sine_frequency = waveform_frequencies[WAVEFORMS.index("正弦波")]
    fields["sine_frequency_khz"] = fmt(sine_frequency)
    fields["method_difference_percent"] = fmt(abs(center - sine_frequency) / sine_frequency * 100)
    return fields


def render_report(payload, progress=lambda _value, _stage: None, image_dir=None):
    fields = report_fields(payload)
    if image_dir is not None and image_dir.exists() and sum(path.is_file() for path in image_dir.iterdir()) > 2:
        raise ValueError("示波器报告最多附两张原始记录图片，以保持完整报告为 6–7 页")
    return render(fields, EXPERIMENT_ID, TITLE, progress, image_dir)
