"use client"

import * as React from "react"

import { EuroInput } from "@/components/common/euro-input"
import { Pill } from "@/components/common/pill"
import { PrintButton } from "@/components/common/print-button"
import {
  SettingCard,
  SettingGrid,
  SettingValue,
} from "@/components/common/setting-card"
import { useFormatters } from "@/components/lang-provider"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { useCommandCtx } from "@/hooks/use-commands"
import { bookWithMemo } from "@/lib/commands/memo-commands"
import {
  assetList,
  assetSchedule,
  type AssetItem,
  type AssetYear,
} from "@/lib/domain/assets"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso } from "@/lib/domain/dates"
import { calculatedEntryDate } from "@/lib/domain/deductions"
import { uid } from "@/lib/domain/id"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { reversalLabel } from "@/lib/domain/reversal"
import { useBookStore } from "@/stores/book-store"

/** A voucher's number, with its year when it is not `year`'s. */
const voucherRef = (e: Entry, year: number) => reversalLabel(e, year) || "–"

/** The fixed asset register and the year's depreciation (§8.8). */
export function AssetsView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const opening = useBookStore((s) => s.assetOpening)

  const { schedule, list } = React.useMemo(() => {
    const catMap = indexCategories(cats)
    return {
      schedule: assetSchedule(entries, catMap, opening, year),
      list: assetList(entries, catMap, year),
    }
  }, [entries, cats, opening, year])
  const current = schedule.find((y) => y.year === year)

  return (
    <div className="flex flex-col gap-4">
      {list.items.length > 0 ? (
        <div className="print-hidden flex justify-end">
          <PrintButton />
        </div>
      ) : null}

      <SettingGrid>
        {poolCards(f, current, year, list.items.length === 0)}
        {list.items.map((item, i) => (
          <ItemCard
            key={item.purchase.id}
            item={item}
            year={year}
            info={i === 0 ? f.t("assets.listHint", { y: year }) : undefined}
          />
        ))}
        {list.unlinkedSales.map((sale) => (
          <UnlinkedSaleCard key={sale.id} sale={sale} year={year} />
        ))}
        {schedule.length > 1
          ? schedule.map((y) => (
              <SettingCard
                key={`year-${y.year}`}
                label={`${f.t("assets.schedule")} ${y.year}`}
              >
                <SettingValue
                  value={f.money(y.closing)}
                  note={`${f.money(y.opening)} + ${f.money(y.additions)} − ${f.money(y.disposals)} − ${f.money(y.taken)}`}
                />
              </SettingCard>
            ))
          : null}
      </SettingGrid>
    </div>
  )
}

/**
 * The pool's cards for the year, to sit in the page's `SettingGrid` (§8.10):
 * base, maximum, booked and closing balance, the opening balance as an editable
 * card, and the form that books the year's depreciation.
 */
