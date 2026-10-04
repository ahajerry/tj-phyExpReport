"""Physical calculations for the six newly connected experiments.

Input units follow the labels on the corresponding LaTeX data tables.
"""

from __future__ import annotations

from decimal import Decimal
from math import log, pi, sqrt

try:
    from .structured_report import fmt, mean, sem
    from .result_precision import finish_report_result, format_report_at_place
except ImportError:
    from structured_report import fmt, mean, sem
    from result_precision import finish_report_result, format_report_at_place

PI = Decimal(str(pi))
E_REF = Decimal("1.602176634e-19")


def positive(value: Decimal, name: str) -> Decimal:
    if value <= 0:
        raise ValueError(f"{name} 必须大于零")
    return value


def nonnegative(value: Decimal, name: str) -> Decimal:
    if value < 0:
        raise ValueError(f"{name} 不能小于零")
    return value


def put(fields: dict[str, str], **values: Decimal | float | int) -> None:
    fields.update({key: fmt(value) for key, value in values.items()})


def coordinates(points: list[tuple[Decimal | int, Decimal | int]]) -> str:
    return " ".join(f"({fmt(x)},{fmt(y)})" for x, y in points)


def finish_pair(fields: dict[str, str], value_key: str, uncertainty_key: str,
                value: Decimal, uncertainty: Decimal):
    finished = finish_report_result(value, uncertainty)
    fields[value_key] = finished.value
    fields[uncertainty_key] = finished.uncertainty
    return finished


def finish_percent(value: Decimal, relative_uncertainty: Decimal) -> str:
    return finish_report_result(value, relative_uncertainty * 100).value


def heat(fields, data, p):
    d = [x + p["diameter_zero_mm"] for x in data["diameter"]]
    if any(x <= 0 for x in d):
        raise ValueError("零点修正后的直径必须为正数")
    for i, value in enumerate(d, 1):
        fields[f"diameter_corrected_{i:02d}"] = fmt(value)
    t = data["period"]
    td = mean(t)
    positive(td, "振动周期")
    for i, value in enumerate(t, 1):
        fields[f"period_deviation_{i:02d}"] = fmt(value - td)
    dm = mean(d) * Decimal("0.001")
    tm = td
    mass = positive(p["mass_g"], "小球质量") * Decimal("0.001")
    volume = positive(p["volume_l"], "瓶容积") * Decimal("0.001")
    pl = (positive(p["pressure_start_kpa"], "起始气压") + positive(p["pressure_end_kpa"], "终止气压")) / 2 * 1000
    pressure = pl + 4 * mass * Decimal("9.794") / (PI * dm * dm)
    gamma = 64 * mass * volume / (tm * tm * pressure * dm ** 4)
    ud = (sem(d) ** 2 + (nonnegative(p["diameter_error_mm"], "直径误差") / Decimal(3).sqrt()) ** 2).sqrt() * Decimal("0.001")
    ut = (sem(t) ** 2 + (nonnegative(p["period_error_s"], "周期误差") / Decimal(3).sqrt()) ** 2).sqrt()
    um = nonnegative(p["mass_error_g"], "质量误差") / Decimal(3).sqrt() * Decimal("0.001")
    uv = nonnegative(p["volume_error_l"], "容积误差") / Decimal(3).sqrt() * Decimal("0.001")
    up = nonnegative(p["pressure_error_kpa"], "压强误差") / Decimal(3).sqrt() * 1000
    ur = ((um / mass) ** 2 + (uv / volume) ** 2 + (2 * ut / tm) ** 2
          + (up / pressure) ** 2 + (4 * ud / dm) ** 2).sqrt()
    put(fields, diameter_mean_mm=mean(d), period_mean_s=td,
        pressure_mean_kpa=pl / 1000, pressure_inside_pa=pressure,
        gamma_result=gamma, gamma_uncertainty=gamma * ur,
        gamma_error_percent=abs(gamma - Decimal("1.402")) / Decimal("1.402") * 100)
    finish_pair(fields, "diameter_mean_mm", "diameter_mean_u_mm", mean(d), ud*1000)
    finish_pair(fields, "period_mean_s", "period_mean_u_s", td, ut)
    finish_pair(fields, "pressure_mean_kpa", "pressure_mean_u_kpa", pl/1000, up/1000)
    finish_pair(fields, "gamma_result", "gamma_uncertainty", gamma, gamma*ur)
    fields["gamma_error_percent"] = finish_percent(
        abs(gamma-Decimal("1.402"))/Decimal("1.402")*100, ur)


