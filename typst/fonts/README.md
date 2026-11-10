# 固定报告字体

这些未修改的 OpenType 字体与冻结的 LaTeX 基准镜像中的文件一致。仅保存报告使用的字体子集；无需安装 TeX Live。

| 文件 | 版本与来源 | 许可 |
| --- | --- | --- |
| `FandolSong-Regular.otf`、`FandolSong-Bold.otf`、`FandolHei-Regular.otf` | [Fandol 0.3](https://ctan.org/pkg/fandol) | GPL 3，含字体嵌入例外；见 `COPYING-Fandol.txt`、`README-Fandol.txt` |
| `lmroman9-regular.otf`、`lmroman10-*.otf`、`lmroman12-bold.otf` | [Latin Modern 2.005](https://ctan.org/pkg/lm) | GUST Font License；见 `LICENSE-Latin-Modern.txt`、`LPPL-1.3c.txt`、`README-Latin-Modern.txt` |
| `latinmodern-math.otf` | [Latin Modern Math 1.959](https://ctan.org/pkg/lm-math) | GUST Font License；见 `LICENSE-Latin-Modern.txt`、`LPPL-1.3c.txt`、`README-Latin-Modern-Math.txt` |

`SHA256SUMS` 固定实际文件。更新字体属于版式变化，必须重新对照八种报告并同步校验清单。Docker 构建校验文件哈希，复制本目录，不下载字体；本地渲染默认使用此目录。

```sh
# 在仓库根目录，无需把字体安装到操作系统
typst fonts --ignore-system-fonts --font-path typst/fonts
```

分发对应字体时应保留本目录的许可证、版权说明和校验清单。报告使用规则见 [报告契约](../../docs/specs/reports.md)。字体不放进每份报告的源码 ZIP。
