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
    const value = assignment.slice(equal + 1)
    if (attributes.includes('Max-Age=0')) jar.delete(name)
    else jar.set(name, value)
  },
}
globalThis.window = { location: { protocol: 'http:' } }

const { buildImportPrompt, parseImportedMeasurements, readMeasurements, saveMeasurements } =
  await import('../src/lib/experiment-data.ts')

const quantities = [
  { id: 'mass', showName: '质量', unit: 'g' },
  { id: 'volume', showName: '体积', unit: 'cm³' },
]
assert.match(buildImportPrompt('密度测量', quantities), /mass.*质量/s)
assert.match(buildImportPrompt('密度测量', quantities), /volume.*体积/s)
assert.deepEqual(
  parseImportedMeasurements('```json\n{"mass":["30.40",31],"volume":["2.00"]}\n```', quantities),
  { mass: ['30.40', '31'], volume: ['2.00'] },
)
assert.throws(() => parseImportedMeasurements('{"mass":[1]}', quantities), /体积/)
assert.throws(() => parseImportedMeasurements('{"mass":[1],"volume":["oops"]}', quantities), /无效/)
assert.throws(() => parseImportedMeasurements('{"mass":[1],"volume":[2],"other":[3]}', quantities), /未识别/)
assert.throws(() => parseImportedMeasurements('{"mass":[""]}', quantities.slice(0, 1)), /无效/)
// Screenshot regression: all four oscilloscope time scales can be imported.
assert.deepEqual(parseImportedMeasurements(JSON.stringify({ time_scale: ['5×10⁻²', '5×10⁻³', '5×10⁻³', '5×10⁻²'] }),
  [{ id: 'time_scale', showName: '波形时基档位 Sx', unit: 'ms/div' }]),
{ time_scale: ['5e-2', '5e-3', '5e-3', '5e-2'] })
for (const [input, expected] of [
  [' 5.00 × 10⁻² ', '5.00e-2'], ['1.20×10⁺³', '1.20e+3'],
  ['-2.00x10^−12', '-2.00e-12'], ['+.50 * 10 ^ +2', '+.50e+2'],
  ['3X10⁰', '3e0'], ['2×10¹²', '2e12'], ['5.00E-2', '5.00E-2'], ['0.0500', '0.0500'],
]) {
  const result = parseImportedMeasurements(JSON.stringify({ mass: [input] }), quantities.slice(0, 1))
  assert.deepEqual(result, { mass: [expected] })
  assert.ok(Number.isFinite(Number(result.mass[0])))
}
for (const input of ['5×10', '5×10⁻', '5×10^-2junk', '5×10².³', '5×10^2+1', '5×10⁻² ms', '5×10⁹⁹⁹', 'NaN', 'Infinity', '0x10']) {
  assert.throws(() => parseImportedMeasurements(JSON.stringify({ mass: [input] }), quantities.slice(0, 1)), /无效/)
}
assert.deepEqual(parseImportedMeasurements('{"mass":["0.0",""]}', [{ ...quantities[0], allowBlank: true }]), { mass: ['0.0', ''] })
assert.deepEqual(parseImportedMeasurements('{"mass":["3.0"]}', quantities.slice(0, 1)), { mass: ['3.0'] })
assert.deepEqual(parseImportedMeasurements('{"mass":["3.0"]}', [quantities[0], { ...quantities[1], optionalCount: 5 }]),
  { mass: ['3.0'], volume: ['', '', '', '', ''] })
assert.deepEqual(
  parseImportedMeasurements('{"mass":[1],"volume":[2],"length":[3]}', [...quantities, { id: 'length', showName: '长度', unit: 'cm' }]),
  { mass: ['1'], volume: ['2'], length: ['3'] },
)

const many = Array.from({ length: 400 }, (_, index) => `${index}.40`)
saveMeasurements('density', 'mass', many)
assert.deepEqual(readMeasurements('density', 'mass'), many)
saveMeasurements('density', 'mass', ['7.00'])
assert.deepEqual(readMeasurements('density', 'mass'), ['7.00'])
saveMeasurements('density', 'mass', [''])
assert.equal(readMeasurements('density', 'mass'), null)
console.log('JSON 导入与实验 Cookie 测试通过')
