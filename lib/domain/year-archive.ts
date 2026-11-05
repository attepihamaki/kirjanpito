import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { assetSchedule, type AssetOpening } from "@/lib/domain/assets"
import { yearOf } from "@/lib/domain/dates"
import { loanBalance, type LoanOpening } from "@/lib/domain/form5-balance"
import { paidDate } from "@/lib/domain/open-items"
import { vatPeriods, filedKeys } from "@/lib/domain/vat-deadline"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import type { CategoryMap, Entry } from "@/lib/domain/types"

/**
 * Archiving a closed year (§8.19). The year's entries and receipts leave the
 * working book and go into a ZIP of their own, which opens read-only as a
 * reference. Everything here is pure; `archiveYear` in `io-commands.ts` does
 * the writing.
 */

/** What the working book keeps of an archived year: where it went, not what it held. */
export interface ArchiveStub {
  /** The ZIP's name as it was written. */
  file: string
  /** ISO date the year was archived. */
  on: string
  /** How many entries the archive holds. */
  entries: number
}

/** Why a year cannot be archived yet. */
export type ArchiveBlocker =
  /** The year has not ended. */
  | { kind: "running" }
  /** Form 5 is not marked as filed (§8.8). */
  | { kind: "form5" }
  /** Closed VAT periods of the year not marked as filed (§6.5). */
  | { kind: "vat"; periods: string[] }
  /** An older year is still in the book. Years go oldest first. */
  | { kind: "older"; year: number }
  /** Entries dated in the year are open or were paid after it. */
  | { kind: "unsettled"; count: number }
  /** An asset opening balance later than the next year cannot be rolled. */
  | { kind: "assetOpening" }
  /** The year holds no entries. */
  | { kind: "empty" }

export interface ArchiveInput {
  year: number
  entries: readonly Entry[]
  cats: CategoryMap
  today: string
  vatPeriod: VatPeriodKind
  vatFiled: Readonly<Record<string, string>>
  form5Filed: Readonly<Record<string, string>>
  assetOpening: AssetOpening | null
}

/**
 * Entries dated in `year` that were paid in it. Nothing else of the year can
 * leave: an entry paid later still counts in a later year's result, and one
 * dated later but paid in `year` stays under its own date.
 */
export function movableEntries(
  entries: readonly Entry[],
  year: number
): Entry[] {
  return entries.filter((e) => {
    if (yearOf(e.date) !== year) return false
    const paid = paidDate(e)
    return paid !== null && yearOf(paid) === year
  })
}

/**
 * Entries that stay in the archive's own books so its Form 5 reads as filed:
 * the movable ones, plus any dated elsewhere but paid in `year`.
 */
export function archiveContents(
  entries: readonly Entry[],
  year: number
): Entry[] {
  return entries.filter((e) => {
    if (yearOf(e.date) === year) return true
    const paid = paidDate(e)
    return paid !== null && yearOf(paid) === year
  })
}

/** Everything standing between the year and its archive, in the order to fix it. */
export function archiveBlockers(input: ArchiveInput): ArchiveBlocker[] {
  const { year, entries, today } = input
  const out: ArchiveBlocker[] = []

  if (!entries.some((e) => yearOf(e.date) === year)) {
    return [{ kind: "empty" }]
  }
  if (today <= `${year}-12-31`) out.push({ kind: "running" })

  const older = Math.min(...entries.map((e) => yearOf(e.date)))
  if (older < year) out.push({ kind: "older", year: older })

  if (!input.form5Filed[String(year)]) out.push({ kind: "form5" })

  const unfiled = vatPeriods(input.vatPeriod, year)
    .filter((p) => p.to < today && filedKeys(p, input.vatFiled).length === 0)
    .map((p) => p.key)
  if (unfiled.length) out.push({ kind: "vat", periods: unfiled })

  const unsettled = entries.filter(
    (e) => yearOf(e.date) === year && !movableEntries([e], year).length
  ).length
  if (unsettled) out.push({ kind: "unsettled", count: unsettled })

  if (input.assetOpening && input.assetOpening.year > year + 1) {
    out.push({ kind: "assetOpening" })
  }
  return out
}

/**
 * The opening balances the next year starts from once the year's entries are
 * gone. The pool and the loans are worked out from the entries, so what they
 * stood at on 31.12. has to be written down before the entries leave.
 */
export function rolledOpenings(input: {
  year: number
  entries: readonly Entry[]
  cats: CategoryMap
  assetOpening: AssetOpening | null
  loanOpening: LoanOpening | null
}): { assetOpening: AssetOpening | null; loanOpening: LoanOpening | null } {
  const { year, entries, cats } = input
  const next = year + 1

  let assetOpening = input.assetOpening
  const schedule = assetSchedule(entries, cats, input.assetOpening, year)
  const closing = schedule.find((y) => y.year === year)?.closing
  if (closing !== undefined) {
    /* An opening dated next year is added to the carried balance by the register. */
    const extra =
      input.assetOpening?.year === next ? input.assetOpening.amount : 0
    assetOpening = { year: next, amount: closing + extra }
  }

  let loanOpening = input.loanOpening
  const loans = loanBalance(entries, cats, input.loanOpening, year)
  const hadLoans =
    input.loanOpening !== null ||
    entries.some((e) => LINE_BY_KEY.get(cats.get(e.catId)?.line ?? "")?.loan)
  if (hadLoans) {
    const extra =
      input.loanOpening?.year === next ? input.loanOpening.amount : 0
    loanOpening = { year: next, amount: loans + extra }
  }
  return { assetOpening, loanOpening }
}
