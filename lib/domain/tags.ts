import { LINE_BY_KEY, offStatement } from "@/lib/domain/accounts"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import type { Cents, CategoryMap, Entry } from "@/lib/domain/types"

/**
 * Tags (tunnisteet) on entries and invoices (§8.37): free labels such as a
 * project, a job or a fair, several per voucher. They report nothing on the
 * VAT return or the income statement; the tag report and the ledger filter
 * read them.
 */

/** The longest a tag may be. */
export const TAG_MAX_LENGTH = 40

/** The most tags one voucher keeps. */
export const TAGS_MAX = 10

/** A tag as it is kept: inner whitespace collapsed, no `|`, cut to the limit. */
function cleanTag(text: string): string {
  return text
    .replace(/[|\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TAG_MAX_LENGTH)
    .trim()
}

/**
 * Tags as kept on a voucher: cleaned, empty ones dropped, and each tag once,
 * whatever its case. The first spelling wins, and the order is the user's.
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = cleanTag(raw)
    const key = tagKey(tag)
    if (!tag || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length === TAGS_MAX) break
  }
  return out
}

/** The key two spellings of one tag share: "Projekti A" and "projekti a". */
export function tagKey(tag: string): string {
  return tag.toLocaleLowerCase("fi-FI")
}

/** `{ tags }` when there are any, or nothing: an optional field is left out empty. */
export function tagsField(tags: readonly string[] | undefined): {
  tags?: string[]
} {
  const list = normalizeTags(tags ?? [])
  return list.length ? { tags: list } : {}
}

/** Tags typed as text, separated by commas: "Projekti A, messut". */
export function parseTagsInput(text: string): string[] {
  return normalizeTags(text.split(","))
}

/** The `tags` cell of the CSV (§7.1): tags separated by `|`. */
export function parseTagsCell(cell: string): string[] {
  return normalizeTags(cell.split("|"))
}

export function formatTagsCell(tags: readonly string[] | undefined): string {
  return (tags ?? []).join("|")
}

export function hasTag(e: { tags?: readonly string[] }, tag: string): boolean {
  const key = tagKey(tag)
  return (e.tags ?? []).some((t) => tagKey(t) === key)
}

/**
 * Every tag in use, each once in its most common spelling, by how many
 * vouchers carry it and then by name, for suggestions and the filter.
 */
export function allTags(
  sources: ReadonlyArray<{ tags?: readonly string[] }>
): string[] {
  const counts = new Map<
    string,
    { count: number; spellings: Map<string, number> }
  >()
  for (const s of sources) {
    for (const tag of s.tags ?? []) {
      const key = tagKey(tag)
      const slot = counts.get(key) ?? { count: 0, spellings: new Map() }
      slot.count++
      slot.spellings.set(tag, (slot.spellings.get(tag) ?? 0) + 1)
      counts.set(key, slot)
    }
  }
  const named = [...counts.values()].map((slot) => {
    const [name] = [...slot.spellings].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fi")
    )[0]
    return { name, count: slot.count }
  })
  return named
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fi"))
    .map((t) => t.name)
}

/** One tag's line on the tag report. */
export interface TagTotals {
  tag: string
  /** Income without VAT. */
  income: Cents
  /** Expenses without VAT, the business share only. */
  expenses: Cents
  result: Cents
  count: number
}

/**
 * Income, expenses and the result per tag for one year (§8.37), net of VAT
 * and the private share, as Yhteenveto counts them. A fixed asset or a VAT
 * settlement counts on neither side (§5). An entry with two tags counts under
 * both, so the lines need not add up to the year. Largest result first.
 */
export function tagReport(
  entries: readonly Entry[],
  cats: CategoryMap,
  year: number
): TagTotals[] {
  const tagged = entries.filter(
    (e) => e.tags?.length && yearOf(e.date) === year
  )
  const byKey = new Map<string, TagTotals>()
  for (const name of allTags(tagged)) {
    byKey.set(tagKey(name), {
      tag: name,
      income: 0,
      expenses: 0,
      result: 0,
      count: 0,
    })
  }
  for (const e of tagged) {
    const cat = cats.get(e.catId)
    if (cat && offStatement(LINE_BY_KEY.get(cat.line))) continue
    const { net } = calcEntry(e)
    for (const tag of e.tags ?? []) {
      const line = byKey.get(tagKey(tag))
      if (!line) continue
      if (e.type === "income") line.income += net
      else line.expenses += net
      line.count++
    }
  }
  return [...byKey.values()]
    .filter((l) => l.count > 0)
    .map((l) => ({ ...l, result: l.income - l.expenses }))
    .sort((a, b) => b.result - a.result || a.tag.localeCompare(b.tag, "fi"))
}

/** `{ tags }` read from a JSON file, where anything but an array of strings is no tags. */
export function readTags(value: unknown): { tags?: string[] } {
  if (!Array.isArray(value)) return {}
  return tagsField(value.filter((t): t is string => typeof t === "string"))
}
