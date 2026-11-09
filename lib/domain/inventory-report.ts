import {
  itemValue,
  type CostMethod,
  type StockItem,
} from "@/lib/domain/inventory"
import { formatQuantity } from "@/lib/domain/inventory-csv"
import type {
  ReportDoc,
  ReportRow,
  ReportText,
} from "@/lib/domain/year-reports"

export interface StocktakeReportInput {
  year: number
  items: readonly StockItem[]
  method: CostMethod
  businessName: string
  businessId: string
}

/**
 * The stocktake list as a document (§8.28): the voucher the year's stock change
 * rests on. It lists every counted row with its cost, any lower value and what
 * goes in the balance, then the totals Form 5 asks for on 708 and 709.
 */
export function stocktakeReport(
  f: ReportText,
  input: StocktakeReportInput
): ReportDoc {
  const counted = [...input.items]
    .filter((i) => i.quantityMilli > 0)
    .sort((a, b) => a.name.localeCompare(b.name, f.lang))

  const rows: ReportRow[] = []
  let cost = 0
  let writeDown = 0
  let goods = 0
  let materials = 0
  for (const item of counted) {
    const v = itemValue(item, input.method)
    cost += v.cost
    writeDown += v.writeDown
    if (item.kind === "goods") goods += v.value
    else materials += v.value
    const name = [item.name, item.sku].filter(Boolean).join(" · ")
    rows.push({
      kind: "data",
      cells: [
        v.writeDown > 0 && item.lowerReason
          ? `${name}\n${item.lowerReason}`
          : name,
        `${formatQuantity(item.quantityMilli, f.lang)} ${item.unit}`.trim(),
        f.money(v.cost),
        v.writeDown > 0 ? f.money(-v.writeDown) : "",
        f.money(v.value),
      ],
    })
  }
  rows.push({
    kind: "total",
    label: f.t("common.total"),
    from: 2,
    cells: [f.money(cost), f.money(-writeDown), f.money(cost - writeDown)],
    double: true,
  })

  const who = [
    input.businessName,
    input.businessId ? `${f.t("common.businessId")} ${input.businessId}` : "",
  ].filter(Boolean)
  const title = f.t("inventory.reportTitle", { y: input.year })

  return {
    id: "stocktake",
    title,
    header: [
      ...(who.length ? [who.join(" · ")] : []),
      f.t("inventory.reportDate", { d: f.date(`${input.year}-12-31`) }),
      f.t(
        input.method === "fifo"
          ? "inventory.methodFifo"
          : "inventory.methodAverage"
      ),
    ],
    blocks: [
      {
        kind: "table",
        columns: [
          { head: f.t("inventory.colName"), align: "left", weight: 5 },
          { head: f.t("inventory.colQuantity"), align: "right", weight: 2 },
          { head: f.t("inventory.colCost"), align: "right", weight: 2 },
          { head: f.t("inventory.colWriteDown"), align: "right", weight: 2 },
          { head: f.t("inventory.colValue"), align: "right", weight: 2 },
        ],
        rows,
      },
      {
        kind: "table",
        columns: [
          { head: f.t("inventory.reportForm5"), align: "left", weight: 6 },
          { head: "", align: "right", weight: 2 },
        ],
        rows: [
          {
            kind: "data",
            cells: [`708 ${f.t("inventory.goods")}`, f.money(goods)],
          },
          {
            kind: "data",
            cells: [`709 ${f.t("inventory.materials")}`, f.money(materials)],
          },
        ],
      },
      {
        kind: "text",
        text: f.t("inventory.reportNote"),
        style: "note",
      },
    ],
    footer: f.t("inventory.reportFooter"),
  }
}
