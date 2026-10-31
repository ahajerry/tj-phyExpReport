#import "base.typ": *
#import "charts.typ": *
#show: report-layout
#let period-b = if count("time_100") > 0 { $frac(0.1,100)$ } else { $frac(#mf("period_error_s"),sqrt(3))$ }


#cover()

#section[实验目的]

1. 理解气体的定压、定容比热容及比热容比的物理意义，并认识绝热过程的近似条件。

2. 使用振动法测定空气比热容比，掌握小球直径、质量、周期、气压和容积的测量。

3. 学习零点修正、重复测量及 A、B 类不确定度的合成，分析直径误差的放大效应。

#section[实验原理]

图4.2.1为振动法测比热容比的实验原理示意图。实验以球形储气瓶中的空气作为研究的热力学系统，并测量其比热容比数值。储气瓶正上方连接一个精密细玻璃管B，其内有一个可以自由移动的振动小球A，侧壁有一个小孔。振动小球A的直径仅比玻璃管B的直径小0.01 mm～0.02 mm。在储气瓶壁上有一小口并插入一根细管C，可将待测气体通过细管C注入到储气瓶中。为了补偿由于空气阻尼以及少量漏气引起的小球A振幅的衰减，可以通过细管C持续稳定注入小气压的气流。如果注入气体的流量适当时，小球A就能在玻璃管B的小孔上下做简谐振动。当振动小球A处于小孔下方的半个振动周期时，注入气体会使储气瓶内的压力增大，引起小球A向上移动。而当小球A处于小孔上方的半个振动周期时，储气瓶内的气体将通过小孔流出，使物体下落，以后重复上述过程。小球A的振动周期$T$可利用光电计时装置来测得。

#align(center, image("figures/heat-principle-source.png", width: 5.4cm, fit: "contain"))

 图4.2.1实验原理示意图。
若小球A的质量为$m$，半径为$r$（直径为$d$），当储气瓶内压强$P$满足下面条件时，小球A处于受力平衡状态。

#math.equation(block: true, numbering: n => "(4.2.1)", $P = P _(L) + frac(m g, pi r ^(2))$)

(4.2.1)式中$P _(L)$为大气压强。

当振动小球A偏离平衡位置一个较小距离$x$时，储气瓶内的压强将变化$d P$。由牛顿第二定律可得物体的运动方程为：

#math.equation(block: true, numbering: n => "(4.2.2)", $m frac(upright(d) ^(2) x, upright(d) t ^(2)) = pi r ^(2) upright(d) P$)

由于小球振动过程相当快，可以近似作为绝热过程处理，所以球形储气瓶内的气体压强$P$以及气体体积$V$满足绝热方程

#math.equation(block: true, numbering: n => "(4.2.3)", $P V ^(gamma) = C quad "（常数）"$)

将(4.2.3)式求导得出$upright(d) P = - frac(P gamma upright(d) V, V)$，而玻璃管B内气体的微小增量为

#math.equation(block: true, numbering: n => "(4.2.4)", $upright(d) V = pi r ^(2) x$)

将(4.2.4)式与(4.2.3)式代入(4.2.2)式得

#math.equation(block: true, numbering: n => "(4.2.5)", $frac(upright(d) ^(2) x, upright(d) t ^(2)) + frac(pi ^(2) r ^(4) P gamma, m V) x = 0$)

(4.2.5)式即为熟知的简谐振动方程，振动角频率$omega$为

#math.equation(block: true, numbering: n => "(4.2.6)", $omega = sqrt(frac(pi ^(2) r ^(4) P gamma, m V)) = frac(2 pi, T)$)

化简后可得

#math.equation(block: true, numbering: n => "(4.2.7)", $gamma = frac(4 m V, T ^(2) P r ^(4)) = frac(64 m V, T ^(2) P d ^(4))$)

