import type { Lang } from "@/lib/domain/types"

/**
 * The CSV columns, always in this order (§7.1). `voucher` leads, as the
 * voucher number does on a printed journal (§4). `settles` is filled only on a
 * VAT payment or refund (§6.6), and `paid` only on an entry not paid on its
 * date (§6.3). `buyer_vat` is the buyer's VAT number on an EU sale (§8.7), and
 * `eu_purchase` says what an EU purchase bought (§6.9).
 *
 * These names are the canonical ones the parser works in. What a file is
 * written with is `csvHeaderLine`, which follows the book's export language;
 * `columnName` maps either language's spelling back to the names here.
 *
 * This lives apart from `csv.ts` so it can be imported without dragging in
 * papaparse. The landing page prints the header in its CSV sample and the
 * import command names it in an error, and neither should pull a parser into
 * its bundle.
 */
export const CSV_HEADER = [
  "voucher",
  "date",
  "description",
  "type",
  "account",
  "category",
  "amount",
  "vat",
  "mode",
  "receipts",
  "settles",
  "paid",
  "buyer_vat",
  "eu_purchase",
] as const

export type CsvColumn = (typeof CSV_HEADER)[number]

/**
 * The label each column is written under in a Finnish file. In an English
 * file the label is the canonical name itself.
 *
 * This module is the only place a Finnish column name is spelled.
 */
const FINNISH_LABELS: Readonly<Record<CsvColumn, string>> = {
  voucher: "tositenro",
  date: "päivämäärä",
  description: "selite",
  type: "tyyppi",
  account: "tili",
  category: "luokka",
  amount: "summa",
  vat: "alv",
  mode: "verollisuus",
  receipts: "liitteet",
  settles: "verokausi",
  paid: "maksettu",
  buyer_vat: "ostajan_alv",
  eu_purchase: "eu_osto",
}

/** The label a column is written under, for a header or an error message. */
export function csvColumnLabel(column: CsvColumn, lang: Lang): string {
  return lang === "en" ? column : FINNISH_LABELS[column]
}

const HEADER_LINES: Readonly<Record<Lang, string>> = {
  fi: CSV_HEADER.map((c) => FINNISH_LABELS[c]).join(";"),
  en: CSV_HEADER.join(";"),
}

/** The first line of an exported file, in the book's export language. */
export function csvHeaderLine(lang: Lang): string {
  return HEADER_LINES[lang]
}

/*
 * Derived from the labels rather than listed by hand, so what the app writes
 * is always what the app reads.
 */
const ALIASES: ReadonlyMap<string, CsvColumn> = new Map(
  (Object.entries(FINNISH_LABELS) as ReadonlyArray<[CsvColumn, string]>).map(
    ([column, label]) => [label, column]
  )
)

/** The column a header cell names, ignoring case and either language. */
export function columnName(cell: string): string {
  const name = cell.trim().toLowerCase()
  return ALIASES.get(name) ?? name
}
