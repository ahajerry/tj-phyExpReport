// Exercise real bind mounts and process restarts with temporary source copies.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { root } from './backend.mjs'
import { extractSource } from './source-bundle.mjs'

const name = `phyexp-dev-smoke-${process.pid}-${Date.now()}`
const temp = path.join(root, 'output', name)
const volumes = ['data', 'mod', 'build'].map(suffix => `${name}-${suffix}`)
const createdVolumes = []
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 120000 }).trim()
let started = false
let base
async function health() {
  try {
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) })
    return response.ok ? await response.json() : null
  } catch { return null }
}
async function until(check, description, timeout = 300000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const result = await check()
    if (result) return result
    await delay(500)
  }
  throw new Error(`Timed out: ${description}\n${docker('logs', '--tail', '60', name)}`)
}
try {
  // Fail before creating anything if the development image is unavailable.
  docker('image', 'inspect', 'phyexp-report:dev')
  await mkdir(temp, { recursive: true })
  for (const dir of ['server', 'typst/templates']) {
    await cp(path.join(root, dir), path.join(temp, dir), { recursive: true })
  }
  await mkdir(path.join(temp, 'scripts'))
  for (const file of ['backend.mjs', 'backend-watch.mjs']) {
    await cp(path.join(root, 'scripts', file), path.join(temp, 'scripts', file))
  }
  for (const volume of volumes) {
    docker('volume', 'create', volume)
    createdVolumes.push(volume)
  }
  const mounts = ['server', 'scripts', 'typst/templates'].flatMap(dir => [
    '--mount', `type=bind,src=${path.join(temp, dir)},dst=/workspace/${dir},readonly`,
  ])
  docker('run', '-d', '--init', '--name', name, '-p', '127.0.0.1::8000',
    ...mounts, '-v', `${volumes[0]}:/data`, '-v', `${volumes[1]}:/home/report/go/pkg/mod`,
    '-v', `${volumes[2]}:/home/report/.cache/go-build`, 'phyexp-report:dev')
  started = true
  base = `http://127.0.0.1:${docker('port', name, '8000/tcp').split(':').at(-1)}`
  const first = await until(health, 'initial Go build and startup')
  assert.equal(first.service, 'report-generator')
  const badFile = path.join(temp, 'server/cmd/reportd/dev_smoke.go')
  await writeFile(badFile, 'package main\nfunc invalid(\n')
  await until(() => docker('logs', name).includes('编译失败'), 'compile error is detected', 60000)
  assert.equal((await health()).revision, first.revision, 'compile error must preserve the working service')
  await rm(badFile)
  const main = path.join(temp, 'server/cmd/reportd/main.go')
  await writeFile(main, `${await readFile(main, 'utf8')}\n// dev smoke source change\n`)
  const second = await until(async () => {
    const current = await health()
    return current && current.revision !== first.revision && current
  }, 'corrected source is rebuilt and restarted', 60000)
  const template = path.join(temp, 'typst/templates/heat-capacity-ratio.typ')
  await writeFile(template, `${await readFile(template, 'utf8')}\n// dev smoke live template\n`)
  const compileCount = docker('logs', name).split('正在增量编译').length
  await delay(2000)
  assert.equal((await health()).revision, second.revision)
  assert.equal(docker('logs', name).split('正在增量编译').length, compileCount, 'template edits must not trigger compilation')
  assert.ok(docker('exec', name, 'cat', '/workspace/typst/templates/heat-capacity-ratio.typ').includes('dev smoke live template'))
  const cases = JSON.parse(await readFile(path.join(temp, 'server/testdata/calculations.json'), 'utf8'))
  const payload = cases.find(c => c.name === 'heat-capacity-pdf-100-periods').payload
  const submitted = await fetch(`${base}/api/reports/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  assert.equal(submitted.status, 202, await submitted.clone().text())
  const identity = submitted.headers.get('set-cookie').split(';')[0]
  const job = await submitted.json()
  await until(async () => {
    const response = await fetch(`${base}/api/reports/jobs/${job.id}`, { headers: { Cookie: identity } })
    const current = await response.json()
    assert.notEqual(current.status, 'failed', JSON.stringify(current))
    return current.status === 'done'
  }, 'new report uses the edited Typst template', 60000)
  const source = await fetch(`${base}/api/reports/jobs/${job.id}/source`, { headers: { Cookie: identity } })
  assert.equal(source.status, 200)
  const extracted = path.join(temp, 'downloaded-source')
  await extractSource(Buffer.from(await source.arrayBuffer()), extracted)
  assert.match(await readFile(path.join(extracted, 'report.typ'), 'utf8'), /dev smoke live template/)
  docker('stop', '-t', '25', name)
  assert.equal(docker('inspect', '--format', '{{.State.ExitCode}}', name), '0')
  console.log('PASS: Go startup, failed build preserves service, corrected edit restarts, live Typst template rendered and archived, graceful shutdown')
} finally {
  if (started) docker('rm', '-f', name)
  for (const volume of createdVolumes) docker('volume', 'rm', volume)
  assert.equal(path.dirname(temp), path.join(root, 'output'))
  await rm(temp, { recursive: true, force: true })
}
