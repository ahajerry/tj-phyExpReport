# 物理实验报告生成

## 项目目录

| 目录 | 用途 | 是否纳入 Git |
| --- | --- | --- |
| `src/`、`public/` | React 前端源码和静态资源 | 是 |
| `backend/` | Python API、报告生成逻辑与测试 | 是 |
| `tex/templates/` | 服务运行时需要的 LaTeX 模板和插图 | 是 |
| `tex/official/`、`tex/original/`、`tex/zipped/` | 参考资料和模板归档 | 是 |
| `scripts/` | 开发、检查、打包脚本 | 是 |
| `legacy/` | 未被当前应用引用的旧版草稿与历史更新手记 | 可保留在 Git，部署包不包含 |
| `legacy/assets/` | 未被当前应用引用的本地试验图片 | 否 |
| `.report-data/` | 用户任务、上传图片和生成的报告 | 否；生产环境应单独备份 |
| `dist/`、`output/`、`tmp/`、`node_modules/` | 构建、检查及依赖的生成文件 | 否 |

根目录保留 `package.json`、锁文件、Vite/TypeScript 配置，以及现有的独立实验资料。`package.json` 是项目版本号来源；对外版本由它换算成 `vYYMMDD.N`，更新说明写在 [CHANGELOG.md](CHANGELOG.md)。

## 开发环境

安装 Node.js、Python 3、XeLaTeX 后，在项目根目录运行：

```bash
npm ci
python -m pip install -r backend/requirements.txt
npm run dev
```

`npm run dev` 同时启动前端开发服务器和本地 Python 后端。后端默认只监听 `127.0.0.1:8000`，前端通过 Vite 的 `/api` 代理访问。若需单独启动后端，运行 `npm run backend`。开发脚本会检查 8000 端口是否仍运行旧版后端，以免前端连到过期代码。

## 生产环境

生产环境先构建前端，再启动 Python 后端。将 `dist/` 交给 Nginx 等静态文件服务器，并将 `/api` 转发到后端的 `127.0.0.1:8000`：

```bash
npm ci
python -m pip install -r backend/requirements.txt
npm run build
npm run backend:prod
```

`npm run backend:prod` 启用生产模式，访客 Cookie 默认带 `Secure`，因此正式对外服务应使用 HTTPS。后端可通过 `REPORT_HOST`、`REPORT_PORT` 调整监听地址和端口；仅在明确需要本地 HTTP 联调时才设置 `REPORT_COOKIE_SECURE=0`。这些值由 Python 进程的环境变量提供，项目不会自动读取 `.env` 文件。生产环境只运行一个后端进程，保留并备份 `.report-data/`。`npm run preview` 只用于本地预览构建结果，不能代替带 `/api` 转发的服务器。

部署归档运行 `python scripts/package_deployment.py`，产物位于 `output/phyExpCal-upload.tar.gz`。它包含前后端源码和全部运行时模板，不包含 `node_modules/`、`dist/`、`.report-data/`；解包后需在服务器上安装依赖并构建前端。

## 检查与版本管理

```bash
npm run lint
npm run test:backend
npm run test:experiment-data
npm run test:precision
npm run build
```

对外版本号采用 `vYYMMDD.N`。例如 `v261001.1` 是 2026 年 10 月 1 日第 1 次发布；同日下一版是 `v261001.2`，次日第一版是 `v261002.1`。发布当天先运行 `npm run version:set -- vYYMMDD.N`，它会同步更新 `package.json` 和 `package-lock.json`；`npm run version:show` 可检查当前编号。npm 内部必须使用三段数字，所以 `v261003.1` 对应 `261003.1.0`。当前代码仍是开发状态，`v261003.1` 尚未作为正式发布标签使用；真正发布时按实际日期更新编号，将“未发布”的更新记录归入该版本，并完成检查。不要用 `npm version patch/minor/major`，它不符合本项目的日期编号规则。

### Git 分支安排

