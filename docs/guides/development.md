# 开发与验证

运行配置见 [架构](../specs/architecture.md)，行为定义见 [文档入口](../README.md)。命令从仓库根目录运行。

## 准备和启动

安装 Node.js 24+ 与 `package.json#packageManager` 指定的 pnpm。可用已安装的 Corepack 执行 `corepack enable`，再检查 `pnpm --version`。固定版本用于统一本地、CI 和容器的安装行为，不是 Typst 的要求；原因见 [ADR 0005](../adrs/0005-pinned-pnpm.md)。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Windows 会启动本机 Vite 与 Docker 开发后端，先确保 Docker Desktop Linux 引擎可用。Linux/WSL 默认使用本机 Go（1.26+），生成报告还需安装 [源码说明](../../typst/templates/README.md) 中的 Typst 及 ImageMagick/libheif；字体已随仓库保存；可改用 `pnpm dev:docker`，复用完整容器环境。本地后端默认读取模板目录同级的 `fonts/`；自定义字体目录通过 `REPORT_FONT_DIR` 指定，应使用仓库固定版本。

Vite 默认 `http://127.0.0.1:15173`，API 代理到 `127.0.0.1:8000`。Go 保存后增量编译，失败时保留旧服务；模板保存后下一份报告直接读取。端口被其他服务占用时先处理该服务，脚本不会关闭其他项目。

| 命令 | 操作 |
| --- | --- |
| `pnpm dev:docker` | 使用 Docker 后端和本机 Vite |
| `pnpm dev:local` | Linux/WSL 本机 Go 与 Vite |
| `pnpm dev:frontend` | 只启动 Vite |
| `pnpm dev:setup` | 按当前 Dockerfile 重建开发环境 |
| `pnpm backend` / `pnpm build:backend` | 启动 / 仅构建 Go，产物在 `output/backend-go/` |

开发容器只读挂载 `server/`、`scripts/`、`typst/templates/`，使用独立数据卷和 Go 缓存卷。首次构建或下载较慢，后续复用缓存。旧 TeX 开发镜像会因引擎标签不符自动重建；更改工具链或系统包后运行 `pnpm dev:setup`。Ctrl+C 停止本次开发服务并保留卷。

本机开发数据默认 `output/dev-data/`。直接执行编译后的二进制时显式指定临时数据目录，避免连接用户 `.report-data/`。后端依赖 Unix 进程组与文件锁，Windows 本机仅运行前端，后端使用 Docker/WSL。

## 依赖与版本

依赖变化使用 `pnpm add/remove/update` 并提交对应锁文件；重复安装使用冻结锁文件，不生成其他包管理器锁文件。依赖脚本允许列表位于 `pnpm-workspace.yaml`。升级 pnpm 时同步 packageManager、engines 和维护约束，再验证冻结安装与镜像构建。

```bash
pnpm version:show
pnpm version:set v261031.1
```

版本格式 `vYYMMDD.N`，根包保存为 `YYMMDD.N.0`；该命令不提交、不打标签。编号应使用实际发布日期，更新 CHANGELOG 后再按发布流程处理。

## 按变更范围检查

```bash
pnpm test:backend
pnpm test:backend:race
pnpm lint
pnpm test:experiment-data
pnpm test:precision
pnpm test:storage
pnpm test:preview
pnpm test:samples
pnpm test:dev
pnpm build
pnpm build:backend
```

后端修改运行 backend；队列/并发修改另运行 race。前端修改运行 lint、相关测试与 build。测试使用 `server/testdata/` 和临时目录，禁止连接用户数据。数值参考规则见 [实验 spec](../specs/experiments.md)。

真实编译全部参考样本并导出供检查的 PDF/源码：

```bash
pnpm test:render --output output/layout-parity/after
pnpm test:layout
```

`test:render` 要求本机 Typst，默认使用仓库字体；`--run` 可缩小到指定 Go 测试名，编译警告也会导致失败。只运行普通后端测试不会证明真实 PDF 排版通过。`test:layout` 自动构建独立 Poppler 检查镜像，断网检查所有输出样本的 A4、嵌入字体和纸张边界，另核对八种基础报告的页数、标题坐标及封面实验名称不换行；可用 `--pdf-dir DIR` 指定样本目录。基准数值来自冻结 LaTeX 合成 PDF，保存在 `server/testdata/layout-baseline.json`，不能为了通过测试随意更新。检查工具不会进入生产镜像。仍须逐页目视检查表格溢出、公式、图注与曲线，人工检查重点见 [报告 spec](../specs/reports.md)。

## 容器检查

```bash
docker build -t phyexp-report:local .
pnpm test:docker
pnpm test:docker --compose
docker build --target development -t phyexp-report:dev .
pnpm test:dev:docker
```

`test:docker` 用唯一临时容器/卷验证实验、仪器导入、图片、鉴权、重启与源码离线重编译，结果写入 `output/docker-smoke/`。可设置 `REPORT_TEST_IMAGE` 指定镜像。Compose 模式使用仓库 compose.yaml、随机端口和唯一项目名，不读取用户 `.env`，结果写入 `output/compose-smoke/`，不支持自定义镜像变量。

源码验收在独立容器 `--network none` 下编译并比较 PDF 摘要；内存指标来自 cgroup v2 的 memory.peak，包含服务、编译与图片处理，不是仅编译器 RSS。Docker 验收命令在 Linux/WSL 环境执行。

`test:dev:docker` 复制临时源码，验证真实增量编译、错误恢复、模板挂载和优雅退出；结束清理其容器/卷。所有测试均不挂载 `.report-data/`。真实仪器/手机图片的新变体需要另添匿名合成参考，不能把这些检查当作所有输入的保证。
