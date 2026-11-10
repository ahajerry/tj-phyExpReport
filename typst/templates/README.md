# 实验报告 Typst 源码

此 ZIP 是生成对应 PDF 时的输入快照。解压后可编辑 `report.typ` 的正文、`base.typ` 的版式、`charts.typ` 的矢量图以及 `data.json` 的文字和图点。

安装 [Typst 0.15.1](https://github.com/typst/typst/releases/tag/v0.15.1)，并从[项目仓库的固定字体快照](https://github.com/ahajerry/tj-phyExpReport/tree/3cf90f7db70a8dbaa50c45f4cf36f7cc7e94d0b3/typst/fonts)取得字体及许可证。字体不随此 ZIP 分发；可下载该提交的仓库 ZIP 后取出 `typst/fonts/`。目录内的 `SHA256SUMS` 可核对版本；使用固定提交可以避免后续字体更新影响本报告。

版本固定为 Fandol 0.3、Latin Modern 2.005、Latin Modern Math 1.959。字体包括 FandolSong（常规、粗体）、FandolHei（常规）、Latin Modern Roman、Latin Modern Roman 9（表格）、Latin Modern Roman 12（封面粗体）和 Latin Modern Math。不要用同名字体的其他版本替换，否则换行和分页可能不同。

在解压目录运行：

```sh
typst compile --root . --ignore-system-fonts --font-path /path/to/typst/fonts --creation-timestamp 0 report.typ report.pdf
```

将 `/path/to/typst/fonts` 换成取得的字体目录。先运行 `typst fonts --ignore-system-fonts --font-path /path/to/typst/fonts` 检查上述字体。字体目录可以位于源码目录外；它只供编译器载入字体。安装完成后编译不需要网络；源码不引用在线包。

数值结果由网站的 Go 后端生成。修改 JSON 中的读数不会重新计算实验结果；需要重算时，请在网站修改数据并重新生成。图表使用 JSON 中的图点绘制，可以直接编辑图点与绘图样式。

附图是 PDF 实际使用的图片，用户照片已校正方向并转为 JPEG。文件中可能包含姓名、学号和实验记录，请按自己的意愿分享。请保持解压后的相对目录结构。
