#import "base.typ": *
#import "charts.typ": *
#let torsion-table() = [

#report-table(columns: (1.2fr, .8fr, .8fr, 1.2fr, .65fr, 1.2fr, 2.4fr, 2.4fr, .8fr), size: 7.5pt,
  header: (table.cell(x: 0, y: 0)[物体名称], table.cell(x: 1, y: 0)[质量 $m$\ （kg）], table.cell(x: 2, y: 0, colspan: 2)[几何尺寸\ （$10 ^(- 2)$ m）], table.cell(x: 4, y: 0, colspan: 2)[周期（s）], table.cell(x: 6, y: 0)[转动惯量\ 理论值（kg$dot.op$m$"" ^(2)$）], table.cell(x: 7, y: 0)[转动惯量\ 实验值（kg$dot.op$m$"" ^(2)$）], table.cell(x: 8, y: 0)[百分差\ $E _(0)$（%）],),
  rows: (
    (table.cell(x: 0, y: 1, rowspan: 4)[载物圆盘], table.cell(x: 1, y: 1, rowspan: 4)[#line(start: (0pt, 0pt), end: (6mm, 12mm), stroke: 0.35pt)], table.cell(x: 2, y: 1, colspan: 2, rowspan: 4)[#line(start: (0pt, 0pt), end: (6mm, 12mm), stroke: 0.35pt)], table.cell(x: 4, y: 1, rowspan: 3)[$T _(0)$], table.cell(x: 5, y: 1)[#f("period_disk_01")], table.cell(x: 6, y: 1, rowspan: 4)[#line(start: (0pt, 0pt), end: (6mm, 12mm), stroke: 0.35pt)], table.cell(x: 7, y: 1, rowspan: 2)[$I _(0) = I ' _(1) frac(overline(T) _(0) ^(2), overline(T) _(1) ^(2) - overline(T) _(0) ^(2))$], table.cell(x: 8, y: 1, rowspan: 4)[#line(start: (0pt, 0pt), end: (6mm, 12mm), stroke: 0.35pt)],),
    (table.cell(x: 5, y: 2)[#f("period_disk_02")],),
    (table.cell(x: 5, y: 3)[#f("period_disk_03")], table.cell(x: 7, y: 3, rowspan: 2)[$#mf("empty_inertia")$],),
    (table.cell(x: 4, y: 4)[$overline(T) _(0)$], table.cell(x: 5, y: 4)[#f("period_disk")],),
    (table.cell(x: 0, y: 5, rowspan: 4)[实心圆柱体], table.cell(x: 1, y: 5, rowspan: 4)[#f("mass_cylinder_kg")], table.cell(x: 2, y: 5, rowspan: 3)[$D _(1)$], table.cell(x: 3, y: 5)[#f("geometry_cylinder_01")], table.cell(x: 4, y: 5, rowspan: 3)[$T _(1)$], table.cell(x: 5, y: 5)[#f("period_cylinder_01")], table.cell(x: 6, y: 5, rowspan: 2)[$I ' _(1) = frac(1, 8) m _(1) overline(D) _(1) ^(2)$], table.cell(x: 7, y: 5, rowspan: 2)[$I _(1) = frac(K, 4 pi ^(2)) overline(T) _(1) ^(2) - I _(0)$], table.cell(x: 8, y: 5, rowspan: 4)[#f("error_cylinder")],),
    (table.cell(x: 3, y: 6)[#f("geometry_cylinder_02")], table.cell(x: 5, y: 6)[#f("period_cylinder_02")],),
    (table.cell(x: 3, y: 7)[#f("geometry_cylinder_03")], table.cell(x: 5, y: 7)[#f("period_cylinder_03")], table.cell(x: 6, y: 7, rowspan: 2)[$#mf("theory_cylinder")$], table.cell(x: 7, y: 7, rowspan: 2)[$#mf("experiment_cylinder")$],),
    (table.cell(x: 2, y: 8)[平均值], table.cell(x: 3, y: 8)[#f("diameter_cylinder_cm")], table.cell(x: 4, y: 8)[$overline(T) _(1)$], table.cell(x: 5, y: 8)[#f("period_cylinder")],),
    (table.cell(x: 0, y: 9, rowspan: 8)[空心金属圆筒], table.cell(x: 1, y: 9, rowspan: 8)[#f("mass_tube_kg")], table.cell(x: 2, y: 9, rowspan: 3)[$D _("外")$], table.cell(x: 3, y: 9)[#f("geometry_tube_outer_01")], table.cell(x: 4, y: 9, rowspan: 3)[$T _(2)$], table.cell(x: 5, y: 9)[#f("period_tube_01")], table.cell(x: 6, y: 9, rowspan: 4)[$I ' _(2) = frac(1, 8) m _(2) ( overline(D) _("外") ^(2) + overline(D) _("内") ^(2) )$], table.cell(x: 7, y: 9, rowspan: 4)[$I _(2) = frac(K, 4 pi ^(2)) overline(T) _(2) ^(2) - I _(0)$], table.cell(x: 8, y: 9, rowspan: 8)[#f("error_tube")],),
    (table.cell(x: 3, y: 10)[#f("geometry_tube_outer_02")], table.cell(x: 5, y: 10)[#f("period_tube_02")],),
    (table.cell(x: 3, y: 11)[#f("geometry_tube_outer_03")], table.cell(x: 5, y: 11)[#f("period_tube_03")],),
    (table.cell(x: 2, y: 12)[平均值], table.cell(x: 3, y: 12)[#f("diameter_tube_outer_cm")], table.cell(x: 4, y: 12, rowspan: 5)[$overline(T) _(2)$], table.cell(x: 5, y: 12, rowspan: 5)[#f("period_tube")],),
    (table.cell(x: 2, y: 13, rowspan: 3)[$D _("内")$], table.cell(x: 3, y: 13)[#f("geometry_tube_inner_01")], table.cell(x: 6, y: 13, rowspan: 4)[$#mf("theory_tube")$], table.cell(x: 7, y: 13, rowspan: 4)[$#mf("experiment_tube")$],),
    (table.cell(x: 3, y: 14)[#f("geometry_tube_inner_02")],),
    (table.cell(x: 3, y: 15)[#f("geometry_tube_inner_03")],),
    (table.cell(x: 2, y: 16)[平均值], table.cell(x: 3, y: 16)[#f("diameter_tube_inner_cm")],),
    (table.cell(x: 0, y: 17, rowspan: 4)[木球], table.cell(x: 1, y: 17, rowspan: 4)[#f("mass_ball_kg")], table.cell(x: 2, y: 17, rowspan: 3)[$D _("球")$], table.cell(x: 3, y: 17)[#f("geometry_ball_01")], table.cell(x: 4, y: 17, rowspan: 3)[$T _(3)$], table.cell(x: 5, y: 17)[#f("period_ball_01")], table.cell(x: 6, y: 17, rowspan: 2)[$I ' _(3) = frac(1, 10) m _(3) overline(D) _("球") ^(2)$], table.cell(x: 7, y: 17, rowspan: 2)[$I _(3) = frac(K, 4 pi ^(2)) overline(T) _(3) ^(2)$], table.cell(x: 8, y: 17, rowspan: 4)[#f("error_ball")],),
    (table.cell(x: 3, y: 18)[#f("geometry_ball_02")], table.cell(x: 5, y: 18)[#f("period_ball_02")],),
    (table.cell(x: 3, y: 19)[#f("geometry_ball_03")], table.cell(x: 5, y: 19)[#f("period_ball_03")], table.cell(x: 6, y: 19, rowspan: 2)[$#mf("theory_ball")$], table.cell(x: 7, y: 19, rowspan: 2)[$#mf("experiment_ball")$],),
    (table.cell(x: 2, y: 20)[平均值], table.cell(x: 3, y: 20)[#f("diameter_ball_cm")], table.cell(x: 4, y: 20)[$overline(T) _(3)$], table.cell(x: 5, y: 20)[#f("period_ball")],),
    (table.cell(x: 0, y: 21, rowspan: 4)[金属细杆], table.cell(x: 1, y: 21, rowspan: 4)[#f("mass_rod_kg")], table.cell(x: 2, y: 21, rowspan: 3)[$l$], table.cell(x: 3, y: 21)[#f("geometry_rod_01")], table.cell(x: 4, y: 21, rowspan: 3)[$T _(4)$], table.cell(x: 5, y: 21)[#f("period_rod_01")], table.cell(x: 6, y: 21, rowspan: 2)[$I ' _(4) = frac(1, 12) m _(4) overline(l) ^(2)$], table.cell(x: 7, y: 21, rowspan: 2)[$I _(4) = frac(K, 4 pi ^(2)) overline(T) _(4) ^(2)$], table.cell(x: 8, y: 21, rowspan: 4)[#f("error_rod")],),
    (table.cell(x: 3, y: 22)[#f("geometry_rod_02")], table.cell(x: 5, y: 22)[#f("period_rod_02")],),
    (table.cell(x: 3, y: 23)[#f("geometry_rod_03")], table.cell(x: 5, y: 23)[#f("period_rod_03")], table.cell(x: 6, y: 23, rowspan: 2)[$#mf("theory_rod")$], table.cell(x: 7, y: 23, rowspan: 2)[$#mf("experiment_rod")$],),
    (table.cell(x: 2, y: 24)[平均值], table.cell(x: 3, y: 24)[#f("length_rod_cm")], table.cell(x: 4, y: 24)[$overline(T) _(4)$], table.cell(x: 5, y: 24)[#f("period_rod")],),
  ))

]
#show: report-layout


#cover()

#section[实验目的]

1. 观察小角度扭摆，测量空盘与规则物体的周期并标定扭转常数。

2. 比较圆柱、圆筒、球和细杆的理论与实验转动惯量。

3. 改变两个对称滑块到转轴的距离，验证平行轴定理及惯量对距离平方的依赖。

#section[实验原理]

扭摆的回复力矩在小角度范围内近似满足 $M = - kappa theta$，运动方程为 $I dot.double(theta) + kappa theta = 0$，故

$ T = 2 pi sqrt(frac(I, kappa)) . $

以圆柱作标准物体，比较空盘周期 $T _(0)$ 和装圆柱周期 $T _(1)$，可由圆柱理论惯量 $I ' _(1) = frac(m D ^(2), 8)$ 求 $kappa = frac(4 pi ^(2) I ' _(1), T _(1) ^(2) - T _(0) ^(2))$。圆柱、圆筒置于载物盘上，实验惯量为 $I _(j) = frac(kappa T _(j) ^(2), 4 pi ^(2)) - I _(0)$（$j = 1 , 2$）；木球、细杆及细杆加滑块直接安装在转轴上，实验惯量为 $I _(j) = frac(kappa T _(j) ^(2), 4 pi ^(2))$，不扣除 $I _(0)$。对两个质量均为 $m _(s)$ 的滑块，平行轴模型为 $I ( x ) = I _("rod") + 2 I _(s) + 2 m _(s) x ^(2)$。
以 $Delta = T _(1) ^(2) - T _(0) ^(2)$ 记周期平方差。暂把标准圆柱的理论惯量视为已知常量，独立重复计时的传播公式为

$ u _(kappa) = kappa sqrt( ( frac(2 T _(0) u _(T _(0)), Delta)  ) ^(2) +  ( frac(2 T _(1) u _(T _(1)), Delta)  ) ^(2)) . $

$  u _(I _(0)) ^(2) &=  ( frac(2 I ' _(1) T _(0) T _(1) ^(2) u _(T _(0)), Delta ^(2))  ) ^(2) +  ( frac(2 I ' _(1) T _(1) T _(0) ^(2) u _(T _(1)), Delta ^(2))  ) ^(2) , \  u _(I _(j)) ^(2) &=  ( frac(2 I ' _(1) T _(j) u _(T _(j)), Delta)  ) ^(2) +  ( frac(2 I ' _(1) T _(0) ( T _(j) ^(2) - T _(1) ^(2) ) u _(T _(0)), Delta ^(2))  ) ^(2) \  & +  ( frac(2 I ' _(1) T _(1) ( T _(j) ^(2) - T _(0) ^(2) ) u _(T _(1)), Delta ^(2))  ) ^(2) quad ( j = 2 ) .  $

木球、细杆及细杆加滑块的计时不确定度为

$ u _(I) ^(2) =  ( frac(kappa T u _(T), 2 pi ^(2))  ) ^(2) +  ( frac(T ^(2) u _(kappa), 4 pi ^(2))  ) ^(2) . $

标定圆柱的 $I _(1)$ 与 $I ' _(1)$ 由同一组周期构成，其计时项相消；完整不确定度还需计入圆柱质量、直径等仪器误差。

#section[实验内容]

#subsection[周期和几何量]

1. 调节底座水平与转轴竖直，保证载物盘空载时自由摆动；轻转一小角度后放手，避免向下压轴。

2. 测量空盘连续二十周期的总时长三次。圆柱、圆筒置于载物盘上；拆下载物盘后直接安装木球或细杆，各计十周期并重复三次。

3. 测量各物体质量及必要的直径、长度；装置应居中、固定可靠，换物体时保持转轴条件一致。

#subsection[平行轴验证]

4. 把两个滑块关于转轴对称放在细杆上，量取滑块质心到轴的距离；在 5、10、15、20 cm 四个位置分别计五周期三次。

5. 将实验惯量与理论惯量对照，并以 $x ^(2)$ 为横轴作图，检查线性关系。

#section[实验仪器]

#subsection[扭摆装置与待测物体]

扭摆装置如图 3.5.1 所示，由载物圆盘、垂直轴、螺旋弹簧和支座等组成。垂直轴与支座之间装有轴承，以尽量减小摩擦力矩；薄片状螺旋弹簧在物体偏离平衡位置时提供回复力矩，使物体绕垂直轴往复扭转。轴的上方可安装不同待测物体。

 待测物体包括空心金属圆筒、实心塑料圆柱体、木球，以及用于测量转动惯量和验证平行轴定理的细金属杆；杆上有两块位置可调的金属滑块。圆柱、圆筒放在载物盘上，木球、细杆及细杆加滑块直接安装在转轴上。辅助测量使用数字式电子天平、游标卡尺和刻度尺。

#align(center, image("figures/torsion-apparatus-reference.png", height: 6.8cm, fit: "contain"))

 1. 载物圆盘　 2. 垂直轴　 3. 螺旋弹簧

图 3.5.1 扭摆装置图

#subsection[多功能计数计时器与光电探头]

计数计时器由主机和光电探头两部分组成。探头检测随扭摆运动的挡光杆是否遮光，主机根据挡光次数判断是否达到预设的周期数。先用预置数开关设定周期数，再按“复位”按钮，使显示值回到“0000”秒；挡光杆第一次通过光电探头间隙时开始计时，达到预定周期数后自动停止计数并显示总时长。

 光电探头采用红外发射管和红外接收管，不能凭肉眼直接判断其是否正常工作。可用纸片遮挡探头间隙，检查计时是否开始、达到预定次数后是否停止，以及复位后是否显示“0000”。为减小强光干扰，探头应避免置于强光下，必要时拉上窗帘遮光。

 记录的是设定周期数内的总时长，须除以相应周期数后得到单周期。空盘、规则物体和滑块组的计时周期数不同，不可混用。

#subsection[数字式电子天平]

电子天平由数字电路和压力传感器等组成，本实验所用天平的称量范围为 1.999 kg，分度值为 0.1 g，仪器误差为 0.1 g。使用前检查空载示值是否为零；若不为零，调节天平右侧的调零手轮，使显示值回到“0”，再进行称量。

#pagebreak()

#section[7. 数据记录与处理]

1. 弹簧扭转常数和转动惯量的测定，数据记录见表 3.5.1。

表 3.5.1　 刚体转动惯量测量实验数据记录表

#torsion-table()

 计算弹簧扭转常数：

$ K = 4 pi ^(2) frac(I ' _(1), overline(T) _(1) ^(2) - overline(T) _(0) ^(2)) = #mf("torsion_constant") thin upright(N thin m) . $

#pagebreak()

2. 转动惯量平行轴定理的验证，数据记录见表 3.5.2。滑块质量
$m _("滑") = #mf("slider_mass_g") thin upright(g)$（两个滑块的平均质量）。

表中 $I _(5)$ 为两个滑块绕通过滑块质心转轴的转动惯量

$ I _(5) = frac(1, 8) m _("滑") ( D _("内" 1) ^(2) + D _("外" 1) ^(2) ) + frac(1, 6) m _("滑") l _(1) ^(2) . $

式中，$m _("滑")$ 为滑块质量；$D _("内" 1)$、$D _("外" 1)$ 为滑块的内径和外径；$l _(1)$ 为其长度。

本次实验取 $I _(5) = #mf("slider_pair_inertia") thin upright(k g thin m ^(2))$。

表 3.5.2　 验证平行轴定理实验数据记录表

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[$x$（$10 ^(- 2)$ m）], table.cell(x: 1, y: 0)[5.00], table.cell(x: 2, y: 0)[10.00], table.cell(x: 3, y: 0)[15.00], table.cell(x: 4, y: 0)[20.00],),
  rows: (
    (table.cell(x: 0, y: 1, rowspan: 3)[$T$（s）], table.cell(x: 1, y: 1)[#f("slider_period_5_01")], table.cell(x: 2, y: 1)[#f("slider_period_10_01")], table.cell(x: 3, y: 1)[#f("slider_period_15_01")], table.cell(x: 4, y: 1)[#f("slider_period_20_01")],),
    (table.cell(x: 1, y: 2)[#f("slider_period_5_02")], table.cell(x: 2, y: 2)[#f("slider_period_10_02")], table.cell(x: 3, y: 2)[#f("slider_period_15_02")], table.cell(x: 4, y: 2)[#f("slider_period_20_02")],),
    (table.cell(x: 1, y: 3)[#f("slider_period_5_03")], table.cell(x: 2, y: 3)[#f("slider_period_10_03")], table.cell(x: 3, y: 3)[#f("slider_period_15_03")], table.cell(x: 4, y: 3)[#f("slider_period_20_03")],),
    (table.cell(x: 0, y: 4)[$overline(T)$（s）], table.cell(x: 1, y: 4)[$#mf("slider_period_5")$], table.cell(x: 2, y: 4)[$#mf("slider_period_10")$], table.cell(x: 3, y: 4)[$#mf("slider_period_15")$], table.cell(x: 4, y: 4)[$#mf("slider_period_20")$],),
    (table.cell(x: 0, y: 5)[实验值（kg$dot.op$m$"" ^(2)$）\ $I = frac(K, 4 pi ^(2)) overline(T) ^(2)$], table.cell(x: 1, y: 5)[$#mf("slider_experiment_5")$], table.cell(x: 2, y: 5)[$#mf("slider_experiment_10")$], table.cell(x: 3, y: 5)[$#mf("slider_experiment_15")$], table.cell(x: 4, y: 5)[$#mf("slider_experiment_20")$],),
    (table.cell(x: 0, y: 6)[理论值（kg$dot.op$m$"" ^(2)$）\ $I ' = I _(4) + 2 m x ^(2) + I _(5)$], table.cell(x: 1, y: 6)[$#mf("slider_theory_5")$], table.cell(x: 2, y: 6)[$#mf("slider_theory_10")$], table.cell(x: 3, y: 6)[$#mf("slider_theory_15")$], table.cell(x: 4, y: 6)[$#mf("slider_theory_20")$],),
    (table.cell(x: 0, y: 7)[百分差 $E _(0) = frac(| I ' - I |, I ') times 100 "%"$], table.cell(x: 1, y: 7)[$#mf("slider_error_5")$], table.cell(x: 2, y: 7)[$#mf("slider_error_10")$], table.cell(x: 3, y: 7)[$#mf("slider_error_15")$], table.cell(x: 4, y: 7)[$#mf("slider_error_20")$],),
  ))

#section[平行轴定理的数据图]

横轴取滑块距离平方 $x ^(2)$（cm$"" ^(2)$），纵轴取总惯量的 $10 ^(- 3) thin upright(k g thin m ^(2))$ 数值。散点是周期换算的实验结果，直线连接对应理论值；两条序列均来自本次读数和输入的滑块质量。

#plot(((points: points("slider_graph_points"), label: [实测惯量], line: false), (points: points("slider_graph_theory_points"), label: [平行轴理论], marks: false, color: red)), x-label: [$x^2/upright("cm")^2$], y-label: [$I/(10^(-3) upright("kg") upright(m)^2)$])

#section[讨论与分析]

#subsection[图形与模型]

若平行轴定理适用，$I$ 对 $x ^(2)$ 的点应近似落在直线上，斜率由两个滑块的质量决定。若图中随位置出现系统偏离，应检查距离是否从滑块质心量起、两个滑块是否对称，以及滑块本身惯量是否计入。

#subsection[重复计时的不确定度]

下列标准不确定度仅计重复计时贡献，未计质量、尺寸等仪器不确定度。

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[物体], table.cell(x: 1, y: 0)[载物圆盘], table.cell(x: 2, y: 0)[实心圆柱体], table.cell(x: 3, y: 0)[空心金属圆筒], table.cell(x: 4, y: 0)[木球], table.cell(x: 5, y: 0)[金属细杆],),
  rows: (
    (table.cell(x: 0, y: 1)[$u _(T)$/s], table.cell(x: 1, y: 1)[$#mf("period_disk_u")$], table.cell(x: 2, y: 1)[$#mf("period_cylinder_u")$], table.cell(x: 3, y: 1)[$#mf("period_tube_u")$], table.cell(x: 4, y: 1)[$#mf("period_ball_u")$], table.cell(x: 5, y: 1)[$#mf("period_rod_u")$],),
    (table.cell(x: 0, y: 2)[$u _(I)$/kg m$"" ^(2)$], table.cell(x: 1, y: 2)[$#mf("empty_inertia_u")$], table.cell(x: 2, y: 2)[$#mf("experiment_cylinder_u")$], table.cell(x: 3, y: 2)[$#mf("experiment_tube_u")$], table.cell(x: 4, y: 2)[$#mf("experiment_ball_u")$], table.cell(x: 5, y: 2)[$#mf("experiment_rod_u")$],),
  ))

滑块四种位置的 $u _(T)$ 依次为
$#mf("slider_period_5_u")$、$#mf("slider_period_10_u")$、$#mf("slider_period_15_u")$、$#mf("slider_period_20_u")$ s；
$u _(I)$ 依次为 $#mf("slider_experiment_5_u")$、$#mf("slider_experiment_10_u")$、$#mf("slider_experiment_15_u")$、$#mf("slider_experiment_20_u")$ kg m$"" ^(2)$。

#subsection[主要误差]

计时起止点不一致、转轴摩擦、振幅过大和物体偏心都会改变周期。圆柱用于标定 $kappa$，其质量和直径误差会传递到所有实验惯量。仅圆柱、圆筒扣除空盘惯量 $I _(0)$；木球、细杆及细杆加滑块不扣除。

#section[实验结论]

由圆柱与空盘的周期差标定扭转常数 $kappa = ( #mf("torsion_constant") plus.minus #mf("torsion_constant_u") ) thin upright(N thin m)$，再求其他物体惯量。这里的不确定度只计重复计时的贡献。滑块位置变化所得散点应与 $I ' = I _(4) + I _(5) + 2 m _(s) x ^(2)$ 的平方关系比较，不能只凭周期随距离变大作结论。

#section[思考题]

为何空盘计时二十周期，而物体只计十周期？空盘周期较短，扩大总计时长度可以减小启停反应时间的相对影响。为何使用两个对称滑块？对称布置可以减少质心偏离转轴引起的附加晃动。

#records()

