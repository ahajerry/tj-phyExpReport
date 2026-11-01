# Windows 开发环境与 Docker 网络排错

本文包含当前开发流程和 2026-10-16 起的 Windows 本地排错记录。目标是 Windows 编辑代码、Vite 提供前端热更新、Linux 容器运行 Go 后端及 PDF 工具，最终在 Linux 服务器使用仓库 Dockerfile 和 Compose 部署。

## 环境与存储

- Windows 前端需要 Node.js 24+、pnpm **11.28.5**。运行 `pnpm --version` 核对版本，再执行 `pnpm install --frozen-lockfile`。
- Docker Desktop 使用 WSL2 后端和 Linux 容器。管理员 PowerShell 可执行 `wsl --install --no-distribution`，按提示重启；仅为 Docker 运行容器时无需另外安装 Ubuntu。
- WSL 基础组件由 Windows 管理。Docker 的镜像、构建缓存和数据卷较占空间，可在构建前通过 Docker Desktop 的 Settings → Resources → Advanced → Disk image location 指向 D 盘。
- 需要独立 Ubuntu 时，较新版 WSL 可用 `wsl --install -d Ubuntu --location D:\WSL\Ubuntu` 指定发行版位置；该选项不移动 WSL 基础组件，也不设置 Docker 数据位置。
- Windows 已有的 XeLaTeX 可供 Windows 工具使用，但 Linux 容器不能直接使用 Windows 版可执行文件。容器内的 LaTeX、字体和图片工具由 Dockerfile 安装并缓存，无需手动在 WSL 配置一遍。
- 当前 Go 后端包含 Unix 专属进程组及文件锁调用。Windows 的 `pnpm dev` 自动使用 Docker 开发后端，同时在本机启动 Vite；无需安装 Windows Go。

## 错误、原因与处理

### Vite 启动报 listen EACCES ::1:5173

本次检查中，Windows 的 IPv4 和 IPv6 TCP 排除范围都包含 5141–5240，Vite 默认端口 5173 因此无法绑定；这与 Compose 后端的 8000 端口无关。仅把 localhost 换成 IPv4 不能避开同样的 IPv4 保留范围。

项目已将 Vite 默认监听地址改为 `127.0.0.1:15173`，API 仍代理到 `127.0.0.1:8000`。已有后端运行时直接执行：

```powershell
pnpm dev:frontend
```

打开终端实际显示的地址（通常为 `http://127.0.0.1:15173`）。也可以显式指定：

```powershell
pnpm exec vite --host 127.0.0.1 --port 15173
```

