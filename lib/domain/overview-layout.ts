/**
 * The overview's widgets and how the user has arranged them (§8.12).
 *
 * The arrangement is stored in `settings.json`, so it has to survive a file
 * written by an older or newer version of the app: `normalizeLayout` is the
 * one place that turns whatever was stored into a list of every known widget,
 * each exactly once.
 */

export const OVERVIEW_WIDGETS = [
  "result",
  "vat",
  "months",
  "sales",
  "expenses",
  "recent",
  "checks",
] as const

export type OverviewWidgetId = (typeof OVERVIEW_WIDGETS)[number]

/** One column of the three, or two of them. */
export type WidgetSize = "S" | "L"

export interface OverviewWidget {
  id: OverviewWidgetId
  size: WidgetSize
  hidden: boolean
}

/*
 * Laid out on three columns, this fills every cell: the month chart is the
 * one widget that also spans two rows when wide, beside sales and expenses.
 */
export const DEFAULT_LAYOUT: readonly OverviewWidget[] = [
  { id: "result", size: "L", hidden: false },
  { id: "vat", size: "S", hidden: false },
  { id: "months", size: "L", hidden: false },
  { id: "sales", size: "S", hidden: false },
  { id: "expenses", size: "S", hidden: false },
  { id: "recent", size: "L", hidden: false },
  { id: "checks", size: "S", hidden: false },
]

function isWidgetId(value: unknown): value is OverviewWidgetId {
  return (OVERVIEW_WIDGETS as readonly unknown[]).includes(value)
}

/**
 * Every known widget exactly once, in the stored order. An unknown id is
 * dropped, a duplicate keeps its first place, a missing widget is appended
 * at its default size, and a malformed field falls back to its default.
 */
export function normalizeLayout(stored: unknown): OverviewWidget[] {
  const out: OverviewWidget[] = []
  const seen = new Set<OverviewWidgetId>()
  if (Array.isArray(stored)) {
    for (const item of stored) {
      const id = (item as { id?: unknown } | null)?.id
      if (!isWidgetId(id) || seen.has(id)) continue
      const fallback = DEFAULT_LAYOUT.find((w) => w.id === id) as OverviewWidget
      const { size, hidden } = item as { size?: unknown; hidden?: unknown }
      out.push({
        id,
        size: size === "S" || size === "L" ? size : fallback.size,
        hidden: typeof hidden === "boolean" ? hidden : false,
      })
      seen.add(id)
    }
  }
  for (const w of DEFAULT_LAYOUT) if (!seen.has(w.id)) out.push({ ...w })
  return out
}

/** Move `id` to where `overId` is, shifting the rest along. */
export function moveWidget(
  layout: readonly OverviewWidget[],
  id: OverviewWidgetId,
  overId: OverviewWidgetId
): OverviewWidget[] {
  const from = layout.findIndex((w) => w.id === id)
  const to = layout.findIndex((w) => w.id === overId)
  if (from < 0 || to < 0 || from === to) return [...layout]
  const next = [...layout]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Move `id` one place among the visible widgets. Hidden ones are skipped, so
 * an arrow press always changes what the user sees.
 */
export function stepWidget(
  layout: readonly OverviewWidget[],
  id: OverviewWidgetId,
  dir: -1 | 1
): OverviewWidget[] {
  const visible = layout.filter((w) => !w.hidden)
  const i = visible.findIndex((w) => w.id === id)
  const other = visible[i + dir]
  return other ? moveWidget(layout, id, other.id) : [...layout]
}
