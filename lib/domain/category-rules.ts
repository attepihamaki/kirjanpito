import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { parseIban } from "@/lib/domain/iban"
import { compactReference } from "@/lib/domain/invoice-reference"
import type { CategoryMap, EntryType } from "@/lib/domain/types"

/**
 * What a rule looks at (§8.17). `text` searches the counterparty, the message
 * and an invoice's rows; `iban` compares the other party's account; and
 * `reference` the start of the payment reference, which on a recurring bill
 * holds the customer number while the invoice number after it changes.
 */
export type RuleField = "text" | "iban" | "reference"

export const RULE_FIELDS: readonly RuleField[] = ["text", "iban", "reference"]

/**
 * The user's own rules for picking a category (§8.17): text that appears in a
 * counterparty, a message or an invoice, the category it belongs to and,
 * optionally, a VAT rate. The bank import and the invoice pre-fill try them
 * before anything they work out themselves.
 */
export interface CategoryRule {
  id: string
  /**
   * What to look for: text matched without regard to case or accents, an
   * IBAN in its compact form, or the start of a compact reference.
   */
  contains: string
  /** What `contains` is compared with. Absent means `text`. */
  field?: RuleField
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
function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** The shortest text a rule may look for. One letter would match everything. */
export const MIN_RULE_TEXT = 2

/** What a rule is matched against: the free text and, where known, the other party's account and the reference. */
export interface RuleSubject {
  text: string
  iban?: string | null
  reference?: string | null
}

/**
 * The rule's value in the form it is stored and compared in, or null when it
 * is not usable for its field: a text under `MIN_RULE_TEXT` letters or digits,
 * an IBAN that fails its check, or a reference under two characters.
 */
export function normalizeRuleValue(
  field: RuleField,
  value: string
): string | null {
  switch (field) {
    case "text":
      return foldText(value).length < MIN_RULE_TEXT ? null : value.trim()
    case "iban":
      return parseIban(value)
    case "reference": {
      const ref = compactReference(value)
      return ref.length < MIN_RULE_TEXT ? null : ref
    }
  }
}

/** Whether the rule fits `subject`. A bare string is free text with no account or reference. */
export function ruleMatches(
  rule: CategoryRule,
  subject: string | RuleSubject
): boolean {
  const s = typeof subject === "string" ? { text: subject } : subject
  const field = rule.field ?? "text"
  const want = normalizeRuleValue(field, rule.contains)
  if (!want) return false
  switch (field) {
    case "text":
      return foldText(s.text).includes(foldText(want))
    case "iban":
      return !!s.iban && parseIban(s.iban) === want
    case "reference":
      return !!s.reference && compactReference(s.reference).startsWith(want)
  }
}

/**
 * The first rule, in the user's order, that fits `subject` and whose
 * category can still be booked to: it exists, is enabled and, when `type` is
 * given, sits on that side. A rule that fails those tests is skipped and a
 * later one may fit. An EU purchase category is not skipped, since its
 * amount is net and the caller decides what that means (§6.9).
 */
export function findCategoryRule(
  rules: readonly CategoryRule[],
  subject: string | RuleSubject,
  cats: CategoryMap,
  type?: EntryType
): RuleHit | null {
  for (const rule of rules) {
    if (!ruleMatches(rule, subject)) continue
    const cat = cats.get(rule.catId)
    if (!cat?.enabled) continue
    const side = LINE_BY_KEY.get(cat.line)?.side
    if (!side || (type && side !== type)) continue
    return { rule, catId: cat.id, vatRate: rule.vatRate, type: side }
  }
  return null
}

/**
 * The rule the bank review offers to make from a row the user has given a
 * category (§8.17): on the other party's IBAN when the statement has one,
 * since a name is written differently from bank to bank, and otherwise on the
 * counterparty's name. Null when the row has neither.
 */
export function ruleForBankRow(
  row: { counterparty: string; iban?: string },
  catId: string
): Omit<CategoryRule, "id"> | null {
  if (row.iban && normalizeRuleValue("iban", row.iban)) {
    return { contains: row.iban, field: "iban", catId, vatRate: null }
  }
  const text = normalizeRuleValue("text", row.counterparty)
  return text ? { contains: text, catId, vatRate: null } : null
}
