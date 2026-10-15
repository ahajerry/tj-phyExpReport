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

```bash
pnpm install --frozen-lockfile
pnpm dev
```

需要 Node.js 24+、Go 1.26+ 和 pnpm 11.28.5。项目仅允许 pnpm，约束见 [AGENTS.md](AGENTS.md) 与 [开发文档](docs/development.md)。开发脚本构建并启动 Go 后端，再启动 Vite。PDF 生成与图片上传还需要 XeLaTeX、宏包、字体和 ImageMagick，推荐通过 Docker 验证这些功能。

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
