# 前端维护

页面行为由 [前端 spec](../specs/frontend.md) 定义；本页只说明修改入口和验证流程。

| 修改内容 | 入口 |
| --- | --- |
| 路由、顶栏、About、报告进度/下载 | `src/App.tsx` |
| 实验录入、导入和提交 | `src/StructuredExperimentPage.tsx` |
| 字段配置 / 导航目录 | `src/structured-experiments.ts` / `src/experiments.ts` |
| 侧栏 | `src/components/app-sidebar.tsx` |
| 受迫振动、仪器、透镜表格 | `src/components/` 中对应 readings 组件 |
| UI 基础组件 | `src/components/ui/`，本地 shadcn/Base UI 源码 |
| 首页方案 | `src/components/lab-home.tsx` 与 `home-variants/` |
| About 正文、代码卡片、提示、致谢 | `lab-about.tsx`、`code-block.tsx`、`callout.tsx`、`contributor-credits.tsx` |
| 全局语义主题与字体 | `src/index.css` |
| 文章内容组件样式 | `src/components/content-blocks.css` |

## 调整组件

优先使用组件 props、语义 Tailwind 类与 `cn`；正文、Canvas、代码卡片采用作用域 CSS，避免全局 p/h2/button 覆盖。Base UI 用状态属性存在选择器（如 `[data-active]`），不要照搬其他组件库状态名。嵌套文章组件应使用更明确的作用域选择器，避免反复叠加 `!important`。

链接按钮用 `nativeButton={false}` 和 `render={<a ... />}` / React Router Link，避免嵌套交互元素。报告源码按钮复用现有 secondary 变体；原生 download 属性提供文件下载语义。

```tsx
<Button nativeButton={false} variant="secondary"
  render={<a href={sourceUrl} download="report-source.zip" />}>
  下载 Typst 源码
</Button>
```

Callout 通过 color 选择提示颜色，只有动态紧急错误使用 role=alert。CodeBlock 的 code 传原始字符串与真实换行；只展示/复制，不执行，失败时保留手动复制提示。致谢名单只修改 groups 数据，不为非交互名字添加按钮。

首页在 `lab-home.tsx` 注册/选择方案；当前为 character-ocean，保持独立样式、离屏暂停、减少动态效果与卸载清理。普通页面不得套用 Canvas 首页背景规则。

## 验证

执行 `pnpm lint`、相关前端测试与 `pnpm build`，检查桌面/窄屏、键盘焦点、抽屉关闭、滚动、复制成功/失败和本地字体请求。下载区域检查 queued/running/failed/done 四种状态及两个链接目标；服务端鉴权另由 [API 测试](development.md) 验证。

新增组件仍使用 pnpm，不恢复其他锁文件；涉及行为规则时更新 spec，而非在此再写一份契约。此前详细 CSS 数值清单保存在 [历史 UI 快照](../archive/latex-2026-10-31/frontend-ui.md)，当前样式以源码为准。
