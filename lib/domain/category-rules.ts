import { LINE_BY_KEY } from "@/lib/domain/accounts"
import type { CategoryMap, EntryType } from "@/lib/domain/types"

/**
 * The user's own rules for picking a category (§8.17): text that appears in a
 * counterparty, a message or an invoice, the category it belongs to and,
 * optionally, a VAT rate. The bank import and the invoice pre-fill try them
 * before anything they work out themselves.
 */
export interface CategoryRule {
  id: string
  /** Text to look for, matched without regard to case or accents. */
  contains: string
  catId: string
  /** The rate to book at, or null for the category's own default. */
  vatRate: number | null
}

export interface RuleHit {
  rule: CategoryRule
  catId: string
  vatRate: number | null
  type: EntryType
}

/** Lower case, accents removed, anything but letters and digits as one space. */
export function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** The shortest text a rule may look for. One letter would match everything. */
export const MIN_RULE_TEXT = 2

/** Whether the rule's text appears in `text`. */
export function ruleMatches(rule: CategoryRule, text: string): boolean {
  const needle = foldText(rule.contains)
  if (needle.length < MIN_RULE_TEXT) return false
  return foldText(text).includes(needle)
}

/**
 * The first rule, in the user's order, whose text appears in `text` and whose
 * category can still be booked to: it exists, is enabled and, when `type` is
 * given, sits on that side. A rule that fails those tests is skipped and a
 * later one may fit. An EU purchase category is not skipped, since its
 * amount is net and the caller decides what that means (§6.9).
 */
export function findCategoryRule(
  rules: readonly CategoryRule[],
  text: string,
  cats: CategoryMap,
  type?: EntryType
): RuleHit | null {
  for (const rule of rules) {
    if (!ruleMatches(rule, text)) continue
    const cat = cats.get(rule.catId)
    if (!cat?.enabled) continue
    const side = LINE_BY_KEY.get(cat.line)?.side
    if (!side || (type && side !== type)) continue
    return { rule, catId: cat.id, vatRate: rule.vatRate, type: side }
  }
  return null
}