def millikan(fields, data, p):
    del p
    count = len(data["voltage"])
    if any(len(data[f"time_{j}"]) != count for j in range(1, 5)):
        raise ValueError("各颗油滴的四次时间与电压数量必须一致")
    charges: list[Decimal] = []
    counts: list[int] = []
    for i in range(count):
        voltage = positive(data["voltage"][i], f"第 {i+1} 滴平衡电压")
        times = [positive(data[f"time_{j}"][i], f"第 {i+1} 滴第 {j} 次时间") for j in range(1, 5)]
        t = mean(times)
        charge = Decimal("0.928e-14") / (voltage * t * (1 + Decimal("0.0226") * t.sqrt()) ** Decimal("1.5"))
        n = max(1, round(charge / E_REF))
        charges.append(charge)
        counts.append(n)
        put(fields, **{f"time_mean_{i+1:02d}": t, f"charge_{i+1:02d}": charge,
                       f"electron_count_{i+1:02d}": n,
                       f"charge_per_e_{i+1:02d}": charge / n / Decimal("1e-19"),
                       f"charge_scaled_{i+1:02d}": charge / Decimal("1e-19")})
    reverse_samples = [q / n for q, n in zip(charges, counts)]
    reverse = mean(reverse_samples)
    least_squares = sum(Decimal(n) * q for q, n in zip(charges, counts)) / sum(n*n for n in counts)
    residual = [q - least_squares * n for q, n in zip(charges, counts)]
    ls_u = (sum(x*x for x in residual) / (len(charges)-1) / sum(n*n for n in counts)).sqrt()
    n_mean = mean([Decimal(n) for n in counts])
    q_mean = mean(charges)
    variance = sum((Decimal(n)-n_mean)**2 for n in counts)
    graph = (sum((Decimal(n)-n_mean)*(q-q_mean) for n, q in zip(counts, charges)) / variance
             if variance else least_squares)
    intercept = q_mean - graph*n_mean if variance else Decimal(0)
    graph_residual = [q-graph*Decimal(n)-intercept for q, n in zip(charges, counts)]
    graph_u = ((sum(r*r for r in graph_residual) / (len(charges)-2) / variance).sqrt()
               if variance else ls_u)
    low, high = min(counts), max(counts)
    if low == high:
        low, high = 0, high + 1
    scale = Decimal("1e-19")
    fields["charge_graph_points"] = coordinates([(n, q/scale) for n, q in zip(counts, charges)])
    fields["charge_graph_fit_points"] = coordinates([
        (low, (graph*low+intercept)/scale), (high, (graph*high+intercept)/scale)])
    put(fields, electron_charge_reverse=reverse, electron_charge_reverse_u=sem(reverse_samples),
        reverse_error_percent=abs(reverse-E_REF)/E_REF*100,
        electron_charge_graph=graph, electron_charge_graph_u=graph_u,
        electron_charge_graph_intercept=intercept,
        electron_charge_ls=least_squares,
        electron_charge_ls_u=ls_u, ls_error_percent=abs(least_squares-E_REF)/E_REF*100)
    reverse_u = sem(reverse_samples)
    finish_pair(fields, "electron_charge_reverse", "electron_charge_reverse_u", reverse, reverse_u)
    graph_finished = finish_pair(fields, "electron_charge_graph", "electron_charge_graph_u", graph, graph_u)
    graph_exponent = graph.adjusted() if graph and (graph.adjusted() < -4 or graph.adjusted() > 6) else None
    fields["electron_charge_graph_intercept"] = format_report_at_place(
        intercept, graph_finished.place, graph_exponent)
    finish_pair(fields, "electron_charge_ls", "electron_charge_ls_u", least_squares, ls_u)
    fields["reverse_error_percent"] = finish_percent(abs(reverse-E_REF)/E_REF*100, reverse_u/reverse)
    fields["ls_error_percent"] = finish_percent(
        abs(least_squares-E_REF)/E_REF*100, ls_u/least_squares)


