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
    for (const item of experiment.measurements) {
      if (data[item.id].some((value) => !value.trim() || !Number.isFinite(Number(value)))) {
        setError(`${item.label}需要 ${item.count} 个有效数字`)
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
    id: item.id, showName: `${item.label}（${item.count} 个）`, unit: item.unit,
  })))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{experiment.title}</h1>
        <p className="text-muted-foreground">{experiment.note}</p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        {experiment.measurements.map((item) => (
          <div key={item.id} className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold">{item.label} <span className="text-sm font-normal text-muted-foreground">({item.unit})</span></h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {data[item.id].map((value, index) => (
                <label key={index} className="flex items-center gap-2 text-sm">
                  <span className="w-7 text-right text-muted-foreground">{index + 1}</span>
                  <Input type="number" step="any" inputMode="decimal" aria-label={`${item.label}第 ${index + 1} 次`}
                    value={value} onChange={(event) => changeReading(item.id, index, event.target.value)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>
      {experiment.parameters.length > 0 && (
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
        <p className="mb-2 text-sm text-muted-foreground">最多 5 张，每张不超过 8 MiB；图片按选择顺序附在报告末尾。</p>
        <Input type="file" accept="image/png,image/jpeg,image/gif,image/tiff,image/webp,image/heic,image/heif,image/avif,.heic,.heif" multiple
          aria-label="上传原始数据记录图片" onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? [])
            if (selected.length > 5 || selected.some((file) => file.size > 8 * 1024 * 1024) ||
              selected.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) {
              setError("最多上传 5 张图片，每张不超过 8 MiB，总计不超过 25 MiB")
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
        <Button onClick={generate} disabled={generating}>{generating ? "正在提交任务…" : "生成实验报告"}</Button>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>
  )
}
