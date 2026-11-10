"use client"

import * as React from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { EuroInput } from "@/components/common/euro-input"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import {
  SettingCard,
  SettingGrid,
  SettingValue,
} from "@/components/common/setting-card"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLossInput } from "@/hooks/use-loss-input"
import { evalAmount } from "@/lib/domain/amount-expr"
import { formatMoneyPlain } from "@/lib/domain/money"
import { LOSS_YEARS, lossLedger, type LossOrigin } from "@/lib/domain/tax-loss"
import type { Cents } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * Losses carried forward (§6.15), through the selected year: what this year
 * deducts, what is left and what runs out, and every loss with the figure the
 * assessment confirmed, which the user types from the tax decision.
 */
export function LossesView() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const input = useLossInput()
  const ledger = React.useMemo(() => lossLedger(input, year), [input, year])
  const thisYear = ledger.years.find((y) => y.year === year)
  const left = ledger.origins.reduce((sum, o) => sum + o.left, 0)
  const expiring = ledger.origins
    .filter((o) => o.lastYear === year)
    .reduce((sum, o) => sum + o.left, 0)

  /* A year with a loss in the book is listed even when its confirmed loss is 0. */
  const years = [
    ...new Set([
      ...[...input.results]
        .filter(([y, r]) => r < 0 && y <= year)
        .map(([y]) => y),
      ...Object.keys(input.confirmed)
        .map(Number)
        .filter((y) => y <= year),
    ]),
  ].sort((a, b) => a - b)
  const origin = new Map(ledger.origins.map((o) => [o.year, o]))

  return (
    <div className="flex flex-col gap-4">
      <SettingGrid>
        <SettingCard
          label={f.t("losses.deducted", { y: year })}
          info={f.t("losses.deductedHint")}
        >
          <SettingValue
            value={f.money(thisYear?.deducted ?? 0)}
            note={
              thisYear && thisYear.profit > 0
                ? f.t("losses.taxable", {
                    a: f.money(thisYear.profit - thisYear.deducted),
                  })
                : f.t("losses.noProfit")
            }
          />
        </SettingCard>
        <SettingCard label={f.t("losses.left", { y: year })}>
          <SettingValue value={f.money(left)} />
        </SettingCard>
        <SettingCard label={f.t("losses.expiring", { y: year })}>
          <SettingValue value={f.money(expiring)} />
        </SettingCard>
      </SettingGrid>

      <Panel
        title={f.t("losses.title")}
        description={f.t("losses.description", { n: LOSS_YEARS })}
        footer={
          <AddEarlierLoss
            before={Math.min(year + 1, ...input.results.keys())}
          />
        }
      >
        {years.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            {f.t("losses.none")}
          </p>
        ) : (
          <Table className="[&_tr>*:first-child]:pl-5 [&_tr>*:last-child]:pr-5">
            <TableHeader>
              <TableRow>
                <TableHead>{f.t("losses.year")}</TableHead>
                <TableHead className="text-right">
                  {f.t("losses.book")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("losses.confirmed")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("losses.used")}
                </TableHead>
                <TableHead className="text-right">
                  {f.t("losses.remaining")}
                </TableHead>
                <TableHead>{f.t("losses.lastYear")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => (
                <LossRow
                  key={y}
                  year={y}
                  book={bookLoss(input.results.get(y), input.toCapital?.[y])}
                  origin={origin.get(y)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

/** The loss the book shows for a year, less the part deducted from capital income. */
function bookLoss(result: Cents | undefined, toCapital: Cents | undefined) {
  if (result === undefined) return null
  return Math.max(0, -result - Math.max(0, toCapital ?? 0))
}

function LossRow({
  year,
  book,
  origin,
}: {
  year: number
  book: Cents | null
  origin: LossOrigin | undefined
}) {
  const f = useFormatters()
  const stored = useBookStore((s) => s.taxLosses[String(year)])
  const setTaxLoss = useBookStore((s) => s.setTaxLoss)
  const shown = stored === undefined ? "" : formatMoneyPlain(stored)
  const [draft, setDraft] = React.useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const text = draft.trim()
    setDraft(null)
    if (text === "") {
      /* A year outside the book has nothing to fall back on, so it stays. */
      if (book !== null) setTaxLoss(year, null)
      return
    }
    const cents = evalAmount(text)
    if (cents !== null && cents >= 0) setTaxLoss(year, cents)
  }

  return (
    <TableRow>
      <TableCell className="tabular font-medium">{year}</TableCell>
      <TableCell className="tabular text-right">
        {book === null ? "–" : f.money(book)}
      </TableCell>
      <TableCell className="text-right">
        <div className="ml-auto w-36">
          <EuroInput
            aria-label={f.t("losses.confirmedFor", { y: year })}
            placeholder={book === null ? "" : formatMoneyPlain(book)}
            value={draft ?? shown}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
            }}
          />
        </div>
      </TableCell>
      <TableCell className="tabular text-right">
        {f.money(origin?.used ?? 0)}
      </TableCell>
      <TableCell className="tabular text-right">
        {origin?.expired ? (
          <Pill tone="expense">
            {f.t("losses.expired", { a: f.money(origin.expired) })}
          </Pill>
        ) : (
          f.money(origin?.left ?? 0)
        )}
      </TableCell>
      <TableCell className="tabular">
        <span className="flex items-center gap-2">
          {year + LOSS_YEARS}
          {book === null ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("losses.remove", { y: year })}
              onClick={() => setTaxLoss(year, null)}
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </span>
      </TableCell>
    </TableRow>
  )
}

/**
 * A confirmed loss from a year before the book, from the tax decision. Only the
 * ten years that can still reach the book's first year are offered.
 */
function AddEarlierLoss({ before }: { before: number }) {
  const f = useFormatters()
  const setTaxLoss = useBookStore((s) => s.setTaxLoss)
  const [year, setYear] = React.useState(String(before - 1))
  const [amount, setAmount] = React.useState("")
  const y = Number(year)
  const cents = evalAmount(amount)
  const ok =
    Number.isInteger(y) &&
    y >= before - LOSS_YEARS &&
    y < before &&
    cents !== null &&
    cents > 0

  const add = () => {
    if (!ok || cents === null) return
    setTaxLoss(y, cents)
    setAmount("")
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {f.t("losses.earlierYear")}
        <Input
          className="w-24"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {f.t("losses.earlierAmount")}
        <div className="w-36">
          <EuroInput
            aria-label={f.t("losses.earlierAmount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </label>
      <Button variant="outline" disabled={!ok} onClick={add}>
        <PlusIcon data-icon="inline-start" />
        {f.t("losses.addEarlier")}
      </Button>
    </div>
  )
}
