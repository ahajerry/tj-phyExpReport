import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { root } from './backend.mjs'

const args = new Set(process.argv.slice(2))
const dockerMode = args.has('--docker') || args.has('--setup') || (process.platform === 'win32' && !args.has('--local'))
const composeArgs = ['compose', '--env-file', process.platform === 'win32' ? 'NUL' : '/dev/null', '-f', 'compose.dev.yaml', '-p', 'phyexpreport-dev']
const healthUrl = 'http://127.0.0.1:8000/api/health'
const children = new Set()
let ownsContainer = false
let closing = false

function start(command, argv, options = {}) {
  const child = spawn(command, argv, { cwd: root, stdio: 'inherit', windowsHide: true, ...options })
  children.add(child)
  child.once('close', () => children.delete(child))
  return child
}
function run(command, argv, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = start(command, argv, { stdio: quiet ? 'ignore' : 'inherit' })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${argv.join(' ')} 失败（${code}）`)))
  })
}
async function shutdown(code = 0) {
  if (closing) return
  closing = true
  for (const child of children) child.kill('SIGTERM')
  if (ownsContainer) {
    try { await run('docker', [...composeArgs, 'stop', 'backend']) } catch (error) { console.error(error.message) }
  }
  process.exitCode = code
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown(0) })

async function health() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) })
    return response.ok ? await response.json() : null
  } catch { return null }
}
function monitor(child, label) {
  child.once('error', error => {
    console.error(`${label}启动失败：${error.message}`)
    void shutdown(1)
  })
  child.once('exit', code => {
    if (!closing) {
      console.error(`${label}已退出（${code}）。`)
      void shutdown(code || 1)
    }
  })
}
// A tag can still refer to the pre-migration TeX image. Only reuse a runtime
// carrying the current engine contract, including its pinned compiler version.
async function compatibleImage(name) {
  try {
    const { stdout } = await promisify(execFile)('docker', ['image', 'inspect', '--format', '{{ index .Config.Labels "org.phyexp.render-engine" }}', name], { timeout: 10000, windowsHide: true })
    return stdout.trim() === 'typst-0.15.1'
  } catch { return false }
}

async function main() {
  if (!args.has('--setup')) {
    monitor(start(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')]), 'Vite')
    console.log('正在启动 Vite；后端准备期间可先开发页面。Ctrl+C 停止开发服务并保留数据与缓存。')
  }
  if (dockerMode) {
    try { await run('docker', ['info'], { quiet: true }) } catch {
      throw new Error('Docker Linux 引擎尚未就绪。请启动 Docker Desktop，等待 docker info 成功后再运行 pnpm dev；只开发页面可用 pnpm dev:frontend。')
    }
    if (closing) return
    const hasImage = await compatibleImage('phyexp-report:dev')
    if (args.has('--setup') || !hasImage) {
      console.log('准备开发环境（Go + Typst）；以后修改源码无需重建镜像。')
      const buildArgs = ['build', '--progress=plain', '--target', 'development', '-t', 'phyexp-report:dev']
      if (!args.has('--setup')) {
        if (await compatibleImage('phyexp-report:local')) {
          buildArgs.push('--build-arg', 'DEV_RUNTIME=phyexp-report:local')
          console.log('复用已有报告镜像的 Typst 环境，当前 Go 应用仍从源码编译。')
        }
      }
      if (closing) return
      await run('docker', [...buildArgs, '.'])
    }
    if (closing || args.has('--setup')) return
    ownsContainer = true
    await run('docker', [...composeArgs, 'up', '-d', '--no-build', 'backend'])
    if (closing) {
      await run('docker', [...composeArgs, 'stop', 'backend'])
      return
    }
    monitor(start('docker', [...composeArgs, 'logs', '-f', '--tail=30', 'backend']), '后端日志')
  } else {
    if (process.platform === 'win32') throw new Error('本机 Go 后端需要 Linux/WSL；Windows 请运行 pnpm dev 或 pnpm dev:docker。')
    if (await health()) throw new Error('8000 端口已有服务。请先停止它，或使用 pnpm dev:frontend 连接现有后端。')
    monitor(start(process.execPath, [path.join(root, 'scripts', 'backend-watch.mjs')]), 'Go 后端监听器')
  }
  if (closing) return
  console.log('后端首次编译可能较慢，后续保存 Go 源码自动重编译，模板保存直接生效。')
  const deadline = Date.now() + 180000
  while (!closing && Date.now() < deadline) {
    const status = await health()
    if (status?.service === 'report-generator') {
      console.log('Go 后端就绪：http://127.0.0.1:8000')
      return
    }
    await delay(500)
  }
  if (!closing) console.error('后端尚未就绪，请检查上方编译日志；修复源码后监听器会自动重试，Vite 可继续使用。')
}

// This file is the pnpm entry point, not a library.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async error => {
    console.error(error.message)
    await shutdown(1)
  })
}
