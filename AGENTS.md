# 仓库维护约束

- JavaScript/TypeScript 依赖只使用 **pnpm 11.28.5**，版本以 `package.json#packageManager` 为准。
- 唯一 JS 锁文件为 `pnpm-lock.yaml`。禁止新增或恢复 `package-lock.json`、`npm-shrinkwrap.json`、`yarn.lock`、Bun 锁文件；不要用 npm/yarn/bun 安装或更新依赖。
- 本地开发、CI、Docker 和文档示例统一使用 `pnpm`。依赖未变更时使用 `pnpm install --frozen-lockfile`；变更依赖用 `pnpm add/remove/update`，提交对应锁文件。不要手工修改锁文件解析结果。
- 版本变更用 `pnpm version:set vYYMMDD.N`；pnpm 锁文件不保存根项目版本号。不要运行自动提交/打标签的包管理器版本命令。
- 生产后端仅运行 `server/` 中的 Go 实现，禁止重新引入 Python 子进程作为计算、导入或渲染路径。`legacy/python/` 和 `docs/archive/` 为历史参考，不作为当前部署指南。
- 保留八种实验、读数文本、单位换算、末端修约和匿名 Cookie。数值规则变化应补充参考样本和文档。Typst 切换允许停机并启用新数据卷，不要求迁移旧报告；不得因此读取或清理用户数据。
- 后端修改运行 `pnpm test:backend`；队列/并发修改另运行 `pnpm test:backend:race`。前端修改运行 lint、相关测试和 build。渲染/容器变更构建镜像并运行 `pnpm test:docker`，如环境阻塞须记录具体未验证项。
- 文档入口是 `docs/README.md`。行为、接口和部署变化同步更新当前文档；历史快照保留其历史语境。
- 不读取、提交或覆盖用户 `.report-data/`；测试必须使用合成样本和临时数据卷。

## 文档布局与维护

- `docs/README.md` 是唯一文档导航入口；根 README 只保留简介、快速启动和入口链接。
- `docs/specs/` 是精简的当前事实与契约来源，按架构、API/存储、实验与字段、报告、前端划分。同一规则只定义一次，其他文档链接引用。
- `docs/adrs/` 保存重要架构决策，使用递增的 `NNNN-topic.md`，记录状态、背景、选择、理由和影响。追认已有决定必须注明追认，不能伪造决策日期；后续变化用新 ADR 替代并互相链接。
- `docs/plans/` 使用 `YYYY-MM-DD-topic.md`，记录计划状态、阶段清单、验收命令、真实结果及未验证项。计划不得替代当前 specs；实施完成后更新状态和验收记录。
- `docs/guides/` 只维护操作流程和排错，契约通过链接引用 specs。
- `docs/archive/` 保存过时指南和历史验收，保留历史语境；`docs/licenses/` 保留许可证。旧模板及专用工具在 `legacy/latex/` 冻结，不参与当前运行。
- 行为变化同步更新 specs 和相关指南；重要取舍新增 ADR；重排文档须修复活跃链接，不将历史通过记录当成当前验收。
