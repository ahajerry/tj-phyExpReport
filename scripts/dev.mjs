import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const healthUrl = 'http://127.0.0.1:8000/api/health'
const backendDir = path.join(root, 'backend')

let backend
let vite
let closing = false

async function expectedRevision() {
  const digest = createHash('sha256')
  const files = (await readdir(backendDir)).filter((name) => name.endsWith('.py') && !name.startsWith('test_')).sort()
  for (const name of files) {
    digest.update(name, 'utf8').update(Buffer.from([0]))
    digest.update(await readFile(path.join(backendDir, name))).update(Buffer.from([0]))
  }
  return digest.digest('hex')
}

async function backendHealth() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(500) })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

function stop(exitCode = 0) {
  if (closing) return
  closing = true
  vite?.kill()
  backend?.kill()
  process.exitCode = exitCode
}

process.on('SIGINT', () => stop(130))
process.on('SIGTERM', () => stop(143))
process.on('exit', () => {
  vite?.kill()
  backend?.kill()
})

async function main() {
  const revision = await expectedRevision()
  const running = await backendHealth()
  if (running && (running.service !== 'report-generator' || running.revision !== revision)) {
    throw new Error('8000 端口上运行的是旧版或其他报告后端。请先停止该进程，再运行 npm run dev。')
  }
  if (!running) {
    const python = process.env.PYTHON || 'python'
    let backendError
    backend = spawn(python, ['-X', 'utf8', 'backend/main.py', '--environment', 'development'], {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
    })
    backend.on('error', (error) => { backendError = error })
    backend.on('exit', (code) => {
      if (!closing) {
        console.error(`报告后端已退出（退出码 ${code ?? '未知'}）。`)
        stop(1)
      }
    })

    let ready = false
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (backendError) throw backendError
      const health = await backendHealth()
      if (health?.service === 'report-generator' && health.revision === revision) {
        ready = true
        break
      }
      if (backend.exitCode !== null) break
      await delay(200)
    }
    if (!ready) throw new Error('报告后端未能启动。请检查 Python 和 8000 端口。')
  }

  vite = spawn(process.execPath, [viteCli], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  })
  vite.on('error', (error) => {
    console.error('前端启动失败：', error)
    stop(1)
  })
  vite.on('exit', (code) => {
    if (!closing) stop(code ?? 1)
  })
}

main().catch((error) => {
  console.error('开发服务启动失败：', error)
  stop(1)
})
