"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, CheckIcon } from "lucide-react"

import { CheckRow } from "@/components/common/check-row"
import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { useDescribeYearEnd } from "@/components/statement/use-describe-year-end"
import { Button } from "@/components/ui/button"
import { useToday } from "@/hooks/use-today"
import { assetSchedule } from "@/lib/domain/assets"
import { balancesAt } from "@/lib/domain/open-items"
import { indexCategories } from "@/lib/domain/types"
import { bookStartDate, vatTimeline } from "@/lib/domain/vat-deadline"
import type { YearEndFinding, YearEndTopic } from "@/lib/domain/year-end"
import type { MessageKey } from "@/lib/i18n/messages"
import { periodLabel, periodStatusText } from "@/lib/i18n/period-label"
import { APP_ROUTES, INVOICE_ROUTES, STATEMENT_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

const TOPIC_TEXT = {
  entries: {
    title: "statement.yearEndStepEntries",
    hint: "statement.yearEndTopicEntries",
    open: "statement.yearEndGoEntries",
  },
  vat: {
    title: "statement.yearEndStepVat",
    hint: "statement.yearEndTopicVat",
    open: "statement.yearEndGoVat",
  },
  open: {
    title: "statement.yearEndStepOpen",
    hint: "statement.yearEndTopicOpen",
    open: "statement.yearEndGoOpen",
  },
  assets: {
    title: "statement.yearEndStepAssets",
    hint: "statement.yearEndTopicAssets",
    open: "statement.yearEndGoAssets",
  },
  balance: {
    title: "statement.yearEndStepBalance",
    hint: "statement.yearEndTopicBalance",
    open: "statement.yearEndGoBalance",
  },
} as const satisfies Record<
  YearEndTopic,
  { title: MessageKey; hint: MessageKey; open: MessageKey }
>

/** The view each topic is put right in. */
const TOPIC_ROUTE: Record<YearEndTopic, string> = {
  entries: APP_ROUTES.ledger,
  vat: APP_ROUTES.vat,
  open: INVOICE_ROUTES.aging,
  assets: STATEMENT_ROUTES.assets,
  balance: STATEMENT_ROUTES.balance,
}

/** The step title of a topic, for the dialog's step list. */
export function topicTitle(topic: YearEndTopic): MessageKey {
  return TOPIC_TEXT[topic].title
}

/**
 * One topic of the year-end walk-through (§8.8): what to check, the year's
 * own figures for it, and the findings the rules raised, each with its way
 * in. The figures are there to compare with the world outside the book (a
 * bank's loan statement, the returns filed in OmaVero), which no rule can.
 */
export function YearEndTopicStep({
  topic,
  year,
  findings,
  loans,
}: {
  topic: YearEndTopic
  year: number
  findings: readonly YearEndFinding[]
  /** The loans at the year's end, as Form 5's balance sheet has them. */
  loans: number
}) {
  const f = useFormatters()
  const router = useRouter()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const describeFinding = useDescribeYearEnd()
  const text = TOPIC_TEXT[topic]

  const go = () => {
    const s = useBookStore.getState()
    if (s.year !== year) s.setYear(year)
    closeDialog()
    router.push(TOPIC_ROUTE[topic])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-heading font-semibold">{f.t(text.title)}</h3>
        <p className="text-sm text-muted-foreground">{f.t(text.hint)}</p>
      </div>

      <TopicFacts topic={topic} year={year} loans={loans} />

      {findings.length ? (
        <ul className="divide-y rounded-lg border">
          {findings.map((item) => {
            const d = describeFinding(item, year)
            return (
              <CheckRow
                key={
                  item.ruleId === "entryCheck" ? item.data.check : item.ruleId
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
          {f.t("statement.yearEndTopicClear")}
        </p>
      )}

      <div>
        <Button variant="outline" size="sm" onClick={go}>
          {f.t(text.open)}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

/** A list of label and amount pairs, as the topics show their figures. */
function Figures({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-lg bg-muted/50 px-4 py-3.5 text-sm">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="tabular text-right">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

function TopicFacts({
  topic,
  year,
  loans,
}: {
  topic: YearEndTopic
  year: number
  loans: number
}) {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const bookEnd = useBookStore((s) => s.bookEnd)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const today = useToday()
  const map = React.useMemo(() => indexCategories(cats), [cats])

  if (topic === "vat") {
    const first = entries.reduce<string | null>(
      (min, e) => (min === null || e.date < min ? e.date : min),
      null
    )
    const periods = vatTimeline(
      vatPeriod,
      bookStartDate(bookStart, first),
      today,
      vatFiled,
      bookEnd
    ).filter((p) => p.year === year && p.status !== "before")
    if (!periods.length) return null
    return (
      <Figures
        rows={periods.map((p) => [
          periodLabel(f, p),
          periodStatusText(f, p.status, p),
        ])}
      />
    )
  }

  if (topic === "open") {
    const open = balancesAt(entries, map, `${year}-12-31`)
    return (
      <Figures
        rows={[
          [
            f.t("statement.yearEndReceivables"),
            <Money key="r" cents={open.receivables} />,
          ],
          [
            f.t("statement.yearEndPayables"),
            <Money key="p" cents={open.payables} />,
          ],
          [f.t("statement.yearEndLoans"), <Money key="l" cents={loans} />],
        ]}
      />
    )
  }

  if (topic === "assets") {
    const asset = assetSchedule(entries, map, assetOpening, year).find(
      (a) => a.year === year
    )
    if (!asset) return null
    return (
      <Figures
        rows={[
          [
            f.t("statement.yearEndAssetOpening"),
            <Money key="o" cents={asset.opening} />,
          ],
          [
            f.t("statement.yearEndAssetAdditions"),
            <Money key="a" cents={asset.additions} />,
          ],
          [
            f.t("statement.yearEndAssetMaximum"),
            <Money key="m" cents={asset.maximum} />,
          ],
          [
            f.t("statement.yearEndAssetTaken"),
            <Money key="t" cents={asset.taken} />,
          ],
          [
            f.t("statement.yearEndAssetClosing"),
            <Money key="c" cents={asset.closing} />,
          ],
        ]}
      />
    )
  }

  return null
}
