import type { StructuredExperiment } from "../structured-experiments.ts"
import { soundFrequencyStored } from "./sound-frequency-units.ts"

const COOKIE_PREFIX = "phyexp_v1_"
const COOKIE_CHUNK_SIZE = 3000
const COOKIE_AGE = 365 * 24 * 60 * 60
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const SCIENTIFIC_PRODUCT = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*[×xX*]\s*10\s*(?:\^\s*([+\-−]?\d+)|([⁺⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))$/
const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹"

function normalizeImportedReading(value: string): string {
  const match = SCIENTIFIC_PRODUCT.exec(value)
  if (!match) return value
  const exponent = match[2]?.replace("−", "-") ?? [...match[3]].map((character) =>
    character === "⁺" ? "+" : character === "⁻" ? "-" : String(SUPERSCRIPT_DIGITS.indexOf(character)),
  ).join("")
  // Keep the coefficient text (including trailing zeros); never round via Number.
  return `${match[1]}e${exponent}`
}

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

function calculationFields(experiment: StructuredExperiment) {
  return {
    measurements: experiment.measurements.filter((item) => !item.optional),
    parameters: experiment.parameters.filter((item) => item.calculation !== false),
  }
}

export function buildImportPrompt(experiment: StructuredExperiment): string {
  const { measurements, parameters } = calculationFields(experiment)
  const millikan = experiment.id === "millikan"
  const vibration = experiment.id === "forced-vibration"
  const descriptions = measurements.map((item) => {
    const count = millikan ? "按已测油滴填写，共 12 至 32 个" : vibration ? "按实际测量数量" : `${item.count} 个`
    const order = item.rowLabels ? `，依次为${item.rowLabels.join("、")}` : ""
    return `- ${item.id}（${item.label}，${item.unit}，${count}${order}）使用数组`
  })
  for (const item of parameters) descriptions.push(`- ${item.id}（${item.label}，${item.unit}）使用单个数值字符串`)
  if (millikan) descriptions.push("每颗油滴连续四行，只填写完整测量的油滴，各数组行顺序一致。")
  if (vibration) descriptions.push("自由振动各列至少 2 项，受迫振动各列至少 3 项，同组各列等长。每组阻尼计时对应 10 个峰值。")
  const example = Object.fromEntries([
    ...measurements.map((item) => [item.id, ["1.00", "2.00"]]),
    ...parameters.map((item) => [item.id, "1.00"]),
  ])
  return `请识别随附图片中的「${experiment.title}」原始实验数据。只输出下列计算所需字段，所有字段放在同一个 JSON 对象中。\n${descriptions.join("\n")}\n读数按测量顺序排列。数值写成字符串，按列出的单位填写，保留原始精度和末尾零。只做必要的单位换算，禁止推算、猜测或补造数值。图中缺失的值留空，导入前由用户补齐。只返回 JSON。\n按下面的格式输出。数组长度以上述说明为准，示例数值须替换。\n${JSON.stringify(example, null, 2)}`
}

function parseImportNumber(raw: unknown, label: string, allowBlank = false) {
  if (typeof raw !== "string" && typeof raw !== "number") throw new Error(`${label}需要填写数字`)
  const value = String(raw).trim()
  if (allowBlank && value === "") return ""
  const normalized = normalizeImportedReading(value)
  if (!DECIMAL_NUMBER.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw new Error(`${label}的数值无效：${value}`)
  }
  return normalized
}

export function parseExperimentImport(text: string, experiment: StructuredExperiment) {
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
  const { measurements, parameters } = calculationFields(experiment)
  const expected = new Set([...experiment.measurements, ...experiment.parameters].map((item) => item.id))
  const extra = Object.keys(object).filter((key) => !expected.has(key))
  if (extra.length) throw new Error(`存在未识别的字段：${extra.join("、")}`)
  const millikan = experiment.id === "millikan"
  const vibration = experiment.id === "forced-vibration"
  const data = Object.fromEntries(measurements.map((item) => {
    const readings = object[item.id]
    if (!Array.isArray(readings)) throw new Error(`${item.label}必须是读数数组`)
    const min = millikan ? 12 : vibration ? 1 : item.count
    const max = vibration ? (item.id === "damped_peak" ? 5000 : 500) : item.count
    if (readings.length < min || readings.length > max) {
      throw new Error(`${item.label}需要 ${min === max ? min : `${min} 至 ${max}`} 个读数`)
    }
    const values = readings.map((reading, index) => parseImportNumber(reading, `${item.label}第 ${index + 1} 个读数`, millikan))
    if (millikan) return [item.id, [...values, ...Array<string>(item.count - values.length).fill("")]]
    return [item.id, values]
  }))
  const importedParameters = Object.fromEntries(parameters.map((item) => [
    item.id, soundFrequencyStored(experiment.id, item.id, parseImportNumber(object[item.id], item.label)),
  ]))
  return { data, parameters: importedParameters }
}
