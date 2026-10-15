"""Physical calculations for the six newly connected experiments.

Input units follow the labels on the corresponding LaTeX data tables.
"""

from __future__ import annotations

from decimal import Decimal
from math import atan2, degrees, log, pi, sqrt

try:
    from .structured_report import fmt, mean, sem
    from .result_precision import finish_report_result, format_report_at_place, format_uncertainty
except ImportError:
    from structured_report import fmt, mean, sem
    from result_precision import finish_report_result, format_report_at_place, format_uncertainty

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

    def inertia_u(period: Decimal, uncertainty: Decimal, *, standard: bool = False,
                  uses_disk: bool = False) -> Decimal:
        if standard:
            return Decimal(0)  # 标定圆柱的计时贡献与自身的标准值相消。
        if not uses_disk:
            # 木球、细杆及滑块组合直接安装在转轴上，不扣除载物盘。
            measured = i1*period**2/difference
            return ((2*i1*period*uncertainty/difference)**2
                    + (measured*kappa_u/kappa)**2).sqrt()
        numerator = period**2-t0**2
        return ((2*i1*period*uncertainty/difference)**2
                + (2*i1*t0*(period**2-t1**2)*u0/difference**2)**2
                + (2*i1*t1*numerator*u1/difference**2)**2).sqrt()

    for key, expected in theory.items():
        uses_disk = key in ("cylinder", "tube")
        measured = i1*(periods[key]**2-(t0**2 if uses_disk else 0))/difference
        measured_u = inertia_u(periods[key], period_u[key], standard=key == "cylinder",
                               uses_disk=uses_disk)
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
        measured = i1*period**2/difference
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
    nonnegative(p["preload_kg"], "预载质量")
    positions = []
    for i, (up, down) in enumerate(zip(data["load_up"], data["load_down"]), 1):
        position = (up+down)/2
        positions.append(position)
        fields[f"load_mean_{i:02d}"] = fmt(position)
        fields[f"load_mass_{i:02d}"] = fmt((i-1)*p["mass_step_kg"])
    displacements = [abs(x - positions[0]) for x in positions]
    if any(b <= a for a, b in zip(displacements, displacements[1:])):
        raise ValueError("标尺位移应随载荷严格增大，请检查加载、卸载读数的级数顺序")
    for i, value in enumerate(displacements, 1):
        fields[f"load_displacement_{i:02d}"] = fmt(value)
    differences = [abs(positions[i+5]-positions[i]) for i in range(5)]
    for i, value in enumerate(differences):
        fields[f"load_difference_{i:02d}"] = fmt(value)
    l = positive(mean(differences), "五级逐差位移") / 100
    for value in data["diameter"]:
        positive(value, "金属丝直径（末读数减初读数）")
    d = positive(mean(data["diameter"]), "金属丝直径") / 1000
    length = positive(p["wire_length_cm"], "金属丝长度") / 100
    distance = positive(p["mirror_distance_cm"], "镜尺距离") / 100
    arm = positive(p["lever_arm_cm"], "光杠杆臂长") / 100
    step = positive(p["mass_step_kg"], "每级质量增量")
    gravity = positive(p["gravity_ms2"], "重力加速度")
    positive(p["reference_modulus_pa"], "参考模量")
    result = 8*length*distance*gravity*(5*step)/(PI*d*d*arm*l)
    # The supplied handout uses 1.14 * SEM and instrument limits / sqrt(3).
    d_a = Decimal("1.14") * sem(data["diameter"])
    d_b = nonnegative(p["diameter_error_mm"], "测微计仪器误差") / Decimal(3).sqrt()
    d_u = (d_a*d_a + d_b*d_b).sqrt()
    l_a = Decimal("1.14") * sem(differences)
    l_b = nonnegative(p["scale_error_cm"], "逐差位移仪器误差") / Decimal(3).sqrt()
    l_u = (l_a*l_a + l_b*l_b).sqrt()
    rd, rl = d_u / mean(data["diameter"]), l_u / mean(differences)
    rlength = Decimal("0.1") / p["wire_length_cm"]
    rdistance = Decimal("0.2") / p["mirror_distance_cm"]
    rarm = Decimal("0.02") / p["lever_arm_cm"]
    relative = (rlength**2 + rdistance**2 + rarm**2 + 4*rd**2 + rl**2).sqrt()
    d_squares = [(x-mean(data["diameter"]))**2 for x in data["diameter"]]
    l_squares = [(x-mean(differences))**2 for x in differences]
    for i, (value, square) in enumerate(zip(data["diameter"], d_squares), 1):
        fields[f"diameter_{i:02d}"] = fmt(value)
        fields[f"diameter_square_{i:02d}"] = format(square*Decimal("1e6"), "f")
    for i, square in enumerate(l_squares):
        fields[f"difference_square_{i:02d}"] = fmt(square)
    put(fields, diameter_square_sum=sum(d_squares)*Decimal("1e6"),
        difference_square_sum=sum(l_squares), diameter_u_a=d_a, diameter_u_b=d_b,
        difference_u_a=l_a, difference_u_b=l_b,
        diameter_relative_percent=rd*100, difference_relative_percent=rl*100,
        length_relative_percent=rlength*100, distance_relative_percent=rdistance*100,
        arm_relative_percent=rarm*100, young_relative_percent=relative*100,
        difference_mass_kg=5*step, difference_slope_kg_cm=5*step/mean(differences))
    fields["diameter_square_sum"] = format(sum(d_squares)*Decimal("1e6"), "f")
    # Straight line in m-l coordinates, using all ten averages. A/B are on the
    # line at 10%/90% of its span, distinct from the measured point symbols.
    masses = [i*step for i in range(10)]
    xbar, ybar = mean(displacements), mean(masses)
    sxx = sum((x-xbar)**2 for x in displacements)
    slope = positive(sum((x-xbar)*(y-ybar) for x, y in zip(displacements, masses))/sxx,
                     "图解法斜率")
    intercept = ybar-slope*xbar
    a = min(displacements) + (max(displacements)-min(displacements))*Decimal("0.1")
    b = min(displacements) + (max(displacements)-min(displacements))*Decimal("0.9")
    ay, by = intercept+slope*a, intercept+slope*b
    graph_result = 8*length*distance*gravity/(PI*d*d*arm)*slope*100
    fields["young_graph_points"] = coordinates(list(zip(displacements, masses)))
    fields["young_graph_line"] = coordinates([(min(displacements), intercept+slope*min(displacements)),
                                              (max(displacements), intercept+slope*max(displacements))])
    fields["young_graph_a"] = coordinates([(a, ay)])
    fields["young_graph_b"] = coordinates([(b, by)])
    put(fields, graph_a_l=a, graph_a_m=ay, graph_b_l=b, graph_b_m=by,
        graph_slope_kg_cm=(by-ay)/(b-a),
        young_graph_modulus_pa=graph_result,
        young_graph_error_percent=abs(graph_result-p["reference_modulus_pa"])/p["reference_modulus_pa"]*100)
    put(fields, diameter_mean_mm=mean(data["diameter"]), difference_mean_cm=mean(differences),
        young_modulus_pa=result, young_uncertainty_pa=result*relative,
        young_error_percent=abs(result-p["reference_modulus_pa"])/p["reference_modulus_pa"]*100)
    finish_pair(fields, "diameter_mean_mm", "diameter_mean_u_mm",
                mean(data["diameter"]), d_u)
    difference_result = finish_pair(fields, "difference_mean_cm", "difference_mean_u_cm",
                                    mean(differences), l_u)
    for i, value in enumerate(differences):
        fields[f"load_difference_{i:02d}"] = format_report_at_place(value, difference_result.place)
    finish_pair(fields, "young_modulus_pa", "young_uncertainty_pa", result, result*relative)
    fields["young_error_percent"] = finish_percent(
        abs(result-p["reference_modulus_pa"])/p["reference_modulus_pa"]*100, relative)
    for key, value in {
        "diameter_u_a": d_a, "diameter_u_b": d_b,
        "difference_u_a": l_a, "difference_u_b": l_b,
        "diameter_relative_percent": rd*100, "difference_relative_percent": rl*100,
        "length_relative_percent": rlength*100, "distance_relative_percent": rdistance*100,
        "arm_relative_percent": rarm*100, "young_relative_percent": relative*100,
    }.items():
        fields[key] = format_uncertainty(value)
    fields["young_graph_modulus_pa"] = finish_report_result(graph_result, graph_result*relative).value
    fields["young_graph_error_percent"] = finish_percent(
        abs(graph_result-p["reference_modulus_pa"])/p["reference_modulus_pa"]*100, relative)
    fields["graph_slope_kg_cm"] = finish_report_result(slope, slope*rl).value
    difference_slope = 5*step/mean(differences)
    fields["difference_slope_kg_cm"] = finish_report_result(difference_slope, difference_slope*rl).value
    for key, source, uncertainty in (
        ("length_result_cm", "wire_length_cm", "0.1"),
        ("distance_result_cm", "mirror_distance_cm", "0.2"),
        ("arm_result_cm", "lever_arm_cm", "0.02"),
    ):
        fields[key] = finish_report_result(p[source], Decimal(uncertainty)).value


