/**
 * The command palette's matching (§8.35): every word of the query has to
 * appear somewhere in the item's text, in any order and case, and a word typed
 * without the Finnish letters still finds them ("paiva" finds "päivä").
 */

/** Lower case without diacritics, the form every match is made in. */
export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** The words of a query, folded; empty for a query of only spaces. */
export function queryWords(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean)
}

/** Whether `text` holds every one of `words`. */
export function matchesWords(words: readonly string[], text: string): boolean {
  const hay = fold(text)
  return words.every((w) => hay.includes(w))
}

/**
 * The first `limit` items whose text holds every word, in the order given. An
 * empty query matches nothing, so a long list stays out of the way until the
 * user types.
 */
export function searchItems<T>(
  items: readonly T[],
  words: readonly string[],
  text: (item: T) => string,
  limit: number
): T[] {
  if (words.length === 0) return []
  const out: T[] = []
  for (const item of items) {
    if (matchesWords(words, text(item))) out.push(item)
    if (out.length === limit) break
  }
  return out
}

/** The shortest query, all words together, that searches receipts' text. */
const RECEIPT_QUERY_MIN = 3

/**
 * Whether a query is long enough to search receipts' text. A receipt holds
 * hundreds of words, so one or two letters would match nearly every one.
 */
export function searchesReceipts(words: readonly string[]): boolean {
  return words.join("").length >= RECEIPT_QUERY_MIN
}

/**
 * A short piece of `text` around the first of `words` in it, with "…" where
 * it was cut, so a hit found only in a receipt shows why it was found. The
 * original letters are kept when folding did not change the text's length;
 * otherwise the folded text is shown, since offsets no longer line up. Empty
 * when no word is in the text.
 */
export function snippetAround(
  text: string,
  words: readonly string[],
  radius = 32
): string {
  const folded = fold(text)
  let at = -1
  let len = 0
  for (const w of words) {
    const i = folded.indexOf(w)
    if (i >= 0 && (at < 0 || i < at)) {
      at = i
      len = w.length
    }
  }
  if (at < 0) return ""
  const source = folded.length === text.length ? text : folded
  const start = Math.max(0, at - radius)
  const end = Math.min(source.length, at + len + radius)
  const cut = source.slice(start, end).trim()
  return `${start > 0 ? "…" : ""}${cut}${end < source.length ? "…" : ""}`
}
