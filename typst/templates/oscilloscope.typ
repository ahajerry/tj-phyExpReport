#import "base.typ": *
#import "charts.typ": *
#show: report-layout


#cover()

#section[实验目的]

1. 了解阴极射线示波器的结构、电偏转、扫描和触发同步原理。

2. 掌握示波器校准及峰峰值、周期、频率的测量方法。

3. 观察不同波形，利用李萨如图形测量正弦信号频率。

#section[实验仪器]

ST-16 型单踪示波器、SG1001 型简易信号发生器、UTG7025B 型函数信号发生器及同轴电缆。

#section[实验原理]

#subsection[电子束偏转与波形显示]

电子枪发射的电子经加速、聚焦后轰击荧光屏。两组互相垂直的偏转板控制亮点的横、纵位移。
在小偏转近似下，位移与偏转电压成正比：$y = D _(y) U _(y)$、$x = D _(x) U _(x)$。
Y 轴输入待测信号，X 轴输入与时间成正比的锯齿扫描电压，就把电压随时间的变化展开成波形。
触发电路让每次扫描从待测信号的同一相位开始，从而稳定显示周期性波形。

#scope-diagram()

  示波器扫描与触发的简化结构。

#subsection[电压、周期与频率]

峰峰值 $U _("pp")$ 由纵向跨度 $N _(U)$ 与电压档位 $S _(y)$ 相乘得到；周期由横向跨度 $N _(T)$ 与时基档位 $S _(x)$ 相乘得到：

$ U _("pp") = K S _(y) N _(U) , quad quad T = S _(x) N _(T) , quad quad f = frac(1, T) . $

$K$ 为探头衰减倍数，同轴直连时 $K = 1$；$S _(y)$ 用 V/div，$S _(x)$ 用 ms/div，故 $T$ 用 ms，波形频率 $f _(v) = 1 / T$ 用 kHz；李萨如法频率用 kHz。
峰峰值并非峰值或有效值；仅对正弦信号有 $U _("rms") = U _("pp") / ( 2 sqrt(2) )$。

#pagebreak()

#section[实验内容与操作]

#subsection[预备调节与校准]

接通电源并预热，调节适中辉度、聚焦及 X/Y 位移，避免亮点长时间停留在同一位置。
Y 输入使用合适耦合；观察交流波形可选 AC，测直流必须选 DC。
校准时使用 X1 探头连接内置标准方波（$0.5 thin upright(V _(p p))$、$1 thin upright(k H z)$）。
将垂直档设为 $0.1 thin upright(V / d i v)$、时基设为 $0.1 thin upright(m s / d i v)$，预期峰峰跨度为 5 div、周期跨度为 10 div。
必要时调节灵敏度微调，校准后测量期间保持不变。

#subsection[四种信号波形测量]

将 SG1001 输出接示波器 Y 输入，按原始记录表顺序选择方波、正弦波、三角波、半波。
调节电压档位、时基及 LEVEL，使波形稳定且跨度尽量大，记录峰峰跨度和一个完整周期的跨度。
多周期测量时，应先把总跨度除以周期数，再填入单周期跨度。

#subsection[李萨如图形测频]

把已知频率 $f _(x)$ 的正弦信号接 X 输入，待测正弦信号接 Y 输入，切换到外接 X 或 X--Y 模式。
保持 Y 信号频率不变，改变 X 信号频率，取得四组稳定的简单闭合图形。
分别计数图形与假想水平线、垂直线的切点数，记为 $n _(x)$、$n _(y)$，不要把普通交点或曲线自交点当作切点。
记录图形草图或拍照，与切点计数一同保存在原始记录中。

#subsection[注意事项]

避免频繁开关机；测量前校准，档位切换轻缓；示波器与信号源公共地连接一致。
大幅度信号先衰减，测量前确认探头倍数；示波器内有高压，禁止自行打开外壳。

#pagebreak()

#section[数据记录与处理：波形测量]

探头倍数 $K = #f("probe_factor")$；同轴直连取 1。本报告四组数据使用同一探头倍数。
表格顺序与原始记录一致：方波、正弦波、三角波、半波；半波的周期取相邻重复结构的间隔。

#subsection[电压峰峰值]

$ U _("pp") = K S _(y) N _(U) . $

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[序号], table.cell(x: 1, y: 0)[波形], table.cell(x: 2, y: 0)[$S _(y)$/(V/div)], table.cell(x: 3, y: 0)[$N _(U)$/div], table.cell(x: 4, y: 0)[$U _("pp")$/V],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[方波], table.cell(x: 2, y: 1)[#f("voltage_scale_01")], table.cell(x: 3, y: 1)[#f("voltage_divisions_01")], table.cell(x: 4, y: 1)[#f("voltage_pp_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[正弦波], table.cell(x: 2, y: 2)[#f("voltage_scale_02")], table.cell(x: 3, y: 2)[#f("voltage_divisions_02")], table.cell(x: 4, y: 2)[#f("voltage_pp_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[三角波], table.cell(x: 2, y: 3)[#f("voltage_scale_03")], table.cell(x: 3, y: 3)[#f("voltage_divisions_03")], table.cell(x: 4, y: 3)[#f("voltage_pp_03")],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[半波], table.cell(x: 2, y: 4)[#f("voltage_scale_04")], table.cell(x: 3, y: 4)[#f("voltage_divisions_04")], table.cell(x: 4, y: 4)[#f("voltage_pp_04")],),
  ))

#subsection[周期与频率]

