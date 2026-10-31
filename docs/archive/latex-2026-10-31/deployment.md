# Docker 部署

部署使用最终生产目标；日常开发使用 `pnpm dev` 和独立的 `compose.dev.yaml`，见 [开发与验证](development.md)，无需每次构建生产镜像。

构建为 Corepack、pnpm store/元数据、Go 模块/编译和 apt 下载设置 BuildKit 缓存挂载；pnpm 使用 `--prefer-offline` 复用已有数据，缺失数据仍联网获取。系统基础包只安装一次，再构造包含完整 TeX 资源且无 Python 运行时的生产环境。apt HTTP/HTTPS 空闲超时为 30 秒、重试最多 2 次，关闭 HTTP 流水线以减少镜像站连接兼容问题。更改软件源、源码或安装层重试时可复用已下载文件。缓存可能被 Docker GC 清理，首次准备仍需要联网；`--no-cache` 不会自动清空缓存挂载。

## 首次启动

宿主机安装 Docker Engine 和 Compose v2 或更新版本。无需安装 Go、Node、Python、XeLaTeX 或字体。

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
curl http://127.0.0.1:8080/api/health
```

浏览器访问 `http://localhost:8080`。构建需要联网下载基础镜像、pnpm/Go 依赖和 Debian 包，LaTeX 依赖较大。运行时生成报告无需互联网。

构建默认使用以下国内源，直接执行本文构建命令即可生效，无需修改 Docker Desktop 全局配置：

| 构建参数 | 默认值 | 用途与教程 |
| --- | --- | --- |
| `DOCKER_REGISTRY` | `docker.1ms.run` | [毫秒镜像](https://1ms.run/guide)，拉取 `library/node`、`library/golang`、`library/debian` |
| `NPM_REGISTRY` | `https://registry.npmmirror.com` | [npmmirror](https://npmmirror.com/)，用于 Corepack 下载 pnpm 和 pnpm 安装依赖 |
| `GOPROXY` | `https://goproxy.cn,direct` | [Goproxy.cn](https://github.com/goproxy/goproxy.cn/blob/master/README.zh-CN.md)，下载 Go 模块，保留校验和验证 |
| `DEBIAN_MIRROR` | `http://mirrors.aliyun.com` | [阿里云 Debian](https://developer.aliyun.com/mirror/debian/)，替换 Debian 主仓库和[安全更新仓库](https://developer.aliyun.com/mirror/debian-security)地址 |

Dockerfile 使用 BuildKit 内置前端，不额外拉取 `docker/dockerfile:1`。Debian slim 初始不包含 CA 证书包，因此 apt 使用 HTTP 国内源并保留 Debian 签名验证；安全更新镜像可能有同步延迟。上述参数均可通过 `--build-arg` 覆盖；JS 依赖仍严格使用 `package.json` 声明的 pnpm 11.28.5 和 `pnpm install --frozen-lockfile`。

需要切换回 Docker Hub 时执行：

```bash
docker build --build-arg DOCKER_REGISTRY=docker.io -t phyexp-report:local .
```

该命令只切换基础镜像仓库。也可把 `DOCKER_REGISTRY` 设为其他兼容仓库的域名，不带 `https://` 或末尾斜杠；`DEBIAN_MIRROR` 则需包含协议，不带末尾斜杠。公共镜像源是否可用以实际下载结果为准。

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
