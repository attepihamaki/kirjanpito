"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { RecurringAmountInput } from "@/components/settings/recurring-settings"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useToday } from "@/hooks/use-today"
import { categoryLabel } from "@/lib/domain/accounts"
import { EMPTY_YEAR_END, type YearEnd } from "@/lib/domain/form5-balance"
import {
  carryOverYearEnd,
  newYearSummary,
  type NewYearSummary,
} from "@/lib/domain/new-year"
import { monthKey } from "@/lib/domain/recurring"
import { indexCategories } from "@/lib/domain/types"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

type Step = "carried" | "figures" | "recurring"

const STEPS: readonly Step[] = ["carried", "figures", "recurring"]

const STEP_LABEL = {
  carried: "newYear.stepCarried",
  figures: "newYear.stepFigures",
  recurring: "newYear.stepRecurring",
} as const satisfies Record<Step, string>

const FIELDS = [
  ["goods", "balance.goods"],
  ["otherCurrent", "balance.otherCurrent"],
  ["otherFixed", "balance.otherFixed"],
  ["cash", "balance.cash"],
  ["otherFinancial", "balance.otherFinancial"],
  ["loanCurrent", "balance.loanCurrent"],
  ["otherCurrentDebt", "balance.otherCurrentDebt"],
  ["otherLongDebt", "balance.otherLongDebt"],
] as const satisfies readonly (readonly [keyof YearEnd, string])[]

/**
 * Opening the selected year (§8.14): what carries over from the year before,
 * the year-end figures as editable starting values, and the recurring
 * templates. It reads the book and writes only through the same store actions
 * Varat ja velat and Toistuvat use.
 */
export function NewYearDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "new-year") return null
  return <NewYearForm year={dialog.year} />
}

