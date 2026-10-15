# 仓库维护约束

- JavaScript/TypeScript 依赖只使用 **pnpm 11.28.5**，版本以 `package.json#packageManager` 为准。
- 唯一 JS 锁文件为 `pnpm-lock.yaml`。禁止新增或恢复 `package-lock.json`、`npm-shrinkwrap.json`、`yarn.lock`、Bun 锁文件；不要用 npm/yarn/bun 安装或更新依赖。
- 本地开发、CI、Docker 和文档示例统一使用 `pnpm`。依赖未变更时使用 `pnpm install --frozen-lockfile`；变更依赖用 `pnpm add/remove/update`，提交对应锁文件。不要手工修改锁文件解析结果。
- 版本变更用 `pnpm version:set vYYMMDD.N`；pnpm 锁文件不保存根项目版本号。不要运行自动提交/打标签的包管理器版本命令。
- 生产后端仅运行 `server/` 中的 Go 实现，禁止重新引入 Python 子进程作为计算、导入或渲染路径。`legacy/python/` 和 `docs/archive/` 为历史参考，不作为当前部署指南。
- 保留八种实验、读数文本、单位换算、末端修约、匿名 Cookie 和旧 SQLite 数据兼容性。数值规则变化应补充参考样本和文档。
- 后端修改运行 `pnpm test:backend`；队列/并发修改另运行 `pnpm test:backend:race`。前端修改运行 lint、相关测试和 build。渲染/容器变更构建镜像并运行 `pnpm test:docker`，如环境阻塞须记录具体未验证项。
- 文档入口是 `docs/README.md`。行为、接口和部署变化同步更新当前文档；历史快照保留其历史语境。
- 不读取、提交或覆盖用户 `.report-data/`；测试必须使用合成样本和临时数据卷。
