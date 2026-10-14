> 历史快照：本文描述迁移前的 Python 实现或当时的提案，不是当前部署指南。

# 06 分阶段重构实施方案

## 目标和原则

保留八种实验、匿名历史报告、表格导入和图片附件的用户能力。后端形成 Go 模块化单体，使用 SQLite 和本地文件归档，TeX 作为受控子进程；前端继续 React/TypeScript，由 pnpm 管理。暂不引入 Redis、消息中间件、微服务或数据库迁移到 PostgreSQL。

初期保持同源 URL、Cookie 和状态名称不变，降低前后端同时修改的风险。严格输入契约、错误码和字段元数据以增量方式引入；收紧旧行为需有兼容测试或版本边界。

## 建议目录（目标，当前尚不存在）

```text
apps/web/                     # 迁移现 src/public/Vite 配置
  src/app/                    # 路由、布局和 provider
  src/features/experiments/    # 表单、导入、草稿、各实验特殊视图
  src/features/reports/        # 任务列表、状态和下载
  src/shared/api/              # 生成类型、fetch/error/polling
  src/shared/ui/
packages/contracts/           # schema、OpenAPI、生成 TS、合成样例
server/
  go.mod
  cmd/reportd/                # 组装依赖和配置
  internal/httpapi/           # HTTP、Cookie、DTO、错误映射
  internal/application/       # 提交、导入、查询、下载用例
  internal/domain/            # jobs、experiment、precision、单位
  internal/experiments/       # 每实验独立输入/校验/计算
  internal/storage/sqlite/    # migrations、repo、事务
  internal/storage/files/     # 原图、PDF、临时文件
  internal/worker/            # 领取、进度、恢复、取消与关闭
  internal/render/            # TeX 填充、编译、图像接口
  internal/legacy/            # 有退出期限的 Python 适配器
resources/tex/                # 阶段后期迁入 tex/templates
tools/                        # 生成、检查、开发与发布工具
tests/fixtures/               # 匿名化、可公开的版本化测试数据
docs/
pnpm-workspace.yaml
pnpm-lock.yaml
```

先在现目录拆职责和补基线，再移动文件。`ROOT` 路径、源码 hash、模板路径、部署清单、前端 alias、测试 import 和版本脚本都与现目录绑定，大搬家不能与公式改动放在同一批。

## 模块契约

HTTP 只解析与转换协议；application 执行用例；领域代码不得依赖 HTTP、数据库或 XeLaTeX。实验注册表连接实验输入验证、计算与报告模型，不直接拼接 HTTP 响应。

建议边界：

```text
Importer.Parse(file, experiment) -> EditableReadings
Experiment.Normalize(payloadVersion, raw) -> ValidatedInput
Experiment.Calculate(input, calculationVersion) -> CalculationResult
ReportModel.Build(result, cover, attachments) -> ReportModel
Renderer.Render(context, reportModel, progress) -> Artifact
JobRepository.CreateWithinQuota(...) / Claim(...) / Complete(...) / Fail(...)
ArtifactStore.Stage(...) / Commit(...) / Open(...)
```

类型应按实验定义，用判别联合表达 experimentId；动态表格规则独立写验证函数。避免把现在各处的 `dict/map[string]any` 平移成 Go 的巨大 map。通用字段元数据可生成前端表单配置，但物理算法保留独立代码。

## Go 与 Python 过渡协议

新增只运行在本机、无公开监听的 Python CLI，支持 `validate`、`import`、`render` 三个操作。Go 用固定解释器/脚本路径启动，以有大小限制的 JSON stdin/stdout 通讯；大文件通过受控临时目录传递，输出路径只能位于 Go 为本任务分配的目录。stderr 保存有限诊断，不混入 JSON。

协议应有 `protocolVersion`、`operation`、`experimentId`、payload 以及结果/errorCode；渲染进度可采用有界 JSON Lines。Python CLI 只负责计算/导入/编译，**不打开现有任务数据库、不自行领取任务、不写正式归档**。唯一调度和持久化责任在 Go。

请求阶段必须完成与旧版等价的有效性校验，不能把所有校验推迟到 worker，否则错误输入也会消耗额度并改变 400/202 语义。Go 迁完相应领域模块后直接调用 Go 验证，剩余实验暂走 Python validate。

## 持久化与任务设计

- 初期使用现有 jobs 表和相同文件名；扩展表用迁移版本管理，新增列尽量可空或带默认值。
- 新任务记录 `payloadVersion/calculationVersion/templateVersion`，归档 artifact hash、大小、创建时间；旧记录先标为 legacy，不推测无法证明的历史版本。
- 额度检查与插入为一个事务，首次采用单写连接/明确锁策略；引入多个连接后仍需以数据库事务保证额度，不能靠 Go mutex 跨进程协调。
- 默认仍为一个编译 worker。多 worker 必须用事务性条件更新领取，扩展 worker ID、租约和 attempt；不得在每次服务启动时无条件重排所有 running。
- 增加幂等键与 `(user_id, key)` 唯一约束；重复提交返回原任务，不重复扣额度。
- PDF 先临时写入再原子重命名，DB 只在成功归档后标记 done；恢复时核对 done 的文件和孤儿文件。数据库与文件的一致性通过恢复协议解决。
- 原图先 stage，事务成功后提交；失败清理。保留任务归属，不允许客户端决定路径。
- 关闭服务先停止接收/领取，给在途编译有限宽限期，再终止并标记可恢复；错误保留操作性摘要和日志引用。

## 前端设计

