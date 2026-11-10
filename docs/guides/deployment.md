# 部署与切换

配置默认值只在 [架构 spec](../specs/architecture.md) 定义；数据内容见 [API spec](../specs/api.md)。生产使用 Dockerfile 最终目标与 compose.yaml，日常开发见 [开发指南](development.md)。

## 新部署

宿主机需要 Docker Engine 和 Compose v2 或更新版本；无需另装 Go、Node、Typst 或字体。

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
curl http://127.0.0.1:8080/api/health
```

访问 `http://localhost:8080`，用合成数据生成报告并下载两种文件。健康响应只代表服务存活。更完整的隔离验收：`pnpm test:docker`，步骤见 [开发指南](development.md)。构建需要联网，生成报告及源码重编译不需要在线包。

没有 Compose 时：

```bash
docker build -t phyexp-report:local .
docker volume create phyexp-report-data
docker run -d --name phyexp-report --init --restart unless-stopped \
  -p 127.0.0.1:8080:8000 -e REPORT_COOKIE_SECURE=0 \
  -v phyexp-report-data:/data --security-opt no-new-privileges \
  --cap-drop ALL --pids-limit 128 --memory 2g phyexp-report:local
```

## 从 LaTeX 停机切换

本次不迁移旧报告，也不为旧 PDF 补造源码。使用明确的新 Compose 项目名创建新卷，旧卷保留用于回退。

1. 记录现有项目名、镜像 ID 和端口，备份旧环境与配置。使用下方流程停服备份整个数据卷；不要删除旧容器、镜像或卷。
2. 构建当前代码并运行隔离验收，成功后安排停机。旧服务停止后，确认公开端口已释放。
3. 以新项目名启动：`docker compose -p phyexpreport-typst up -d --no-build`。不要把旧卷绑定给新环境。若已有相同项目名，另选未使用名称。
4. 生成合成报告，检查 PDF、ZIP、归属和重启。确认后切换反向代理到新服务；后续命令始终使用新项目名。
5. 需要回退时停止新项目，用原项目/原镜像启动旧服务并切回代理；新卷保留供检查。两个版本不能同时连接一个卷。

上述是部署操作步骤，本次代码迁移不自动运行生产切换或访问用户 `.report-data/`。已在 Typst 版本上的常规更新可使用同一项目 `up -d --build`，新任务读取新模板，完成报告保留原快照。

## HTTPS

在 Compose 同目录 `.env` 设置：

```dotenv
REPORT_BIND=127.0.0.1
REPORT_PUBLIC_PORT=8080
REPORT_COOKIE_SECURE=1
```

将 HTTPS 反向代理转发到本机 8080，上传上限至少 30 MiB。其他容器中的代理可通过共同网络访问 `app:8000`。本地 HTTP 使用 Secure=0；不要在 HTTP 环境错误启用 Secure 导致身份无法保存。`.env` 由 Compose 替换变量，Go 不直接读取。

## 构建源与缓存

Dockerfile 为 pnpm、Go 和 apt 提供 BuildKit 缓存；冻结安装复用已下载文件，缺失内容仍联网。当前参数在 Dockerfile 定义：

| 参数 | 用途 |
| --- | --- |
| `DOCKER_REGISTRY` | Node、Go、Debian 镜像仓库；可设 `docker.io` |
| `TYPST_IMAGE` | 官方 GHCR Typst 镜像，版本和摘要固定；换镜像源时保持同一产物 |
| `NPM_REGISTRY` | Corepack 与 pnpm 下载源 |
| `GOPROXY` | Go 模块代理，保留校验和验证 |
| `DEBIAN_MIRROR` | Debian 软件源，需带协议 |

```bash
docker build --build-arg DOCKER_REGISTRY=docker.io -t phyexp-report:local .
```

基础镜像仓库切换不改变 GHCR 地址或其他软件源。公共镜像是否可用以实际日志为准；代理与网络排错见 [Windows 指南](windows-development.md)。不把个人代理写入 Dockerfile 或锁文件。

## 备份和恢复

停服后备份整个数据卷，包含数据库、PDF、源码 ZIP 和原图。命令中的项目名换成实际部署名，并保持一致：

```bash
mkdir -p backups
docker compose -p phyexpreport-typst stop app
docker compose -p phyexpreport-typst run --rm -T --no-deps --user 0 --entrypoint tar app \
  -C /data -czf - . > backups/report-data.tar.gz
docker compose -p phyexpreport-typst start app
```

恢复前备份当前卷，选择已停止的空卷，避免与旧文件混合：

```bash
docker compose -p phyexpreport-typst stop app
docker compose -p phyexpreport-typst run --rm -T --no-deps --user 0 --entrypoint sh app \
  -c 'tar -xzf - -C /data && chown -R 10001:10001 /data' < backups/report-data.tar.gz
docker compose -p phyexpreport-typst start app
```

不要使用 `down -v` 作为常规停止命令，它会删除持久数据。若报权限错误，检查卷是否可供 UID/GID 10001 写入。PDF 失败查看任务 error 与日志，并检查 `typst --version`、`typst fonts`、`identify -list format`；不要把健康检查通过当作排版通过。
