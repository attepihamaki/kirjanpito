import type { VatPeriodOverLimit, VatThreshold } from "@/lib/domain/vat-threshold"
import { vatThresholdIn } from "@/lib/domain/vat-threshold"
import type { Formatters } from "@/lib/i18n/create-formatters"

/**
 * The wording of the limit rules (KPL 1:1a, 1:4b, AVL 3 §), shared by the
 * overview's checklist and "Check my book" (§8.12, §8.23). `key` is what the
 * two staff and over rules of one limit have in common.
 */
export const BOOK_LIMIT_TEXT = {
  singleEntryOver: {
    key: "singleEntryLimit",
    title: "overview.singleEntryLimit",
    sub: "overview.singleEntryLimitOver",
  },
  singleEntryStaff: {
    key: "singleEntryLimit",
    title: "overview.singleEntryLimit",
    sub: "overview.singleEntryLimitStaff",
  },
  statementsOver: {
    key: "statementLimit",
    title: "overview.statementLimit",
    sub: "overview.statementLimitOver",
  },
  statementsStaff: {
    key: "statementLimit",
    title: "overview.statementLimit",
    sub: "overview.statementLimitStaff",
  },
} as const

export type BookLimitRuleId = keyof typeof BOOK_LIMIT_TEXT

/** Where turnover stands against the VAT registration limit. */
export function vatThresholdText(f: Formatters, threshold: VatThreshold) {
  const figures = {
    a: f.money(threshold.turnover),
    l: f.money(vatThresholdIn(threshold.year)),
    y: threshold.year,
  }
  if (threshold.exceededOn) {
    return {
      title: f.t("overview.thresholdOver", { d: f.date(threshold.exceededOn) }),
      sub: f.t("overview.thresholdOverSub", figures),
    }
  }
  return {
    title: f.t("overview.threshold", figures),
    sub: f.t(
      threshold.level === "near"
        ? "overview.thresholdNearSub"
        : "overview.thresholdSub",
      figures
    ),
  }
}

/** Last year's turnover against what the chosen filing period allows. */
export function vatPeriodLimitText(f: Formatters, over: VatPeriodOverLimit) {
  return {
    title: f.t("overview.vatPeriodLimit", {
      y: over.year,
      a: f.money(over.turnover),
    }),
    sub: f.t("overview.vatPeriodLimitSub", { l: f.money(over.limit) }),
  }
}