把 App 拆成 AppLayout/HomePage/ExperimentRoute/ReportPage/DemoCalculator，把结构化页拆成草稿 hook、导入控件、提交 hook 和实验专用表格。统一 API client 和响应错误处理；HTTP 类型从契约生成。

以一个共享 session 查询源取代 5 秒/2 秒重复轮询，页面隐藏时降频，终态详情停止轮询；需要时使用 AbortController，防止旧请求覆盖新路由状态。此阶段不要求引入额外状态管理框架。

草稿新增 `schemaVersion` 和显式迁移函数，迁移后保留原始备份或提供导出。旧 Cookie 到 localStorage、新旧波形顺序、净直径、质量单位、阻尼 10T 的已有迁移全部保留测试。表单类型不要使用 number 替代原始数字字符串。

长度/密度演示继续存在，明确其与正式 PDF 报告的区别；不要把仅前端功能误删为“后端未注册的死代码”。

## 阶段与退出条件

| 阶段 | 交付 | 退出条件 |
| --- | --- | --- |
| P0 行为基线 | 修复验证脚本；分离当前/历史 fixtures；补 TeX 环境；记录字段、图点和关键 PDF 页面 | 八实验真实生成；跳过项有可分发替代；已知问题明确归类 |
| P1 工具链与边界 | pnpm 完整迁移；Python validate/import/render CLI；统一临时目录与错误边界 | 干净安装/构建/测试/打包通过；只读模板可运行全部实验 |
| P2 Go 服务骨架 | 配置、HTTP、Cookie、SQLite repo、单 worker、Python adapter | 全部 API 契约通过；旧数据库副本恢复/下载/额度测试通过 |
| P3 Go 领域迁移 | precision 先行；逐实验替换计算与导入 | 每个实验的正常/边界/历史样本无未解释差异，原始字符串和单位保留 |
| P4 渲染与运行可靠性 | Go 模板填充、TeX runner、图片策略；故障恢复与日志 | 八实验 PDF 内容/版式通过；超时、崩溃、附件异常可恢复 |
| P5 前端整理与发布 | 页面拆分、契约生成、共享查询、草稿版本；演练切换与回退 | 浏览器关键流程通过；历史报告保留；生产环境演练通过 |

P3 建议顺序：示波器 → 声速 → 透镜 → 比热容比 → 杨氏模量 → 油滴 → 扭摆 → 波尔共振。按复杂度逐步建立经验；油滴非整数幂、图像格式等高风险技术验证应在 P0/P1 提前做，不等到最后才发现不可替代。

每阶段保持可运行版本。前端整理可在契约稳定后穿插进行，但不需要为阶段表机械并行开发。

## pnpm 完整迁移清单

1. 审查当前未跟踪 pnpm 锁文件与 npm 锁解析的依赖差异；固定已验证的 pnpm 精确版本到 packageManager，记录 Node 版本约束。
2. 干净目录运行 `pnpm install --frozen-lockfile`、所有检查及构建，验证严格依赖解析下没有依赖 hoist 的漏声明。
3. 修改 `scripts/version.mjs`：保留日期版本规则，但不再读取/写 npm 锁；不手工修改 pnpm YAML 来同步项目版本。
4. 修改 package_deployment 清单、build_deployment_guide、README、dev 错误提示和前端连接错误文案；部署包带 pnpm 锁和必要 workspace 配置。
5. 确定单一 JS 锁文件后再移除 package-lock；CI 使用 frozen install，缓存按 pnpm 锁区分；不要永久双锁并行更新。
6. 目录拆为 apps/packages 时才引入 workspace，并调整所有脚本路径。Go 依赖由 go.mod/go.sum 管理，不交给 pnpm。

本轮只做文档与评估，以上清单尚未执行。

## 数据迁移、切换和回退

**演练**：使用人工合成或授权脱敏的旧库副本，覆盖 done/failed/queued/running、带图片、旧结构、跨北京时间日期的额度。记录 DB 行数、各状态计数、文件清单/哈希和孤儿差异。

**切换**：先关闭新提交，停止旧 worker 并等待/终止编译；在旧进程完全停止后制作数据库与整个数据目录的一致快照。禁止只复制活跃数据库的单个文件（将来启用 WAL 时尤其如此）。迁移在副本上执行后校验，再切换反向代理。

**身份**：保留 Cookie 名、路径、token 和 jobs.user_id；保持域名/路径或制定单独身份迁移策略。不能根据展示用前 8 位 ID 恢复归属。

**任务**：保留原 id/seq/day/created_at/payload、PDF 与原图。现有 done 文件直接提供下载，不为迁移重算。旧时间字符串无时区，除非部署资料证明来源，否则保留原值并显式注明 legacy。

**观察**：监控队列长度、最老等待时间、编译时长、失败分类、下载错误和磁盘容量；对照环境不写生产目录、不占生产额度。小规模切换不能让两个进程同时管理同一旧队列。

**回退**：早期保持兼容表结构和 payload，停 Go 后可让 Python 接回最新兼容数据；若已产生 Python 无法解释的新格式任务，必须导出/转换或由新服务排空，不能简单恢复老快照丢掉切换后的新报告。每个破坏性迁移前需明确回退转换与停止点。

## 最终完成定义

八种实验、两种演示、全部上传格式和草稿迁移有明确结果；旧报告可查询下载；额度/身份/重启语义符合契约；pnpm 干净安装和部署可复现；计算与版式无未解释差异；有数据库迁移和恢复演练记录。只有这些条件满足，才下线不再需要的 Python 代码和旧资产。
