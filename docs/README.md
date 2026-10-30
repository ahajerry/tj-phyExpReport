# 文档中心

当前实现为 **Go + React + SQLite + XeLaTeX**。本目录按使用任务组织；历史评估与当前实现明确分开。

最新八种实验的合成样例 PDF 预览集中存放在 `output/pdf/latest/`。旧测试输出、截图、压缩包及残留 Python 后端缓存归档至 `legacy/assets/maintenance-20261030/`，清单见其中的 `inventory.json`；当前生产后端源码在 `server/`。

| 任务 | 文档 |
| --- | --- |
| 启动容器、接入 HTTPS、备份恢复 | [部署指南](deployment.md) |
| 配置开发环境、构建、运行测试 | [开发与验证](development.md) |
| Windows 前端开发、WSL/Docker 配置与网络错误排查 | [Windows 开发与排错](windows-development.md) |
| 理解模块边界和任务生命周期 | [架构](architecture.md) |
| 对接接口、上传、身份与额度 | [API 与存储契约](api.md) |
| 理解八种实验和数值规则 | [实验与计算](experiments.md) |
| 查阅前端字段、单位、默认值 | [字段目录](fields.md) |
| 从旧 Python 服务升级、回退 | [迁移记录](migration.md) |
| 查看已完成的验收和环境限制 | [本地验收记录](validation.md) |
| 查阅重写前的调研与建议 | [历史快照](archive/python-2026-10-14/README.md) |

维护规则：行为修改同步更新 API/实验文档；部署参数以 `server/cmd/reportd/main.go`、`compose.yaml` 为准；验证结果记录命令和限制，不能把“代码支持”写成“实际通过”。历史快照不继续改写为当前指南。