def resonance_period_at_amplitude(angles, periods, amplitude):
    """Average repeated angles, then interpolate within the measured range only."""
    grouped = {}
    for angle, period in zip(angles, periods):
        grouped.setdefault(angle, []).append(period)
    points = sorted((angle, mean(values)) for angle, values in grouped.items())
    for angle, period in points:
        if amplitude == angle:
            return period
    for (left, t_left), (right, t_right) in zip(points, points[1:]):
        if left < amplitude < right:
            return t_left + (t_right - t_left) * (amplitude - left) / (right - left)
    return None


def resonance_half_power(drive, amplitudes):
    """Interpolate the nearest half-power crossings on both sides of the peak.

    Work in angular frequency (not period or normalized frequency). Average
    repeated frequencies before interpolation and never extrapolate a crossing.
    """
    peak = max(amplitudes)
    grouped = {}
    for period, amplitude in zip(drive, amplitudes):
        grouped.setdefault(2 * PI / period, []).append((amplitude / peak) ** 2)
    points = sorted((omega, mean(values)) for omega, values in grouped.items())
    center = max(range(len(points)), key=lambda i: points[i][1])
    half = Decimal('0.5')

    def crossing(side):
        for (x0, y0), (x1, y1) in zip(side, side[1:]):
            if y0 >= half and y1 <= half:
                return x1 if y1 == half else x0 + (half - y0) * (x1 - x0) / (y1 - y0)
        return None

    left = crossing(list(reversed(points[:center + 1])))
    right = crossing(points[center:])
    return left, right


