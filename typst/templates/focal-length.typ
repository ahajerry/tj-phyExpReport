#import "base.typ": *
#import "charts.typ": *
#show: report-layout


#cover()

#section[实验目的]

1. 理解薄透镜成像公式及实物、虚物的物距符号，掌握三种凸透镜焦距测量方法。

2. 用物像距法、共轭法和自准直法分别测凸透镜焦距。

3. 比较方法间的一致性，识别光轴未对准、清晰像判断和透镜厚度带来的误差。

#section[实验原理]

各位置差均取绝对值：$u = | x _(L) - x _(O) |$、$v = | x _(I) - x _(L) |$、$L = | x _(I) - x _(O) |$、$D = | x _(L 2) - x _(L 1) |$，自准直法 $f = | x _(L) - x _(O) |$，不受导轨坐标方向影响。

薄透镜近轴成像满足 $frac(1, u) + frac(1, v) = frac(1, f)$；物像距法由 $f = frac(u v, u + v)$ 求焦距。共轭法固定物屏间距 $L > 4 f$，两次清晰成像的透镜位置差为 $D$，故 $f = frac(L ^(2) - D ^(2), 4 L)$。自准直法借助平面镜使返回像与物重合，此时物位于透镜焦平面。

#align(center, image("figures/lens-ray-diagrams.png", width: 10.3cm, fit: "contain"))

 共轭与自准直光路示意图。

#section[实验内容]

#subsection[调节与凸透镜测量]

1. 调整光源、透镜中心及屏幕中心共轴，记录各滑座位置时统一从同一刻线读取。

2. 物像距法记录三组物屏、透镜和像屏位置，前两次成放大像、第三次成缩小像；共轭法逐组固定物屏与像屏，记录成大像和成小像时的透镜位置；自准直法逐次调节平面镜使返回像与物重合，记录三组位置。

#section[实验仪器]

光学导轨、光源与物屏、凸透镜、平面镜及滑座。所有位置和距离输入均为 mm，混用 cm 会使报告结果错误。

#section[数据记录处理]

 物距像距法原始位置（mm）：

#report-table(columns: (1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[次数], table.cell(x: 1, y: 0)[物屏位置], table.cell(x: 2, y: 0)[透镜位置], table.cell(x: 3, y: 0)[像屏位置],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("single_object_01")], table.cell(x: 2, y: 1)[#f("single_lens_01")], table.cell(x: 3, y: 1)[#f("single_image_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("single_object_02")], table.cell(x: 2, y: 2)[#f("single_lens_02")], table.cell(x: 3, y: 2)[#f("single_image_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("single_object_03")], table.cell(x: 2, y: 3)[#f("single_lens_03")], table.cell(x: 3, y: 3)[#f("single_image_03")],),
  ))

 共轭法原始位置（mm）：

#report-table(columns: (1fr, 1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[次数], table.cell(x: 1, y: 0)[物屏位置], table.cell(x: 2, y: 0)[像屏位置], table.cell(x: 3, y: 0)[成大像时透镜位置], table.cell(x: 4, y: 0)[成小像时透镜位置],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("bessel_object_01")], table.cell(x: 2, y: 1)[#f("bessel_image_01")], table.cell(x: 3, y: 1)[#f("bessel_lens_large_01")], table.cell(x: 4, y: 1)[#f("bessel_lens_small_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("bessel_object_02")], table.cell(x: 2, y: 2)[#f("bessel_image_02")], table.cell(x: 3, y: 2)[#f("bessel_lens_large_02")], table.cell(x: 4, y: 2)[#f("bessel_lens_small_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("bessel_object_03")], table.cell(x: 2, y: 3)[#f("bessel_image_03")], table.cell(x: 3, y: 3)[#f("bessel_lens_large_03")], table.cell(x: 4, y: 3)[#f("bessel_lens_small_03")],),
  ))

单次成像（mm）：

