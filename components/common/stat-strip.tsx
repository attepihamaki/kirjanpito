import { Surface } from "@/components/common/surface"
import { cn } from "@/lib/utils"

export interface Stat {
  label: string
  value: React.ReactNode
  /** A short line under the figure. */
  hint?: string
}

/**
 * A row of headline figures, each its own `Surface`: three separate answers
 * rather than one bar that reads as a row of a table (§8.4's totals cards
 * make the same choice). The figure is the largest text on the page it sits
 * on, so the eye lands there before the detail below.
 */
export function StatStrip({
  stats,
  className,
}: {
  stats: Stat[]
  /** Overrides the default column count. */
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <Surface key={stat.label} className="flex flex-col gap-1 p-4">
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p className="tabular text-xl font-semibold tracking-tight">
            {stat.value}
          </p>
          {stat.hint ? (
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          ) : null}
        </Surface>
      ))}
    </div>
  )
}
