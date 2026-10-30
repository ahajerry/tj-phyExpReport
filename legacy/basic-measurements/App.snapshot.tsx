import { ContributorCredits } from "@/components/contributor-credits"
import { CodeBlock } from "@/components/code-block"
import { Callout } from "@/components/callout"
import { LabHome } from "@/components/lab-home"
import { LabAbout } from "@/components/lab-about"
/*
import {useState,useMemo} from "react"
//对一个物理量的可复用输入表单

type Row = {
    id: string
    value: string
}

//需要测量的物理量 相应信息储存在这种字段中
type DataField = {
    id: string//程序内部使用的名字
    showName: string//显示的名字
    phySymbol: string//符号，比如电流对应I
    unit: string//单位
}

//实验的信息
type Experiment = {
    id: string//同上
    navname: string//在导航栏显示的名字
    title: string//页面标题
    showFormula: string//显示给用户的参考公式
    calculate: (data: Record<string, number[]>) => Result | null
    //计算用的函数
    fields: DataField[]//需要测量的几个物理量 组成数组保存
}

const [ExpRows, setExpRows] = useState<Record<string, Record<string, Row[]>>>({})

function createEmptyRow(): Row{
    return {
        id: crypto.randomUUID(),
        value: "",
    }
}


//箭头函数没有this

//getter用于创建可读可写的虚拟属性，实际上就是想用函数但是又不想名叫函数

import {useState} from "react";

type RawRow = {
    id: string,
    value: string,
}

function newRow():RawRow {
    return {
        id: crypto.randomUUID(),
        value: "",
    }
}

class quantity{
    rows: RawRow[]
    setRows:

}
gpt的写法是把row，datafield，input等都单独定义成type或function
然后再用measurementInput打包这一堆东西，从而new新对象
然后在App()里面用react组件调用type或function来实现实时更新*/

import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, Outlet, Route, Routes, useOutletContext, useParams, useLocation } from "react-router"
import { BlockMath } from "react-katex"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Trash2 } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { experimentItems } from "@/experiments"
import { StructuredExperimentPage } from "@/StructuredExperimentPage"
import { structuredExperimentById } from "@/structured-experiments"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { buildImportPrompt, parseImportedMeasurements, readMeasurements, saveMeasurements } from "@/lib/experiment-data"
import { finishResult, formatUncertainty } from "@/lib/result-precision"

//1.定义数据类型
type RawRow = { id: string; value: string }
type Quantity = { id: string; symbol: string; unit: string; showName: string }
type Result = { value: number; uncertainty: number; info: Quantity }
type Experiment = {
  id: string
  navName: string
  title: string
  description: string
  quantities: Quantity[]
  formula: string
  chartFieldKey: string
  calculate: (data: Record<string, number[]>) => Result | null
  //Record<键的类型，值的类型>
  // |表示左右两边的对象都可以
}
//这里定义了initialize出来的完全体数据对象的类型
type RowsByExperiment = Record<string, Record<string, RawRow[]>>
//这种对象的每个属性都是string类型的key，Record<string, RawRow[]>类型的value
type ExperimentContext = {
  rowsByExperiment: RowsByExperiment
  setRowsByExperiment: React.Dispatch<React.SetStateAction<RowsByExperiment>>
}
type ReportJob = {
  id: string
  experimentId: string | null
  status: "queued" | "running" | "done" | "failed"
  progress: number
  stage: string
  error: string | null
  queueAhead: number
  createdAt: string
  imageCount: number
}
type ReportSession = { userId: string; dailyLimit: number; usedToday: number; queueAheadIfSubmitted: number; jobs: ReportJob[] }

