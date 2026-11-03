import { LINE_BY_KEY } from "@/lib/domain/accounts"
import type { IncomeStatement } from "@/lib/domain/income-statement"
import type { TaxFormRow, TaxFormSection } from "@/lib/domain/tax-form"
import type { Cents } from "@/lib/domain/types"

export type Form5Row = TaxFormRow
export type Form5Section = TaxFormSection

/**
 * The fields of Form 5's section 2 (tuloverolaskelma) that the bookkeeping
 * can fill, in the form's own order and with its own labels (VEROH 3049, and
 * Verohallinto's 2026 data file specification for the English). A field that
 * is a line of the chart takes its name from there. Values are the year's net
 * amounts.
 *
 * 338 and 347 are the full 337 and 346, because the income statement deducts
 * depreciation and interest in full (§6.3). 325–328 and 364 are left out: the
 * book records no co-operative surplus and no additional deductions.
 */
export function form5Sections(s: IncomeStatement): Form5Section[] {
  const full = (account: number) =>
    s.lines
      .filter((l) => l.line.account === account)
      .reduce((acc, l) => acc + l.net, 0) + 0
  const counted = (account: number) =>
    s.lines
      .filter((l) => l.line.account === account)
      .reduce((acc, l) => acc + l.counted, 0) + 0

  const field = (
    code: number,
    fi: string,
    en: string,
    value: Cents,
    opts: { portion?: boolean; total?: boolean; unused?: boolean } = {}
  ): Form5Row => ({
    kind: "field",
    code: String(code),
    label: { fi, en },
    value,
    portion: opts.portion ?? false,
    total: opts.total ?? false,
    unused: opts.unused ?? false,
  })
  // 344 holds several categories, and the form's name is the last of them.
  const line = (code: number, value: Cents): Form5Row => {
    const { fi, en } = LINE_BY_KEY.get(
      code === 344 ? "344-other" : String(code)
    )!.name
    return field(code, fi, en, value)
  }
  const group = (fi: string, en: string): Form5Row => ({
    kind: "group",
    label: { fi, en },
  })
  const portion = { portion: true }
  const total = { total: true }

  return [
    {
      number: "2.1",
      title: { fi: "Elinkeinotoiminnan tuotot", en: "Business income" },
      rows: [
        line(300, full(300)),
        line(318, full(318)),
        line(301, full(301)),
        group(
          "Tuloutus yksityiskäytöstä, jos yksityiskäytön kulut on vähennetty kirjanpidossa",
          "Use of business assets for private purposes, if included in business accounting"
        ),
        line(313, full(313)),
        line(314, full(314)),
        line(315, full(315)),
        group("Osingot ja ylijäämät", "Dividends and surplus"),
        line(319, full(319)),
        field(
          320,
          "Veronalainen osuus",
          "Taxable portion",
          counted(319),
          portion
        ),
        line(321, full(321)),
        field(
          322,
          "Veronalainen osuus",
          "Taxable portion",
          counted(321),
          portion
        ),
        line(323, full(323)),
        line(312, full(312)),
        line(324, full(324)),
        field(
          316,
          "Elinkeinotoiminnan veronalaiset tuotot yhteensä",
          "Total taxable business income",
          s.revenueTotal,
          total
        ),
      ],
    },
    {
      number: "2.2",
      title: {
        fi: "Tuloslaskelman verovapaat tuotot",
        en: "Tax-exempt income in the profit and loss account",
      },
      rows: [
        field(
          317,
          "Tuloslaskelman verovapaat tuotot",
          "Tax-exempt income in the profit and loss account",
          full(317)
        ),
      ],
    },
    {
      number: "2.3",
      title: { fi: "Elinkeinotoiminnan kulut", en: "Business expenses" },
      rows: [
        line(333, full(333)),
        line(334, full(334)),
        group("Henkilöstökulut", "Staff expenses"),
        line(335, full(335)),
        line(336, full(336)),
        line(337, full(337)),
        field(
          338,
          "Vähennyskelpoinen osuus",
          "Deductible portion",
          counted(337),
          portion
        ),
        line(341, full(341)),
        field(
          342,
          "Vähennyskelpoinen osuus 50 %",
          "Deductible portion 50%",
          counted(341),
          portion
        ),
        line(343, full(343)),
        line(344, full(344)),
        line(346, full(346)),
        field(
          347,
          "Vähennyskelpoinen osuus",
          "Deductible portion",
          counted(346),
          portion
        ),
        line(349, full(349)),
        line(353, full(353)),
        line(354, full(354)),
        field(
          355,
          "Elinkeinotoiminnan verotuksessa vähennyskelpoiset kulut yhteensä",
          "Total deductible business expenses",
          s.deductibleTotal,
          total
        ),
      ],
    },
    {
      number: "",
      title: { fi: "Vähennyskelvottomat kulut", en: "Non-deductible expenses" },
      rows: [
        // The chart's name adds advance tax, which the form's own label leaves out.
        field(365, "Välittömät verot", "Direct taxes", full(365)),
        line(366, full(366)),
        line(367, full(367)),
      ],
    },
    {
      number: "",
      title: { fi: "Tulos", en: "Result" },
      rows: [
        field(
          358,
          "Elinkeinotoiminnan tulos",
          "Business profit",
          s.resultLine === "358" ? s.resultMagnitude : 0,
          { total: true, unused: s.resultLine !== "358" }
        ),
        field(
          359,
          "Elinkeinotoiminnan tappio",
          "Business loss",
          s.resultLine === "359" ? s.resultMagnitude : 0,
          { total: true, unused: s.resultLine !== "359" }
        ),
      ],
    },
  ]
}

/** Every field of the sections, keyed by code. */
export function form5Values(
  sections: readonly Form5Section[]
): ReadonlyMap<number, Cents> {
  const out = new Map<number, Cents>()
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.kind === "field") out.set(Number(row.code), row.value)
    }
  }
  return out
}
