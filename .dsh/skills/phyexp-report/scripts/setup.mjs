import { execFile } from "node:child_process"
import { lstat, mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { randomBytes, randomUUID } from "node:crypto"
import { dirname, join } from "node:path"
import { promisify } from "node:util"
import { configPath, dshHome, reportCredentials, reportRequest } from "./connection.mjs"

const run = promisify(execFile)
const plugin = "@deepseek-ai/dsh-mcp-client"
const begin = "# BEGIN phyexp-report managed MCP"
const end = "# END phyexp-report managed MCP"
const version = "2025-11-25"
const tools = ["get_experiment_input", "submit_report", "get_report_status"]

async function readOptional(path) {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (error.code === "ENOENT") return ""
    throw error
  }
}

async function writePrivate(path, contents) {
  const temp = `${path}.${randomUUID()}.tmp`
  await writeFile(temp, contents, { flag: "wx", mode: 0o600 })
  try {
    await rename(temp, path)
  } finally {
    await unlink(temp).catch(error => {
      if (error.code !== "ENOENT") throw error
    })
  }
}

async function withLock(path, action) {
  const lock = await open(path, "wx", 0o600)
  try {
    return await action()
  } finally {
    await lock.close()
    await unlink(path)
  }
}

async function enrollGuest() {
  await mkdir(dirname(configPath), { recursive: true })
  return withLock(`${configPath}.lock`, async () => {
    const credentials = await reportCredentials({ allowGuest: true })
    if (!credentials.needsEnrollment) return credentials
    const config = { ...credentials.config, token: credentials.config.token ?? randomBytes(32).toString("hex"), guestPending: true }
    await writePrivate(configPath, JSON.stringify(config) + "\n")
    let response
    try {
      response = await reportRequest({ ...credentials, authorization: `Bearer ${config.token}` }, "/api/mcp/guest", { method: "POST" }, 10_000)
    } catch {
      throw new Error("无法连接 lab.tongji.sh 完成匿名开通，请检查网络和 HTTPS 证书后重试")
    }
    await response.body?.cancel()
    if (response.status !== 204) {
      if (response.status === 404) throw new Error("lab.tongji.sh 尚未启用匿名开通")
      if (response.status === 429) throw new Error("匿名开通暂时达到上限，请稍后用同一配置重试")
      throw new Error(`匿名开通收到 HTTP ${response.status}`)
    }
    delete config.guestPending
    await writePrivate(configPath, JSON.stringify(config) + "\n")
    return reportCredentials()
  })
}

async function verifyServer(credentials) {
  const send = async (method, params, id) => {
    let response
    try {
      response = await reportRequest(credentials, "/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": version,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      }, 10_000)
    } catch {
      throw new Error("无法连接报告 MCP，请检查站点地址、HTTPS 证书和网络")
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(response.status === 401
        ? "报告服务拒绝个人令牌，请核对令牌是否正确或已撤销"
        : `报告 MCP 自查收到 HTTP ${response.status}，请检查站点路由和服务状态`)
    }
    if (id === undefined) {
      await response.body?.cancel()
      return
    }
    const data = await response.json().catch(() => null)
    if (data?.id !== id || !data.result) throw new Error("站点未返回预期的报告 MCP 响应")
    return data.result
  }
  const result = await send("initialize", {
    protocolVersion: version, capabilities: {}, clientInfo: { name: "phyexp-report-setup", version: "1.0.0" },
  }, 1)
  if (result.protocolVersion !== version || result.serverInfo?.name !== "phyexp") {
    throw new Error("站点的 MCP 服务或协议版本不匹配")
  }
  await send("notifications/initialized", {})
  const catalog = await send("tools/list", {}, 2)
  if (!Array.isArray(catalog.tools) || !tools.every(name => catalog.tools.some(tool => tool.name === name))) {
    throw new Error("报告 MCP 缺少生成工作流需要的工具")
  }
}

function profileLocation(argument) {
  const profile = argument ?? process.env.DSH_PROFILE
  if (!profile || !/^[A-Za-z0-9_-]+$/.test(profile)) {
    throw new Error("无法识别当前 DSH profile，请在本机终端指定 profile，例如 setup web")
  }
  const dir = profile === process.env.DSH_PROFILE && process.env.DSH_PROFILE_DIR
    ? process.env.DSH_PROFILE_DIR
    : join(dshHome, "profiles", profile)
  return { profile, dir, path: join(dir, "cordis.patch.yml") }
}

