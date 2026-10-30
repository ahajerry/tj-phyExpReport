import { useEffect, useState } from "react"
import { Check, Copy, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import "./content-blocks.css"

export type CodeBlockItem = { value: string; label: string; code: string; language?: string }
export type CodeBlockProps = {
  items: [CodeBlockItem, ...CodeBlockItem[]]
  defaultValue?: string
  label?: string
  className?: string
}

/** Tabbed plain-text code with copy feedback; no syntax-highlighting dependency. */
export function CodeBlock({ items, defaultValue, label = "代码示例", className }: CodeBlockProps) {
  const [value, setValue] = useState(defaultValue ?? items[0].value)
  const [feedback, setFeedback] = useState<{ value: string; message: string; copied: boolean } | null>(null)
  const active = items.find((item) => item.value === value) ?? items[0]
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 2000)
    return () => window.clearTimeout(timer)
  }, [feedback])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.code)
      setFeedback({ value: active.value, message: "已复制", copied: true })
    } catch {
      setFeedback({ value: active.value, message: "复制失败，请选中代码手动复制", copied: false })
    }
  }
  const copied = feedback?.value === active.value && feedback.copied
  return (
    <div className={cn("code-block", className)} role="group" aria-label={label}>
      <Tabs value={active.value} onValueChange={(next) => { setValue(String(next)); setFeedback(null) }} className="gap-0">
        <div className="code-block-toolbar">
          <span className="code-block-terminal" aria-hidden="true"><Terminal /></span>
          <div className="code-block-tab-scroll">
            <TabsList activateOnFocus aria-label={label} className="rounded-none bg-transparent p-0">
              {items.map((item) => <TabsTrigger key={item.value} value={item.value} className="code-block-tab">{item.label}</TabsTrigger>)}
            </TabsList>
          </div>
          <Button type="button" variant="ghost" size="icon" className="code-block-copy" aria-label={copied ? "已复制代码" : "复制代码"} title={copied ? "已复制" : "复制代码"} onClick={() => void copy()}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
        </div>
        {items.map((item) => <TabsContent key={item.value} value={item.value} className="min-w-0">
          <pre tabIndex={0} aria-label={`${item.label}代码`}><code data-language={item.language}>{item.code}</code></pre>
        </TabsContent>)}
      </Tabs>
      <span className={cn("code-block-feedback", feedback?.copied && "sr-only")} role="status">{feedback?.value === active.value ? feedback.message : ""}</span>
    </div>
  )
}
