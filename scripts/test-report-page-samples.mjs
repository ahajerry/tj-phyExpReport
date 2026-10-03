import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { structuredExperiments } from '../src/structured-experiments.ts'

const samples = JSON.parse(readFileSync(new URL('../output/report-review/sample-data.json', import.meta.url), 'utf8'))
assert.equal(Object.keys(samples).length, 7)

for (const experiment of structuredExperiments) {
  const sample = samples[experiment.id]
  assert.ok(sample, `${experiment.id}: 缺少报告样例`)
  assert.equal(sample.experimentId, experiment.id)
  assert.deepEqual(Object.keys(sample.data).sort(), experiment.measurements.map((field) => field.id).sort(),
    `${experiment.id}: 读数字段不一致`)
  assert.deepEqual(Object.keys(sample.parameters).sort(), experiment.parameters.map((field) => field.id).sort(),
    `${experiment.id}: 参数字段不一致`)
  for (const field of experiment.measurements) {
    assert.equal(sample.data[field.id]?.length, field.count, `${experiment.id}: ${field.id} 读数数量不符`)
    assert.ok(sample.data[field.id].every((value) => Number.isFinite(Number(value))),
      `${experiment.id}: ${field.id} 含无效读数`)
  }
  for (const field of experiment.parameters) {
    assert.ok(Number.isFinite(Number(sample.parameters[field.id])) &&
      String(sample.parameters[field.id]).trim(), `${experiment.id}: ${field.id} 缺少有效参数`)
  }
}

assert.deepEqual(structuredExperiments.map((experiment) => experiment.id).sort(), Object.keys(samples).sort())
console.log('七个报告页面的样例字段与读数数量检查通过')
