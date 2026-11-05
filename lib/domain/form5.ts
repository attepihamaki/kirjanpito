import { LINE_BY_KEY } from "@/lib/domain/accounts"
import { form5Label } from "@/lib/domain/form5-spec"
import type { IncomeStatement } from "@/lib/domain/income-statement"
import type { TaxFormRow, TaxFormSection } from "@/lib/domain/tax-form"
import type { Cents } from "@/lib/domain/types"

export type Form5Row = TaxFormRow
export type Form5Section = TaxFormSection

/** Shown on 313: the amount is not typed, OmaVero derives it. */
const CAR_HINT = {
  fi: "OmaVero laskee tämän ajotiedoista (271, 273, 381, 396). Anna ne siellä äläkä kirjaa summaa erikseen.",
  en: "OmaVero works this out from the driving details (271, 273, 381, 396). Enter those there and do not add the amount separately.",
}

/**
 * The fields of Form 5's section 2 (tuloverolaskelma) that the bookkeeping
 * can fill, in the form's own order. The Finnish label of every field is the
 * specification's (`form5-spec.ts`); the English is the chart's, or written
 * here for a portion the chart has no line for. Values are the year's net
 * amounts.
 *
 * 338 is the part of 337 the asset register allows and 347 the full 346,
 * because the income statement deducts interest in full (§6.3). 327 and 328 are
 * the surplus from non-listed co-operatives; 325 and 326 are left out, since
 * the specification says no co-operative was listed in 2026. 364 is the sum of
 * 388, the additional deduction for temporary business trips, and 392, the one
 * for a private car, which the specification requires to match.
 */
export function form5Sections(s: IncomeStatement): Form5Section[] {
  const full = (account: number) =>
    s.lines
      .filter((l) => l.line.account === account)
      .reduce((acc, l) => acc + l.net, 0) + 0
  const byKey = (key: string) =>
    s.lines
      .filter((l) => l.line.key === key)
      .reduce((acc, l) => acc + l.net, 0) + 0
  const counted = (account: number) =>
    s.lines
      .filter((l) => l.line.account === account)
      .reduce((acc, l) => acc + l.counted, 0) + 0

  const field = (
    code: number,
    en: string,
    value: Cents,
    opts: {
      portion?: boolean
      total?: boolean
      unused?: boolean
      hint?: { fi: string; en: string }
    } = {}
  ): Form5Row => ({
    kind: "field",
    code: String(code),
    label: { fi: form5Label(code), en },
    value,
    portion: opts.portion ?? false,
    total: opts.total ?? false,
    unused: opts.unused ?? false,
    hint: opts.hint,
  })
  // 344 holds several categories, and the form's name is the last of them.
  const line = (code: number, value: Cents): Form5Row => {
    const { en } = LINE_BY_KEY.get(
      code === 344 ? "344-other" : String(code)
    )!.name
    return field(code, en, value, {
      hint: code === 313 ? CAR_HINT : undefined,
    })
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
        field(320, "Taxable portion", counted(319), portion),
        line(321, full(321)),
        field(322, "Taxable portion", counted(321), portion),
        line(327, full(327)),
        field(328, "Taxable portion", counted(327), portion),
        line(323, full(323)),
        line(312, full(312)),
        line(324, full(324)),
        field(316, "Total taxable business income", s.revenueTotal, total),
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
        field(338, "Deductible portion", counted(337), portion),
        line(341, full(341)),
        field(342, "Deductible portion 50%", counted(341), portion),
        line(343, full(343)),
        line(344, full(344)),
        line(346, full(346)),
        field(347, "Deductible portion", counted(346), portion),
        line(349, full(349)),
        line(353, full(353)),
        field(364, "Additional deductions", full(364)),
        field(
          388,
          "Additional deductions for increased living costs of temporary business trips, total",
          byKey("364-travel"),
          portion
        ),
        field(
          392,
          "Additional deduction for a car belonging to private assets",
          byKey("364-car"),
          portion
        ),
        line(354, full(354)),
        field(
          355,
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
        field(365, "Direct taxes", full(365)),
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
          "Business profit",
          s.resultLine === "358" ? s.resultMagnitude : 0,
          { total: true, unused: s.resultLine !== "358" }
        ),
        field(
          359,
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
