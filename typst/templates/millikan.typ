#import "base.typ": *
#import "charts.typ": *
#show: report-layout


#cover()

#section[实验目的]

1. 观察带电油滴在重力和电场力作用下的运动，用平衡电压与下降时间估计油滴电荷量。

2. 理解电荷量子化假设 $q _(i) approx n _(i) e$，并用多颗油滴检查整数倍关系。

3. 分别用反向验证、图解拟合和过原点最小二乘法估计元电荷，比较三种处理方式。

4. 练习识别布朗运动、油滴蒸发和计时误差对结果的影响。

#section[实验原理]

#subsection[3.1 静态平衡法]

用喷雾器将油滴喷入两块相距为 $d$ 的水平放置的平行板之间，如图 8.3.1 所示，油滴在喷射时由于摩擦会带有电荷。设油滴的质量为 $m$，所带电量为 $Q$，两极板间所加的电压为 $U$，则油滴在平行板间将同时受到两个力的作用，一个是重力 $m g$，一个是静电力 $Q E = Q U / d$，两个力的方向如图所示。

#align(center, image("figures/millikan-static-source.png", width: 9cm, fit: "contain"))

 图 8.3.1 静态法测量原理图

如果调节两极板间的电压 $U$，可使两力相互抵消而达到平衡，此时 $m g = Q U / d$，故有

#math.equation(block: true, numbering: n => "(8.3.1)", $Q = m g frac(d, U) .$)

平行板未加电压时，油滴受重力作用而加速下降，但空气对油滴所产生的黏滞阻力 $F _(r)$ 与速度成正比。油滴走了一段距离到达某一速度 $v _(g)$ 后，黏滞阻力与重力平衡（空气浮力忽略不计），油滴将匀速下降，由斯托克斯定律可知

#math.equation(block: true, numbering: n => "(8.3.2)", $F _(r) = 6 pi a eta v _(g) = m g .$)

式中，$eta$ 是空气的黏度，$a$ 是油滴的半径（由于表面张力的原因，油滴近乎呈小球状）。设油滴的密度为 $rho$，则油滴的质量 $m$ 可表示为

#math.equation(block: true, numbering: n => "(8.3.3)", $m = frac(4, 3) pi a ^(3) rho .$)

合并式 (8.3.2) 和式 (8.3.3)，得油滴的半径为

#math.equation(block: true, numbering: n => "(8.3.4)", $a = sqrt(frac(9 eta v _(g), 2 rho g)) .$)

对于半径很小的油滴（直径约为 $10 ^(- 6)$ m），空气已经不能视为连续介质。考虑空气分子的平均自由程与大气压强成正比等因素，斯托克斯定律应修正为

#math.equation(block: true, numbering: n => "(8.3.5)", $F _(r) = frac(6 pi a eta v _(g), 1 + frac(b, p a)) .$)

式中，$b$ 为一修正常数，$b = 8.22 times 10 ^(- 3)$ m$dot.op$Pa，$p$ 为大气压强，单位为 Pa。于是得

#math.equation(block: true, numbering: n => "(8.3.6)", $a = sqrt(frac(9 eta v _(g), 2 rho g)  ( frac(1, 1 + frac(b, p a))  )) .$)

上式根号中还包含油滴的半径 $a$，但因它是处于修正项中，不需要十分精确，故它仍可用式 (8.3.4) 计算。将式 (8.3.5) 代入式 (8.3.3)，得

#math.equation(block: true, numbering: n => "(8.3.7)", $m = frac(4, 3) pi  [ frac(9 eta v _(g), 2 rho g) frac(1, 1 + frac(b, p a))  ] ^(3 / 2) rho .$)

当两极板间的电压 $U = 0$ 时，设油滴匀速下降的距离为 $l$，时间为 $t$，则

#math.equation(block: true, numbering: n => "(8.3.8)", $v _(g) = frac(l, t) .$)

由式 (8.3.1)、(8.3.6)、(8.3.7) 得

#math.equation(block: true, numbering: n => "(8.3.9)", $Q = frac(18 pi, sqrt(2 rho g))  [ frac(eta l, t  ( 1 + frac(b, p a)  ))  ] ^(3 / 2) frac(d, U) .$)

