import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const jar = new Map()
globalThis.document = {
  get cookie() {
    return [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
  },
  set cookie(header) {
    const [assignment, ...attributes] = header.split('; ')
    const equal = assignment.indexOf('=')
    const name = assignment.slice(0, equal)
    const value = assignment.slice(equal + 1)
    if (attributes.includes('Max-Age=0')) jar.delete(name)
    else jar.set(name, value)
  },
}
globalThis.window = { location: { protocol: 'http:' } }

const { buildImportPrompt, parseExperimentImport, readMeasurements, saveMeasurements } =
  await import('../src/lib/experiment-data.ts')
const { structuredExperimentById } = await import('../src/structured-experiments.ts')
const { soundFrequencyDisplay } = await import('../src/lib/sound-frequency-units.ts')

const samples = JSON.parse(readFileSync(new URL('../server/testdata/web-samples.json', import.meta.url), 'utf8'))
const excluded = {
  'millikan': ['current_voltage', 'instrument_charge'],
  'young-modulus': ['preload_kg'],
  'forced-vibration': ['damping_setting'],
  'focal-length': ['position_direction'],
}
for (const [id, sample] of Object.entries(samples)) {
  const experiment = structuredExperimentById.get(id)
  const excludedFields = excluded[id] ?? []
  const input = {
    ...sample.data,
    ...Object.fromEntries(Object.entries(sample.parameters).map(([key, value]) => [key, soundFrequencyDisplay(id, key, value)])),
  }
  const prompt = buildImportPrompt(experiment)
  const example = JSON.parse(prompt.slice(prompt.indexOf('\n{') + 1))
  for (const key of excludedFields) {
    assert.ok(!prompt.includes(key), key)
    input[key] = { ignored: true }
  }
  const parsed = parseExperimentImport(JSON.stringify(input), experiment)
  assert.deepEqual(Object.keys(example).sort(), Object.keys(input).filter((key) => !excludedFields.includes(key)).sort())
  assert.deepEqual(parsed.data, Object.fromEntries(Object.entries(sample.data).filter(([key]) => !excludedFields.includes(key))))
  for (const [key, value] of Object.entries(sample.parameters)) {
    if (excludedFields.includes(key)) assert.equal(parsed.parameters[key], undefined, key)
    else {
      assert.equal(typeof example[key], 'string', key)
      assert.equal(Number(parsed.parameters[key]), Number(value), key)
    }
  }
}

const sound = structuredExperimentById.get('speed-of-sound')
const soundInput = {
  ...samples[sound.id].data, caliper_error: '0.020', room_temperature: '20.50',
  res_frequency: '4.0000×10⁴', res_frequency_error: '0.10', phase_frequency: 40000, phase_frequency_error: '0.10',
}
assert.deepEqual(parseExperimentImport('```json\n' + JSON.stringify(soundInput) + '\n```', sound).parameters, {
  caliper_error: '0.020', room_temperature: '20.50', res_frequency: '40.000',
  res_frequency_error: '0.00010', phase_frequency: '40.000', phase_frequency_error: '0.00010',
})
assert.throws(() => parseExperimentImport(JSON.stringify({ ...soundInput, room_temperature: undefined }), sound), /室温/)
assert.throws(() => parseExperimentImport(JSON.stringify({ ...soundInput, room_temperature: ['20.50'] }), sound), /室温/)
assert.throws(() => parseExperimentImport(JSON.stringify({ ...soundInput, resonance: ['1'] }), sound), /20 个读数/)
assert.throws(() => parseExperimentImport(JSON.stringify({ ...soundInput, other: 1 }), sound), /未识别/)

const scope = structuredExperimentById.get('oscilloscope')
const scopeReadings = samples[scope.id].data
assert.deepEqual(parseExperimentImport(JSON.stringify({ ...scopeReadings, time_scale: ['5×10⁻²', '5×10⁻³', '5×10⁻³', '5×10⁻²'] }), scope).data.time_scale,
  ['5e-2', '5e-3', '5e-3', '5e-2'])
for (const [input, expected] of [
  [' 5.00 × 10⁻² ', '5.00e-2'], ['1.20×10⁺³', '1.20e+3'],
  ['-2.00x10^−12', '-2.00e-12'], ['+.50 * 10 ^ +2', '+.50e+2'],
  ['3X10⁰', '3e0'], ['2×10¹²', '2e12'], ['5.00E-2', '5.00E-2'], ['0.0500', '0.0500'],
]) {
  const result = parseExperimentImport(JSON.stringify({ ...scopeReadings, time_scale: [input, '1', '1', '1'] }), scope)
  assert.equal(result.data.time_scale[0], expected)
}
for (const input of ['', '5×10', '5×10⁻', '5×10^-2junk', '5×10².³', '5×10^2+1', '5×10⁻² ms', '5×10⁹⁹⁹', 'NaN', 'Infinity', '0x10']) {
  assert.throws(() => parseExperimentImport(JSON.stringify({ ...scopeReadings, time_scale: [input, '1', '1', '1'] }), scope), /无效/)
}

const millikan = structuredExperimentById.get('millikan')
const oilReadings = { balance_voltage: Array(12).fill('100.00'), fall_time: Array(12).fill('4.00') }
const oil = parseExperimentImport(JSON.stringify(oilReadings), millikan)
assert.deepEqual(oil.data.balance_voltage, [...oilReadings.balance_voltage, ...Array(20).fill('')])
assert.deepEqual(Object.keys(oil.data), ['balance_voltage', 'fall_time'])

const many = Array.from({ length: 400 }, (_, index) => `${index}.40`)
saveMeasurements('synthetic-import', 'mass', many)
assert.deepEqual(readMeasurements('synthetic-import', 'mass'), many)
saveMeasurements('synthetic-import', 'mass', ['7.00'])
assert.deepEqual(readMeasurements('synthetic-import', 'mass'), ['7.00'])
saveMeasurements('synthetic-import', 'mass', [''])
assert.equal(readMeasurements('synthetic-import', 'mass'), null)
console.log('JSON 导入与实验 Cookie 测试通过')
