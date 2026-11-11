# 在 DeepSeek Harness 生成实验报告

## 部署端

为 `https://lab.tongji.sh` 开启自助开通时，在运行 Compose 的目录中将以下一行添加到 `.env`。如果部署命令指定了 `--env-file`，则修改指定的文件。

```dotenv
REPORT_MCP_GUESTS=1
```

用原项目名及配置运行 `docker compose up -d --build app`，让 Compose 创建采用新环境的容器。HTTPS 反代继续转发 `/mcp` 与 `/api/mcp/` 并保留 Authorization。可独立启用匿名开通，无需创建管理员凭据文件。反代可在开通路径按真实客户端地址限流，应用内的来源限额按实际连接对端计数。具体额度见 [MCP 契约](../specs/mcp.md)。

### 管理员发放凭据

为每个用户生成 32 字节随机令牌，并以 64 字符小写十六进制交付。服务端配置文件只放令牌字符串的 SHA-256 摘要，主体名是稳定的内部标识。以下命令在可信终端生成一组值。第一行为个人令牌，第二行为摘要。

```sh
node -e 'const {randomBytes,createHash}=require("node:crypto"); const token=randomBytes(32).toString("hex"); console.log(token); console.log(createHash("sha256").update(token).digest("hex"))'
```

在应用容器外保存凭据文件，结构为 `{"student-a":["<摘要>"],"student-b":["<摘要>"]}`。通过 Compose override 只读挂载到应用，例如如下配置。确保容器 UID 10001 可读，并限制宿主机上的访问权限。

```yaml
services:
  app:
    environment:
      REPORT_MCP_CREDENTIALS: /run/phyexp/mcp-credentials.json
    volumes:
      - /path/to/mcp-credentials.json:/run/phyexp/mcp-credentials.json:ro
```

用 HTTPS 反代转发 `/mcp` 和 `/api/mcp/`，保留 `Authorization` 与 MCP 协议头，禁止缓存这些响应或记录凭据与正文。若后端直接监听回环，反代向 Go 发送回环 upstream 的 Host，以通过 SDK 的本地地址检查。轮换时可短暂并存两个摘要，更新客户端配置后移除旧摘要并重启服务。主体名保持稳定即可保留报告访问权。撤销时移除该主体或对应摘要并重启。配置及错误契约见 [MCP spec](../specs/mcp.md)。

## DSH 端

安装技能后直接提出生成报告需求。首次使用会访问 `https://lab.tongji.sh`，自动开通匿名身份，并为当前 profile 安装 MCP 客户端和写入托管配置。允许技能脚本访问 DSH profile 目录和站点。如果当前会话还没加载 MCP 工具，重启该 profile。访客令牌保存在 `$DSH_HOME/phyexp-report.json`（默认 `~/.dsh/phyexp-report.json`）。保留该文件即可在同一 DSH Host 的不同 profile 访问自己的报告。

在本机终端也可以显式配置，例如为 Web profile 执行 `node <技能目录>/scripts/setup.mjs setup web`。需要 Node.js 24+，以及可运行 `dsh plugin` 的 DSH 和 pnpm。

### 手工配置

有管理员发放的令牌时，可以把 `{"origin":"https://reports.example.org","token":"<个人令牌>"}` 保存到上述 JSON。下一次生成时技能会同步托管条目。已有手工条目由用户维护，传输脚本也支持通过 `PHYEXP_REPORT_CONFIG` 指定另一份配置。

1. 使用本地 DSH Host 和 Node.js 24 或更新版本。在仓库项目中启动 DSH，或把整个 `phyexp-report` [技能目录](../../.dsh/skills/phyexp-report)复制到个人 DSH 的 `skills/`。图片输入使用支持图像的模型。
2. 在 DSH 的目标 profile 安装官方 `@deepseek-ai/dsh-mcp-client`。在该 profile 的 `cordis.patch.yml` 合并以下条目，保留已有配置。启动后确认工具列表中出现 `mcp__phyexp__get_experiment_input`。[DSH 插件参数](https://deepseek-harness.github.io/deepseek-harness/reference/config-catalog#deepseek-ai-dsh-mcp-client) · [Profile 配置](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish#the-profile-manifest)

   ```yaml
   - insert:
       - id: phyexp-mcp
         name: '@deepseek-ai/dsh-mcp-client'
         config:
           serverName: phyexp
           transport: streamable-http
           url: https://reports.example.org/mcp
           headers:
             Authorization: Bearer <个人令牌>
           toolCallTimeoutMs: 60000
           failOnStartupError: true
   ```

3. 本地 JSON 使用和 MCP 客户端相同的站点和令牌。把文件留在工作区和版本库外。DSH 必须允许脚本读取已授权的输入文件、访问配置和站点、在当前工作区写入输出。
4. 向 DSH 提出生成需求，附上图片、扁平 JSON 或支持的仪器表格，按需附姓名、学号、组别、日期。若 DSH 只提供不可直接读取的附件句柄，将文件先保存到工作区。下载成功后如需微调，按 [源码指南](typst-source.md)准备本地 Typst 和字体。

## 更新实验提示词

修改前端实验字段或 OCR 提示词后运行 `node scripts/mcp-catalog.mjs`，提交生成的目录。运行 `pnpm test:experiment-data` 检查目录与网页一致。