式中 $eta$、$l$、$rho$、$g$、$d$ 均为与实验条件、仪器有关的参量，均为已知量，只需测出平衡电压 $U _(n)$ 和油滴匀速下落 $l$ 所用时间 $t$，即可求出油滴带电量 $Q$。
将式 (8.3.4) 代入式 (8.3.9)，并引入 $k$ 和 $k '$ 后计算式为

#math.equation(block: true, numbering: n => "(8.3.10)", $Q = frac(k,  [ t  ( 1 + k ' sqrt(t)  )  ] ^(3 / 2)) frac(1, U) .$)

式中

#math.equation(block: true, numbering: n => "(8.3.11)", $k = frac(18 pi, sqrt(2 rho g)) ( eta l ) ^(3 / 2) d ,$)

和

#math.equation(block: true, numbering: n => "(8.3.12)", $k ' = frac(b, p) sqrt(frac(2 rho g, 9 eta l)) .$)

实验发现，对于同一油滴，如果我们改变它所带的电量，则能够使油滴达到平衡的电压 $U$，必须是某些特定的值 $U _(n)$，这表示与它相对应的电量 $Q$ 是不连续的，即

#math.equation(block: true, numbering: n => "(8.3.13)", $Q _(n) = n e = m g frac(d, U _(n)) .$)

式中，$n = plus.minus 1 , thin plus.minus 2 , thin dots.h$。对于不同的油滴，可以发现有同样的规律，而且 $e$ 值是 $Q _(1) , Q _(2) , dots.h , Q _(n)$ 的最大公约数，这就证明了电荷的不连续性，并存在着最小的带电单位，即电子的电荷值 $e$。

#subsection[实验参数与计算常数]

实验参数如表 8.3.1 所示。

表 8.3.1 密立根油滴实验参数表

#report-table(columns: (1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[名称], table.cell(x: 1, y: 0)[参数],),
  rows: (
    (table.cell(x: 0, y: 1)[极板间距 $d$(m)], table.cell(x: 1, y: 1)[$5 times 10 ^(- 3)$],),
    (table.cell(x: 0, y: 2)[油滴匀速下落距离 $l$(m)], table.cell(x: 1, y: 2)[$1.6 times 10 ^(- 3)$],),
    (table.cell(x: 0, y: 3)[空气黏度 $eta$(kg$dot.op$m$"" ^(- 1) dot.op$s$"" ^(- 1)$)], table.cell(x: 1, y: 3)[$1.83 times 10 ^(- 5)$],),
    (table.cell(x: 0, y: 4)[20$"" ^(degree)$C 钟表油密度 $rho _(1)$(kg$dot.op$m$"" ^(- 3)$)], table.cell(x: 1, y: 4)[$981$],),
    (table.cell(x: 0, y: 5)[标准状况下空气密度 $rho _(2)$(kg$dot.op$m$"" ^(- 3)$)], table.cell(x: 1, y: 5)[$1.2928$],),
    (table.cell(x: 0, y: 6)[上海地区重力加速度 $g$(m$dot.op$s$"" ^(- 2)$)], table.cell(x: 1, y: 6)[$9.794$],),
    (table.cell(x: 0, y: 7)[修正常数 $b$(m$dot.op$Pa)], table.cell(x: 1, y: 7)[$8.23 times 10 ^(- 3)$],),
    (table.cell(x: 0, y: 8)[标准大气压强 $p$(Pa)], table.cell(x: 1, y: 8)[$1.01325 times 10 ^(5)$],),
  ))

将以上参数代入公式 (8.3.11) 和 (8.3.12) 得

#math.equation(block: true, numbering: n => "(8.3.17)", $k = 0.928 times 10 ^(- 14) thin upright(k g dot.op m ^(2) dot.op s ^(- 1 / 2)) ,$)

和

#math.equation(block: true, numbering: n => "(8.3.18)", $k ' = 0.0226 thin upright(s ^(- 1 / 2)) .$)

将 $k$ 和 $k '$ 代入式 (8.3.10) 得

#math.equation(block: true, numbering: n => "(8.3.19)", $Q = frac(0.928 times 10 ^(- 14),  [ t  ( 1 + 0.0226 sqrt(t)  )  ] ^(3 / 2)) frac(1, U _(n)) .$)