def torsion(fields, data, p):
    periods: dict[str, Decimal] = {}
    period_u: dict[str, Decimal] = {}
    for key in ("disk", "cylinder", "tube", "ball", "rod"):
        times = [positive(x, f"{key} 计时") for x in data[f"time_{key}"]]
        cycles = 20 if key == "disk" else 10
        for index, value in enumerate(times, 1):
            fields[f"period_{key}_{index:02d}"] = str(value / cycles)
        periods[key] = mean(times) / cycles
        period_u[key] = sem(times) / cycles
        finish_pair(fields, f"period_{key}", f"period_{key}_u", periods[key], period_u[key])
    mass = {key: positive(p[f"mass_{key}_g"], f"{key} 质量") / 1000 for key in ("cylinder", "tube", "ball", "rod")}
    for key, value in mass.items():
        fields[f"mass_{key}_kg"] = fmt(value)
    for key in ("diameter_cylinder_mm", "diameter_tube_outer_mm", "diameter_tube_inner_mm",
                "diameter_ball_mm", "length_rod_mm"):
        fields[key.replace("_mm", "_cm")] = fmt(p[key] / 10)
    cylinder_d = positive(p["diameter_cylinder_mm"], "圆柱直径") / 1000
    tube_o = positive(p["diameter_tube_outer_mm"], "圆筒外径") / 1000
    tube_i = positive(p["diameter_tube_inner_mm"], "圆筒内径") / 1000
    if tube_i >= tube_o:
        raise ValueError("圆筒内径必须小于外径")
    ball_d = positive(p["diameter_ball_mm"], "木球直径") / 1000
    rod_l = positive(p["length_rod_mm"], "细杆长度") / 1000
    theory = {
        "cylinder": mass["cylinder"] * cylinder_d**2 / 8,
        "tube": mass["tube"] * (tube_o**2 + tube_i**2) / 8,
        "ball": mass["ball"] * ball_d**2 / 10,
        "rod": mass["rod"] * rod_l**2 / 12,
    }
    difference = periods["cylinder"]**2 - periods["disk"]**2
    positive(difference, "圆柱与圆盘的周期平方差")
    t0, t1, i1 = periods["disk"], periods["cylinder"], theory["cylinder"]
    u0, u1 = period_u["disk"], period_u["cylinder"]
    kappa = 4 * PI**2 * i1 / difference
    kappa_u = kappa * ((2*t1*u1/difference)**2 + (2*t0*u0/difference)**2).sqrt()
    i0 = i1*t0**2/difference
    i0_u = ((2*i1*t0*t1**2*u0/difference**2)**2
            + (2*i1*t1*t0**2*u1/difference**2)**2).sqrt()
    finish_pair(fields, "torsion_constant", "torsion_constant_u", kappa, kappa_u)
    finish_pair(fields, "empty_inertia", "empty_inertia_u", i0, i0_u)

    def inertia_u(period: Decimal, uncertainty: Decimal, *, standard: bool = False) -> Decimal:
        if standard:
            return Decimal(0)  # 标定圆柱的计时贡献与自身的标准值相消。
        numerator = period**2-t0**2
        return ((2*i1*period*uncertainty/difference)**2
                + (2*i1*t0*(period**2-t1**2)*u0/difference**2)**2
                + (2*i1*t1*numerator*u1/difference**2)**2).sqrt()

    for key, expected in theory.items():
        measured = i1*(periods[key]**2-t0**2)/difference
        measured_u = inertia_u(periods[key], period_u[key], standard=key == "cylinder")
        result = finish_pair(fields, f"experiment_{key}", f"experiment_{key}_u", measured, measured_u)
        fields[f"theory_{key}"] = format_report_at_place(expected, result.place)
        fields[f"error_{key}"] = ("0" if measured == expected else
                                   finish_percent(abs(measured-expected)/expected*100, measured_u/expected))
    slider_mass = positive(p["slider_mass_g"], "滑块质量") / 1000
    slider_self = nonnegative(p["slider_self_inertia"], "滑块自身惯量")
    fields["slider_pair_inertia"] = fmt(2 * slider_self)
    slider_points = []
    slider_theory_points = []
    for x in (5, 10, 15, 20):
        times = [positive(value, f"滑块 {x} cm 的计时") for value in data[f"slider_time_{x}"]]
        period = mean(times) / 5
        period_uncertainty = sem(times) / 5
        expected = theory["rod"] + 2*slider_self + 2*slider_mass*(Decimal(x)/100)**2
        measured = i1*(period**2-t0**2)/difference
        measured_u = inertia_u(period, period_uncertainty)
        slider_points.append((x*x, measured*1000))
        slider_theory_points.append((x*x, expected*1000))
        finish_pair(fields, f"slider_period_{x}", f"slider_period_{x}_u", period, period_uncertainty)
        result = finish_pair(fields, f"slider_experiment_{x}", f"slider_experiment_{x}_u", measured, measured_u)
        fields[f"slider_theory_{x}"] = format_report_at_place(expected, result.place)
        fields[f"slider_error_{x}"] = finish_percent(abs(measured-expected)/expected*100, measured_u/expected)
    fields["slider_graph_points"] = coordinates(slider_points)
    fields["slider_graph_theory_points"] = coordinates(slider_theory_points)


