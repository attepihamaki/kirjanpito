import { receiptStem } from "@/lib/domain/receipt-path"

/**
 * A memo voucher (muistiotosite): the voucher a calculated entry rests on.
 *
 * KPL 2:5 has every entry rest on a voucher. Where no outside party issues one,
 * the trader makes it, and a correcting or transfer entry's voucher has to be
 * verified. Depreciation, the deductions on line 354 and the stock change are
 * such entries, so the calculator that books one also writes down what it
 * calculated, and the entry carries that as a PDF attachment (§8.8). It
 * travels in the ZIP like any receipt and reads without the app (KPL 2:7, 2:9).
 *
 * The strings arrive translated and formatted; this module only shapes them.
 */
export interface MemoRow {
  label: string
  value: string
  /** The result row of a calculation. */
  strong?: boolean
}

export interface MemoVoucher {
  /** "Muistiotosite". */
  title: string
  /** What was calculated, such as "Poisto 2026". Also names the file. */
  heading: string
  /** The business's name and ID, when set. */
  business?: string
  /** When the memo was made, as it is printed. */
  made: string
  entryTitle: string
  /** The entry it belongs to: date, description, account, amount. */
  entry: MemoRow[]
  calcTitle: string
  calculation: MemoRow[]
  /** The rule the calculation follows, and what else the user has to keep. */
  notes: string[]
}

/** The file name of a memo: "Muistiotosite - Poisto 2026.pdf". */
export function memoFileName(memo: Pick<MemoVoucher, "title" | "heading">) {
  return `${receiptStem(`${memo.title} - ${memo.heading}`)}.pdf`
}

/** The characters of Windows-1252 above Latin-1's control range, which WinAnsi adds. */
const CP1252_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ".split(""))

const REPLACEMENTS: Record<string, string> = {
  "\u2212": "-",
  "\u202f": " ",
  "\u2009": " ",
  "\u2007": " ",
}

/**
 * Text the PDF's standard fonts can draw. They use WinAnsi encoding, which
 * holds Finnish and the euro sign but not the minus sign or the narrow spaces
 * `Intl` writes, so those become their nearest equivalent and anything else
 * becomes "?". The PDF library throws on a character it cannot encode.
 */
export function toWinAnsi(text: string): string {
  let out = ""
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (REPLACEMENTS[ch] !== undefined) out += REPLACEMENTS[ch]
    else if (ch === "\n" || ch === "\t") out += " "
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff))
      out += ch
    else if (CP1252_EXTRAS.has(ch)) out += ch
    else out += "?"
  }
  return out
}
