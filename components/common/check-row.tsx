import * as React from "react"
import { AlertCircleIcon, InfoIcon, type LucideIcon } from "lucide-react"

import type { RuleSeverity } from "@/lib/domain/rules/engine"
import { cn } from "@/lib/utils"

const SEVERITY: Record<RuleSeverity, { icon: LucideIcon; tone: string }> = {
  blocker: { icon: AlertCircleIcon, tone: "bg-expense-subtle text-expense" },
  warn: { icon: AlertCircleIcon, tone: "bg-warning/15 text-warning" },
  info: { icon: InfoIcon, tone: "bg-muted text-muted-foreground" },
}

/**
 * One finding of a rule in a checklist: a severity mark, what was found, why it
 * matters, and optionally a button that takes the user to it. The year-end
 * dialog and "Check my book" (§8.8, §8.23) both list their findings with it.
 */
export function CheckRow({
  severity,
  title,
  sub,
  action,
}: {
  severity: RuleSeverity
  title: string
  sub: string
  action?: React.ReactNode
}) {
  const { icon: Icon, tone } = SEVERITY[severity]
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 place-items-center rounded-full",
          tone
        )}
      >
        <Icon className="size-3" strokeWidth={3} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {action ?? <span />}
    </li>
  )
}
