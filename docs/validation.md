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

## 2026-10-19 透镜原始位置记录表

按提供的记录单，将透镜改为物距像距法、共轭法、自准直法各三组原始位置（mm）。按用户要求删除旧距离/五组输入兼容和凹透镜选填项；透镜表单使用独立位置缓存键，不加载旧表单缓存。其他实验的兼容规则不变。

- 前端与 Go 字段约束、JSON 识别提示、九列样例、报告原始位置表和距离计算表同步更新；末端修约和 A 类不确定度规则保持不变。
- 合成参考样本覆盖放大/缩小像、原始尾零保留、坐标平移及负坐标；无效样本覆盖缺列、空值、非数字、组数、位置顺序、旧格式和已移除的凹透镜字段。
- 已通过 `pnpm lint`、`pnpm test:experiment-data`、`pnpm test:storage`、`pnpm test:samples`、`pnpm test:precision` 和 `pnpm build`。构建需允许启动子进程，初次沙箱内遇到 spawn EPERM，放开构建子进程后通过；仅有既有的大 chunk 提示。
- 浏览器检查确认三种方法、列顺序、各三行输入和凹透镜入口移除，预览截图为 `output/lens-positions-desktop.png`。预览仅启动前端，报告 API 未启动。
- `pnpm test:backend` 未通过环境准备：本机找不到 `go` 命令。`docker build --progress=plain -t phyexp-report:lens-positions .` 及 `REPORT_TEST_IMAGE=phyexp-report:lens-positions pnpm test:docker` 均因 Docker Desktop Linux 引擎未运行（命名管道 dockerDesktopLinuxEngine 不存在）无法执行。尚未验证 Go 回归、镜像构建和实际 PDF 生成/分页；此前验收通过记录不代表本次已验证。
- 未读取或修改用户 `.report-data/`。

## 2026-10-21 透镜物屏左右切换

- 三种方法共用“物屏在左侧（坐标最小）／右侧（坐标最大）”选择，保存到现有表单缓存；切换不修改原始坐标。后端按方向计算正距离和校验位置顺序，缺省方向沿用旧行为。
- 新增 Go 合成回归测试：将左侧样本映射为 1200 − x 和 −x，检查距离、焦距、均值、不确定度相同及原始读数文本保留，并检查方向错误和位置越界。
- 已通过 `pnpm test:storage`、`pnpm test:samples`、`pnpm test:experiment-data`、`pnpm lint` 和 `pnpm build`。构建在沙箱内遇到 spawn EPERM，允许启动构建子进程后通过，仅有既有的大 chunk 提示。
- 浏览器交互检查通过：左右切换不改坐标、刷新恢复右侧选择和读数、三种方法公式提示更新、提交包含 `position_direction: "-1"`。提交检查拦截请求并返回测试响应，未创建报告。
- `pnpm test:backend` 因本机没有 Go 无法执行，gofmt 同样不可用；WSL 仅列出 docker-desktop，Docker Desktop Linux 引擎命名管道不存在。Go 回归测试和实际报告生成尚未验证。未修改模板或容器配置，未读取或修改用户 `.report-data/`。

## 2026-10-22 透镜绝对值、油滴公式与扭摆逐次结果

- 透镜三种方法的位置差统一取绝对值，移除手动方向选择；保留旧 `position_direction` 参数的 1/−1 校验和默认值，但不再参与距离计算。仍检查两屏之间的位置关系、共轭成大像位置靠近物屏及零距离。新增 `server/testdata/lens-reversed.json`，覆盖用户截图的 930 mm 反向读数；镜像坐标、负坐标、原始读数尾零和越界回归通过。
- 油滴按提供讲义式 (8.3.19)，将整个 t(1+0.0226√t) 取 3/2 次方，修复旧实现遗漏 √t 的问题。报告参考公式、讲义常数、计算、整数倍数、三种元电荷估计和图点同步修正；更新七组油滴参考输出，并用独立 Decimal 60 位结果验证三个固定时间/电压样本。
- 扭摆表 1 补齐三次测量各行的理论惯量、实验惯量与百分差，以及空盘各次实验惯量；旧记录缺少三次尺寸时共用已知平均尺寸，不补造原始读数。平均值行仍按平均尺寸和平均周期计算。表 2 补齐滑块各次单周期。独立合成样本检查单位、各次尺寸、扣盘规则及所有逐次字段；完整模板字段检查通过。
- 三份维护模板、下载用 TEX/ZIP 及相关公式生成源码同步；油滴章节加入局部分页保护。PDF 转 PNG 检查通过：油滴公式、数据表与章节衔接，扭摆旧记录及 XLSX 导入的表 1/2，反向透镜的原始坐标和正距离/焦距，无重叠或表格溢出。
- 已通过 `pnpm lint`、`pnpm test:experiment-data`、`pnpm test:precision`、`pnpm test:storage`、`pnpm test:samples`、`pnpm build`。本机构建首次受沙箱 spawn EPERM 阻止，允许构建子进程后通过；仅有既有的大 chunk 提示。
- 本机没有 Go，`pnpm test:backend` 无法直接启动。改用已有 `phyexp-report:backend-test` 镜像，在 `/src/server` 挂载仓库 `server/`，只读挂载 `tex/`，执行 `go test ./...` 全部通过；修改的 Go 文件已在容器内运行 gofmt。初次未挂载 `tex/` 的全量测试仅因模板路径缺失失败，补挂后通过；最终新增/修改的三类专项测试再次通过。
- `docker build --progress=plain -t phyexp-report:experiment-fixes .` 成功。最终镜像下 `$env:REPORT_TEST_IMAGE='phyexp-report:experiment-fixes'; pnpm test:docker` 通过：16 份 PDF（含反向透镜和油滴/扭摆导入）、10 个表格导入、7 种图片格式、匿名身份归属及重启持久化。记录在忽略目录 `output/docker-smoke/results.json`，视觉检查中间文件在 `output/pdf-review/`。
- 全程仅用合成样本和自动清理的临时容器/数据卷，未读取、覆盖或挂载用户 `.report-data/`；未替换现有部署。

