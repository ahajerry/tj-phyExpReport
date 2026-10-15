import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const binary = path.join(root, 'output', 'backend-go', process.platform === 'win32' ? 'reportd.exe' : 'reportd')
export async function expectedRevision() {
  const digest = createHash('sha256')
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(filename)
      else {
        digest.update(path.relative(root, filename)).update('\0')
        digest.update(await readFile(filename)).update('\0')
      }
    }
  }
  await walk(path.join(root, 'server'))
  await walk(path.join(root, 'tex', 'templates'))
  return digest.digest('hex')
}
export async function buildBackend(revision) {
  revision ??= await expectedRevision()
  await mkdir(path.dirname(binary), { recursive: true })
  await new Promise((resolve, reject) => {
    const child = spawn('go', ['build', '-trimpath', '-ldflags', `-X main.revision=${revision}`, '-o', binary, './cmd/reportd'], {
      cwd: path.join(root, 'server'), stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Go 构建失败：${code}`)))
  })
  return binary
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await buildBackend()
    if (!process.argv.includes('--build-only')) {
      const child = spawn(binary, process.argv.slice(2), { cwd: root, stdio: 'inherit' })
      for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
      child.on('error', (error) => { console.error(error); process.exitCode = 1 })
      child.on('exit', (code) => { process.exitCode = code ?? 0 })
    }
  } catch (error) { console.error(error); process.exitCode = 1 }
}
