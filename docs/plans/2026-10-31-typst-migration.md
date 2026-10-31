# Typst 迁移与源码下载

状态：已完成（2026-10-31）。基线：`6a4ac04`；交付分支：`refactor-typst`。

## 评估与确认

React/TypeScript、Go、SQLite 的计算与队列已与 XeLaTeX 排版分离，可替换报告引擎而不重写物理计算。迁移前 `pnpm test:backend` 通过；Typst 0.15.1 的合并单元格、公式、原生曲线和 JSON 文本载入最小验证通过。评估阶段将完整中文排版、耗时和容器体积列为待验证项；最终结果见下文。

用户确认：源码以 ZIP 下载，正文与图表可编辑，字体另行安装；保留内容和主要版式，允许换行与分页差异；生产允许停机切换，不要求旧报告兼容；旧 LaTeX 模板和专用工具归档；操作指南独立放在 guides。物理计算仍仅由 Go 负责。沿用 pnpm 11.28.5，统一本地、CI、Docker 的依赖工具。

## 实施清单

- [x] 创建分支，保存评估、计划及 AGENTS 文档约定。
- [x] 建立 Typst 共享版式、图表及八种实验模板；使用 JSON 数据边界，保留读数文本和计算结果。
- [x] 渲染同时返回 PDF 与实际编译输入的 ZIP 快照；全部归档成功后才完成任务。
- [x] 新增受匿名身份保护的源码下载接口及 Secondary Button。
- [x] 替换生产/开发镜像中的 TeX，更新模板挂载及开发镜像检测。
- [x] 整理 specs、guides、adrs、archive 与旧 LaTeX 资源，修复导航。
- [x] 完成数值、存储、API、前端、容器和源码重编译验收，提交变更。

## 实现边界

Typst 版本固定为 0.15.1；图片转换继续使用 ImageMagick/libheif。原生 Typst 绘图不依赖在线包。工作目录限制、120 秒编译超时、进程组取消、有界日志和单 worker 保留。

新增 `GET /api/reports/jobs/{id}/source` 返回 ZIP，原 PDF 路径不变。ZIP 保存对应 PDF 的模板、JSON、图片和编译说明，不包含字体、PDF、日志或服务器路径；下载不重编译、不占额度。模板更新不改变已存快照。

部署指南采用备份旧环境、新数据卷、停机切换、合成报告验收的流程。本次仅交付代码与提交，不直接部署，不访问 `.report-data/`。

## 验收计划

- 运行后端测试和 race、前端 lint、相关测试、build；构建生产和开发镜像，执行 Docker 与开发环境冒烟。
- 八种实验逐页检查，重点覆盖扭摆合并表格、受迫振动长表、油滴空列、示波器图形、科学计数法和图片。
- 检查源码鉴权、状态、持久化、失败和重启恢复；解压下载 ZIP，在独立目录断网重编译。
- 比较相同合成数据下的镜像体积、耗时和内存；记录环境和测量边界，不预先承诺改善比例。
- 核验活跃文档链接、运行路径无 LaTeX/Python 依赖；确认 Git 中无用户数据或构建产物。

## 实测结果

验证环境：Linux x86_64，宿主 Node 26.13.0、Go 1.27.3、Typst 0.15.1；镜像使用 Node 24.22.2、Go 1.27.3、Typst 0.15.1 和 Debian Noto CJK。pnpm 沿用项目指定版本，依赖和锁文件未变更。全部测试使用合成样本、临时目录/卷。

