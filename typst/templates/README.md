# 实验报告 Typst 源码

此 ZIP 是生成对应 PDF 时的输入快照。解压后可编辑 `report.typ` 的正文、`base.typ` 的版式、`charts.typ` 的矢量图以及 `data.json` 的文字和图点。

安装 [Typst 0.15.1](https://github.com/typst/typst/releases/tag/v0.15.1)，并安装 [Noto CJK](https://github.com/notofonts/noto-cjk) 中的 **Noto Serif CJK SC** 和 **Noto Sans CJK SC**。字体不随 ZIP 分发。数学字体 New Computer Modern Math 由 Typst 自带。

在解压目录运行：

```sh
typst compile --root . --creation-timestamp 0 report.typ report.pdf
```

字体未装入系统时，使用 `--font-path /path/to/fonts` 指定字体目录。先运行 `typst fonts` 确认上述字体可用。版本或字体不同可能改变换行和分页。安装完成后编译不需要网络；源码不引用在线包。

数值结果由网站的 Go 后端生成。修改 JSON 中的读数不会重新计算实验结果；需要重算时，请在网站修改数据并重新生成。图表使用 JSON 中的图点绘制，可以直接编辑图点与绘图样式。

附图是 PDF 实际使用的图片，用户照片已校正方向并转为 JPEG。文件中可能包含姓名、学号和实验记录，请按自己的意愿分享。请保持解压后的相对目录结构。
