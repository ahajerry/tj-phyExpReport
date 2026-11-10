// Editable vector charts using only the Typst standard library.
#import "base.typ": report, f, mf, tpt, illustration
#let points(key) = report.plots.at(key).map(p => (float(p.at(0)), float(p.at(1))))
#let mark(shape, color) = {
  if shape == "square" { square(size: 4pt, fill: color, stroke: none) }
  else if shape == "triangle" {
    curve(curve.move((0pt, 4pt)), curve.line((2pt, 0pt)), curve.line((4pt, 4pt)), curve.close(), fill: color, stroke: none)
  } else { circle(radius: 2pt, fill: color, stroke: none) }
}
#let ticks(lo, hi, count: 5) = {
  let raw = (hi - lo) / count
  let power = calc.pow(10, calc.floor(calc.log(raw, base: 10)))
  let ratio = raw / power
  let step = (if ratio < 1.5 { 1 } else if ratio < 3.5 { 2 } else if ratio < 7.5 { 5 } else { 10 }) * power
  let first = calc.ceil(lo / step)
  let last = calc.floor(hi / step)
  range(int(first), int(last) + 1).map(i => calc.round(i*step, digits: 8))
}
#let plot(series, x-label: [], y-label: [], y-range: auto, annotations: (), height: 5.45cm, width: 11.3cm, legend: "left", minor-grid: false, padding: 0.1, tick-size: 10.5*tpt) = {
  let all = series.fold((), (all, s) => all + s.points)
  let xs = all.map(p => p.at(0))
  let ys = all.map(p => p.at(1))
  let xlo = calc.min(..xs)
  let xhi = calc.max(..xs)
  let ylo = if y-range == auto { calc.min(..ys) } else { y-range.at(0) }
  let yhi = if y-range == auto { calc.max(..ys) } else { y-range.at(1) }
  let xpad = if xhi == xlo { calc.max(calc.abs(xlo)*padding, 1) } else { (xhi - xlo)*padding }
  let ypad = if yhi == ylo { calc.max(calc.abs(ylo)*padding, 1) } else { (yhi - ylo)*padding }
  xlo -= xpad; xhi += xpad
  if y-range == auto { ylo -= ypad; yhi += ypad }
  let px(x) = (x - xlo)/(xhi - xlo)*width
  let py(y) = (yhi - y)/(yhi - ylo)*height
  let xticks = ticks(xlo, xhi, count: 8)
  let yticks = ticks(ylo, yhi)
  let tick(v) = text(size: tick-size, str(calc.round(v, digits: 4)))
  align(center, block(width: width + 1.7cm, height: height + 1.25cm, breakable: false, above: 10*tpt, below: 10*tpt)[
    #set text(size: 10.5*tpt)
    #set par(leading: 0pt, spacing: 0pt, justify: false)
    #place(top + left, dx: 1.35cm, dy: 0.15cm, block(width: width, height: height)[
      #if minor-grid {
        for (values, lo, hi, vertical) in ((xticks, xlo, xhi, true), (yticks, ylo, yhi, false)) {
          if values.len() > 1 {
            let step = (values.at(1) - values.at(0)) / 5
            for i in range(int(calc.ceil(lo/step)), int(calc.floor(hi/step)) + 1) {
              if vertical {
                place(top+left, dx: px(i*step), line(end: (0pt, height), stroke: 0.2*tpt+luma(232)))
              } else {
                place(top+left, dy: py(i*step), line(end: (width, 0pt), stroke: 0.2*tpt+luma(232)))
              }
            }
          }
        }
      }
      #for x in xticks {
        place(top + left, dx: px(x), line(end: (0pt, height), stroke: 0.3*tpt + luma(190)))
        place(top + left, dx: px(x), dy: height - 2*tpt, line(end: (0pt, 2*tpt), stroke: 0.4*tpt))
        place(top + left, dx: px(x)-0.65cm, dy: height + 4*tpt, box(width: 1.3cm, align(center, tick(x))))
      }
      #for y in yticks {
        place(top + left, dy: py(y), line(end: (width, 0pt), stroke: 0.3*tpt + luma(190)))
        place(top + left, dy: py(y), line(end: (2*tpt, 0pt), stroke: 0.4*tpt))
        place(top + left, dx: -1.1cm, dy: py(y)-5*tpt, box(width: 0.95cm, align(right, tick(y))))
      }
      #place(top + left, rect(width: width, height: height, stroke: 0.4*tpt, fill: none))
      #for s in series {
        let color = s.at("color", default: rgb("#0000ff"))
        if s.at("line", default: true) {
          let steps = s.points.enumerate().map(((i, p)) => {
            let pos = (px(p.at(0)), py(p.at(1)))
            if i == 0 { curve.move(pos) } else { curve.line(pos) }
          })
          place(top + left, curve(..steps, stroke: (paint: color, thickness: 0.8*tpt, dash: s.at("dash", default: "solid"))))
        }
        if s.at("marks", default: true) {
          for p in s.points {
            place(top + left, dx: px(p.at(0))-2pt, dy: py(p.at(1))-2pt, mark(s.at("mark", default: "circle"), color))
          }
        }
      }
      #for a in annotations {
        let right-half = a.point.at(0) > (xlo+xhi)/2
        place(top + left, dx: px(a.point.at(0)) + if right-half { -3.1cm } else { 3pt }, dy: py(a.point.at(1))+5pt,
          text(size: 9*tpt, fill: red, a.label))
      }
      #place(top + left, dx: -1.65cm, rotate(-90deg, reflow: true, box(width: height, align(center, y-label))))
      #place(top + left, dy: height + 0.65cm, box(width: width, align(center, x-label)))
      #let entries = series.filter(s => s.label != [])
      #if entries.len() > 0 {
        let key = block(fill: white, stroke: 0.4*tpt, inset: 3*tpt)[
          #set text(size: 9*tpt)
          #grid(columns: (14*tpt, auto), column-gutter: 3*tpt, row-gutter: 2*tpt, align: left+horizon,
            ..entries.map(s => {
              let color = s.at("color", default: rgb("#0000ff"))
              let symbol = box(width: 14*tpt, height: 4*tpt)[
                #if s.at("line", default: true) { place(top+left, dy: 2*tpt, line(length: 14*tpt, stroke: (paint: color, thickness: 0.8*tpt, dash: s.at("dash", default: "solid")))) }
                #if s.at("marks", default: true) { place(top+left, dx: 5*tpt, mark(s.at("mark", default: "circle"), color)) }
              ]
              (symbol, s.label)
            }).flatten())
        ]
        place(top + if legend == "right" { right } else { left }, dx: if legend == "right" { -3*tpt } else { 3*tpt }, dy: 3*tpt, key)
      }
    ])
  ])
}

