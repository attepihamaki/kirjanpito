"use client"

import * as React from "react"
import { CheckIcon, LockIcon, PencilIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { StatStrip } from "@/components/common/stat-strip"
import { useFormatters } from "@/components/lang-provider"
import {
  ASSET_FIELDS,
  DEBT_FIELDS,
  sumYearEnd as sum,
} from "@/components/statement/year-end-figures-dialog"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import { useCommandCtx } from "@/hooks/use-commands"
import { storeMemo } from "@/lib/commands/memo-commands"
import { EMPTY_YEAR_END, inventoryChange } from "@/lib/domain/form5-balance"
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-prose">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">
              {f.t("balance.yearEndTitle", { d: f.date(`${year}-12-31`) })}
            </h2>
            {filed ? (
              <Pill>
                <LockIcon className="mr-1 size-3" aria-hidden />
                {f.t("balance.locked")}
              </Pill>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {f.t(filed ? "balance.yearEndFiled" : "balance.yearEndHint")}
          </p>
        </div>
        <Button
          className="print-hidden"
          onClick={() => openDialog({ kind: "year-end-figures" })}
        >
          <PencilIcon data-icon="inline-start" />
          {f.t("balance.editFigures")}
        </Button>
      </div>

      <StatStrip
        className="lg:grid-cols-3"
        stats={[
          {
            label: f.t("balance.statAssets"),
            value: (
              <Money
                cents={sum(
                  values,
                  ASSET_FIELDS.map(([key]) => key)
                )}
              />
            ),
            hint: f.t("balance.statHint"),
          },
          {
            label: f.t("balance.statDebts"),
            value: (
              <Money
                cents={sum(
                  values,
                  DEBT_FIELDS.map(([key]) => key)
                )}
              />
            ),
            hint: f.t("balance.statHint"),
          },
          {
            label: f.t("balance.statStock"),
            value: <Money cents={inventoryChange(opening, values)} />,
          },
        ]}
      />

      <InventoryPanel year={year} />
    </div>
  )
}

/** Books the year's change in stock on line 333, through the entry dialog (§8.8). */
function InventoryPanel({ year }: { year: number }) {
  const f = useFormatters()
  const yearEnds = useBookStore((s) => s.yearEnd)
  const entries = useBookStore((s) => s.entries)
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

  const figures: [string, number, boolean?][] = [
    [f.t("balance.stockOpening"), opening.goods + opening.otherCurrent],
    [f.t("balance.stockClosing"), closing.goods + closing.otherCurrent],
    [f.t("balance.stockCost"), change, true],
  ]

  return (
    <Panel
      title={f.t("balance.inventoryTitle")}
      description={f.t("balance.inventoryHint", {
        a: f.money(change),
      })}
      bodyClassName="p-4"
      footer={
        booked ? (
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
              setBusy(false)
              openDialog({
                kind: "entry",
                mode: "new",
                prefill: { ...prefill, ...(att ? { atts: [att] } : {}) },
              })
            }}
          >
            {f.t("balance.inventoryBook")}
          </Button>
        )
      }
    >
      <dl className="grid gap-4 min-[560px]:grid-cols-3">
        {figures.map(([label, cents, strong]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd>
              <Money
                cents={cents}
                className={strong ? "text-lg font-semibold" : "text-lg"}
              />
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
