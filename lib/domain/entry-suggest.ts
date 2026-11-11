import { calcEntry } from "@/lib/domain/calc"
import {
  findCategoryRule,
  type CategoryRule,
} from "@/lib/domain/category-rules"
import type { Customer } from "@/lib/domain/invoice"
import { partyDefaults } from "@/lib/domain/parties"
import { registerParty, suggestFromHistory } from "@/lib/domain/bank-match"
import type { CategoryMap, Cents, Entry, EntryType } from "@/lib/domain/types"

/*
 * What the entry dialog learns from the book (§8.5): earlier descriptions to
 * pick from while typing, and the category, rate and counterparty a
 * description has been booked with. Nothing is stored; the entries are the
 * memory, so a corrected entry corrects the suggestion too.
 */

export interface SuggestContext {
  entries: readonly Entry[]
  cats: CategoryMap
  rules?: readonly CategoryRule[]
  parties?: readonly Customer[]
}

export interface DescriptionSuggestion {
  /** The description as the newest entry wrote it. */
  description: string
  catId: string
  vatRate: number
  /** The register entry the newest entry named, when it still exists. */
  party?: string
  /** The newest entry's gross amount, shown beside the suggestion. */
  gross: Cents
  /** How many entries on this side carry the description. */
  uses: number
  lastDate: string
}

export type SuggestionSource = "rule" | "history" | "party"

export interface CategorySuggestion {
  catId: string
  /** Null when the rule leaves the rate to the category's default. */
  vatRate: number | null
  party?: string
  source: SuggestionSource
}

/** The most suggestions listed under the description field. */
const MAX_DESCRIPTION_SUGGESTIONS = 6

/**
 * Two descriptions are the same when they differ only in case, spacing and
 * numbers, so "Puhelinliittymä, 01/2026" and "Puhelinliittymä, 02/2026" are one
 * description booked twice, and "Lasku 1006" and "Lasku 1007" are too.
 */
export function descriptionKey(text: string): string {
  return text
    .trim()
    .toLocaleLowerCase("fi")
    .replace(/\s+/g, " ")
    .replace(/\d+/g, "#")
}

/** The words of a text that a suggestion is found by. Numbers are left out, as above. */
function words(text: string): string[] {
  return descriptionKey(text)
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
}

/*
 * The earlier entries on this side, grouped by description. An entry whose
 * category is gone or switched off is left out: the dialog could not offer
 * its category, and the user has said they do not book to a disabled one.
 */
function descriptionGroups(
  type: EntryType,
  ctx: SuggestContext
): Map<string, DescriptionSuggestion> {
  const partyIds = new Set((ctx.parties ?? []).map((p) => p.id))
  const groups = new Map<string, DescriptionSuggestion>()
  for (const e of ctx.entries) {
    if (e.type !== type || e.settles || !e.description.trim()) continue
    if (!ctx.cats.get(e.catId)?.enabled) continue
    const key = descriptionKey(e.description)
    const known = groups.get(key)
    if (known && known.lastDate > e.date) {
      known.uses++
      continue
    }
    groups.set(key, {
      description: e.description.trim(),
      catId: e.catId,
      vatRate: e.vatRate,
      ...(e.party && partyIds.has(e.party) ? { party: e.party } : {}),
      gross: calcEntry(e).gross,
      uses: (known?.uses ?? 0) + 1,
      lastDate: e.date,
    })
  }
  return groups
}

/**
 * Earlier descriptions that fit what is typed: every word typed starts a word
 * of the description. One that starts with the whole text comes first, then
 * the most used, then the newest. The text itself is not suggested back.
 */
export function descriptionSuggestions(
  query: string,
  type: EntryType,
  ctx: SuggestContext,
  limit = MAX_DESCRIPTION_SUGGESTIONS
): DescriptionSuggestion[] {
  const typed = words(query)
  const key = descriptionKey(query)
  if (typed.join("").length < 2) return []
  const hits: { s: DescriptionSuggestion; starts: boolean }[] = []
  for (const [k, s] of descriptionGroups(type, ctx)) {
    if (k === key) continue
    const have = words(k)
    if (!typed.every((w) => have.some((h) => h.startsWith(w)))) continue
    hits.push({ s, starts: k.startsWith(key) })
  }
  hits.sort(
    (a, b) =>
      Number(b.starts) - Number(a.starts) ||
      b.s.uses - a.s.uses ||
      b.s.lastDate.localeCompare(a.s.lastDate)
  )
  return hits.slice(0, limit).map((h) => h.s)
}

/**
 * The category a description should be booked to, in the order the bank
 * import trusts them (§8.16): the user's own rules, the same description
 * booked before, a register entry the text names, and an earlier entry whose
 * description contains the text.
 */
export function suggestCategoryFor(
  description: string,
  type: EntryType,
  ctx: SuggestContext
): CategorySuggestion | null {
  const text = description.trim()
  if (!text) return null

  const hit = findCategoryRule(ctx.rules ?? [], text, ctx.cats, type)
  if (hit) return { catId: hit.catId, vatRate: hit.vatRate, source: "rule" }

  const same = descriptionGroups(type, ctx).get(descriptionKey(text))
  if (same) {
    return {
      catId: same.catId,
      vatRate: same.vatRate,
      ...(same.party ? { party: same.party } : {}),
      source: "history",
    }
  }

  const party = registerParty(text, type, ctx)
  const defaults = party && partyDefaults(party, type, ctx.cats)
  if (party && defaults)
    return { ...defaults, party: party.id, source: "party" }

  const earlier = suggestFromHistory(text, type, ctx)
  if (earlier && ctx.cats.get(earlier.catId)?.enabled)
    return { ...earlier, source: "history" }
  return null
}
