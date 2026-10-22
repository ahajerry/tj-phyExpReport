# 开发与验证

## 工具与包管理约束

前端需要 Node.js 24+、pnpm **11.28.5**；Linux/WSL 本机后端开发另需 Go 1.26+。Windows 使用 Docker 后端时，无需安装 Windows Go。本项目只使用 pnpm，约束同时写在根目录 [AGENTS.md](../AGENTS.md)、`packageManager`、`engines`、安装前检查和 Dockerfile 中。

以下联合启动命令在 Windows 自动使用 Docker 开发后端，在 Linux/WSL 默认使用本机 Go 后端。若已安装 pnpm，可跳过 `corepack enable`；未提供 Corepack 的 Node.js 安装可使用 pnpm 官方独立安装方式，版本必须为 11.28.5。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

依赖管理统一使用 `pnpm add`、`pnpm remove`、`pnpm update`。只提交 `pnpm-lock.yaml`，禁止生成 npm、Yarn、Bun 锁文件。CI、Docker 和重复安装必须使用 `--frozen-lockfile`。`pnpm-workspace.yaml` 的 `allowBuilds` 明确允许构建脚本，其余依赖脚本不自动执行。仓库保留 `.npmrc` 是因为 pnpm 读取它，不表示允许 npm 管理依赖。

修改 pnpm 版本时必须同步 `packageManager`、`engines` 与本文，并验证冻结安装和 Docker 构建；不可自动绕过版本约束。历史归档中的 npm 命令仅反映旧部署，不适用于当前项目。

## 本地服务

### Windows：Vite + 自动编译的 Docker 开发后端

Docker Desktop Linux 引擎就绪后：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Vite 默认地址为 `http://127.0.0.1:15173`，避开本机 Windows 保留的 5173 端口范围；API 仍代理到 `http://127.0.0.1:8000`。端口被占用时以终端实际显示的地址为准。

脚本先启动本机 Vite，后端准备期间可先开发页面。首次缺少 `phyexp-report:dev` 时，脚本直接调用 `docker build --target development` 准备环境；该目标不安装前端依赖、不打包前端、不预编译应用。以后只启动 `compose.dev.yaml` 中的后端和本机 Vite。无需 Windows Go，也不再使用生产镜像作为开发前提。

首次自动准备时，如果本机已有 `phyexp-report:local`，会通过 `DEV_RUNTIME=phyexp-report:local` 复用其中的 TeX 工具，避免重新下载系统包；应用始终编译挂载的当前源码，不启动旧二进制。没有现成报告镜像时构建共享的 `render-runtime`。显式执行 `pnpm dev:setup` 则按当前 Dockerfile 更新完整环境，不复用旧报告镜像。

`server/`、`scripts/`、`tex/templates/` 只读挂载。监听器每 750 ms 检查 Go 源码、模块文件及内嵌资源，变化后增量编译，成功后优雅停止旧进程并启动新进程；编译错误时保留旧服务，保存修复后再试。模板由每个新报告任务直接读取，不触发 Go 编译。测试文件和 `server/testdata/` 不触发开发重编译。

开发 Compose 项目固定为 `phyexpreport-dev`，仅绑定 `127.0.0.1:8000`，使用独立的 `dev-data`、`go-mod`、`go-build` 命名卷，不连接生产卷或宿主 `.report-data/`。Ctrl+C 停止开发后端并保留卷。切换分支后重新运行 `pnpm dev`，启动时会检查并编译当前源码。

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | Windows 默认 Docker，Linux/WSL 默认本机 Go，均启动本机 Vite |
| `pnpm dev:docker` | 任意平台使用 Docker 开发后端 |
| `pnpm dev:local` | Linux/WSL 本机 Go 自动编译与 Vite |
| `pnpm dev:frontend` | 仅 Vite，不要求后端或 Docker；API 仍依赖 8000 端口的服务 |
| `pnpm dev:setup` | 首次预热或更新开发镜像，不启动服务 |

`pnpm test:dev` 检查监听器的错误恢复、源码指纹和优雅停止。准备好开发镜像后运行 `pnpm test:dev:docker`，会使用临时源码副本、临时容器和临时卷验证真实编译/重启、编译失败保留旧服务、模板实时读取及退出清理；不会修改工作区源码或使用开发/生产数据卷。

