import { createWriteStream, openAsBlob } from "node:fs"
import { link, mkdir, mkdtemp, open, rm } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { reportCredentials, reportRequest } from "./connection.mjs"

const uploadLimits = { json: 64 * 1024, table: 2 * 1024 ** 2, image: 8 * 1024 ** 2 }
const signatures = { pdf: Buffer.from("%PDF-"), source: Buffer.from([0x50, 0x4b, 0x03, 0x04]) }

async function connection() {
  const credentials = await reportCredentials()
  return async (path, options = {}) => {
    const response = await reportRequest(credentials, path, options)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.error ?? `报告服务返回 HTTP ${response.status}`)
    }
    return response
  }
}

async function upload(kind, path, originalName) {
  if (!Object.hasOwn(uploadLimits, kind) || !path) {
    throw new Error("用法为 upload <json|table|image> <file> [original-filename]")
  }
  const filename = originalName ?? basename(path)
  if (!filename || /[\\/\r\n]/.test(filename)) throw new Error("请提供附件原始文件名")
  const file = await openAsBlob(path)
  if (!file.size || file.size > uploadLimits[kind]) {
    throw new Error("上传文件为空或超过类型大小限制")
  }
  const request = await connection()
  const form = new FormData()
  form.append(kind, file, filename)
  const result = await (await request("/api/mcp/uploads", { method: "POST", body: form })).json()
  if (!/^[a-f0-9]{32}$/.test(result.uploadId)) {
    throw new Error("报告服务未返回有效的上传 ID")
  }
  return { uploadId: result.uploadId, expiresAt: result.expiresAt }
}

async function download(job, kind, path) {
  if (!/^[a-f0-9]{32}$/.test(job) || !Object.hasOwn(signatures, kind) || !path) {
    throw new Error("用法为 download <job-id> <pdf|source> <output>")
  }
  const target = resolve(path)
  const request = await connection()
  await mkdir(dirname(target), { recursive: true })
  const dir = await mkdtemp(join(dirname(target), ".phyexp-download-"))
  const temporary = join(dir, "part")
  try {
    const response = await request(`/api/mcp/jobs/${job}/artifacts/${kind}`)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: "wx", mode: 0o600 }))
    const file = await open(temporary)
    try {
      const expected = signatures[kind]
      const header = Buffer.alloc(expected.length)
      const { bytesRead } = await file.read(header, 0, header.length, 0)
      if (bytesRead !== header.length || !header.equals(expected)) {
        throw new Error("下载结果的文件格式不符")
      }
    } finally {
      await file.close()
    }
    // Publish a complete file without overwriting an existing report.
    await link(temporary, target)
    return { path: target }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

try {
  const [command, ...args] = process.argv.slice(2)
  let result
  if (command === "upload" && (args.length === 2 || args.length === 3)) {
    result = await upload(...args)
  } else if (command === "download" && args.length === 3) {
    result = await download(...args)
  } else {
    throw new Error("请指定 upload 或 download 及对应参数")
  }
  console.log(JSON.stringify(result))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
