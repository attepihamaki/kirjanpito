"use client"

import * as React from "react"
import { CheckIcon, LockIcon } from "lucide-react"

import {
  SettingCard,
  SettingGrid,
  SettingValue,
} from "@/components/common/setting-card"
import { useFormatters } from "@/components/lang-provider"
import {
  ASSET_FIELDS,
  DEBT_FIELDS,
  sumYearEnd as sum,
} from "@/components/statement/year-end-figures-dialog"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import { useCommandCtx } from "@/hooks/use-commands"
import { storeMemo, storeReport } from "@/lib/commands/memo-commands"
import { EMPTY_YEAR_END, inventoryChange } from "@/lib/domain/form5-balance"
import { inventoryTotals } from "@/lib/domain/inventory"
import { stocktakeReport } from "@/lib/domain/inventory-report"
import { useBookStore } from "@/stores/book-store"

/**
 * What Form 5's assets and liabilities need beyond the book (§8.8), year by
 * year. The year-end dialog lists the resulting fields for copying.
 */
export function BalanceView() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const yearEnds = useBookStore((s) => s.yearEnd)
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])
  const openDialog = useBookStore((s) => s.openDialog)
  const values = yearEnds[year] ?? EMPTY_YEAR_END
  const opening = yearEnds[year - 1] ?? EMPTY_YEAR_END

  const assets = sum(
    values,
    ASSET_FIELDS.map(([key]) => key)
  )
  const debts = sum(
    values,
    DEBT_FIELDS.map(([key]) => key)
  )

  return (
    <SettingGrid>
      <SettingCard
        label={f.t("balance.yearEndTitle", { d: f.date(`${year}-12-31`) })}
        info={f.t(filed ? "balance.yearEndFiled" : "balance.yearEndHint")}
        action={
          <button
            type="button"
            className="print-hidden rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => openDialog({ kind: "year-end-figures" })}
          >
            {f.t("balance.editFigures")}
          </button>
        }
      >
        <SettingValue
          value={f.t(filed ? "balance.locked" : "balance.figuresTitle")}
          lead={filed ? <LockIcon className="size-4" aria-hidden /> : undefined}
          note={f.date(`${year}-12-31`)}
        />
      </SettingCard>
      <SettingCard
        label={f.t("balance.statAssets")}
        info={f.t("balance.statHint")}
      >
        <SettingValue value={f.money(assets)} />
      </SettingCard>
      <SettingCard
        label={f.t("balance.statDebts")}
        info={f.t("balance.statHint")}
      >
        <SettingValue value={f.money(debts)} />
      </SettingCard>
      <SettingCard label={f.t("balance.stockOpening")}>
        <SettingValue
          value={f.money(opening.goods + opening.otherCurrent)}
          note={f.date(`${year - 1}-12-31`)}
        />
      </SettingCard>
      <SettingCard label={f.t("balance.stockClosing")}>
        <SettingValue
          value={f.money(values.goods + values.otherCurrent)}
          note={f.date(`${year}-12-31`)}
        />
      </SettingCard>
      <InventoryCard year={year} />
    </SettingGrid>
  )
}

/** Books the year's change in stock on line 333, through the entry dialog (§8.8). */
function InventoryCard({ year }: { year: number }) {
  const f = useFormatters()
  const yearEnds = useBookStore((s) => s.yearEnd)
  const entries = useBookStore((s) => s.entries)
  const inventory = useBookStore((s) => s.inventory)
  const businessName = useBookStore((s) => s.businessName)
  const businessId = useBookStore((s) => s.businessId)
  const openDialog = useBookStore((s) => s.openDialog)
  const ctx = useCommandCtx()
  const memoVoucher = useMemoVoucher()
  const [busy, setBusy] = React.useState(false)
  const opening = yearEnds[year - 1] ?? EMPTY_YEAR_END
  const closing = yearEnds[year] ?? EMPTY_YEAR_END
  const change = inventoryChange(opening, closing)
  const description = f.t("balance.inventoryEntry", { y: year })
  const booked = entries.some(
    (e) => e.catId === "333" && e.description === description
  )
  const filed = !!useBookStore((s) => s.form5Filed[String(year)])

  return (
    <SettingCard
      label={f.t("balance.stockCost")}
      info={f.t("balance.inventoryHint", { a: f.money(change) })}
    >
      <SettingValue value={f.money(change)} />
      <div className="print-hidden">
        {booked ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-primary" aria-hidden />
            {f.t("balance.inventoryBooked")}
          </p>
        ) : (
          <Button
            variant="outline"
            disabled={change === 0 || filed || busy}
            onClick={async () => {
              const prefill = {
                date: `${year}-12-31`,
                description,
                type: "expense" as const,
                catId: "333",
                amount: change,
                vatRate: 0,
                amountMode: "gross" as const,
              }
              setBusy(true)
              /*
               * The memo is made before the dialog opens, which then holds it
               * like any attached receipt. A user who changes the amount there
               * leaves the calculation on the memo as it was worked out.
               */
              const memo = memoVoucher(
                f.t("memo.inventoryHeading", { y: year }),
                { id: "", ...prefill },
                [
                  {
                    label: f.t("memo.stockOn", { y: year - 1 }),
                    value: f.money(opening.goods + opening.otherCurrent),
                  },
                  {
                    label: f.t("memo.stockOn", { y: year }),
                    value: f.money(closing.goods + closing.otherCurrent),
                  },
                  {
                    label: f.t("memo.stockChange"),
                    value: f.money(change),
                    strong: true,
                  },
                ],
                [f.t("memo.inventoryRule"), f.t("memo.keepCount")]
              )
              const att = await storeMemo(ctx, memo)
              /*
               * A counted stock goes in as the second voucher, so the memo's
               * figures rest on the list they came from (§8.28).
               */
              const rows = inventory.years[String(year)] ?? []
              const list =
                inventoryTotals(rows, inventory.method).rows > 0
                  ? await storeReport(
                      ctx,
                      stocktakeReport(f, {
                        year,
                        items: rows,
                        method: inventory.method,
                        businessName: businessName ?? "",
                        businessId: businessId ?? "",
                      })
                    )
                  : null
              const atts = [att, list].filter((a) => a !== null)
              setBusy(false)
              openDialog({
                kind: "entry",
                mode: "new",
                prefill: { ...prefill, ...(atts.length ? { atts } : {}) },
              })
            }}
          >
            {f.t("balance.inventoryBook")}
          </Button>
        )}
      </div>
    </SettingCard>
  )
}
