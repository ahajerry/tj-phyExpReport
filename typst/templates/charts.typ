// Editable vector charts using only the Typst standard library.
#import "base.typ": report, f, mf
#let points(key) = report.plots.at(key).map(p => (float(p.at(0)), float(p.at(1))))
#let mark(shape, color) = {
  if shape == "square" { square(size: 4pt, fill: color, stroke: none) }
  else if shape == "triangle" {
    curve(curve.move((0pt, 4pt)), curve.line((2pt, 0pt)), curve.line((4pt, 4pt)), curve.close(), fill: color, stroke: none)
  } else { circle(radius: 2pt, fill: color, stroke: none) }
}
#let plot(series, x-label: [], y-label: [], y-range: auto, annotations: (), height: 5cm) = {
  let width = 10.5cm
  let all = series.fold((), (all, s) => all + s.points)
  let xs = all.map(p => p.at(0))
  let ys = all.map(p => p.at(1))
  let xlo = calc.min(..xs)
  let xhi = calc.max(..xs)
  let ylo = if y-range == auto { calc.min(..ys) } else { y-range.at(0) }
  let yhi = if y-range == auto { calc.max(..ys) } else { y-range.at(1) }
  let xpad = if xhi == xlo { calc.max(calc.abs(xlo) * 0.1, 1) } else { (xhi - xlo) * 0.08 }
  let ypad = if yhi == ylo { calc.max(calc.abs(ylo) * 0.1, 1) } else { (yhi - ylo) * 0.1 }
  xlo -= xpad; xhi += xpad
  if y-range == auto { ylo -= ypad; yhi += ypad }
  let px(x) = (x - xlo) / (xhi - xlo) * width
  let py(y) = (yhi - y) / (yhi - ylo) * height
  let tick(v) = str(calc.round(v, digits: 3))
  block(breakable: false, above: 10pt, below: 10pt)[
    #set text(size: 8pt)
    #block(width: 100%, height: height + 2.1cm)[
      #place(top + left, dx: 1.8cm, dy: 0.65cm, block(width: width, height: height)[
        #for i in range(6) {
          let x = width * i / 5
          let y = height * i / 5
          place(top + left, dx: x, line(end: (0pt, height), stroke: 0.3pt + luma(210)))
          place(top + left, dy: y, line(end: (width, 0pt), stroke: 0.3pt + luma(210)))
          place(top + left, dx: x - 0.7cm, dy: height+3pt, box(width: 1.4cm, align(center, tick(xlo+(xhi - xlo)*i/5))))
          place(top + left, dx: -1.5cm, dy: y - 5pt, box(width: 1.35cm, align(right, tick(yhi - (yhi - ylo)*i/5))))
        }
        #place(top + left, line(end: (0pt, height), stroke: 0.6pt))
        #place(top + left, dy: height, line(end: (width, 0pt), stroke: 0.6pt))
        #for s in series {
          let color = s.at("color", default: blue)
          if s.at("line", default: true) {
            let steps = s.points.enumerate().map(((i, p)) => {
              let pos = (px(p.at(0)), py(p.at(1)))
              if i == 0 { curve.move(pos) } else { curve.line(pos) }
            })
            place(top + left, curve(..steps, stroke: (paint: color, thickness: 0.9pt, dash: s.at("dash", default: "solid"))))
          }
          if s.at("marks", default: true) {
            for p in s.points {
              place(top + left, dx: px(p.at(0)) - 2pt, dy: py(p.at(1)) - 2pt, mark(s.at("mark", default: "circle"), color))
            }
          }
        }
        #for a in annotations {
          place(top + left, dx: px(a.point.at(0))+3pt, dy: py(a.point.at(1))+3pt,
            box(fill: white, inset: 2pt, a.label))
        }
        #place(top + left, dy: -0.65cm, y-label)
        #place(top + left, dy: height+0.6cm, box(width: width, align(center, x-label)))
      ])
    ]
    #align(center, series.map(s => [
      #if s.at("marks", default: true) { mark(s.at("mark", default: "circle"), s.at("color", default: blue)) }
      #if s.at("line", default: true) { text(fill: s.at("color", default: blue))[━] }
      #s.label
    ]).join(h(6mm)))
  ]
}

#let lissajous() = {
  block(breakable: false, above: 6pt, below: 10pt, grid(columns: (1fr,) * 4, gutter: 4mm,
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
        #align(center, block(width: 2.5cm, height: 2cm, stroke: 0.4pt + gray)[#place(top+left, curve(..steps, stroke: 0.6pt+blue))])
        #v(3pt)
        #align(center, text(size: 8.5pt)[第 #i 组\ $f_y:f_x = #f("frequency_ratio_"+suffix)$])
      ]
    })))
}

#let scope-diagram() = {
  let node(body) = block(width: 2.2cm, height: 8mm, stroke: 0.5pt, align(center + horizon, body))
  align(center, block(breakable: false, above: 8pt, below: 8pt)[
    #grid(columns: (1.5cm, 2.2cm, 7mm, 2.2cm, 7mm, 2.2cm), rows: (auto, 8mm, auto), align: center + horizon,
      [Y 输入 →], node[垂直放大], grid.cell(colspan: 3)[──────────→], node[示波管],
      [], [↓], [], [], [], [↑],
      [], node[触发同步], [→], node[扫描发生器], [→], node[水平放大])
  ])
}