若实验直接测得小球的振动周期$T$、小球质量$m$，直径$d$，以及储气瓶体积$V$，并根据(4.2.1)式得到储气瓶内气体压强$P$，那么利用(4.2.7)式即可计算出空气的比热容比$gamma$值。众所周知，空气是多种气体组成的混合物，其中99%以上是双原子气体氮和氧，因此经典理论得出空气的$gamma$值约为1.402。

#section[实验内容与步骤]

#subsection[5.1 实验仪器的调整与电路连接]

1.将微型气泵和缓冲瓶用橡皮管连接好，把装有小钢球的细玻璃管插入球形储气瓶中。将光电门利用方形连接块固定在铁架台立杆上，并调节其位置于细玻璃管的小孔附近。

2.调节铁架台底板上的三个水平调节螺钉，使底板处于水平状态。

3.接通微型气泵电源，微调气泵上的调节旋钮，待球形储气瓶内注入一定压力的气体后，细玻璃管中的钢球将离开弹簧向上方移动，此时应调节好气体流量，使钢球在玻璃管中以小孔为中心做简谐振动。

4.将网络型气体比热容比测试仪的电路控制箱与计算机主机以及光电门相连，确认连接无误后，接通电路控制箱的电源。

#subsection[5.2 小球直径、质量以及大气压强的测量]

1.用螺旋测微计测量备用小球直径$d$，重复测量5次，注意不可取出玻璃管内的小球，以免损坏仪器。

2.用空盒气压计在实验开始前和结束时各测一次大气压强$P _(L)$，并取平均值。

3.用物理天平测量备用小球的质量$m$。

#subsection[5.2 数据上传及周期的测量]

1.接通网络型气体比热容比测试仪并选择实验项目为“①空气”，按“确定”键进入当前实验选项的“参数设置”界面。

2.设定测量数据，包括小球直径（5个测量值）、小球质量、储气瓶容积、实验开始时测得的大气压强值。

3.通过“测量计数”界面完成小球振动周期的测量，设置振动次数为100次，启动实验装置，完成5次周期值的测量

4.再次设定大气压强值，完成实验。

5.实验完成后，断开电源，将各部分实验仪器整理好，根据测得的实验数据计算空气的比热容比$gamma$，估算不确定度，并与理论值比较，计算百分差。

#section[实验仪器]

网络型气体比热容比测试仪、带小孔细玻璃管和储气瓶、螺旋测微计、电子天平、空盒气压计及计时器。记录各仪器最小分度与估计误差。

#section[数据记录和处理]

#f("heat_reading_note")

