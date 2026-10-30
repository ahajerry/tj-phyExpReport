# API 与存储契约

同源 `/api`，错误 JSON 为 `{"error":"说明"}`，API 响应为 `Cache-Control: no-store`。前端路由和字段兼容迁移前版本，透镜实验仅接受当前三方法位置读数（见 [字段目录](fields.md#透镜焦距的测量focal-length)），不再接受旧距离或凹透镜字段。

透镜请求可通过 `parameters.position_direction` 指定物屏坐标方向：`"1"` 为物屏坐标最小，`"-1"` 为物屏坐标最大。省略时默认 `"1"`，兼容已有请求；原始坐标不变，服务端按所选方向计算距离并校验位置顺序。

| 方法与路径 | 成功 | 失败 |
| --- | --- | --- |
| `GET /api/health` | 200，service/revision/backend | 不创建身份，不检查 PDF 能力 |
| `GET /api/reports/session` | 200，Session | 存储错误 500 |
| `POST /api/reports/import-table` | 200，data/parameters/reportInfo | 无效输入 400，不占额度 |
| `POST /api/reports/jobs` | 202，Job | 校验 400、额度 429、存储 500 |
| `GET /api/reports/jobs/{id}` | 200，Job | 不存在或不属于访客 404 |
| `GET /api/reports/jobs/{id}/download` | 200，PDF 附件 | 不存在、未完成或不属于访客 404 |

未知 API 路由或未支持的方法返回 404。健康响应额外返回 `backend: "go"`。前端静态文件由同一服务提供，非资源路径回退到 `index.html`。

## 请求

```json
{
  "experimentId": "oscilloscope",
  "data": {
    "voltage_scale": ["0.5", "0.2", "0.2", "0.2"],
    "voltage_divisions": ["5.5", "5.4", "6.6", "3.6"],
    "time_scale": ["0.10", "0.01", "0.01", "0.10"],
    "period_divisions": ["5.8", "6.2", "7.2", "5.2"],
    "reference_frequency": ["16.232", "8.116", "5.4105", "10.821"],
    "nx": ["1", "2", "3", "3"], "ny": ["1", "1", "1", "2"]
  },
  "parameters": {"probe_factor": "1"},
  "reportInfo": {"student": "示例学生", "student_id": "20260001", "group": "1", "date": "2026-10-14"}
}
```

读数和参数推荐字符串；JSON 数字保留其原始文本，不经过 float64 解码。布尔值、NaN/Infinity 和非法数字被拒绝。实验字段集合、读数数量、物理约束按实验验证。封面仅接受 student/student_id/group/date，最多 120 字、无控制字符；声速兼容旧 partner 但不输出它。

| 请求/附件 | 限制 |
| --- | --- |
| JSON | 64 KiB，一个对象 |
| multipart 总体 | 30 MiB，必须 `X-Report-Request: 1` |
| payload | 唯一 JSON 字段，64 KiB |
| images | 最多 5 张，每张 8 MiB、4000 万像素；示波器最多 2 张 |
| table | 至多 1 个，2 MiB，按实验接受 CSV/XLSX |
| XLSX 解压 | 总计 32 MiB、2000 个 ZIP 条目、10000 行 × 256 列 |

必须提供正数 Content-Length。未知或重复 multipart 字段被拒绝。图片支持 PNG/JPEG/GIF/TIFF/WebP/HEIC/AVIF，保存原始内容，渲染时使用首帧、校正方向并转换 JPEG。图片归档名称由服务器生成。

表格流程：向 import-table 上传 payload `{experimentId,reportInfo}` 与 table，得到可编辑读数；编辑后向 jobs 提交 JSON。兼容直接向 jobs 上传表格，以导入数据替换手工读数；非空用户封面覆盖文件封面。原 CSV/XLSX 文件不归档，持久化的是最终提交数据。

## 返回结构

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

Session 返回最近 20 个任务；旧任务仍可通过 ID 查询。新 createdAt 使用带时区的 RFC3339Nano，旧记录保留原字符串。每日额度按 Asia/Shanghai 计算，失败也计数，校验失败和纯导入不计数。

## 身份和存储

Cookie `report_user` 为 64 位小写十六进制随机 token，HttpOnly、SameSite=Lax、Path=/、有效一年。生产默认 Secure，Compose 本地 HTTP 显式关闭。所有查询/下载按完整 token 隔离，展示的前 8 位不是认证凭证。清除 Cookie 会失去原身份，也能绕过匿名日额度；这不是账号系统。

Go 直接兼容旧 `jobs` 表及索引：`seq,id,user_id,day,payload,status,progress,stage,error,created_at`，不变更既有列。SQLite 文件为 `reports.sqlite3`，PDF 为 `reports/{id}.pdf`，原图为 `original-images/{id}/`。切换版本前必须完整备份并停止旧服务，详见 [迁移说明](migration.md)。

声速请求 parameters 中的 res_frequency、phase_frequency 及对应 frequency_error 继续使用 kHz；表单与报告使用 Hz，前端显示和编辑时换算。
