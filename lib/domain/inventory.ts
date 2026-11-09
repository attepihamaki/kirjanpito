import { yearOf } from "@/lib/domain/dates"
import type { Cents, Entry } from "@/lib/domain/types"

/**
 * Stocktake and valuation of the stock at the end of a year (§8.28). The totals
 * are what Form 5 asks for on 708 (goods) and 709 (materials, supplies and
 * self-made products).
 *
 * Quantities are integer thousandths and unit costs integer cents, like the
 * invoice rows, so a row's value is `round(quantityMilli × unitCents / 1000)`.
 */

export type StockKind = "goods" | "materials"

/** How the cost of the units still in stock is worked out (§6.13). */
export type CostMethod = "average" | "fifo"

export const COST_METHODS: readonly CostMethod[] = ["average", "fifo"]

/** One purchase the stock is drawn from. */
export interface StockLayer {
  /** ISO date of the purchase. */
  date: string
  quantityMilli: number
  unitCents: Cents
}

export interface StockItem {
  id: string
  name: string
  /** The trader's own code, shown and exported, never used to match. */
  sku: string
  /** "kpl", "kg", "m"… free text. */
  unit: string
  kind: StockKind
  /** The quantity counted on 31.12. */
  quantityMilli: number
  /** The cost of one unit, used for units no purchase layer covers. */
  unitCents: Cents
  /**
   * The purchases the stock came from, oldest first. With none, `unitCents`
   * is the cost of every unit and both methods give the same figure.
   */
  layers: StockLayer[]
  /**
   * The probable sale or replacement price of one unit, when it is below cost.
   * Null means no lower value is claimed.
   */
  lowerUnitCents: Cents | null
  /** Why the lower value applies. A lower value needs one. */
  lowerReason: string
}

/** The whole stocktake record of a book (§7.6, `inventory.json`). */
export interface Inventory {
  method: CostMethod
  /** Year → the rows counted on 31.12. of that year. */
  years: Record<string, StockItem[]>
}

export const EMPTY_INVENTORY: Inventory = { method: "average", years: {} }

/** Whether the book holds anything worth writing to `inventory.json`. */
export function hasInventory(inventory: Inventory): boolean {
  return Object.values(inventory.years).some((rows) => rows.length > 0)
}

/**
 * The stocktakes of the years `entries` fall in. A year archive or an audit
 * package holds only some years, and carries only the counts that belong with
 * them (§8.28).
 */
export function inventoryOfEntries(
  entries: readonly Pick<Entry, "date">[],
  inventory: Inventory
): Inventory {
  const years = new Set(entries.map((e) => String(yearOf(e.date))))
  return {
    method: inventory.method,
    years: Object.fromEntries(
      Object.entries(inventory.years).filter(([y]) => years.has(y))
    ),
  }
}

/** What a row is worth, and how that figure came about. */
export interface StockValue {
  /** Cost of the counted units under the book's method. */
  cost: Cents
  /** Cost minus the lower value, zero when no lower value applies. */
  writeDown: Cents
  /** What goes in the balance: `cost − writeDown`. */
  value: Cents
}

export interface InventoryTotals {
  /** Rows counted. */
  rows: number
  cost: Cents
  writeDown: Cents
  /** 708. */
  goods: Cents
  /** 709. */
  materials: Cents
  /** 708 + 709. */
  value: Cents
}

/** `quantityMilli × unitCents / 1000`, rounded to whole cents. */
export function lineValue(quantityMilli: number, unitCents: Cents): Cents {
  return Math.round((quantityMilli * unitCents) / 1000)
}

/**
 * The cost of the counted units.
 *
 * FIFO takes the units from the newest purchases backwards, because the oldest
 * were sold first. Weighted average prices every unit at the mean of all the
 * layers. Units beyond what the layers cover cost `unitCents` under both.
 */
export function itemCost(item: StockItem, method: CostMethod): Cents {
  const { quantityMilli: counted, unitCents, layers } = item
  if (counted <= 0) return 0
  if (layers.length === 0) return lineValue(counted, unitCents)

  if (method === "average") {
    let quantity = 0
    let total = 0
    for (const l of layers) {
      quantity += l.quantityMilli
      total += l.quantityMilli * l.unitCents
    }
    if (quantity <= 0) return lineValue(counted, unitCents)
    const covered = Math.min(counted, quantity)
    const rest = counted - covered
    return (
      Math.round((covered * total) / quantity / 1000) +
      lineValue(rest, unitCents)
    )
  }

  let left = counted
  let cost = 0
  for (let i = layers.length - 1; i >= 0 && left > 0; i--) {
    const take = Math.min(left, layers[i].quantityMilli)
    cost += take * layers[i].unitCents
    left -= take
  }
  return Math.round(cost / 1000) + lineValue(left, unitCents)
}

export function itemValue(item: StockItem, method: CostMethod): StockValue {
  const cost = itemCost(item, method)
  if (item.lowerUnitCents === null || item.quantityMilli <= 0) {
    return { cost, writeDown: 0, value: cost }
  }
  const lower = lineValue(item.quantityMilli, item.lowerUnitCents)
  const writeDown = Math.max(0, cost - lower)
  return { cost, writeDown, value: cost - writeDown }
}

export function inventoryTotals(
  items: readonly StockItem[],
  method: CostMethod
): InventoryTotals {
  const totals: InventoryTotals = {
    rows: 0,
    cost: 0,
    writeDown: 0,
    goods: 0,
    materials: 0,
    value: 0,
  }
  for (const item of items) {
    if (item.quantityMilli <= 0) continue
    const v = itemValue(item, method)
    totals.rows += 1
    totals.cost += v.cost
    totals.writeDown += v.writeDown
    totals.value += v.value
    if (item.kind === "goods") totals.goods += v.value
    else totals.materials += v.value
  }
  return totals
}

/**
 * Next year's starting list: the rows still in stock, with the layers cut down
 * to the units left so the cost keeps following the method. The lower value is
 * dropped, since it is a judgement about one year-end.
 */
export function carryOver(
  items: readonly StockItem[],
  method: CostMethod,
  newId: () => string
): StockItem[] {
  const carried: StockItem[] = []
  for (const item of items) {
    if (item.quantityMilli <= 0) continue
    const kept: StockLayer[] = []
    let left = item.quantityMilli
    for (let i = item.layers.length - 1; i >= 0 && left > 0; i--) {
      const take = Math.min(left, item.layers[i].quantityMilli)
      kept.unshift({ ...item.layers[i], quantityMilli: take })
      left -= take
    }
    /*
     * Average cost folds the layers into one unit cost, since the units are
     * interchangeable from here on. FIFO keeps them, as the order matters.
     */
    const cost = itemCost(item, method)
    const unitCents =
      method === "average" && item.layers.length > 0
        ? Math.round((cost * 1000) / item.quantityMilli)
        : item.unitCents
    carried.push({
      ...item,
      id: newId(),
      unitCents,
      layers: method === "average" ? [] : kept,
      lowerUnitCents: null,
      lowerReason: "",
    })
  }
  return carried
}

/** Rows that need the trader's attention before the list can be relied on. */
export type StockProblem = "no-name" | "no-cost" | "lower-without-reason"

export function stockProblems(item: StockItem): StockProblem[] {
  const found: StockProblem[] = []
  if (item.name.trim() === "") found.push("no-name")
  if (
    item.quantityMilli > 0 &&
    item.unitCents === 0 &&
    item.layers.length === 0
  )
    found.push("no-cost")
  if (item.lowerUnitCents !== null && item.lowerReason.trim() === "")
    found.push("lower-without-reason")
  return found
}
