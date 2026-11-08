"use client"

import { form5Help } from "@/lib/domain/field-help"
import * as React from "react"
import { CheckIcon, DownloadIcon, LockIcon } from "lucide-react"

import { CheckRow } from "@/components/common/check-row"
import { TaxForm } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { useDescribeYearEnd } from "@/components/statement/use-describe-year-end"
import { Form5FileDownload } from "@/components/statement/form5-file-download"
import { useForm5 } from "@/components/statement/use-form5"
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
import { useCommandCtx } from "@/hooks/use-commands"
import { exportRetentionPackage } from "@/lib/commands/retention-commands"
import { useStatementDrill } from "@/hooks/use-figure-drill"
import { useToday } from "@/hooks/use-today"
import { canLockYear, yearEndFindings } from "@/lib/domain/year-end"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

type Step = "checks" | "values" | "lock" | "package"

const STEPS: readonly Step[] = ["checks", "values", "lock", "package"]

const STEP_LABEL = {
  checks: "statement.yearEndStepChecks",
  values: "statement.yearEndStepValues",
  lock: "statement.yearEndStepLock",
  package: "statement.yearEndStepPackage",
} as const satisfies Record<Step, string>

/**
 * Closing a year (§8.8): the checks that stand between it and Form 5, the
 * amounts to copy into OmaVero, and the one step that marks the return as filed
 * and locks every voucher of the year (§8.11). It opens from the income
 * statement and holds nothing of its own beyond which step is showing.
 */
export function YearEndDialog() {
  const open = useBookStore((s) => s.dialog.kind === "year-end")
  if (!open) return null
  return <YearEndForm />
}

function YearEndForm() {
  const f = useFormatters()
  const today = useToday()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const setForm5Filed = useBookStore((s) => s.setForm5Filed)
  const { year, sections, balance } = useForm5()
  const { form5Drill } = useStatementDrill()
  const filedOn = useBookStore((s) => s.form5Filed[String(year)])
  const describeFinding = useDescribeYearEnd()
  const [step, setStep] = React.useState<Step>("checks")
  const ctx = useCommandCtx()

  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const dirty = useBookStore((s) => s.dirty)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const changeLog = useBookStore((s) => s.changeLog)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const yearEnd = useBookStore((s) => s.yearEnd[year])

  const items = React.useMemo(
    () =>
      yearEndFindings({
        entries,
        cats: indexCategories(cats),
        year,
        today,
        dirty,
        vatPeriod,
        bookStart,
        vatFiled,
        changeLog,
        assetOpening,
        yearEnd,
      }),
    [
      entries,
      cats,
      year,
      today,
      dirty,
      vatPeriod,
      bookStart,
      vatFiled,
      changeLog,
      assetOpening,
      yearEnd,
    ]
  )
  const canLock = canLockYear(items)
  const warnings = items.filter((i) => i.severity === "warn").length

  function lock() {
    setForm5Filed(year, today)
    setStep("package")
    const id = toast.add({
      title: f.t("statement.yearEndLocked", { y: year }),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          setForm5Filed(year, null)
        },
      },
    })
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {f.t("statement.yearEndTitle", { y: year })}
          </DialogTitle>
          <DialogDescription>{f.t("statement.yearEndIntro")}</DialogDescription>
        </DialogHeader>

        <ToggleGroup
          aria-label={f.t("statement.yearEndSteps")}
          className="grid w-full grid-cols-4 rounded-lg bg-muted p-1"
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
          {step === "checks" ? (
            items.length ? (
              <ul className="divide-y rounded-lg border">
                {items.map((item) => {
                  const d = describeFinding(item, year)
                  return (
                    <CheckRow
                      key={
                        item.ruleId === "entryCheck"
                          ? item.data.check
                          : item.ruleId
                      }
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
                {f.t("statement.yearEndAllClear")}
              </p>
            )
          ) : null}

          {step === "values" ? (
            <TaxForm
              key={year}
              embedded
              kicker={f.t("statement.form5Kicker", { y: String(year) })}
              title={f.t("statement.form5Title")}
              intro={f.t("statement.form5Intro")}
              nothing={f.t("statement.form5Nothing")}
              sections={sections}
              drill={form5Drill}
              help={(row) => form5Help(row.code)}
              notes={[
                f.t("statement.form5Assumed"),
                f.t("statement.form5Missing"),
                f.t("balance.notBank"),
                f.t("balance.missing"),
                f.t("statement.form5Payroll"),
              ]}
            >
              <p className="text-sm text-muted-foreground">
                {f.t("balance.figures", {
                  r: f.money(balance.receivables),
                  p: f.money(balance.payables),
                  l: f.money(balance.loans),
                  m: f.money(balance.machinery),
                })}
              </p>
            </TaxForm>
          ) : null}

          {step === "values" ? <Form5FileDownload /> : null}

          {step === "lock" ? (
            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 font-heading font-semibold">
                <LockIcon aria-hidden className="size-4" />
                {f.t("statement.yearEndLockTitle", { y: year })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {f.t("statement.form5FileHint", { y: year })}
              </p>
              {filedOn ? (
                <p className="text-sm font-medium text-income">
                  {f.t("statement.form5FiledOn", { d: f.date(filedOn) })}
                </p>
              ) : !canLock ? (
                <p className="text-sm text-expense">
                  {f.t("statement.yearEndOngoing", { y: year })}
                </p>
              ) : warnings ? (
                <p className="text-sm text-warning">
                  {f.t("statement.yearEndLockWarn", { n: warnings })}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "package" ? (
            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 font-heading font-semibold">
                <DownloadIcon aria-hidden className="size-4" />
                {f.t("statement.yearEndPackageTitle", { y: year })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {f.t("statement.yearEndPackageHint")}
              </p>
              {!filedOn ? (
                <p className="text-sm text-warning">
                  {f.t("statement.yearEndPackageLockFirst")}
                </p>
              ) : null}
              <div>
                <Button
                  variant="outline"
                  disabled={!filedOn}
                  onClick={() => void exportRetentionPackage(ctx, year)}
                >
                  <DownloadIcon data-icon="inline-start" />
                  {f.t("overview.yearPackage")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {step !== "checks" ? (
            <Button
              variant="outline"
              onClick={() => setStep(STEPS[stepIndex - 1])}
            >
              {f.t("statement.yearEndBack")}
            </Button>
          ) : null}
          {step === "checks" || step === "values" ? (
            <Button onClick={() => setStep(STEPS[stepIndex + 1])}>
              {f.t("statement.yearEndNext")}
            </Button>
          ) : step === "package" ? (
            <Button onClick={closeDialog}>{f.t("common.close")}</Button>
          ) : filedOn ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setForm5Filed(year, null)
                  closeDialog()
                }}
              >
                {f.t("vat.unmarkFiled")}
              </Button>
              <Button onClick={() => setStep("package")}>
                {f.t("statement.yearEndNext")}
              </Button>
            </>
          ) : (
            <Button disabled={!canLock} onClick={lock}>
              <LockIcon data-icon="inline-start" />
              {f.t("statement.yearEndLockAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
