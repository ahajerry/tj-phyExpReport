import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { expectedRevision, buildBackend, root } from './backend.mjs'

export async function stopBackend(child, timeoutMs = 17000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const closed = once(child, 'close')
  child.kill('SIGTERM')
  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
  timer.unref()
  try { await closed } finally { clearTimeout(timer) }
}

// Polling also works on Windows bind mounts where filesystem events can be lost.
export async function watchBackend({
  signal,
  revision = expectedRevision,
  build = buildBackend,
  start = (binary) => spawn(binary, ['--environment', 'development'], {
    cwd: root, stdio: 'inherit', windowsHide: true,
    env: { ...process.env, REPORT_DATA_DIR: process.env.REPORT_DATA_DIR || path.join(root, 'output', 'dev-data') },
  }),
  intervalMs = 750,
  log = console.log,
} = {}) {
  let child
  let attempted
  let launchError
  async function readRevision() {
    try { return await revision() } catch (error) {
      // Editors may briefly remove/replace a file during an atomic save.
      if (error.code !== 'ENOENT') throw error
      return undefined
    }
  }
  try {
    while (!signal.aborted) {
      if (launchError) {
        log(`后端启动失败，保存源码后自动重试：${launchError.message}`)
        launchError = undefined
        child = undefined
      }
      if (child && (child.exitCode !== null || child.signalCode !== null)) {
        log(`Go 后端已退出（${child.exitCode ?? child.signalCode}），保存源码后自动重试；请检查端口与日志。`)
        child = undefined
      }
      const next = await readRevision()
      if (next !== undefined && next !== attempted) {
        attempted = next
        log('正在增量编译 Go 后端；模板修改无需重启。')
        let binary
        try { binary = await build(next, { signal }) } catch (error) {
          if (signal.aborted) break
          log(`编译失败，保留正在运行的后端；保存修复后自动重试：${error.message}`)
        }
        if (binary && !signal.aborted && next === await readRevision()) {
          await stopBackend(child)
          child = undefined
          if (signal.aborted) break
          child = start(binary)
          child.once('error', error => { launchError = error })
          log('Go 后端已启动，继续监听源码。')
        }
      }
      await delay(intervalMs, undefined, { signal })
    }
  } catch (error) {
    if (!signal.aborted) throw error
  } finally {
    await stopBackend(child)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController()
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort())
  watchBackend({ signal: controller.signal }).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
