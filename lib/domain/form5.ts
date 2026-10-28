import type { IncomeStatement } from "@/lib/domain/income-statement"
import type { Cents, Lang } from "@/lib/domain/types"

type Label = Readonly<Record<Lang, string>>

export type Form5Row =
  | { kind: "group"; label: Label }
  | {
      kind: "field"
      /** The field's code on Form 5, which OmaVero shows beside it. */
      code: number
      label: Label
      value: Cents
      /** The taxable or deductible portion of the field above it: indented. */
      portion: boolean
      /** 316, 355, 358 and 359: totals that check the fields above them. */
      total: boolean
    }

export interface Form5Section {
  /** The section number printed on the form, e.g. "2.1", or "" for none. */
  number: string
  title: Label
  rows: readonly Form5Row[]
}

/**
 * The fields of Form 5's section 2 (tuloverolaskelma) that the bookkeeping
 * can fill, in the form's own order and with its own labels (VEROH 3049, and
 * Verohallinto's 2026 data file specification for the English). Values are
 * the year's net amounts.
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
    opts: { portion?: boolean; total?: boolean } = {}
  ): Form5Row => ({
    kind: "field",
    code,
    label: { fi, en },
    value,
    portion: opts.portion ?? false,
    total: opts.total ?? false,
  })
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
        field(300, "Liikevaihto", "Net sales", full(300)),
        field(
          318,
          "Saadut avustukset ja tuet",
          "Grants and subsidies received",
          full(318)
        ),
        field(
          301,
          "Liiketoiminnan muut tuotot",
          "Other operating income",
          full(301)
        ),
        group(
          "Tuloutus yksityiskäytöstä, jos yksityiskäytön kulut on vähennetty kirjanpidossa",
          "Use of business assets for private purposes, if included in business accounting"
        ),
        field(313, "Auton yksityiskäyttö", "Private use of a car", full(313)),
        field(
          314,
          "Tavaroiden yksityiskäyttö",
          "Private use of goods",
          full(314)
        ),
        field(315, "Muu yksityiskäyttö", "Other private use", full(315)),
        group("Osingot ja ylijäämät", "Dividends and surplus"),
        field(
          319,
          "Osingot julkisesti noteeratuista yhtiöistä",
          "Dividends from listed companies",
          full(319)
        ),
        field(
          320,
          "Veronalainen osuus",
          "Taxable portion",
          counted(319),
          portion
        ),
        field(
          321,
          "Osingot muista kuin julkisesti noteeratuista yhtiöistä",
          "Dividends from non-listed companies",
          full(321)
        ),
        field(
          322,
          "Veronalainen osuus",
          "Taxable portion",
          counted(321),
          portion
        ),
        field(
          323,
          "Korkotuotot ja muut rahoitustuotot",
          "Interest income and other financial income",
          full(323)
        ),
        field(
          312,
          "Varausten vähennys",
          "Relieved write-offs and reserves",
          full(312)
        ),
        field(
          324,
          "Muut veronalaiset tuotot (ei tilikauden tuloslaskelmassa)",
          "Other taxable income (off-income-statement)",
          full(324)
        ),
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
        field(
          333,
          "Ostot ja varastojen muutokset",
          "Purchases and changes in inventory",
          full(333)
        ),
        field(334, "Ulkopuoliset palvelut", "External services", full(334)),
        group("Henkilöstökulut", "Staff expenses"),
        field(
          335,
          "Palkat ja palkkiot",
          "Wages, salaries and fringe benefits",
          full(335)
        ),
        field(
          336,
          "Eläke- ja henkilösivukulut",
          "Pension and other staff expenses",
          full(336)
        ),
        field(337, "Poistot", "Depreciation", full(337)),
        field(
          338,
          "Vähennyskelpoinen osuus",
          "Deductible portion",
          counted(337),
          portion
        ),
        field(341, "Edustuskulut", "Entertainment expenses", full(341)),
        field(
          342,
          "Vähennyskelpoinen osuus 50 %",
          "Deductible portion 50%",
          counted(341),
          portion
        ),
        field(343, "Vuokrat", "Rental expenses", full(343)),
        field(
          344,
          "Muut vähennyskelpoiset kulut",
          "Other deductible expenses",
          full(344)
        ),
        field(346, "Korkokulut", "Interest expenses", full(346)),
        field(
          347,
          "Vähennyskelpoinen osuus",
          "Deductible portion",
          counted(346),
          portion
        ),
        field(349, "Muut rahoituskulut", "Other financial costs", full(349)),
        field(353, "Varausten lisäykset", "Increases to reserves", full(353)),
        field(
          354,
          "Kirjanpidon ulkopuoliset vähennyskelpoiset kulut",
          "Deductible expenses not entered in accounting",
          full(354)
        ),
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
        field(365, "Välittömät verot", "Direct taxes", full(365)),
        field(
          366,
          "Sakot ja muut rangaistusmaksut",
          "Fines and other penalty fees",
          full(366)
        ),
        field(
          367,
          "Muut vähennyskelvottomat kulut",
          "Other non-deductible expenses",
          full(367)
        ),
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
          total
        ),
        field(
          359,
          "Elinkeinotoiminnan tappio",
          "Business loss",
          s.resultLine === "359" ? s.resultMagnitude : 0,
          total
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
      if (row.kind === "field") out.set(row.code, row.value)
    }
  }
  return out
}
