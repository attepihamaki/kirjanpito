"use client"

import * as React from "react"
import { ArrowRightIcon } from "lucide-react"

import { ButtonLink } from "@/components/common/button-link"
import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { useOverviewData } from "@/components/overview/overview-data"
import { advanceTaxPaid } from "@/lib/domain/advance-tax"
import {
  estimateIncomeTax,
  estimateYel,
  incomeTaxRow,
  yearPace,
} from "@/lib/domain/income-tax"
import { lossAvailable } from "@/lib/domain/tax-loss"
import { SETTINGS_ROUTES } from "@/lib/site"
import { useLossInput } from "@/hooks/use-loss-input"
import { useBookStore } from "@/stores/book-store"

/**
 * The income tax and YEL the business brings this year (§6.14), on the
 * year's scale and the details in Asetukset → Kalenteri: the tax on the
 * profit so far, the whole year at the same pace, what is left to set aside
 * after the advance tax booked (line 365), and the YEL contribution.
 */
export function TaxWidget() {
  const f = useFormatters()
  const data = useOverviewData()
  const profile = useBookStore((s) => s.payMonths.taxProfile)
  const { year, entries, statement, elapsedMonths } = data
  const row = incomeTaxRow(year)
  const losses = useLossInput()

  const figures = React.useMemo(() => {
    if (!row) return null
    /* Earlier confirmed losses come off the profit first (§6.15). */
    const afterLosses = (profit: number) =>
      profit - lossAvailable(losses, year, profit)
    const toDate = estimateIncomeTax(
      afterLosses(statement.result),
      profile,
      row
    )
    if (!toDate) return null
    const pace = estimateIncomeTax(
      afterLosses(yearPace(statement.result, elapsedMonths)),
      profile,
      row
    )
    return {
      toDate,
      pace: elapsedMonths > 0 && elapsedMonths < 12 ? pace : null,
      yel: estimateYel(profile, row),
      paid: advanceTaxPaid(entries, year),
    }
  }, [row, statement.result, profile, elapsedMonths, entries, year, losses])

  const settingsLink = (label: string) => (
    <ButtonLink
      variant="link"
      size="sm"
      className="px-0"
      href={SETTINGS_ROUTES.calendar}
    >
      {label}
      <ArrowRightIcon data-icon="inline-end" />
    </ButtonLink>
  )

  if (!row || !figures) {
    return (
      <Panel bodyClassName="flex flex-col items-start gap-2 p-5">
        <p className="text-sm text-muted-foreground">
          {row
            ? f.t("taxEstimate.setUp")
            : f.t("taxEstimate.noYear", { y: year })}
        </p>
        {row ? settingsLink(f.t("taxEstimate.setUpAction")) : null}
      </Panel>
    )
  }

  const { toDate, pace, yel, paid } = figures
  const target = (pace ?? toDate).businessTax
  const left = target - paid
  const p = toDate.parts

  return (
    <Panel
      className="flex flex-1 flex-col"
      bodyClassName="flex flex-1 flex-col gap-4 p-5"
    >
      <div>
        <p className="text-sm text-muted-foreground">
          {f.t("taxEstimate.toDate")}
        </p>
        <Money
          cents={toDate.businessTax}
          className="mt-1 block font-heading text-3xl font-semibold tracking-tight"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          {f.t("taxEstimate.rate", {
            r: f.rate(toDate.rate),
          })}
        </p>
      </div>

      <dl className="grid gap-y-1.5 text-sm">
        {pace ? (
          <Row label={f.t("taxEstimate.pace")}>
            <Money cents={pace.businessTax} />
          </Row>
        ) : null}
        <Row label={f.t("taxEstimate.paid")}>
          <Money cents={paid} />
        </Row>
        <Row
          label={f.t(left > 0 ? "taxEstimate.setAside" : "taxEstimate.covered")}
        >
          <Money
            cents={Math.abs(left)}
            tone={left > 0 ? undefined : "income"}
          />
        </Row>
        {yel ? (
          <Row label={f.t("taxEstimate.yel")}>
            {f.t("taxEstimate.yelValue", {
              m: f.money(yel.monthly),
              r: f.rate(yel.rate),
            })}
          </Row>
        ) : null}
      </dl>
      {yel?.belowMinimum ? (
        <p className="text-sm text-muted-foreground">
          {f.t("taxEstimate.yelBelow", { x: f.money(row.yelMinIncome) })}
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {f.t("taxEstimate.details")}
        </summary>
        <dl className="mt-2 grid gap-y-1">
          <Row label={f.t("taxEstimate.entrepreneur")}>
            <Money cents={-toDate.entrepreneurDeduction} />
          </Row>
          <Row label={f.t("taxEstimate.state")}>
            <Money cents={p.state} />
          </Row>
          <Row label={f.t("taxEstimate.municipal")}>
            <Money cents={p.municipal} />
          </Row>
          {p.church ? (
            <Row label={f.t("taxEstimate.church")}>
              <Money cents={p.church} />
            </Row>
          ) : null}
          <Row label={f.t("taxEstimate.health")}>
            <Money cents={p.healthCare + p.dailyAllowance} />
          </Row>
          <Row label={f.t("taxEstimate.credit")}>
            <Money cents={-p.credit} />
          </Row>
          {toDate.withoutBusiness ? (
            <Row label={f.t("taxEstimate.other")}>
              <Money cents={-toDate.withoutBusiness} />
            </Row>
          ) : null}
        </dl>
      </details>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {f.t("taxEstimate.note")}
        </p>
        {settingsLink(f.t("calendar.profileTitle"))}
      </div>
    </Panel>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{children}</dd>
    </div>
  )
}