| 分支 | 用途 |
| --- | --- |
| `main` | 已验证、可发布的代码；发布标签只打在这里 |
| `develop` | 日常开发和集成，验证完成后合入 `main` |
| `feature/名称`、`fix/名称` | 从 `develop` 分出，完成后合回并删除 |

开发和生产环境是两种运行方式，不由分支名自动决定。需要紧急修复线上问题时，从 `main` 分出 `fix/名称`，修复后同时合回 `main` 和 `develop`，避免下一次发布丢失修复。

当前代码只作为 `develop` 的起点。你以后手动启用 Git 时，在现有项目根目录运行，不要复制目录：

```bash
git init -b develop
git add .
git status
git commit -m "Record current development state"
```

如果坚持只向 GitHub 推送 `main`，现在可以先建立一个空的 GitHub 仓库，当前 `develop` 提交只留在本地，等首次达到可发布状态再从已验证提交创建 `main`、推送并打标签。这样 GitHub 暂时没有开发代码备份；若需要远端备份，可将私有仓库中的 `develop` 也推上去。以后发布时先在 `develop` 完成改动、更新版本和 `CHANGELOG.md` 并通过检查，再创建或更新 `main` 并打对应标签。提交前用 `git status` 核对文件；不要提交 `.report-data/`、依赖目录、构建产物或包含私密配置的 `.env` 文件。

## 功能与报告资料

报告提交后，后端逐个编译，并在页面显示排队数、编译进度和 PDF 下载入口。

