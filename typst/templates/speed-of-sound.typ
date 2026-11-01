#import "base.typ": *
#import "charts.typ": *
#let sound-field(key, width: 1.7cm) = box(width: width, inset: 0pt, stroke: (bottom: 0.4*tpt), align(center, text(report.fields.at(key, default: ""))))
#show: report-layout

#cover()

#section[实验目的]

1\. 了解压电换能器的原理与功能。

2\. 掌握用示波器观察驻波及振动合成实验现象。

3\. 掌握用共振干涉法与相位比较法测定波长。

4\. 测定室温下空气中的声速。

5\. 培养综合使用仪器的能力。

6\. 练习用逐差法处理实验数据。

#section[实验原理]

声音传播的行为与传播介质相关，通常受以下三个因素影响：

1\. 介质的密度与压力。受温度影响的这种关系决定了介质中声音的速度。

2\. 声波传播也受到介质本身运动的影响。如果介质正在移动，则声速随之改变。

3\. 介质的黏度也会影响声波的运动，它决定声音衰减的速率。对于许多介质，例如空气或水，由于黏度引起的衰减可以忽略不计。本次实验介质为空气，其造成的衰减忽略不计。

通常有两种方式测定声速。一种是根据位移与速度关系，测出声波传播路程 $L$ 所需的时间 $t$，进而计算声速 $v = L slash t$；这也是在实际工程中应用最广泛的一种方法。另一种是根据频率 $f$ 和波长 $lambda$ 计算：

$ v = f lambda . $

本实验使用后一种方法，分别通过共振干涉法（驻波法）与相位比较法确定波长。相邻幅度极大位置或相邻同相位直线位置的间距均为半波长。连续测量 20 个位置后，按原文的逐差关系计算：

$ lambda _(i) = frac(l _(i + 10) - l _(i), 5) , quad quad i = 1 , dots.h , 10. $

以平均室温 $overline(t)$（摄氏度）估算干燥空气中的理论声速：$v _(upright("th")) = 331 sqrt(1 + overline(t) slash 273) thin upright(m slash s)$。

#section[实验内容]

#subsection[预备实验：数字示波器观测相位差]

1\. 调整示波器，显示合适的信号波形。

2\. 观察并绘制相位差为 $0 ^(degree)$、$90 ^(degree)$、$180 ^(degree)$、$270 ^(degree)$、$360 ^(degree)$ 时的李萨如图形。

#subsection[共振干涉法]

1\. 调整实验装置：将压电陶瓷换能器 $S _(1)$ 信号端口与低频信号发生器输出相连接，$S _(2)$ 信号端口连接至示波器 CH1 通道输入端。将 $S _(2)$ 移至 $S _(1)$ 附近，两者尽量靠近但不能相互接触，并调整两个端面平行。打开示波器和低频信号发生器，将后者频率设为 $35000 thin upright("Hz")$。

2\. 缓慢调整信号发生器频率，同时观察示波器显示的 $S _(2)$ 输出信号；当幅度达到最大值时，信号频率与压电换能器的固有频率匹配。

3\. 缓慢右移 $S _(2)$，逐渐远离 $S _(1)$，同时观察示波器显示的信号幅度变化。用游标卡尺读出信号幅度极大值对应的 $S _(2)$ 位置 $l _(i)$，继续移动 $S _(2)$，连续读出 20 个相邻的幅度极大位置，再用逐差法计算波长。

#subsection[相位比较法]

1\. 将信号发生器的输出分别接 $S _(1)$ 和示波器 CH2 通道，将 $S _(2)$ 信号端口接示波器 CH1 通道。把示波器显示模式调为 X--Y，并按上述方法调整频率与换能器固有频率匹配。

2\. 缓慢右移 $S _(2)$，逐渐远离 $S _(1)$。当示波器显示的李萨如图形为一特定角度的直线时，记录 $S _(2)$ 的位置 $l _(i)$；继续移动 $S _(2)$，连续读出 20 个相邻的直线位置，再用逐差法计算波长。

#section[实验仪器]

低频信号发生器、数字示波器、声速测定装置（含游标卡尺）。

#section[数据记录处理]

#subsection[共振干涉法]