#let lissajous() = {
  align(center, block(breakable: false, above: 6pt, below: 10pt, grid(columns: (2.5cm,) * 4, gutter: 0.7cm,
    ..range(1, 5).map(i => {
      let suffix = (if i < 10 { "0" } else { "" }) + str(i)
      // Go already provides a reduced integer ratio. Raw readings may be "1.00"
      // or "1e0" and must remain unchanged in the measurement table.
      let ratio = report.fields.at("frequency_ratio_" + suffix).split(":").map(int)
      let p = ratio.at(0)
      let q = ratio.at(1)
      let samples = 48 * calc.max(p, q)
      let steps = range(samples+1).map(j => {
        let t = j / samples * 360deg
        let pos = (1.25cm + 1.1cm*calc.sin(q*t+30deg), 1cm - 0.85cm*calc.sin(p*t))
        if j == 0 { curve.move(pos) } else { curve.line(pos) }
      })
      block(height: 3.2cm)[
        #set text(size: 9*tpt, font: ("Latin Modern Roman 9", "FandolSong"))
        #set par(leading: 2*tpt, spacing: 0pt, justify: false)
        #block(width: 2.5cm, height: 2cm, stroke: 0.4*tpt + gray)[#place(top+left, curve(..steps, stroke: 0.4*tpt+rgb("#0000ff")))]
        #place(top+left, dy: 2cm + 2*tpt, block(width: 2.5cm)[
          #align(center)[第 #suffix 组\ $f_y:f_x = #f("frequency_ratio_"+suffix)$]
        ])
      ]
    }))))
}

// Draw connectors as vectors: Unicode dashes/arrows depend on text layout.
#let arrow(from, to) = {
  let delta = (to.at(0)-from.at(0), to.at(1)-from.at(1))
  let a = calc.atan2(delta.at(1)/1pt, delta.at(0)/1pt)
  place(top + left, dx: from.at(0), dy: from.at(1), line(end: delta, stroke: 0.4*tpt))
  for angle in (-25deg, 25deg) {
    place(top + left, dx: to.at(0), dy: to.at(1),
      line(end: (-3*tpt*calc.cos(a+angle), -3*tpt*calc.sin(a+angle)), stroke: 0.4*tpt))
  }
}
#let scope-diagram() = illustration(
  block(width: 10.8cm, height: 2.2cm)[
    #set text(size: 9*tpt)
    #set par(justify: false)
    #for (x, y, label) in ((2.4, 0, [垂直放大]), (2.4, 1.4, [触发同步]), (5.4, 1.4, [扫描发生器]), (8.4, 1.4, [水平放大]), (8.4, 0, [示波管])) {
      place(top + left, dx: x*1cm, dy: y*1cm,
        block(width: 2.2cm, height: 0.8cm, stroke: 0.4*tpt, align(center + horizon, label)))
    }
    #place(top + left, dy: 0.25cm, box(width: 1.05cm, align(right)[Y 输入]))
    #arrow((1.1cm, 0.4cm), (2.4cm, 0.4cm))
    #arrow((4.6cm, 0.4cm), (8.4cm, 0.4cm))
    #arrow((3.5cm, 0.8cm), (3.5cm, 1.4cm))
    #arrow((4.6cm, 1.8cm), (5.4cm, 1.8cm))
    #arrow((7.6cm, 1.8cm), (8.4cm, 1.8cm))
    #arrow((9.5cm, 1.4cm), (9.5cm, 0.8cm))
  ], [示波器扫描与触发的简化结构。], size: 9*tpt)
