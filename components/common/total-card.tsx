import { Panel } from "@/components/common/panel"
import { cn } from "@/lib/utils"

/**
 * A bare panel with a small label over one large figure: the totals cards
 * above a table. `compact` tightens it under 640 px, for cards that share one
 * row of a phone's screen.
 */
export function TotalCard({
  label,
  compact,
  children,
}: {
  label: string
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <Panel
      bodyClassName={cn(
        "flex flex-col gap-0.5 px-4 py-3",
        compact && "max-sm:px-3 max-sm:py-2"
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-medium", compact && "max-sm:text-sm")}>
        {children}
      </span>
    </Panel>
  )
}