async function readApi<T>(response: Response): Promise<T> {
  if ([502, 503, 504].includes(response.status)) {
    throw new Error("报告后端暂时无法连接，请检查服务状态后重试")
  }
  const body = await response.json().catch(() => null) as (T & { error?: string }) | null
  if (!response.ok) throw new Error(body?.error ?? `请求失败（HTTP ${response.status}）`)
  if (!body) throw new Error("服务器没有返回有效结果")
  return body
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new Error("无法连接报告服务；本地开发请确认 pnpm dev 正在运行")
  }
}

//2.定义通用工具函数
function newRow(): RawRow {
  return { id: crypto.randomUUID(), value: "" }
}

class Calculate {
  private data: number[]

  constructor(data: number[]) {
    this.data = data
  }

  get mean() {
    return this.data.length ? this.data.reduce((sum, value) => sum + value, 0) / this.data.length : 0
  }

  get sd() {
    if (this.data.length < 2) return 0
    const mean = this.mean
    return Math.sqrt(this.data.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (this.data.length - 1))
  }

  get u_a() {
    return this.data.length < 2 ? 0 : this.sd / Math.sqrt(this.data.length)
  }
  //保留位数的逻辑在输出的地方再写，这里只做计算
}

//3.实验配置
const experiments: Experiment[] = [
  {
    id: "length-measurement",
    navName: "长度测量",
    title: "直尺测量物体长度",
    description: "多次测量物体长度，并计算平均值与不确定度",
    quantities: [{ id: "length", symbol: "L", unit: "cm", showName: "长度" }],
    formula: String.raw`L = \bar{L} \pm u_L`,
    chartFieldKey: "length",
    calculate: (data) => {
      if (!data.length.length) return null
      const length = new Calculate(data.length)
      return {
        value: length.mean,
        uncertainty: length.u_a,
        info: { id: "length-result", symbol: "L", unit: "cm", showName: "物体长度" },
      }
    },
  },
  {
    id: "density",
    navName: "密度测量",
    title: "物体密度测量",
    description: "通过质量和体积的多次测量结果计算物体密度",
    quantities: [
      { id: "mass", symbol: "m", unit: "g", showName: "质量" },
      { id: "volume", symbol: "V", unit: "cm³", showName: "体积" },
    ],
    formula: String.raw`\rho = \frac{\bar{m}}{\bar{V}}`,
    chartFieldKey: "mass",
    calculate: (data) => {
      if (!data.mass.length || !data.volume.length) return null
      const mass = new Calculate(data.mass)
      const volume = new Calculate(data.volume)
      if (volume.mean === 0 || mass.mean === 0) return null
      const density = mass.mean / volume.mean
      // 简单演示不确定度传播
      const relativeUncertainty = Math.sqrt(
        (mass.u_a / mass.mean) ** 2 + (volume.u_a / volume.mean) ** 2,
      )
      return {
        value: density,
        uncertainty: Math.abs(density) * relativeUncertainty,
        info: { id: "density-result", symbol: "\\rho", unit: "g/cm³", showName: "密度" },
      }
    },
  },
]

//4.初始化实验数据
function initializeRows(): RowsByExperiment {
  /*
    xxx.map(处理函数) 接收数组xxx中的每一个元素，使用函数处理后，输出一个新数组
    Object.fromEntries()接收N个二元数组，按照[{键：键值},...]生成N个键的对象
    此处返回
    {{实验1id:
            {物理量1id:[空行,],
            物理量2id:[空行,],...}
     },
    {实验2id:
            {物理量1id:[空行,],
            物理量2id:[空行,],...}
     },...
     }
  */
  return Object.fromEntries(
    experiments.map((experiment) => [
      experiment.id,
      Object.fromEntries(experiment.quantities.map((quantity) => {
        const saved = readMeasurements(experiment.id, quantity.id)
        const rows = saved?.length ? saved.map((value) => ({ id: crypto.randomUUID(), value })) : [newRow()]
        if (rows.at(-1)?.value.trim()) rows.push(newRow())
        return [quantity.id, rows]
      })),
    ]),
  )
}