$ T = S _(x) N _(T) , quad quad f _(v) thin ( upright(k H z) ) = frac(1, T thin ( upright(m s) )) . $

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[序号], table.cell(x: 1, y: 0)[波形], table.cell(x: 2, y: 0)[$S _(x)$/(ms/div)], table.cell(x: 3, y: 0)[$N _(T)$/div], table.cell(x: 4, y: 0)[$T$/ms], table.cell(x: 5, y: 0)[$f _(v)$/kHz],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[方波], table.cell(x: 2, y: 1)[#f("time_scale_01")], table.cell(x: 3, y: 1)[#f("period_divisions_01")], table.cell(x: 4, y: 1)[#f("period_ms_01")], table.cell(x: 5, y: 1)[#f("frequency_khz_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[正弦波], table.cell(x: 2, y: 2)[#f("time_scale_02")], table.cell(x: 3, y: 2)[#f("period_divisions_02")], table.cell(x: 4, y: 2)[#f("period_ms_02")], table.cell(x: 5, y: 2)[#f("frequency_khz_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[三角波], table.cell(x: 2, y: 3)[#f("time_scale_03")], table.cell(x: 3, y: 3)[#f("period_divisions_03")], table.cell(x: 4, y: 3)[#f("period_ms_03")], table.cell(x: 5, y: 3)[#f("frequency_khz_03")],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[半波], table.cell(x: 2, y: 4)[#f("time_scale_04")], table.cell(x: 3, y: 4)[#f("period_divisions_04")], table.cell(x: 4, y: 4)[#f("period_ms_04")], table.cell(x: 5, y: 4)[#f("frequency_khz_04")],),
  ))

#subsection[读数与误差说明]

读取峰、谷时选取稳定轮廓，读取周期时选取相邻的同相位点。方波和脉冲的边沿有一定宽度，应保持同一读数标准。
时基和垂直微调若离开校准位置，档位标称值不能直接用于测量。
本实验未输入仪器误差限，电压与周期表仅给出由读数得到的结果；不能把显示小数位数当作仪器准确度。

#pagebreak()

#section[数据记录与处理：李萨如图形]

频率比由切点数确定：

$ frac(f _(y), f _(x)) = frac(n _(x), n _(y)) , quad quad f _(y) = frac(n _(x), n _(y)) f _(x) . $

#lissajous()

 按各组输入的切点数绘制频率比图；振幅归一化，相位取示意值，并非实测波形。

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[组次], table.cell(x: 1, y: 0)[$f _(x)$/kHz], table.cell(x: 2, y: 0)[$n _(y)$], table.cell(x: 3, y: 0)[$n _(x)$], table.cell(x: 4, y: 0)[$f _(y) : f _(x)$], table.cell(x: 5, y: 0)[$f _(y)$/kHz],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("reference_frequency_01")], table.cell(x: 2, y: 1)[#f("ny_01")], table.cell(x: 3, y: 1)[#f("nx_01")], table.cell(x: 4, y: 1)[#f("frequency_ratio_01")], table.cell(x: 5, y: 1)[#f("lissajous_frequency_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("reference_frequency_02")], table.cell(x: 2, y: 2)[#f("ny_02")], table.cell(x: 3, y: 2)[#f("nx_02")], table.cell(x: 4, y: 2)[#f("frequency_ratio_02")], table.cell(x: 5, y: 2)[#f("lissajous_frequency_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("reference_frequency_03")], table.cell(x: 2, y: 3)[#f("ny_03")], table.cell(x: 3, y: 3)[#f("nx_03")], table.cell(x: 4, y: 3)[#f("frequency_ratio_03")], table.cell(x: 5, y: 3)[#f("lissajous_frequency_03")],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[#f("reference_frequency_04")], table.cell(x: 2, y: 4)[#f("ny_04")], table.cell(x: 3, y: 4)[#f("nx_04")], table.cell(x: 4, y: 4)[#f("frequency_ratio_04")], table.cell(x: 5, y: 4)[#f("lissajous_frequency_04")],),
  ))

$ overline(f) _(y) = frac(1, 4) sum _(i = 1) ^(4) f _(y , i) , quad u _(A) ( overline(f) _(y) ) = sqrt(frac(sum _(i = 1) ^(4) ( f _(y , i) - overline(f) _(y) ) ^(2), 4 ( 4 - 1 ))) . $

 李萨如法：$overline(f) _(y) = ( #mf("lissajous_mean_khz") plus.minus #mf("lissajous_u_khz") ) thin upright(k H z)$。
这里只估计重复测频的 A 类标准不确定度，未计入参考频率准确度。

 正弦波周期法：$f _(T) = #mf("sine_frequency_khz") thin upright(k H z)$；
两法相对差 $| overline(f) _(y) - f _(T) | / f _(T) = #f("method_difference_percent") "%"$。
平均与比较要求四组记录和第 2 行正弦波测量使用同一个、频率未改变的待测信号。

#section[讨论与分析（思考题）]

1. 只见竖直亮线，通常是 X 扫描未开启或未接入合适扫描信号。应检查时基、X 输入选择及水平放大，调节触发源、电平和档位，使波形展开并稳定。

2. 测直流时用 DC 耦合，先确定零电压基线，再接入待测电压；电压为基线位移乘垂直档位及探头倍数，正负由偏转方向确定。

3. 普通触发扫描难以持续稳定显示非周期信号，因为重复扫描不能保持同一相位；瞬态捕获需要单次扫描或存储示波器。

4. 李萨如图形转动或变化表明频率比未稳定或相位缓慢漂移。微调信号频率、检查连接并保持信号源稳定，可得到便于计数的闭合图形。

#section[实验结论]

通过校准和档位读数得到四种波形的峰峰值、周期及频率。
李萨如法平均频率为 $#mf("lissajous_mean_khz") thin upright(k H z)$，与周期法的相对差为 #f("method_difference_percent")%。
评价两法一致性时应结合切点计数、读数分辨率和参考频率准确度；上述相对差本身不是准确度判定标准。

#records()
