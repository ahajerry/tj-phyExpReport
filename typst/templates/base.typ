// Shared report layout. User input is JSON data, never executable markup.
#let report = json("data.json")
#let f(key) = {
  let value = report.fields.at(key, default: "")
  if value == "" { underline(h(8mm)) } else { text(value) }
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

#let binding-line() = {
  for i in range(39) {
    let y = 2.85cm + i * 0.52cm
    if (13, 19, 25).contains(i) {
      place(top + left, dx: 0.86cm, dy: y - 0.12cm,
        text(size: 10.5pt, ("装", "订", "线").at(calc.quo(i - 13, 6))))
    } else {
      place(top + left, dx: 1.05cm, dy: y - 0.2cm,
        line(start: (0pt, 0pt), end: (0pt, 0.4cm), stroke: (paint: black, thickness: 0.35pt, dash: "dotted")))
    }
  }
}

#let report-layout(body) = {
  set document(title: report.title + "实验报告", date: none)
  set text(font: ("Noto Serif CJK SC", "Libertinus Serif"), lang: "zh", size: 10.5pt)
  set par(leading: 8pt, spacing: 3pt, justify: false)
  set page(paper: "a4", margin: (x: 3.175cm, y: 2.54cm),
    background: context { if counter(page).get().first() > 1 { binding-line() } },
    header: context { if counter(page).get().first() > 1 { line(length: 100%, stroke: 0.4pt) } },
    footer: context {
      if counter(page).get().first() > 1 {
        align(center, [第 #counter(page).display() 页　共 #counter(page).final().first() 页])
      }
    })
  set heading(numbering: none)
  show heading: set text(font: "Noto Sans CJK SC", weight: "bold", size: 11pt)
  show heading.where(level: 1): set block(above: 12pt, below: 6pt)
  show heading.where(level: 2): set block(above: 7pt, below: 4pt)
  body
}

#let cover() = {
  v(1cm)
  align(center)[
    #image("tongji_logo.jpeg", width: 8.184cm)
    #text(font: "Libertinus Serif", size: 18pt, weight: "bold")[TONGJI UNIVERSITY]
    #v(1.5cm)
    #text(font: "Noto Sans CJK SC", size: 36pt, weight: "bold")[物理实验报告]
  ]
  v(1.5cm)
  set text(font: "Noto Sans CJK SC", size: 18pt)
  for (label, key) in (("实验名称", "experiment"), ("学生姓名", "student"), ("学　　号", "student_id"), ("组　　号", "group"), ("实验日期", "date")) {
    block(above: 9pt, below: 9pt)[
      #grid(columns: (3.3cm, 1fr), align: horizon,
        [#label], block(width: 100%)[
          #align(center, if key == "experiment" { text(report.title) } else { f(key) })
          #v(-5pt)
          #line(length: 100%, stroke: 0.5pt)
        ])
    ]
  }
  pagebreak()
  align(center, text(font: "Noto Sans CJK SC", size: 14pt, weight: "bold", report.title))
  v(8pt)
}

#let section(body) = heading(level: 1, body)
#let subsection(body) = heading(level: 2, body)
#let report-table(columns: auto, header: (), rows: (), size: 8.5pt, breakable: auto) = {
  set text(size: size)
  set par(leading: 3pt, spacing: 0pt)
  block(breakable: if breakable == auto { rows.len() > 12 } else { breakable },
    table(columns: if columns == auto { (1fr,) * header.len() } else { columns },
    align: center + horizon, inset: 4pt, stroke: 0.45pt,
    table.header(repeat: true, ..header), ..rows.flatten()))
}

#let records() = {
  pagebreak()
  set page(header: [#align(center)[原始数据记录单] #line(length: 100%, stroke: 0.4pt)])
  if report.tables.len() == 0 and report.images.len() == 0 {
    [（请将教师签字的实验数据记录单完整拍照粘贴至此处。）]
  }
  for t in report.tables {
    subsection(text(t.title))
    report-table(header: t.headers.map(text), rows: t.rows.map(row => row.map(text)), size: 8pt, breakable: true)
  }
  for (i, name) in report.images.enumerate() {
    if i > 0 or report.tables.len() > 0 { pagebreak() }
    align(center)[
      #text(font: "Noto Sans CJK SC")[原始数据记录（第 #(i + 1) 张）]
      #v(5mm)
      #image(name, width: 100%, height: 19cm, fit: "contain")
    ]
  }
}

// Variable measurement tables use the normalized input's actual row counts.
#let free-table() = {
  for start in range(1, count("free_angle") + 1, step: 8) {
    let indices = range(start, calc.min(start + 8, count("free_angle") + 1))
    report-table(header: ([振幅 $theta$/°],) + indices.map(i => fi("free_angle", i)),
      rows: (([周期 $T_0$/s],) + indices.map(i => fi("free_period", i)),))
  }
}
#let damped-table() = {
  for trial in range(count("damped_period")) {
    subsection([第 #(trial + 1) 组　阻尼档位：#f("damping_setting")])
    report-table(header: ([次数], [振幅 $theta_i$/°], [次数], [振幅 $theta_(i+5)$/°], [$ln(theta_i/theta_(i+5))$]),
      rows: range(1, 6).map(i => ([#i], fi("damped_peak", trial*10+i), [#(i+5)], fi("damped_peak", trial*10+i+5), fi("damped_log_ratio", trial*5+i))) +
        ((table.cell(colspan: 4)[$overline(ln(theta_i/theta_(i+5)))$], fi("damped_log_mean", trial+1)),))
    [$10T = #fi("damped_time_10", trial+1)$ s，$overline(T) = #fi("damped_period", trial+1)$ s，$beta = #fi("damped_beta", trial+1)$ $upright(s)^(-1)$。]
  }
}
#let forced-table() = report-table(
  header: ([强迫力矩周期 $10T$/s], [相位差 $phi$/°], [摆轮振幅 $theta$/°], [$omega/omega_r = T_r/T$], [$(theta/theta_r)^2$]),
  rows: range(1, count("drive_period") + 1).map(i => ("table_drive_time_10", "table_signed_phase", "amplitude", "table_frequency_ratio", "table_amplitude_ratio").map(key => fi(key, i))))
