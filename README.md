# 物理实验报告生成

基于 React/TypeScript、Go、SQLite 和 Typst，支持声速、空气比热容比、密立根油滴、扭摆转动惯量、杨氏模量、受迫振动、透镜焦距和示波器八种实验。录入或导入数据后生成 PDF，也可下载包含 `.typ`、数据与图片的可编辑源码 ZIP。

## 快速启动

安装 Docker Engine 与 Compose 后，在仓库根目录执行：

```bash
docker compose up -d --build
```

访问 <http://localhost:8080>。镜像包含前端、Go、Typst、中文字体和图片工具，生成报告无需联网。HTTPS、备份和旧 LaTeX 环境的停机切换见 [部署指南](docs/guides/deployment.md)。

## 开发

安装 Node.js 24+ 和项目指定的 pnpm **11.28.5**。Windows 先启动 Docker Desktop Linux 引擎；Linux/WSL 可直接使用 Go，或执行 `pnpm dev:docker` 使用容器环境。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

前端默认 <http://127.0.0.1:15173>。完整工具准备、测试和版本流程见 [开发指南](docs/guides/development.md)，固定 pnpm 的原因见 [ADR](docs/adrs/0005-pinned-pnpm.md)。

文档统一入口：[docs/README.md](docs/README.md)。当前契约位于 `docs/specs/`，重要决策位于 `docs/adrs/`，实施与验收位于 `docs/plans/`；维护约束见 [AGENTS.md](AGENTS.md)。旧 LaTeX/Python 资源仅供历史参考，不参与生产运行。
