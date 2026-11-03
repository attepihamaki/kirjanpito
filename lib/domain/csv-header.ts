/**
 * The CSV columns, always in this order (§7.1). `voucher` leads, as the
 * voucher number does on a printed journal (§4). `settles` is filled only on a
 * VAT payment or refund (§6.6), and `paid` only on an entry not paid on its
 * date (§6.3).
 *
 * The column names are English whatever the UI language. The rows keep Finnish
 * values (`tulo`, `brutto`, category names) and decimal commas for Finnish
 * Excel, and `lib/domain/csv.ts` is the only module that maps them to `Entry`.
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
] as const

/** The header as it appears on the first line of an exported file. */
export const CSV_HEADER_LINE = CSV_HEADER.join(";")