显然，由于油滴的密度 $rho$、空气的黏度 $eta$ 都是温度的函数，大气压强 $p$ 又随实验地点和条件的变化而变化。因此，上式的计算是近似的。一般情况下，由于它们引起的误差仅 1% 左右，可以使计算大为简化，当然也可以实验时实际参数代入公式进行计算。

#subsection[4.2 元电荷的测量方法]

密立根油滴法测量电子电量，必须通过实验取得大量的实验数据，综合地运用分析统计的方法，才能正确地估算出实验结果。常见方法有模糊统计法、反向验证法和最小二乘法等。

#subsection[（1）模糊统计法]

假如通过测量并计算得到一组（20 个以上）油滴所带的电量值 $Q _(1) , Q _(2) , Q _(3) , dots.h , Q _(m)$。把这些数据标在数轴上，通过图形可以直观地看到数据形成疏密有致、一簇一簇的有序分布，如图 8.3.5 所示。其中间距较大的应该是基本电荷数 $n$ 的差异，而间距较小的应该是测量随机误差形成的差异。对同一簇数据求平均，可得一组按不同基本电荷数排列的数据 $q _(1) , q _(2) , dots.h , q _(n)$。

#align(center, image("figures/millikan-charge-axis-source.png", width: 10cm, fit: "contain"))

 图 8.3.5 油滴电荷量数轴示意图

对这些数据进行逐差处理，也即 $e _(1) = Q _(2) - Q _(1)$，$e _(2) = Q _(3) - Q _(2)$，$dots.h$，$e _(n) = Q _(n) - Q _(n - 1)$。只要测量数据足够多，通过分析差值结果，可以得出结论，最小差值 $e$ 的平均值是电子电量的最佳估计值。以上得到的结果仅是一个粗略的估计值。

#subsection[（2）反向验证法]

将油滴所带的电量值 $Q _(i) thin ( i = 1 , 2 , dots.h , m )$ 分别除以公认的电子电荷 $e _(0) = 1.602 times 10 ^(- 19)$ C，把得到的商按修约规则取整数可得第 $i$ 颗油滴所带的基本电荷数 $n _(i)$。

#math.equation(block: true, numbering: n => "(8.3.20)", $n _(i) = frac(Q _(i), e _(0)) quad "（取整）" .$)

再用 $n _(i)$ 去除 $Q _(i)$ 得到的值即为实验测量的电子电荷值 $e _(i)$。偏差为

#math.equation(block: true, numbering: n => "(8.3.21)", $Delta e _(i) = e _(i) - e _(0) .$)

$m$ 个油滴电子电荷平均值

#math.equation(block: true, numbering: n => "(8.3.22)", $overline(e) _(i) = frac(1, m) sum _(i = 1) ^(m) frac(Q _(i), n _(i)) .$)

不确定度

#math.equation(block: true, numbering: n => "(8.3.23)", $U _(e) = t sqrt(frac(sum _(i = 1) ^(m) ( Delta e _(i) ) ^(2), m ( m - 1 ))) .$)

也可以通过绘制 $Q$--$n$ 关系图，求出直线的斜率 $Delta Q / Delta n$，即电荷值。

#subsection[（3）最小二乘法]

设 $y _(i) = Q _(i) thin ( i = 1 , 2 , dots.h , m )$，拟合值 $hat(y) _(i) = e n _(i)$，则

#math.equation(block: true, numbering: n => "(8.3.24)", $y _(i) - hat(y) _(i) = Q _(i) - e n _(i) .$)

式 (8.3.24) 等式两边求平方和，可得

#math.equation(block: true, numbering: n => "(8.3.25)", $S = sum _(i = 1) ^(m) ( y _(i) - hat(y) _(i) ) ^(2) = sum _(i = 1) ^(m) ( Q _(i) - e n _(i) ) ^(2) .$)

要使 $S$ 为最小值，可以 $e$ 作为变量，对方程左式求导，并令导数为 0，以期求得使 $sum _(i) ( Q _(i) - e n _(i) ) ^(2)$ 为最小值的 $e$，也即电子电量实验值 $e$ 的最优值，即

