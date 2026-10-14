# 开发与验证

## 工具与包管理约束

Node.js 24+、Go 1.26+、pnpm **11.28.5**。本项目只使用 pnpm，约束同时写在根目录 [AGENTS.md](../AGENTS.md)、`packageManager`、`engines`、安装前检查和 Dockerfile 中。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

依赖管理统一使用 `pnpm add`、`pnpm remove`、`pnpm update`。只提交 `pnpm-lock.yaml`，禁止生成 npm、Yarn、Bun 锁文件。CI、Docker 和重复安装必须使用 `--frozen-lockfile`。`pnpm-workspace.yaml` 的 `allowBuilds` 明确允许构建脚本，其余依赖脚本不自动执行。仓库保留 `.npmrc` 是因为 pnpm 读取它，不表示允许 npm 管理依赖。

修改 pnpm 版本时必须同步 `packageManager`、`engines` 与本文，并验证冻结安装和 Docker 构建；不可自动绕过版本约束。历史归档中的 npm 命令仅反映旧部署，不适用于当前项目。

## 本地服务

`pnpm dev` 计算 Go 源码、依赖和模板指纹，检查 8000 端口是否已有相同版本服务；需要时先编译到 `output/backend-go/reportd`，再启动后端和 Vite。修改 Go 后重启开发命令。前端热更新由 Vite 提供。

```bash
pnpm backend
pnpm build:backend
REPORT_HOST=127.0.0.1 REPORT_PORT=8000 ./output/backend-go/reportd
```

以上命令从仓库根目录运行。Linux 是后端部署目标（进程组取消和文件锁使用 Unix 系统调用）；Windows 开发后端请用 WSL2 或 Docker。只有校验/计算/API 测试不要求 XeLaTeX；真实 PDF 和图片上传请在完整 Docker 环境验证。

## 检查

```bash
pnpm lint
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
