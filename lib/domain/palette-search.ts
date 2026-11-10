/**
 * The command palette's matching (§8.35): every word of the query has to
 * appear somewhere in the item's text, in any order and case, and a word typed
 * without the Finnish letters still finds them ("paiva" finds "päivä").
 */

function fold(text: string): string {
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
