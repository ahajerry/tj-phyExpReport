"""Convert editable instrument records to the existing calculation inputs."""
from decimal import Decimal

try:
    from .structured_report import number
except ImportError:
    from structured_report import number


TORSION_SIZES = ("cylinder", "tube_inner", "tube_outer", "ball", "rod")
TORSION_MASSES = ("cylinder", "tube", "ball", "rod")
TORSION_TIMES = ("cylinder", "disk", "tube", "ball", "rod")
MILLIKAN_COLUMNS = ("current_voltage", "balance_voltage", "fall_time", "instrument_charge")


def text(value):
    return str(value).strip()


def plain(value):
    return format(value.normalize(), "f")


def editable_import(payload):
    experiment_id = payload["experimentId"]
    data = dict(payload["data"])
    parameters = dict(payload["parameters"])
    if experiment_id == "forced-vibration":
        data["damped_time_10"] = [format(Decimal(value) * 10, "f") for value in data.pop("damped_period")]
        data["drive_time_10"] = [format(Decimal(value) * 10, "f") for value in data.pop("drive_period")]
    elif experiment_id == "millikan":
        rows = payload["sourceTables"][0]["rows"]
        data = {key: [row[index + 2] for row in rows] + [""] * (32 - len(rows))
                for index, key in enumerate(MILLIKAN_COLUMNS)}
    elif experiment_id == "moment-of-inertia":
        data.update({f"size_{key}_cm": values for key, values in payload["geometryReadings"].items()})
        rows = payload["sourceTables"][0]["rows"]
        parameters = {f"mass_{key}_kg": rows[index][1]
                      for key, index in (("cylinder", 0), ("tube", 1), ("ball", 3), ("rod", 4))}
        sliders = payload["sourceTables"][2]["rows"][0]
        parameters.update(dict(zip(("slider_mass_1_kg", "slider_mass_2_kg", "slider_pair_inertia_scaled"), sliders)))
    return {"data": data, "parameters": parameters, "reportInfo": payload.get("reportInfo", {})}


def normalize_millikan(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict) or "balance_voltage" not in payload["data"]:
        return payload
    raw = payload["data"]
    if set(raw) != set(MILLIKAN_COLUMNS) or any(not isinstance(raw[key], list) or len(raw[key]) != 32 for key in MILLIKAN_COLUMNS):
        raise ValueError("油滴原始记录需有 32 行，包含当前电压、平衡电压、时间和电荷量")
    rows = [[text(raw[key][index]) for key in MILLIKAN_COLUMNS] for index in range(32)]
    used = [index for index, row in enumerate(rows) if any(row)]
    count = (used[-1] // 4 + 1) if used else 0
    if not 3 <= count <= 8:
        raise ValueError("请连续填写 3 至 8 颗油滴，每颗油滴 4 行记录")
    data = {"voltage": [], **{f"time_{trial}": [] for trial in range(1, 5)}}
    source_rows = []
    for drop in range(count):
        voltages = []
        for trial in range(4):
            row = rows[drop * 4 + trial]
            label = f"第 {drop + 1} 颗油滴第 {trial + 1} 次"
            voltages.append(number(row[1], label + "平衡电压", positive=True))
            number(row[2], label + "下降时间", positive=True)
            for index in (0, 3):
                if row[index]:
                    number(row[index], label + ("当前电压" if index == 0 else "仪器电荷量"))
            data[f"time_{trial + 1}"].append(row[2])
            source_rows.append([str(drop + 1), str(trial + 1), *row])
        data["voltage"].append(str(sum(voltages) / 4))
    for values in data.values():
        values.extend([""] * (8 - count))
    return {**payload, "data": data, "sourceTables": [{"title": "密立根油滴原始记录（当前表格）",
            "headers": ["油滴", "次数", "当前电压/V", "平衡电压/V", "时间/s", "仪器电荷量/C"], "rows": source_rows}]}


def normalize_torsion(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict) or "size_cylinder_cm" not in payload["data"]:
        return payload
    raw, parameters = payload["data"], payload.get("parameters")
    timing_keys = [f"time_{key}" for key in TORSION_TIMES] + [f"slider_time_{x}" for x in (5, 10, 15, 20)]
    size_keys = [f"size_{key}_cm" for key in TORSION_SIZES]
    if set(raw) != set(timing_keys + size_keys) or any(not isinstance(raw[key], list) or len(raw[key]) != 3 for key in raw):
        raise ValueError("扭摆法每种状态的计时和尺寸均需三次读数")
    required = {f"mass_{key}_kg" for key in TORSION_MASSES} | {"slider_mass_1_kg", "slider_mass_2_kg", "slider_pair_inertia_scaled"}
    if not isinstance(parameters, dict) or set(parameters) != required:
        raise ValueError("扭摆法质量和滑块参数字段不完整")
    masses = {key: number(value, key, positive=key != "slider_pair_inertia_scaled", nonnegative=True)
              for key, value in parameters.items()}
    sizes = {key: [number(value, key, positive=True) for value in raw[f"size_{key}_cm"]] for key in TORSION_SIZES}
    params = {f"mass_{key}_g": plain(masses[f"mass_{key}_kg"] * 1000) for key in TORSION_MASSES}
    for key, target in (("cylinder", "diameter_cylinder_mm"), ("tube_inner", "diameter_tube_inner_mm"),
                        ("tube_outer", "diameter_tube_outer_mm"), ("ball", "diameter_ball_mm"), ("rod", "length_rod_mm")):
        params[target] = str((sum(sizes[key]) / 3 * 10).quantize(Decimal("0.001")))
    params["slider_mass_g"] = plain((masses["slider_mass_1_kg"] + masses["slider_mass_2_kg"]) / 2 * 1000)
    params["slider_self_inertia"] = str(masses["slider_pair_inertia_scaled"] * Decimal("1e-4") / 2)
    geometry = {key: [text(value) for value in raw[f"size_{key}_cm"]] for key in TORSION_SIZES}
    labels = {"cylinder": "塑料圆柱", "disk": "载物盘", "tube": "金属圆筒", "tube_inner": "金属圆筒内径",
              "tube_outer": "金属圆筒外径", "ball": "圆球", "rod": "金属细杆"}
    return {**payload, "data": {key: raw[key] for key in timing_keys}, "parameters": params, "geometryReadings": geometry,
            "sourceTables": [
                {"title": "扭摆法质量与尺寸记录（当前表格）", "headers": ["物体", "质量/kg", "尺寸1/cm", "尺寸2/cm", "尺寸3/cm"],
                 "rows": [[labels[key], text(parameters[f"mass_{'tube' if key.startswith('tube') else key}_kg"]), *geometry[key]]
                          for key in TORSION_SIZES]},
                {"title": "扭摆法周期计时记录（当前表格）", "headers": ["物体/位置", "周期数", "时长1/s", "时长2/s", "时长3/s"],
                 "rows": [[labels[key], "20" if key == "disk" else "10", *map(text, raw[f"time_{key}"])] for key in TORSION_TIMES]
                         + [[f"滑块 {x} cm", "5", *map(text, raw[f"slider_time_{x}"])] for x in (5, 10, 15, 20)]},
                {"title": "扭摆法滑块参数（当前表格）", "headers": ["滑块1质量/kg", "滑块2质量/kg", "两滑块自身惯量/×10⁻⁴ kg·m²"],
                 "rows": [[text(parameters[key]) for key in ("slider_mass_1_kg", "slider_mass_2_kg", "slider_pair_inertia_scaled")]]}]}
