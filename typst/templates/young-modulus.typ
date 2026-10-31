#import "base.typ": *
#import "charts.typ": *
#show: report-layout


#cover()

#section[1. 引言]

在物体的弹性限度内，当物体受外力作用时，均会发生弹性形变；发生弹性形变时，物体内部产生恢复原状的内应力。弹性模量是反映材料抵抗形变能力的物理量，在工程上作为选择材料的依据之一。

#section[2. 实验目的]

1\.#h(1em) 用拉伸法测定金属丝的杨氏弹性模量。

2\.#h(1em) 掌握光杠杆镜尺法测定长度微小变化的原理。

3\.#h(1em) 熟练掌握望远镜调节方法。

4\.#h(1em) 学习处理数据的两种方法：图解法、逐差法。

#section[3. 实验原理]

基于胡克定律，固体在外力作用下将发生形变，如果外力撤去之后其形变消失，这种形变称之为弹性形变。如果外力后仍有残余形变，这种形变称为塑性形变。

应力是指单位面积上所受到的力，其单位为 $F slash S$。应变是指在外力作用下的相对形变，或相对伸长，即 $Delta L slash L$，反映了物体形变的大小。其中，$L$ 为原长，$Delta L$ 为形变量。

杨氏弹性模量 $Y$ 是材料弹性性质的一个重要特征量，指在弹性限度范围内，材料所受应力与所产生的应变之比。

杨氏弹性模量公式为

#math.equation(block: true, numbering: n => "(3.3.1)", $Y = frac(F, S) dot.op frac(L, Delta L) = frac(4 F L, pi d ^(2) Delta L)$)

其中，$F$ 表示材料所受拉（压）力，$S$ 表示材料的截面积，$L$ 表示材料的原长度，$Delta L$ 表示材料的长度延长（缩短）量。

#section[4. 实验仪器]

杨氏模量测定仪如图 3.3.1 所示，包括：拉伸仪、光杠杆、望远镜、标尺和支架等。

#subsection[1）金属丝与支架]

金属丝长约 0.8 米，上端被一个夹头固定在支架的上梁，下端有另一圆形夹头，可以在支架的下梁的圆孔内上下移动。实验中应尽量避免下夹头和支架下梁圆孔壁之间的摩擦。

支架底座上有三个可调支脚螺丝，并有一个水准泡。实验前需调节支脚螺丝使底座水平，即支架和其上的金属丝处于垂直状态。

#subsection[2）光杠杆]

使用时两前支脚放在支架的下梁平台三角形凹槽内，后支脚放在圆柱形夹头上端平面上。当钢丝受到拉伸时，随着圆柱夹头下降，光杠杆的后支脚也下降，此时平面镜以两前支脚为轴旋转。

#illustration(image("figures/young-apparatus-reference.png", width: 95.0%, fit: "contain"))[ 图 3.3.1 杨氏弹性模量测定仪]

#subsection[3）望远镜与标尺]

望远镜由物镜、目镜、十字分划板组成。使用时先调节目镜，使看清十字分划板（如图 3.3.2 所示）。继续调节望远镜的物镜调焦旋钮和仰角螺丝等，直至在望远镜中能看清标尺中部读数，如图 3.3.3 所示，则标尺像与分划板处于同一平面，消除读数时的视差。望远镜上的缺口与准星用于粗略瞄准光杠杆镜面；仰角调节螺丝用于调整观察方向，锁紧螺丝用于固定望远镜位置。调节时先用目镜调焦旋钮看清分划板，再用物镜调焦旋钮看清标尺像。轻微移动眼睛检查标尺像与分划线是否相对移动，若有移动，应继续调焦，直至消除视差后再读数。

#illustration(image("figures/young-reticles-reference.png", width: 85.0%, fit: "contain"))[ 图 3.3.2 十字分划板　　 图 3.3.3 分划板与标尺读数]

#section[5. 实验方法——光杠杆镜尺法测量微小长度的变化]

在（3.3.1）式中，在外力 $F$ 的拉伸下，钢丝的伸长量 $Delta L$ 是很小的量。用一般的长度测量仪器无法测量。在本实验中采用光杠杆镜尺法，原理图如图 3.3.4 所示。

#illustration(image("figures/young-principle-reference.png", width: 95.0%, fit: "contain"))[ 图 3.3.4 光杠杆镜尺法原理图]

