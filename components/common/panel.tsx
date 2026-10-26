import { Surface } from "@/components/common/surface"
import { cn } from "@/lib/utils"

/**
 * A `Surface` with a ruled heading — the shape the VAT tables, the "other
 * sales" list, the summary grids and the settings sections all use.
 *
 * The heading is optional. A panel with no title, no actions and no
 * description is a plain bordered box, which is what the totals cards and the
 * VAT result banner are; giving them the same component keeps every card in
 * the app one radius, one border and one fill.
 *
 * A panel whose actions commit something puts them in `footer`, on a ruled,
 * tinted strip rather than loose among the fields — the shape FormBox's
 * `DataItemCard` uses. `variant="destructive"` is for the one panel whose
 * action cannot be undone: it draws the border and the footer in the
 * destructive tone so the section reads as dangerous before the button is
 * reached.
 */
export function Panel({
  title,
  description,
  actions,
  footer,
  variant = "default",
  className,
  bodyClassName,
  children,
}: {
  /** Omitted for a panel that is a bare bordered box. */
  title?: string
  /** A line under the heading saying what the panel is for. */
  description?: string
  /** Controls that sit on the heading row, e.g. a search box and filters. */
  actions?: React.ReactNode
  /** Buttons that act on the panel's contents, on a ruled footer strip. */
  footer?: React.ReactNode
  variant?: "default" | "destructive"
  className?: string
  bodyClassName?: string
  children?: React.ReactNode
}) {
  const destructive = variant === "destructive"
  const heading = title || actions || description

  return (
    <Surface as="section" tone={variant} className={className}>
      {heading ? (
        <div
          className={cn(
            "border-b px-4 py-3",
            actions && "flex flex-wrap items-center gap-2"
          )}
        >
          {title ? (
            <h2 className={cn("font-medium", actions && "mr-2")}>{title}</h2>
          ) : null}
          {actions}
          {description ? (
            <p className="mt-1 w-full text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {children ? <div className={bodyClassName}>{children}</div> : null}

      {footer ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 border-t px-4 py-3",
            destructive ? "bg-destructive/10" : "bg-muted/30"
          )}
        >
          {footer}
        </div>
      ) : null}
    </Surface>
  )
}
