import {
  COST_METHODS,
  EMPTY_INVENTORY,
  type CostMethod,
  type Inventory,
  type StockItem,
  type StockKind,
  type StockLayer,
} from "@/lib/domain/inventory"

/*
 * `inventory.json` (§7.6): a file at the root of the ZIP beside `settings.json`.
 * Reading is lenient like the invoice files. A row that cannot be read is
 * dropped and counted, and the rest is kept.
 */

export const INVENTORY_FILE_NAME = "inventory.json"

/** Version of the shape below. A reader ignores keys it does not know. */
const INVENTORY_FILE_VERSION = 1

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const YEAR = /^\d{4}$/

/** Bounds that keep a row's value far below 2^53. */
const MAX_QUANTITY_MILLI = 1_000_000_000
const MAX_UNIT_CENTS = 100_000_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : ""
}

function bounded(value: unknown, max: number): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= max
    ? value
    : null
}

function parseLayer(value: unknown): StockLayer | null {
  if (!isRecord(value)) return null
  const quantityMilli = bounded(value.quantityMilli, MAX_QUANTITY_MILLI)
  const unitCents = bounded(value.unitCents, MAX_UNIT_CENTS)
  if (
    typeof value.date !== "string" ||
    !ISO_DATE.test(value.date) ||
    quantityMilli === null ||
    unitCents === null
  )
    return null
  return { date: value.date, quantityMilli, unitCents }
}

function parseItem(value: unknown): StockItem | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "")
    return null
  const quantityMilli = bounded(value.quantityMilli, MAX_QUANTITY_MILLI)
  const unitCents = bounded(value.unitCents, MAX_UNIT_CENTS)
  if (quantityMilli === null || unitCents === null) return null
  const kind: StockKind = value.kind === "materials" ? "materials" : "goods"
  const rawLayers = Array.isArray(value.layers) ? value.layers : []
  const layers = rawLayers.map(parseLayer)
  /* A layer that cannot be read would change the cost, so the row is dropped. */
  if (layers.some((l) => l === null)) return null
  return {
    id: value.id,
    name: text(value.name, 200),
    sku: text(value.sku, 60),
    unit: text(value.unit, 20),
    kind,
    quantityMilli,
    unitCents,
    layers: (layers as StockLayer[]).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    lowerUnitCents: bounded(value.lowerUnitCents, MAX_UNIT_CENTS),
    lowerReason: text(value.lowerReason, 300),
  }
}

export interface ParsedInventory {
  inventory: Inventory
  /** How many rows were dropped. */
  skipped: number
}

export function parseInventory(source: string): ParsedInventory {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    return { inventory: { ...EMPTY_INVENTORY, years: {} }, skipped: 0 }
  }
  if (!isRecord(raw))
    return { inventory: { ...EMPTY_INVENTORY, years: {} }, skipped: 0 }
  const method: CostMethod = COST_METHODS.includes(raw.method as CostMethod)
    ? (raw.method as CostMethod)
    : EMPTY_INVENTORY.method
  const years: Record<string, StockItem[]> = {}
  let skipped = 0
  const rawYears = isRecord(raw.years) ? raw.years : {}
  for (const [year, list] of Object.entries(rawYears)) {
    if (!YEAR.test(year) || !Array.isArray(list)) continue
    const seen = new Set<string>()
    const rows: StockItem[] = []
    for (const entry of list) {
      const row = parseItem(entry)
      if (row && !seen.has(row.id)) {
        seen.add(row.id)
        rows.push(row)
      }
    }
    skipped += list.length - rows.length
    years[year] = rows
  }
  return { inventory: { method, years }, skipped }
}

/** Pretty-printed with a trailing newline, years in order and rows by name, so the same stock always gives the same text. */
export function serializeInventory(inventory: Inventory): string {
  const years = Object.fromEntries(
    Object.keys(inventory.years)
      .filter((y) => inventory.years[y].length > 0)
      .sort()
      .map((y) => [
        y,
        [...inventory.years[y]].sort(
          (a, b) =>
            a.name.localeCompare(b.name, "fi") || a.id.localeCompare(b.id)
        ),
      ])
  )
  return `${JSON.stringify({ version: INVENTORY_FILE_VERSION, method: inventory.method, years }, null, 2)}\n`
}
