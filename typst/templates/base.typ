// Shared report layout. User input is JSON data, never executable markup.
#let report = json("data.json")
#let f(key) = {
  let value = report.fields.at(key, default: "")
  if value == "" { underline(h(1.35cm)) } else { text(value) }
}
#let mf(key) = {
  let value = report.fields.at(key, default: "")
  if value.match(regex("^[+-]?[0-9]+(\\.[0-9]*)?[eE][+-]?[0-9]+$")) != none {
    let parts = value.split(regex("[eE]"))
    $ #text(parts.at(0)) times 10^(#text(str(int(parts.at(1))))) $
  } else { f(key) }
}
#let ix(key, index) = key + "_" + (if index < 10 { "0" } else { "" }) + str(index)
#let fi(key, index) = f(ix(key, index))
#let mi(key, index) = mf(ix(key, index))
#let count(key) = report.data.at(key, default: ()).len()

// TeX uses 72.27 points per inch; Typst uses 72. Keep physical sizes equal.
#let tpt = 72 / 72.27 * 1pt
#let serif = ("Latin Modern Roman", "FandolSong")
#let hei = ("Latin Modern Roman", "FandolHei")
#let sound = report.title == "声速测定"
#let young = report.title == "金属丝杨氏模量的测定"
#let body-baseline = (if sound { 18 } else { 20 }) * tpt
#let paragraph-gap = (if sound or young { 0 } else { 2 }) * tpt
#let report-title = if young { "杨氏模量的测量" } else { report.title }

#let binding-line() = {
  for i in range(39) {
    let y = 2.85cm + i * 0.52cm
    if (13, 19, 25).contains(i) {
      place(top + left, dx: 1.05cm - 5.25*tpt, dy: y - 5.25*tpt,
        text(font: serif, size: 10.5*tpt, ("装", "订", "线").at(calc.quo(i - 13, 6))))
    } else {
      place(top + left, dx: 1.05cm, dy: y - 0.2cm,
        line(end: (0pt, 0.4cm), stroke: (paint: black, thickness: 0.35*tpt, dash: (1.2*tpt, 1.8*tpt))))
    }
  }
}

