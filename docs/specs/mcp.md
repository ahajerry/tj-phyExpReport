# 报告 MCP 契约

配置 `REPORT_MCP_CREDENTIALS` 或启用 `REPORT_MCP_GUESTS=1` 后，Go 服务提供 Streamable HTTP `/mcp` 和文件传输端点。协议实现使用官方 Go SDK v1.6.1，服务采用无状态 JSON 响应。所有请求使用个人 Bearer 令牌，拒绝带 `Origin` 的浏览器请求。主体归属与匿名 Cookie 独立。现有报告 [API 和存储规则](api.md) 适用于队列、归属和渲染。管理员发放凭据沿用现有额度，访客额度见下文。

| 工具 | 参数与结果 |
| --- | --- |
| `get_experiment_input` | 可选 `experimentId`。省略时列出实验，指定时返回字段、单位、`fileFormats` 和与网页相同的 `ocrPrompt` |
| `submit_report` | `experimentId`、`requestId`、`input`，可选 `reportInfo`、`imageUploadIds`。成功返回现有 Job |
| `get_report_status` | `jobId`。进行中返回 Job 和 `pollAfterMs`，完成后返回 Job 和 `artifacts.pdf/source` 的路径与文件名 |

`input` 选择一种来源。

- `{"kind":"flat_json","readings":{…}}` 接受网页 OCR 的扁平 JSON。读数推荐使用字符串以保留末尾零。频率输入按字段目录所示单位提交，由服务处理转换。
- `{"kind":"json_file","uploadId":"…"}` 读取相同结构的 JSON 文件。
- `{"kind":"instrument_table","uploadId":"…"}` 读取现有 [仪器表格](experiments.md) 格式。

幂等键为主体与 `requestId` 的组合。相同内容及文件 ID 重放返回原任务，即使暂存文件已失效。同键改动内容返回 `REQUEST_CONFLICT`。记录与任务同事务写入 `mcp_requests`，失败校验不会创建任务或扣额度。其他公开工具错误包括 `INVALID_INPUT`、`NOT_FOUND`、`UPLOAD_NOT_FOUND`、`QUOTA` 和 `SERVER_ERROR`，均带 `message`。任务生成失败的提示在 Job 的 `error`。

| 文件接口 | 行为 |
| --- | --- |
| `POST /api/mcp/uploads` | 单个 multipart 文件字段 `json`、`table` 或 `image`。成功为 201，返回 `uploadId` 与 `expiresAt` |
| `GET /api/mcp/jobs/{jobId}/artifacts/{kind}` | `kind` 为 `pdf` 或 `source`。成功为附件下载，任务未完成、不存在或归属不符均返回 404 |

暂存文件保留 15 分钟，重启失效。已入队报告可在重启后查询。暂存每主体最多 24 文件和 32 MiB，全局最多 256 文件和 64 MiB。每主体每分钟最多 120 个 MCP 或文件请求，服务并发最多 16 个。MCP 调用体最大 384 KiB，实际报告输入、文件和组合大小受 [报告请求边界](api.md) 约束。

## 匿名开通

启用后，客户端本地生成 32 字节随机令牌，以 64 字符小写十六进制字符串作为 `Authorization: Bearer <令牌>` 发送空请求 `POST /api/mcp/guest`。成功返回 204。同一令牌重放成功，不重复计数。SQLite 保存摘要，重启后仍可访问原主体的报告。令牌遗失时无法恢复访客身份。

每小时最多开通 120 个访客，同一连接来源最多 30 个，超限返回 429。来源按连接的对端地址计算。反代部署时，对端可能是同一个代理，配额由该代理后的客户端共享。服务端不信任转发 IP 请求头。每个访客每天最多提交 10 份报告，全部访客每天合计最多 100 份，最多同时有 12 个访客任务在排队或生成。开通计数、队列额度与幂等检查均使用 SQLite 事务。