施加应力拉伸钢丝之前，使光杠杆的平面镜处于垂直状态。标尺刻度通过平面镜反射后，在望远镜中呈像。则望远镜可以通过平面镜观察到标尺刻度所成的像，即望远镜中十字线的水平线对应的标尺上刻度 $x _(0)$。

当在钢丝下的挂盘添加砝码，即施加应力使钢丝伸长 $Delta L$，下架头的位置因而下降 $Delta L$ 时，平面镜将转动 $phi$ 角。可通过望远镜，观察到标尺刻度的像也发生移动，十字线的水平线对应于标尺刻度为 $x _(i)$ 处。

由图 3.3.4 可知，当平面镜转动 $phi$ 角时，入射光与反射光的夹角为 $2 phi$。从图中看出望远镜中标尺刻度的变化量为 $l = x _(i) - x _(0)$。

因为 $phi$ 角很小，适用于小角度近似条件，则由图 3.3.4 可知

#math.equation(block: true, numbering: n => "(3.3.2)", $theta approx tan theta = frac(Delta L, K)$)

#math.equation(block: true, numbering: n => "(3.3.3)", $2 theta approx tan 2 theta = frac(l, D)$)

则有

#math.equation(block: true, numbering: n => "(3.3.4)", $Delta L = frac(K, 2 D) l$)

由（3.3.1）（3.3.4）得

#math.equation(block: true, numbering: n => "(3.3.5)", $Y = frac(m g, S) dot.op frac(L, Delta L) = frac(2 L D F, S K l) = frac(8 L D g, pi d ^(2) K) frac(m, l)$)

#section[6. 实验内容]

#subsection[6.1 仪器调节]

1\.#h(1em) 调节测定仪支架螺丝，使水平仪气泡居中，并使钢丝垂直。

2\.#h(1em) 调节光杠杆的位置：将光杠杆后尖脚置于夹头上，两前尖脚置于平台凹槽上。

3\.#h(1em) 调节光杠杆与望远镜、米尺中部在同一高度上。

4\.#h(1em) 调节望远镜的位置或光杠杆镜面仰角，直至眼睛在望远镜目镜附近能直接（不通过望远镜筒）从光杠杆镜面中观察到标尺中部的像。

5\.#h(1em) 调节望远镜方位和仰角调节螺丝，使望远镜上缺口与准星连线粗略对准光杠杆镜面。

6\.#h(1em) 调节望远镜目镜调焦旋钮，直至在望远镜中能看清叉丝。

7\.#h(1em) 调节望远镜的物镜调焦旋钮直至在望远镜中能看清整个镜面。

8\.#h(1em) 继续调节望远镜的物镜调焦旋钮和仰角螺丝等，直至在望远镜中能看清标尺中部读数。

#section[6.2 数据测量]

1\.#h(1em) 在金属丝下端先挂若干砝码（如 2 kg），使金属丝完全伸直（此砝码不计入所加作用力 $m g$ 之内）。

2\.#h(1em) 每增加 0.500 kg 砝码，通过望远镜记录 10 组数据。然后，将砝码逐次减少 0.500 kg，记录相应读数，取对应于同一荷重下两次读数的平均值。

3\.#h(1em) 用钢尺测量光杠杆镜面到标尺距离 $D$。用米尺测量金属丝上下两夹头间金属丝长度 $L$。用螺旋测微计测量金属丝直径 $d$，测量 10 次取平均值。用游标卡尺测量光杠杆前尖脚到两后尖脚的连线的垂直长度 $K$。

#section[7. 数据处理]

#subsection[7.1 逐差法]

实验中测量的数据分别填入，上海地区重力加速度 $g = #mf("gravity_ms2") thin upright(m slash s ^(2))$。

 表 3.3.1 砝码质量与望远镜中标尺读数记录

