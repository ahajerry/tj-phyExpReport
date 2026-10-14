// Derived table cells only; the report backend recalculates from raw readings.
export function forcedVibrationPreview(data: Record<string, string[]>) {
  const positive = (value: string | undefined) => value?.trim() && Number(value) > 0 && Number.isFinite(Number(value)) ? Number(value) : null
  const trials = data.damped_time_10.map((timing, trial) => {
    const time = positive(timing)
    const logs = Array.from({ length: 5 }, (_, i) => {
      const a = positive(data.damped_peak[trial * 10 + i])
      const b = positive(data.damped_peak[trial * 10 + i + 5])
      return a !== null && b !== null ? Math.log(a / b) : null
    })
    const meanLog = logs.every((v) => v !== null) ? logs.reduce((sum, v) => sum + v, 0) / 5 : null
    return { logs, period: time === null ? null : time / 10, meanLog,
      beta: time !== null && meanLog !== null ? 2 * meanLog / time : null }
  })
  const beta = trials.length && trials.every((v) => v.beta !== null && v.beta > 0)
    ? trials.reduce((sum, v) => sum + v.beta!, 0) / trials.length : null
  const free = new Map<number, number[]>()
  data.free_angle.forEach((angle, i) => {
    const a = positive(angle), t = positive(data.free_period[i])
    if (a !== null && t !== null) free.set(a, [...(free.get(a) ?? []), t])
  })
  const lookup = [...free].map(([a, values]) => [a, values.reduce((s, v) => s + v, 0) / values.length])
    .sort((a, b) => a[0] - b[0])
  const amplitudes = data.amplitude.map(positive)
  const periods = data.drive_time_10.map((v) => { const time = positive(v); return time === null ? null : time / 10 })
  const complete = amplitudes.length > 0 && amplitudes.length === periods.length && amplitudes.every((v) => v !== null) && periods.every((v) => v !== null)
  const peak = complete ? Math.max(...amplitudes as number[]) : null
  const peakPeriods = peak === null ? [] : periods.filter((_, i) => amplitudes[i] === peak) as number[]
  const tr = peakPeriods.length ? peakPeriods.reduce((s, v) => s + v, 0) / peakPeriods.length : null
  const rows = periods.map((period, i) => {
    const amplitude = amplitudes[i]
    let t0: number | null = null
    if (amplitude !== null && amplitude !== undefined) {
      t0 = lookup.find(([a]) => a === amplitude)?.[1] ?? null
      for (let j = 1; t0 === null && j < lookup.length; j++) {
        const [a, t] = lookup[j - 1], [b, u] = lookup[j]
        if (a < amplitude && amplitude < b) t0 = t + (u - t) * (amplitude - a) / (b - a)
      }
    }
    const omega = period === null ? null : 2 * Math.PI / period
    return { t0, frequencyRatio: tr !== null && period !== null ? tr / period : null,
      power: amplitude !== null && amplitude !== undefined && peak !== null ? (amplitude / peak) ** 2 : null,
      theory: beta !== null && t0 !== null && omega !== null
        ? -Math.atan2(2 * beta * omega, (2 * Math.PI / t0) ** 2 - omega ** 2) * 180 / Math.PI : null }
  })
  return { trials, beta, rows }
}

export function previewNumber(value: number | null, digits = 4) {
  return value !== null && Number.isFinite(value) ? value.toFixed(digits) : "—"
}
