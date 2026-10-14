> 历史快照：本文描述迁移前的 Python 实现或当时的提案，不是当前部署指南。

# 04 开发、部署与验证基线

## 当前环境与 pnpm

本次实际版本：Node `v26.11.1`、pnpm `11.28.5`、虚拟环境 Python `3.14.8`、Go `go1.27.2-X:nodwarf5`。这些是本机读数，不是最低版本声明或已确定的生产版本。仓库尚无 `packageManager` / `engines` 约束。

已有 node_modules 与 `.venv` 可用，本次未重新下载依赖。已有未跟踪 `pnpm-lock.yaml`，已用 pnpm 执行检查和构建；**尚未验证干净环境 frozen install**。

从当前已有 pnpm 锁文件的工作副本启动：

```bash
pnpm install --frozen-lockfile
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
PYTHON=.venv/bin/python pnpm run dev
```

如果是只带 npm 锁文件的干净检出，先执行一次 `pnpm import`，审查生成的锁文件，再执行 frozen install。已有 pnpm 锁文件时不应无条件重新导入或覆盖。[pnpm import 官方说明](https://pnpm.io/cli/import)

`--frozen-lockfile` 会在锁文件缺失或不匹配时失败，因此本次文档不把上述安装命令列为已验证通过。不要以关闭 frozen 检查掩盖依赖漂移。[pnpm install 官方说明](https://pnpm.io/cli/install)

`scripts/dev.mjs` 识别 `PYTHON`，而 `pnpm run backend` / `test:backend` 中硬编码的是 `python`。可先激活虚拟环境，或像本文测试一样直接使用 `.venv/bin/python`。

dev 同时管理 Python 和 Vite，检查 8000 端口健康版本；后端 revision 是按非测试 Python 源文件计算的 SHA-256，不是 Git 提交号。改用 Go 后需修改该协议或启动脚本，否则会把 Go 视作旧后端。Vite 代理目标及健康检查 URL 都固定 127.0.0.1:8000，单独改 REPORT_PORT 不会同步修改代理。

## 运行配置

| 配置 | 默认与作用 |
| --- | --- |
| `--environment` / `REPORT_ENV` | development / production，CLI 优先；影响 Cookie Secure 默认值 |
| `REPORT_HOST` | 127.0.0.1 |
| `REPORT_PORT` | 8000 |
| `REPORT_COOKIE_SECURE` | production 默认 1，其余默认 0；代码只把字符串 1 视为启用 |
| `PYTHON` | dev 启动脚本使用；默认 python |
| 数据目录 | 队列默认根目录 `.report-data`；当前无统一环境变量覆盖 |

项目不自动加载 `.env`。每日额度和时区在代码中固定为 50 和 Asia/Shanghai。

## 生产部署现状

1. 安装前端构建依赖、Python 依赖以及 XeLaTeX / 中文字体和 TeX 包。
2. `pnpm run build` 得到 dist；静态服务器需为 BrowserRouter 的深层路由回退至 index.html。
3. 反向代理 `/api` 至单个 Python 进程，HTTPS 下使用生产模式 Cookie。
4. 持久化 `.report-data`；当前声速模板目录还需要写权限，见 [架构差异](01-current-architecture.md)。
5. 代理请求体上限至少覆盖 30 MiB，超时与上传策略配套；PDF 编译异步执行，不应将 POST 连接保持至编译完成。

模板依赖 ctexart/Fandol、geometry、graphicx、tikz/pgfplots、longtable、needspace、fancyhdr 等。正式构建应固定 TeX 发行版与字体，避免不同机器分页漂移。

`scripts/package_deployment.py` 打包源码和运行时模板；不含 dist、依赖、用户数据。当前 TOP_LEVEL 显式包含 `package-lock.json`，没有 `pnpm-lock.yaml` 和 docs，因此还不是 pnpm 完整发布链。`scripts/version.mjs` 无论读版本还是写版本都会读取 npm 锁文件。**不能直接删除 npm 锁后宣称迁移完成。**

## 2026-10-14 实测

| 命令 | 结果 | 含义 |
| --- | --- | --- |
| `pnpm run lint` | 通过 | 当前 ESLint 规则通过 |
| `pnpm run build` | 通过，有大 chunk 提示 | 主 JS 约 1,104.80 kB，gzip 338.16 kB；是构建输出体积，不是网页性能测量 |
| `pnpm run test:experiment-data` | 通过 | JSON 导入与旧 Cookie 工具 |
| `pnpm run test:precision` | 通过 | 前端修约 |
| `node --experimental-strip-types scripts/test-structured-experiment-storage.mjs` | 通过 | 声速/示波器/共振/油滴/扭摆旧数据迁移 |
| `.venv/bin/python -m unittest discover -s backend -t . -p 'test_*.py'` | 67 项，61 通过，6 跳过 | 初次因沙箱 socket 限制失败，获得执行许可后完整重跑通过 |
| `.venv/bin/python scripts/verify_reports.py` | 失败 | 前三种通过，在 millikan 处报未使用字段 charge_01…08 |
| `node --experimental-strip-types scripts/test-report-page-samples.mjs` | 失败 | sample-data.json 的油滴仍是 voltage/time_1…4，与现表单四列不符 |

六个跳过项依赖测试代码按特定名字寻找的用户 CSV/XLSX，本机缺少匹配样例；仓库虽然有 `tex/test-data` 文件，也不等于这些测试已覆盖。应改成可分发、匿名化且路径稳定的 fixtures。

模板失败的直接原因是 verify_reports 直接调用填充器，把全部计算字段交给模板；通用 runtime renderer 则先过滤字段。这个失败说明验证脚本和真实渲染路径不一致，**不能据此断言在线油滴报告必定编译失败**。页面样例检查则暴露新 UI 与旧 payload 样例混用，应拆成现版样例与历史兼容样例。

本次生成 `output/report-review/sample-data.json` 和部分填充后的 TeX，仅为被 Git 忽略的检查产物，不包含用户真实数据。未运行模板重新生成，以避免覆盖版本化模板。

## 尚未验证的部分

- 当前 PATH 中没有 `xelatex`、`pdftotext`；未进行真实 PDF 编译、视觉检查、示波器页数验证。
- `inspect_report_pdfs.py` 和 `verify_oscilloscope_layout.py` 需要 PyMuPDF，未列入 runtime requirements；应建立独立 QA 依赖清单。
- 未做 HTTP 并发/大文件负载、生产代理、崩溃时序、干净机器部署测试。
- 未运行浏览器端到端测试；现有脚本多数为逻辑断言，不能证明 UI 交互全部正常。
- 本轮没有 Go 原型或性能对比，Go 文档中的收益是架构评估，不是测量结果。

## 建议的验证分层

| 层 | 样本与断言 |
| --- | --- |
| 领域单元 | 八实验有效/无效值、数量边界、单位、公式、末端字符串 |
| 导入 | UTF-8/GB18030、公式缓存、空白行、损坏 XLSX、文件布局变化 |
| API 契约 | JSON/multipart、所有权、Cookie、额度、错误和上传上限 |
| 任务集成 | 两 worker 抢占、重复提交、启动恢复、超时、PDF 写入中断 |
| 跨语言对照 | 相同输入比较归一化记录、数值和最终字段；差异须有解释 |
| PDF | 编译、文本/图点/页数、关键页面渲染对比；不以 PDF 二进制相等验收 |
| 浏览器 | 导入→修改→刷新恢复→提交→轮询→下载，以及失败重试 |
| 发布 | 干净 pnpm frozen install、Go 构建、TeX 环境、备份恢复演练 |

CI 应分别运行快速逻辑测试和带 TeX 的集成任务。既有模板检查修复以前不能把它包装成绿色发布门禁。