#math.equation(block: true, numbering: n => "(8.3.26)", $frac(upright(d) S, upright(d) e) = frac(upright(d), upright(d) e) sum _(i = 1) ^(m) ( Q _(i) - e n _(i) ) ^(2) = 0.$)

求导数，得

#math.equation(block: true, numbering: n => "(8.3.27)", $sum _(i = 1) ^(m) n _(i) Q _(i) - sum _(i = 1) ^(m) e n _(i) ^(2) = 0.$)

解方程得到电子电量最优值为

#math.equation(block: true, numbering: n => "(8.3.28)", $e = frac(sum _(i = 1) ^(m) n _(i) Q _(i), sum _(i = 1) ^(m) n _(i) ^(2)) .$)

其不确定度为

#math.equation(block: true, numbering: n => "(8.3.29)", $U _(e) = t sqrt(frac(sum _(i = 1) ^(m) ( Q _(i) / n _(i) - e ) ^(2), m ( m - 1 ))) .$)

#section[实验内容]

#subsection[观测准备]

1. 检查油滴盒清洁、照明、显微镜调焦和极板电压零点；喷入少量油雾，选取孤立且运动缓慢的油滴。

2. 标定目镜中的固定下降距离。关闭电场，待油滴运动稳定后计时；同一滴重复四次，若轨迹偏离或油滴消失，应重新选滴。

#subsection[平衡与重复测量]

3. 逐渐增大电压，使油滴尽可能悬浮，记录平衡电压。对多颗油滴重复下降计时与电压测量。

4. 分别计算 $q _(i)$、整数 $n _(i)$ 和 $frac(q _(i), n _(i))$；绘制散点与拟合直线，比较反向验证值、图解斜率和最小二乘结果。

#section[实验仪器]

密立根油滴仪（油滴盒、电极板、照明及显微镜）、喷油器、计时器和直流高压电源。极板间距、空气黏度与修正常数已包含在仪器给定的计算常数中。

#section[7 数据记录与处理]

#subsection[7.1 静态平衡法]

#subsection[（1）模糊统计法]

选择合适的油滴，每颗油滴重复测量 4 组下降时间 $t$ 和平衡电压 $U$，下降八格，即 $l = 1.6$ mm。计算油滴所带电荷量 $Q _(i)$，填入表 8.3.2。每滴采用四次下降时间和平衡电压的均值。