#report-table(columns: (.5fr, .85fr, 1fr, 1fr, 2.05fr, 1.5fr, 1.25fr, 1fr), size: 9*tpt, stretch: 1.5, baseline: 13*tpt, inset: 3*tpt,
  header: (table.cell(x: 0, y: 0)[$i$], table.cell(x: 1, y: 0)[$m _(i)$(kg)], table.cell(x: 2, y: 0)[增荷时\ $x ' _(i)$(cm)], table.cell(x: 3, y: 0)[减荷时\ $x ' ' _(i)$(cm)], table.cell(x: 4, y: 0)[$x _(i) = frac(1, 2) ( x ' _(i) + x ' ' _(i) )$\ (cm)], table.cell(x: 5, y: 0)[$l _(i) = | x _(i) - x _(0) |$\ (cm)], table.cell(x: 6, y: 0)[$l _(i + 5) - l _(i)$\ (cm)], table.cell(x: 7, y: 0)[$v _(i) ^(2)$(cm$"" ^(2)$)],),
  rows: (
    (table.cell(x: 0, y: 1)[0], table.cell(x: 1, y: 1)[#f("load_mass_01")], table.cell(x: 2, y: 1)[#f("load_up_01")], table.cell(x: 3, y: 1)[#f("load_down_01")], table.cell(x: 4, y: 1)[#f("load_mean_01")], table.cell(x: 5, y: 1)[#f("load_displacement_01")], table.cell(x: 6, y: 1)[#f("load_difference_00")], table.cell(x: 7, y: 1)[#f("difference_square_00")],),
    (table.cell(x: 0, y: 2)[1], table.cell(x: 1, y: 2)[#f("load_mass_02")], table.cell(x: 2, y: 2)[#f("load_up_02")], table.cell(x: 3, y: 2)[#f("load_down_02")], table.cell(x: 4, y: 2)[#f("load_mean_02")], table.cell(x: 5, y: 2)[#f("load_displacement_02")], table.cell(x: 6, y: 2)[#f("load_difference_01")], table.cell(x: 7, y: 2)[#f("difference_square_01")],),
    (table.cell(x: 0, y: 3)[2], table.cell(x: 1, y: 3)[#f("load_mass_03")], table.cell(x: 2, y: 3)[#f("load_up_03")], table.cell(x: 3, y: 3)[#f("load_down_03")], table.cell(x: 4, y: 3)[#f("load_mean_03")], table.cell(x: 5, y: 3)[#f("load_displacement_03")], table.cell(x: 6, y: 3)[#f("load_difference_02")], table.cell(x: 7, y: 3)[#f("difference_square_02")],),
    (table.cell(x: 0, y: 4)[3], table.cell(x: 1, y: 4)[#f("load_mass_04")], table.cell(x: 2, y: 4)[#f("load_up_04")], table.cell(x: 3, y: 4)[#f("load_down_04")], table.cell(x: 4, y: 4)[#f("load_mean_04")], table.cell(x: 5, y: 4)[#f("load_displacement_04")], table.cell(x: 6, y: 4)[#f("load_difference_03")], table.cell(x: 7, y: 4)[#f("difference_square_03")],),
    (table.cell(x: 0, y: 5)[4], table.cell(x: 1, y: 5)[#f("load_mass_05")], table.cell(x: 2, y: 5)[#f("load_up_05")], table.cell(x: 3, y: 5)[#f("load_down_05")], table.cell(x: 4, y: 5)[#f("load_mean_05")], table.cell(x: 5, y: 5)[#f("load_displacement_05")], table.cell(x: 6, y: 5)[#f("load_difference_04")], table.cell(x: 7, y: 5)[#f("difference_square_04")],),
    (table.cell(x: 0, y: 6)[5], table.cell(x: 1, y: 6)[#f("load_mass_06")], table.cell(x: 2, y: 6)[#f("load_up_06")], table.cell(x: 3, y: 6)[#f("load_down_06")], table.cell(x: 4, y: 6)[#f("load_mean_06")], table.cell(x: 5, y: 6)[#f("load_displacement_06")], table.cell(x: 6, y: 6, rowspan: 5)[$overline(l _(i + 5) - l _(i))$\ $= #mf("difference_mean_cm")$], table.cell(x: 7, y: 6, rowspan: 5)[$sum v _(i) ^(2) = #mf("difference_square_sum")$],),
    (table.cell(x: 0, y: 7)[6], table.cell(x: 1, y: 7)[#f("load_mass_07")], table.cell(x: 2, y: 7)[#f("load_up_07")], table.cell(x: 3, y: 7)[#f("load_down_07")], table.cell(x: 4, y: 7)[#f("load_mean_07")], table.cell(x: 5, y: 7)[#f("load_displacement_07")],),
    (table.cell(x: 0, y: 8)[7], table.cell(x: 1, y: 8)[#f("load_mass_08")], table.cell(x: 2, y: 8)[#f("load_up_08")], table.cell(x: 3, y: 8)[#f("load_down_08")], table.cell(x: 4, y: 8)[#f("load_mean_08")], table.cell(x: 5, y: 8)[#f("load_displacement_08")],),
    (table.cell(x: 0, y: 9)[8], table.cell(x: 1, y: 9)[#f("load_mass_09")], table.cell(x: 2, y: 9)[#f("load_up_09")], table.cell(x: 3, y: 9)[#f("load_down_09")], table.cell(x: 4, y: 9)[#f("load_mean_09")], table.cell(x: 5, y: 9)[#f("load_displacement_09")],),
    (table.cell(x: 0, y: 10)[9], table.cell(x: 1, y: 10)[#f("load_mass_10")], table.cell(x: 2, y: 10)[#f("load_up_10")], table.cell(x: 3, y: 10)[#f("load_down_10")], table.cell(x: 4, y: 10)[#f("load_mean_10")], table.cell(x: 5, y: 10)[#f("load_displacement_10")],),
  ))

实验所用钢丝的杨氏弹性模量参考值：$Y ' = #mf("reference_modulus_pa") thin upright(N slash m ^(2))$。

$  L & = ( #mf("length_result_cm") plus.minus 0.1 ) thin upright("cm") ; & U _(r L) & = #mf("length_relative_percent") "%" , \  D & = ( #mf("distance_result_cm") plus.minus 0.2 ) thin upright("cm") ; & U _(r D) & = #mf("distance_relative_percent") "%" , \  K & = ( #mf("arm_result_cm") plus.minus 0.02 ) thin upright("cm") ; & U _(r K) & = #mf("arm_relative_percent") "%" .  $

 表 3.3.2 钢丝直径 $d$ 的测量

#report-table(columns: (.5fr, 1fr, 1fr, 1.65fr, 2.2fr), size: 9*tpt, stretch: 1.5, rules: "inner-grid", width: 95%,
  header: (table.cell(x: 0, y: 0)[$i$], table.cell(x: 1, y: 0)[初读数\ $d ' _(i)$(mm)], table.cell(x: 2, y: 0)[末读数\ $d ' ' _(i)$(mm)], table.cell(x: 3, y: 0)[$d _(i) = d ' ' _(i) - d ' _(i)$/mm], table.cell(x: 4, y: 0)[$v _(i) ^(2) = ( d _(i) - overline(d) ) ^(2)$\ ($10 ^(- 6)$ mm$"" ^(2)$)],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("diameter_initial_01")], table.cell(x: 2, y: 1)[#f("diameter_final_01")], table.cell(x: 3, y: 1)[#f("diameter_01")], table.cell(x: 4, y: 1)[#f("diameter_square_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("diameter_initial_02")], table.cell(x: 2, y: 2)[#f("diameter_final_02")], table.cell(x: 3, y: 2)[#f("diameter_02")], table.cell(x: 4, y: 2)[#f("diameter_square_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("diameter_initial_03")], table.cell(x: 2, y: 3)[#f("diameter_final_03")], table.cell(x: 3, y: 3)[#f("diameter_03")], table.cell(x: 4, y: 3)[#f("diameter_square_03")],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[#f("diameter_initial_04")], table.cell(x: 2, y: 4)[#f("diameter_final_04")], table.cell(x: 3, y: 4)[#f("diameter_04")], table.cell(x: 4, y: 4)[#f("diameter_square_04")],),
    (table.cell(x: 0, y: 5)[5], table.cell(x: 1, y: 5)[#f("diameter_initial_05")], table.cell(x: 2, y: 5)[#f("diameter_final_05")], table.cell(x: 3, y: 5)[#f("diameter_05")], table.cell(x: 4, y: 5)[#f("diameter_square_05")],),
    (table.cell(x: 0, y: 6, colspan: 4)[平均值 $overline(d) = #mf("diameter_mean_mm")$ mm], table.cell(x: 4, y: 6)[$sum v _(i) ^(2) = #mf("diameter_square_sum")$],),
  ))

 每级质量增量 $delta m = #mf("mass_step_kg")$ kg；预载 $#mf("preload_kg")$ kg 不计入 $m _(i)$。

$  u _(d A) & = 1.14 sqrt(frac(sum v _(i) ^(2), n ( n - 1 ))) = #mf("diameter_u_a") thin upright("mm") , \  u _(d B) & = frac(Delta _("仪" , d), sqrt(3)) = frac(#mf("diameter_error_mm"), sqrt(3)) = #mf("diameter_u_b") thin upright("mm") , \  U _(d) & = sqrt(u _(d A) ^(2) + u _(d B) ^(2)) = #mf("diameter_mean_u_mm") thin upright("mm") , \  U _(r d) & = frac(U _(d), overline(d)) times 100 "%" = #mf("diameter_relative_percent") "%" , \  U _(l A) & = 1.14 sqrt(frac(sum v _(i) ^(2), n ( n - 1 ))) = #mf("difference_u_a") thin upright("cm") , \  U _(l B) & = frac(Delta _("仪" , l), sqrt(3)) = frac(#mf("scale_error_cm"), sqrt(3)) = #mf("difference_u_b") thin upright("cm") , \  U _(l) & = sqrt(U _(l A) ^(2) + U _(l B) ^(2)) = #mf("difference_mean_u_cm") thin upright("cm") , \  U _(r l) & = frac(U _(l), overline(l _(i + 5) - l _(i))) times 100 "%" = #mf("difference_relative_percent") "%" .  $

#block(width: 100%, breakable: false, above: 0pt, below: 0pt)[
#section[7.2 图解法]

在以下毫米方格纸内绘制 $m$-$l$ 关系曲线，用图解法求出比值 $m slash l$。

注意作图要求，求斜率的两点要以不同描点符号在直线上标出，其坐标值也要在图中标出。

#plot(((points: points("young_graph_points"), label: [测量点], line: false, color: black),
 (points: points("young_graph_line"), label: [直线], marks: false),
 (points: points("young_graph_a"), label: [], line: false, color: red, mark: "square"),
 (points: points("young_graph_b"), label: [], line: false, color: red, mark: "triangle")),
 x-label: [$l$/cm], y-label: [$m$/kg], height: 6.9cm, width: 12.5cm, minor-grid: true, padding: 0.14, tick-size: 9*tpt,
 annotations: ((point: points("young_graph_a").first(), label: [A(#f("graph_a_l"), #f("graph_a_m"))]),
 (point: points("young_graph_b").first(), label: [B(#f("graph_b_l"), #f("graph_b_m"))])))
]

由图解法得：

$ frac(m, l) = frac(m _(B) - m _(A), l _(B) - l _(A)) = #mf("graph_slope_kg_cm") thin upright("kg" slash "cm") . $

求得钢丝的杨氏弹性模量：

$ Y _(1) = frac(8 L D g, pi d ^(2) K) dot.op frac(m, l) = #mf("young_graph_modulus_pa") thin upright("Pa") . $

百分差：

$ E _(0) = frac(| Y _(1) - Y ' |, Y ') times 100 "%" = #mf("young_graph_error_percent") "%" . $

#section[2. 用逐差法处理实验数据]

$ frac(m, l) = frac(5 delta m, overline(l _(i + 5) - l _(i))) = frac(#mf("difference_mass_kg"), #mf("difference_mean_cm")) = #mf("difference_slope_kg_cm") thin upright("kg" slash "cm") . $

$ Y _(2) = frac(8 L D g, pi d ^(2) K) dot.op frac(m, l) = #mf("young_modulus_pa") thin upright("Pa") . $

百分差：

$ E _(0) = frac(| Y _(2) - Y ' |, Y ') times 100 "%" = #mf("young_error_percent") "%" . $

#block(width: 100%, breakable: false, above: 0pt, below: 0pt)[
#section[3. 不确定度估算]

$ U _(r Y _(2)) = frac(U _(Y _(2)), Y _(2)) = sqrt(U _(r L) ^(2) + U _(r D) ^(2) + U _(r K) ^(2) + 4 U _(r d) ^(2) + U _(r l) ^(2)) = #mf("young_relative_percent") "%" . $

$ U _(Y _(2)) = U _(r Y _(2)) dot.op Y _(2) = #mf("young_uncertainty_pa") thin upright("Pa") . $

结果表示为：

$ Y _(2) plus.minus U _(Y _(2)) = ( #mf("young_modulus_pa") plus.minus #mf("young_uncertainty_pa") ) thin upright("Pa") , quad U _(r Y _(2)) = #mf("young_relative_percent") "%" . $

]

#section[8. 注意事项]

1\.#h(1em) 光杠杆与望远镜的目镜和物镜属光学器件，禁止用手触摸。光杠杆必须放置稳妥，以防掉落，打碎镜子；

2\.#h(1em) 调节望远镜时，要注意消除视差，即要求做到眼睛上下移动时，标尺读数相对十字叉丝无相对位移；

3\.#h(1em) 在加减砝码时要格外小心，做到轻拿轻放，避免震动产生较大的实验误差。光杠杆与望远镜调整好之后，实验过程中两者位置不能有任何移动。

#records()
