import { ContributorCredits } from "@/components/contributor-credits"
import { CodeBlock } from "@/components/code-block"
import { Callout } from "@/components/callout"
import { LabHome } from "@/components/lab-home"
import { LabAbout } from "@/components/lab-about"
import { useEffect, useState } from "react"
import { Link, Navigate, Outlet, Route, Routes, useParams, useLocation } from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { experimentItems } from "@/experiments"
import { StructuredExperimentPage } from "@/StructuredExperimentPage"
import { structuredExperimentById } from "@/structured-experiments"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

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

function AppLayout() {
  const isHome = useLocation().pathname === "/"
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
            <Outlet />
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

function ExperimentPage() {
  const { experimentId } = useParams()
  const experiment = structuredExperimentById.get(experimentId ?? "")
  if (!experiment) return <Navigate to="/" replace />
  return <StructuredExperimentPage key={experiment.id} experiment={experiment} />
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
