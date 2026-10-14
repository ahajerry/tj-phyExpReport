import assert from 'node:assert/strict'
import { forcedVibrationPreview } from '../src/lib/forced-vibration-preview.ts'

const data = {
  free_angle: ['50', '100', '150'], free_period: ['1.5', '1.5', '1.5'],
  damped_peak: ['160', '140', '120', '100', '80', '80', '70', '60', '50', '40'],
  damped_time_10: ['15'], drive_time_10: ['16', '15', '14'],
  amplitude: ['75', '100', '75'], phase: ['30', '90', '150'],
}
const preview = forcedVibrationPreview(data)
assert.ok(Math.abs(preview.beta - Math.log(2)/7.5) < 1e-12)
assert.equal(preview.trials[0].period, 1.5)
assert.equal(preview.rows[0].t0, 1.5)
assert.equal(preview.rows[0].frequencyRatio, 15/16)
assert.equal(preview.rows[0].power, .5625)
assert.equal(preview.rows[1].theory, -90)
assert.ok(preview.rows[0].theory > -90)
assert.ok(preview.rows[2].theory < -90)
data.amplitude[0] = '200'
assert.equal(forcedVibrationPreview(data).rows[0].theory, null)
data.damped_peak[0] = ''
assert.equal(forcedVibrationPreview(data).beta, null)
data.amplitude[0] = ''
assert.equal(forcedVibrationPreview(data).rows[1].power, null)
console.log('波尔共振预览：10T 换算、逐差法、相位象限、查表和空值检查通过')
