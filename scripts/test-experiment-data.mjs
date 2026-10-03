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
assert.deepEqual(parseImportedMeasurements('{"mass":["3.0"]}', quantities.slice(0, 1)), { mass: ['3.0'] })
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
