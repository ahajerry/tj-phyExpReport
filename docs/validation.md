# 本地验收记录

2026-10-15 汇总。本记录针对 Go 完整迁移、Docker 部署与 pnpm 统一管理；全部使用合成样本和临时数据卷，未读取或修改用户 `.report-data/`。

## 计算、存储与前端

已通过以下检查：

- `pnpm install --frozen-lockfile`、`pnpm version:show`。
- `pnpm test:backend`、`pnpm test:backend:race`、`go -C server vet ./...`。
- `pnpm lint`、`pnpm test:experiment-data`、`pnpm test:precision`、`pnpm test:storage`、`pnpm test:preview`、`pnpm test:samples`。
- `pnpm build`、`pnpm build:backend`，以及生成的 Go 二进制帮助命令。

Go 回归样本位于 `server/testdata/`：45 个有效计算场景、31 个无效输入场景和 10 个导入样本，覆盖八种实验、可变读数、单位换算及末端修约。数值兼容范围与高精度计算差异见[实验与计算](experiments.md)。存储与接口测试覆盖旧 SQLite 数据、匿名身份隔离、额度并发、取消和重启恢复。

前端构建成功，但 Vite 仍提示主 JavaScript 块超过 500 kB；这不是本次构建失败项。包管理器入口检查已验证接受 pnpm、拒绝其他包管理器的用户代理。

## Docker 与报告

已构建 `phyexp-report:local` 并通过 `pnpm test:docker`。本机默认 Docker 网络访问 Go 模块超时，成功构建时使用 `docker build --network=host -t phyexp-report:local .`。

验收脚本 `scripts/smoke-docker.mjs` 自动创建并清理临时容器和数据卷，确认：

- 运行用户为 UID 10001，容器中没有 `python` 或 `python3` 命令，XeLaTeX 和 Fandol 字体可用。
- 前端与 Go API 可访问；八种实验基准报告、可选透镜场景、三份导入报告和两组图片报告，共 14 份 PDF 生成并下载成功。
- 10 个导入样本通过，包含可变表头 XLSX、日期单元格和不同编码的 CSV。
- PNG、JPEG、GIF、TIFF、WebP、HEIC、AVIF 共 7 种图片格式通过，两组报告分别保留 5 张和 2 张图片。
- 不同匿名用户下载报告返回 404；容器重启后全部报告记录与下载仍可用。

最近一次结果写入被 Git 忽略的 `output/docker-smoke/results.json`。另对生成报告进行 PDF 文本检查，并抽查示波器和受迫振动报告的页面缩略图，中文、表格及曲线正常；这不代表逐页人工审阅所有报告。

## 尚未直接验证的环境

本机未安装 Docker Compose，未直接执行 `docker compose` 启动流程；已验证 Docker 镜像构建及原生 Docker 容器运行流程。[部署指南](deployment.md) 提供两种启动方法。尚未执行远程服务器部署、实际域名 HTTPS 接入或真实用户数据迁移；迁移步骤与回退要求见[迁移记录](migration.md)。
