// Uses a disposable container and volume. Never mounts the user's .report-data.
import { execFileSync } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const useCompose = process.argv.includes('--compose')
const image = process.env.REPORT_TEST_IMAGE || 'phyexp-report:local'
if (useCompose && process.env.REPORT_TEST_IMAGE) throw new Error('Compose mode uses the image configured in compose.yaml')
const name = `phyexp-smoke-${process.pid}-${Date.now()}`
const volume = `${name}-data`
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 120000 }).trim()
const compose = (...args) => execFileSync('docker', ['compose', '--env-file', '/dev/null', '-f', 'compose.yaml', '-p', name, ...args], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, REPORT_BIND: '127.0.0.1', REPORT_PUBLIC_PORT: '0', REPORT_COOKIE_SECURE: '0' },
  encoding: 'utf8', timeout: 120000,
}).trim()
const fixtures = new URL('../server/testdata/', import.meta.url)
const output = new URL(useCompose ? '../output/compose-smoke/' : '../output/docker-smoke/', import.meta.url)
await mkdir(output, { recursive: true })
let cookie
let base
let started = false
let container = name
const results = []
async function request(path, options = {}, identity = true) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(identity && cookie ? { Cookie: cookie } : {}), ...options.headers }, signal: AbortSignal.timeout(90000) })
  if (identity && response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]
  return response
}
async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try { if ((await request('/api/health')).ok) return } catch { /* startup */ }
    await delay(250)
  }
  throw new Error('Container did not become ready')
}
async function complete(payload, label, images = []) {
  let options
  if (images.length) {
    const form = new FormData()
    form.append('payload', JSON.stringify(payload))
    for (const filename of images) form.append('images', new Blob([await readFile(new URL(`images/${filename}`, fixtures))]), filename)
    options = { method: 'POST', headers: { 'X-Report-Request': '1' }, body: form }
  } else options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  const submitted = await request('/api/reports/jobs', options)
  assert.equal(submitted.status, 202, await submitted.clone().text())
  let job = await submitted.json()
  const deadline = Date.now() + 300000
  while (!['done', 'failed'].includes(job.status) && Date.now() < deadline) {
    await delay(500)
    const response = await request(`/api/reports/jobs/${job.id}`)
    assert.equal(response.status, 200)
    job = await response.json()
  }
  assert.equal(job.status, 'done', JSON.stringify(job))
  const response = await request(`/api/reports/jobs/${job.id}/download`)
  assert.equal(response.status, 200)
  const pdf = Buffer.from(await response.arrayBuffer())
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.equal((await request(`/api/reports/jobs/${job.id}/download`, {}, false)).status, 404)
  await writeFile(new URL(`${label}.pdf`, output), pdf)
  results.push({ label, id: job.id, bytes: pdf.length, imageCount: job.imageCount })
  console.log(`${label}: PDF ${pdf.length} bytes; images=${job.imageCount}`)
  return job
}
try {
  if (useCompose) {
    started = true // Also clean up resources if up fails partway through.
    compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '90')
    container = compose('ps', '-q', 'app')
    assert.ok(container)
    assert.equal(docker('inspect', '--format', '{{.State.Health.Status}}', container), 'healthy')
  } else {
    docker('volume', 'create', volume)
    docker('run', '-d', '--name', name, '--init', '--security-opt', 'no-new-privileges', '--cap-drop', 'ALL', '--pids-limit', '128', '--memory', '2g', '-p', '127.0.0.1::8000', '-e', 'REPORT_COOKIE_SECURE=0', '-v', `${volume}:/data`, image)
    started = true
  }
  const port = docker('port', container, '8000/tcp').split(':').at(-1)
  base = `http://127.0.0.1:${port}`
  await waitReady()
  const runtime = docker('exec', container, 'sh', '-c', 'id -u; command -v python || command -v python3 || true; xelatex --version | head -1; kpsewhich FandolSong-Regular.otf')
  assert.match(runtime, /^10001\n/)
  assert.doesNotMatch(runtime, /\/python/)
  assert.match(runtime, /FandolSong-Regular\.otf/)
  console.log(runtime)
  assert.match(await (await request('/')).text(), /<div id="root">/)
  assert.equal((await request('/api/unknown')).status, 404)
  const cases = JSON.parse(await readFile(new URL('calculations.json', fixtures), 'utf8'))
  const unique = new Map()
  // Keep the first standard baseline; later cases exercise compatibility variants.
  for (const c of cases) if (!unique.has(c.payload.experimentId)) unique.set(c.payload.experimentId, c.payload)
  for (const [id, payload] of unique) await complete(payload, id)
  await complete(cases.find(c => c.name === 'focal-length-optional').payload, 'focal-length-optional')
  await complete(cases.find(c => c.name === 'heat-capacity-pdf-100-periods').payload, 'heat-capacity-pdf-100-periods')
  for (const label of ['focal-length-three-groups', 'focal-length-three-groups-optional']) {
    await complete(cases.find(c => c.name === label).payload, label)
  }
  const imports = JSON.parse(await readFile(new URL('imports.json', fixtures), 'utf8'))
  const renderImports = new Set(['vibration-variable-2.xlsx', 'millikan.csv', 'torsion.xlsx'])
  for (const c of imports) {
    const form = new FormData()
    form.append('payload', JSON.stringify({ experimentId: c.experimentId, reportInfo: { student: '合成验收' } }))
    form.append('table', new Blob([await readFile(new URL(c.file, fixtures))]), c.file)
    const response = await request('/api/reports/import-table', { method: 'POST', headers: { 'X-Report-Request': '1' }, body: form })
    assert.equal(response.status, 200, await response.clone().text())
    const editable = await response.json()
    assert.equal(editable.reportInfo.student, '合成验收')
    for (const [key, values] of Object.entries(c.editable.data)) assert.equal(editable.data[key].length, values.length)
    if (renderImports.has(c.file)) await complete({ experimentId: c.experimentId, ...editable }, `import-${c.file}`)
    console.log(`import ${c.file}: OK`)
  }
  const sound = unique.get('speed-of-sound')
  await complete(sound, 'images-standard', ['sample.png', 'sample.jpg', 'sample.gif', 'sample.tif', 'sample.webp'])
  await complete(sound, 'images-heif', ['sample.heic', 'sample.avif'])
  const before = await (await request('/api/reports/session')).json()
  if (useCompose) compose('restart', 'app')
  else docker('restart', container)
  // Docker may allocate a different host port when restarting an ephemeral mapping.
  base = `http://127.0.0.1:${docker('port', container, '8000/tcp').split(':').at(-1)}`
  await waitReady()
  const after = await (await request('/api/reports/session')).json()
  assert.equal(after.usedToday, before.usedToday)
  assert.deepEqual(after.jobs.map(j => [j.id, j.status]), before.jobs.map(j => [j.id, j.status]))
  for (const item of results) assert.equal((await request(`/api/reports/jobs/${item.id}/download`)).status, 200)
  await writeFile(new URL('results.json', output), JSON.stringify({ mode: useCompose ? 'compose' : 'docker', image, runtime, imports: imports.length, reports: results, restart: 'passed' }, null, 2))
  console.log(`PASS: ${results.length} PDFs, ${imports.length} imports, 7 image formats, ownership and restart persistence`)
} finally {
  if (useCompose) {
    if (started) compose('down', '--volumes', '--remove-orphans')
  } else {
    if (started) docker('rm', '-f', name)
    docker('volume', 'rm', volume)
  }
}
