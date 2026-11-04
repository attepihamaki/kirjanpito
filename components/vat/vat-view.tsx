"use client"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormatters } from "@/components/lang-provider"
import { VatReturnButton } from "@/components/vat/vat-return-button"
import { useVatPeriod } from "@/hooks/use-vat-period"
import type { VatReport, VatSide } from "@/lib/domain/vat"
import { useBookStore } from "@/stores/book-store"

export function VatView() {
  const f = useFormatters()
  const { report } = useVatPeriod()
  const refund = report.due < 0
  const eu = report.euPurchases
  const euTax = eu.goods.vat + eu.services.vat
  const hasEu = eu.goods.net !== 0 || eu.services.net !== 0

  return (
    <div className="flex flex-col gap-5">
      {/* Result banner */}
      <Panel bodyClassName="flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {refund ? f.t("vat.refundableTitle") : f.t("vat.payableTitle")}
          </p>
          <Money
            cents={Math.abs(report.due)}
            tone={refund ? "income" : undefined}
            className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {f.t(hasEu ? "vat.formulaEu" : "vat.formula", {
              a: f.money(report.sales.total.vat + euTax),
              b: f.money(report.purchases.total.vat + eu.deductible),
            })}
          </p>
        </div>
        <VatReturnButton className="print-hidden" />
      </Panel>

      <VatAnomalyAlert report={report} />

      <div className="grid gap-5 lg:grid-cols-2">
        <RateTable title={f.t("vat.salesTable")} side={report.sales} />
        <RateTable
          title={f.t("vat.purchaseTable")}
          side={report.purchases}
          // §6.1: 0% purchases are not deductible, so the row is hidden.
          skipZero
        />
      </div>

      <Panel title={f.t("vat.otherSales")}>
        <dl className="divide-y">
          <OtherRow
            label={f.t("vat.euGoodsSales")}
            cents={report.otherSales.euGoods}
          />
          <OtherRow
            label={f.t("vat.euServicesSales")}
            cents={report.otherSales.euServices}
          />
          {report.otherSales.eu !== 0 ? (
            <OtherRow
              label={f.t("vat.euUnsortedSales")}
              cents={report.otherSales.eu}
            />
          ) : null}
          <OtherRow
            label={f.t("vat.nonEuSales")}
            cents={report.otherSales.nonEu}
          />
          <OtherRow
            label={f.t("vat.reverseChargeSales")}
            cents={report.otherSales.reverse}
          />
        </dl>
      </Panel>

      {hasEu ? (
        <Panel title={f.t("vat.euPurchases")}>
          <dl className="divide-y">
            <OtherRow
              label={f.t("vat.euGoodsPurchases")}
              cents={eu.goods.net}
            />
            <OtherRow label={f.t("vat.euGoodsTax")} cents={eu.goods.vat} />
            <OtherRow
              label={f.t("vat.euServicesPurchases")}
              cents={eu.services.net}
            />
            <OtherRow
              label={f.t("vat.euServicesTax")}
              cents={eu.services.vat}
            />
            <OtherRow label={f.t("vat.euDeductible")} cents={eu.deductible} />
          </dl>
        </Panel>
      ) : null}

      <p className="text-xs text-muted-foreground">{f.t("vat.note")}</p>
    </div>
  )
}

/** The entry whose VAT the report left out, on either sub-page (§6.1). */
export function VatAnomalyAlert({ report }: { report: VatReport }) {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  if (!report.anomalies.length) return null

  return (
    <Alert>
      <AlertDescription>
        {f.t("vat.exemptSaleWarning", {
          x:
            entries.find((e) => e.id === report.anomalies[0].entryId)
              ?.description || f.t("ledger.noDescription"),
        })}
      </AlertDescription>
    </Alert>
  )
}

function RateTable({
  title,
  side,
  skipZero,
}: {
  title: string
  side: VatSide
  skipZero?: boolean
}) {
  const f = useFormatters()
  const rows = [...side.byRate.entries()].filter(
    ([rate, bucket]) =>
      !(skipZero && rate === 0) && (rate !== 0 || bucket.net !== 0 || !skipZero)
  )

  return (
    <Panel title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{f.t("common.rate")}</TableHead>
            <TableHead className="text-right">{f.t("ledger.colNet")}</TableHead>
            <TableHead className="text-right">{f.t("common.vat")}</TableHead>
            <TableHead className="text-right">{f.t("common.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([rate, bucket]) => (
            <TableRow key={rate}>
              <TableCell className="tabular">{f.rate(rate)}</TableCell>
              <TableCell className="text-right">
                <Money cents={bucket.net} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={bucket.vat} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={bucket.net + bucket.vat} />
              </TableCell>
            </TableRow>
          ))}
          {side.other.net !== 0 || side.other.vat !== 0 ? (
            <TableRow>
              <TableCell>{f.t("vat.otherRates")}</TableCell>
              <TableCell className="text-right">
                <Money cents={side.other.net} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={side.other.vat} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={side.other.net + side.other.vat} />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">{f.t("common.total")}</TableCell>
            <TableCell className="text-right font-medium">
              <Money cents={side.total.net} />
            </TableCell>
            <TableCell className="text-right font-medium">
              <Money cents={side.total.vat} />
            </TableCell>
            <TableCell className="text-right font-medium">
              <Money cents={side.total.net + side.total.vat} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  )
}

function OtherRow({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        <Money cents={cents} />
      </dd>
    </div>
  )
}
