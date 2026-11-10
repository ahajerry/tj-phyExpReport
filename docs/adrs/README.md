# 架构决策

ADR 解释背景与取舍；当前契约见 [specs](../README.md)，实施进度见 plans。

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [0001](0001-go-sqlite-runtime.md) | Go、SQLite 与单 worker | 已接受，追认 |
| [0002](0002-typst-rendering.md) | Typst 原生模板与 Go 计算边界 | 已接受，版式部分由 0006 替代 |
| [0003](0003-report-source-snapshot.md) | PDF 与源码输入快照同时发布 | 已接受 |
| [0004](0004-documentation-layout.md) | 当前事实、操作、决策和计划分离 | 已接受 |
| [0005](0005-pinned-pnpm.md) | 固定 pnpm 与唯一锁文件 | 已接受，追认 |
| [0006](0006-latex-layout-parity.md) | 固定原字体并对齐 LaTeX 版式 | 已接受 |

编号递增；后续替代使用新 ADR 并互链，不改写历史决定。
