import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expectedRevision } from './backend.mjs'
import { watchBackend, stopBackend } from './backend-watch.mjs'

async function until(check) {
  const deadline = Date.now() + 3000
  while (!check()) {
    if (Date.now() > deadline) throw new Error('watcher did not reach expected state')
    await delay(5)
  }
}
class Process extends EventEmitter {
  exitCode = null
  signalCode = null
  signals = []
  kill(signal) {
    this.signals.push(signal)
    this.signalCode = signal
    queueMicrotask(() => this.emit('close', null, signal))
  }
}

test('source fingerprint includes embedded resources, excludes test fixtures', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'phyexp-dev-'))
  try {
    await mkdir(path.join(dir, 'testdata'))
    await writeFile(path.join(dir, 'main.go'), 'original')
    await writeFile(path.join(dir, 'specs.json'), '{}')
    const original = await expectedRevision(dir)
    await writeFile(path.join(dir, 'main_test.go'), 'test change')
    await writeFile(path.join(dir, 'testdata', 'fixture.json'), 'fixture change')
    assert.equal(await expectedRevision(dir), original)
    await writeFile(path.join(dir, 'specs.json'), '{"new":true}')
    assert.notEqual(await expectedRevision(dir), original)
  } finally {
    assert.equal(path.dirname(dir), path.resolve(os.tmpdir()))
    await rm(dir, { recursive: true, force: true })
  }
})

test('failed edit preserves service; corrected edit gracefully restarts; unchanged source does not rebuild', async () => {
  const controller = new AbortController()
  let current = 'one'
  const builds = []
  const processes = []
  const watcher = watchBackend({
    signal: controller.signal, intervalMs: 5, log: () => {},
    revision: async () => current,
    build: async revision => {
      builds.push(revision)
      if (revision === 'broken') throw new Error('syntax error')
      return revision
    },
    start: () => { const child = new Process(); processes.push(child); return child },
  })
  try {
    await until(() => processes.length === 1)
    await delay(30)
    assert.deepEqual(builds, ['one'])
    current = 'broken'
    await until(() => builds.includes('broken'))
    await delay(20)
    assert.deepEqual(processes[0].signals, [])
    current = 'fixed'
    await until(() => processes.length === 2)
    assert.deepEqual(processes[0].signals, ['SIGTERM'])
    assert.deepEqual(builds, ['one', 'broken', 'fixed'])
  } finally { controller.abort(); await watcher }
  assert.deepEqual(processes[1].signals, ['SIGTERM'])
})

test('edits during compilation never launch a stale build', async () => {
  const controller = new AbortController()
  let current = 'one'
  const started = []
  const watcher = watchBackend({
    signal: controller.signal, intervalMs: 5, log: () => {},
    revision: async () => current,
    build: async revision => {
      if (revision === 'one') current = 'two'
      return revision
    },
    start: revision => { started.push(revision); return new Process() },
  })
  try {
    await until(() => started.length > 0)
    assert.deepEqual(started, ['two'])
  } finally { controller.abort(); await watcher }
})

test('unresponsive child is killed after the shutdown deadline', async () => {
  const child = new Process()
  child.kill = signal => {
    child.signals.push(signal)
    if (signal === 'SIGKILL') {
      child.signalCode = signal
      queueMicrotask(() => child.emit('close', null, signal))
    }
  }
  // Keep the test event loop alive while the unref'ed shutdown timer runs.
  await Promise.all([stopBackend(child, 10), delay(20)])
  assert.deepEqual(child.signals, ['SIGTERM', 'SIGKILL'])
})

test('an atomic-save gap does not terminate the watcher', async () => {
  const controller = new AbortController()
  let reads = 0
  const started = []
  const watcher = watchBackend({
    signal: controller.signal, intervalMs: 5, log: () => {},
    revision: async () => {
      if (++reads === 1) throw Object.assign(new Error('save in progress'), { code: 'ENOENT' })
      return 'saved'
    },
    build: async revision => revision,
    start: revision => { started.push(revision); return new Process() },
  })
  try {
    await until(() => started.length === 1)
    assert.deepEqual(started, ['saved'])
  } finally { controller.abort(); await watcher }
})

test('a runtime crash leaves the watcher alive for the next edit', async () => {
  const controller = new AbortController()
  let current = 'one'
  const processes = []
  const watcher = watchBackend({
    signal: controller.signal, intervalMs: 5, log: () => {},
    revision: async () => current,
    build: async revision => revision,
    start: () => { const child = new Process(); processes.push(child); return child },
  })
  try {
    await until(() => processes.length === 1)
    processes[0].exitCode = 1
    processes[0].emit('close', 1)
    await delay(20)
    assert.equal(processes.length, 1, 'do not repeatedly restart a crashing revision')
    current = 'fixed'
    await until(() => processes.length === 2)
  } finally { controller.abort(); await watcher }
})