| 验收 | 命令或方式 | 结果 |
| --- | --- | --- |
| Go 数值、导入、API、存储 | `pnpm test:backend` | 通过；物理计算代码及数值参考未改动 |
| 并发 | `pnpm test:backend:race` | 通过 |
| 前端规范、生产构建 | `pnpm lint`、`pnpm build` | 通过；保留既有的大于 500 kB chunk 提示 |
| 表单、精度、缓存、预览、样例 | `pnpm test:experiment-data`、`test:precision`、`test:storage`、`test:preview`、`test:samples` | 全部通过 |
| 开发监听器、独立 Go 构建 | `pnpm test:dev`、`pnpm build:backend` | 通过 |
| 原生排版 | `pnpm test:render --font-dir output/typst-fonts --output output/typst-validation` | 43 组参考样本真实编译通过；JSON 保留结果/读数文本，ZIP 等于实际编译输入 |
| 输入隔离 | 真实编译测试 | 上级目录读取被拒绝；恶意 Typst 标记按文字显示；示波器 1.00/1e0 等整数读数可绘图 |
| 内容与版式 | 八实验 PDF 页图复核、迁移前后中文文本对照、字段/章节断言 | 通过；修复转换残留空括号、示意图说明间距和短表分页；检查合并格、长表、空列、科学计数法和原生图表 |
| 产物发布和恢复 | Go API/队列测试 | 缺少源码、源码重命名失败不发布部分结果；中断后的残留 PDF/tmp 被完整新产物替换；未完成/无归属/缺文件均拒绝下载 |
| 生产镜像 | `docker build -t phyexp-report:typst .` | 通过，无 Python/TeX，字体和 Typst 版本检查通过 |
| 独立 Docker 验收 | `REPORT_TEST_IMAGE=phyexp-report:typst pnpm test:docker` | 16 报告、10 导入、7 图片格式、身份/额度/重启通过 |
| Compose 验收 | `pnpm test:docker --compose`（最终镜像另标记为 `phyexp-report:local`） | 同组验收通过；临时项目退出后清理 |
| 源码复现 | 两种容器验收中逐份下载 ZIP，独立目录、`--network none` 编译 | 16/16 与对应 PDF 的 SHA-256 完全一致，重启前后下载内容不变 |
| 开发镜像 | `docker build --target development -t phyexp-report:dev .`、`pnpm test:dev:docker` | 通过；失败编译保留服务、修复后重启、修改后的 Typst 模板实际生成并进入源码快照、优雅退出 |
| 文档/归档 | 活跃 Markdown 链接检查、Git blob 对照 | 无失效活跃链接；89 份迁移前文档/模板/资源/脚本原样归档；运行路径不依赖历史工具 |

### 性能与体积

相同机器、相同顺序的 16 组提交（含表格与图片），每种引擎各使用独立新卷。LaTeX 基线使用迁移前镜像（保留为 `phyexp-report:latex-baseline`）；Typst 最终样本来自 Compose 验收。记录位于忽略的 `output/latex-baseline/results.json` 和 `output/compose-smoke/results.json`。

| 指标 | XeLaTeX 基线 | Typst |
| --- | ---: | ---: |
| 镜像逻辑体积（MB） | 1276.70 | 550.81 |
| 容器 cgroup 峰值（MB） | 382.26 | 342.66 |
| 任务完成观察中位数（ms） | 2517.00 | 508.00 |
| 任务完成观察均值（ms） | 2558.62 | 519.44 |
| 16 份 PDF 总体积（MB） | 7.27 | 8.37 |

镜像约减少 56.9%。客户端每 500 ms 查询状态，耗时包含校验、归档和轮询误差，不是纯编译器耗时；这组 Typst 样本多数在首次轮询即完成。cgroup memory.peak 包含服务、编译、图片处理和文件缓存，不等于编译器 RSS；单轮测量不能作为容量承诺。PDF 总体积有所增加，源码快照也会额外占用数据卷空间。

### 边界与交付

- 原生绘图和主要内容已验证，允许的字形、换行、分页差异不视为像素回归。未使用真实用户仪器文件或手机照片，未在 Windows/ARM64 上实际运行本次验收。
- 验证了 HTTP 接口和前端构建，未进行交互式浏览器点击验收。大文件上传/极端文本长度的所有组合未穷举。
- 不执行生产部署、不迁移旧报告、不访问 `.report-data/`。源码不含字体；用户另装同版本字体才能复现相同排版。
- 当前事实见 specs，操作见 guides，选择依据见 ADR 0001–0005；本记录只代表上述环境和命令的结果。
- 交付分支 `refactor-typst`；先提交计划与 AGENTS，再提交实现和本验收记录。无构建产物、用户数据或新增依赖锁文件纳入提交。
