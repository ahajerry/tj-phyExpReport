# 编辑和编译报告源码

报告完成后，点击“下载 PDF”旁的“下载 Typst 源码”，得到 ZIP。解压并保持目录结构，然后按包内 README 安装编译器并取得仓库固定字体，在解压目录执行：

```bash
typst compile --root . --ignore-system-fonts --font-path /path/to/typst/fonts --creation-timestamp 0 report.typ report.pdf
```

随包说明的维护源是 [typst/templates/README.md](../../typst/templates/README.md)，其中有安装链接、版本和字体检查步骤。文件用途与可复现边界见 [报告 spec](../specs/reports.md)。字体不包含在 ZIP 内；将命令中的字体路径替换为仓库 `typst/fonts/` 的位置，取得后可以断网编译。

修改正文用 `report.typ`，统一排版用 `base.typ`，图表样式用 `charts.typ`。文字和图点位于 `data.json`；编辑它不会重算物理结果，需要重算时回到网站修改读数并生成新报告。安装了不同版本字体导致分页改变时，先核对字体文件和 Typst 版本。
