import type { Cents, Lang } from "@/lib/domain/types"

export type TaxFormLabel = Readonly<Record<Lang, string>>

export type TaxFormRow =
  | { kind: "group"; label: TaxFormLabel }
  | {
      kind: "field"
      /** The form's code for the field: "300", or "311/312" for an unsorted amount. */
      code: string
      label: TaxFormLabel
      value: Cents
      /** The taxable or deductible portion of the field above it: indented. */
      portion: boolean
      /** A sum that checks the fields above it, with nothing to copy. */
      total: boolean
      /** A total that does not apply, such as the loss line of a profit. */
      unused: boolean
      /** What to watch for when entering this field. */
      hint?: TaxFormLabel
    }

export type TaxFormField = Extract<TaxFormRow, { kind: "field" }>

export interface TaxFormSection {
  /** The section number printed on the form, e.g. "2.1", or "" for none. */
  number: string
  title: TaxFormLabel
  rows: readonly TaxFormRow[]
}

/**
 * The form as two steps: the fields to type in (every field with an amount,
 * totals aside) and the totals to check them against.
 */
export function taxFormSteps(sections: readonly TaxFormSection[]) {
  const inputs: { row: TaxFormField; section: TaxFormSection }[] = []
  const totals: TaxFormField[] = []
  let fieldCount = 0
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.kind !== "field") continue
      fieldCount++
      if (row.total) {
        if (!row.unused) totals.push(row)
      } else if (row.value !== 0) {
        inputs.push({ row, section })
      }
    }
  }
  return { inputs, totals, fieldCount }
}
