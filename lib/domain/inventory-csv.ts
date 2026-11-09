import Papa from "papaparse"

import type { StockItem, StockKind } from "@/lib/domain/inventory"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import type { Lang } from "@/lib/domain/types"

/**
 * The stocktake as a CSV (§8.28), for moving a list between the app and a
 * spreadsheet. It carries one line per row and no purchase layers, so a row
 * read back has a single unit cost.
 */

type Column =
  "name" | "sku" | "unit" | "kind" | "quantity" | "cost" | "lower" | "reason"

/** The header written for each language, in column order. */
const HEAD: Record<Lang, Record<Column, string>> = {
  fi: {
    name: "Nimi",
    sku: "Koodi",
    unit: "Yksikkö",
    kind: "Tyyppi",
    quantity: "Määrä",
    cost: "Yksikköhinta",
    lower: "Alempi arvo",
    reason: "Alemman arvon syy",
  },
  en: {
    name: "Name",
    sku: "Code",
    unit: "Unit",
    kind: "Type",
    quantity: "Quantity",
    cost: "Unit cost",
    lower: "Lower value",
    reason: "Lower value reason",
  },
}

const COLUMNS: readonly Column[] = [
  "name",
  "sku",
  "unit",
  "kind",
  "quantity",
  "cost",
  "lower",
  "reason",
]

/** Headers read as each column, lowercase. Both languages and a few common names. */
const ALIASES: Record<Column, readonly string[]> = {
  name: ["nimi", "name", "tuote", "product", "item", "nimike"],
  sku: ["koodi", "code", "sku", "tuotekoodi", "artikkelinumero"],
  unit: ["yksikkö", "yksikko", "unit"],
  kind: ["tyyppi", "type", "laji"],
  quantity: ["määrä", "maara", "quantity", "qty", "kpl", "lukumäärä"],
  cost: [
    "yksikköhinta",
    "yksikkohinta",
    "unit cost",
    "unit price",
    "hankintahinta",
    "cost",
  ],
  lower: ["alempi arvo", "lower value", "alempi yksikköarvo"],
  reason: ["alemman arvon syy", "lower value reason", "syy", "reason"],
}

const KIND_WORDS: Record<Lang, Record<StockKind, string>> = {
  fi: { goods: "tavara", materials: "aine" },
  en: { goods: "goods", materials: "materials" },
}

/** Up to three decimals: "12", "12,5", "0.125". Null for anything else. */
export function parseQuantity(input: string | null | undefined): number | null {
  if (input == null) return null
  const t = input.replace(/[\s  ]/g, "").replace(",", ".")
  if (!/^\d*\.?\d+$/.test(t) || /\.\d{4,}$/.test(t)) return null
  const milli = Math.round(parseFloat(t) * 1000)
  return milli <= 1_000_000_000 ? milli : null
}

export function formatQuantity(milli: number, lang: Lang): string {
  const text = String(milli / 1000)
  return lang === "fi" ? text.replace(".", ",") : text
}

function formatCost(cents: number, lang: Lang): string {
  const text = formatMoneyPlain(cents)
  return lang === "fi" ? text : text.replace(",", ".")
}

export type StockCsvRow = Omit<StockItem, "id" | "layers">

export type StockCsvResult =
  | { ok: true; rows: StockCsvRow[]; skipped: number }
  | { ok: false; reason: "empty" | "no-columns" }

function kindOf(text: string): StockKind {
  const t = text.trim().toLowerCase()
  return KIND_WORDS.fi.materials === t ||
    KIND_WORDS.en.materials === t ||
    t === "materials" ||
    t === "aineet" ||
    t === "tarvike"
    ? "materials"
    : "goods"
}

export function parseStockCsv(source: string): StockCsvResult {
  const body = source.replace(/^﻿/, "")
  const parsed = Papa.parse<string[]>(body, {
    header: false,
    skipEmptyLines: "greedy",
  })
  const table = parsed.data
  if (table.length === 0) return { ok: false, reason: "empty" }

  const heads = table[0].map((h) => h.trim().toLowerCase())
  const at = (column: Column) =>
    heads.findIndex((h) => ALIASES[column].includes(h))
  const index = Object.fromEntries(COLUMNS.map((c) => [c, at(c)])) as Record<
    Column,
    number
  >
  /* A list needs something to tell rows apart and a count to value. */
  if (index.name < 0 || index.quantity < 0)
    return { ok: false, reason: "no-columns" }

  const cell = (row: string[], column: Column) =>
    index[column] >= 0 ? (row[index[column]] ?? "").trim() : ""

  const rows: StockCsvRow[] = []
  let skipped = 0
  for (const row of table.slice(1)) {
    const name = cell(row, "name")
    const quantityMilli = parseQuantity(cell(row, "quantity"))
    const costText = cell(row, "cost")
    const unitCents = costText === "" ? 0 : parseAmount(costText)
    const lowerText = cell(row, "lower")
    const lower = lowerText === "" ? null : parseAmount(lowerText)
    if (
      name === "" ||
      quantityMilli === null ||
      unitCents === null ||
      unitCents < 0 ||
      (lowerText !== "" && (lower === null || lower < 0))
    ) {
      skipped += 1
      continue
    }
    rows.push({
      name: name.slice(0, 200),
      sku: cell(row, "sku").slice(0, 60),
      unit: cell(row, "unit").slice(0, 20),
      kind: kindOf(cell(row, "kind")),
      quantityMilli,
      unitCents,
      lowerUnitCents: lower,
      lowerReason: cell(row, "reason").slice(0, 300),
    })
  }
  return { ok: true, rows, skipped }
}

/** Semicolon-separated with a byte order mark, so Excel reads the Finnish letters. */
export function serializeStockCsv(
  items: readonly StockItem[],
  lang: Lang
): string {
  const head = COLUMNS.map((c) => HEAD[lang][c])
  const lines = items.map((i) => [
    i.name,
    i.sku,
    i.unit,
    KIND_WORDS[lang][i.kind],
    formatQuantity(i.quantityMilli, lang),
    formatCost(i.unitCents, lang),
    i.lowerUnitCents === null ? "" : formatCost(i.lowerUnitCents, lang),
    i.lowerReason,
  ])
  return `﻿${Papa.unparse([head, ...lines], { delimiter: ";", newline: "\r\n" })}\r\n`
}
