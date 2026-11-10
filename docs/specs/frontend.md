# 前端契约

当前只启用 [字段目录](fields.md) 中的八项实验。`structured-experiments.ts` 定义录入配置，`experiments.ts` 提供导航，两者 ID 必须一致；实验页由 `StructuredExperimentPage` 渲染，`App.tsx` 提供共享外壳、关于页和报告页。无效及已归档的实验地址 replace 跳转首页。

读数与参数以字符串保存在表单和浏览器缓存，保留末尾零。JSON、仪器表格导入后可编辑，提交使用最终表单值；缓存升级不虚构原始读数。字段单位及计算约束分别由 [fields](fields.md)、[experiments](experiments.md) 定义。

报告页按 API 状态轮询并展示进度、阶段、失败原因和历史。仅 done 状态展示并排下载入口：主按钮“下载 PDF”，`variant="secondary"` 的“下载 Typst 源码”按钮；窄屏允许换行。按钮为原生链接，分别指向 PDF 和源码接口，文件名带报告标题。旁边说明源码为 ZIP、需安装 Typst 和中文字体。历史条目选择后沿用相同下载区域。

下载不重新提交任务；前端可见性不替代服务端鉴权。上传、Cookie、额度和状态的具体契约见 [API](api.md)。页面不显示固定渲染耗时或“两次 LaTeX 编译”等旧说明。

页面默认使用本地 Noto Sans SC，数值/代码使用 JetBrains Mono；主题采用语义颜色变量。小于 768px 使用侧栏抽屉，链接点击后关闭；支持键盘焦点、状态提示和减少动态效果。首页字符动画与普通页面样式隔离。组件位置及修改流程见 [前端维护指南](../guides/frontend-ui.md)。
