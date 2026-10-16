# Windows 开发环境与 Docker 网络排错

本文记录 2026-10-16 的 Windows 本地配置过程。目标是 Windows 编辑代码、Vite 提供前端热更新、Linux 容器运行 Go 后端及 PDF 工具，最终在 Linux 服务器使用仓库 Dockerfile 和 Compose 部署。

## 环境与存储

- Windows 前端需要 Node.js 24+、pnpm **11.28.5**。运行 `pnpm --version` 核对版本，再执行 `pnpm install --frozen-lockfile`。
- Docker Desktop 使用 WSL2 后端和 Linux 容器。管理员 PowerShell 可执行 `wsl --install --no-distribution`，按提示重启；仅为 Docker 运行容器时无需另外安装 Ubuntu。
- WSL 基础组件由 Windows 管理。Docker 的镜像、构建缓存和数据卷较占空间，可在构建前通过 Docker Desktop 的 Settings → Resources → Advanced → Disk image location 指向 D 盘。
- 需要独立 Ubuntu 时，较新版 WSL 可用 `wsl --install -d Ubuntu --location D:\WSL\Ubuntu` 指定发行版位置；该选项不移动 WSL 基础组件，也不设置 Docker 数据位置。
- Windows 已有的 XeLaTeX 可供 Windows 工具使用，但 Linux 容器不能直接使用 Windows 版可执行文件。容器内的 LaTeX、字体和图片工具由 Dockerfile 安装并缓存，无需手动在 WSL 配置一遍。
- 当前 Go 后端包含 Unix 专属进程组及文件锁调用。Windows PowerShell 中使用 `pnpm exec vite` 启动前端；`pnpm dev` 会尝试本机编译后端，完整使用该命令应在 Linux/WSL 环境中进行。

## 错误、原因与处理

### PowerShell 运行 pnpm dev 报 spawn go ENOENT

```text
开发服务启动失败：Error: spawn go ENOENT
syscall: 'spawn go'
```

直接原因是启动脚本调用 `go build` 时找不到本机 Go 命令。当前后端还使用 Unix 专属调用，因此安装 Windows Go 不能解决完整的平台兼容问题。旧版 README 没有区分平台，容易让 Windows 用户误用联合启动命令；现已分别列出 Windows 和 Linux/WSL 的步骤。

Windows + Docker 方案先完成镜像构建，将后端映射到本机 8000 端口，再用 `pnpm exec vite` 启动前端，详见本文“镜像构建成功后的前端开发”。`pnpm dev` 用于具备 Go 和相应依赖的 Linux/WSL 本机环境。

### 找不到 dockerDesktopLinuxEngine 管道

