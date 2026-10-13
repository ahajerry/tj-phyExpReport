import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ForcedVibrationReadings } from "@/components/forced-vibration-readings"
import { MillikanReadings, TorsionReadings } from "@/components/instrument-readings"
import { buildImportPrompt, parseImportedMeasurements } from "@/lib/experiment-data"
import { readSavedExperimentValues, REPORT_INFO_FIELDS } from "@/lib/structured-experiment-storage"
import type { StructuredExperiment } from "@/structured-experiments"

export function StructuredExperimentPage({ experiment }: { experiment: StructuredExperiment }) {
  const navigate = useNavigate()
  const [initial] = useState(() => readSavedExperimentValues(experiment))
  const [data, setData] = useState(initial.data)
  const [parameters, setParameters] = useState(initial.parameters)
  const [reportInfo, setReportInfo] = useState(initial.reportInfo)
  const [images, setImages] = useState<File[]>([])
  const tableType = experiment.id === "millikan" ? "csv" : ["moment-of-inertia", "forced-vibration"].includes(experiment.id) ? "xlsx" : null
  const isForcedVibration = experiment.id === "forced-vibration"
  const [importingTable, setImportingTable] = useState(false)
  const [tableImportMessage, setTableImportMessage] = useState("")
  const maxImages = experiment.id === "oscilloscope" ? 2 : 5
  const [importText, setImportText] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(`phyexp_report_${experiment.id}`, JSON.stringify({ data, parameters, reportInfo }))
    } catch { /* Submitting the current form is still possible. */ }
  }, [experiment.id, data, parameters, reportInfo])

  function changeReading(key: string, index: number, value: string) {
    setData((current) => ({ ...current, [key]: current[key].map((old, i) => i === index ? value : old) }))
  }

  function resizeReadings(section: "free" | "damped" | "forced", count: number) {
    const keys = section === "free" ? ["free_angle", "free_period"]
      : section === "damped" ? ["damped_peak", "damped_time_10"] : ["drive_period", "amplitude", "phase"]
    setData((current) => ({ ...current, ...Object.fromEntries(keys.map((key) => [key,
      Array.from({ length: key === "damped_peak" ? count * 10 : count }, (_, index) => current[key][index] ?? ""),
    ])) }))
  }

  function validateCounts(readings: Record<string, string[]>) {
    if (!isForcedVibration) return
    for (const [keys, min, max] of [
      [["free_angle", "free_period"], 2, 300],
      [["damped_time_10"], 1, 10],
      [["drive_period", "amplitude", "phase"], 3, 100],
    ] as [string[], number, number][]) {
      const count = readings[keys[0]]?.length ?? 0
      if (count < min || count > max || keys.some((key) => readings[key]?.length !== count)) {
        throw new Error(`${keys.map((key) => experiment.measurements.find((item) => item.id === key)?.label).join("、")}需填写数量一致的 ${min} 至 ${max} 组读数`)
      }
    }
    if (readings.damped_peak?.length !== readings.damped_time_10.length * 10) throw new Error("每次阻尼测量需要 10 个峰值和一次计时")
  }

  function importReadings() {
    try {
      const parsed = parseImportedMeasurements(importText, experiment.measurements.map((item) => ({
        id: item.id, showName: item.label, unit: item.unit, allowBlank: experiment.id === "millikan" || item.optional,
        optionalCount: experiment.id === "focal-length" && item.optional ? item.count : undefined,
      })))
      for (const item of experiment.measurements) {
        if (experiment.id === "millikan" && parsed[item.id].length >= 12 && parsed[item.id].length <= item.count) {
          parsed[item.id] = [...parsed[item.id], ...Array<string>(item.count - parsed[item.id].length).fill("")]
        }
        if (!isForcedVibration && parsed[item.id].length !== item.count) throw new Error(`${item.label}需要 ${item.count} 个读数`)
      }
      validateCounts(parsed)
      setData(parsed)
      setMessage("原始读数已导入。")
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导入失败")
    }
  }

  async function importTable(file: File) {
    setError("")
    setTableImportMessage("")
    if (!file.name.toLowerCase().endsWith(`.${tableType}`) || file.size > 2 * 1024 * 1024 || !file.size) {
      setError(`请选择不超过 2 MiB 的非空 ${tableType?.toUpperCase()} 文件`)
      return
    }
    setImportingTable(true)
    try {
      const form = new FormData()
      form.append("payload", JSON.stringify({ experimentId: experiment.id, reportInfo }))
      form.append("table", file)
      const response = await fetch("/api/reports/import-table", {
        method: "POST", headers: { "X-Report-Request": "1" }, body: form,
      })
      const result = await response.json() as {
        data?: Record<string, string[]>; parameters?: Record<string, string>; reportInfo?: Record<string, string>; error?: string
      }
      if (!response.ok || !result.data || !result.parameters) throw new Error(result.error ?? "数据表导入失败")
      for (const item of experiment.measurements) {
        if (!isForcedVibration && result.data[item.id]?.length !== item.count) throw new Error(`${item.label}的数量与表格不一致`)
      }
      validateCounts(result.data)
      setData(result.data)
      setParameters(result.parameters)
      setReportInfo((current) => Object.fromEntries(REPORT_INFO_FIELDS.map(({ id }) => [id, current[id] || result.reportInfo?.[id] || ""])))
      setTableImportMessage(`已导入 ${file.name}，可在下方修改数据。报告将使用修改后的表格内容。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "数据表导入失败")
    } finally {
      setImportingTable(false)
    }
  }

  async function generate() {
    setError("")
    try { validateCounts(data) } catch (reason) {
      setError(reason instanceof Error ? reason.message : "读数数量不正确")
      return
    }
    const concaveUsed = experiment.id === "focal-length" && experiment.measurements.filter((item) => item.id.startsWith("concave_")).some((item) => data[item.id].some((value) => value.trim()))
    const lastDropRow = experiment.id === "millikan"
      ? Math.max(-1, ...experiment.measurements.flatMap((item) => data[item.id].flatMap((value, index) => value.trim() ? [index] : []))) : null
    const dropRows = lastDropRow === null ? null : (Math.floor(lastDropRow / 4) + 1) * 4
    if (dropRows !== null && (dropRows < 12 || dropRows > 32)) {
      setError("请连续填写 3 至 8 颗油滴，每颗油滴 4 行记录")
      return
    }
    for (const item of experiment.measurements) {
      const values = data[item.id]
      if ((dropRows === null ? values : values.slice(0, dropRows)).some((value) =>
        (!value.trim() && (!item.optional || concaveUsed && item.id.startsWith("concave_"))) || (value.trim() && !Number.isFinite(Number(value))))) {
        setError(experiment.id === "millikan" ? `${item.label}的已使用行需填写有效数字` : `${item.label}需要 ${values.length} 个有效数字`)
        return
      }
    }
    for (const item of experiment.parameters) {
      if (!parameters[item.id]?.trim() || !Number.isFinite(Number(parameters[item.id]))) {
        setError(`请填写${item.label}`)
        return
      }
      const value = Number(parameters[item.id])
      if (item.min !== undefined && value < item.min || item.minExclusive !== undefined && value <= item.minExclusive) {
        setError(`${item.label}的数值超出允许范围`)
        return
      }
    }
    setGenerating(true)
    try {
      const payload = { experimentId: experiment.id, data, parameters, reportInfo }
      let response: Response
      if (images.length) {
        const form = new FormData()
        form.append("payload", JSON.stringify(payload))
        images.forEach((file) => form.append("images", file))
        response = await fetch("/api/reports/jobs", { method: "POST", headers: { "X-Report-Request": "1" }, body: form })
      } else {
        response = await fetch("/api/reports/jobs", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
      }
      const result = await response.json().catch(() => null) as { id?: string; error?: string } | null
      if (!response.ok || !result?.id) throw new Error(result?.error ?? `提交失败（HTTP ${response.status}）`)
      navigate(`/reports/${result.id}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成报告失败")
    } finally {
      setGenerating(false)
    }
  }

  const prompt = buildImportPrompt(experiment.title, experiment.measurements.map((item) => ({
    id: item.id, showName: `${item.label}（${isForcedVibration ? "按实际测量数量" : `${item.count} 个`}${item.rowLabels ? `，顺序：${item.rowLabels.join("、")}` : ""}）`, unit: item.unit,
  }))) + (experiment.id === "millikan" ? "\n每颗油滴对应连续四行，各字段按相同的行顺序排列。选填项与未使用油滴的空白读数用空字符串表示。" : experiment.id === "focal-length" ? "\n未做凹透镜实验时可省略 concave_object、concave_lens、concave_image 三个字段。" : "")

  function readingCell(key: string, index: number) {
    const item = experiment.measurements.find((item) => item.id === key)!
    return <Input className="min-w-24" type="number" step="any" inputMode="decimal"
      aria-label={`${item.label}${item.rowLabels?.[index] ?? `第 ${index + 1} 次`}`}
      value={data[key][index]} onChange={(event) => changeReading(key, index, event.target.value)} />
  }

  function parameterCell(key: string) {
    const item = experiment.parameters.find((item) => item.id === key)!
    return <Input className="min-w-24" type="number" step="any" inputMode="decimal"
      aria-label={`${item.label}（${item.unit}）`} value={parameters[key]}
      onChange={(event) => setParameters((current) => ({ ...current, [key]: event.target.value }))} />
  }

  function calculatedReading(keys: string[], index: number, calculate: (...values: number[]) => number) {
    const raw = keys.map((key) => key === "probe_factor" ? parameters[key] : data[key][index])
    if (raw.some((value) => !value?.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0)) return "—"
    const value = calculate(...raw.map(Number))
    return Number.isFinite(value) ? Number(value.toPrecision(6)).toString() : "—"
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{experiment.title}</h1>
        <p className="text-muted-foreground">{experiment.note}</p>
      </header>
      {tableType && <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">从 {tableType.toUpperCase()} 填入数据（选填）</h2>
        <p className="mb-3 text-sm text-muted-foreground">{isForcedVibration ? "选择与提供的波尔共振 XLSX 相同版式的文件，将自动填入下方全部测量数据和阻尼档位。" : experiment.id === "millikan" ? "选择油滴仪 CSV 原始记录，每颗油滴连续 4 行，共 3 至 8 颗。支持 UTF-8 和 GB18030，逐行保留电压、时间和仪器电荷量。" : "选择与提供的扭摆实验 XLSX 相同版式的文件，将自动填入质量、三次尺寸和计时、两个滑块质量及两滑块自身惯量。"}导入会替换当前读数；封面信息仅补充空白项。文件上限 2 MiB。</p>
        <Input type="file" accept={tableType === "csv" ? ".csv,text/csv" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
          aria-label={`上传${tableType.toUpperCase()}原始数据表`} disabled={importingTable || generating} onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ""
            if (file) void importTable(file)
          }} />
        {importingTable && <p role="status" className="mt-2 text-sm">正在读取并填入数据…</p>}
        {tableImportMessage && <p role="status" className="mt-2 text-sm text-green-700">{tableImportMessage}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </section>}
      {experiment.id === "oscilloscope" && <section className="space-y-4">
        <div className="overflow-x-auto rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">波形电压、周期与频率</h2>
          <table className="w-full text-center text-sm">
            <thead><tr>{["待测波形", "V/div", "纵向跨度 / div", "Upp / V（计算）", "ms/div", "周期跨度 / div", "Ty / ms（计算）", "fv / Hz（计算）"].map((label) => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
            <tbody>{experiment.measurements[0].rowLabels?.map((name, index) => <tr key={name} className="border-t">
              <th className="whitespace-nowrap p-2 font-normal">{name}</th>
              <td className="p-2">{readingCell("voltage_scale", index)}</td>
              <td className="p-2">{readingCell("voltage_divisions", index)}</td>
              <td className="p-2">{calculatedReading(["voltage_scale", "voltage_divisions", "probe_factor"], index, (scale, divisions, probe) => scale * divisions * probe)}</td>
              <td className="p-2">{readingCell("time_scale", index)}</td>
              <td className="p-2">{readingCell("period_divisions", index)}</td>
              <td className="p-2">{calculatedReading(["time_scale", "period_divisions"], index, (scale, divisions) => scale * divisions)}</td>
              <td className="p-2">{calculatedReading(["time_scale", "period_divisions"], index, (scale, divisions) => 1000 / (scale * divisions))}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">李萨如图形测频</h2>
          <table className="w-full text-center text-sm">
            <thead><tr>{["组次", "fx / kHz", "ny", "nx", "fy = nx/ny × fx / kHz（计算）"].map((label) => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
            <tbody>{data.reference_frequency.map((_, index) => <tr key={index} className="border-t">
              <th className="p-2 font-normal">{index + 1}</th>
              <td className="p-2">{readingCell("reference_frequency", index)}</td>
              <td className="p-2">{readingCell("ny", index)}</td>
              <td className="p-2">{readingCell("nx", index)}</td>
              <td className="p-2">{calculatedReading(["reference_frequency", "ny", "nx"], index, (fx, ny, nx) => nx / ny * fx)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>}
      {isForcedVibration && <ForcedVibrationReadings readingCell={readingCell} dampingSetting={parameters.damping_setting}
        freeCount={data.free_angle.length} trialCount={data.damped_time_10.length} forcedCount={data.drive_period.length}
        onResize={resizeReadings}
        onDampingSettingChange={(value) => setParameters((current) => ({ ...current, damping_setting: value }))}
        disabled={importingTable || generating} />}
      {experiment.id === "millikan" && <MillikanReadings readingCell={readingCell} disabled={importingTable || generating} />}
      {experiment.id === "moment-of-inertia" && <TorsionReadings readingCell={readingCell} parameterCell={parameterCell} disabled={importingTable || generating} />}
      {!tableType && experiment.id !== "oscilloscope" && <section className="grid gap-4 lg:grid-cols-2">
        {experiment.measurements.map((item) => (
          <div key={item.id} className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold">{item.label} <span className="text-sm font-normal text-muted-foreground">({item.unit})</span></h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {data[item.id].map((value, index) => (
                <label key={index} className="flex items-center gap-2 text-sm">
                  <span className={`${item.rowLabels ? "w-20 shrink-0" : "w-7"} text-right text-muted-foreground`}>{item.rowLabels?.[index] ?? index + 1}</span>
                  <Input type="number" step="any" inputMode="decimal" aria-label={`${item.label}${item.rowLabels?.[index] ?? `第 ${index + 1} 次`}`}
                    value={value} onChange={(event) => changeReading(item.id, index, event.target.value)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>}
      {!tableType && experiment.parameters.length > 0 && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">仪器及计算参数</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {experiment.parameters.map((item) => (
              <label key={item.id} className="space-y-1 text-sm">
                <span>{item.label}（{item.unit}）</span>
                <Input type="number" step="any" inputMode="decimal" value={parameters[item.id]}
                  onChange={(event) => setParameters((current) => ({ ...current, [item.id]: event.target.value }))} />
              </label>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">封面信息（选填）</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REPORT_INFO_FIELDS.map((item) => (
            <label key={item.id} className="space-y-1 text-sm">
              <span>{item.label}</span>
              <Input type={item.id === "date" ? "date" : "text"} maxLength={120} value={reportInfo[item.id]}
                onChange={(event) => setReportInfo((current) => ({ ...current, [item.id]: event.target.value }))} />
            </label>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">原始数据记录图片（选填）</h2>
        <p className="mb-2 text-sm text-muted-foreground">最多 {maxImages} 张，每张不超过 8 MiB；首张图片填入原始数据记录页，多张图片依次分页。{experiment.id === "oscilloscope" && "示波器完整报告保持在 6–7 页。"}</p>
        <Input type="file" accept="image/png,image/jpeg,image/gif,image/tiff,image/webp,image/heic,image/heif,image/avif,.heic,.heif" multiple
          aria-label="上传原始数据记录图片" onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? [])
            if (selected.length > maxImages || selected.some((file) => file.size > 8 * 1024 * 1024) ||
              selected.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) {
              setError(`最多上传 ${maxImages} 张图片，每张不超过 8 MiB，总计不超过 25 MiB`)
              setImages([])
              event.currentTarget.value = ""
            } else setImages(selected)
          }} />
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">从 JSON 导入读数</h2>
        <details className="mb-2 text-sm"><summary className="cursor-pointer text-blue-700">查看识别提示词</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3">{prompt}</pre></details>
        <Textarea aria-label="实验数据 JSON" rows={5} value={importText} onChange={(event) => setImportText(event.target.value)} />
        <Button className="mt-2" variant="outline" onClick={importReadings} disabled={!importText.trim()}>导入读数</Button>
        {message && <p role="status" className="mt-2 text-sm text-green-700">{message}</p>}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <Button onClick={generate} disabled={generating || importingTable}>{generating ? "正在提交任务…" : "生成实验报告"}</Button>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  )
}
