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
| 资料页 / 三级指标内容 | `src/components/lab-materials.tsx` / `src/material-indicators.ts` |

## 调整组件

实验页“查看资料”链接由 `StructuredExperimentPage.tsx` 按实验 ID 生成，资料页标题使用对应的 `materials-实验ID` 锚点。调整页面或导航时检查八种实验的链接、直接打开带锚点地址和固定顶栏遮挡；没有资料的实验也应能定位到标题。

资料页的复制内容由指标数组生成，每行一个 `indicator`，不要混入类别或列表前缀。修改复制交互时检查成功反馈、权限拒绝提示和无资料按钮禁用状态。

维护资料页时，在 `material-indicators.ts` 中按实验 ID 添加或修改类别及指标；分隔符 `|` 分隔同类别各行。不要复制一份实验排序，页面直接复用 `experimentItems`。缺失实验不填占位数据，保留标题即可。截图转录保留来源措辞，不自行补充指标或评分；连续截图先核对重叠行。长文本单元格允许换行，更新后检查窄屏显示。

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

## 在其他页面复用关于页排版

现有样式结构和适用范围见 [文章排版契约](../specs/frontend.md#关于页与文章排版)。同项目内可以直接复用 `LabAbout`，并按需组合内容组件：

```tsx
import { LabAbout } from "@/components/lab-about"
import { Callout } from "@/components/callout"

export function HelpPage() {
  return (
    <LabAbout>
      <h1>使用帮助</h1>
      <p>介绍实验数据录入和报告生成流程。</p>
      <h2>准备读数</h2>
      <p>按实验要求填写数据，然后提交报告。</p>
      <Callout title="提示">读数应保留原始有效数字。</Callout>
    </LabAbout>
  )
}
```

示例仅定义页面组件；需要页面地址时，再在 `App.tsx` 注册路由并按需添加导航。全站已加载 `index.css`，内容组件会导入自己的 `content-blocks.css`，不必复制 CSS 到每个页面。实验录入页优先在独立说明区域应用文章排版，避免将整个表单包进去。

如果多个页面长期共用，可将 `LabAbout` 提取或重命名为通用 `ArticleLayout`，将 `.about-prose` 同步改为 `.article-prose`。这是后续重构建议，当前代码仍使用原名称。实施时检索所有引用，尤其是 `content-blocks.css` 中提示框和致谢组件的选择器，并检查组件在容器内外的样式。

迁移到其他项目时，按需带上容器和内容组件、对应 CSS、主题变量、字体资源，以及组件引用的 UI 基础组件、图标、`cn` 等依赖；同时适配 `@/` 路径别名和 Tailwind/shadcn 样式环境。只复制 `.about-prose` 规则可以获得基本排版，但不足以复现完整提示框、代码块交互和主题效果。不要复制全站样式覆盖目标项目已有主题。

复用后检查长链接、列表缩进、代码块横向滚动、按钮链接、深浅色以及 600px 附近的布局。新增表格、引用块或图片时，增加有作用域的样式并验证窄屏溢出。

## 验证

执行 `pnpm lint`、相关前端测试与 `pnpm build`，检查桌面/窄屏、键盘焦点、抽屉关闭、滚动、复制成功/失败和本地字体请求。下载区域检查 queued/running/failed/done 四种状态及两个链接目标；服务端鉴权另由 [API 测试](development.md) 验证。

新增组件仍使用 pnpm，不恢复其他锁文件；涉及行为规则时更新 spec，而非在此再写一份契约。此前详细 CSS 数值清单保存在 [历史 UI 快照](../archive/latex-2026-10-31/frontend-ui.md)，当前样式以源码为准。
