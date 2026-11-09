"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { CHECK_TEXT } from "@/components/common/check-text"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import type { YearEndFinding } from "@/lib/domain/year-end"
import { periodLabel } from "@/lib/i18n/period-label"
import { APP_ROUTES, STATEMENT_ROUTES } from "@/lib/site"
import { useBookStore, type CheckFilter } from "@/stores/book-store"

export interface DescribedFinding {
  title: string
  sub: string
  action?: React.ReactNode
}

/**
 * The words and the way in for each rule of the year-end set (§8.8), for the
 * year-end dialog and for "Check my book" (§8.23). A way in closes the dialog,
 * selects the finding's year and goes to the view that fixes it.
 */
export function useDescribeYearEnd() {
  const f = useFormatters()
  const router = useRouter()
  const closeDialog = useBookStore((s) => s.closeDialog)

  return React.useCallback(
    (item: YearEndFinding, year: number): DescribedFinding => {
      const go = (href: string, prepare?: () => void) => {
        const s = useBookStore.getState()
        if (s.year !== year) s.setYear(year)
        prepare?.()
        closeDialog()
        router.push(href)
      }
      const showInLedger = (check: CheckFilter) =>
        go(APP_ROUTES.ledger, () => {
          const s = useBookStore.getState()
          s.clearLedgerFilters()
          s.setMonth(0)
          s.setLedgerCheck(check)
        })
      const link = (label: string, onClick: () => void) => (
        <Button variant="ghost" size="sm" onClick={onClick}>
          {label}
        </Button>
      )

      switch (item.ruleId) {
        case "yearOngoing":
          return {
            title: f.t("statement.yearEndOngoing", { y: year }),
            sub: f.t("statement.yearEndOngoingSub"),
          }
        case "noEntries":
          return {
            title: f.t("statement.yearEndNoEntries", { y: year }),
            sub: f.t("statement.yearEndNoEntriesSub"),
          }
        case "unsaved":
          return {
            title: f.t("file.dirty"),
            sub: f.t("statement.yearEndUnsavedSub"),
          }
        case "entryCheck": {
          const text = CHECK_TEXT[item.data.check]
          return {
            title: f.t(text.title, { n: item.data.n }),
            sub: f.t(text.sub),
            action: link(f.t("overview.showThem"), () =>
              showInLedger(item.data.check)
            ),
          }
        }
        case "missingFiles":
          return {
            title: f.t("overview.missingFiles", { n: item.data.n }),
            sub: f.t("overview.missingFilesSub"),
          }
        case "vatUnfiled": {
          const names = item.data.keys.map((key) => {
            const p = periodFromKey(key)
            return p ? periodLabel(f, p) : key
          })
          return {
            title: f.t("statement.yearEndVatUnfiled", { p: names.join(", ") }),
            sub: f.t("statement.yearEndVatUnfiledSub"),
            action: link(f.t("statement.yearEndOpen"), () =>
              go(APP_ROUTES.vat)
            ),
          }
        }
        case "depreciation":
          return {
            title: f.t("statement.yearEndDepreciation"),
            sub: f.t("statement.yearEndDepreciationSub", {
              a: f.money(item.data.maximum),
            }),
            action: link(f.t("statement.yearEndOpen"), () =>
              go(STATEMENT_ROUTES.assets)
            ),
          }
        case "privateCar":
          return {
            title: f.t("statement.yearEndPrivateCar", {
              a: f.money(item.data.amount),
            }),
            sub: f.t("statement.yearEndPrivateCarSub"),
          }
        case "yearEndFigures":
          return {
            title: f.t("statement.yearEndFigures"),
            sub: f.t("statement.yearEndFiguresSub"),
            action: link(f.t("statement.yearEndOpen"), () =>
              go(STATEMENT_ROUTES.balance)
            ),
          }
        case "stockMissing":
          return {
            title: f.t("statement.yearEndStockMissing", {
              a: f.money(item.data.purchases),
            }),
            sub: f.t("statement.yearEndStockMissingSub"),
            action: link(f.t("statement.yearEndOpen"), () =>
              go(STATEMENT_ROUTES.inventory)
            ),
          }
        case "stockTooHigh":
          return {
            title: f.t("statement.yearEndStockTooHigh", {
              a: f.money(item.data.closing),
              b: f.money(item.data.available),
            }),
            sub: f.t("statement.yearEndStockTooHighSub"),
            action: link(f.t("statement.yearEndOpen"), () =>
              go(STATEMENT_ROUTES.inventory)
            ),
          }
        case "stockRows":
          return {
            title: f.t("statement.yearEndStockRows", { n: item.data.n }),
            sub: f.t("statement.yearEndStockRowsSub"),
            action: link(f.t("statement.yearEndOpen"), () =>
              go(STATEMENT_ROUTES.inventory)
            ),
          }
        case "openItems":
          return {
            title: f.t("overview.openItems", { n: item.data.n }),
            sub: f.t("overview.openItemsSub", {
              r: f.money(item.data.receivables),
              p: f.money(item.data.payables),
            }),
          }
        case "emptyMonths":
          return {
            title: f.t("overview.emptyMonths", {
              m: item.data.months
                .map((m) => f.month(m - 1, true).toLowerCase())
                .join(", "),
            }),
            sub: f.t("overview.emptyMonthsSub"),
          }
      }
    },
    [f, router, closeDialog]
  )
}
