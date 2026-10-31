# API 与存储

同源 `/api`，错误 JSON 为 `{"error":"说明"}`。API 响应设置 `Cache-Control: no-store` 与 `X-Content-Type-Options: nosniff`；未知路由、未支持方法返回 404。

| 方法与路径 | 成功 | 失败 |
| --- | --- | --- |
| `GET /api/health` | 200，service/revision/backend | 不创建身份，不验证渲染 |
| `GET /api/reports/session` | 200，Session | 存储错误 500 |
| `POST /api/reports/import-table` | 200，data/parameters/reportInfo | 无效输入 400 |
| `POST /api/reports/jobs` | 202，Job | 校验 400、额度 429、存储 500 |
| `GET /api/reports/jobs/{id}` | 200，Job | 不存在或归属不符 404 |
| `GET /api/reports/jobs/{id}/download` | 200，PDF 附件 | 未完成、文件缺失、归属不符 404 |
| `GET /api/reports/jobs/{id}/source` | 200，ZIP 附件 | 未完成、文件缺失、归属不符 404 |

PDF 类型为 `application/pdf`，文件名 `{experimentId}-report.pdf`；源码类型为 `application/zip`，文件名 `{experimentId}-report-source.zip`。两者均通过 attachment 下载，读取已归档文件，不重编译、不增加额度。源码内容见 [报告契约](reports.md)。

## 请求边界

```ts
type Payload = {
  experimentId: string;
  data: Record<string, (string | number)[]>;
  parameters: Record<string, string | number>;
  reportInfo: { student?: string; student_id?: string; group?: string; date?: string };
};
```

读数推荐字符串；JSON 数字保留原始十进制文本，不先转 float64。拒绝布尔值、非法数字和未支持的实验 data/parameters 字段；空读数是否有效按实验校验。实验字段、单位见 [字段目录](fields.md)，跨字段约束与旧输入边界见 [实验规则](experiments.md)。封面值可留空，每项最多 120 字、不得包含控制字符；声速兼容旧 partner 输入但不展示。

| 请求/附件 | 限制 |
| --- | --- |
| JSON | 64 KiB，一个对象，正数 Content-Length |
| multipart 总体 | 30 MiB，正数 Content-Length，`X-Report-Request: 1` |
| payload | 唯一 JSON 字段，64 KiB |
| images | 最多 5 张，每张 8 MiB、4000 万像素；示波器最多 2 张 |
| table | 至多 1 个，2 MiB，仅支持相应仪器 CSV/XLSX |
| XLSX 解压 | 32 MiB、2000 个 ZIP 条目、10000 行 × 256 列 |
| 原始记录表 | 最多 3 张，2–8 列，每表最多 60 行；标题 200 字、单元格 80 字 |

未知或重复 multipart 字段被拒绝。图片支持 PNG/JPEG/GIF/TIFF/WebP/HEIC/AVIF，原文件保存为服务端生成的名称；排版转换见 [报告契约](reports.md)。

表格流程：向 import-table 上传 payload `{experimentId,reportInfo}` 与 table，得到可编辑读数，再向 jobs 提交编辑后的 JSON。也接受直接向 jobs 上传表格：导入数据替换手填读数，非空用户封面覆盖文件封面。原 CSV/XLSX 不归档，持久化最终提交数据。JSON 的 `sourceTables` 属于兼容输入，经行列和文本限制验证；标准前端流程由后端从读数生成记录表。

## 响应、身份与额度

```ts
type Job = {
  id: string; experimentId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number; stage: string; error: string | null;
  queueAhead: number; createdAt: string; imageCount: number;
};
type Session = {
  userId: string; dailyLimit: 50; usedToday: number;
  queueAheadIfSubmitted: number; jobs: Job[];
};
```

Session 返回最近 20 个任务，其他任务可通过 ID 查询；createdAt 为带时区的 RFC3339Nano。每日额度按 Asia/Shanghai 统计，成功创建的失败任务也计数；校验失败、导入、查询和下载不计数。

Cookie `report_user` 是 64 位小写十六进制随机 token，HttpOnly、SameSite=Lax、Path=/、有效一年。所有查询与下载按完整 token 隔离，展示的前 8 位不用于认证。清除 Cookie 后无法恢复旧身份，也能绕过匿名额度；本系统没有账号、身份恢复或严格反滥用额度。

## 持久化

SQLite 表 `jobs` 的列为 `seq,id,user_id,day,payload,status,progress,stage,error,created_at`。本次无表结构变更。数据目录包含：

- `reports.sqlite3` 及 WAL/SHM、`server.lock`；
- `reports/{id}.pdf` 与 `reports/{id}.typ.zip`；
- `original-images/{id}/` 原图；
- `work/` 临时编译目录，任务结束清理。

发布与崩溃恢复规则见 [架构](architecture.md)。本次 Typst 切换采用新数据卷，不承诺迁移旧报告或为旧 PDF 补造源码；旧格式输入支持与旧报告归档是两回事。备份恢复见 [部署指南](../guides/deployment.md)。