function poolCards(
  f: ReturnType<typeof useFormatters>,
  row: AssetYear | undefined,
  year: number,
  listEmpty: boolean
): React.ReactElement[] {
  const cards: React.ReactElement[] = []
  const cardsHavePool = row !== undefined
  /* With no pool the cards still show, at nothing, so the grid keeps its shape. */
  const shown: AssetYear = row ?? {
    year,
    opening: 0,
    additions: 0,
    disposals: 0,
    base: 0,
    saleExcess: 0,
    maximum: 0,
    taken: 0,
    closing: 0,
  }
  {
    const row = shown
    const used =
      row.maximum > 0 ? Math.round((row.taken / row.maximum) * 100) : 0
    cards.push(
      <SettingCard
        key="base"
        label={f.t("assets.base")}
        info={f.t("assets.intro")}
      >
        <SettingValue
          value={f.money(row.base)}
          note={
            !cardsHavePool
              ? f.t("assets.noneTitle")
              : `${f.money(row.opening)} + ${f.money(row.additions)} − ${f.money(row.disposals)}`
          }
        />
      </SettingCard>,
      <SettingCard
        key="maximum"
        label={f.t("assets.maximum")}
        info={f.t("assets.smallNote")}
      >
        <SettingValue
          value={f.money(row.maximum)}
          note={f.t("assets.title", { y: row.year })}
        />
      </SettingCard>,
      <SettingCard key="taken" label={f.t("assets.taken")}>
        <SettingValue
          value={f.money(row.taken)}
          note={`${f.t("assets.used")}: ${used} %`}
        />
      </SettingCard>,
      <SettingCard key="closing" label={f.t("assets.closing")}>
        <SettingValue
          value={f.money(row.closing)}
          note={f.t("assets.title", { y: row.year })}
        />
      </SettingCard>
    )
  }
  cards.push(
    <OpeningCard
      key="opening"
      year={year}
      info={[
        row ? null : f.t("assets.noneBody"),
        listEmpty ? f.t("assets.listEmpty") : null,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  )
  cards.push(<BookCard key={`book-${shown.year}-${shown.taken}`} row={shown} />)
  return cards
}

/** One purchase of the asset list as a card, with the sales that name it. */
function ItemCard({
  item,
  year,
  info,
}: {
  item: AssetItem
  year: number
  info?: string
}) {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)
  const { purchase, sales } = item
  const open = (id: string) =>
    openDialog({ kind: "entry", mode: "edit", entryId: id })
  return (
    <SettingCard
      label={`${f.t("assets.listPurchase")} ${voucherRef(purchase, year)} · ${f.date(purchase.date)}`}
      info={info}
      action={
        <Pill tone={sales.length ? "neutral" : "income"}>
          {f.t(sales.length ? "assets.listSold" : "assets.listInUse")}
        </Pill>
      }
    >
      <p className="flex items-center gap-2 text-base font-medium">
        <button
          type="button"
          className="min-w-0 truncate text-left underline-offset-2 hover:underline"
          onClick={() => open(purchase.id)}
        >
          {purchase.description || f.t("ledger.noDescription")}
        </button>
      </p>
      <p className="text-sm text-muted-foreground">
        {f.t("assets.listCost")} {f.money(calcEntry(purchase).net)}
      </p>
      {sales.map((sale) => (
        <p key={sale.id} className="text-sm text-muted-foreground">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => open(sale.id)}
          >
            {f.t("assets.listSale")} {voucherRef(sale, year)} ·{" "}
            {f.date(sale.date)}
          </button>{" "}
          · {f.t("assets.listPrice")} {f.money(calcEntry(sale).net)}
        </p>
      ))}
    </SettingCard>
  )
}

/** A sale that names no purchase, with a way to open it and link it. */
function UnlinkedSaleCard({ sale, year }: { sale: Entry; year: number }) {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)
  return (
    <SettingCard
      label={f.t("assets.listUnlinked")}
      info={f.t("assets.listUnlinkedHint")}
    >
      <p className="text-base font-medium">
        <button
          type="button"
          className="min-w-0 truncate text-left underline-offset-2 hover:underline"
          onClick={() =>
            openDialog({ kind: "entry", mode: "edit", entryId: sale.id })
          }
        >
          {voucherRef(sale, year)} · {f.date(sale.date)} ·{" "}
          {sale.description || f.t("ledger.noDescription")}
        </button>
      </p>
    </SettingCard>
  )
}