## 2026-10-22 扭摆讲义第 7 节版式

- 按用户提供的两张讲义截图，将扭摆“数据记录与处理”重排为第 7 节：表 3.5.1 使用合并的物体、质量、尺寸/周期符号和惯量/百分差单元格；保留三次尺寸、三次周期与均值，圆筒内外径分列，惯量栏按“公式 + 计算结果”排布，空盘不适用栏绘斜线，表后列 K。表 3.5.2 保留三次周期、均值、实验值、理论值、百分差，添加讲义的滑块惯量说明和公式；重复计时不确定度移至讨论部分。
- 表 3.5.2 与配图公式统一为 I′ = I₄ + 2mx² + I₅，采用未修约的细杆实测惯量 I₄，更新六组扭摆参考输出中的组合理论惯量、百分差及理论图点。独立合成样本验证 x = 5 cm 时 I′ = 0.011266666… kg·m²。I₅ 显示当前输入值，不用截图中的示例常数覆盖已有数据；单位换算和原始读数文本不变。
- 已同步维护模板、下载 TEX 和 ZIP，新增模板结构测试确保合并表格仍包含全部三次周期及可用尺寸字段。
- `pnpm test:backend` 因本机没有 Go 无法直接启动；在已有 `phyexp-report:backend-test` 容器内挂载 `server/` 与只读 `tex/` 执行 `go test ./...` 全部通过，修改的 Go 源码与测试已运行 gofmt。
- `docker build --progress=plain -t phyexp-report:torsion-lecture .` 通过。`$env:REPORT_TEST_IMAGE='phyexp-report:torsion-lecture'; pnpm test:docker` 通过：16 份 PDF、10 个表格导入、7 种图片格式、归属校验和重启持久化。最终版合成 XLSX 样例另生成 `output/pdf/torsion-lecture-sample.pdf`；数据表逐页转 PNG 检查，调整周期和公式列宽，确认合并边框、中文下标和数值完整可见。
- 早期模板直接编译检查未填入 PlotCoordinates，因此只在图表处失败；实际 Go 填数路径生成的 PDF 与最终容器验收均通过。所有验证仅使用合成数据和自动清理的临时容器/数据卷，未读取、修改或挂载 `.report-data/`，未替换现有部署。

## 2026-10-22 Windows Vite 端口保留

- `netsh interface ipv4/ipv6 show excludedportrange protocol=tcp` 均显示 5141–5240 被排除，包含 Vite 默认 5173；未检测到 5173 的普通监听进程。报错 `listen EACCES ::1:5173` 原因为端口受系统保留，不是 API 8000 冲突。
- Vite 默认改为 `127.0.0.1:15173`，保持 8000 API 代理；同步开发文档与 Windows 排错指南。验证 `pnpm exec vite` 成功启动，前端 `/` 和代理 `/api/health` 均返回 200；验证服务器已停止，后端容器未改动。
- `pnpm lint`、`pnpm test:dev`（6 项）、`pnpm test:experiment-data`、`pnpm test:storage`、`pnpm test:samples` 和 `pnpm build` 通过；生产构建仅有既有的大 chunk 提示。本次未修改后端或容器，未读取或修改 `.report-data/`。

## 2026-10-22 扭摆专用末端有效数字

- 按用户提供的评分标准，仅扭摆实验的转动惯量（理论/实验、空盘、各次结果、滑块组合和 I₅）及扭转常数 K 的成品字段改为四位有效数字，百分误差改为两位有效数字；尾零显式保留，零显示 0。大于 100% 的常用百分误差用整数位修约展示，例如 386.1% → 390%（修约至十位），避免挤出窄列。沿用十进制半偶舍入，不修改其他七种实验、原始读数、周期、尺寸、质量或不确定度规则。
- 所有显示字段均从完整十进制结果生成，后续 K、I₄、I₅、惯量、百分误差与图点计算不读取已修约字符串。新增尾零、半偶临界、跨数量级进位、科学计数法、零值测试，以及“实验/理论均显示 0.01127，但完整值百分误差仍显示 0.00038%”的防提前修约样本。原始图点精度不变。
- 更新六组扭摆参考样本的 138 个末端字段；更新脚本检查变化仅限扭摆最终惯量/K/误差，不涉及不确定度、原始字段或图点。成品字段改为严格文本比较，检查必要尾零。全量 Go 测试包含其他七种实验参考样本，全部通过。
- 本机 `pnpm test:backend` 因未安装 Go 无法启动，使用已有测试镜像挂载仓库 `server/` 和只读 `tex/`，执行 `go test ./...` 全部通过；修改 Go 文件已运行 gofmt。
- `docker build --progress=plain -t phyexp-report:torsion-precision .` 成功；`$env:REPORT_TEST_IMAGE='phyexp-report:torsion-precision'; pnpm test:docker` 通过：16 份 PDF、10 个导入、7 种图片格式、归属与重启持久化。合成扭摆样例 `output/pdf/torsion-lecture-sample.pdf` 同步重新生成，数据表转 PNG 核对四位惯量/K、I₅ 的 2.000×10⁻⁶、两位百分误差及尾零，确认无表格溢出。
- 未读取、覆盖或挂载 `.report-data/`，验证仅使用合成样本和自动清理的临时容器/数据卷；未替换当前运行的部署。
