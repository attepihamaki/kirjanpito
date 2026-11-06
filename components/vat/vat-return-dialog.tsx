"use client"

import { vatReturnHelp } from "@/lib/domain/field-help"
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  CheckIcon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react"

import { CHECK_TEXT } from "@/components/common/check-text"
import { TaxForm } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  useSettlementVisible,
  VatSettlementControl,
} from "@/components/vat/vat-settlement-control"
import { VatAnomalyAlert } from "@/components/vat/vat-view"
import { useVatDrill } from "@/hooks/use-figure-drill"
import { useToday } from "@/hooks/use-today"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { indexCategories } from "@/lib/domain/types"
import type { RuleSeverity } from "@/lib/domain/rules/engine"
import {
  canMarkFiled,
  vatCheckFindings,
  type VatCheckFinding,
} from "@/lib/domain/vat-checks"
import { filedKeys, filedOn, periodFromKey } from "@/lib/domain/vat-deadline"
import { vatReturnSections } from "@/lib/domain/vat-return"
import { periodLabel } from "@/lib/i18n/period-label"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore, type CheckFilter } from "@/stores/book-store"

type Step = "checks" | "values" | "file" | "pay"

const STEP_LABEL = {
  checks: "vat.returnStepChecks",
  values: "vat.returnStepValues",
  file: "vat.returnStepFile",
  pay: "vat.returnStepPay",
} as const satisfies Record<Step, string>

/**
 * Reporting a VAT period (§8.7): the checks that stand between it and the
 * return, the amounts to copy into OmaVero, the filed mark, and, once the
 * period is closed with tax to settle, the payment or refund. It opens from the
 * calculation and holds nothing of its own beyond which step is showing.
 */
export function VatReturnDialog() {
  const open = useBookStore((s) => s.dialog.kind === "vat-return")
  if (!open) return null
  return <VatReturnForm />
}

