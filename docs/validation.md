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

## Compose 补充验收

2026-10-15 安装 Docker Compose 5.6.0 后，以下检查通过：

- `docker compose -p phyexp-compose-build-check build`：使用现有构建缓存成功生成镜像。本机未安装 buildx，Compose 自动回退到经典构建器；未验证 BuildKit 专有功能。
- `pnpm test:docker --compose`：使用仓库 `compose.yaml` 创建独立项目，健康检查通过，14 份 PDF、10 个导入样本、7 种图片格式和匿名身份隔离检查全部通过。
- `docker compose restart app` 后，额度、报告历史与全部报告下载保持正常。
- 测试结束后专属容器、网络和临时卷均已清理。结果保存在被 Git 忽略的 `output/compose-smoke/results.json`。
- 验收脚本新增 Compose 模式，`pnpm lint` 与 `git diff --check` 通过；复测命令见[开发与验证](development.md)。

## 尚未直接验证的环境

尚未执行远程服务器部署、实际域名 HTTPS 接入或真实用户数据迁移；[部署指南](deployment.md) 提供启动方法，迁移步骤与回退要求见[迁移记录](migration.md)。

## 2026-10-16 透镜三组数据调整

透镜各方法的表单、JSON 导入提示、样例与报告模板统一为三组，凹透镜仍可整组留空。后端保留旧共轭法、自准直法和凹透镜五组输入，报告恢复对应的第四、第五行。旧本地表单缓存取前三组，保留原始读数文本。

- 已通过 `pnpm lint`、`pnpm test:samples`、`pnpm test:storage`、`pnpm test:experiment-data`、`pnpm test:precision`、`pnpm build` 和 `git diff --check`。
- 新增两个三组计算参考样本与四个无效输入样本，当前共 47 个有效场景、35 个无效场景；模板测试覆盖三组和旧五组表格行数，容器验收脚本增加三组完整及省略凹透镜报告。
- `pnpm test:backend` 因 Windows 本机缺少 Go 未能运行。`docker build --progress=plain -t phyexp-report:lens-three-groups .` 因访问 `https://auth.docker.io/token` 连接超时失败；新镜像未生成，因此本次尚未完成后端回归测试及 `pnpm test:docker` 的三组 PDF 生成验证。上方 2026-10-15 的通过记录不代表本次变更已通过这些检查。

## 2026-10-16 空气比热容比讲义模板调整

- 已通过 `pnpm lint`、`pnpm test:samples`、`pnpm test:storage`、`pnpm test:experiment-data`、`pnpm test:precision`、`pnpm build` 和 `git diff --check`。
- 新增完整初末读数/100T 参考样本及四个非法输入场景，当前共 48 个有效场景、39 个无效场景。参考值由独立 Python Decimal 80 位计算得出：合成样本 γ ≈ 1.44975875317696，标准不确定度 ≈ 0.00553705624004，最终表达为 1.450 ± 0.006。Python 仅用于离线交叉校验，未进入生产路径。
- 使用本机 XeLaTeX 编译合成数据样例，并渲染检查全部 7 页；无缺失字形、溢出和未定义交叉引用，正文保留母模板版式。输出位于被忽略的 `output/pdf/heat-capacity-ratio-sample.pdf`。该 PDF 使用独立参考字段填充，用于数值展示和版式验证，不代表 API 集成已通过。
- `pnpm test:backend` 因本机没有 Go 未能运行。Docker 构建及 `pnpm test:docker` 均因 Docker Desktop Linux 引擎管道不存在而失败；完整后端计算回归、容器构建和通过 Go API 生成 PDF 仍待验证。既有通过记录不代表本次变更的这些检查已通过。

## 2026-10-16 Docker 启动后的完整补充验收

此前透镜三组数据与空气比热容比讲义模板的环境阻塞均已解除。本次使用 Windows 已启用的本机代理环境变量访问 Docker Hub，未将个人代理地址写入项目配置。

- `docker build --progress=plain --target server -t phyexp-report:backend-test .` 和 `docker build --progress=plain -t phyexp-report:verification .` 均成功。
- 在 Go 测试镜像运行 `go test ./...`（与 `pnpm test:backend` 的 Go 命令一致），只读挂载 `tex/templates` 到 `/src/tex/templates`。计算、API、渲染和存储包全部通过；包含 48 个有效计算参考场景、39 个非法输入场景及 10 个导入样本，新增比热容比参考值与实际 Go 计算一致。排除 Windows CRLF 后，本次修改的 Go 文件通过 gofmt 检查。
- 设置 `REPORT_TEST_IMAGE=phyexp-report:verification` 后，`pnpm test:docker` 全部通过：17 份 PDF、10 个导入样本、7 种图片格式，以及匿名下载隔离和容器重启后的额度、历史与下载持久性。
- 17 份 PDF 包括八种实验基准、旧透镜省略凹透镜、新比热容比初末读数/100T、新透镜三组完整及省略凹透镜、三份导入报告和两组图片报告；新旧输入均可实际生成报告。
- 实际 Go API 生成的比热容比样例为 7 页，321927 字节，已检查三章节、原始读数、最终 γ=1.450±0.006 和百分差 3.4%，并渲染检查全部页面。已用其替换 `output/pdf/heat-capacity-ratio-sample.pdf`，此文件现在来自真实 API 渲染链路。三组透镜完整报告为 5 页，省略凹透镜报告为 4 页。
- 容器保持 UID 10001，无 Python 运行时；验收容器和临时卷已自动清理，未挂载或读取用户 `.report-data/`。结果见被忽略的 `output/docker-smoke/results.json`。

本次仅验证隔离镜像 `phyexp-report:verification`，未替换正在使用的部署或 `phyexp-report:local` 标签。
