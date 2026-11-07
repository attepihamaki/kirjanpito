import { cleanAmountText, parseAmount, roundCents } from "@/lib/domain/money"
import type { Cents } from "@/lib/domain/types"

/** Largest result accepted, in euros. Keeps cents far below 2^53. */
const MAX_EUROS = 1e9

/**
 * Evaluate what was typed in an amount field. A plain amount goes through
 * `parseAmount`, so its rules (more than two decimals refused, a lone comma
 * is a decimal comma) hold unchanged. Anything else is read as a sum with
 * `+ − * / x × ÷` and parentheses, such as `12,50*3` or `(45+30)/2`.
 *
 * The parser is hand-written, never `eval`. Numbers inside an expression take
 * one decimal separator, `,` or `.`, and any number of decimals, so a factor
 * like `1,255` works. Spaces are ignored, so `1 234,50` is one number.
 *
 * Returns null for anything that is not a finite amount: a syntax error,
 * division by zero or a result outside ±1 000 000 000 €.
 */
export function evalAmount(input: string | null | undefined): Cents | null {
  if (input == null) return null
  const plain = parseAmount(input)
  if (plain != null) return plain
  if (!isExpression(input)) return null

  const text = cleanAmountText(input)
  let pos = 0

  const peek = () => text[pos]
  const fail = (): never => {
    throw new SyntaxError("amount")
  }

  const number = (): number => {
    const m = /^\d+(?:[.,]\d+)?/.exec(text.slice(pos))
    if (!m) return fail()
    pos += m[0].length
    return parseFloat(m[0].replace(",", "."))
  }

  const factor = (): number => {
    const c = peek()
    if (c === "-") {
      pos++
      return -factor()
    }
    if (c === "+") {
      pos++
      return factor()
    }
    if (c === "(") {
      pos++
      const v = sum()
      if (peek() !== ")") fail()
      pos++
      return v
    }
    return number()
  }

  const product = (): number => {
    let v = factor()
    for (;;) {
      const c = peek()
      if (c === "*" || c === "x" || c === "X" || c === "×") {
        pos++
        v *= factor()
      } else if (c === "/" || c === "÷") {
        pos++
        const d = factor()
        if (d === 0) fail()
        v /= d
      } else return v
    }
  }

  const sum = (): number => {
    let v = product()
    for (;;) {
      const c = peek()
      if (c === "+") {
        pos++
        v += product()
      } else if (c === "-") {
        pos++
        v -= product()
      } else return v
    }
  }

  try {
    const value = sum()
    if (pos !== text.length) return null
    if (!Number.isFinite(value) || Math.abs(value) > MAX_EUROS) return null
    return roundCents(value * 100)
  } catch (e) {
    if (e instanceof SyntaxError) return null
    throw e
  }
}

/**
 * True when the text holds an operator or a bracket beyond a leading minus,
 * that is, when the field would be read as a sum rather than as one amount.
 */
export function isExpression(input: string | null | undefined): boolean {
  if (input == null) return false
  const t = cleanAmountText(input)
  return /[+*/x×÷()]/i.test(t.replace(/^-/, "")) || /\d-/.test(t)
}
