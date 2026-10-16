# Docker 部署

## 首次启动

宿主机安装 Docker Engine 和 Compose v2 或更新版本。无需安装 Go、Node、Python、XeLaTeX 或字体。

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
curl http://127.0.0.1:8080/api/health
```

浏览器访问 `http://localhost:8080`。构建需要联网下载基础镜像、pnpm/Go 依赖和 Debian 包，LaTeX 依赖较大。运行时生成报告无需互联网。

如本机没有 Compose：

```bash
docker build -t phyexp-report:local .
docker volume create phyexp-report-data
docker run -d --name phyexp-report --init --restart unless-stopped \
  -p 127.0.0.1:8080:8000 \
  -e REPORT_COOKIE_SECURE=0 \
  -v phyexp-report-data:/data \
  --security-opt no-new-privileges --cap-drop ALL \
  --pids-limit 128 --memory 2g phyexp-report:local
```

`GET /api/health` 是进程存活检查，不代表 XeLaTeX 已成功生成报告；完整验证见 `pnpm test:docker`。

## 公网与 HTTPS

默认仅绑定 localhost，Cookie Secure 关闭以支持本地 HTTP。正式使用 HTTPS 时，在 Compose 同目录的 `.env` 中写：

```dotenv
REPORT_PUBLIC_PORT=8080
REPORT_BIND=127.0.0.1
REPORT_COOKIE_SECURE=1
```

将现有 HTTPS 反向代理转发到 `http://127.0.0.1:8080`，上传体上限至少 30 MiB。若反向代理在其他容器内，可连接同一 Docker 网络访问 `app:8000`。需要直接暴露端口时显式设置 `REPORT_BIND=0.0.0.0` 并配置访问控制和 TLS。

`.env` 由 Compose 用于变量替换，Go 程序本身不读取 `.env`。

## 参数

| 环境变量 | Go 默认值 | 镜像值 / 说明 |
| --- | --- | --- |
| `REPORT_ENV` | `development` | `production`；亦可用 `--environment` |
| `REPORT_HOST` | `127.0.0.1` | `0.0.0.0` |
| `REPORT_PORT` | `8000` | 容器内部端口 |
| `REPORT_DATA_DIR` | `.report-data` | `/data`，必须可写 |
| `REPORT_TEMPLATE_DIR` | `tex/templates` | `/app/tex/templates` |
| `REPORT_STATIC_DIR` | 空，不托管前端 | `/app/web` |
| `REPORT_COOKIE_SECURE` | production 为 1，否则 0 | Compose 默认 0，HTTPS 改为 1 |
| `REPORT_REVISION` | 编译版本或 development | 可覆盖健康检查版本标识 |

Compose 的 `REPORT_PUBLIC_PORT`、`REPORT_BIND` 只用于宿主端口映射。只运行一个 app 实例，不要对同一数据卷做副本扩容。

## 数据与备份

`/data` 包含 `reports.sqlite3`、可能的 WAL/SHM、`reports/`、`original-images/`、`work/` 和 `server.lock`。用户数据不在镜像内。备份应同时包含数据库、原图和 PDF。

以下使用 Compose 数据卷，停止 app 后通过同一镜像备份：

```bash
mkdir -p backups
docker compose stop app
docker compose run --rm --no-deps --user 0 --entrypoint tar app \
  -C /data -czf - . > backups/report-data.tar.gz
docker compose start app
```

恢复到已停止的 app 数据卷：

```bash
docker compose stop app
docker compose run --rm -T --no-deps --user 0 --entrypoint sh app \
  -c 'tar -xzf - -C /data && chown -R 10001:10001 /data' < backups/report-data.tar.gz
docker compose start app
```

恢复前备份当前卷；恢复应使用空卷，避免混入不属于备份的文件。不要执行 `docker compose down -v`，除非确实要删除所有持久化数据。

## 更新与排错

Windows Docker Desktop 的引擎管道错误、Compose Bake 失败、Docker Hub 认证超时与容器内 pnpm ECONNRESET，见 [Windows 开发与排错](windows-development.md)。代理端口按个人环境填写，不属于项目部署参数。

```bash
docker compose up -d --build
```

旧服务退出时在途任务回到 queued，新服务会重编译。出现 `permission denied` 检查挂载目录是否允许 UID/GID 10001 写入；已有数据迁移见 [迁移说明](migration.md)。

构建时 Go 模块下载超时，应检查 Docker DNS/代理。Linux 下可临时使用 `docker build --network=host -t phyexp-report:local .` 诊断构建网络；这不会改变运行容器的网络配置。

PDF 失败先查看任务 `error` 和容器日志。镜像应有 `xelatex`、`kpsewhich ctexart.cls`、`kpsewhich FandolSong-Regular.otf`、`identify -list format` 中的 HEIC/AVIF。健康检查成功而报告失败时，不要只重试健康检查。