#let report-layout(body) = {
  set document(title: report.title + "实验报告", date: none)
  set text(font: serif, lang: "zh", size: 10.5*tpt,
    top-edge: 0.88em, bottom-edge: -0.12em, overhang: false)
  set par(leading: body-baseline - 10.5*tpt,
    spacing: body-baseline - 10.5*tpt + paragraph-gap, justify: true)
  show math.equation: set text(font: "Latin Modern Math")
  show math.equation.where(block: true): set block(above: 10*tpt, below: 10*tpt)
  set page(paper: "a4", margin: (x: 3.175cm, y: 2.54cm),
    header-ascent: 18.7pt, footer-descent: 27.3pt,
    background: context { if counter(page).get().first() > 1 { binding-line() } },
    header: context { if counter(page).get().first() > 1 { line(length: 100%, stroke: 0.4*tpt) } },
    footer: context {
      if counter(page).get().first() > 1 {
        align(center, [第#counter(page).display()页#h(1em)共#counter(page).final().first()页])
      }
    })
  set heading(numbering: none)
  show heading: set text(size: 10.5*tpt)
  show heading.where(level: 1): set text(font: hei, weight: "regular")
  show heading.where(level: 2): set text(font: if sound { hei } else { serif }, weight: if sound { "regular" } else { "bold" })
  show heading.where(level: 1): set block(above: (if sound { 0.7 } else { 0.35 })*body-baseline + body-baseline - 10.5*tpt + paragraph-gap,
    below: body-baseline - 10.5*tpt + paragraph-gap + if sound { 0.15*body-baseline } else { 0pt })
  show heading.where(level: 2): set block(above: (if sound { 0.35 } else { 0.2 })*body-baseline + body-baseline - 10.5*tpt + paragraph-gap,
    below: body-baseline - 10.5*tpt + paragraph-gap)
  body
}

#let cover() = {
  // The cover is a fixed form. Coordinates are relative to the original A4
  // text area, so font metrics cannot collapse the 48 TeX-point form rows.
  block(width: 100%, height: 23cm)[
    #place(top + center, dy: 57.5pt - if sound or young { 2pt } else { 0pt }, image("tongji_logo.jpeg", width: 8.184cm))
    #place(top + center, dy: 124.6pt - if sound or young { 4pt } else { 0pt },
      text(font: "Latin Modern Roman 12", size: 18*tpt, weight: "bold")[TONGJI UNIVERSITY])
    #place(top + center, dy: 197.3pt - if sound or young { 6pt } else { 0pt },
      text(font: hei, size: 36*tpt)[物理实验报告])
    #{
      let y = 315.5pt - if sound or young { 8pt } else { 0pt }
      for (label, key) in (([实验名称], "experiment"), ([学生姓名], "student"), ([学#h(1em)号], "student_id"), ([组#h(1em)号], "group"), ([实验日期], "date")) {
        let value = if key == "experiment" { report.title } else { report.fields.at(key, default: "") }
        place(top + left, dy: y, text(font: hei, size: 18*tpt, label))
        place(top + left, dx: 3.3cm, dy: y, block(width: 8.8cm)[
          #set text(font: hei, size: 18*tpt)
          // Like TeX's makebox, keep the value on one line. Long user text
          // is scaled to the available form area instead of covering labels.
          #context {
            let content = text(value)
            let natural = measure(content).width
            let factor = calc.min(1, 10cm / calc.max(natural, 1pt)) * 100%
            align(center, scale(x: factor, y: factor, reflow: true, box(width: natural, content)))
          }
        ])
        place(top + left, dx: 3.3cm, dy: y + (if value == "" { 35.8pt } else { 20.6pt }),
          line(length: 8.8cm, stroke: 0.4*tpt))
        y += if value == "" { if sound { 52pt } else if young { 56pt } else { 58pt } } else { if sound or young { 48pt } else { 50pt } }
      }
    }
  ]
  pagebreak()
  block(width: 100%, above: 0pt, below: 0pt)[
    #v(if sound { 40.5pt } else { 4.7pt }, weak: false)
    #align(center, text(font: hei, size: 14*tpt, report-title))
    #v(if sound { 8pt } else { 9.3pt }, weak: false)
  ]
}

// Headings use Typst's native sticky blocks. Deciding a page break from the
// heading's own position would move that position and make layout oscillate.
#let section(body) = heading(level: 1, body)
#let subsection(body) = heading(level: 2, body)
#let report-table(columns: auto, header: (), rows: (), size: 9*tpt, stretch: 1.35, baseline: 11*tpt, inset: 6*tpt, rules: "grid", cell-align: center + horizon, breakable: auto, width: auto) = {
  set text(size: size, font: ("Latin Modern Roman 9", "FandolSong"))
  // LaTeX small is 9/11 pt. Its strut is 0.7/0.3 of the stretched baseline.
  let baseline = baseline * stretch
  set text(top-edge: 0.7*baseline, bottom-edge: -0.3*baseline)
  set par(leading: 0pt, spacing: 0pt, justify: false)
  align(center, block(width: width, above: 10*tpt, below: 10*tpt,
    breakable: if breakable == auto { rows.len() > 12 } else { breakable },
    table(columns: if columns == auto { (auto,) * header.len() } else { columns },
      align: cell-align, inset: (x: inset, y: 0pt), stroke: if ("grid", "inner-grid").contains(rules) { 0.4*tpt } else { none },
      table.header(repeat: true,
        ..if rules == "grid" { () } else { (table.hline(y: 0, stroke: 0.8*tpt),) },
        ..header,
        ..if rules == "grid" { () } else { (table.hline(y: 1, stroke: 0.5*tpt),) }),
      ..rows.flatten(),
      ..if rules == "grid" { () } else { (table.hline(y: rows.len()+1, stroke: 0.8*tpt),) },
      ..if rules == "inner-grid" { (table.vline(x: 0, stroke: none), table.vline(x: header.len(), stroke: none)) } else { () },
      ..if rules == "parameters" { (table.vline(x: 1, stroke: 0.4*tpt),) } else { () })))
}

