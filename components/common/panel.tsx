import { cn } from "@/lib/utils"

/**
 * A bordered panel with a ruled heading — the shape the VAT tables, the
 * "other sales" list, the summary grids and the categories table all use.
 * Each of them used to repeat the same two class strings.
 */
export function Panel({
  title,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: string
  /** Controls that sit on the heading row, e.g. a search box and filters. */
  actions?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-lg border", className)}>
      <div
        className={cn(
          "border-b px-4 py-3",
          actions && "flex flex-wrap items-center gap-2"
        )}
      >
        <h2 className={cn("font-medium", actions && "mr-2")}>{title}</h2>
        {actions}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
