# 基础测量演示归档（2026-10-30）

本目录为弃用历史参考，不是当前开发或部署入口，不被 src 导入。

- `App.snapshot.tsx`：弃用前混合页面模块的原样快照，包含两项配置、Calculate 统计、末端修约调用、动态读数行、旧 Cookie 保存、JSON 导入、公式和图表；同时保留当时的外壳、About 和报告页上下文，便于追溯，不能整体替换当前 App。
- `experiments.snapshot.ts`：当时包含“基础测量”“长度测量”“密度测量”的完整目录。
- `lab-about.snapshot.tsx`：旧 About 组件及历史注释，含 10 项实验的文案。
- `chart.tsx`：只供旧演示使用的 shadcn/Recharts 图表封装。
- `test-experiment-data.snapshot.mjs`：以旧密度实验命名的历史合成导入测试。

已移除运行时的两项入口、演示状态容器、Cookie 自动保存、计算表单、JSON 示例与图表；旧 `/experiments/length-measurement` 和 `/experiments/density` 地址 replace 跳转首页。未清除用户旧 Cookie，未读取或修改 `.report-data/`。

原专用依赖 `recharts`、`react-katex`、`katex`、`@types/react-katex` 已由 pnpm 移除。这里的快照不可直接运行，依赖和别名仅反映归档前状态。当前八项结构化实验的 JSON 导入、旧 Cookie 迁移及末端修约仍在 src/lib 中维护；这些是共享兼容逻辑，不应随旧演示删除。生产后端继续使用 server/ 中的 Go 实现。