//7.主组件App
function AppLayout() {
  const isHome = useLocation().pathname === "/"
  //全部实验、全部字段的输入状态
  //这个设计保证即使切了页面，之前做过的实验数据也会保存下来，缺点就是整个字段比较庞大
  // 放在共享布局中，切换路由时已输入的数据仍留在内存里。
  const [rowsByExperiment, setRowsByExperiment] = useState<RowsByExperiment>(initializeRows)
  const [saveError, setSaveError] = useState("")
  useEffect(() => {
    try {
      experiments.forEach((experiment) => experiment.quantities.forEach((quantity) => {
        saveMeasurements(experiment.id, quantity.id, rowsByExperiment[experiment.id][quantity.id].map((row) => row.value))
      }))
      queueMicrotask(() => setSaveError(""))
    } catch (reason) {
      queueMicrotask(() => setSaveError(reason instanceof Error ? reason.message : "实验数据保存失败"))
    }
  }, [rowsByExperiment])
  return (
    <SidebarProvider className="app-layout pt-16">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-3 border-b bg-background px-4 text-foreground">
        <SidebarTrigger aria-label="切换侧边栏" />
        <span className="font-bold">全自动大雾实验</span>
      </header>
      <AppSidebar />
      <SidebarInset className={isHome ? "cosmic-shell min-w-0" : "min-w-0"}>
        <div className={isHome ? "cosmic-surface w-full flex-1" : "workspace-surface w-full flex-1 p-4 md:p-8"}>
          <div className={isHome ? "w-full" : "mx-auto max-w-6xl"}>
            {saveError && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{saveError}</p>}
            <Outlet context={{ rowsByExperiment, setRowsByExperiment } satisfies ExperimentContext} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AboutPage() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === "#experiment-catalog") document.getElementById("experiment-catalog")?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [hash])
  return <LabAbout>
    <section>
      <h2>关于项目</h2>
      <p>本项目致力于解决26级同济大学物理实验报告制作麻烦的问题。</p>
      <p>项目优先支持大学物理实验 B2 的 8 项自主实验，后续计划加入综合性自选实验，并可能扩展到物理实验 I。</p>
    </section>
    <section>
      <Callout color="emerald" title="简便数据导入方法：">
        如果不想手动输入，可以复制实验页面提供的提示词，将提示词与原始实验数据图片一起交给支持文字识别的 AI，再将返回的JSON数据导入页面。也可以手动编写 JSON。
        请将数据粘贴到实验页面下方的专属 JSON 输入框，而不是普通读数输入框。
      </Callout>
    </section>
    <section>
      <h2>技术架构</h2>
      <p>前端使用 React、Vite、Tailwind CSS 与 shadcn/ui，页面中的统计结果在浏览器本地计算。生成报告时，测量数据会提交给 Go 后端保存为任务，再由 XeLaTeX 填入模板生成 PDF。</p>
      <Callout title="为什么不输出.docx文档？">
        用程序生成.docx文档时，排版容易乱掉，并且运行性能较差。而当前采用的latex编译.pdf方案，排版简便，易于调用tikz库画图，占用资源少。若需要word格式，可自行转换。
      </Callout>
      <p>网站通过匿名 Cookie 确认身份，无需注册账户。使用同一设备的同一浏览器，可以查看原有数据与报告排队进度。</p>
      <p>当前版本为 <code>v261030（测试）</code>；测试期间，数据和图片可能保存到服务器，用于调试与后续开发。</p>
      <p>项目已开源，欢迎查看源码、反馈问题或参与改进。</p>
      <CodeBlock label="本地开发命令" defaultValue="start" items={[
        { value: "download", label: "克隆源码", language: "bash", code: "git clone https://github.com/ahajerry/tj-phyExpReport" },
        { value: "build", label: "本地开发", language: "bash", code: "docker compose up -d --build\npnpm install --frozen-lockfile\npnpm dev" },
      ]} />
      <Button nativeButton={false} render={<a href="https://github.com/ahajerry/tj-phyExpReport" />} variant="outline"><img src="/github.svg" alt="" aria-hidden="true" width="16" height="16" className="size-4 shrink-0 dark:invert" />访问 GitHub 仓库</Button>
    </section>
    <section>
      <h2>茶话会</h2>
      <p>欢迎加入 QQ 群，一起探讨大雾实验的奥秘：<code>1127752706</code>。</p>
      <img src="/qq_group.jpg" alt="大雾实验交流群二维码" loading="lazy" width="256" height="320" className="h-auto w-48 rounded-lg" />
      <p>欢迎大雾实验Developer QQ群：<code>622788378</code>。</p>
    </section>
    <section>
      <h2>致谢</h2>
      <p>感谢对本项目的开发、运维做出贡献的所有人，尤其是ChatGPT老师，他贡献了一半以上的代码。</p>
      <p>感谢支持本项目的所有人。如果你觉得本项目帮到了你，欢迎打赏，详见QQ群。</p>
      <ContributorCredits />
    </section>
  </LabAbout>
}

