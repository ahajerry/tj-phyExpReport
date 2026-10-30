import { experimentItems } from "../src/experiments.ts"
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { structuredExperiments } from '../src/structured-experiments.ts'

const samples = JSON.parse(readFileSync(new URL('../server/testdata/web-samples.json', import.meta.url), 'utf8'))
assert.equal(Object.keys(samples).length, structuredExperiments.length)

for (const experiment of structuredExperiments) {
  const sample = samples[experiment.id]
  assert.ok(sample, `${experiment.id}: 缺少报告样例`)
  assert.equal(sample.experimentId, experiment.id)
  assert.deepEqual(Object.keys(sample.data).sort(), experiment.measurements.map((field) => field.id).sort(),
    `${experiment.id}: 读数字段不一致`)
  assert.deepEqual(Object.keys(sample.parameters).sort(), experiment.parameters.map((field) => field.id).sort(),
    `${experiment.id}: 参数字段不一致`)
  for (const field of experiment.measurements) {
    if (field.rowLabels) assert.equal(field.rowLabels.length, field.count)
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
console.log(`${structuredExperiments.length} 个报告页面的样例字段与读数数量检查通过`)

// Every visible experiment must be backed by an active structured report page.
assert.deepEqual(experimentItems.map((item) => item.id).sort(), structuredExperiments.map((item) => item.id).sort())
