export type MeasurementQuantity = { id: string; showName: string; unit: string; allowBlank?: boolean; optionalCount?: number }

const COOKIE_PREFIX = "phyexp_v1_"
const COOKIE_CHUNK_SIZE = 3000
const COOKIE_AGE = 365 * 24 * 60 * 60
const MAX_IMPORT_VALUES = 300
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

function cookieBase(experimentId: string, quantityId: string): string {
  const experiment = encodeURIComponent(experimentId)
  return `${COOKIE_PREFIX}${experiment.length}_${experiment}_${encodeURIComponent(quantityId)}`
}

function cookies(): Map<string, string> {
  return new Map(document.cookie.split("; ").filter(Boolean).map((entry) => {
    const equal = entry.indexOf("=")
    return [entry.slice(0, equal), entry.slice(equal + 1)]
  }))
}

function setCookie(name: string, value: string, age = COOKIE_AGE): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${value}; Path=/; Max-Age=${age}; SameSite=Lax${secure}`
}

export function readMeasurements(experimentId: string, quantityId: string): string[] | null {
  const base = cookieBase(experimentId, quantityId)
  const current = cookies()
  const count = Number(current.get(`${base}_count`))
  if (!Number.isInteger(count) || count < 1 || count > 64) return null
  const chunks = Array.from({ length: count }, (_, index) => current.get(`${base}_${index}`))
  if (chunks.some((chunk) => chunk === undefined)) return null
  try {
    const values: unknown = JSON.parse(decodeURIComponent(chunks.join("")))
    return Array.isArray(values) && values.every((value) => typeof value === "string") ? values : null
  } catch {
    return null
  }
}

export function saveMeasurements(experimentId: string, quantityId: string, values: string[]): void {
  const base = cookieBase(experimentId, quantityId)
  const current = cookies()
  const oldCount = Number(current.get(`${base}_count`)) || 0
  const trimmed = [...values]
  while (trimmed.at(-1) === "") trimmed.pop()
  if (trimmed.length === 0) {
    for (let index = 0; index < oldCount; index++) setCookie(`${base}_${index}`, "", 0)
    setCookie(`${base}_count`, "", 0)
    return
  }
  const encoded = encodeURIComponent(JSON.stringify(trimmed))
  const chunks = encoded.match(new RegExp(`.{1,${COOKIE_CHUNK_SIZE}}`, "g")) ?? []
  if (chunks.length > 64) throw new Error("实验数据过多，超出 Cookie 可保存的容量")
  chunks.forEach((chunk, index) => setCookie(`${base}_${index}`, chunk))
  setCookie(`${base}_count`, String(chunks.length))
  for (let index = chunks.length; index < oldCount; index++) setCookie(`${base}_${index}`, "", 0)
  if (readMeasurements(experimentId, quantityId)?.join("\u0000") !== trimmed.join("\u0000")) {
    throw new Error("浏览器无法保存实验数据 Cookie，请检查 Cookie 设置或容量")
  }
}

export function buildImportPrompt(experimentTitle: string, quantities: MeasurementQuantity[]): string {
  const example = Object.fromEntries(quantities.map((quantity) => [quantity.id, ["1.00", "2.00"]]))
  const descriptions = quantities.map((quantity) =>
    `- ${quantity.id}：${quantity.showName}（${quantity.unit}）`,
  ).join("\n")
  return `请识别随附图片中的「${experimentTitle}」原始测量数据，并严格按下面字段输出 JSON。\n${descriptions}\n每个字段对应一个按测量顺序排列的数组。数值请写成字符串，保留图片中的小数位和末尾零；不要计算、补造或省略读数。只返回 JSON，不要解释，也不要使用 Markdown 代码块。\n格式示例（请替换为图片中的真实读数）：\n${JSON.stringify(example, null, 2)}`
}

export function parseImportedMeasurements(text: string, quantities: MeasurementQuantity[]): Record<string, string[]> {
  const content = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("JSON 格式有误，请检查括号、逗号和引号")
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON 顶层应为对象，字段名须与下方示例一致")
  }
  const object = parsed as Record<string, unknown>
  const expected = new Set(quantities.map((quantity) => quantity.id))
  const extra = Object.keys(object).filter((key) => !expected.has(key))
  if (extra.length) throw new Error(`存在未识别的字段：${extra.join("、")}`)
  return Object.fromEntries(quantities.map((quantity) => {
    const readings = object[quantity.id]
    if (readings === undefined && quantity.optionalCount !== undefined) return [quantity.id, Array<string>(quantity.optionalCount).fill("")]
    if (!Array.isArray(readings) || readings.length === 0 || readings.length > MAX_IMPORT_VALUES) {
      throw new Error(`${quantity.showName}必须是包含 1 至 ${MAX_IMPORT_VALUES} 个读数的数组`)
    }
    const values = readings.map((reading, index) => {
      if (typeof reading !== "string" && typeof reading !== "number") {
        throw new Error(`${quantity.showName}第 ${index + 1} 个读数不是数字`)
      }
      const value = String(reading).trim()
      if (quantity.allowBlank && value === "") return ""
      if (!DECIMAL_NUMBER.test(value) || !Number.isFinite(Number(value))) {
        throw new Error(`${quantity.showName}第 ${index + 1} 个读数无效：${value}`)
      }
      return value
    })
    return [quantity.id, values]
  }))
}
