/**
 * Which columns of the ledger table are shown (§8.4).
 *
 * Date, description and gross amount are always shown: without them a row no
 * longer says what happened, when or for how much. The rest can be hidden.
 */

/** The columns the user may hide, in the order they appear in the table. */
export const OPTIONAL_LEDGER_COLUMNS = [
  "voucher",
  "type",
  "category",
  "net",
  "vat",
] as const

export type OptionalLedgerColumn = (typeof OPTIONAL_LEDGER_COLUMNS)[number]

/**
 * The hidden columns are stored, not the shown ones, so a column added later
 * is shown to everyone until they hide it.
 */
export function normalizeHiddenColumns(value: unknown): OptionalLedgerColumn[] {
  if (!Array.isArray(value)) return []
  return OPTIONAL_LEDGER_COLUMNS.filter((c) => value.includes(c))
}

/** The hidden list with one column switched on or off. */
export function toggleLedgerColumn(
  hidden: readonly OptionalLedgerColumn[],
  column: OptionalLedgerColumn,
  shown: boolean
): OptionalLedgerColumn[] {
  const rest = hidden.filter((c) => c !== column)
  return normalizeHiddenColumns(shown ? rest : [...rest, column])
}
