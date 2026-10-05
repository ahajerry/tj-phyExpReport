import assert from 'node:assert/strict'

const jar = new Map()
globalThis.document = {
  get cookie() {
    return [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
  },
  set cookie(header) {
    const [assignment, ...attributes] = header.split('; ')
    const equal = assignment.indexOf('=')
    const name = assignment.slice(0, equal)
    if (attributes.includes('Max-Age=0')) jar.delete(name)
    else jar.set(name, assignment.slice(equal + 1))
  },
}
globalThis.window = { location: { protocol: 'http:' } }
const saved = new Map()
globalThis.localStorage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
}

const { saveMeasurements } = await import('../src/lib/experiment-data.ts')
const { readSavedExperimentValues } = await import('../src/lib/structured-experiment-storage.ts')
const { structuredExperimentById } = await import('../src/structured-experiments.ts')
const sound = structuredExperimentById.get('speed-of-sound')
assert.ok(sound)

const positions = Array.from({ length: 21 }, (_, index) => `${30 + index}.40`)
saveMeasurements(sound.id, 'resonance', [...positions.slice(0, 2), '', ...positions.slice(2)])
saveMeasurements(sound.id, 'phase', positions)
saveMeasurements(sound.id, 'field_res_frequency', ['35.0'])
saveMeasurements(sound.id, 'field_student', ['张三'])

const migrated = readSavedExperimentValues(sound)
assert.deepEqual(migrated.data.resonance, positions.slice(0, 20))
assert.deepEqual(migrated.data.phase, positions.slice(0, 20))
assert.equal(migrated.parameters.res_frequency, '35.0')
assert.equal(migrated.parameters.caliper_error, '0.02')
assert.equal(migrated.reportInfo.student, '张三')

saved.set(`phyexp_report_${sound.id}`, JSON.stringify({
  data: { resonance: ['99.99'] },
  parameters: { res_frequency: '40.0' },
}))
const restored = readSavedExperimentValues(sound)
assert.equal(restored.data.resonance[0], '99.99')
assert.equal(restored.parameters.res_frequency, '40.0')
assert.equal(restored.reportInfo.student, '张三')
console.log('声速旧 Cookie 迁移与本地数据优先级测试通过')

const scope = structuredExperimentById.get('oscilloscope')
const oldRows = ['saw', 'reverse', 'pulse', 'half', 'sine', 'square', 'triangle']
saved.set('phyexp_report_oscilloscope', JSON.stringify({
  data: Object.fromEntries(['voltage_scale', 'voltage_divisions', 'time_scale', 'period_divisions'].map((key) => [key, oldRows])),
  parameters: { probe_factor: '10', cal_voltage_scale: '0.1' },
}))
const migratedScope = readSavedExperimentValues(scope)
for (const key of ['voltage_scale', 'voltage_divisions', 'time_scale', 'period_divisions']) {
  assert.deepEqual(migratedScope.data[key], ['square', 'sine', 'triangle', 'half'])
}
assert.deepEqual(migratedScope.parameters, { probe_factor: '10' })
saved.set('phyexp_report_oscilloscope', JSON.stringify(migratedScope))
assert.deepEqual(readSavedExperimentValues(scope), migratedScope)
console.log('示波器旧版波形顺序迁移与重复读取测试通过')
