# 物理实验报告生成

React/TypeScript 前端、Go 后端、SQLite 任务队列与 XeLaTeX 报告引擎。支持声速、空气比热容比、密立根油滴、扭摆转动惯量、杨氏模量、波尔共振、透镜焦距和示波器八种实验。

生产运行不依赖 Python。Docker 镜像包含前端、Go 服务、XeLaTeX、LaTeX 宏包、中文字体和图片解码组件；宿主机无需安装这些依赖。

## Docker 启动

需要 Docker Engine 与 Compose v2 或更新版本，在仓库根目录执行：

```bash
docker compose up -d --build
```

访问 <http://localhost:8080>。默认只绑定宿主机 `127.0.0.1`，适合本地访问或接入反向代理。HTTPS 正式部署设置 `REPORT_COOKIE_SECURE=1`，详细步骤、备份和旧数据迁移见 [部署指南](docs/deployment.md)。

没有 Compose 时，可使用指南中的 `docker build` / `docker run` 命令。

## 本地开发

需要 Node.js 24+ 和 pnpm **11.28.5**。项目仅允许 pnpm，约束见 [AGENTS.md](AGENTS.md) 与 [开发文档](docs/development.md)。按操作系统选择以下启动方式。

### Windows：一条命令启动开发

先启动 Docker Desktop 的 Linux 引擎，再运行：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

首次自动准备 `phyexp-report:dev` 开发镜像（Go + TeX 环境），以后启动直接复用。Vite 在本机运行，API 转发到容器的 8000 端口；前端热更新，Go 源码保存后自动增量编译并重启，模板保存后下一次生成报告直接生效。日常修改不运行生产镜像构建。Ctrl+C 停止本次开发服务，保留独立开发数据与 Go 缓存卷。

只开发页面可运行 `pnpm dev:frontend`，不要求 Docker；需要 API 功能时仍需启动后端。`pnpm dev:setup` 用于提前准备或更新开发镜像，只有 Dockerfile、系统依赖或工具链改变时才需要重建。网络和 Docker 排错见 [Windows 开发与排错](docs/windows-development.md)。

### Linux / WSL：本机前后端

除 Node.js 和 pnpm 外，还需要当前 Linux/WSL 环境中可用的 Go 1.26+：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

开发脚本启动 Vite 和 Go 自动编译监听器，Go 编译失败时保留旧服务，修复并保存后自动重试。开发数据默认位于 `output/dev-data/`。PDF 生成与图片上传还需要同一环境中的 XeLaTeX、宏包、字体和 ImageMagick/libheif，也可用 `pnpm dev:docker` 使用与 Windows 相同的容器开发环境。

以下后端检查和构建命令在 Linux/WSL 开发环境执行；前端测试、lint 和 build 也可在 Windows 执行：

```bash
pnpm test:backend
pnpm test:experiment-data
pnpm test:precision
pnpm lint
pnpm build
pnpm build:backend
```

后端二进制输出到 `output/backend-go/reportd`。这只包含 Go 服务，报告资源和系统工具由 Docker 提供。

## 文档

完整导航见 [文档中心](docs/README.md)。

| 目录 | 内容 |
| --- | --- |
| `src/`、`public/` | React 前端 |
| `server/` | Go API、实验计算、导入、渲染、持久化和测试 |
| `tex/templates/` | 运行时报告模板、插图和校徽 |
| `deploy/`、`Dockerfile`、`compose.yaml` | 容器部署配置 |
| `scripts/` | 开发、构建和验证工具 |
| `docs/` | 当前维护文档，旧设计保留在 `archive/` |
| `legacy/python/` | 迁移前 Python 实现和旧打包工具，仅供历史对照 |

请勿将旧 Python 服务和 Go 服务同时连接同一数据目录。用户数据库、原图与 PDF 均不纳入 Git。
