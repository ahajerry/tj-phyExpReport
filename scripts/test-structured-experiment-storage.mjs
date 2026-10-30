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

const resonance = structuredExperimentById.get('forced-vibration')
saved.set('phyexp_report_forced-vibration', JSON.stringify({
  data: { free_angle: ['100'], damped_period: ['1.5670'], damped_peak: ['142'], drive_period: ['1.55', '1.6', '1.65'] },
  parameters: { damping_setting: '1' },
}))
const migratedResonance = readSavedExperimentValues(resonance)
assert.equal(migratedResonance.data.free_angle.length, 2)
assert.equal(migratedResonance.data.free_period.length, 2)
assert.equal(migratedResonance.data.damped_peak.length, 10)
assert.deepEqual(migratedResonance.data.damped_time_10, ['15.67'])
assert.deepEqual(migratedResonance.data.drive_time_10, ['15.5', '16', '16.5'])
migratedResonance.data.free_period[1] = '1.5716'
migratedResonance.data.damped_time_10[0] = '15.671'
migratedResonance.data.amplitude[2] = '150'
saved.set('phyexp_report_forced-vibration', JSON.stringify(migratedResonance))
assert.deepEqual(readSavedExperimentValues(resonance), migratedResonance)
const variableResonance = {
  ...migratedResonance,
  data: Object.fromEntries(resonance.measurements.map((item) => [item.id,
    Array(item.id.startsWith('free_') ? 89 : item.id === 'damped_peak' ? 20 : item.id === 'damped_time_10' ? 2 : 17).fill('1.50'),
  ])),
}
saved.set('phyexp_report_forced-vibration', JSON.stringify(variableResonance))
assert.deepEqual(readSavedExperimentValues(resonance), variableResonance)
const longResonance = {
  ...variableResonance,
  data: Object.fromEntries(resonance.measurements.map((item) => [item.id,
    Array.from({ length: item.id.startsWith('free_') ? 309 : item.id === 'damped_peak' ? 110 : item.id === 'damped_time_10' ? 11 : 121 },
      (_, index) => String(index + 1)),
  ])),
}
saved.set('phyexp_report_forced-vibration', JSON.stringify(longResonance))
assert.deepEqual(readSavedExperimentValues(resonance), longResonance)
console.log('波尔共振旧周期迁移和完整表格读数保存测试通过')

const millikan = structuredExperimentById.get('millikan')
saved.set('phyexp_report_millikan', JSON.stringify({ data: { voltage: ['120', '130', '140'],
  time_1: ['10', '20', '30'], time_2: ['11', '21', '31'], time_3: ['12', '22', '32'], time_4: ['13', '23', '33'] }, parameters: {} }))
const migratedOil = readSavedExperimentValues(millikan)
assert.deepEqual(migratedOil.data.balance_voltage.slice(0, 8), ['120', '120', '120', '120', '130', '130', '130', '130'])
assert.deepEqual(migratedOil.data.fall_time.slice(0, 8), ['10', '11', '12', '13', '20', '21', '22', '23'])
migratedOil.data.balance_voltage[31] = '75.3'
saved.set('phyexp_report_millikan', JSON.stringify(migratedOil))
assert.deepEqual(readSavedExperimentValues(millikan), migratedOil)

const torsion = structuredExperimentById.get('moment-of-inertia')
saved.set('phyexp_report_moment-of-inertia', JSON.stringify({ data: { time_disk: ['12.79', '12.79', '12.81'] },
  parameters: { mass_cylinder_g: '717.3', diameter_cylinder_mm: '99.78', slider_mass_g: '238.65', slider_self_inertia: '0.000040695' } }))
const migratedTorsion = readSavedExperimentValues(torsion)
assert.equal(migratedTorsion.parameters.mass_cylinder_kg, '0.7173')
assert.deepEqual(migratedTorsion.data.size_cylinder_cm, ['9.978', '', ''])
assert.equal(migratedTorsion.parameters.slider_pair_inertia_scaled, '0.8139')
assert.equal(migratedTorsion.parameters.slider_mass_2_kg, '')
migratedTorsion.data.size_cylinder_cm = ['9.976', '9.980', '9.978']
migratedTorsion.parameters.slider_mass_2_kg = '0.2387'
saved.set('phyexp_report_moment-of-inertia', JSON.stringify(migratedTorsion))
assert.deepEqual(readSavedExperimentValues(torsion), migratedTorsion)
console.log('油滴逐行数据与扭摆法原始尺寸迁移和保存测试通过')

