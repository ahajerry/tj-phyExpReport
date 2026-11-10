# 报告引擎与 Typst 评估

核对日期：2026-11-10。本文区分当前实现和建议；未迁移引擎，也未验证 Typst 输出。

## 当前实际实现

项目说明文档是 Markdown；实验报告是 PDF。当前 PDF 引擎是 XeLaTeX，不是 Typst。

`server/internal/render/render.go` 先调用 Go 实验计算，读取 `tex/templates/`，创建独立临时目录，复制公共 TeX、标志和图资源，处理上传图片并填充 `report.tex`。随后执行两次 `xelatex -no-shell-escape -interaction=nonstopmode -halt-on-error report.tex`，每次限时 120 秒，读取 PDF 后清理临时目录。队列和归档由 Go 管理，生产没有 Python 计算或渲染路径。

Dockerfile 的 `render-runtime` 提供 TeX Live、中文字体及 ImageMagick/libheif，生产和开发共用这一层。宿主只需 Docker；当前无需安装 Typst。Windows 运行 `pnpm install --frozen-lockfile`、`pnpm dev`，使用本机 Vite 与 Docker Go 后端；系统依赖改变后用 `pnpm dev:setup` 更新镜像。完整说明见 [开发与验证](development.md)。

## 如果迁移到 Typst：生产方案

推荐保留 Go API、实验计算、SQLite 队列和 PDF 归档，仅替换渲染层：

```text
请求 → Go 校验与计算 → SQLite 任务 → worker
     → JSON 报告数据 + .typ 模板 + 图片 → Typst CLI → PDF 归档
```

Go 输出结构化 JSON，Typst 模板通过 `json("report-data.json")` 读取。原始读数、带尾零的修约结果和单位继续以字符串传递，模板负责排版，不重复实现物理计算。用户文字只作为数据使用，禁止拼接为可执行模板或交给 `eval`。

建议在镜像构建时固定 Typst CLI 版本及校验和、中文字体、数学字体和模板依赖；第三方包预置，运行时不依赖网络下载。每个任务将可信模板、JSON、字体及经过转换的图片放进工作目录，再由 Go 以独立参数调用类似命令：

```bash
typst compile --root /work/job --font-path /work/job/fonts /work/job/report.typ /work/job/report.pdf
```

这是未来目录布局示例，当前仓库没有对应 `.typ` 文件。一次 CLI 调用负责生成 PDF，不照搬 XeLaTeX 的两遍命令。继续保留超时、进程取消、有界日志、非 root 用户及容器资源限制；`--root` 约束文件访问范围，但不能代替 CPU/内存隔离。图片兼容链路仍需保留，不能因更换排版引擎就删掉 HEIC/AVIF 转换。

主要工作量在八种模板重写：公共封面、公式、表格、图表、分页及附图都要逐项比对。现有 TeX 不能直接改扩展名；图表中的 TeX 专用实现也需重做。镜像体积和编译耗时可能改善，但须以八种合成报告实测，不能提前承诺。

## 如果迁移到 Typst：开发配置

生产与开发镜像使用相同的 CLI、字体和包版本。开发继续使用 Vite + Go 监听器，将未来 Typst 模板目录只读挂载，任务执行时读取；系统依赖变更才重建镜像。

单独调模板可以安装同版本的原生 Typst CLI，创建隔离样例目录，放入模板、合成 JSON 和字体后运行：

```bash
typst --version
typst fonts --font-path ./fonts
typst watch --root . --font-path ./fonts report.typ report.pdf
```

编辑器可选支持 Typst 的插件，但插件预览不替代与生产 CLI 一致的验收。Windows 原生 CLI 仅用于模板预览；Go 后端仍用 Docker/WSL，容器无法直接使用 Windows 可执行文件。

建议先用一个实验验证数据接口与版式，再覆盖八种实验。迁移时补充数值字符串对照、中文字体和关键页面视觉检查，运行 `pnpm test:backend`、构建镜像和 `pnpm test:docker`；改动队列并发时另跑 race。采用明确的引擎配置，失败时不要静默切换引擎。全部通过之前保留可回退的 XeLaTeX 发布版本。

依据：[Typst CLI 与安装说明](https://github.com/typst/typst)、[JSON 数据读取](https://typst.app/docs/reference/data-loading/json/)。命令选项以选定版本的 `typst help compile` 为准。
