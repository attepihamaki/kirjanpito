"use client"

import { form5Help } from "@/lib/domain/field-help"
import * as React from "react"
import {
  AlertCircleIcon,
  CheckIcon,
  CircleIcon,
  DownloadIcon,
  LockIcon,
} from "lucide-react"

import { CheckRow } from "@/components/common/check-row"
import { TaxForm } from "@/components/common/tax-form"
import { useFormatters } from "@/components/lang-provider"
import { useDescribeYearEnd } from "@/components/statement/use-describe-year-end"
import { Form5FileDownload } from "@/components/statement/form5-file-download"
import {
  topicTitle,
  YearEndTopicStep,
} from "@/components/statement/year-end-topic"
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
import { useCommandCtx } from "@/hooks/use-commands"
import { exportRetentionPackage } from "@/lib/commands/retention-commands"
import { useStatementDrill } from "@/hooks/use-figure-drill"
import { useToday } from "@/hooks/use-today"
import {
  canLockYear,
  topicFindings,
  topicStatus,
  yearEndFindings,
  yearWideFindings,
  YEAR_END_TOPICS,
  type TopicStatus,
  type YearEndTopic,
} from "@/lib/domain/year-end"
import type { MessageKey } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"
import { useReceiptHashStore } from "@/stores/receipt-hash-store"

type Step = YearEndTopic | "values" | "lock" | "package"

const STEPS: readonly Step[] = [...YEAR_END_TOPICS, "values", "lock", "package"]

const STEP_LABEL = {
  values: "statement.yearEndStepValues",
  lock: "statement.yearEndStepLock",
  package: "statement.yearEndStepPackage",
} as const satisfies Record<Exclude<Step, YearEndTopic>, MessageKey>

const isTopic = (step: Step): step is YearEndTopic =>
  (YEAR_END_TOPICS as readonly Step[]).includes(step)

/** The mark beside a step: how its topic stands, or the lock once the year is filed. */
function StepMark({
  status,
  done,
}: {
  status: TopicStatus | null
  done: boolean
}) {
  const tone =
    status === "blocker"
      ? "bg-expense-subtle text-expense"
      : status === "warn"
        ? "bg-warning/15 text-warning"
        : done || status === "clear" || status === "info"
          ? "bg-income/15 text-income"
          : "bg-muted text-muted-foreground"
  const Icon =
    status === "blocker" || status === "warn"
      ? AlertCircleIcon
      : done || status === "clear" || status === "info"
        ? CheckIcon
        : CircleIcon
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full",
        tone
      )}
    >
      <Icon className="size-3" strokeWidth={3} />
    </span>
  )
}

/**
 * Closing a year (§8.8) as one walk-through: a step for each topic the year's
 * checks fall under (the vouchers, VAT, what is open on 31 December, the fixed
 * assets and the balance sheet), then the amounts to copy into OmaVero, the
 * one step that marks the return as filed and locks every voucher of the year
 * (§8.11), and the retention package. Each topic's mark is worked out from the
 * checks, so it is never ticked by hand and never out of date. It opens from
 * the income statement and holds nothing of its own beyond which step is
 * showing.
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
  const [step, setStep] = React.useState<Step>("entries")
  const ctx = useCommandCtx()

  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const dirty = useBookStore((s) => s.dirty)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const bookEnd = useBookStore((s) => s.bookEnd)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const changeLog = useBookStore((s) => s.changeLog)
  const receiptHashes = useReceiptHashStore((s) => s.hashes)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const yearEnd = useBookStore((s) => s.yearEnd[year])
  const previousYearEnd = useBookStore((s) => s.yearEnd[year - 1])
  const inventory = useBookStore((s) => s.inventory)

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
        bookEnd,
        vatFiled,
        changeLog,
        receiptHashes,
        assetOpening,
        yearEnd,
        inventory,
        openingStock: previousYearEnd
          ? previousYearEnd.goods + previousYearEnd.otherCurrent
          : 0,
      }),
    [
      entries,
      cats,
      year,
      today,
      dirty,
      vatPeriod,
      bookStart,
      bookEnd,
      vatFiled,
      changeLog,
      receiptHashes,
      assetOpening,
      yearEnd,
      previousYearEnd,
      inventory,
    ]
  )
  const canLock = canLockYear(items)
  const warnings = items.filter((i) => i.severity === "warn").length
  const yearWide = yearWideFindings(items)
  const statuses = Object.fromEntries(
    YEAR_END_TOPICS.map((t) => [t, topicStatus(items, t)])
  ) as Record<YearEndTopic, TopicStatus>
  const settled = YEAR_END_TOPICS.filter(
    (t) => statuses[t] === "clear" || statuses[t] === "info"
  ).length

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
  /* On a phone the steps are a strip that scrolls; keep the current one in view. */
  const currentRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [step])

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="gap-5 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {f.t("statement.yearEndTitle", { y: year })}
          </DialogTitle>
          <DialogDescription>{f.t("statement.yearEndIntro")}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {f.t("statement.yearEndProgress", {
            n: settled,
            m: YEAR_END_TOPICS.length,
          })}
        </p>

        {yearWide.length ? (
          <ul className="divide-y rounded-lg border">
            {yearWide.map((item) => {
              const d = describeFinding(item, year)
              return (
                <CheckRow
                  key={item.ruleId}
                  severity={item.severity}
                  title={d.title}
                  sub={d.sub}
                />
              )
            })}
          </ul>
        ) : null}

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
          <nav aria-label={f.t("statement.yearEndSteps")} className="min-w-0">
            <ol className="scroll-strip gap-1 rounded-lg bg-muted p-1.5 sm:flex sm:flex-col sm:self-start sm:overflow-visible">
              {STEPS.map((s, i) => (
                <li key={s} className="shrink-0">
                  <button
                    type="button"
                    aria-current={s === step ? "step" : undefined}
                    ref={s === step ? currentRef : undefined}
                    onClick={() => setStep(s)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm whitespace-nowrap transition-colors hover:bg-card/60 sm:whitespace-normal",
                      s === step && "bg-card font-medium shadow-xs"
                    )}
                  >
                    <StepMark
                      status={isTopic(s) ? statuses[s] : null}
                      done={
                        (s === "lock" && Boolean(filedOn)) ||
                        (s === "values" && Boolean(filedOn))
                      }
                    />
                    <span className="tabular text-muted-foreground">
                      {i + 1}
                    </span>
                    {f.t(isTopic(s) ? topicTitle(s) : STEP_LABEL[s])}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-h-[60vh] min-w-0 overflow-y-auto pr-2">
            {isTopic(step) ? (
              <YearEndTopicStep
                key={step}
                topic={step}
                year={year}
                findings={topicFindings(items, step)}
                loans={balance.loans}
              />
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
          {isTopic(step) || step === "values" ? (
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
