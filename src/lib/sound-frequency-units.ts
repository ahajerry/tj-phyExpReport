// Keep API and saved values in kHz for compatibility; the form uses Hz.
function shift(value: string, places: number): string {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value)
  if (!match || !(match[2] || match[3])) return value
  const digits = match[2] + (match[3] ?? "")
  const point = match[2].length + Number(match[4] ?? 0) + places
  if (Math.abs(point) > 1000) return value
  const result = point <= 0 ? `0.${"0".repeat(-point)}${digits}`
    : point >= digits.length ? digits + "0".repeat(point - digits.length)
      : `${digits.slice(0, point)}.${digits.slice(point)}`
  return match[1] + result.replace(/^0+(?=\d)/, "")
}

function isFrequency(experiment: string, key: string) {
  return experiment === "speed-of-sound" && /^(res|phase)_frequency(_error)?$/.test(key)
}

export function soundFrequencyDisplay(experiment: string, key: string, value: string) {
  return isFrequency(experiment, key) ? shift(value, 3) : value
}

export function soundFrequencyStored(experiment: string, key: string, value: string) {
  return isFrequency(experiment, key) ? shift(value, -3) : value
}
