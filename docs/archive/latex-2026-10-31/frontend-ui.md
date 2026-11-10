# 前端 UI 与 CSS 指南

本文描述当前可运行界面。文档入口为 [README](README.md)，开发命令见 [开发与验证](development.md)。当前启用八项自主实验，旧基础测量演示归档在 [legacy/basic-measurements](../legacy/basic-measurements/README.md)。历史快照不作为现行 UI 规范。

## 1. 文件与组件定位

| 功能 | 组件／文件 | 样式来源 |
| --- | --- | --- |
| 路由、顶栏、页面外壳、About、报告状态 | `src/App.tsx` | Tailwind 工具类与 `src/index.css` |
| 八项实验导航目录 | `src/experiments.ts` | 数据文件，无样式 |
| 侧栏分组与链接 | `src/components/app-sidebar.tsx` | shadcn Sidebar + `.docs-navigation*` |
| 小屏断点订阅 | `src/hooks/use-mobile.ts` | matchMedia 767px，无 CSS |
| 首页方案注册／选择 | `src/components/lab-home.tsx` | 各方案独立 CSS |
| 方案一黑底标题 | `home-variants/serif-glow.tsx` | `serif-glow.css` |
| 方案二 TYPE 字符鱼（当前启用） | `home-variants/character-ocean.tsx` | `character-ocean.css` |
| 方案二模拟／字符绘制 | `home-variants/character-ocean/` | Canvas + 本地字体，来源见 NOTICE.md |
| About 正文容器 | `src/components/lab-about.tsx` | `.about-prose*` |
| 代码卡片 | `src/components/code-block.tsx` | Tabs、Button + `content-blocks.css` |
| 提示框 | `src/components/callout.tsx` | Alert + `content-blocks.css` |
| 致谢名单 | `src/components/contributor-credits.tsx` | Card、Badge + `content-blocks.css` |
| 八项实验录入／导入／提交 | `src/StructuredExperimentPage.tsx` | Input、Textarea、Button、表格与 Tailwind |
| 实验专用表格／预览 | `forced-vibration-readings.tsx`、`instrument-readings.tsx`、`lens-readings.tsx` | Tailwind、原生 table/details |
| 基础组件 | `src/components/ui/` | 本地 shadcn 源码，Base UI、cva、cn |

表中 home-variants 文件均位于 `src/components/`。使用 `@/components/...` 导入。`components.json` 为 `base-nova`、neutral 基色、Lucide 图标、无 RSC；组件是本地源码，可按需修改，不需要完整复制官网的 Next.js/MDX 运行环境。

## 2. CSS、主题与字体

`src/main.tsx` 导入 `src/index.css`。后者加载 Tailwind 4、tw-animate-css、shadcn/tailwind.css 和两款本地 Fontsource 字体。首页方案 CSS 和内容组件 CSS 由组件自行导入，不要再重复加载字体。

| 变量／类 | 用途 |
| --- | --- |
| `--background` / `--foreground` | 页面底色与正文，默认白／近黑 |
| `--card` / `--card-foreground` | 基础卡片颜色 |
| `--muted` / `--muted-foreground` | 浅灰底和次要说明 |
| `--primary` / `--primary-foreground` | 主按钮颜色 |
| `--border` / `--input` / `--ring` | 分隔线、控件边框、焦点轮廓 |
| `--accent`、`--sidebar-*` | 导航悬停、选中和侧栏颜色 |
| `--radius` | 基础组件圆角；由 @theme 派生 sm/md/lg/xl 等 |
| `--font-sans` | Noto Sans SC Variable，全站默认字体 |
| `--font-heading` | 跟随 `--font-sans` |
| `--font-mono` | JetBrains Mono Variable，中文回退 Noto Sans SC |
| `font-mono` | 显式指定代码／数值字体 |

主题变量映射为 Tailwind 的 `bg-background`、`text-foreground`、`bg-muted`、`text-muted-foreground`、`border-border` 等类。新区域优先复用这些语义类，避免写死黑白值。`.dark` 定义了暗色变量，当前界面没有主题切换按钮；首页第二方案明确只使用浅色。

`code/pre/kbd/samp`、数字输入 `input[type=number]`、`input[inputmode=decimal]` 和 `.font-mono` 使用等宽字体。数字输入关闭连字并启用等宽数字。正文、按钮、导航、标签和表格标题默认 Noto Sans SC。字体资源自托管，Noto 按 unicode-range 分片按需加载，许可证见 `public/fonts/`。

### 样式覆盖规则