function VatReturnForm() {
  const f = useFormatters()
  const router = useRouter()
  const today = useToday()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const { label, report, current, currentStatus } = useVatPeriod()
  const settlementVisible = useSettlementVisible()
  const { fieldDrill } = useVatDrill()
  const [step, setStep] = React.useState<Step>("checks")

  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const dirty = useBookStore((s) => s.dirty)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const changeLog = useBookStore((s) => s.changeLog)

  const items = React.useMemo(
    () =>
      vatCheckFindings({
        entries,
        cats: indexCategories(cats),
        period: current,
        status: currentStatus,
        today,
        dirty,
        vatPeriod,
        bookStart,
        vatFiled,
        changeLog,
      }),
    [
      entries,
      cats,
      current,
      currentStatus,
      today,
      dirty,
      vatPeriod,
      bookStart,
      vatFiled,
      changeLog,
    ]
  )
  const sections = React.useMemo(() => vatReturnSections(report), [report])
  const canMark = canMarkFiled(items)
  const setVatFiled = useBookStore((s) => s.setVatFiled)
  const filed = filedOn(current, vatFiled)

  function unmarkFiled() {
    // The mark may have been made in another filing period (§6.5).
    for (const key of filedKeys(current, vatFiled)) setVatFiled(key, null)
  }

  const steps: readonly Step[] = settlementVisible
    ? ["checks", "values", "file", "pay"]
    : ["checks", "values", "file"]
  const stepIndex = steps.indexOf(step)
  const lastStep = stepIndex === steps.length - 1
  const showMark = step === "file" && currentStatus !== "before"

  function showInLedger(check: CheckFilter) {
    const s = useBookStore.getState()
    s.clearLedgerFilters()
    s.setMonth(0)
    s.setLedgerCheck(check)
    closeDialog()
    router.push(APP_ROUTES.ledger)
  }

  function describe(item: VatCheckFinding): {
    title: string
    sub: string
    action?: React.ReactNode
  } {
    switch (item.ruleId) {
      case "periodOngoing":
        return {
          title: f.t("vat.returnOngoing", { p: label }),
          sub: f.t("vat.returnOngoingSub", { d: f.date(current.due) }),
        }
      case "noEntries":
        return {
          title: f.t("vat.returnNoEntries", { p: label }),
          sub: f.t("vat.returnNoEntriesSub"),
        }
      case "unsaved":
        return {
          title: f.t("file.dirty"),
          sub: f.t("vat.returnUnsavedSub"),
        }
      case "entryCheck": {
        const text = CHECK_TEXT[item.data.check]
        return {
          title: f.t(text.title, { n: item.data.n }),
          sub: f.t(text.sub),
          action: (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showInLedger(item.data.check)}
            >
              {f.t("overview.showThem")}
            </Button>
          ),
        }
      }
      case "missingFiles":
        return {
          title: f.t("overview.missingFiles", { n: item.data.n }),
          sub: f.t("overview.missingFilesSub"),
        }
      case "earlierUnfiled": {
        const names = item.data.keys.map((key) => {
          const p = periodFromKey(key)
          return p ? periodLabel(f, p) : key
        })
        return {
          title: f.t("vat.returnEarlierUnfiled", { p: names.join(", ") }),
          sub: f.t("vat.returnEarlierUnfiledSub"),
        }
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{f.t("vat.returnDialogTitle", { p: label })}</DialogTitle>
          <DialogDescription>{f.t("vat.returnDialogIntro")}</DialogDescription>
        </DialogHeader>

        <ToggleGroup
          aria-label={f.t("vat.returnSteps")}
          className="grid w-full rounded-lg bg-muted p-1"
          style={{
            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          }}
          value={[step]}
          onValueChange={(next) => {
            const picked = next[0] as Step | undefined
            if (picked) setStep(picked)
          }}
        >
          {steps.map((s, i) => (
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
          {step === "checks" ? (
            items.length ? (
              <ul className="divide-y rounded-lg border">
                {items.map((item) => {
                  const d = describe(item)
                  return (
                    <CheckRow
                      key={item.ruleId === "entryCheck" ? item.data.check : item.ruleId}
                      severity={item.severity}
                      title={d.title}
                      sub={d.sub}
                      action={d.action}
                    />
                  )
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-income">
                <CheckIcon aria-hidden className="size-4" />
                {f.t("vat.returnAllClear")}
              </p>
            )
          ) : null}

          {step === "values" ? (
            <div className="flex flex-col gap-4">
              <VatAnomalyAlert report={report} />
              {report.sales.other.vat !== 0 ? (
                <Alert>
                  <AlertDescription>
                    {f.t("vat.returnOtherRate", {
                      v: f.money(report.sales.other.vat),
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}
              <TaxForm
                key={current.key}
                embedded
                kicker={f.t("vat.returnKicker", {
                  p: label,
                  d: f.date(current.due),
                })}
                title={f.t("vat.returnTitle")}
                intro={f.t("vat.returnIntro")}
                nothing={f.t("vat.returnNothing")}
                sections={sections}
                drill={(row) => fieldDrill(row, report.due)}
                help={(row) => vatReturnHelp(row.code)}
                notes={[f.t("vat.returnPurchases"), f.t("vat.returnCodes")]}
              />
            </div>
          ) : null}

          {step === "file" ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-heading font-semibold">
                {f.t("vat.returnFileTitle", { p: label })}
              </h3>
              {currentStatus !== "before" ? (
                <p className="text-sm text-muted-foreground">
                  {f.t("vat.returnFileHint")}
                </p>
              ) : null}
              {currentStatus === "before" ? (
                <p className="text-sm text-muted-foreground">
                  {f.t("vat.beforeStartHint")}
                </p>
              ) : filed ? (
                <p className="text-sm font-medium text-income">
                  {f.t("vat.filedOn", { d: f.date(filed) })}
                </p>
              ) : !canMark ? (
                <p className="text-sm text-expense">
                  {f.t("vat.returnOngoing", { p: label })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {f.t("vat.dueDate", { d: f.date(current.due) })}
                </p>
              )}
            </div>
          ) : null}

          {step === "pay" ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-heading font-semibold">
                {f.t("vat.returnStepSettle")}
              </h3>
              <VatSettlementControl />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {stepIndex > 0 ? (
            <Button
              variant="outline"
              onClick={() => setStep(steps[stepIndex - 1])}
            >
              {f.t("vat.returnBack")}
            </Button>
          ) : null}
          {showMark ? (
            filed ? (
              <Button variant="outline" onClick={unmarkFiled}>
                {f.t("vat.unmarkFiled")}
              </Button>
            ) : (
              <Button
                variant={lastStep ? "default" : "outline"}
                disabled={!canMark}
                onClick={() => setVatFiled(current.key, today)}
              >
                <CheckIcon data-icon="inline-start" />
                {f.t("vat.markFiled")}
              </Button>
            )
          ) : null}
          {!lastStep ? (
            <Button onClick={() => setStep(steps[stepIndex + 1])}>
              {f.t("vat.returnNext")}
            </Button>
          ) : !showMark || filed ? (
            <Button onClick={closeDialog}>{f.t("vat.returnDone")}</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const SEVERITY: Record<RuleSeverity, { icon: LucideIcon; tone: string }> = {
  blocker: { icon: AlertCircleIcon, tone: "bg-expense-subtle text-expense" },
  warn: { icon: AlertCircleIcon, tone: "bg-warning/15 text-warning" },
  info: { icon: InfoIcon, tone: "bg-muted text-muted-foreground" },
}

function CheckRow({
  severity,
  title,
  sub,
  action,
}: {
  severity: RuleSeverity
  title: string
  sub: string
  action?: React.ReactNode
}) {
  const { icon: Icon, tone } = SEVERITY[severity]
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn("mt-0.5 grid size-5 place-items-center rounded-full", tone)}
      >
        <Icon className="size-3" strokeWidth={3} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {action ?? <span />}
    </li>
  )
}
