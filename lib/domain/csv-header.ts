/**
 * The nine CSV columns, always in this order (§7.1).
 *
 * The file format is Finnish and stays Finnish whatever the UI language, so a
 * CSV opens directly in Finnish Excel. Everything in memory and in storage
 * uses the English field names of `Entry`; `lib/domain/csv.ts` is the only
 * module that maps between the two.
 *
 * This lives apart from `csv.ts` so it can be imported without dragging in
 * papaparse. The landing page prints the header in its CSV sample and the
 * import command names it in an error, and neither should pull a parser into
 * its bundle.
 */
export const CSV_HEADER = [
  "pvm",
  "selite",
  "tyyppi",
  "tili",
  "luokka",
  "summa",
  "alv",
  "syotto",
  "tosite",
] as const

/** The header as it appears on the first line of an exported file. */
export const CSV_HEADER_LINE = CSV_HEADER.join(";")
