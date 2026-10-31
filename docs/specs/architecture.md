# 架构

生产由 Go 同源提供前端静态资源和 `/api`；开发使用 Vite 代理 `/api` 到 Go。前端为 React、TypeScript、Vite、Tailwind CSS 与本地 shadcn/Base UI 组件，依赖版本以 [package.json](../../package.json) 和锁文件为准。

## 模块与数据流

| 路径 | 职责 |
| --- | --- |
| `src/`、`public/` | 实验录入、导入预览、报告状态与下载 |
| `server/internal/domain` | Payload、保留数字文本的 Scalar、Job、附件与报告产物 |
| `server/internal/experiments` | 字段校验、单位归一化、物理计算、修约、CSV/XLSX 导入 |
| `server/internal/httpapi` | Cookie、上传边界、路由、静态资源、下载 |
| `server/internal/storage` | SQLite 队列、额度、双产物归档、单实例锁 |
| `server/internal/render` | JSON 数据适配、图片转换、Typst 编译、源码 ZIP |
| `server/cmd/reportd` | 配置、信号、HTTP 服务生命周期 |
| `typst/templates/` | 八种实验正文、共享版式、原生图表及静态图片 |
| `server/testdata/` | 合成计算、非法输入和仪器导入参考样本 |

提交通过校验后持久化；worker 调用 Go 计算，生成 JSON 和图片，再由 Typst 排版。PDF 和实际编译输入的 ZIP 一起交给队列归档。物理计算不依赖 HTTP、数据库或排版引擎；Typst 只显示结果和绘制图形。具体边界见 [报告契约](reports.md) 与 [ADR 0002](../adrs/0002-typst-rendering.md)。

## 调度与恢复

每个数据目录只运行一个服务实例和一个 worker。SQLite 使用 WAL、单连接；额度检查与任务创建在同一事务中完成。启动时取得 `server.lock` 的排他文件锁，拒绝第二个实例。

状态为 `queued → running → done/failed`，按创建顺序处理。启动时将遗留 running 重新排队；关闭时停止 HTTP 接收、取消当前工具进程组，将未完成任务重新排队。两个产物先写各自临时文件，再逐个重命名，全部成功后才标记 done。失败不发布部分结果。文件与 SQLite 不构成一个原子事务，崩溃恢复可能重复编译，不承诺仅执行一次。详见 [ADR 0003](../adrs/0003-report-source-snapshot.md)。

## 运行配置

| 环境变量 | Go 默认值 | 生产镜像值或说明 |
| --- | --- | --- |
| `REPORT_ENV` | `development` | `production`；也可用 `--environment` |
| `REPORT_HOST` | `127.0.0.1` | `0.0.0.0` |
| `REPORT_PORT` | `8000` | 容器内部端口 |
| `REPORT_DATA_DIR` | `.report-data` | `/data`；开发脚本另设 `output/dev-data/` |
| `REPORT_TEMPLATE_DIR` | `typst/templates` | `/app/typst/templates` |
| `REPORT_FONT_DIR` | 本地：模板目录同级 `fonts/`；镜像：`/usr/share/fonts/phyexp` | 显式字体目录，忽略其他系统字体 |
| `REPORT_STATIC_DIR` | 空 | `/app/web`；空值不托管前端 |
| `REPORT_COOKIE_SECURE` | production 为 `1`，否则 `0` | Compose 本地 HTTP 为 `0` |
| `REPORT_REVISION` | 编译标识或 development | 覆盖健康响应的版本标识 |

Go 不读取 `.env`。Compose 的 `REPORT_BIND`、`REPORT_PUBLIC_PORT` 仅控制宿主端口，默认 `127.0.0.1:8080`；后端平台目标为 Linux/Unix，使用进程组和文件锁系统调用。

运行镜像只含 Go 服务、前端、Typst、[固定报告字体](reports.md)、ImageMagick/libheif 和必要系统包，不包含 Python 或 TeX。UID/GID 为 10001；Compose 禁止新增权限、丢弃 capabilities，限制 128 个进程和 2 GiB 内存。两个提交/导入请求可同时处理，报告仍串行生成。健康检查只证明服务存活，不检查排版能力。

生产和开发共享 `render-runtime`。开发镜像只复用带有匹配 `org.phyexp.render-engine` 标签的运行时，防止旧 TeX 镜像被误用。工具链升级需重建；模板保存后新任务直接读取。部署切换流程见 [指南](../guides/deployment.md)。