仅 Dockerfile、Go/Node 工具链或系统依赖变更后运行 `pnpm dev:setup`，然后重启 `pnpm dev`。应用代码、模板变化不需要重建开发镜像。第一次下载 Go 模块、编译 Go 和安装 TeX 仍可能耗时；后续复用命名卷、Go 编译缓存和 BuildKit 下载缓存。8000 端口被生产后端占用时先停止那个服务，或只运行前端；脚本不主动停止其他项目。

### Linux / WSL：本机联合启动

`pnpm dev` 启动 Go 源码监听器和 Vite。Go 二进制输出到 `output/backend-go/reportd`，开发数据默认写入 `output/dev-data/`；保存源码自动增量编译和重启，修改模板无需重启。已有服务占用 8000 端口时使用 `pnpm dev:frontend` 或先停止该服务。

```bash
pnpm backend
pnpm build:backend
REPORT_HOST=127.0.0.1 REPORT_PORT=8000 ./output/backend-go/reportd
```

以上命令从仓库根目录运行。Linux 是后端部署目标（进程组取消和文件锁使用 Unix 系统调用）；Windows 开发后端请用 WSL2 或 Docker。只有校验/计算/API 测试不要求 XeLaTeX；真实 PDF 和图片上传请在完整 Docker 环境验证。

Windows 使用本机 Vite + Docker 后端的启动步骤、磁盘位置设置，以及引擎未启动、Compose Bake 退出和代理网络错误，见 [Windows 开发与排错](windows-development.md)。

## 检查

```bash
pnpm lint
pnpm test:dev
pnpm test:dev:docker
pnpm test:backend
pnpm test:backend:race
pnpm test:experiment-data
pnpm test:precision
pnpm test:storage
pnpm test:preview
pnpm test:samples
pnpm build
pnpm build:backend
```

`server/testdata` 包含从迁移前实现采集的合成对照数据。计算测试比较每个数值字段和图点；带非零不确定度的主要成品结果按字符串检查末位，过程字段和零不确定度结果允许数值相同的尾零差异。独立修约测试检查半偶舍入与末位对齐。非法输入应在创建任务前拒绝。导入样本覆盖多种波尔共振布局、UTF-8/GB18030 油滴 CSV 和扭摆 XLSX。

Go API 测试覆盖 Cookie 属性、健康检查、访问隔离、导入不占额度、下载、重启历史、每日 50 次限制和第二实例锁。测试目录均为临时目录，不访问真实报告数据。

## 容器端到端验证

```bash
docker build -t phyexp-report:local .
pnpm test:docker
```

测试自动创建独立容器和临时卷，检查运行用户与无 Python 环境、八种 PDF、仪器导入、七种图片格式、跨身份下载拒绝，以及重启后的历史与下载。结束时删除其专属容器和卷。PDF 与 JSON 结果保存在 `output/docker-smoke/`，不进入 Git。可用 `REPORT_TEST_IMAGE` 指定待测镜像。

验证 Compose 部署时运行：

```bash
docker compose build
pnpm test:docker --compose
```

Compose 模式使用仓库 `compose.yaml` 和已构建镜像，以唯一项目名创建临时卷，绑定本机随机端口，等待容器健康后运行相同的完整验收，再通过 Compose 重启检查持久化。该模式不加载用户 `.env`，不支持 `REPORT_TEST_IMAGE`；结果位于 `output/compose-smoke/`。结束时通过 `docker compose down --volumes --remove-orphans` 清理该测试项目。

该检查不自动证明所有真实仪器文件和手机照片都兼容；新的格式变体需要新增匿名化样本。PDF 数值、文本和页数可自动检查，关键版式仍建议进行人工视觉复核。

## 发布版本

```bash
pnpm version:show
pnpm version:set v261014.1
```

版本格式为 `vYYMMDD.N`，`package.json` 保存对应的 `YYMMDD.N.0`。命令只更新根包版本，不创建 Git 提交或标签，pnpm 锁文件不存储根包版本。发布前更新 CHANGELOG 并完成检查。