def young(fields, data, p):
    positions = []
    up_points = []
    down_points = []
    mean_points = []
    for i, (up, down) in enumerate(zip(data["load_up"], data["load_down"]), 1):
        position = (up+down)/2
        positions.append(position)
        load = p["preload_kg"] + (i-1)*p["mass_step_kg"]
        up_points.append((load, up))
        down_points.append((load, down))
        mean_points.append((load, position))
        fields[f"load_mean_{i:02d}"] = fmt(position)
    fields["young_load_up_points"] = coordinates(up_points)
    fields["young_load_down_points"] = coordinates(down_points)
    fields["young_load_mean_points"] = coordinates(mean_points)
    differences = [abs(positions[i+5]-positions[i]) for i in range(5)]
    for i, value in enumerate(differences):
        fields[f"load_difference_{i:02d}"] = fmt(value)
    l = positive(mean(differences), "五级逐差位移") / 100
    d = positive(mean(data["diameter"]), "金属丝直径") / 1000
    length = positive(p["wire_length_cm"], "金属丝长度") / 100
    distance = positive(p["mirror_distance_cm"], "镜尺距离") / 100
    arm = positive(p["lever_arm_cm"], "光杠杆臂长") / 100
    step = positive(p["mass_step_kg"], "每级质量增量")
    gravity = positive(p["gravity_ms2"], "重力加速度")
    positive(p["reference_modulus_pa"], "参考模量")
    result = 8*length*distance*gravity*(5*step)/(PI*d*d*arm*l)
    relative = ((sem(data["diameter"])/mean(data["diameter"])*2)**2
                + (sem(differences)/mean(differences))**2).sqrt()
    put(fields, diameter_mean_mm=mean(data["diameter"]), difference_mean_cm=mean(differences),
        young_modulus_pa=result, young_uncertainty_pa=result*relative,
        young_error_percent=abs(result-p["reference_modulus_pa"])/p["reference_modulus_pa"]*100)
    finish_pair(fields, "diameter_mean_mm", "diameter_mean_u_mm",
                mean(data["diameter"]), sem(data["diameter"]))
    difference_result = finish_pair(fields, "difference_mean_cm", "difference_mean_u_cm",
                                    mean(differences), sem(differences))
    for i, value in enumerate(differences):
        fields[f"load_difference_{i:02d}"] = format_report_at_place(value, difference_result.place)
    finish_pair(fields, "young_modulus_pa", "young_uncertainty_pa", result, result*relative)
    fields["young_error_percent"] = finish_percent(
        abs(result-p["reference_modulus_pa"])/p["reference_modulus_pa"]*100, relative)