- 组件布局及变体优先使用组件 props、Tailwind 和 `cn` 合并。
- 文章排版、Canvas 首页及复杂内容块放在具名作用域内，不写全局 `p`、`h2` 或 `button` 规则。
- `index.css` 的 `.about-prose p/code/...` 会影响所有后代。嵌套组件必须用更明确的选择器，例如 `.about-prose .contributor-list`、`.code-block pre code`。
- 自定义 CSS 规则不在 Tailwind utility 层中，可能优先于工具类；仅在 JSX 添加 `p-4` 不一定覆盖它。修改具名 CSS 规则，或使用组件已支持的变量／参数，避免层层叠加 `!important`。
- Base UI 状态使用属性存在选择器：`[data-active]`；不要照搬 Radix 的 `[data-state=active]`。

## 3. 顶栏与页面外壳

`SidebarProvider.app-layout.pt-16` 为 64px 固定顶栏预留空间。顶栏为 `fixed inset-x-0 top-0 z-50 h-16 border-b bg-background px-4`，只显示 `SidebarTrigger` 与加粗站名“全自动大雾实验”。按钮使用 Lucide `PanelLeftIcon`，有中文 aria-label。

桌面侧栏容器从 64px 开始，高度 `calc(100svh - 64px)`。普通内容使用 `.workspace-surface`（跟随 background）与 `p-4 md:p-8`，内层 `mx-auto max-w-6xl`。首页取消该内边距与宽度限制，通过 `.cosmic-surface` 承载各独立方案；不要把首页颜色覆盖写到普通页面上。

## 4. 侧栏

结构：`Sidebar → SidebarContent → nav → SidebarGroup → SidebarGroupLabel + SidebarGroupContent → SidebarMenu → SidebarMenuItem → SidebarMenuButton`。使用 `render={<Link ... />}` 让菜单按钮成为 React Router 链接，不额外嵌套按钮。当前项设置 `isActive` 与 `aria-current="page"`。

| 类／属性 | 当前效果 |
| --- | --- |
| `.docs-navigation` | 隐藏原生滚动条、独立滚动、左内边距 10px |
| mask-image | 上下各 24px 透明渐隐，选项滚出时淡出 |
| margin-block | 桌面上 64px／下 80px；移动抽屉上下各 32px |
| `first:pt-6 last:pb-6` | 首尾内容可滚入清晰区域 |
| `SidebarMenu.gap-0.5` | 条目间距 2px |
| 菜单按钮 | 高 30px、字号 0.8rem、字重 500、w-fit 圆角浅灰选中背景 |
| `.docs-navigation-divider` | 右侧 1px 渐隐分隔线，与列表视口上下留白一致 |
| pointer: coarse | 触屏菜单条目最小高度 44px |

路由改变后，若当前项落在视口渐隐边缘以外，会滚动到中间。小屏（小于 768px）使用 Sheet 抽屉，点击链接后关闭；桌面可折叠。当前目录仅包含八项结构化实验，新增实验须同步结构化配置与导航，`test:samples` 检查两者 ID 一致。

## 5. 首页方案

在 `lab-home.tsx` 的 `homeVariants` 注册组件，用 `activeHomeVariant` 选择。当前为 `character-ocean`；`serif-glow` 保留为方案一。新增方案应使用独立组件和作用域 CSS。

- `.character-ocean-home`：白底、近黑字，grid 居中，最小高度为视口减 64px，隔离层叠、裁切溢出，container-type 为 inline-size。
- 其 canvas：绝对定位填满背景，pointer-events:none、aria-hidden，使用本地 Noto Sans SC；只画 TYPE 字符鱼和小鱼，不引入上游中央面板、字体、主题或其他六种风格。
- 标题：Noto Sans SC、900 字重，`clamp(28px, 8.5cqw, 132px)`；600px 以下为 11cqw；白色文字阴影提高背景有鱼时的辨识度。
- 动画：固定步长、最多追赶 4 步、像素比最高 1.5；后台或离屏暂停；prefers-reduced-motion 显示静态帧；卸载清理 RAF、观察器及事件。
- `.minimal-home`：方案一黑底、浅色标题，字号使用容器单位，文字阴影与轻微模糊实现发光。专用字体已移除，仍用本地 Noto Sans SC。

## 6. About 文章排版

`LabAbout` 仅包装 `<article className="about-prose">{children}</article>`。实际内容在 `App.tsx` 的 AboutPage，按 section、h2/h3、p 组织；不需要给每段加 class。