典型错误：

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
The system cannot find the file specified.
```

原因：CLI 已安装，但 Docker Desktop Linux 引擎未启动、尚未就绪，或当前容器模式/context 不匹配。本次检查时未检测到 Docker Desktop 后台进程。

启动 Docker Desktop，完成首次设置，确认使用 WSL2 后端和 Linux 容器。等待引擎就绪后执行：

```powershell
docker context ls
docker info
```

`docker info` 应能显示 Server 信息。若 Desktop 启动失败，在用户终端检查 `wsl --status`、`wsl --version`。自动化工具因权限限制产生的 WSL/管道拒绝访问，不足以证明用户终端也有相同问题。

### Compose 项目名警告和 -p 参数错误

```text
project has been loaded without an explicit name from a symlink
unknown shorthand flag: 'p' in -p
```

前者是路径和项目名推导警告，本身不代表构建失败。`-p` 是 Compose 全局参数，应放在 `up` 前：

```powershell
docker compose -p phyexpreport up -d --build
```

固定项目名也固定 Compose 数据卷的命名范围。后续启动、日志和停止命令应保持同一项目名，避免误以为历史数据丢失。

### Bake 在加载本地定义后立即退出

```text
[internal] load local bake definitions
failed to execute bake: exit status 1
```

本次环境为 Compose 5.6.0、Buildx 0.37.2。设置 `COMPOSE_BAKE=false` 未能绕过此错误；仅凭该日志无法确认 Bake 的根因，不应直接归因于符号链接或 Dockerfile。

可绕过 Compose 的 Bake 调用，直接构建同名镜像，成功后让 Compose 仅启动：

```powershell
docker build --progress=plain -t phyexp-report:local .
# 仅在上一条构建成功后执行
docker compose -p phyexpreport up -d --no-build
```

本次直接构建确实进入 Dockerfile 处理及后续安装阶段，但随后遇到下述网络错误；这不表示完整镜像已构建成功。

### Docker Hub 认证超时：拉取与构建代理需要分别检查

```text
failed to fetch oauth token
Post "https://auth.docker.io/token": dial tcp ...:443: connectex ... timed out
```

本次 `auth.docker.io` 和 `registry-1.docker.io` 的解析结果异常，直连超时；显式使用本机代理的请求成功。因此问题指向 DNS/代理访问路径，不能简单判断为带宽不足。关闭代理是否能解决，取决于当前网络能否正常直连各依赖源。

以下所有示例都应使用自己的 HTTP 或 Mixed 代理端口。**7897 只是本次用户的个人配置，不是项目默认端口或 Docker 标准端口。** 不要把个人代理地址写进 Dockerfile、Compose 或锁文件。

在 PowerShell 输入实际端口并测试：

```powershell
$proxyPort = Read-Host '输入代理软件的 HTTP/Mixed 端口'
$hostProxy = "http://127.0.0.1:${proxyPort}"
curl.exe -I --proxy $hostProxy --connect-timeout 10 https://auth.docker.io/token
```

本次返回 `200 Connection established` 后跟 `405 Method Not Allowed`，说明代理隧道和 HTTPS 请求成功；405 是 HEAD 方法不受接口支持，不是连通性失败。

在 Docker Desktop 的 Settings → Resources → Proxies 配置 HTTP/HTTPS 代理，地址均使用上面的 `$hostProxy` 实际值。若有独立 Containers proxy，选择 Same as host proxy 或设置相同代理；绕过列表不要包含 Docker Hub 域名。应用设置并按提示重启，然后检查：

```powershell
docker pull docker/dockerfile:1
```

本次 `docker pull` 成功后，`docker build` 的认证请求仍直连异常 IP，说明拉取成功不足以证明构建端认证也使用了代理。为当前 PowerShell 的构建进程设置：

```powershell
$env:HTTP_PROXY = $hostProxy
$env:HTTPS_PROXY = $hostProxy
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
docker build --progress=plain -t phyexp-report:local .
```

这些变量仅影响当前终端及其子进程。Docker Desktop 代理应通过 Desktop 设置配置，不应依赖在 daemon.json 中填写代理。仅设置构建参数也不能替代构建端的认证代理。

### 容器内 pnpm 安装报 ECONNRESET

```text
[web 6/10] RUN pnpm install --frozen-lockfile
code: 'ECONNRESET'
host: 'registry.npmjs.org'
```

这是容器构建阶段访问 npm 仓库时连接被重置，不能据此认定锁文件错误。其他并行阶段（例如 apt-get）显示 `CANCELED`，是本阶段失败后的取消，不一定是它们自身失败。

宿主机成功安装依赖与容器安装依赖是不同验证。若容器网络需要代理，可在保持上述终端环境变量的同时，通过构建参数传入容器可访问的代理地址：

```powershell
$containerProxy = "http://host.docker.internal:${proxyPort}"
docker build --progress=plain `
  --build-arg "HTTP_PROXY=$containerProxy" `
  --build-arg "HTTPS_PROXY=$containerProxy" `
  --build-arg 'NO_PROXY=localhost,127.0.0.1,::1' `
  -t phyexp-report:local .
