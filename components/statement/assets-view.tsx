"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"

import { EuroInput } from "@/components/common/euro-input"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { StatStrip } from "@/components/common/stat-strip"
import { useFormatters } from "@/components/lang-provider"
import { useMemoVoucher } from "@/components/statement/use-memo-voucher"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommandCtx } from "@/hooks/use-commands"
import { bookWithMemo } from "@/lib/commands/memo-commands"
import {
  assetEntries,
  assetSchedule,
  type AssetYear,
} from "@/lib/domain/assets"
import { calcEntry } from "@/lib/domain/calc"
import { todayIso } from "@/lib/domain/dates"
import { calculatedEntryDate } from "@/lib/domain/deductions"
import { uid } from "@/lib/domain/id"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** The fixed asset register and the year's depreciation (§8.8). */
export function AssetsView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const opening = useBookStore((s) => s.assetOpening)
  const openDialog = useBookStore((s) => s.openDialog)

  const { schedule, rows } = React.useMemo(() => {
    const catMap = indexCategories(cats)
    return {
      schedule: assetSchedule(entries, catMap, opening, year),
      rows: assetEntries(entries, catMap, year),
    }
  }, [entries, cats, opening, year])
  const current = schedule.find((y) => y.year === year)

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose text-sm text-muted-foreground">
        {f.t("assets.intro")}
      </p>

      {current ? (
        <>
          <StatStrip
            stats={[
              {
                label: f.t("assets.base"),
                value: <Money cents={current.base} />,
              },
              {
                label: f.t("assets.maximum"),
                value: <Money cents={current.maximum} />,
              },
              {
                label: f.t("assets.taken"),
                value: <Money cents={current.taken} />,
              },
              {
                label: f.t("assets.closing"),
                value: <Money cents={current.closing} />,
              },
            ]}
          />
          <YearFigures
            row={current}
            key={`${year}-${current.taken}`}
            title={f.t("assets.title", { y: year })}
          />
        </>
      ) : (
        <Panel title={f.t("assets.title", { y: year })} bodyClassName="p-4">
          <p className="text-sm">
            <span className="font-medium">{f.t("assets.noneTitle")}. </span>
            {f.t("assets.noneBody")}
          </p>
        </Panel>
      )}

      <Panel title={f.t("assets.yearEntries", { y: year })}>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {f.t("assets.noYearEntries")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.t("assets.voucher")}</TableHead>
                <TableHead>{f.t("assets.date")}</TableHead>
                <TableHead>{f.t("recurring.description")}</TableHead>
                <TableHead>{f.t("common.type")}</TableHead>
                <TableHead className="text-right">
                  {f.t("common.net")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() =>
                    openDialog({ kind: "entry", mode: "edit", entryId: e.id })
                  }
                >
                  <TableCell className="tabular">{e.voucher}</TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(e.date)}
                  </TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>
                    <Pill tone={e.type === "income" ? "income" : "expense"}>
                      {f.t(
                        e.type === "income" ? "assets.sale" : "assets.purchase"
                      )}
                    </Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      cents={
                        e.type === "income"
                          ? -calcEntry(e).net
                          : calcEntry(e).net
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {schedule.length > 1 ? (
        <Panel title={f.t("assets.schedule")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{f.t("assets.year")}</TableHead>
                <TableHead className="text-right">
                  {f.t("assets.opening")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("assets.additions")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("assets.disposals")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("assets.taken")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("assets.closing")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((y) => (
                <TableRow
                  key={y.year}
                  className={cn(y.year === year && "bg-muted/50")}
                  aria-current={y.year === year ? "true" : undefined}
                >
                  <TableCell className="tabular font-medium">
                    {y.year}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={y.opening} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={y.additions} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={y.disposals} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={y.taken} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={y.closing} className="font-medium" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ) : null}

      <OpeningBalance />

      <p className="print-hidden flex max-w-prose items-start gap-2 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        {f.t("assets.smallNote")}
      </p>
    </div>
  )
}

/** The year's calculation and the form that books its depreciation. */
function YearFigures({ row, title }: { row: AssetYear; title: string }) {
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
  const used =
    row.maximum > 0 ? Math.min(100, (row.taken / row.maximum) * 100) : 0

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
    <Panel title={title} bodyClassName="grid gap-6 p-4 md:grid-cols-2">
      <div className="flex flex-col gap-5">
        <dl className="flex flex-col text-sm">
          {figures.slice(0, 4).map(([label, cents], index) => {
            const last = index === 3
            return (
              <div
                key={label}
                className={cn(
                  "flex justify-between gap-4 py-2",
                  last
                    ? "border-t font-medium"
                    : "border-b border-dashed border-border/60"
                )}
              >
                <dt className={last ? undefined : "text-muted-foreground"}>
                  {label}
                </dt>
                <dd>
                  <Money cents={cents} />
                </dd>
              </div>
            )
          })}
        </dl>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{f.t("assets.used")}</span>
            <span className="tabular">
              {f.money(row.taken)} / {f.money(row.maximum)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={f.t("assets.used")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(used)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${used}%` }}
            />
          </div>
        </div>
      </div>

      <div className="print-hidden flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
        <Field>
          <FieldLabel htmlFor="asset-amount">{f.t("assets.amount")}</FieldLabel>
          <EuroInput
            id="asset-amount"
            value={amount}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setAmount(event.target.value)
              setError(null)
            }}
          />
          <FieldError>{error}</FieldError>
        </Field>
        <p className="text-xs text-muted-foreground">
          {f.t("assets.bookHint")}
        </p>
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
    </Panel>
  )
}

/** The balance the register starts from, for assets older than the book. */
function OpeningBalance() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const opening = useBookStore((s) => s.assetOpening)
  const setAssetOpening = useBookStore((s) => s.setAssetOpening)
  const openingYear = opening?.year ?? year

  return (
    <Panel
      className="print-hidden"
      title={f.t("assets.openingTitle")}
      description={f.t("assets.openingHint", { y: openingYear })}
      bodyClassName="p-4"
    >
      <Field className="max-w-60">
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
    </Panel>
  )
}
