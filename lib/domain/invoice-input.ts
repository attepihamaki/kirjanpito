/**
 * Read a quantity typed on an invoice row, `2`, `1,5` or `0.25`, as thousandths.
 * Up to three decimals; anything else, zero and negatives included, gives null.
 */
export function parseQuantity(input: string): number | null {
  const text = input.trim().replace(",", ".")
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return null
  const milli = Math.round(Number(text) * 1000)
  return milli > 0 ? milli : null
}

/** A quantity in thousandths as it is typed: `1500` is "1,5" and `2000` is "2". */
export function formatQuantity(milli: number): string {
  return (milli / 1000).toLocaleString("fi-FI", {
    maximumFractionDigits: 3,
    useGrouping: false,
  })
}
