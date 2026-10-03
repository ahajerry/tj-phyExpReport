/** 计算完成后统一处理显示精度；调用者继续保留原始数值参与计算。 */
export type FinishedResult = { value: string; uncertainty: string; placeExponent: number | null }

function decimalParts(value: number): { coefficient: bigint; exponent: number; negative: boolean } {
  const [mantissa, scientificExponent = "0"] = String(value).replace(/^-/, "").split(/e/i)
  const [whole, fraction = ""] = mantissa.split(".")
  return {
    coefficient: BigInt(whole + fraction),
    exponent: Number(scientificExponent) - fraction.length,
    negative: value < 0,
  }
}

function decimalPlaceExponent(uncertainty: number): number | null {
  if (!Number.isFinite(uncertainty) || uncertainty < 0) throw new Error("不确定度必须是非负有限数")
  if (uncertainty === 0) return null
  const { coefficient, exponent } = decimalParts(uncertainty)
  const digits = coefficient.toString()
  const significantDigits = digits[0] === "1" || digits[0] === "2" ? 2 : 1
  return exponent + digits.length - significantDigits
}

export function formatAtPlace(value: number, placeExponent: number | null): string {
  if (!Number.isFinite(value)) throw new Error("结果必须是有限数")
  if (placeExponent === null) return String(value)
  if (!Number.isInteger(placeExponent)) throw new Error("末位位置必须是整数")
  const { coefficient, exponent, negative } = decimalParts(value)
  const shift = exponent - placeExponent
  let rounded: bigint
  if (shift >= 0) {
    rounded = coefficient * 10n ** BigInt(shift)
  } else {
    const divisor = 10n ** BigInt(-shift)
    const quotient = coefficient / divisor
    const remainder = coefficient % divisor
    // 仅在正好一半时取偶；5 后还有非零位时 remainder 会大于一半。
    rounded = quotient + (remainder * 2n > divisor ||
      (remainder * 2n === divisor && quotient % 2n === 1n) ? 1n : 0n)
  }
  const sign = negative && rounded !== 0n ? "-" : ""
  if (placeExponent >= 0) return rounded === 0n ? "0" : sign + rounded.toString() + "0".repeat(placeExponent)
  const decimals = -placeExponent
  const digits = rounded.toString().padStart(decimals + 1, "0")
  return sign + digits.slice(0, -decimals) + "." + digits.slice(-decimals)
}

export function formatUncertainty(uncertainty: number): string {
  const place = decimalPlaceExponent(uncertainty)
  return place === null ? "0" : formatAtPlace(uncertainty, place)
}

export function finishResult(value: number, uncertainty: number): FinishedResult {
  const placeExponent = decimalPlaceExponent(uncertainty)
  return {
    value: formatAtPlace(value, placeExponent),
    uncertainty: placeExponent === null ? "0" : formatAtPlace(uncertainty, placeExponent),
    placeExponent,
  }
}
