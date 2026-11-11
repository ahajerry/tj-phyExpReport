import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh")
export const configPath = process.env.PHYEXP_REPORT_CONFIG || join(dshHome, "phyexp-report.json")
const guestOrigin = "https://lab.tongji.sh"

export async function reportCredentials({ allowGuest = false } = {}) {
  let config
  try {
    config = JSON.parse((await readFile(configPath, "utf8")).replace(/^\uFEFF/, ""))
  } catch (error) {
    if (error.code !== "ENOENT" || process.env.PHYEXP_REPORT_CONFIG) {
      throw new Error(`无法读取报告服务配置，请检查 ${configPath}`)
    }
    config = {}
  }
  let url
  try {
    url = new URL(config.origin ?? guestOrigin)
  } catch {
    throw new Error("报告服务 origin 无效")
  }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("报告服务 origin 须为 HTTPS 站点地址")
  }
  if (config.token !== undefined && (typeof config.token !== "string" || !/^[a-f0-9]{64}$/.test(config.token))) {
    throw new Error("报告服务个人令牌格式无效")
  }
  const needsEnrollment = config.token === undefined || config.guestPending === true
  if (needsEnrollment && (!allowGuest || url.origin !== guestOrigin)) {
    throw new Error("请先完成报告服务配置")
  }
  return { url, authorization: config.token && `Bearer ${config.token}`, needsEnrollment, config }
}

export function reportRequest({ url, authorization }, path, options = {}, timeout = 120_000) {
  return fetch(new URL(path, url), {
    ...options,
    headers: { ...options.headers, Authorization: authorization },
    redirect: "error",
    signal: AbortSignal.timeout(timeout),
  })
}