表 8.3.2 静态平衡法数据记录表

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr, 1fr, 1fr, 1fr, 1fr,), size: 7.5pt,
  header: (table.cell(x: 0, y: 0)[$m$], table.cell(x: 1, y: 0)[$U$(V)], table.cell(x: 2, y: 0)[$t _(1)$(s)], table.cell(x: 3, y: 0)[$t _(2)$(s)], table.cell(x: 4, y: 0)[$t _(3)$(s)], table.cell(x: 5, y: 0)[$t _(4)$(s)], table.cell(x: 6, y: 0)[$overline(t)$(s)], table.cell(x: 7, y: 0)[$Q _(i)$($times 10 ^(- 19)$ C)], table.cell(x: 8, y: 0)[$n _(i)$],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("voltage_01")], table.cell(x: 2, y: 1)[#f("time_01_1")], table.cell(x: 3, y: 1)[#f("time_01_2")], table.cell(x: 4, y: 1)[#f("time_01_3")], table.cell(x: 5, y: 1)[#f("time_01_4")], table.cell(x: 6, y: 1)[#f("time_mean_01")], table.cell(x: 7, y: 1)[#f("charge_scaled_01")], table.cell(x: 8, y: 1)[#f("electron_count_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("voltage_02")], table.cell(x: 2, y: 2)[#f("time_02_1")], table.cell(x: 3, y: 2)[#f("time_02_2")], table.cell(x: 4, y: 2)[#f("time_02_3")], table.cell(x: 5, y: 2)[#f("time_02_4")], table.cell(x: 6, y: 2)[#f("time_mean_02")], table.cell(x: 7, y: 2)[#f("charge_scaled_02")], table.cell(x: 8, y: 2)[#f("electron_count_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("voltage_03")], table.cell(x: 2, y: 3)[#f("time_03_1")], table.cell(x: 3, y: 3)[#f("time_03_2")], table.cell(x: 4, y: 3)[#f("time_03_3")], table.cell(x: 5, y: 3)[#f("time_03_4")], table.cell(x: 6, y: 3)[#f("time_mean_03")], table.cell(x: 7, y: 3)[#f("charge_scaled_03")], table.cell(x: 8, y: 3)[#f("electron_count_03")],),
    (table.cell(x: 0, y: 4)[4], table.cell(x: 1, y: 4)[#f("voltage_04")], table.cell(x: 2, y: 4)[#f("time_04_1")], table.cell(x: 3, y: 4)[#f("time_04_2")], table.cell(x: 4, y: 4)[#f("time_04_3")], table.cell(x: 5, y: 4)[#f("time_04_4")], table.cell(x: 6, y: 4)[#f("time_mean_04")], table.cell(x: 7, y: 4)[#f("charge_scaled_04")], table.cell(x: 8, y: 4)[#f("electron_count_04")],),
    (table.cell(x: 0, y: 5)[5], table.cell(x: 1, y: 5)[#f("voltage_05")], table.cell(x: 2, y: 5)[#f("time_05_1")], table.cell(x: 3, y: 5)[#f("time_05_2")], table.cell(x: 4, y: 5)[#f("time_05_3")], table.cell(x: 5, y: 5)[#f("time_05_4")], table.cell(x: 6, y: 5)[#f("time_mean_05")], table.cell(x: 7, y: 5)[#f("charge_scaled_05")], table.cell(x: 8, y: 5)[#f("electron_count_05")],),
    (table.cell(x: 0, y: 6)[6], table.cell(x: 1, y: 6)[#f("voltage_06")], table.cell(x: 2, y: 6)[#f("time_06_1")], table.cell(x: 3, y: 6)[#f("time_06_2")], table.cell(x: 4, y: 6)[#f("time_06_3")], table.cell(x: 5, y: 6)[#f("time_06_4")], table.cell(x: 6, y: 6)[#f("time_mean_06")], table.cell(x: 7, y: 6)[#f("charge_scaled_06")], table.cell(x: 8, y: 6)[#f("electron_count_06")],),
    (table.cell(x: 0, y: 7)[7], table.cell(x: 1, y: 7)[#f("voltage_07")], table.cell(x: 2, y: 7)[#f("time_07_1")], table.cell(x: 3, y: 7)[#f("time_07_2")], table.cell(x: 4, y: 7)[#f("time_07_3")], table.cell(x: 5, y: 7)[#f("time_07_4")], table.cell(x: 6, y: 7)[#f("time_mean_07")], table.cell(x: 7, y: 7)[#f("charge_scaled_07")], table.cell(x: 8, y: 7)[#f("electron_count_07")],),
    (table.cell(x: 0, y: 8)[8], table.cell(x: 1, y: 8)[#f("voltage_08")], table.cell(x: 2, y: 8)[#f("time_08_1")], table.cell(x: 3, y: 8)[#f("time_08_2")], table.cell(x: 4, y: 8)[#f("time_08_3")], table.cell(x: 5, y: 8)[#f("time_08_4")], table.cell(x: 6, y: 8)[#f("time_mean_08")], table.cell(x: 7, y: 8)[#f("charge_scaled_08")], table.cell(x: 8, y: 8)[#f("electron_count_08")],),
  ))

求各电荷量的近似最大公约数，估计基本电荷 $e$，并与公认值比较计算百分差。测量有误差，不对有限小数直接求精确最大公约数。计算过程采用公认值
$e _("ref") = 1.602176634 times 10 ^(- 19)$ C 辅助判定

$ n _(i) = max brace.l 1 , "round" ( Q _(i) / e _("ref") ) brace.r , quad quad Q _(i) approx n _(i) e _(0) . $

在表列整数倍数固定后，以 $sum _(i) ( Q _(i) - n _(i) e _(0) ) ^(2)$ 最小确定近似公约数，得

$ e _(0) = frac(sum _(i) n _(i) Q _(i), sum _(i) n _(i) ^(2)) = #mf("electron_charge_common") thin upright(C) , quad quad E = frac(| e _(0) - e _("ref") |, e _("ref")) times 100 "%" = #f("common_error_percent") "%" . $

此整数判定依赖公认值，近似公约数与下述最小二乘法共用同一组 $n _(i)$，不能作为独立的电荷量子化验证。应结合各滴读数及图形复核整数倍数。

#subsection[（2）反向验证法]

$ e _(i) = frac(Q _(i), n _(i)) , quad quad overline(e) = frac(1, m) sum _(i = 1) ^(m) frac(Q _(i), n _(i)) = #mf("electron_charge_reverse_95") thin upright(C) . $

$ Delta e _(i) = e _(i) - overline(e) , quad quad U _(e) = t sqrt(frac(sum _(i = 1) ^(m) ( Delta e _(i) ) ^(2), m ( m - 1 ))) = #mf("electron_charge_reverse_u95") thin upright(C) . $

本次有效油滴数 $m = #f("oil_drop_count")$，取双侧 95% 置信水平、自由度 $m - 1$，$t = #f("student_t_95")$；与公认值的百分差为 $#f("reverse_error_percent") "%"$。

#subsection[（3）图解法]

绘制 $Q$--$n$ 曲线，通过拟合直线方程 $Q = e n + b$ 求得 $e$ 值，并与公认值比较计算百分差。

$ e = ( #mf("electron_charge_graph") plus.minus #mf("electron_charge_graph_u") ) thin upright(C) , quad quad b = #mf("electron_charge_graph_intercept") thin upright(C) , quad quad E = #f("graph_error_percent") "%" . $

图中横轴为 $n _(i)$，纵轴为 $Q _(i) / ( 10 ^(- 19) thin upright(C) )$；散点和拟合线均由本次读数计算。斜率所附误差为拟合标准不确定度。

#plot(((points: points("charge_graph_points"), label: [油滴数据], line: false), (points: points("charge_graph_fit_points"), label: [线性拟合], marks: false, color: red)), x-label: [$n_i$], y-label: [$Q_i/(10^(-19) upright(C))$])

#subsection[（4）最小二乘法]

$ e = frac(sum _(i = 1) ^(m) n _(i) Q _(i), sum _(i = 1) ^(m) n _(i) ^(2)) = #mf("electron_charge_ls_95") thin upright(C) . $

$ U _(e) = t sqrt(frac(sum _(i = 1) ^(m) ( Q _(i) / n _(i) - e ) ^(2), m ( m - 1 ))) = #mf("electron_charge_ls_u95") thin upright(C) . $

按讲义公式计算不确定度，$t$ 与反向验证法相同。与公认值的百分差为 $#f("ls_error_percent") "%"$。

#section[讨论与分析]

#subsection[图形与数值的对照]

图中每个散点都来自一颗油滴的四次平均下降时间与平衡电压。若某点明显偏离拟合线，应回查该滴是否发生蒸发、带电量跳变或布朗运动；不应只为得到整齐直线而删去读数。图解法允许非零截距，过原点最小二乘法则强制符合 $q = n e$，两种斜率的差异可以反映系统偏差。

#subsection[主要误差与改进]

下降时间过短会放大按表计时的相对误差；平衡状态的人工判断、极板电压波动、空气流动及焦平面变化也影响结果。选取运动较慢且稳定的油滴，保持油滴盒清洁并多次计时，可减小这些影响。

#subsection[思考题]

为何测量多颗油滴？单颗油滴只能给出一个电荷估计，无法可靠检验整数倍规律。为何先记录自由下降时间再调节平衡电压？下降速度用于估计油滴尺寸和有效重力，平衡电压再确定所带电荷量。

#section[实验结论]

本次实验以多颗油滴检验电荷量子化。反向验证得到 $e _("rev") = ( #mf("electron_charge_reverse") plus.minus #mf("electron_charge_reverse_u") ) thin upright(C)$，图解拟合斜率为 $e _("graph") = ( #mf("electron_charge_graph") plus.minus #mf("electron_charge_graph_u") ) thin upright(C)$，过原点最小二乘结果为 $e _("ls") = ( #mf("electron_charge_ls") plus.minus #mf("electron_charge_ls_u") ) thin upright(C)$。三种结果应结合散点分布与不确定度比较。

#records()