如新端口也被当前机器保留，可用以下命令核对并选择范围外的空闲端口，无需删除系统保留范围或修改防火墙：

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
netsh interface ipv6 show excludedportrange protocol=tcp
```

`docker compose up --no-build` 只启动已有生产镜像，不包含尚未构建进该镜像的 Go 或模板修改。前端连接该镜像时，前端修改热更新，后端和报告模板仍以该镜像为准。日常同时修改后端/模板应使用后文的 `pnpm dev` 开发流程，并先停止占用 8000 的生产容器。

### 旧启动脚本运行 pnpm dev 报 spawn go ENOENT

```text
开发服务启动失败：Error: spawn go ENOENT
syscall: 'spawn go'
```

直接原因是启动脚本调用 `go build` 时找不到本机 Go 命令。当前后端还使用 Unix 专属调用，因此安装 Windows Go 不能解决完整的平台兼容问题。旧版 README 没有区分平台，容易让 Windows 用户误用联合启动命令；现已分别列出 Windows 和 Linux/WSL 的步骤。

该问题属于旧启动脚本。当前 Windows 直接使用 `pnpm dev`：脚本自动准备专用开发镜像并启动开发容器，不再调用 Windows Go。Linux/WSL 默认保留本机 Go 自动编译流程。

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

## 当前日常开发流程

Docker Desktop Linux 引擎就绪后，在仓库根目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

第一次自动准备 `phyexp-report:dev`（只包含 Go、Node 运行时和报告工具，不执行前端安装/打包）；以后复用镜像与 Go 模块、编译缓存。前端由本机 Vite 热更新，Go 源码保存后自动增量编译并重启，模板保存后新报告直接读取。编译失败保留旧服务，修复并保存后重试。开发数据使用独立命名卷，不挂载 `.report-data/`，不使用生产数据卷。

`pnpm dev:frontend` 只启动 Vite，可用于不需要 API 的页面开发或连接现有 8000 端口的后端。`pnpm dev:setup` 提前准备/更新开发镜像，仅在 Dockerfile、系统工具链或依赖改变后使用。应用源码和模板修改不用执行 `docker build`。`pnpm dev:docker` 在 Linux/WSL 也使用相同容器环境。

Ctrl+C 停止 Vite、日志跟随和本次开发容器，保留数据与缓存。查看后端日志：

```powershell
docker compose -f compose.dev.yaml -p phyexpreport-dev logs -f --tail=100 backend
```

若曾按旧流程启动生产镜像后端，它可能占用 8000 端口；请先手动停止旧服务，脚本不会关闭其他项目。首次准备仍需要下载基础镜像和系统依赖，下面的网络排错仍适用。生产部署继续使用 `compose.yaml`，开发参数见 [开发与验证](development.md)。

## 本次确认的结果与限制

- 用户确认本地 `pnpm install --frozen-lockfile` 运行成功；未提供该次 pnpm 版本输出，未据此认定版本检查完成。
- 通过显式代理访问 Docker Hub 认证端点成功；`docker pull docker/dockerfile:1` 成功。
- 直接构建绕过了 Compose Bake 故障，并进入容器依赖安装阶段。
- 尚未收到完整 Docker 构建、服务启动、PDF 生成或 `pnpm test:docker` 成功的结果。容器 pnpm 的 ECONNRESET 是否已解决，不能仅凭本地安装成功认定。
- 本次 Compose Bake 的根因尚未确认；`COMPOSE_BAKE=false` 在此环境未解决问题。

## 项目默认的国内镜像源

Dockerfile 默认使用[毫秒镜像官方教程](https://1ms.run/guide)提供的 `docker.1ms.run`，基础镜像按 `docker.1ms.run/library/<名称>:<标签>` 拉取；同时使用内置 Dockerfile 前端，避免启动构建时拉取 `docker/dockerfile:1`。重新执行 `docker build --progress=plain -t phyexp-report:local .` 即可。若仍报错，先验证 `docker pull docker.1ms.run/library/debian:bookworm-slim`，根据报错检查镜像服务、代理或 DNS。

容器内 Corepack/pnpm、Go 模块及 apt 也已默认切换为 npmmirror、Goproxy.cn 和阿里云 Debian 镜像源，均可用构建参数覆盖。上文基于官方源的历史错误仍可作为网络排查参考，实际请求地址以当前构建日志为准。切回 Docker Hub 可用 `docker build --build-arg DOCKER_REGISTRY=docker.io -t phyexp-report:local .`；各软件源参数与官方教程见 [Docker 部署](deployment.md)。

2026-10-21 本机验证中，毫秒镜像成功返回 Node、Go、Debian 镜像元数据并下载镜像层；npmmirror 成功提供 pnpm 11.28.5 和全部 500 个依赖包，但后续元数据请求持续出现超过百秒的延迟，单独前端构建验证已停止，未确认 build 通过。完整镜像构建在运行阶段的 apt 索引下载失败：`http://mirrors.tuna.tsinghua.edu.cn/debian/dists/bookworm/main/binary-amd64/Packages` 多次报告 `Connection failed [IP: 101.6.15.130 80]`，apt 退出码为 100。因此本次尚未完成最终镜像及 `pnpm test:docker` 验证，不能把源配置生效等同于完整构建成功。

随后已将默认 Debian 源改为阿里云。临时 `debian-base` 镜像构建成功，但阿里云主包索引同样连接失败；关闭 apt HTTP 流水线与按哈希路径下载后仍失败，尚不能认定是 TUNA 特有问题。检查发现 Docker Desktop 保存的代理模式仍为 manual，地址为本机 7897 端口，`docker info` 也显示内部代理 `http.docker.internal:3128`。镜像域名替换并不会自动关闭 Docker Desktop 代理；要验证完整直连，应在 Desktop 的 Proxies 中把 Docker Desktop proxy 和 Containers proxy（若显示）都设为 No proxy 并应用，同时清除当前终端代理变量。仅清空容器环境变量不足以证明 Desktop 的代理已关闭。配置入口见 [Docker 官方代理设置](https://docs.docker.com/desktop/settings-and-maintenance/settings/#proxies)。

## 参考

- [WSL 命令及发行版位置](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- [Docker Desktop WSL2 后端及数据位置](https://docs.docker.com/desktop/features/wsl/)
- [Docker Desktop 代理设置](https://docs.docker.com/desktop/settings-and-maintenance/settings/)
- [Docker Desktop 不使用 daemon.json 的代理配置](https://docs.docker.com/engine/daemon/proxy/)
- [Buildx 拉取成功但构建认证未使用代理的同类问题](https://github.com/docker/buildx/issues/1979)
- [构建代理参数](https://docs.docker.com/build/building/variables/#proxy-arguments)
- [容器访问宿主机](https://docs.docker.com/desktop/features/networking/)