function NewYearForm({ year }: { year: number }) {
  const f = useFormatters()
  const today = useToday()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const openDialog = useBookStore((s) => s.openDialog)
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const yearEnd = useBookStore((s) => s.yearEnd)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const recurring = useBookStore((s) => s.recurring)
  const traderType = useBookStore((s) => s.traderType)
  const [step, setStep] = React.useState<Step>("carried")

  const summary = React.useMemo(
    () =>
      newYearSummary({
        entries,
        cats: indexCategories(cats),
        year,
        assetOpening,
        loanOpening,
        yearEnd,
        form5Filed,
        recurring,
        traderType,
      }),
    [
      entries,
      cats,
      year,
      assetOpening,
      loanOpening,
      yearEnd,
      form5Filed,
      recurring,
      traderType,
    ]
  )

  // The current month inside the year, else its first: nothing is due before.
  const month = today.startsWith(`${year}-`)
    ? today.slice(0, 7)
    : monthKey(year, 1)

  const stepIndex = STEPS.indexOf(step)
  const last = stepIndex === STEPS.length - 1

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{f.t("newYear.title", { y: year })}</DialogTitle>
          <DialogDescription>{f.t("newYear.intro")}</DialogDescription>
        </DialogHeader>

        <ToggleGroup
          aria-label={f.t("newYear.steps")}
          className="grid w-full grid-cols-3 rounded-lg bg-muted p-1"
          value={[step]}
          onValueChange={(next) => {
            const picked = next[0] as Step | undefined
            if (picked) setStep(picked)
          }}
        >
          {STEPS.map((s, i) => (
            <ToggleGroupItem
              key={s}
              value={s}
              className="gap-2 hover:bg-card/60 aria-pressed:bg-card aria-pressed:shadow-xs"
            >
              <span className="tabular text-muted-foreground">{i + 1}</span>
              {f.t(STEP_LABEL[s])}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {step === "carried" ? <CarriedStep summary={summary} /> : null}
          {step === "figures" ? <FiguresStep summary={summary} /> : null}
          {step === "recurring" ? <RecurringStep /> : null}
        </div>

        <DialogFooter>
          {stepIndex > 0 ? (
            <Button
              variant="outline"
              onClick={() => setStep(STEPS[stepIndex - 1])}
            >
              {f.t("statement.yearEndBack")}
            </Button>
          ) : null}
          {step === "recurring" ? (
            <Button
              variant="outline"
              disabled={recurring.length === 0}
              onClick={() => openDialog({ kind: "recurring", month })}
            >
              {f.t("newYear.recurringBook", {
                m: `${f.month(Number(month.slice(5, 7)) - 1)} ${year}`,
              })}
            </Button>
          ) : null}
          {last ? (
            <Button onClick={closeDialog}>{f.t("newYear.done")}</Button>
          ) : (
            <Button onClick={() => setStep(STEPS[stepIndex + 1])}>
              {f.t("statement.yearEndNext")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  title,
  sub,
  value,
}: {
  title: string
  sub: string
  value: React.ReactNode
}) {
  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="tabular shrink-0 text-sm font-medium">{value}</div>
    </li>
  )
}

function CarriedStep({ summary: s }: { summary: NewYearSummary }) {
  const f = useFormatters()
  const p = String(s.previous)
  return (
    <div className="flex flex-col gap-3">
      {!s.previousHasEntries ? (
        <p className="text-sm text-muted-foreground">
          {f.t("newYear.noPrevious", { p })}
        </p>
      ) : null}
      <ul className="divide-y rounded-lg border">
        <Row
          title={f.t("newYear.previousResult", { p })}
          sub={f.t("newYear.previousResultSub")}
          value={<Money cents={s.previousResult} />}
        />
        <Row
          title={f.t("newYear.assetPool")}
          sub={f.t("newYear.assetPoolSub", { y: s.year })}
          value={<Money cents={s.assetPool} />}
        />
        <Row
          title={f.t("newYear.loans")}
          sub={f.t("newYear.loansSub", { d: f.date(`${s.previous}-12-31`) })}
          value={<Money cents={s.loans} />}
        />
        <Row
          title={f.t("newYear.openItems")}
          sub={f.t("newYear.openItemsSub", {
            r: f.money(s.receivables),
            p: f.money(s.payables),
          })}
          value={s.openCount}
        />
        <Row
          title={f.t("newYear.filed", { p })}
          sub={
            s.previousFiledOn
              ? f.t("newYear.filedYes", { d: f.date(s.previousFiledOn) })
              : f.t("newYear.filedNo")
          }
          value={null}
        />
      </ul>
      <p className="text-xs text-muted-foreground">
        {f.t("newYear.carriedNote")}
      </p>
    </div>
  )
}

function FiguresStep({ summary: s }: { summary: NewYearSummary }) {
  const f = useFormatters()
  const yearEnd = useBookStore((st) => st.yearEnd)
  const setYearEnd = useBookStore((st) => st.setYearEnd)
  const previous = yearEnd[String(s.previous)] ?? EMPTY_YEAR_END
  const current = yearEnd[String(s.year)] ?? EMPTY_YEAR_END
  const carry = carryOverYearEnd(yearEnd, s.year, s.locked)

  const copy = async () => {
    if (!carry) return
    if (carry.replaces) {
      const ok = await confirm({
        title: f.t("newYear.copyTitle"),
        message: f.t("newYear.copyMessage", { y: s.year, p: s.previous }),
        confirmLabel: f.t("newYear.copyConfirm"),
        cancelLabel: f.t("common.cancel"),
        destructive: true,
      })
      if (!ok) return
    }
    setYearEnd(s.year, carry.values)
    toast.add({ title: f.t("newYear.copied", { p: s.previous }) })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {f.t("newYear.figuresHint")}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 text-left font-normal" />
            <th className="tabular py-1 text-right font-normal">
              {s.previous}
            </th>
            <th className="tabular py-1 text-right font-normal">{s.year}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {FIELDS.map(([key, label]) => (
            <tr key={key}>
              <td className="py-1.5 pr-3">{f.t(label)}</td>
              <td className="tabular py-1.5 text-right text-muted-foreground">
                <Money cents={previous[key]} />
              </td>
              <td className="tabular py-1.5 text-right">
                <Money cents={current[key]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.locked ? (
        <p className="text-sm text-warning">
          {f.t("newYear.copyLocked", { y: s.year })}
        </p>
      ) : !carry ? (
        <p className="text-sm text-muted-foreground">
          {f.t("newYear.copyNone", { p: s.previous })}
        </p>
      ) : null}
      <div>
        <Button variant="outline" disabled={!carry} onClick={() => void copy()}>
          {f.t("newYear.copy", { p: s.previous })}
        </Button>
      </div>
    </div>
  )
}

function RecurringStep() {
  const f = useFormatters()
  const recurring = useBookStore((s) => s.recurring)
  const cats = useBookStore((s) => s.cats)
  const catMap = indexCategories(cats)

  if (recurring.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {f.t("newYear.recurringEmpty")}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {f.t("newYear.recurringHint")}
      </p>
      <ul className="divide-y rounded-lg border">
        {recurring.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-4 px-4 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.description}</p>
              <p className="truncate text-xs text-muted-foreground">
                {categoryLabel(catMap.get(r.catId), f.lang)}
              </p>
            </div>
            <RecurringAmountInput template={r} />
          </li>
        ))}
      </ul>
    </div>
  )
}