#subsection[1．小球直径测量（螺旋测微计）：]

 表4.2.2 小球直径测量数据记录表　 单位：mm

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[测量序号], table.cell(x: 1, y: 0)[1], table.cell(x: 2, y: 0)[2], table.cell(x: 3, y: 0)[3], table.cell(x: 4, y: 0)[4], table.cell(x: 5, y: 0)[5], table.cell(x: 6, y: 0)[平均值],),
  rows: (
    (table.cell(x: 0, y: 1)[初读数], table.cell(x: 1, y: 1)[#f("diameter_initial_01")], table.cell(x: 2, y: 1)[#f("diameter_initial_02")], table.cell(x: 3, y: 1)[#f("diameter_initial_03")], table.cell(x: 4, y: 1)[#f("diameter_initial_04")], table.cell(x: 5, y: 1)[#f("diameter_initial_05")], table.cell(x: 6, y: 1)[---],),
    (table.cell(x: 0, y: 2)[末读数], table.cell(x: 1, y: 2)[#f("diameter_final_01")], table.cell(x: 2, y: 2)[#f("diameter_final_02")], table.cell(x: 3, y: 2)[#f("diameter_final_03")], table.cell(x: 4, y: 2)[#f("diameter_final_04")], table.cell(x: 5, y: 2)[#f("diameter_final_05")], table.cell(x: 6, y: 2)[---],),
    (table.cell(x: 0, y: 3)[直径 $d$], table.cell(x: 1, y: 3)[#f("diameter_corrected_01")], table.cell(x: 2, y: 3)[#f("diameter_corrected_02")], table.cell(x: 3, y: 3)[#f("diameter_corrected_03")], table.cell(x: 4, y: 3)[#f("diameter_corrected_04")], table.cell(x: 5, y: 3)[#f("diameter_corrected_05")], table.cell(x: 6, y: 3)[#f("diameter_mean_mm")],),
  ))

$ U _(d A) = sqrt(frac(sum ( d _(i) - overline(d) ) ^(2), n ( n - 1 ))) = #mf("diameter_u_a_mm") thin upright(m m) $

$ U _(d B) = frac(#mf("diameter_error_mm"), sqrt(3)) = #mf("diameter_u_b_mm") thin upright(m m) $

$ U _(d) = sqrt(U _(d A) ^(2) + U _(d B) ^(2)) = #mf("diameter_mean_u_mm") thin upright(m m) , quad U _(r d) = frac(U _(d), overline(d)) times 100 "%" = #mf("diameter_relative_u_percent") "%" $

$ d = ( #mf("diameter_mean_mm") plus.minus #mf("diameter_mean_u_mm") ) thin upright(m m) $

#subsection[2. 小球质量：]

$m = #f("mass_g") thin upright(g)$

仪器误差$Delta = #f("mass_error_g") thin upright(g)$

$ U _(m) = frac(Delta, sqrt(3)) = #mf("mass_u_g") thin upright(g) , quad U _(r m) = frac(U _(m), m) times 100 "%" = #mf("mass_relative_u_percent") "%" $

$ m = ( #mf("mass_result_g") plus.minus #mf("mass_u_g") ) thin upright(g) $

#subsection[3. 玻璃容器的体积：]

$ V = #mf("volume_l") times 10 ^(- 3) thin upright(m ^(3)) , quad quad U _(V) = #mf("volume_standard_u_l") times 10 ^(- 3) thin upright(m ^(3)) $

$ U _(r V) = frac(U _(V), V) times 100 "%" = #mf("volume_relative_u_percent") "%" $

$ V = ( #mf("volume_result_m3") plus.minus #mf("volume_u_m3") ) thin upright(m ^(3)) $

#subsection[4. 容器中空气压强的测量：]

①大气压强$P _(L)$：

实验开始时：$P _(L 1) = #f("pressure_start_kpa") thin upright(k P a)$　
实验结束时：$P _(L 2) = #f("pressure_end_kpa") thin upright(k P a)$

平均值$overline(P) _(L) = #mf("pressure_mean_kpa") thin upright(k P a)$。

仪器误差$Delta = #f("pressure_error_kpa") thin upright(k P a)$

$ U _(P _(L)) = frac(Delta, sqrt(3)) = #mf("pressure_mean_u_kpa") thin upright(k P a) $

$ U _(r P _(L)) = frac(U _(P _(L)), P _(L)) times 100 "%" = #mf("pressure_atmos_relative_u_percent") "%" $

$ P _(L) = ( #mf("pressure_mean_kpa") plus.minus #mf("pressure_mean_u_kpa") ) thin upright(k P a) $

②容器内的大气压$P$：

$ P = P _(L) + frac(4 m g, pi d ^(2)) = #mf("pressure_inside_pa") thin upright(P a) $

$ U _(P) approx U _(P _(L)) = #mf("pressure_inside_u_pa") thin upright(P a) , quad U _(r P) = frac(U _(P), P) times 100 "%" = #mf("pressure_relative_u_percent") "%" $

$ P = ( #mf("pressure_inside_result_pa") plus.minus #mf("pressure_inside_u_pa") ) thin upright(P a) $

#subsection[5. 小球振动周期$T$的测量：]

 表4.2.3 小球振动周期数据记录表

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[测量序号], table.cell(x: 1, y: 0)[1], table.cell(x: 2, y: 0)[2], table.cell(x: 3, y: 0)[3], table.cell(x: 4, y: 0)[4], table.cell(x: 5, y: 0)[5], table.cell(x: 6, y: 0)[平均值],),
  rows: (
    (table.cell(x: 0, y: 1)[$100 T$（s）], table.cell(x: 1, y: 1)[#f("time_100_01")], table.cell(x: 2, y: 1)[#f("time_100_02")], table.cell(x: 3, y: 1)[#f("time_100_03")], table.cell(x: 4, y: 1)[#f("time_100_04")], table.cell(x: 5, y: 1)[#f("time_100_05")], table.cell(x: 6, y: 1)[#f("period_time_mean_s")],),
    (table.cell(x: 0, y: 2)[$T$（s）], table.cell(x: 1, y: 2)[#f("period_calculated_01")], table.cell(x: 2, y: 2)[#f("period_calculated_02")], table.cell(x: 3, y: 2)[#f("period_calculated_03")], table.cell(x: 4, y: 2)[#f("period_calculated_04")], table.cell(x: 5, y: 2)[#f("period_calculated_05")], table.cell(x: 6, y: 2)[#f("period_mean_s")],),
  ))

$ U _(T A) = sqrt(frac(sum ( T _(i) - overline(T) ) ^(2), n ( n - 1 ))) = #mf("period_u_a_s") thin upright(s) $

$ U _(T B) = #period-b = #mf("period_u_b_s") thin upright(s) $

$ U _(T) = sqrt(U _(T A) ^(2) + U _(T B) ^(2)) = #mf("period_mean_u_s") thin upright(s) , quad U _(r T) = frac(U _(T), T) times 100 "%" = #mf("period_relative_u_percent") "%" $

$ T = ( #mf("period_mean_s") plus.minus #mf("period_mean_u_s") ) thin upright(s) $

#subsection[6.空气比热容比计算：]

$ gamma = frac(4 m V, T ^(2) P r ^(4)) = frac(64 m V, T ^(2) P d ^(4)) = #mf("gamma_result") $

$ U _(r gamma) =  [ U _(r m) ^(2) + U _(r V) ^(2) + ( 2 times U _(r T) ) ^(2) + U _(r P) ^(2) + ( 4 times U _(r d) ) ^(2)  ] ^(frac(1, 2)) = #mf("gamma_relative_u_percent") "%" $

$ U _(gamma) = gamma times U _(r gamma) = #mf("gamma_uncertainty") $

实验结果表达式：$gamma = #mf("gamma_result") plus.minus #mf("gamma_uncertainty")$

理论值：$gamma _(0) = 1.402$

$ "百分差：" quad E _(0) = frac(| gamma - gamma _(0) |, gamma _(0)) times 100 "%" = #mf("gamma_error_percent") "%" $

#section[讨论与分析]

#subsection[误差来源]

直径在计算式中以四次方出现；小球直径的零点修正和重复性往往比周期末位更影响结果。若球与管壁接触、振动幅度较大，摩擦和非线性回复力会改变周期。漏气与热交换使绝热条件变差，气压记录不及时也会造成系统偏差。

#subsection[结果检查]

检查修正后直径是否全为正、五次周期有无明显离群、始末气压差是否异常。计算相对不确定度时各项应使用同一单位；特别注意 mm 转 m、L 转 m$"" ^(3)$、kPa 转 Pa。若 $gamma$ 与参考值偏差超过不确定度范围，应先复查密封性和直径读数。

#subsection[思考题]

为何应采用小幅振动？小幅振动使气体压强变化较小，绝热方程可以线性化，周期才近似与振幅无关。为何测量五次直径？球可能并非理想球体，多方向测量可暴露形状差异并估计读数分散。

#section[实验结论]

由五次振动周期和修正后的几何、气压数据得到空气比热容比 $gamma = #mf("gamma_result") plus.minus #mf("gamma_uncertainty")$；相对参考值 $1.402$ 的百分差为 $#f("gamma_error_percent") "%"$。结果应结合密封性和直径测量条件评价。

#records()