function RawInput({ quantity, rows, onChange, onDelete }: {
  quantity: Quantity
  rows: RawRow[]
  onChange: (rowId: string, value: string) => void
  onDelete: (rowId: string) => void
}) {
  return (
    <section className="space-y-2 rounded-xl border bg-white p-4">
      <h2 className="text-base font-semibold">
        {quantity.showName} {quantity.symbol}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({quantity.unit})</span>
      </h2>
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <span className="w-6 text-right text-sm text-muted-foreground">{index + 1}</span>
          <div className="relative flex-1">
            <Input
              type="number"
              step="any"
              inputMode="decimal"
              value={row.value}
              className="pr-16"
              aria-label={`${quantity.showName}第 ${index + 1} 次测量`}
              onChange={(event) => onChange(row.id, event.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {quantity.unit}
            </span>
          </div>
          <Button type="button" variant="outline" size="icon" disabled={rows.length <= 1} onClick={() => onDelete(row.id)} aria-label="删除这一行">
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
    </section>
  )
}

function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  return <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>{copied ? "已复制" : label}</Button>
}

function ExperimentPage() {
  const { experimentId } = useParams()
  const { rowsByExperiment, setRowsByExperiment } = useOutletContext<ExperimentContext>()
  const experiment = experiments.find((item) => item.id === experimentId)
  const knownItem = experimentItems.find((item) => item.id === experimentId)

  if (!knownItem) return <Navigate to="/" replace />
  const structured = structuredExperimentById.get(experimentId ?? "")
  if (structured) return <StructuredExperimentPage key={structured.id} experiment={structured} />
  if (!experiment) {
    return (
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">{knownItem.title}</h1>
        <p className="mt-2 text-muted-foreground">这个实验的计算页面尚未配置。</p>
      </section>
    )
  }

  const currentExperiment = experiment
  const rows = rowsByExperiment[currentExperiment.id]
  function updateRow(quantityId: string, rowId: string, value: string) {
    setRowsByExperiment((current) => {
      const nextRows = current[currentExperiment.id][quantityId].map((row) => row.id === rowId ? { ...row, value } : row)
      if (nextRows.at(-1)?.value.trim()) nextRows.push(newRow())
      return { ...current, [currentExperiment.id]: { ...current[currentExperiment.id], [quantityId]: nextRows } }
    })
  }

  function deleteRow(quantityId: string, rowId: string) {
    setRowsByExperiment((current) => {
      const nextRows = current[currentExperiment.id][quantityId].filter((row) => row.id !== rowId)
      return { ...current, [currentExperiment.id]: { ...current[currentExperiment.id], [quantityId]: nextRows.length ? nextRows : [newRow()] } }
    })
  }

  function importRows(data: Record<string, string[]>) {
    setRowsByExperiment((current) => ({
      ...current,
      [currentExperiment.id]: Object.fromEntries(currentExperiment.quantities.map((quantity) => [
        quantity.id,
        [...data[quantity.id].map((value) => ({ id: crypto.randomUUID(), value })), newRow()],
      ])),
    }))
  }

  return <ExperimentContent key={experiment.id} experiment={experiment} rows={rows} updateRow={updateRow} deleteRow={deleteRow} importRows={importRows} />
}

function JsonImport({ experiment, onImport }: { experiment: Experiment; onImport: (data: Record<string, string[]>) => void }) {
  const [source, setSource] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const prompt = buildImportPrompt(experiment.title, experiment.quantities)
  const example = JSON.stringify(Object.fromEntries(experiment.quantities.map((quantity) => [quantity.id, ["1.00", "2.00"]])), null, 2)

  function importData() {
    try {
      const data = parseImportedMeasurements(source, experiment.quantities)
      onImport(data)
      setMessage(`已导入 ${Object.values(data).reduce((count, values) => count + values.length, 0)} 个读数，原有读数已替换。`)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导入失败")
      setMessage("")
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">从 JSON 导入原始数据</h2>
          <p className="text-sm text-muted-foreground">将图片和提示词交给能识别文字的 AI，再把返回的 JSON 粘贴到下方。也可以手动编写 JSON。</p>
        </div>
        <CopyButton text={prompt} label="复制提示词" />
      </div>
      <p className="text-sm text-muted-foreground">当前实验需要 {experiment.quantities.length} 项：{experiment.quantities.map((quantity) => `${quantity.id}（${quantity.showName}）`).join("、")}。导入会替换当前实验已有读数。</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-blue-700">查看 JSON 格式示例</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3">{example}</pre>
      </details>
      <Textarea aria-label={`${experiment.title}的 JSON 数据`} value={source} onChange={(event) => setSource(event.target.value)} placeholder={example} rows={9} className="font-mono" />
      <Button type="button" onClick={importData} disabled={!source.trim()}>导入 JSON</Button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    </section>
  )
}

function ExperimentContent({ experiment, rows, updateRow, deleteRow, importRows }: {
  experiment: Experiment
  rows: Record<string, RawRow[]>
  updateRow: (quantityId: string, rowId: string, value: string) => void
  deleteRow: (quantityId: string, rowId: string) => void
  importRows: (data: Record<string, string[]>) => void
}) {
  const [selectedChartField, setSelectedChartField] = useState(experiment.chartFieldKey)
  const numericData = useMemo(() => Object.fromEntries(
    experiment.quantities.map((quantity) => [
      quantity.id,
      rows[quantity.id]
        .filter((row) => row.value.trim() !== "")
        .map((row) => Number(row.value))
        .filter(Number.isFinite),
    ]),
  ) as Record<string, number[]>, [experiment, rows])
  const result = experiment.calculate(numericData)
  const finishedResult = result && Number.isFinite(result.value) && Number.isFinite(result.uncertainty)
    ? finishResult(result.value, result.uncertainty) : null
  const chartField = experiment.quantities.find((quantity) => quantity.id === selectedChartField) ?? experiment.quantities[0]
  const plotData = numericData[chartField.id].map((value, index) => ({ index: index + 1, value }))

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">{experiment.title}</h1>
        <p className="text-muted-foreground">{experiment.description}</p>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {experiment.quantities.map((quantity) => (
          <RawInput
            key={quantity.id}
            quantity={quantity}
            rows={rows[quantity.id]}
            onChange={(rowId, value) => updateRow(quantity.id, rowId, value)}
            onDelete={(rowId) => deleteRow(quantity.id, rowId)}
          />
        ))}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">原始数据统计</h2>
        {experiment.quantities.map((quantity) => {
          const values = numericData[quantity.id]
          const stats = new Calculate(values)
          const finishedStats = values.length > 1 && Number.isFinite(stats.u_a) ? finishResult(stats.mean, stats.u_a) : null
          return (
            <div key={quantity.id} className="numeric-result border-b py-3 last:border-0">
              <p className="font-medium">{quantity.showName} {quantity.symbol}</p>
              <p className="text-sm text-muted-foreground">平均值：{finishedStats?.value ?? (values.length ? stats.mean : "—")} {quantity.unit}</p>
              <p className="text-sm text-muted-foreground">标准差：{values.length > 1 && Number.isFinite(stats.sd) ? formatUncertainty(stats.sd) : "—"} {quantity.unit}</p>
              <p className="text-sm text-muted-foreground">A 类不确定度：{finishedStats?.uncertainty ?? "—"} {quantity.unit}</p>
            </div>
          )
        })}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">结果</h2>
        {result && finishedResult ? (
          <div className="numeric-result space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span>{result.info.showName}：{finishedResult.value} {result.info.unit}</span>
              <CopyButton text={finishedResult.value} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">合成不确定度：{finishedResult.uncertainty} {result.info.unit}</span>
              <CopyButton text={finishedResult.uncertainty} />
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">请先完成所需原始数据的输入。</p>}
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">参考公式</h2>
        <BlockMath math={experiment.formula} />
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">数据可视化</h2>
        <label className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          显示数据
          <select
            aria-label="选择可视化数据"
            value={chartField.id}
            onChange={(event) => setSelectedChartField(event.target.value)}
            className="rounded-lg border border-input bg-white px-3 py-1.5 text-foreground"
          >
            {experiment.quantities.map((quantity) => (
              <option key={quantity.id} value={quantity.id}>{quantity.showName} ({quantity.unit})</option>
            ))}
          </select>
        </label>
        <ChartContainer config={{ value: { label: chartField.showName, color: "#2563eb" } }} className="h-[260px] w-full">
          <BarChart data={plotData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="index" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </section>
      <JsonImport key={experiment.id} experiment={experiment} onImport={importRows} />
    </div>
  )
}

function ReportPage() {
  const { jobId } = useParams()
  const [session, setSession] = useState<ReportSession | null>(null)
  const [selectedJob, setSelectedJob] = useState<ReportJob | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let live = true
    async function refresh() {
      try {
        const next = await readApi<ReportSession>(await apiFetch("/api/reports/session"))
        const selected = jobId ? await readApi<ReportJob>(await apiFetch(`/api/reports/jobs/${jobId}`)) : null
        if (live) {
          setSession(next)
          setSelectedJob(selected)
          setError("")
        }
      } catch (reason) {
        if (live) setError(reason instanceof Error ? reason.message : "无法获取报告状态")
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 2000)
    return () => { live = false; window.clearInterval(timer) }
  }, [jobId])

  const current = jobId ? (selectedJob?.id === jobId ? selectedJob : undefined) : session?.jobs[0]
  const activeJobs = session?.jobs.filter((job) => job.status === "queued" || job.status === "running") ?? []
  const experimentTitle = current ? (experimentItems.find((item) => item.id === current.experimentId)?.title ?? current.experimentId ?? "实验") : "实验"
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">{jobId ? "生成报告" : "我的报告"}</h1>
        <p className="text-muted-foreground">任务会在服务器继续处理。离开或刷新页面后，可从“我的报告”回来查看和下载。</p>
      </section>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {!session && !error && <p className="text-sm text-muted-foreground">正在读取报告状态…</p>}
      {session && (
        <>
          <section className="rounded-xl border bg-white p-5 text-sm text-muted-foreground">
            当前访客：{session.userId} · 今日已提交 {session.usedToday}/{session.dailyLimit} 份报告
          </section>
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5" aria-live="polite">
            <h2 className="font-semibold">前方排队数</h2>
            <p className="mt-1 text-lg font-semibold text-blue-900">现在提交报告，前方有 {session.queueAheadIfSubmitted} 个任务</p>
            <p className="mt-1 text-sm text-muted-foreground">每 2 秒更新。已提交任务的实际排队数见下方任务状态。</p>
          </section>
          {!jobId && activeJobs.length > 0 && (
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5" aria-live="polite">
              <h2 className="font-semibold">排队与生成进度</h2>
              <p className="mt-1 text-sm text-muted-foreground">当前有 {activeJobs.length} 份报告待完成；排队人数每 2 秒更新。</p>
              <div className="mt-3 space-y-2">
                {activeJobs.map((job) => (
                  <Link key={job.id} to={`/reports/${job.id}`} className="flex flex-wrap justify-between gap-2 rounded-lg border bg-white p-3 text-sm hover:bg-slate-50">
                    <span>{experimentItems.find((item) => item.id === job.experimentId)?.title ?? job.experimentId ?? "实验"}</span>
                    <span className="font-medium">{job.status === "queued" ? `前方还有 ${job.queueAhead} 个任务` : `生成中 · ${job.progress}%`}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {current ? (
            <section className="space-y-4 rounded-xl border bg-white p-5" aria-live="polite">
              <div>
                <h2 className="text-lg font-semibold">{experimentTitle}实验报告</h2>
                <p className="text-sm text-muted-foreground">提交于 {new Date(current.createdAt).toLocaleString("zh-CN")}</p>
                {current.imageCount > 0 && <p className="text-sm text-muted-foreground">已归档 {current.imageCount} 张原始数据图片</p>}
              </div>
              {current.status === "queued" && (
                <div>
                  <p className="font-medium">正在排队</p>
                  <p className="text-sm text-muted-foreground">前方还有 {current.queueAhead} 个任务</p>
                </div>
              )}
              {current.status === "running" && (
                <div className="space-y-2">
                  <div className="flex justify-between gap-3 text-sm"><span>{current.stage}</span><span>{current.progress}%</span></div>
                  <progress value={current.progress} max={100} className="h-3 w-full accent-blue-600" aria-label="报告生成进度" />
                  <p className="text-xs text-muted-foreground">
                    进度按模板填充与两次编译阶段更新。（插入图片和tikz绘图等导致latex需要多次编译）
                    目测单份报告编译时长在30s~60s.
                  </p>
                </div>
              )}
              {current.status === "done" && (
                <div className="space-y-3">
                  <p className="font-medium text-green-700">报告已生成</p>
                  <Button render={<a href={`/api/reports/jobs/${current.id}/download`} download={`${experimentTitle}实验报告.pdf`} />}>下载 PDF</Button>
                </div>
              )}
              {current.status === "failed" && (
                <div role="alert" className="space-y-2 text-red-700">
                  <p className="font-medium">生成失败</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{current.error || "请检查后端日志并重试"}</p>
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-xl border bg-white p-5">
              <p>{jobId ? "此浏览器无法找到该任务。" : "还没有提交过报告。"}</p>
              <Button className="mt-3" variant="outline" render={<Link to="/experiments/speed-of-sound" />}>前往声速测定</Button>
            </section>
          )}
          {session.jobs.length > 1 && (
            <section className="rounded-xl border bg-white p-5">
              <h2 className="mb-3 font-semibold">历史报告</h2>
              <div className="space-y-2">
                {session.jobs.map((job) => (
                  <Link key={job.id} to={`/reports/${job.id}`} className="flex justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-slate-50">
                    <span>{experimentItems.find((item) => item.id === job.experimentId)?.title ?? job.experimentId ?? "实验"} · {new Date(job.createdAt).toLocaleString("zh-CN")}</span>
                    <span>{job.status === "done" ? "可下载" : job.status === "failed" ? "生成失败" : job.status === "running" ? "生成中" : `前方还有 ${job.queueAhead} 个任务`}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LabHome />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="experiments/:experimentId" element={<ExperimentPage />} />
        <Route path="reports" element={<ReportPage />} />
        <Route path="reports/:jobId" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