```

容器中的 `127.0.0.1` 指容器自身，不能用它连接 Windows 代理。Docker Desktop 提供 `host.docker.internal` 访问宿主机。代理软件须允许该连接（例如开启 Allow LAN，并确保监听地址和防火墙允许 Docker 网络访问）；只对需要的网络开放。上述参数用于安装阶段，不需在最终镜像设置永久代理 ENV。

如果选择直连，先在 Docker Desktop 将代理设为 No proxy，关闭代理软件，再清理当前终端变量；构建时不传代理参数：

```powershell
Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:NO_PROXY -ErrorAction SilentlyContinue
docker build --progress=plain -t phyexp-report:local .
```

如果再次超时或解析异常，应恢复可用代理或排查 DNS，而非反复修改 Dockerfile。Docker Hub、npm、Go 模块及 Debian 软件源需要各自可达。

## 镜像构建成功后的前端开发

### 每次启动开发

先启动 Docker Desktop，等待 Linux 引擎就绪。以下命令均在项目根目录的 PowerShell 执行；首次使用需要先成功构建 `phyexp-report:local` 镜像。日常启动不需要重新安装依赖或重建镜像。

Vite 的 `/api` 代理目标是本机 8000 端口，因此每次打开新终端后，在启动 Compose 前设置宿主映射：

```powershell
$env:REPORT_PUBLIC_PORT = '8000'
docker compose -p phyexpreport up -d --no-build
Invoke-RestMethod http://127.0.0.1:8000/api/health
pnpm exec vite
```

浏览器访问 Vite 显示的地址（通常为 `http://localhost:5173`）。前端进程占用当前终端，后端容器在后台运行。修改 `src/` 自动热更新，继续使用 `pnpm exec vite`，不要在 Windows PowerShell 改用 `pnpm dev`。

不设端口变量时，Compose 默认提供 `http://localhost:8080`，可直接使用镜像内已构建的前端；Vite 开发仍需上面的 8000 端口映射。

### 修改后端或模板后重新构建

修改 `server/`、`tex/templates/` 或 Dockerfile 后，在另一个 PowerShell 终端的项目根目录执行：

```powershell
docker build --progress=plain -t phyexp-report:local .
```

需要代理时，沿用本文前述终端代理与构建参数，填写自己的端口。仅在构建成功后执行以下命令，更新运行中的后端：

```powershell
$env:REPORT_PUBLIC_PORT = '8000'
docker compose -p phyexpreport up -d --no-build
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Vite 可以继续运行。仅修改前端源码时不需要重建后端镜像；需要查看镜像内前端的更新时才重新构建镜像。

### 查看后端日志

```powershell
docker compose -p phyexpreport logs -f --tail=100 app
```

按 `Ctrl+C` 退出日志跟踪不会停止后端。

### 停止开发

先在运行 Vite 的终端按 `Ctrl+C` 停止前端，再执行：

```powershell
docker compose -p phyexpreport down
```

普通 `down` 保留报告数据卷，不要添加 `-v`，除非明确要删除数据。本流程不挂载或操作用户现有 `.report-data/`。

## 本次确认的结果与限制

- 用户确认本地 `pnpm install --frozen-lockfile` 运行成功；未提供该次 pnpm 版本输出，未据此认定版本检查完成。
- 通过显式代理访问 Docker Hub 认证端点成功；`docker pull docker/dockerfile:1` 成功。
- 直接构建绕过了 Compose Bake 故障，并进入容器依赖安装阶段。
- 尚未收到完整 Docker 构建、服务启动、PDF 生成或 `pnpm test:docker` 成功的结果。容器 pnpm 的 ECONNRESET 是否已解决，不能仅凭本地安装成功认定。
- 本次 Compose Bake 的根因尚未确认；`COMPOSE_BAKE=false` 在此环境未解决问题。

## 参考

- [WSL 命令及发行版位置](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- [Docker Desktop WSL2 后端及数据位置](https://docs.docker.com/desktop/features/wsl/)
- [Docker Desktop 代理设置](https://docs.docker.com/desktop/settings-and-maintenance/settings/)
- [Docker Desktop 不使用 daemon.json 的代理配置](https://docs.docker.com/engine/daemon/proxy/)
- [Buildx 拉取成功但构建认证未使用代理的同类问题](https://github.com/docker/buildx/issues/1979)
- [构建代理参数](https://docs.docker.com/build/building/variables/#proxy-arguments)
- [容器访问宿主机](https://docs.docker.com/desktop/features/networking/)
