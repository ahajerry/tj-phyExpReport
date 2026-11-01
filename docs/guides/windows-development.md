# Windows 开发与排错

日常启动步骤和工具版本统一见 [开发指南](development.md)。Windows 使用本机 Vite 和 Docker Desktop Linux 后端，不运行 Windows 原生 Go 服务。先执行 `docker info` 确认 Server 可用，再运行 `pnpm install --frozen-lockfile` 与 `pnpm dev`。

## 引擎、端口和缓存

- 找不到 `dockerDesktopLinuxEngine` 管道：启动 Docker Desktop，确认 Linux 容器/WSL2 模式，用 `docker context ls`、`docker info` 检查当前引擎。
- `spawn go ENOENT`：确认运行当前 `pnpm dev`，没有手动使用 `--local`。旧联合启动脚本不适用于 Windows；可用 WSL 本机后端。
- Vite 的 `listen EACCES`：查看终端实际端口，项目默认 15173；检查 `netsh interface ipv4 show excludedportrange protocol=tcp` 和 IPv6 对应命令，选择未占用端口，无需删除系统保留范围。
- 后端 8000 被占用：停止自己之前启动的后端，或只运行 `pnpm dev:frontend`；脚本不替你停止其他服务。
- 工具链变化：运行 `pnpm dev:setup` 再重新启动。模板已挂载，无需因正文修改重建；旧 TeX 镜像不会作为兼容 Typst 运行时使用。

Docker 镜像/缓存的位置可在 Desktop 的 Resources 设置中选择；这与独立 WSL 发行版的位置不是同一设置。Windows 已安装的 Typst 不会自动出现在 Linux 容器内，容器工具由 Dockerfile 提供。

## 构建与网络

Compose 的 `-p` 放在子命令前，如 `docker compose -p phyexpreport up -d --build`。项目名决定命名卷范围，后续操作保持一致。

若 Compose Bake 阶段失败，可先直接构建，再让 Compose 使用构建结果：

```powershell
docker build --progress=plain -t phyexp-report:local .
# 仅在上一条成功后执行
docker compose -p phyexpreport up -d --no-build
```

认证超时、下载失败或 `ECONNRESET` 应按日志中的实际地址排查：基础镜像仓库、GHCR、pnpm registry、Go proxy、Debian 源分别可达才算构建网络正常。本机安装成功不代表容器下载成功；其他阶段的 CANCELED 通常是主失败后的取消。

需要代理时，在 Docker Desktop 代理设置中填自己的 HTTP/Mixed 地址，并按设置应用。构建进程和容器内部需要的地址可能不同：

```powershell
$proxyPort = Read-Host '输入自己的 HTTP/Mixed 代理端口'
$hostProxy = "http://127.0.0.1:${proxyPort}"
$env:HTTP_PROXY = $hostProxy
$env:HTTPS_PROXY = $hostProxy
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
$containerProxy = "http://host.docker.internal:${proxyPort}"
docker build --progress=plain `
  --build-arg "HTTP_PROXY=$containerProxy" `
  --build-arg "HTTPS_PROXY=$containerProxy" `
  -t phyexp-report:local .
```

容器的 localhost 指自身；代理需允许 Docker 网络连接。参数不写入永久 ENV。若验证直连，需同时关闭 Desktop 代理并清理终端代理变量，仅清理一个位置不足以证明直连。

源码安装后的编译不需要代理。历史机器专属端口、失败日志和未完成验证保留在 [迁移前快照](../archive/latex-2026-10-31/windows-development.md)，不能视作当前环境结论。
