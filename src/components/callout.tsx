import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import "./content-blocks.css"

export type CalloutColor = "neutral" | "emerald" | "blue" | "amber" | "rose"

export type CalloutProps = Omit<ComponentProps<typeof Alert>, "title" | "color"> & {
  color?: CalloutColor
  title?: ReactNode
}

/** Static document note. Use role="alert" explicitly for urgent live errors. */
export function Callout({ title, children, className, color = "neutral", role = "note", ...props }: CalloutProps) {
  return <Alert {...props} data-color={color} role={role} className={cn("callout", className)}>
    <AlertDescription>
      <div>{title && <strong className="callout-title">{title} </strong>}{children}</div>
    </AlertDescription>
  </Alert>
}
