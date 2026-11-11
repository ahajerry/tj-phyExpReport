import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { useLocation } from "react-router"
import { experimentItems } from "@/experiments"
import { materialIndicators } from "@/material-indicators"
import { LabAbout } from "@/components/lab-about"
import { LabCourseGuide } from "@/components/lab-course-guide"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function CopyIndicators({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "failed">("idle")
  useEffect(() => {
    if (status !== "copied") return
    const timer = window.setTimeout(() => setStatus("idle"), 2000)
    return () => window.clearTimeout(timer)
  }, [status])
  const copy = async () => {
    setStatus("pending")
    try {
      await navigator.clipboard.writeText(text)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={!text || status === "pending"}
        aria-label={`复制${title}三级指标`} title={text ? "每行一个指标，不含类别与编号" : "暂无资料可复制"}
        onClick={() => void copy()}>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {status === "copied" ? "已复制" : status === "pending" ? "复制中…" : "复制"}
      </Button>
      <span role="status" className="text-xs font-normal text-muted-foreground">
        {status === "failed" ? "复制失败，请检查浏览器剪贴板权限后重试。" : status === "copied" ? "已复制到剪贴板" : ""}
      </span>
    </div>
  )
}

export function LabMaterials() {
  const { hash, key } = useLocation()
  useEffect(() => {
    const heading = hash.startsWith("#materials-") ? document.getElementById(hash.slice(1)) : null
    if (!heading?.classList.contains("materials-heading")) {
      window.scrollTo(0, 0)
      return
    }
    heading.scrollIntoView({ block: "start" })
    heading.focus({ preventScroll: true })
  }, [hash, key])
  return (
    <LabAbout>
      <h1>资料</h1>
      <LabCourseGuide />
      <h2 id="materials-indicators" tabIndex={-1} className="materials-heading">各实验三级指标</h2>
      {experimentItems.map((experiment) => {
        const indicators = materialIndicators[experiment.id]
        return (
          <section key={experiment.id} aria-labelledby={`materials-${experiment.id}`}>
            <h3 id={`materials-${experiment.id}`} tabIndex={-1} className="materials-heading">{experiment.title}</h3>
            <div className="mb-4">
              <CopyIndicators title={experiment.title} text={indicators?.map((item) => item.indicator).join("\n") ?? ""} />
            </div>
            {indicators && (
              <Table className="table-fixed" aria-label={`${experiment.title}三级指标`}>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70">
                    <TableHead scope="col" className="px-3">指标</TableHead>
                    <TableHead scope="col" className="w-28 px-3 sm:w-40">类别</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicators.map((item, index) => (
                    <TableRow key={`${experiment.id}-${index}`}>
                      <TableCell className="whitespace-normal break-words px-3 py-3 align-top leading-6">{item.indicator}</TableCell>
                      <TableCell className="whitespace-normal px-3 py-3 align-top text-xs leading-6 text-muted-foreground sm:text-sm">{item.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        )
      })}
    </LabAbout>
  )
}
