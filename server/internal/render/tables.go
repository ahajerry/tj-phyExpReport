package render

import (
	"fmt"
	"strings"
)

func measurementTables(freeCount, trialCount, forcedCount int) map[string]string {
	field := func(k string, i int) string { return fmt.Sprintf(`\Field[8mm]{%s_%02d}`, k, i) }
	free, damped := []string{}, []string{}
	for start := 1; start <= freeCount; start += 10 {
		end := start + 10
		if end > freeCount+1 {
			end = freeCount + 1
		}
		a, b := []string{`振幅 $\theta$/°`}, []string{`周期 $T_0$/s`}
		for i := start; i < end; i++ {
			a = append(a, field("free_angle", i))
			b = append(b, field("free_period", i))
		}
		free = append(free, strings.Join([]string{`\begin{center}\small\renewcommand{\arraystretch}{1.35}`, `\begin{adjustbox}{max width=\textwidth}`, `\begin{tabular}{|c|` + strings.Repeat("c|", end-start) + `}\hline`, strings.Join(a, " & ") + `\\\hline`, strings.Join(b, " & ") + `\\\hline`, `\end{tabular}\end{adjustbox}\end{center}`}, "\n"))
	}
	for trial := 0; trial < trialCount; trial++ {
		body := []string{}
		for i := 1; i <= 5; i++ {
			body = append(body, strings.Join([]string{fmt.Sprint(i), field("damped_peak", trial*10+i), fmt.Sprint(i + 5), field("damped_peak", trial*10+i+5), field("damped_log_ratio", trial*5+i)}, " & ")+`\\\hline`)
		}
		damped = append(damped, strings.Join([]string{`\Needspace{13\baselineskip}`, fmt.Sprintf(`第 %d 组\quad 阻尼档位：\Field{damping_setting}`, trial+1), `\begin{center}\small\renewcommand{\arraystretch}{1.35}`, `\begin{tabular}{|c|c|c|c|c|}\hline`, `次数 & 振幅 $\theta_i$/° & 次数 & 振幅 $\theta_{i+5}$/° & $\ln(\theta_i/\theta_{i+5})$\\\hline`, strings.Join(body, "\n"), `\multicolumn{4}{|c|}{$\overline{\ln(\theta_i/\theta_{i+5})}$} & ` + field("damped_log_mean", trial+1) + `\\\hline`, `\end{tabular}\end{center}`, `$10T=` + field("damped_time_10", trial+1) + `\,\mathrm{s}$，$\bar T=` + field("damped_period", trial+1) + `\,\mathrm{s}$，$\beta=` + field("damped_beta", trial+1) + `\,\mathrm{s^{-1}}$。\par`}, "\n"))
	}
	header := `\shortstack{强迫力矩周期\\$10T$/s} & \shortstack{相位差\\$\varphi$/°} & \shortstack{摆轮振幅\\$\theta$/°} & $\dfrac{\omega}{\omega_r}=\dfrac{T_r}{T}$ & $(\theta/\theta_r)^2$ & \shortstack{理论相位\\$\varphi_m$/°}\\\hline`
	rows := []string{}
	for i := 1; i <= forcedCount; i++ {
		cells := []string{}
		for _, k := range []string{"table_drive_time_10", "table_signed_phase", "amplitude", "table_frequency_ratio", "table_amplitude_ratio", "table_signed_theory"} {
			cells = append(cells, field(k, i))
		}
		rows = append(rows, strings.Join(cells, " & ")+`\\\hline`)
	}
	forced := strings.Join([]string{`{\small\renewcommand{\arraystretch}{1.25}\setlength{\tabcolsep}{3pt}`, `\begin{longtable}{|*{6}{>{\centering\arraybackslash}p{2.1cm}|}}\hline`, header, `\endfirsthead\hline`, header, `\endhead`, strings.Join(rows, "\n"), `\end{longtable}}`}, "\n")
	return map[string]string{"FREE": strings.Join(free, "\n"), "DAMPED": strings.Join(damped, "\n\n"), "FORCED": forced}
}