def resonance(fields, data, p):
    del p
    free = [positive(x, "自由振动周期") for x in data["free_period"]]
    if any(angle <= 0 for angle in data["free_angle"]):
        raise ValueError("自由振动角度必须为正数")
    t0 = mean(free)
    omega = 2*PI/t0
    damped_period = positive(data["damped_period"][0], "阻尼振动周期")
    peaks = [positive(x, "阻尼峰值") for x in data["damped_peak"]]
    beta_samples = [Decimal(str(log(float(peaks[i]/peaks[i+5]))))/(5*damped_period)
                    for i in range(5)]
    beta = mean(beta_samples)
    if beta <= 0:
        raise ValueError("阻尼峰值总体应随时间衰减")
    drive = [positive(x, "驱动周期") for x in data["drive_period"]]
    amplitudes = [positive(x, "受迫振幅") for x in data["amplitude"]]
    for i, phase in enumerate(data["phase"], 1):
        if not 0 <= phase <= 360:
            raise ValueError(f"第 {i} 个相位差应在 0 至 360 度之间")
    for i, value in enumerate(drive, 1):
        fields[f"frequency_ratio_{i:02d}"] = fmt(t0/value)
    fields["damped_graph_points"] = coordinates([(i, peak) for i, peak in enumerate(peaks, 1)])
    fields["amplitude_graph_points"] = coordinates([(t0/t, amplitude) for t, amplitude in zip(drive, amplitudes)])
    fields["phase_graph_points"] = coordinates([(t0/t, phase) for t, phase in zip(drive, data["phase"])])
    peak_index = max(range(len(amplitudes)), key=lambda i: amplitudes[i])
    put(fields, free_period_mean_s=t0, natural_omega_rad_s=omega,
        damping_beta_s_inv=beta, peak_amplitude_deg=amplitudes[peak_index],
        resonance_period_s=drive[peak_index])
    free_u = sem(free)
    finish_pair(fields, "free_period_mean_s", "free_period_u_s", t0, free_u)
    finish_pair(fields, "natural_omega_rad_s", "natural_omega_u_rad_s",
                omega, omega*free_u/t0)
    finish_pair(fields, "damping_beta_s_inv", "damping_beta_u_s_inv",
                beta, sem(beta_samples))


def lens(fields, data, p):
    del p
    focus: dict[str, list[Decimal]] = {name: [] for name in ("single", "bessel", "auto", "concave")}
    for i, (u, v) in enumerate(zip(data["object_distance"], data["image_distance"]), 1):
        positive(u, "物距"); positive(v, "像距")
        value = u*v/(u+v)
        focus["single"].append(value)
        fields[f"single_focus_{i:02d}"] = fmt(value)
    for i, (length, separation) in enumerate(zip(data["bessel_length"], data["bessel_separation"]), 1):
        positive(length, "物屏间距"); nonnegative(separation, "共轭位置间距")
        if separation >= length:
            raise ValueError("共轭位置间距必须小于物屏间距")
        value = (length**2-separation**2)/(4*length)
        focus["bessel"].append(value)
        fields[f"bessel_focus_{i:02d}"] = fmt(value)
    for i, (object_at, lens_at) in enumerate(zip(data["auto_object"], data["auto_lens"]), 1):
        value = abs(lens_at-object_at)
        positive(value, "自准直焦距")
        focus["auto"].append(value)
        fields[f"auto_focus_{i:02d}"] = fmt(value)
    for i, (virtual_at, lens_at, image_at) in enumerate(zip(data["concave_object"], data["concave_lens"], data["concave_image"]), 1):
        u = lens_at-virtual_at
        v = image_at-lens_at
        if u >= 0 or v <= 0 or u+v == 0:
            raise ValueError("凹透镜读数应满足虚物在透镜右侧、实像在其右侧，且距离不可使分母为零")
        value = u*v/(u+v)
        if value >= 0:
            raise ValueError("凹透镜计算所得焦距应为负值，请复核位置顺序")
        focus["concave"].append(value)
        fields[f"concave_focus_{i:02d}"] = fmt(value)
    for name, values in focus.items():
        result = finish_pair(fields, f"focus_{name}_mean_mm", f"focus_{name}_u_mm",
                             mean(values), sem(values))
        for i, value in enumerate(values, 1):
            fields[f"{name}_focus_{i:02d}"] = format_report_at_place(value, result.place)