开始时室温 $t _(1) = #sound-field("res_t_start", width: 1.2cm) thin degree upright(C)$，结束时室温 $t _(2) = #sound-field("res_t_end", width: 1.2cm) thin degree upright(C)$，平均室温 $overline(t) = #sound-field("res_t_avg", width: 1.2cm) thin degree upright(C)$。

信号频率 $f = #sound-field("res_frequency", width: 1.5cm) thin upright("Hz")$，频率误差 $Delta _(f) = #sound-field("res_frequency_error", width: 1.4cm) thin upright("Hz")$。

#report-table(columns: (auto, auto, auto, auto,), size: 9*tpt, rules: "booktabs", stretch: 1.2,
  header: (table.cell(x: 0, y: 0)[$i$], table.cell(x: 1, y: 0)[$l _(i) slash upright("mm")$], table.cell(x: 2, y: 0)[$l _(i + 10) slash upright("mm")$], table.cell(x: 3, y: 0)[$lambda _(i) = ( l _(i + 10) - l _(i) ) slash 5 med slash upright("mm")$],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#sound-field("res_l01", width: 1.35cm)], table.cell(x: 2, y: 1)[#sound-field("res_l11", width: 1.35cm)], table.cell(x: 3, y: 1)[#sound-field("res_lambda01", width: 1.35cm)],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#sound-field("res_l02", width: 1.35cm)], table.cell(x: 2, y: 2)[#sound-field("res_l12", width: 1.35cm)], table.cell(x: 3, y: 2)[#sound-field("res_lambda02", width: 1.35cm)],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#sound-field("res_l03", width: 1.35cm)], table.cell(x: 2, y: 3)[#sound-field("res_l13", width: 1.35cm)], table.cell(x: 3, y: 3)[#sound-field("res_lambda03", width: 1.35cm)],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[#sound-field("res_l04", width: 1.35cm)], table.cell(x: 2, y: 4)[#sound-field("res_l14", width: 1.35cm)], table.cell(x: 3, y: 4)[#sound-field("res_lambda04", width: 1.35cm)],),
    (table.cell(x: 0, y: 5)[5], table.cell(x: 1, y: 5)[#sound-field("res_l05", width: 1.35cm)], table.cell(x: 2, y: 5)[#sound-field("res_l15", width: 1.35cm)], table.cell(x: 3, y: 5)[#sound-field("res_lambda05", width: 1.35cm)],),
    (table.cell(x: 0, y: 6)[6], table.cell(x: 1, y: 6)[#sound-field("res_l06", width: 1.35cm)], table.cell(x: 2, y: 6)[#sound-field("res_l16", width: 1.35cm)], table.cell(x: 3, y: 6)[#sound-field("res_lambda06", width: 1.35cm)],),
    (table.cell(x: 0, y: 7)[7], table.cell(x: 1, y: 7)[#sound-field("res_l07", width: 1.35cm)], table.cell(x: 2, y: 7)[#sound-field("res_l17", width: 1.35cm)], table.cell(x: 3, y: 7)[#sound-field("res_lambda07", width: 1.35cm)],),
    (table.cell(x: 0, y: 8)[8], table.cell(x: 1, y: 8)[#sound-field("res_l08", width: 1.35cm)], table.cell(x: 2, y: 8)[#sound-field("res_l18", width: 1.35cm)], table.cell(x: 3, y: 8)[#sound-field("res_lambda08", width: 1.35cm)],),
    (table.cell(x: 0, y: 9)[9], table.cell(x: 1, y: 9)[#sound-field("res_l09", width: 1.35cm)], table.cell(x: 2, y: 9)[#sound-field("res_l19", width: 1.35cm)], table.cell(x: 3, y: 9)[#sound-field("res_lambda09", width: 1.35cm)],),
    (table.cell(x: 0, y: 10)[10], table.cell(x: 1, y: 10)[#sound-field("res_l10", width: 1.35cm)], table.cell(x: 2, y: 10)[#sound-field("res_l20", width: 1.35cm)], table.cell(x: 3, y: 10)[#sound-field("res_lambda10", width: 1.35cm)],),
  ))

平均波长 $overline(lambda) = #sound-field("res_lambda_avg", width: 1.5cm) thin upright("mm")$；不确定度按下式计算。

$ U _(A , lambda) & = sqrt(frac(sum _(i = 1) ^(n) ( lambda _(i) - overline(lambda) ) ^(2), n ( n - 1 ))) = #sound-field("res_u_a", width: 1.4cm) thin upright("mm") , \  U _(B , lambda) & = frac(Delta _(l), sqrt(3)) = #sound-field("res_u_b", width: 1.4cm) thin upright("mm") , \  U _(lambda) & = sqrt(U _(A , lambda) ^(2) + U _(B , lambda) ^(2)) = #sound-field("res_u_lambda", width: 1.4cm) thin upright("mm") , quad quad U _(r lambda) = frac(U _(lambda), overline(lambda)) = #sound-field("res_u_r_lambda", width: 1.4cm) , \  U _(f) & = frac(Delta _(f), sqrt(3)) = #sound-field("res_u_f", width: 1.4cm) thin upright("Hz") , quad quad U _(r f) = frac(U _(f), f) = #sound-field("res_u_r_f", width: 1.4cm) , \  v & = 10 ^(- 3) overline(lambda) _(upright("(mm)")) f _(upright("(Hz)")) = #sound-field("res_speed", width: 1.5cm) thin upright(m slash s) , \  U _(r v) & = sqrt( ( frac(U _(lambda), overline(lambda))  ) ^(2) +  ( frac(U _(f), f)  ) ^(2)) = #sound-field("res_u_r_v", width: 1.4cm) , quad quad U _(v) = U _(r v) v = #sound-field("res_u_v", width: 1.4cm) thin upright(m slash s) . $

实验结果：$v = ( #sound-field("res_speed_result", width: 1.5cm) plus.minus #sound-field("res_u_v_result", width: 1.2cm) ) thin upright(m slash s)$。相对不确定度 $U _(r v) = #sound-field("res_u_r_v_percent", width: 1.2cm) "%"$。与理论值 $v _(upright("th")) = #sound-field("res_speed_theory", width: 1.5cm) thin upright(m slash s)$ 比较，百分差

$ E = frac(| v - v _(upright("th")) |, v _(upright("th"))) times 100 "%" = #sound-field("res_error_percent", width: 1.2cm) "%" . $

#subsection[相位比较法]

开始时室温 $t _(1) = #sound-field("phase_t_start", width: 1.2cm) thin degree upright(C)$，结束时室温 $t _(2) = #sound-field("phase_t_end", width: 1.2cm) thin degree upright(C)$，平均室温 $overline(t) = #sound-field("phase_t_avg", width: 1.2cm) thin degree upright(C)$。

信号频率 $f = #sound-field("phase_frequency", width: 1.5cm) thin upright("Hz")$，频率误差 $Delta _(f) = #sound-field("phase_frequency_error", width: 1.4cm) thin upright("Hz")$。

#report-table(columns: (auto, auto, auto, auto,), size: 9*tpt, rules: "booktabs", stretch: 1.2,
  header: (table.cell(x: 0, y: 0)[$i$], table.cell(x: 1, y: 0)[$l _(i) slash upright("mm")$], table.cell(x: 2, y: 0)[$l _(i + 10) slash upright("mm")$], table.cell(x: 3, y: 0)[$lambda _(i) = ( l _(i + 10) - l _(i) ) slash 5 med slash upright("mm")$],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#sound-field("phase_l01", width: 1.35cm)], table.cell(x: 2, y: 1)[#sound-field("phase_l11", width: 1.35cm)], table.cell(x: 3, y: 1)[#sound-field("phase_lambda01", width: 1.35cm)],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#sound-field("phase_l02", width: 1.35cm)], table.cell(x: 2, y: 2)[#sound-field("phase_l12", width: 1.35cm)], table.cell(x: 3, y: 2)[#sound-field("phase_lambda02", width: 1.35cm)],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#sound-field("phase_l03", width: 1.35cm)], table.cell(x: 2, y: 3)[#sound-field("phase_l13", width: 1.35cm)], table.cell(x: 3, y: 3)[#sound-field("phase_lambda03", width: 1.35cm)],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[#sound-field("phase_l04", width: 1.35cm)], table.cell(x: 2, y: 4)[#sound-field("phase_l14", width: 1.35cm)], table.cell(x: 3, y: 4)[#sound-field("phase_lambda04", width: 1.35cm)],),
    (table.cell(x: 0, y: 5)[5], table.cell(x: 1, y: 5)[#sound-field("phase_l05", width: 1.35cm)], table.cell(x: 2, y: 5)[#sound-field("phase_l15", width: 1.35cm)], table.cell(x: 3, y: 5)[#sound-field("phase_lambda05", width: 1.35cm)],),
    (table.cell(x: 0, y: 6)[6], table.cell(x: 1, y: 6)[#sound-field("phase_l06", width: 1.35cm)], table.cell(x: 2, y: 6)[#sound-field("phase_l16", width: 1.35cm)], table.cell(x: 3, y: 6)[#sound-field("phase_lambda06", width: 1.35cm)],),
    (table.cell(x: 0, y: 7)[7], table.cell(x: 1, y: 7)[#sound-field("phase_l07", width: 1.35cm)], table.cell(x: 2, y: 7)[#sound-field("phase_l17", width: 1.35cm)], table.cell(x: 3, y: 7)[#sound-field("phase_lambda07", width: 1.35cm)],),
    (table.cell(x: 0, y: 8)[8], table.cell(x: 1, y: 8)[#sound-field("phase_l08", width: 1.35cm)], table.cell(x: 2, y: 8)[#sound-field("phase_l18", width: 1.35cm)], table.cell(x: 3, y: 8)[#sound-field("phase_lambda08", width: 1.35cm)],),
    (table.cell(x: 0, y: 9)[9], table.cell(x: 1, y: 9)[#sound-field("phase_l09", width: 1.35cm)], table.cell(x: 2, y: 9)[#sound-field("phase_l19", width: 1.35cm)], table.cell(x: 3, y: 9)[#sound-field("phase_lambda09", width: 1.35cm)],),
    (table.cell(x: 0, y: 10)[10], table.cell(x: 1, y: 10)[#sound-field("phase_l10", width: 1.35cm)], table.cell(x: 2, y: 10)[#sound-field("phase_l20", width: 1.35cm)], table.cell(x: 3, y: 10)[#sound-field("phase_lambda10", width: 1.35cm)],),
  ))

平均波长 $overline(lambda) = #sound-field("phase_lambda_avg", width: 1.5cm) thin upright("mm")$。

$ U _(A , lambda) & = sqrt(frac(sum _(i = 1) ^(n) ( lambda _(i) - overline(lambda) ) ^(2), n ( n - 1 ))) = #sound-field("phase_u_a", width: 1.4cm) thin upright("mm") , \  U _(B , lambda) & = frac(Delta _(l), sqrt(3)) = #sound-field("phase_u_b", width: 1.4cm) thin upright("mm") , \  U _(lambda) & = sqrt(U _(A , lambda) ^(2) + U _(B , lambda) ^(2)) = #sound-field("phase_u_lambda", width: 1.4cm) thin upright("mm") , quad quad U _(r lambda) = frac(U _(lambda), overline(lambda)) = #sound-field("phase_u_r_lambda", width: 1.4cm) , \  U _(f) & = frac(Delta _(f), sqrt(3)) = #sound-field("phase_u_f", width: 1.4cm) thin upright("Hz") , quad quad U _(r f) = frac(U _(f), f) = #sound-field("phase_u_r_f", width: 1.4cm) , \  v & = 10 ^(- 3) overline(lambda) _(upright("(mm)")) f _(upright("(Hz)")) = #sound-field("phase_speed", width: 1.5cm) thin upright(m slash s) , \  U _(r v) & = sqrt( ( frac(U _(lambda), overline(lambda))  ) ^(2) +  ( frac(U _(f), f)  ) ^(2)) = #sound-field("phase_u_r_v", width: 1.4cm) , quad quad U _(v) = U _(r v) v = #sound-field("phase_u_v", width: 1.4cm) thin upright(m slash s) . $

实验结果：$v = ( #sound-field("phase_speed_result", width: 1.5cm) plus.minus #sound-field("phase_u_v_result", width: 1.2cm) ) thin upright(m slash s)$。相对不确定度 $U _(r v) = #sound-field("phase_u_r_v_percent", width: 1.2cm) "%"$。与理论值 $v _(upright("th")) = #sound-field("phase_speed_theory", width: 1.5cm) thin upright(m slash s)$ 比较，百分差

$ E = frac(| v - v _(upright("th")) |, v _(upright("th"))) times 100 "%" = #sound-field("phase_error_percent", width: 1.2cm) "%" . $

#section[讨论与分析]

#subsection[两种测量方法的对比]

共振干涉法利用 $S _(1)$ 发射声波，$S _(2)$ 接收并反射，在两者之间形成驻波。移动 $S _(2)$ 并观察示波器上信号幅度的极大值，可确定对应位置。该方法物理图像直观，但极值点的判断会受到环境噪声和信号源幅度波动的影响。

相位比较法将发射信号和接收信号分别输入示波器的两个通道。当两者相位差为 $0$ 或 $pi$ 时，合成轨迹为直线。通过观察直线出现的位置确定波长；图形变化有助于判断相位状态。

#subsection[误差来源与改进]

游标卡尺的仪器误差 $Delta _(l) = #sound-field("caliper_error", width: 1.2cm) thin upright("mm")$、信号发生器的频率漂移及示波器分辨率，均可能影响测量结果。实验中应保持室温稳定，避免实验台振动，并仔细调整换能器的共轴和平行状态。可使用数显测距与自动采集、示波器光标或计算机峰值捕捉，以减少人为读数和极值判断误差。

本次测量两种方法得到的声速相差 $#sound-field("method_difference", width: 1.5cm) thin upright(m slash s)$。与各自室温下的理论值相比，#sound-field("closer_method", width: 3.0cm)的百分差较小。两法所得结果不完全一致，主要因为共振峰位置及李萨如图形成为直线的时刻需要人工判断；换能器端面不平行、环境温度变化和频率漂移也会引入系统误差。

#subsection[思考题]

为何采用逐差法？将相隔 10 个位置的读数作差，可利用较长的测量距离求波长，减弱单次位置读数误差的影响；再对 10 组结果取平均，可降低随机误差。

为何在两种方法中均需调节信号频率？使激励频率接近换能器固有频率，接收信号更明显，有利于辨认幅度极大和相位对应位置。

温度为何必须记录？空气中的声速随温度变化；记录起止温度并取平均，才能计算与测量过程对应的理论值，合理比较百分差。

#section[实验结论]

本实验利用共振干涉法和相位比较法测定空气中的声速，并用逐差法处理多组位置数据。

#report-table(columns: (auto, auto, auto, auto, auto, auto, auto,), size: 9*tpt, rules: "booktabs", stretch: 1.2,
  header: (table.cell(x: 0, y: 0)[方法], table.cell(x: 1, y: 0)[$f slash upright("Hz")$], table.cell(x: 2, y: 0)[$overline(t) slash degree upright(C)$], table.cell(x: 3, y: 0)[$overline(lambda) slash upright("mm")$], table.cell(x: 4, y: 0)[$v slash ( upright(m slash s) )$], table.cell(x: 5, y: 0)[$U _(r v) slash "%"$], table.cell(x: 6, y: 0)[$E slash "%"$],),
  rows: (
    (table.cell(x: 0, y: 1)[共振干涉法], table.cell(x: 1, y: 1)[#sound-field("res_frequency", width: 1.1cm)], table.cell(x: 2, y: 1)[#sound-field("res_t_avg", width: 1.1cm)], table.cell(x: 3, y: 1)[#sound-field("res_lambda_avg", width: 1.1cm)], table.cell(x: 4, y: 1)[#sound-field("res_speed_result", width: 1.1cm)], table.cell(x: 5, y: 1)[#sound-field("res_u_r_v_percent", width: 0.9cm)], table.cell(x: 6, y: 1)[#sound-field("res_error_percent", width: 0.9cm)],),
    (table.cell(x: 0, y: 2)[相位比较法], table.cell(x: 1, y: 2)[#sound-field("phase_frequency", width: 1.1cm)], table.cell(x: 2, y: 2)[#sound-field("phase_t_avg", width: 1.1cm)], table.cell(x: 3, y: 2)[#sound-field("phase_lambda_avg", width: 1.1cm)], table.cell(x: 4, y: 2)[#sound-field("phase_speed_result", width: 1.1cm)], table.cell(x: 5, y: 2)[#sound-field("phase_u_r_v_percent", width: 0.9cm)], table.cell(x: 6, y: 2)[#sound-field("phase_error_percent", width: 0.9cm)],),
  ))

取两种方法结果的算术平均，本实验测得当前室温下空气中的声速约为 $#sound-field("final_speed", width: 1.5cm) thin upright(m slash s)$。

#records()
