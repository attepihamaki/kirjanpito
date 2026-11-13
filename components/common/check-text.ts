import type { EntryCheck } from "@/lib/domain/entry-checks"

/**
 * The title and the explanation of each entry check, as dictionary keys. The
 * overview's checklist and the year-end dialog word them alike.
 */
export const CHECK_TEXT = {
  toCheck: { title: "overview.toCheck", sub: "overview.toCheckSub" },
  noReceipt: {
    title: "overview.withoutReceipt",
    sub: "overview.withoutReceiptSub",
  },
  rateMismatch: {
    title: "overview.rateMismatch",
    sub: "overview.rateMismatchSub",
  },
  futureDate: { title: "overview.futureDate", sub: "overview.futureDateSub" },
  zeroVatSale: {
    title: "overview.zeroVatSale",
    sub: "overview.zeroVatSaleSub",
  },
  largeAmount: {
    title: "overview.largeAmount",
    sub: "overview.largeAmountSub",
  },
  duplicate: {
    title: "overview.duplicate",
    sub: "overview.duplicateSub",
  },
  vatNotDeductible: {
    title: "overview.vatNotDeductible",
    sub: "overview.vatNotDeductibleSub",
  },
  privateUseNoVat: {
    title: "overview.privateUseNoVat",
    sub: "overview.privateUseNoVatSub",
  },
  lateCash: { title: "overview.lateCash", sub: "overview.lateCashSub" },
  smallAsset: {
    title: "overview.smallAsset",
    sub: "overview.smallAssetSub",
  },
  largeExpense: {
    title: "overview.largeExpense",
    sub: "overview.largeExpenseSub",
  },
} as const satisfies Record<EntryCheck, { title: string; sub: string }>

/**
 * The checks that only point out a choice, since either way the entry is
 * right: a small purchase may be depreciated or deducted at once. The
 * overview shows them as information, not as something to fix.
 */
export const INFO_CHECKS: ReadonlySet<EntryCheck> = new Set([
  "smallAsset",
  "largeExpense",
])
