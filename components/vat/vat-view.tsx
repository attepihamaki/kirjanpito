"use client"

import { FigureLink } from "@/components/common/figure-link"
import {
  NoEntriesState,
  useYearIsEmpty,
} from "@/components/common/no-entries-state"
import { Money } from "@/components/common/money"
import { PANEL_ROWS, Panel } from "@/components/common/panel"
import { cn } from "@/lib/utils"
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
import { useVatDrill, type AmountPart } from "@/hooks/use-figure-drill"
import { useVatPeriod } from "@/hooks/use-vat-period"
import { viewHelp, type HelpTopic } from "@/lib/domain/field-help"
import type { Cents } from "@/lib/domain/types"
import type { VatReport, VatSide } from "@/lib/domain/vat"
import { cashBasisCovers } from "@/lib/domain/vat-basis"
import { useBookStore } from "@/stores/book-store"

export function VatView() {
  const f = useFormatters()
  const { report, current } = useVatPeriod()
  const vatCash = useBookStore((s) => s.vatCash)
  const yearEmpty = useYearIsEmpty()
  const { drill } = useVatDrill()
  const refund = report.due < 0
  const eu = report.euPurchases
  const euTax = eu.goods.vat + eu.services.vat + eu.import.vat + eu.reverse.vat
  const euDrill = (
    title: string,
    kind: "goods" | "services" | "import" | "reverse",
    part: "net" | "vat"
  ) =>
    drill({
      title,
      part,
      figure: eu[kind][part],
      select: (r) => r.euPurchases[kind][part],
    })
  const hasEu =
    eu.goods.net !== 0 ||
    eu.services.net !== 0 ||
    eu.import.net !== 0 ||
    eu.reverse.net !== 0

  if (yearEmpty) return <NoEntriesState bodyKey="empty.vatBody" />

  return (
    <div className="flex flex-col gap-5">
      {/* Result banner */}
      <Panel bodyClassName="flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {refund ? f.t("vat.refundableTitle") : f.t("vat.payableTitle")}
          </p>
          <FigureLink
            label={
              refund ? f.t("vat.refundableTitle") : f.t("vat.payableTitle")
            }
            onOpen={drill({
              title: refund
                ? f.t("vat.refundableTitle")
                : f.t("vat.payableTitle"),
              part: "vat",
              figure: report.due,
              select: (r) => r.due,
            })}
          >
            <Money
              cents={Math.abs(report.due)}
              tone={refund ? "income" : undefined}
              className="mt-1 block font-heading text-4xl font-semibold tracking-tight"
            />
          </FigureLink>
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

      <div className={cn("grid gap-x-6 lg:grid-cols-2", PANEL_ROWS)}>
        <RateTable
          title={f.t("vat.salesTable")}
          help={viewHelp("vat.sales")}
          side={report.sales}
          which="sales"
          drill={drill}
        />
        <RateTable
          title={f.t("vat.purchaseTable")}
          help={viewHelp("vat.purchases")}
          side={report.purchases}
          which="purchases"
          drill={drill}
          // §6.1: 0% purchases are not deductible, so the row is hidden.
          skipZero
        />
      </div>

      <Panel title={f.t("vat.otherSales")} help={viewHelp("vat.otherSales")}>
        <dl className="divide-y">
          <OtherRow
            label={f.t("vat.euGoodsSales")}
            cents={report.otherSales.euGoods}
            onOpen={drill({
              title: f.t("vat.euGoodsSales"),
              part: "net",
              figure: report.otherSales.euGoods,
              select: (r) => r.otherSales.euGoods,
            })}
          />
          <OtherRow
            label={f.t("vat.euServicesSales")}
            cents={report.otherSales.euServices}
            onOpen={drill({
              title: f.t("vat.euServicesSales"),
              part: "net",
              figure: report.otherSales.euServices,
              select: (r) => r.otherSales.euServices,
            })}
          />
          {report.otherSales.eu !== 0 ? (
            <OtherRow
              label={f.t("vat.euUnsortedSales")}
              cents={report.otherSales.eu}
              onOpen={drill({
                title: f.t("vat.euUnsortedSales"),
                part: "net",
                figure: report.otherSales.eu,
                select: (r) => r.otherSales.eu,
              })}
            />
          ) : null}
          <OtherRow
            label={f.t("vat.nonEuSales")}
            cents={report.otherSales.nonEu}
            onOpen={drill({
              title: f.t("vat.nonEuSales"),
              part: "net",
              figure: report.otherSales.nonEu,
              select: (r) => r.otherSales.nonEu,
            })}
          />
          <OtherRow
            label={f.t("vat.reverseChargeSales")}
            cents={report.otherSales.reverse}
            onOpen={drill({
              title: f.t("vat.reverseChargeSales"),
              part: "net",
              figure: report.otherSales.reverse,
              select: (r) => r.otherSales.reverse,
            })}
          />
        </dl>
      </Panel>

      {hasEu ? (
        <Panel
          title={f.t("vat.euPurchases")}
          help={viewHelp("vat.euPurchases")}
        >
          <dl className="divide-y">
            <OtherRow
              label={f.t("vat.euGoodsPurchases")}
              cents={eu.goods.net}
              onOpen={euDrill(f.t("vat.euGoodsPurchases"), "goods", "net")}
            />
            <OtherRow
              label={f.t("vat.euGoodsTax")}
              cents={eu.goods.vat}
              onOpen={euDrill(f.t("vat.euGoodsTax"), "goods", "vat")}
            />
            <OtherRow
              label={f.t("vat.euServicesPurchases")}
              cents={eu.services.net}
              onOpen={euDrill(
                f.t("vat.euServicesPurchases"),
                "services",
                "net"
              )}
            />
            <OtherRow
              label={f.t("vat.euServicesTax")}
              cents={eu.services.vat}
              onOpen={euDrill(f.t("vat.euServicesTax"), "services", "vat")}
            />
            {eu.import.net !== 0 ? (
              <>
                <OtherRow
                  label={f.t("vat.importPurchases")}
                  cents={eu.import.net}
                  onOpen={euDrill(f.t("vat.importPurchases"), "import", "net")}
                />
                <OtherRow
                  label={f.t("vat.importTax")}
                  cents={eu.import.vat}
                  onOpen={euDrill(f.t("vat.importTax"), "import", "vat")}
                />
              </>
            ) : null}
            {eu.reverse.net !== 0 ? (
              <>
                <OtherRow
                  label={f.t("vat.reversePurchases")}
                  cents={eu.reverse.net}
                  onOpen={euDrill(
                    f.t("vat.reversePurchases"),
                    "reverse",
                    "net"
                  )}
                />
                <OtherRow
                  label={f.t("vat.reverseTax")}
                  cents={eu.reverse.vat}
                  onOpen={euDrill(f.t("vat.reverseTax"), "reverse", "vat")}
                />
              </>
            ) : null}
            <OtherRow
              label={f.t("vat.euDeductible")}
              cents={eu.deductible}
              onOpen={drill({
                title: f.t("vat.euDeductible"),
                part: "vat",
                figure: eu.deductible,
                select: (r) => r.euPurchases.deductible,
              })}
            />
          </dl>
        </Panel>
      ) : null}

      {cashBasisCovers(vatCash, current) ? (
        <p className="text-xs text-muted-foreground">{f.t("vat.cashNote")}</p>
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

type Drill = ReturnType<typeof useVatDrill>["drill"]

function RateTable({
  title,
  help,
  side,
  skipZero,
  which,
  drill,
}: {
  title: string
  help?: HelpTopic | null
  side: VatSide
  skipZero?: boolean
  which: "sales" | "purchases"
  drill: Drill
}) {
  const f = useFormatters()
  /** A cell of the table: its bucket's net, tax or both together. */
  const cell = (
    rate: number | "other" | "total",
    part: AmountPart,
    bucket: { net: Cents; vat: Cents }
  ) => {
    const value =
      part === "net"
        ? bucket.net
        : part === "vat"
          ? bucket.vat
          : bucket.net + bucket.vat
    const name =
      rate === "total"
        ? f.t("common.total")
        : rate === "other"
          ? f.t("vat.otherRates")
          : f.rate(rate)
    const partName = f.t(
      part === "net"
        ? "ledger.colNet"
        : part === "vat"
          ? "common.vat"
          : "common.total"
    )
    const pick = (r: VatReport) => {
      const s = r[which]
      const b =
        rate === "total"
          ? s.total
          : rate === "other"
            ? s.other
            : s.byRate.get(rate)!
      return part === "net" ? b.net : part === "vat" ? b.vat : b.net + b.vat
    }
    const label = `${title}, ${name}, ${partName}`
    return (
      <FigureLink
        label={label}
        onOpen={drill({ title: label, part, figure: value, select: pick })}
      >
        <Money cents={value} />
      </FigureLink>
    )
  }
  const rows = [...side.byRate.entries()].filter(
    ([rate, bucket]) =>
      !(skipZero && rate === 0) && (rate !== 0 || bucket.net !== 0 || !skipZero)
  )

  return (
    <Panel
      title={title}
      help={help}
      bodyClassName="[&_[data-slot=table-container]]:h-full [&_table]:h-full"
    >
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
                {cell(rate, "net", bucket)}
              </TableCell>
              <TableCell className="text-right">
                {cell(rate, "vat", bucket)}
              </TableCell>
              <TableCell className="text-right">
                {cell(rate, "gross", bucket)}
              </TableCell>
            </TableRow>
          ))}
          {side.other.net !== 0 || side.other.vat !== 0 ? (
            <TableRow>
              <TableCell>{f.t("vat.otherRates")}</TableCell>
              <TableCell className="text-right">
                {cell("other", "net", side.other)}
              </TableCell>
              <TableCell className="text-right">
                {cell("other", "vat", side.other)}
              </TableCell>
              <TableCell className="text-right">
                {cell("other", "gross", side.other)}
              </TableCell>
            </TableRow>
          ) : null}
          {/* Takes the spare height, which keeps the total row at the panel's foot. */}
          <TableRow
            aria-hidden
            className="h-full border-0 hover:bg-transparent"
          >
            <TableCell colSpan={4} className="p-0" />
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">{f.t("common.total")}</TableCell>
            <TableCell className="text-right font-medium">
              {cell("total", "net", side.total)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {cell("total", "vat", side.total)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {cell("total", "gross", side.total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  )
}

function OtherRow({
  label,
  cents,
  onOpen,
}: {
  label: string
  cents: number
  onOpen?: (() => void) | null
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        <FigureLink label={label} onOpen={onOpen}>
          <Money cents={cents} />
        </FigureLink>
      </dd>
    </div>
  )
}
