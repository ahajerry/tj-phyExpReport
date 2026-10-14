"""Reference-table layouts shared by the blank template and generated reports."""


def measurement_tables(free_count=10, trial_count=1, forced_count=15):
    def field(key, index):
        return rf"\Field[8mm]{{{key}_{index:02d}}}"

    free = []
    for start in range(1, free_count + 1, 10):
        indices = range(start, min(start + 10, free_count + 1))
        free.append("\n".join((
            r"\begin{center}\small\renewcommand{\arraystretch}{1.35}",
            r"\begin{adjustbox}{max width=\textwidth}",
            r"\begin{tabular}{|c|" + "c|" * len(indices) + r"}\hline",
            " & ".join([r"振幅 $\theta$/°"] + [field("free_angle", i) for i in indices]) + r"\\\hline",
            " & ".join(["周期 $T_0$/s"] + [field("free_period", i) for i in indices]) + r"\\\hline",
            r"\end{tabular}\end{adjustbox}\end{center}")))

    damped = []
    for trial in range(trial_count):
        body = "\n".join(" & ".join([str(i), field("damped_peak", trial * 10 + i), str(i + 5),
            field("damped_peak", trial * 10 + i + 5), field("damped_log_ratio", trial * 5 + i)])
            + r"\\\hline" for i in range(1, 6))
        damped.append("\n".join((
            r"\Needspace{13\baselineskip}",
            rf"第 {trial+1} 组\quad 阻尼档位：\Field{{damping_setting}}",
            r"\begin{center}\small\renewcommand{\arraystretch}{1.35}",
            r"\begin{tabular}{|c|c|c|c|c|}\hline",
            r"次数 & 振幅 $\theta_i$/° & 次数 & 振幅 $\theta_{i+5}$/° & $\ln(\theta_i/\theta_{i+5})$\\\hline",
            body,
            r"\multicolumn{4}{|c|}{$\overline{\ln(\theta_i/\theta_{i+5})}$} & "
                + field("damped_log_mean", trial + 1) + r"\\\hline",
            r"\end{tabular}\end{center}",
            "$10T=" + field("damped_time_10", trial + 1) + r"\,\mathrm{s}$，$\bar T="
                + field("damped_period", trial + 1) + r"\,\mathrm{s}$，$\beta="
                + field("damped_beta", trial + 1) + r"\,\mathrm{s^{-1}}$。\par")))

    headers = (r"\shortstack{强迫力矩周期\\$10T$/s} & \shortstack{相位差\\$\varphi$/°} & "
               r"\shortstack{摆轮振幅\\$\theta$/°} & $\dfrac{\omega}{\omega_r}=\dfrac{T_r}{T}$ & "
               r"$(\theta/\theta_r)^2$ & \shortstack{理论相位\\$\varphi_m$/°}\\\hline")
    rows = "\n".join(" & ".join(field(key, i) for key in (
        "table_drive_time_10", "table_signed_phase", "amplitude", "table_frequency_ratio",
        "table_amplitude_ratio", "table_signed_theory")) + r"\\\hline" for i in range(1, forced_count + 1))
    forced = "\n".join((r"{\small\renewcommand{\arraystretch}{1.25}\setlength{\tabcolsep}{3pt}",
        r"\begin{longtable}{|*{6}{>{\centering\arraybackslash}p{2.1cm}|}}\hline",
        headers, r"\endfirsthead\hline", headers, r"\endhead", rows, r"\end{longtable}}"))
    return {"FREE": "\n".join(free), "DAMPED": "\n\n".join(damped), "FORCED": forced}