const lens = structuredExperimentById.get('focal-length')
assert.ok(lens)
assert.ok(lens.measurements.every((field) => field.count === 3))
saved.set('phyexp_report_focal-length', JSON.stringify({ data: { object_distance: ['300', '300', '600'] } }))
assert.ok(Object.values(readSavedExperimentValues(lens).data).every((values) => values.every((value) => value === '')))
saved.set('phyexp_report_focal-length_positions', JSON.stringify({
  data: Object.fromEntries(lens.measurements.map((field) => [field.id, ['100.00', '101.0', '99.00']])),
}))
const restoredLens = readSavedExperimentValues(lens)
assert.equal(restoredLens.parameters.position_direction, '1')
restoredLens.parameters.position_direction = '-1'
saved.set('phyexp_report_focal-length_positions', JSON.stringify(restoredLens))
assert.deepEqual(readSavedExperimentValues(lens), restoredLens)
for (const field of lens.measurements) {
  assert.deepEqual(restoredLens.data[field.id], ['100.00', '101.0', '99.00'])
}
console.log('透镜位置表单三组读数文本保留，旧距离缓存不再加载测试通过')

const heat = structuredExperimentById.get('heat-capacity-ratio')
assert.ok(heat)
saved.set('phyexp_report_heat-capacity-ratio', JSON.stringify({
  data: { diameter: ['12.00', '12.01', '12.02', '12.03', '12.04'], period: ['0.600', '0.601', '0.602', '0.603', '0.604'] },
  parameters: { diameter_zero_mm: '0.002', mass_g: '6.50' },
}))
const migratedHeat = readSavedExperimentValues(heat)
assert.deepEqual(migratedHeat.data.diameter_initial, ['', '', '', '', ''])
assert.deepEqual(migratedHeat.data.diameter_final, ['12.002', '12.012', '12.022', '12.032', '12.042'])
assert.deepEqual(migratedHeat.data.time_100, ['60', '60.1', '60.2', '60.3', '60.4'])
assert.equal(migratedHeat.parameters.mass_g, '6.50')
saved.set('phyexp_report_heat-capacity-ratio', JSON.stringify({
  data: { diameter_initial: ['0.010'], diameter_final: ['12.010'], time_100: ['60.00'] },
}))
const currentHeat = readSavedExperimentValues(heat)
assert.equal(currentHeat.data.diameter_initial[0], '0.010')
assert.equal(currentHeat.data.diameter_final[0], '12.010')
assert.equal(currentHeat.data.time_100[0], '60.00')
console.log('比热容比旧缓存迁移、100T 换算和新读数文本保留测试通过')

const { soundFrequencyDisplay, soundFrequencyStored } = await import('../src/lib/sound-frequency-units.ts')
assert.equal(soundFrequencyDisplay(sound.id, 'res_frequency', '40.0'), '40000')
assert.equal(soundFrequencyStored(sound.id, 'res_frequency', '40000'), '40.000')
assert.equal(soundFrequencyDisplay(sound.id, 'phase_frequency_error', '0.010'), '10')
assert.equal(soundFrequencyStored(sound.id, 'phase_frequency_error', '10'), '0.010')
assert.equal(soundFrequencyDisplay(sound.id, 'res_frequency', '3.50e1'), '35000')
assert.equal(soundFrequencyDisplay(sound.id, 'res_frequency', ''), '')
assert.equal(soundFrequencyDisplay(sound.id, 'caliper_error', '0.02'), '0.02')
assert.equal(soundFrequencyStored('oscilloscope', 'reference_frequency', '40.0'), '40.0')
console.log('声速 Hz 显示、kHz 存储和精确文本换算检查通过')