/** The form that books the year's depreciation on line 337. */
function BookCard({ row }: { row: AssetYear }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const memoVoucher = useMemoVoucher()
  const remaining = Math.max(0, row.maximum - row.taken)
  const [amount, setAmount] = React.useState(
    remaining ? formatMoneyPlain(remaining) : ""
  )
  const [error, setError] = React.useState<string | null>(null)

  const figures: [string, number][] = [
    [f.t("assets.opening"), row.opening],
    [f.t("assets.additions"), row.additions],
    [f.t("assets.disposals"), row.disposals],
    [f.t("assets.base"), row.base],
    [f.t("assets.maximum"), row.maximum],
    [f.t("assets.taken"), row.taken],
    [f.t("assets.closing"), row.closing],
  ]
  const book = async () => {
    const cents = parseAmount(amount)
    if (cents == null || cents <= 0) {
      setError(f.t("assets.badAmount"))
      return
    }
    setError(null)
    const entry: Entry = {
      id: `e-${uid()}`,
      date: calculatedEntryDate(row.year, todayIso()),
      description: f.t("assets.entryDescription", { y: row.year }),
      type: "expense",
      catId: "337",
      amount: cents,
      vatRate: 0,
      amountMode: "net",
    }
    const memo = memoVoucher(
      f.t("memo.depreciationHeading", { y: row.year }),
      entry,
      [
        ...figures
          .slice(0, -1)
          .map(([label, value]) => ({ label, value: f.money(value) })),
        {
          label: f.t("memo.thisDepreciation"),
          value: f.money(cents),
          strong: true,
        },
        {
          label: f.t("memo.closingAfter"),
          value: f.money(row.closing - cents),
        },
      ],
      [f.t("memo.depreciationRule")]
    )
    await bookWithMemo(ctx, entry, memo, f.t("assets.booked"))
  }

  return (
    <SettingCard label={f.t("assets.amount")} info={f.t("assets.bookHint")}>
      <div className="print-hidden flex flex-col gap-2">
        <Field>
          <EuroInput
            id="asset-amount"
            aria-label={f.t("assets.amount")}
            value={amount}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setAmount(event.target.value)
              setError(null)
            }}
          />
          <FieldError>{error}</FieldError>
        </Field>
        {row.taken > row.maximum ? (
          <p className="text-sm text-warning">
            {f.t("assets.overMaximum", { x: f.money(row.maximum) })}
          </p>
        ) : null}
        {row.saleExcess > 0 ? (
          <p className="text-sm text-warning">
            {f.t("assets.saleExcess", { x: f.money(row.saleExcess) })}
          </p>
        ) : null}
        <div>
          <Button disabled={row.base === 0} onClick={() => void book()}>
            {f.t("assets.book")}
          </Button>
        </div>
      </div>
    </SettingCard>
  )
}

/** The balance the register starts from, for assets older than the book. */
function OpeningCard({ year, info }: { year: number; info?: string }) {
  const f = useFormatters()
  const opening = useBookStore((s) => s.assetOpening)
  const setAssetOpening = useBookStore((s) => s.setAssetOpening)
  const openingYear = opening?.year ?? year

  return (
    <SettingCard
      label={f.t("assets.openingTitle")}
      info={[f.t("assets.openingHint", { y: openingYear }), info]
        .filter(Boolean)
        .join(" ")}
      editor={
        <Field>
          <FieldLabel htmlFor="asset-opening">
            {f.t("assets.openingLabel", { y: openingYear })}
          </FieldLabel>
          <EuroInput
            key={opening?.amount ?? 0}
            id="asset-opening"
            defaultValue={opening ? formatMoneyPlain(opening.amount) : ""}
            onBlur={(event) => {
              const text = event.target.value.trim()
              const cents = text ? parseAmount(text) : 0
              if (cents == null || cents < 0) {
                event.target.value = opening
                  ? formatMoneyPlain(opening.amount)
                  : ""
                return
              }
              if (cents === (opening?.amount ?? 0)) return
              setAssetOpening(
                cents > 0 ? { year: openingYear, amount: cents } : null
              )
            }}
          />
        </Field>
      }
    >
      <SettingValue
        value={opening ? f.money(opening.amount) : f.t("settings.notSet")}
        muted={!opening}
        note={f.t("assets.openingLabel", { y: openingYear })}
      />
    </SettingCard>
  )
}
