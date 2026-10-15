# Python → Go 迁移

本次已将 API、队列、八种实验计算、CSV/XLSX 导入、模板填充、图片编排和 XeLaTeX 调用迁入 Go；前端保留 React。生产 Docker 不复制 Python 代码、不调用解释器。旧实现位于 `legacy/python/`，原调研位于 `docs/archive/python-2026-10-14/`。

## 旧数据升级

1. 停止原 Python 服务，完整备份 `.report-data/`；不要边运行边复制 SQLite。
2. 将整个目录作为新服务 `/data` 使用，包含数据库、原图和 PDF，保持文件名不变。
3. 确保容器 UID/GID 10001 有读写权限。可在部署准备时由管理员执行 `chown -R 10001:10001 /srv/phyexp-data`。
4. 配置 Compose app 的 volumes 为 `/srv/phyexp-data:/data`，启动 Go 镜像。
5. 保留原域名与浏览器 Cookie，检查历史 session 和下载；未完成任务会重新排队编译。

不得同时运行 Python 与 Go 写入同一目录。Go 文件锁只能阻止其他 Go 实例，不能阻止旧 Python 服务。

数据库表结构兼容原版。新时间字符串带时区，旧时间保留。新图片使用服务器生成文件名，既有图片路径照常读取。旧匿名 Cookie 保持有效。

## 回退

升级前保留旧源码/镜像及完整备份。需要回退时先停止 Go，另存升级后数据，再恢复升级前备份并启动旧服务。不要让旧版本直接处理未经验证的新任务，尤其是新增字段或输入限制发生变化之后。

## 行为边界

- 原有八种实验、单位和修约目标保留；中间高精度运算实现改变，参见 [实验文档](experiments.md)。
- HTTP 现在有显式超时与有限的提交并发，编译子进程可随关闭取消；新任务日期使用 RFC3339Nano。
- XLSX 新增解压/行列上限；超范围文件明确拒绝。
- 图片使用 ImageMagick/libheif，首帧与方向规则保留，JPEG 字节不会与 Pillow 输出逐字节相同。
- 不引入账号、多实例、自动定期清理、任务幂等键或消息中间件。

## 验收资料

Go 测试、前端检查和 Docker 端到端命令见 [开发与验证](development.md)。`server/testdata/` 均为合成样本，不包含用户真实报告；`output/docker-smoke/` 是本地验收产物，不提交 Git。具体本次验证状态记录在 [验证记录](validation.md)。
