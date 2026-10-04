"""阴极射线示波器：校准、七种波形测量和李萨如测频。"""
from decimal import Decimal
from math import gcd

try:
    from .structured_report import parse_report, render, fmt, mean, sem
    from .report_calculations import positive, finish_pair
except ImportError:
    from structured_report import parse_report, render, fmt, mean, sem
    from report_calculations import positive, finish_pair

EXPERIMENT_ID = "oscilloscope"
TITLE = "阴极射线示波器"
WAVEFORMS = ("正锯齿波", "反锯齿波", "脉冲波", "半波", "正弦波", "方波", "三角波")
DATA_SPEC = {
    **{key: (7, key + "_{i:02d}") for key in
       ("voltage_scale", "voltage_divisions", "time_scale", "period_divisions")},
    **{key: (5, key + "_{i:02d}") for key in ("reference_frequency", "nx", "ny")},
}
PARAMETERS = ("probe_factor", "cal_voltage_scale", "cal_voltage_divisions",
              "cal_time_scale", "cal_period_divisions")


def report_fields(payload):
    fields, data, params = parse_report(payload, EXPERIMENT_ID, DATA_SPEC, PARAMETERS)
    for key, values in data.items():
        for index, value in enumerate(values, 1):
            positive(value, f"{key} 第 {index} 组")
            if key in ("nx", "ny") and (value != value.to_integral_value() or value > 100):
                raise ValueError(f"{key} 切点数必须为 1–100 的正整数")
    for key, value in params.items():
        positive(value, key)
    cal_voltage = params["cal_voltage_scale"] * params["cal_voltage_divisions"]
    cal_period = params["cal_time_scale"] * params["cal_period_divisions"]
    fields.update(cal_voltage=fmt(cal_voltage), cal_period=fmt(cal_period),
                  cal_frequency=fmt(1 / cal_period),
                  cal_voltage_error=fmt((cal_voltage / Decimal("0.5") - 1) * 100),
                  cal_frequency_error=fmt((1 / cal_period - 1) * 100))
    waveform_frequencies = []
    for index in range(1, len(WAVEFORMS) + 1):
        i = index - 1
        voltage = data["voltage_scale"][i] * data["voltage_divisions"][i] * params["probe_factor"]
        period = data["time_scale"][i] * data["period_divisions"][i]
        frequency = 1 / period  # ms 的倒数为 kHz。
        waveform_frequencies.append(frequency)
        fields.update({f"voltage_pp_{index:02d}": fmt(voltage),
                       f"period_ms_{index:02d}": fmt(period),
                       f"frequency_khz_{index:02d}": fmt(frequency)})
    frequencies = []
    for index, (fx, nx, ny) in enumerate(zip(data["reference_frequency"], data["nx"], data["ny"]), 1):
        fy = fx * nx / ny
        divisor = gcd(int(nx), int(ny))
        frequencies.append(fy)
        fields[f"lissajous_frequency_{index:02d}"] = fmt(fy)
        fields[f"frequency_ratio_{index:02d}"] = f"{int(nx) // divisor}:{int(ny) // divisor}"
    center = mean(frequencies)
    finish_pair(fields, "lissajous_mean_khz", "lissajous_u_khz", center, sem(frequencies))
    fields["sine_frequency_khz"] = fmt(waveform_frequencies[4])
    fields["method_difference_percent"] = fmt(abs(center - waveform_frequencies[4]) / waveform_frequencies[4] * 100)
    return fields


def render_report(payload, progress=lambda _value, _stage: None, image_dir=None):
    fields = report_fields(payload)
    if image_dir is not None and image_dir.exists() and sum(path.is_file() for path in image_dir.iterdir()) > 2:
        raise ValueError("示波器报告最多附两张原始记录图片，以保持完整报告为 6–7 页")
    return render(fields, EXPERIMENT_ID, TITLE, progress, image_dir)
