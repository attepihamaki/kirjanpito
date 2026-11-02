"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommandCtx } from "@/hooks/use-commands"
import { addEntriesWithUndo } from "@/lib/commands/bulk-commands"
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
import { indexCategories } from "@/lib/domain/types"
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
      <Panel title={f.t("assets.title", { y: year })} bodyClassName="p-4">
        <p className="text-sm text-muted-foreground">{f.t("assets.intro")}</p>
        {current ? (
          <YearFigures row={current} key={`${year}-${current.taken}`} />
        ) : (
          <p className="mt-4 text-sm">
            <span className="font-medium">{f.t("assets.noneTitle")}. </span>
            {f.t("assets.noneBody")}
          </p>
        )}
      </Panel>

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
                <TableRow key={y.year}>
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
                    <Money cents={y.closing} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ) : null}

      <OpeningBalance />

      <p className="print-hidden text-sm text-muted-foreground">
        {f.t("assets.smallNote")}
      </p>
    </div>
  )
}

/** The year's calculation and the form that books its depreciation. */
function YearFigures({ row }: { row: AssetYear }) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const remaining = Math.max(0, row.maximum - row.taken)
  const [amount, setAmount] = React.useState(
    remaining ? formatMoneyPlain(remaining) : ""
  )
  const [error, setError] = React.useState<string | null>(null)

  const book = async () => {
    const cents = parseAmount(amount)
    if (cents == null || cents <= 0) {
      setError(f.t("assets.badAmount"))
      return
    }
    setError(null)
    await addEntriesWithUndo(
      ctx,
      [
        {
          id: `e-${uid()}`,
          date: calculatedEntryDate(row.year, todayIso()),
          description: f.t("assets.entryDescription", { y: row.year }),
          type: "expense",
          catId: "337",
          amount: cents,
          vatRate: 0,
          amountMode: "net",
        },
      ],
      f.t("assets.booked")
    )
  }

  const figures: [string, number][] = [
    [f.t("assets.opening"), row.opening],
    [f.t("assets.additions"), row.additions],
    [f.t("assets.disposals"), row.disposals],
    [f.t("assets.base"), row.base],
    [f.t("assets.maximum"), row.maximum],
    [f.t("assets.taken"), row.taken],
    [f.t("assets.closing"), row.closing],
  ]

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <dl className="flex flex-col gap-1.5 text-sm">
        {figures.map(([label, cents]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>
              <Money cents={cents} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="print-hidden flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="asset-amount">{f.t("assets.amount")}</FieldLabel>
          <Input
            id="asset-amount"
            inputMode="decimal"
            className="tabular max-w-40 text-right"
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
          <Button
            variant="outline"
            disabled={row.base === 0}
            onClick={() => void book()}
          >
            {f.t("assets.book")}
          </Button>
        </div>
      </div>
    </div>
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
      <Field>
        <FieldLabel htmlFor="asset-opening">
          {f.t("assets.openingLabel", { y: openingYear })}
        </FieldLabel>
        <Input
          key={opening?.amount ?? 0}
          id="asset-opening"
          inputMode="decimal"
          className="tabular max-w-40 text-right"
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