#report-table(columns: (1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[次数], table.cell(x: 1, y: 0)[$u$], table.cell(x: 2, y: 0)[$v$], table.cell(x: 3, y: 0)[$f$],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("object_distance_01")], table.cell(x: 2, y: 1)[#f("image_distance_01")], table.cell(x: 3, y: 1)[#f("single_focus_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("object_distance_02")], table.cell(x: 2, y: 2)[#f("image_distance_02")], table.cell(x: 3, y: 2)[#f("single_focus_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("object_distance_03")], table.cell(x: 2, y: 3)[#f("image_distance_03")], table.cell(x: 3, y: 3)[#f("single_focus_03")],),
  ))

 共轭法（mm）：

#report-table(columns: (1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[次数], table.cell(x: 1, y: 0)[$L$], table.cell(x: 2, y: 0)[$D$], table.cell(x: 3, y: 0)[$f$],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("bessel_length_01")], table.cell(x: 2, y: 1)[#f("bessel_separation_01")], table.cell(x: 3, y: 1)[#f("bessel_focus_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("bessel_length_02")], table.cell(x: 2, y: 2)[#f("bessel_separation_02")], table.cell(x: 3, y: 2)[#f("bessel_focus_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("bessel_length_03")], table.cell(x: 2, y: 3)[#f("bessel_separation_03")], table.cell(x: 3, y: 3)[#f("bessel_focus_03")],),
  ))

 自准直法（位置读数，mm）：

#report-table(columns: (1fr, 1fr, 1fr, 1fr,), size: 8.5pt,
  header: (table.cell(x: 0, y: 0)[次数], table.cell(x: 1, y: 0)[物位], table.cell(x: 2, y: 0)[凸透镜位], table.cell(x: 3, y: 0)[$f$],),
  rows: (
    (table.cell(x: 0, y: 1)[1], table.cell(x: 1, y: 1)[#f("auto_object_01")], table.cell(x: 2, y: 1)[#f("auto_lens_01")], table.cell(x: 3, y: 1)[#f("auto_focus_01")],),
    (table.cell(x: 0, y: 2)[2], table.cell(x: 1, y: 2)[#f("auto_object_02")], table.cell(x: 2, y: 2)[#f("auto_lens_02")], table.cell(x: 3, y: 2)[#f("auto_focus_02")],),
    (table.cell(x: 0, y: 3)[3], table.cell(x: 1, y: 3)[#f("auto_object_03")], table.cell(x: 2, y: 3)[#f("auto_lens_03")], table.cell(x: 3, y: 3)[#f("auto_focus_03")],),
  ))

$  overline(f) _("single") & = ( #mf("focus_single_mean_mm") plus.minus #mf("focus_single_u_mm") ) thin upright(m m) , \  overline(f) _("Bessel") & = ( #mf("focus_bessel_mean_mm") plus.minus #mf("focus_bessel_u_mm") ) thin upright(m m) , \  overline(f) _("auto") & = ( #mf("focus_auto_mean_mm") plus.minus #mf("focus_auto_u_mm") ) thin upright(m m) .  $

 $u _(f)$ 为各方法重复测量的 A 类标准不确定度，未计入导轨读数和成像判断的系统误差。

#section[讨论与分析]

#subsection[各方法比较]

物像距法操作直观，但物距和像距都受清晰度判断影响；共轭法只需位置差，并应检查 $L > 4 f$；自准直法对返回像重合的判断较敏感。三法所得凸透镜焦距若明显不一致，应优先检查光轴共线和读数基准。

#subsection[思考题]

为何共轭法要求 $L > 4 f$？否则不存在两个可区分的清晰成像透镜位置。为何应在导轨上反复检查共轴？偏轴会造成像差和读数误判。

#section[实验结论]

凸透镜焦距由物像距法、共轭法和自准直法分别得到 $#mf("focus_single_mean_mm")$、$#mf("focus_bessel_mean_mm")$、$#mf("focus_auto_mean_mm") thin upright(m m)$。各值的重复测量标准不确定度见上式；结果需结合三法一致性评价。

#records()