目前支持生成八种实验报告：声速测定、空气比热容比、密立根油滴、扭摆转动惯量、杨氏模量、波尔共振、透镜焦距、阴极射线示波器。密立根油滴上传 CSV 原始记录（每颗连续四行，支持 UTF-8/GB18030，3–8 颗），扭摆转动惯量上传与提供样例相同版式的 XLSX；后端读取读数、单位与仪器参数，将原始表附入报告。其余实验页面按对应数据表输入读数，仪器参数单独输入，封面信息和原始记录图片可选填。声速报告计算逐差波长、平均室温、声速、A/B 类及合成不确定度、理论声速与百分差；两法算术平均值也会填入报告。理论声速采用 [OpenStax 的干燥空气近似式](https://openstax.org/books/university-physics-volume-1/pages/17-2-speed-of-sound)：`331 × sqrt(1 + t/273)` m/s。

八份统一版式的可编辑模板位于 `tex/templates/`；公共版式 `physics_report_base.tex` 源自 `tex/物理实验报告模板.tex`，封面和原始数据页沿用同济实验报告结构。每份独立压缩包及 `.tex` 副本位于 `tex/zipped/`。原有的 `specific_heat_ratio.zip`、`torsion_inertia.zip`、`young_modulus.zip` 保留为参考资料，最终归档仅保留每个实验一份模板。`tex/official/` 和 `tex/original/` 保留原资料。重新生成模板可运行 `python scripts/build_report_templates.py`；检验字段和示例 PDF 可运行 `python scripts/verify_reports.py --render`。示例 PDF 写入 `output/report-review/`。

打包脚本会核对并打包八份模板、`physics_report_base.tex`、同济标志和模板插图；部署后应检查 `tex/templates/millikan.tex` 等文件确实位于服务工作目录。编译临时文件写在 `.report-data/work/`，模板目录只需可读。

计算过程保留原精度；输出成品数据时，不确定度默认保留一位有效数字，首个非零数字为 1 或 2 时保留两位。按“四舍六入五凑偶”一次修约：舍弃部分小于 5 则舍去，大于 5（含 5 后还有非零位）则进位，恰好为 5 时让保留的末位成为偶数。对应的测量结果修约到不确定度末位所在的数位，保留必要的末尾零。前端结果与八种实验 PDF 使用同一规则，原始读数不改动。扭摆、波尔共振和透镜报告新增的标准不确定度只包含重复测量的统计贡献；没有输入的仪器误差不被推测。可运行 `npm run test:precision` 验证前端规则。

任务与 PDF 存放在 `.report-data/`，重启后未完成的任务会重新排队。浏览器通过 HttpOnly Cookie 保留匿名访客身份；返回网站后从“我的报告”查看任务并下载。每个访客按北京时间每天最多提交 50 份报告，失败的任务也计入提交次数。该限制以浏览器 Cookie 为准，清除 Cookie 或换浏览器会获得新身份；如需防止此类绕过，需要增加账号登录。生产 HTTPS 模式下 Cookie 默认启用 `Secure`。

除密立根油滴和扭摆法外的报告可以附带最多 5 张原始数据图片，每张不超过 8 MiB，请求体上限 30 MiB。图片按任务编号存放在 `.report-data/original-images/<任务编号>/`，并依上传顺序追加到 PDF 原始数据记录页后。未上传图片时，原始数据记录页保留空白提示。支持 PNG、JPEG、GIF、TIFF、WebP、HEIC、AVIF；HEIC 需要 `pillow-heif`。密立根油滴和扭摆法的数据表上限为 2 MiB，报告的原始数据记录页展示解析后的表格。
部署到服务器时，需为 `.report-data/` 使用持久化磁盘，才能在服务器迁移或容器重建后保留报告与原始图片。

八种报告页面统一由 `src/structured-experiments.ts` 配置、`src/StructuredExperimentPage.tsx` 渲染，读数和仪器参数保存在浏览器 localStorage，刷新后可恢复。声速页面首次打开时会把旧版 Cookie 中的读数、参数和封面信息带入新表单；长度、密度演示计算页面仍使用 Cookie。实验页面提供 JSON 导入区，识别提示词与字段名按各自实验配置生成。导入前会校验字段和读数数量，成功后一次性替换当前实验的输入。

前端发给 `POST /api/reports/jobs` 的 JSON 与 `experiments` 配置中的实验 id 和物理量 id 对齐。`GET /api/reports/session` 返回当前访客的任务和今日额度；`GET /api/reports/jobs/{id}` 查询任务；`GET /api/reports/jobs/{id}/download` 下载已完成的 PDF：

后端的 `main.py` 负责 HTTP 和 Cookie，`report_queue.py` 负责持久化队列、限额和归档，`experiment_registry.py` 按 `experimentId` 选择实验模块。`speed_of_sound_exp.py` 及其余七个 `*_exp.py` 模块提供 `report_fields(payload)` 与 `render_report(payload, progress, image_dir)`；公共校验与编译逻辑位于 `structured_report.py`，新增实验计算位于 `report_calculations.py`。

```json
{
  "experimentId": "speed-of-sound",
  "data": {
    "resonance": ["30.40", "35.20", "...共20个读数"],
    "phase": ["26.70", "30.30", "...共20个读数"]
  },
  "parameters": {
    "res_t_start": "20.0", "res_t_end": "21.0", "res_frequency": "35.0", "res_frequency_error": "0.1",
    "phase_t_start": "20.0", "phase_t_end": "21.0", "phase_frequency": "35.0", "phase_frequency_error": "0.1",
    "caliper_error": "0.02"
  }
}
```

测量值用字符串传输，以保留 `30.40` 的末尾零。带图片时使用 `multipart/form-data`，将上述 JSON 放入 `payload` 字段，将图片放入 `images` 字段，并设置 `X-Report-Request: 1` 请求头。

示波器报告按原始记录表输入方波、正弦波、三角波、半波四种波形及四组李萨如测频数据。电压档位用 V/div，时基用 ms/div；波形峰峰值、周期和频率自动计算，频率用 Hz，李萨如法参考频率和计算频率用 kHz；nx 表示水平线切点数，ny 表示垂直线切点数。完整报告为 6–7 页，因此该实验最多附两张原始记录图片。教材十一页截图保存在 tex/original/oscilloscope/，独立模板包在 tex/zipped/oscilloscope.zip。