function desiredPatch(current, { url, authorization }) {
  const newline = current.includes("\r\n") ? "\r\n" : "\n"
  const lines = current.split(/\r?\n/)
  const start = lines.indexOf(begin)
  const finish = lines.indexOf(end)
  if ((start === -1) !== (finish === -1) || start > finish ||
      start !== lines.lastIndexOf(begin) || finish !== lines.lastIndexOf(end)) {
    throw new Error("DSH profile 中的 phyexp 自动配置区块不完整")
  }
  const unmanaged = start < 0 ? lines : [...lines.slice(0, start), ...lines.slice(finish + 1)]
  if (manualPhyexp(unmanaged.join("\n"))) return { manual: true }
  const block = [
    begin,
    "- insert:",
    "    - id: phyexp-mcp",
    `      name: ${JSON.stringify(plugin)}`,
    "      config:",
    "        serverName: phyexp",
    "        transport: streamable-http",
    `        url: ${JSON.stringify(new URL("/mcp", url).href)}`,
    "        headers:",
    `          Authorization: ${JSON.stringify(authorization)}`,
    "        toolCallTimeoutMs: 60000",
    "        failOnStartupError: false",
    end,
  ]
  if (start >= 0) {
    return { contents: [...lines.slice(0, start), ...block, ...lines.slice(finish + 1)].join(newline) }
  }
  const nonComments = lines.map(line => line.replace(/^\uFEFF/, "").trim()).filter(line =>
    line && !line.startsWith("#"))
  if (nonComments[0] === "---") nonComments.shift()
  if (nonComments.length === 1 && nonComments[0] === "[]") {
    const index = lines.findIndex(line => line.replace(/^\uFEFF/, "").trim() === "[]")
    lines.splice(index, 1)
  } else if ((nonComments.length && !lines.some(line => /^\uFEFF?-\s/.test(line))) ||
      nonComments.includes("...") || nonComments.includes("---")) {
    throw new Error("当前 cordis.patch.yml 不是可自动合并的 YAML 列表，请按接入指南配置")
  }
  while (lines.at(-1) === "") lines.pop()
  return { contents: [...lines, ...block, ""].join(newline) }
}

function manualPhyexp(text) {
  return /(?:\bid\s*:\s*["']?phyexp-mcp|\bserverName\s*:\s*["']?phyexp)["']?(?=\s|[,}]|$)/.test(text)
}

async function installPlugin(profile) {
  try {
    await run("dsh", ["plugin", "--profile", profile, "add", plugin], {
      // Windows package-manager shims are .cmd files. All arguments are fixed or validated.
      shell: process.platform === "win32",
      timeout: 180_000,
      windowsHide: true,
      env: { ...process.env, DSH_HOME: dshHome },
    })
  } catch (error) {
    throw new Error(error.code === "ENOENT"
      ? "找不到 dsh 命令，请在安装 DSH 的本机终端运行配置"
      : "DSH MCP 插件安装失败，请检查 dsh、pnpm 和包仓库连接")
  }
}

async function configure(command, profileArgument) {
  const { profile, dir, path } = profileLocation(profileArgument)
  const current = await readOptional(path)
  let credentials = await reportCredentials({ allowGuest: true })
  const manual = desiredPatch(current, credentials).manual ||
    manualPhyexp(await readOptional(join(dshHome, "cordis.patch.yml")))
  if (manual) {
    return { status: "manual", profile }
  }
  if (credentials.needsEnrollment) {
    if (command === "check") return { status: "needs_setup", profile }
    credentials = await enrollGuest()
  }
  await verifyServer(credentials)
  const patch = desiredPatch(current, credentials)
  const installed = Boolean(await readOptional(join(dir, "node_modules", plugin, "package.json")))
  if (installed && patch.contents === current) return { status: "configured", profile }
  if (command === "check") return { status: "needs_setup", profile }

  return withLock(join(dir, ".phyexp-mcp-setup.lock"), async () => {
    if ((await lstat(path).catch(error => {
      if (error.code !== "ENOENT") throw error
    }))?.isSymbolicLink()) throw new Error("DSH profile 补丁是符号链接，请按接入指南配置")
    if (!installed) await installPlugin(profile)
    if (await readOptional(path) !== current) throw new Error("DSH profile 配置已变更，请重新运行自查")
    if (patch.contents !== current) {
      await writePrivate(path, patch.contents)
    }
    return { status: "updated", profile }
  })
}

try {
  const [command, profile, ...extra] = process.argv.slice(2)
  if (!["check", "setup"].includes(command) || extra.length) throw new Error("用法为 check|setup [profile]")
  console.log(JSON.stringify(await configure(command, profile)))
} catch (error) {
  console.error(error.code === "EEXIST" ? "当前 profile 正在配置，请稍后再试" : error.message)
  process.exitCode = 1
}