| 选择器 | 样式／用途 |
| --- | --- |
| `.about-prose` | max-width 760px、水平居中、padding 24px 0 64px、18px 正文、1.85 行高、长内容允许换行 |
| `h1` | 30～42px 自适应、700 字重、1.35 行高、margin 12px 0 20px |
| `h2` | 27px、700、1.4 行高、上 48px／下 22px、scroll-margin-top 24px |
| `h3` | 21px、700、1.5 行高、上 28px／下 12px |
| `p/ul/ol` | 上下各 20px 外边距 |
| `.about-kicker` | 可选小标签，12px、灰色、margin 0 |
| `.about-lead` | 可选导语，20px、灰色、下间距 32px |
| `ul/ol/li` | 圆点／数字列表、1.5em 左缩进；条目上下各 8px |
| 普通 `a` | 下划线、4px 偏移、悬停加深；排除 data-slot=button 的按钮链接 |
| 行内 `code` | JetBrains Mono、0.8em、浅灰底、5px 圆角、.15em/.35em 内边距 |
| `footer` | 上间距 48px、上内边距 24px、分隔线、13px 灰字 |

600px 以下正文 17px、顶部内边距 12px，h2 为 24px／上间距 36px。这些排版类是项目自定义规则，不是安装了 shadcn/typeset。

```tsx
<LabAbout>
  <section>
    <h2>章节标题</h2>
    <p>说明文字，<strong>强调重点</strong>，<code>JSON</code> 表示格式。</p>
    <ul><li>第一项</li><li>第二项</li></ul>
  </section>
</LabAbout>
```

QQ 图片使用 `h-auto w-48 rounded-lg`（约 192px 宽、保持比例、圆角），loading=lazy。GitHub 仓库链接使用 Button outline，通过 `nativeButton={false}` 与 `render={<a href=... />}` 渲染；左侧 `public/github.svg` 为本地官方 Octicons 图标，16px、装饰性 alt=""，暗色 invert。不能为非交互内容添加假按钮。

## 7. Callout 提示框

`Callout` 从 `@/components/callout` 导入，内部为官方 Alert + AlertDescription。参考官网安装页的 18px 圆角、12px/16px 内边距和 14px／1.625 正文。桌面 768px 起左右各外扩 4px。

| 参数 | 用法 |
| --- | --- |
| `title` | 可选 ReactNode，行内加粗标题 |
| `children` | 正文、链接、段落或其他 JSX |
| `color` | neutral（默认）、emerald、blue、amber、rose |
| `role` | 默认 note，动态紧急错误才显式使用 alert |
| `className` 与其他 div 属性 | 传给外层 Alert，可加 id、aria-label 等 |

中性色跟随 muted／border；彩色使用对应 Tailwind 100 背景和 600 边框，暗色 900／400。`.callout[data-color]` 设置 `--callout-background`、`--callout-border`，外层读取它们。颜色与 ARIA 语义互不绑定。段落使用专门规则清除文章段落大间距，链接加粗并有下划线。

```tsx
import { Callout } from "@/components/callout"

<Callout title="说明：">默认中性灰。</Callout>
<Callout color="emerald" title="提示：">绿色提示。</Callout>
<Callout color="blue">参考信息。</Callout>
<Callout color="amber">需要注意的事项。</Callout>
<Callout color="rose" role="alert">动态错误。</Callout>
```

About 的简便导入提示显式指定 emerald；docx 格式说明不指定颜色，使用 neutral。不要在 `.callout` 基类上固定所有调用的颜色。

## 8. CodeBlock 代码卡片

从 `@/components/code-block` 导入。组件复用 Tabs、Button、Lucide Terminal/Copy/Check；纯文本渲染，不执行 code 内容，无语法高亮依赖。

| 参数／字段 | 说明 |
| --- | --- |
| `items` | 至少一项的数组；每项 value 唯一、label 为标签、code 为原始字符串 |
| `items[].language` | 可选语言标记，仅生成 data-language，不自动高亮 |
| `defaultValue` | 初始项 value；省略或找不到时回退首项 |
| `label` | group 与标签栏的无障碍名称，默认“代码示例” |
| `className` | 外层样式扩展 |

```tsx
import { CodeBlock } from "@/components/code-block"

<CodeBlock label="开发命令" defaultValue="dev" items={[
  { value: "dev", label: "开发", language: "bash",
    code: "pnpm install --frozen-lockfile\npnpm dev" },
  { value: "build", label: "构建", language: "bash", code: "pnpm build" },
]} />
```

多行也可以写模板字符串，行首缩进会原样显示与复制。不要用 `<br />` 代替 code 字符串的换行。

