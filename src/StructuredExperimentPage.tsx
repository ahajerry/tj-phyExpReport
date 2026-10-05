import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  const [table, setTable] = useState<File | null>(null)
  const tableType = experiment.id === "millikan" ? "csv" : experiment.id === "moment-of-inertia" ? "xlsx" : null
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

  function importReadings() {
    try {
      const parsed = parseImportedMeasurements(importText, experiment.measurements.map((item) => ({
        id: item.id, showName: item.label, unit: item.unit,
      })))
      for (const item of experiment.measurements) {
        if (parsed[item.id].length !== item.count) throw new Error(`${item.label}需要 ${item.count} 个读数`)
      }
      setData(parsed)
      setMessage("原始读数已导入。")
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导入失败")
    }
  }

  async function generate() {
    setError("")
    if (tableType && !table) {
      setError(`请上传 ${tableType.toUpperCase()} 原始数据表`)
      return
    }
    for (const item of tableType ? [] : experiment.measurements) {
      if (data[item.id].some((value) => !value.trim() || !Number.isFinite(Number(value)))) {
        setError(`${item.label}需要 ${item.count} 个有效数字`)
        return
      }
    }
    for (const item of tableType ? [] : experiment.parameters) {
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
      if (images.length || table) {
        const form = new FormData()
        form.append("payload", JSON.stringify(payload))
        images.forEach((file) => form.append("images", file))
        if (table) form.append("table", table)
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
    id: item.id, showName: `${item.label}（${item.count} 个${item.rowLabels ? `，顺序：${item.rowLabels.join("、")}` : ""}）`, unit: item.unit,
  })))

  function readingCell(key: string, index: number) {
    const item = experiment.measurements.find((item) => item.id === key)!
    return <Input className="min-w-24" type="number" step="any" inputMode="decimal"
      aria-label={`${item.label}${item.rowLabels?.[index] ?? `第 ${index + 1} 次`}`}
      value={data[key][index]} onChange={(event) => changeReading(key, index, event.target.value)} />
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
      {tableType ? <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">上传原始数据表（必填）</h2>
        <p className="mb-2 text-sm text-muted-foreground">{tableType === "csv" ? "上传与提供的密里根油滴 CSV 相同格式的记录，每颗油滴连续 4 行，共 3 至 8 颗。支持 UTF-8 和 GB18030。" : "上传与提供的扭摆实验 XLSX 相同版式的数据表，系统读取质量、尺寸、计时和滑块数据。"} 文件上限 2 MiB；数据会填入报告并附在原始记录页。</p>
        <Input type="file" accept={tableType === "csv" ? ".csv,text/csv" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
          aria-label={`上传${tableType.toUpperCase()}原始数据表`} onChange={(event) => {
            const selected = event.currentTarget.files?.[0] ?? null
            if (selected && (!selected.name.toLowerCase().endsWith(`.${tableType}`) || selected.size > 2 * 1024 * 1024)) {
              setError(`请选择不超过 2 MiB 的 ${tableType.toUpperCase()} 文件`)
              setTable(null)
              event.currentTarget.value = ""
            } else {
              setTable(selected)
              setError("")
            }
          }} />
        {table && <p className="mt-2 text-sm text-muted-foreground">已选择：{table.name}</p>}
      </section> : <section className="rounded-xl border bg-white p-4">
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
      </section>}
      {!tableType && <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">从 JSON 导入读数</h2>
        <details className="mb-2 text-sm"><summary className="cursor-pointer text-blue-700">查看识别提示词</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3">{prompt}</pre></details>
        <Textarea aria-label="实验数据 JSON" rows={5} value={importText} onChange={(event) => setImportText(event.target.value)} />
        <Button className="mt-2" variant="outline" onClick={importReadings} disabled={!importText.trim()}>导入读数</Button>
        {message && <p role="status" className="mt-2 text-sm text-green-700">{message}</p>}
      </section>}
      <section className="rounded-xl border bg-white p-4">
        <Button onClick={generate} disabled={generating}>{generating ? "正在提交任务…" : "生成实验报告"}</Button>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  )
}