#let illustration(body, caption, size: 10.5*tpt) = block(width: 100%, breakable: false, above: 10*tpt, below: 10*tpt)[
  #align(center, body)
  #v(4*tpt)
  #align(center, text(size: size, caption))
]

#let record-text(value) = {
  // Imported unit labels contain Unicode superscripts absent from the TeX
  // text fonts. Typeset them with the same font instead of a silent fallback.
  show regex("[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+"): it => {
    let source = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺".clusters()
    let target = "0123456789−+".clusters()
    super(typographic: false, text(it.text.clusters().map(c => target.at(source.position(candidate => candidate == c))).join()))
  }
  text(value)
}

#let records() = {
  // The original forced-vibration template only appends supplied records.
  if count("free_angle") > 0 and report.tables.len() == 0 and report.images.len() == 0 { return }
  pagebreak()
  set page(header: [#align(center)[原始数据记录单] #line(length: 100%, stroke: 0.4*tpt)])
  v(if sound { 0.6cm } else { 0.6cm + 27*tpt }, weak: false)
  if report.tables.len() == 0 and report.images.len() == 0 {
    [（请将教师签字的实验数据记录单完整拍照粘贴至此处。）]
  }
  for t in report.tables {
    subsection(text(t.title))
    report-table(header: t.headers.map(record-text), rows: t.rows.map(row => row.map(record-text)), size: 8pt, breakable: true)
  }
  for (i, name) in report.images.enumerate() {
    if i > 0 or report.tables.len() > 0 { pagebreak() }
    align(center)[
      #text(font: hei)[原始数据记录（第 #(i + 1) 张）]
      #v(5mm)
      #image(name, width: 100%, height: 19cm, fit: "contain")
    ]
  }
}

// Variable measurement tables use the normalized input's actual row counts.
#let free-table() = {
  for start in range(1, count("free_angle") + 1, step: 11) {
    let indices = range(start, calc.min(start + 11, count("free_angle") + 1))
    report-table(header: ([振幅 $theta$/°],) + indices.map(i => fi("free_angle", i)),
      rows: (([周期 $T_0$/s],) + indices.map(i => fi("free_period", i)),))
  }
}
#let damped-table() = {
  for trial in range(count("damped_period")) {
    subsection([第 #(trial + 1) 组　阻尼档位：#f("damping_setting")])
    report-table(header: ([次数], [振幅 $theta_i$/°], [次数], [振幅 $theta_(i+5)$/°], [$ln(theta_i slash theta_(i+5))$]),
      rows: range(1, 6).map(i => ([#i], fi("damped_peak", trial*10+i), [#(i+5)], fi("damped_peak", trial*10+i+5), fi("damped_log_ratio", trial*5+i))) +
        ((table.cell(colspan: 4)[$overline(ln(theta_i slash theta_(i+5)))$], fi("damped_log_mean", trial+1)),))
    [$10T = #fi("damped_time_10", trial+1)$ s，$overline(T) = #fi("damped_period", trial+1)$ s，$beta = #fi("damped_beta", trial+1)$ $upright(s)^(-1)$。]
  }
}
#let forced-table() = report-table(
  columns: (2.5cm + 6*tpt,) * 5, stretch: 1.25, inset: 3*tpt,
  header: ([强迫力矩周期\ $10T$/s], [相位差\ $phi$/°], [摆轮振幅\ $theta$/°], [$omega/omega_r = T_r/T$], [$(theta slash theta_r)^2$]),
  rows: range(1, count("drive_period") + 1).map(i => ("table_drive_time_10", "table_signed_phase", "amplitude", "table_frequency_ratio", "table_amplitude_ratio").map(key => fi(key, i))))
