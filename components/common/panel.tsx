import { HelpHint } from "@/components/common/help-hint"
import { Surface } from "@/components/common/surface"
import type { HelpTopic } from "@/lib/domain/field-help"
import { cn } from "@/lib/utils"

/**
 * Classes for a grid of panels that should share rows (header, body, footer).
 * Each panel spans three of the parent's rows and inherits them as a subgrid.
 *
 * The grid has no row gap, and the space between rows of panels is a bottom
 * margin on each panel, cancelled at the end by the grid's own negative margin.
 * A subgrid whose gap differs from its parent's has the difference added
 * inside its edges, which would leave a strip under a panel's last row. Give
 * the grid `gap-x-*` for the columns.
 */
export const PANEL_ROWS =
  "gap-y-0 -mb-6 [&>section]:row-span-3 [&>section]:mb-6 [&>section]:grid-rows-subgrid [&>section]:gap-y-0"

/**
 * A `Surface` with a ruled heading — the shape the VAT tables, the "other
 * sales" list, the summary grids and the settings sections all use.
 *
 * The heading is optional. A panel with no title, no actions and no
 * description is a plain bordered box, which is what the totals cards and the
 * VAT result banner are; giving them the same component keeps every card in
 * the app one radius, one border and one fill.
 *
 * Header, body and footer sit on rows 1 to 3 of the panel's own grid, so a
 * parent can pass `PANEL_ROWS` to put panels side by side on shared rows: their
 * headings, bodies and footers then line up whatever the text length.
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
  help,
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
  /** An explanation of the panel, shown as an info icon beside the title. */
  help?: HelpTopic | null
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
    <Surface
      as="section"
      tone={variant}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr_auto]",
        className
      )}
    >
      {heading ? (
        <div
          className={cn(
            "row-start-1 border-b px-4 py-3",
            actions && "flex flex-wrap items-center gap-2"
          )}
        >
          {title ? (
            <h2
              className={cn(
                "font-medium",
                actions && "mr-2",
                help && "flex items-center gap-1"
              )}
            >
              {title}
              <HelpHint topic={help} />
            </h2>
          ) : null}
          {actions}
          {description ? (
            <p className="mt-1 w-full text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <div className={cn("row-start-2", bodyClassName)}>{children}</div>
      ) : null}

      {footer ? (
        <div
          className={cn(
            "row-start-3 flex flex-wrap items-center gap-2 border-t px-4 py-3",
            destructive ? "bg-destructive/10" : "bg-muted/30"
          )}
        >
          {footer}
        </div>
      ) : null}
    </Surface>
  )
}
