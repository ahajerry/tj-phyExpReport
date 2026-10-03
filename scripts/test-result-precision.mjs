import assert from 'node:assert/strict'

const { finishResult, formatAtPlace, formatUncertainty } = await import('../src/lib/result-precision.ts')

assert.deepEqual(
  { value: finishResult(12.3456, 0.01234).value, uncertainty: finishResult(12.3456, 0.01234).uncertainty },
  { value: '12.346', uncertainty: '0.012' },
)
assert.deepEqual(
  { value: finishResult(12.3456, 0.03456).value, uncertainty: finishResult(12.3456, 0.03456).uncertainty },
  { value: '12.35', uncertainty: '0.03' },
)
assert.equal(formatUncertainty(0.299), '0.30')
assert.equal(formatUncertainty(0.0999), '0.10')
assert.equal(finishResult(1254, 120).value, '1250')
assert.equal(formatAtPlace(1.24, -1), '1.2')
assert.equal(formatAtPlace(1.26, -1), '1.3')
assert.equal(formatAtPlace(1.25, -1), '1.2')
assert.equal(formatAtPlace(1.35, -1), '1.4')
assert.equal(formatAtPlace(1.2501, -1), '1.3')
assert.equal(formatAtPlace(-1.25, -1), '-1.2')
assert.equal(formatAtPlace(-1.35, -1), '-1.4')
assert.equal(formatAtPlace(-0.04, -1), '0.0')
assert.equal(formatAtPlace(1250, 2), '1200')
assert.equal(formatAtPlace(1350, 2), '1400')
assert.equal(formatAtPlace(4, 1), '0')
assert.equal(formatAtPlace(2.5, 0), '2')
assert.equal(formatAtPlace(3.5, 0), '4')
assert.equal(formatUncertainty(0.45), '0.4')
assert.equal(formatUncertainty(0.35), '0.4')
assert.equal(formatUncertainty(0.245), '0.24')
assert.equal(formatUncertainty(0.255), '0.26')
assert.equal(formatUncertainty(0.25001), '0.25')
assert.deepEqual(finishResult(1.25, 1.2), { value: '1.2', uncertainty: '1.2', placeExponent: -1 })
assert.deepEqual(finishResult(12.34, 0), { value: '12.34', uncertainty: '0', placeExponent: null })
assert.throws(() => formatUncertainty(-0.1), /非负/)
console.log('有效数字处理测试通过')
