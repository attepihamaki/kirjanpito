/**
 * Read a quantity typed on an invoice row, `2`, `1,5` or `0.25`, as thousandths.
 * Up to three decimals; anything else gives null, zero included. A negative
 * quantity is read only for a credit note (`signed`), and then only a negative.
 */
export function parseQuantity(input: string, signed = false): number | null {
  const text = input.trim().replace(",", ".").replace("−", "-")
  const pattern = signed ? /^-\d+(\.\d{1,3})?$/ : /^\d+(\.\d{1,3})?$/
  if (!pattern.test(text)) return null
  const milli = Math.round(Number(text) * 1000)
  return milli !== 0 ? milli : null
}

/** A quantity in thousandths as it is typed: `1500` is "1,5" and `2000` is "2". */
export function formatQuantity(milli: number): string {
  return (milli / 1000)
    .toLocaleString("fi-FI", { maximumFractionDigits: 3, useGrouping: false })
    .replace("−", "-")
}

/**
 * Read a discount typed as a percent, `10` or `12,5` (§8.27). An empty field
 * or a zero is no discount (`undefined`); anything that is not a percent up
 * to 100, to two decimals, gives null.
 */
export function parseDiscount(input: string): number | undefined | null {
  const text = input.trim().replace(",", ".").replace(/\s*%$/, "")
  if (text === "") return undefined
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const value = Number(text)
  if (value === 0) return undefined
  return value <= 100 ? value : null
}

/** A discount as it is typed: `12.5` is "12,5". */
export function formatDiscount(value: number | undefined): string {
  return value === undefined
    ? ""
    : value.toLocaleString("fi-FI", {
        maximumFractionDigits: 2,
        useGrouping: false,
      })
}