| CSS 类 | 作用 |
| --- | --- |
| `.code-block` | 相对定位，18px 圆角、oklch(.98 0 0) 浅灰底、14px，裁切圆角 |
| `.code-block-toolbar` | 4px 上下／12px 左内边距、预留右侧复制空间、半透明分隔线 |
| `.code-block-terminal` | 16px 深色方形底，12px 终端图标、0.7 不透明度 |
| `.code-block-tab-scroll` | 水平滚动、无垂直滚动条，tablist 高 36px |
| `.code-block-tab` | 标签高 28px、8px 圆角，data-active 控制白底边框 |
| `.code-block-copy` | 右上各 8px、高宽 28px，悬停／焦点提高不透明度 |
| `pre / pre code` | 内边距 14px 16px，保留换行与空格，超长行横向滚动，JetBrains Mono |
| `.code-block-feedback` | 复制成功为 sr-only 读屏提示，图标变 Check；失败显示手动复制提示 |

Tabs 支持方向键焦点切换并自动激活，pre 可键盘聚焦滚动。复制只读取当前项 code，成功不改变卡片高度，2 秒后重置，卸载时清理计时器。浏览器禁用 Clipboard API 时显示失败信息。

## 9. 致谢名单

`ContributorCredits` 使用 Card + Badge，参考安装页浅灰圆角分组。人员数据在组件顶部 groups 数组，每组有 id、title、icon、names。人数直接由 names.length 生成；名字原样保留（含星号、emoji），不制作虚构头像或人物链接。

| 类 | 当前样式 |
| --- | --- |
| `.contributor-groups` | 双列等宽网格、16px 间距、上 margin 28px |
| `.contributor-card` | 24px 内边距、18px 圆角、muted 背景、无 ring |
| 卡片内 h3 | 18px，图标与标题同行；覆盖文章默认 h3 外边距 |
| `.contributor-count` | 右侧人数，12px 次要文字 |
| `.contributor-list` | 语义 ul，flex-wrap、8px 间距，清除文章列表圆点／缩进 |
| Badge | 白底，6px/10px 内边距，8px 圆角，13px 常规字重，长昵称可换行 |

600px 以下单列、卡片内边距 20px。名单是静态内容，没有点击／悬停按钮语义。修改人员只编辑 groups，避免重新拼接成顿号分隔的长段落。

## 10. 八项实验与报告页面

实验页由 `StructuredExperimentPage` 根据配置渲染，保留各实验专用表格。共同布局为 `space-y-5`；表单区常用 `rounded-xl border bg-white p-4`，录入网格按 `sm:grid-cols-2` 等断点扩展；表格区域保留横向滚动。Input 的数值字段使用 type=number、step=any、inputMode=decimal 与 aria-label，读数以字符串保存，不为样式改变精度或末尾零。

JSON 导入区使用 Textarea 与 Button，代码／JSON 添加 font-mono；details/summary 展示格式样例；图片上传和封面字段使用原有表单控件。错误和状态文字通过 role=alert/status 表达，禁用按钮反映提交状态。实验内部部分错误／成功提示仍使用语义彩色工具类，不要误认为整个应用仅允许 CSS 黑白值。

报告列表与进度在 App.tsx 的 ReportPage：基础块为圆角边框区域，进度条宽度来自实际 progress，下载／重试为 Button 或链接，队列刷新在报告页进行。历史条目标题来自当前目录，未知旧 experimentId 保留文本回退以兼容历史记录。普通页面修改不要将首页 Canvas 样式应用到报告区。

## 11. 调整与验证

- 改颜色：先改主题变量；局部提示框用 color，不改所有 Alert。
- 改正文：改 `.about-prose`，嵌套内容块有独立选择器。
- 改菜单：在 AppSidebar 调整结构或 class，保留 render Link、aria-current 和移动端关闭行为。
- 改图标：优先 Lucide；品牌 GitHub 使用本地 SVG，并保留许可证。
- 改首页：改当前方案目录，不覆盖其他方案。
- 新装组件：`pnpm exec shadcn add <组件> --yes`；只用 pnpm 11.28.5，不恢复其他锁文件。

修改前端运行 `pnpm lint`、相关测试和 `pnpm build`。检查桌面／手机、菜单开合与滚动渐隐、键盘焦点、复制成功／失败、字体请求、本地资源加载；首页动画还要检查减少动态效果和卸载。后端或容器变化另按仓库规则验证，单纯前端 UI 修改不等于已完成 PDF 端到端验收。
