# 文档中心

当前系统使用 React/TypeScript、Go、SQLite 和 Typst。当前行为只在 specs 定义；操作、决策与历史记录分别维护。

| 任务 | 入口 |
| --- | --- |
| 理解模块、运行环境与任务生命周期 | [架构](specs/architecture.md) |
| 对接接口、身份、额度和存储 | [API 与存储](specs/api.md) |
| 查阅输入字段、单位与默认值 | [字段目录](specs/fields.md) |
| 理解计算、修约、导入和兼容输入 | [实验规则](specs/experiments.md) |
| 维护报告、图表、字体和源码快照 | [报告契约](specs/reports.md) |
| 理解页面、录入与下载行为 | [前端契约](specs/frontend.md) |
| 启动开发环境、测试、发布编号 | [开发指南](guides/development.md) |
| 部署、备份、从 LaTeX 停机切换 | [部署指南](guides/deployment.md) |
| 排查 Windows、Docker 与网络问题 | [Windows 指南](guides/windows-development.md) |
| 修改 UI、组件与 CSS | [前端维护](guides/frontend-ui.md) |
| 编辑下载的源码并重新编译 | [源码使用](guides/typst-source.md) |
| 了解重要取舍 | [ADR 索引](adrs/README.md) |
| 查看本次实施和验收结果 | [Typst 迁移计划](plans/2026-10-31-typst-migration.md) |
| 查看版式恢复及验收结果 | [LaTeX 版式对齐](plans/2026-10-31-typst-layout-parity.md) |
| 查阅历史实现与验收 | [LaTeX 快照](archive/latex-2026-10-31/README.md)、[Python 快照](archive/python-2026-10-14/README.md) |

文档维护约束见 [AGENTS.md](../AGENTS.md)。第三方许可证保存在 `docs/licenses/` 和对应资产目录。`output/` 仅保存本机生成的合成验收资料，不属于文档契约或 Git 交付。
