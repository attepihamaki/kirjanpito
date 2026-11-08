import { isEuSaleKind } from "@/lib/domain/accounts"
import type { Category, Entry } from "@/lib/domain/types"

/**
 * The parts of the app a book can do without (§8.26). A hidden feature takes
 * its categories out of the pickers and its view or calculator off the page.
 */
export const FEATURES = [
  "employees",
  "car",
  "homeOffice",
  "euSales",
  "loans",
] as const

export type Feature = (typeof FEATURES)[number]

/** Income statement lines only one feature uses. */
const LINE_FEATURE: Readonly<Record<string, Feature>> = {
  "335": "employees",
  "336": "employees",
  "313": "car",
  "344-vehicle": "car",
  "364-car": "car",
  "loan-drawdown": "loans",
  "loan-repayment": "loans",
}

/** The feature a category belongs to, or null if every book may use it. */
export function featureOfCategory(cat: Category): Feature | null {
  if (isEuSaleKind(cat.kind)) return "euSales"
  return LINE_FEATURE[cat.line] ?? null
}

/** The home office calculator books on this category (§8.8). */
const HOME_OFFICE_CATEGORY = "354"

/**
 * Whether the book already holds something that needs the feature. Such a
 * feature stays visible whatever the user chose, so hiding can never lose
 * sight of data.
 */
export function featureInUse(
  feature: Feature,
  entries: readonly Entry[],
  cats: readonly Category[]
): boolean {
  if (feature === "homeOffice") {
    return entries.some((e) => e.catId === HOME_OFFICE_CATEGORY)
  }
  const used = new Set(entries.map((e) => e.catId))
  return cats.some((c) => featureOfCategory(c) === feature && used.has(c.id))
}

/** The features to show: every one not hidden, plus every hidden one in use. */
export function shownFeatures(
  hidden: readonly Feature[],
  entries: readonly Entry[],
  cats: readonly Category[]
): ReadonlySet<Feature> {
  const hiddenSet = new Set(hidden)
  return new Set(
    FEATURES.filter((f) => !hiddenSet.has(f) || featureInUse(f, entries, cats))
  )
}

/** Categories retired by the app itself, which no feature switch brings back. */
const RETIRED = new Set(["300-eu"])

/**
 * The categories with `enabled` set to match the hidden list. Only the
 * categories of a feature whose state changed are touched, so a category the
 * user switched off by hand stays off while its feature is untouched.
 */
export function applyHiddenFeatures(
  cats: readonly Category[],
  before: readonly Feature[],
  after: readonly Feature[]
): Category[] {
  const was = new Set(before)
  const now = new Set(after)
  return cats.map((c) => {
    const feature = featureOfCategory(c)
    if (!feature || was.has(feature) === now.has(feature)) return c
    if (RETIRED.has(c.id)) return c
    const enabled = !now.has(feature)
    return c.enabled === enabled ? c : { ...c, enabled }
  })
}