def resonance(fields, data, p):
    del p
    free = [positive(x, "自由振动周期") for x in data["free_period"]]
    if any(angle <= 0 for angle in data["free_angle"]):
        raise ValueError("自由振动角度必须为正数")
    damped_periods = [positive(value, "阻尼振动周期") for value in data["damped_period"]]
    peaks = [positive(x, "阻尼峰值") for x in data["damped_peak"]]
    beta_samples = [Decimal(str(log(float(peaks[trial*10+i]/peaks[trial*10+i+5]))))/(5*period)
                    for trial, period in enumerate(damped_periods) for i in range(5)]
    trial_betas = [mean(beta_samples[i:i+5]) for i in range(0, len(beta_samples), 5)]
    for trial, period in enumerate(damped_periods):
        fields[f"damped_time_10_{trial+1:02d}"] = format(period * 10, ".4f")
        fields[f"damped_log_mean_{trial+1:02d}"] = format(trial_betas[trial] * 5 * period, ".5f")
        fields[f"damped_beta_{trial+1:02d}"] = fmt(trial_betas[trial])
        for i in range(5):
            fields[f"damped_log_ratio_{trial*5+i+1:02d}"] = format(beta_samples[trial*5+i]*5*period, ".4f")
    beta = mean(trial_betas)
    if beta <= 0:
        raise ValueError("阻尼峰值总体应随时间衰减")
    drive = [positive(x, "驱动周期") for x in data["drive_period"]]
    amplitudes = [positive(x, "受迫振幅") for x in data["amplitude"]]
    for i, phase in enumerate(data["phase"], 1):
        if not 0 <= phase <= 180:
            raise ValueError(f"第 {i} 个相位滞后角读数应在 0 至 180 度之间")
    peak = max(amplitudes)
    peak_periods = [t for t, amplitude in zip(drive, amplitudes) if amplitude == peak]
    tr = mean(peak_periods)
    missing = 0
    for i, (value, amplitude, reading) in enumerate(zip(drive, amplitudes, data["phase"]), 1):
        fields[f"frequency_ratio_{i:02d}"] = fmt(tr/value)
        fields[f"normalized_amplitude_{i:02d}"] = fmt((amplitude/peak)**2)
        fields[f"table_drive_period_{i:02d}"] = format(value, ".4f")
        fields[f"table_drive_time_10_{i:02d}"] = format(value * 10, ".4f")
        fields[f"table_phase_reading_{i:02d}"] = format(reading, ".1f")
        fields[f"table_signed_phase_{i:02d}"] = format(-reading if reading else Decimal(0), ".1f")
        fields[f"table_frequency_ratio_{i:02d}"] = format(tr/value, ".4f")
        fields[f"table_amplitude_ratio_{i:02d}"] = format((amplitude/peak)**2, ".4f")
        fields[f"signed_phase_{i:02d}"] = fmt(-reading)
        t0 = resonance_period_at_amplitude(data["free_angle"], free, amplitude)
        if t0 is None:
            missing += 1
            fields[f"table_phase_calculated_{i:02d}"] = "需补测"
            fields[f"table_signed_theory_{i:02d}"] = "需补测"
            for key in ("matched_period", "matched_omega", "theoretical_phase", "phase_residual"):
                fields[f"{key}_{i:02d}"] = "需补测"
            continue
        omega0, omega = 2*PI/t0, 2*PI/value
        phi = Decimal(str(-degrees(atan2(float(2*beta*omega), float(omega0**2-omega**2)))))
        fields[f"table_phase_calculated_{i:02d}"] = format(abs(phi), ".1f")
        fields[f"table_signed_theory_{i:02d}"] = format(phi, ".1f")
        for key, result in (("matched_period", t0), ("matched_omega", omega0),
                            ("theoretical_phase", phi), ("phase_residual", -reading-phi)):
            fields[f"{key}_{i:02d}"] = fmt(result)
    graph_peaks = [mean(peaks[i::10]) for i in range(10)]
    fields["damped_graph_points"] = coordinates([(i, peak) for i, peak in enumerate(graph_peaks, 1)])
    fields["amplitude_graph_points"] = coordinates([(tr/t, amplitude) for t, amplitude in zip(drive, amplitudes)])
    fields["normalized_amplitude_graph_points"] = coordinates([(tr/t, (amplitude/peak)**2) for t, amplitude in zip(drive, amplitudes)])
    fields["phase_magnitude_graph_points"] = coordinates([(tr/t, phase) for t, phase in zip(drive, data["phase"])])
    fields["phase_graph_points"] = coordinates([(tr/t, -phase) for t, phase in zip(drive, data["phase"])])
    # Report curves must follow increasing frequency even for unsorted imports.
    fields["normalized_amplitude_graph_points"] = coordinates(sorted(
        [(tr/t, (amplitude/peak)**2) for t, amplitude in zip(drive, amplitudes)]))
    fields["phase_graph_points"] = coordinates(sorted(
        [(tr/t, -phase) for t, phase in zip(drive, data["phase"])]))
    fields["half_power_line_points"] = coordinates([
        (min(tr/t for t in drive), Decimal('0.5')),
        (max(tr/t for t in drive), Decimal('0.5'))])
    left, right = resonance_half_power(drive, amplitudes)
    for key, value in (("half_power_omega_1", left), ("half_power_omega_2", right)):
        fields[key] = fmt(value) if value is not None else "需补测"
    if left is not None and right is not None and right > left:
        graph_beta = (right - left) / 2
        fields["graph_beta_s_inv"] = fmt(graph_beta)
        fields["graph_beta_difference_percent"] = format(abs(graph_beta - beta) / beta * 100, ".2f")
        fields["graph_beta_note"] = "在实测归一化振幅平方曲线的峰值两侧，对相邻测量点作线性内插，确定半峰高交点。该方法适用于小阻尼及共振附近。"
    else:
        fields["graph_beta_s_inv"] = fields["graph_beta_difference_percent"] = "需补测"
        fields["graph_beta_note"] = "实测曲线未覆盖峰值两侧的半峰高交点，需扩大测量范围或加密共振附近测点；不外推计算作图法阻尼系数。"
    put(fields, free_period_mean_s=mean(free), peak_amplitude_deg=peak,
        resonance_period_s=tr, resonance_omega_rad_s=2*PI/tr, peak_point_count=len(peak_periods))
    peak_t0 = resonance_period_at_amplitude(data["free_angle"], free, peak)
    theory_radicand = (2*PI/peak_t0)**2-2*beta**2 if peak_t0 is not None else None
    fields["theoretical_resonance_omega_rad_s"] = (
        fmt(theory_radicand.sqrt()) if theory_radicand is not None and theory_radicand > 0 else "不适用")
    fields["matched_period_peak_s"] = fmt(peak_t0) if peak_t0 is not None else "需补测"
    fields["phase_coverage_note"] = (f"有 {missing} 个受迫振幅超出自由振动测量范围，需补测对应振幅的自由周期；这些点不计算理论相位。"
                                     if missing else "全部受迫振幅均在自由振动测量范围内，已完成查表或线性内插。")
    fields["beta_trial_summary"] = "；".join(f"第 {i} 组：{fmt(value)}" for i, value in enumerate(trial_betas, 1))
    fields["beta_uncertainty_note"] = (
        "本次按各组阻尼系数的均值标准误计算，仅表示组间统计分散。" if len(trial_betas) > 1 else
        "本次只有一组阻尼测量，按该组五个逐差估计值的均值标准误计算，仅表示组内统计分散。")
    finish_pair(fields, "damping_beta_s_inv", "damping_beta_u_s_inv",
                beta, sem(trial_betas if len(trial_betas) > 1 else beta_samples))


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
    for i, (virtual_at, lens_at, image_at) in enumerate(zip(data.get("concave_object", []), data.get("concave_lens", []), data.get("concave_image", [])), 1):
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
        if not values:
            continue
        result = finish_pair(fields, f"focus_{name}_mean_mm", f"focus_{name}_u_mm",
                             mean(values), sem(values))
        for i, value in enumerate(values, 1):
            fields[f"{name}_focus_{i:02d}"] = format_report_at_place(value, result.place)
