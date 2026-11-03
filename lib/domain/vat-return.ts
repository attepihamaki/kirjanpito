import type { TaxFormRow, TaxFormSection } from "@/lib/domain/tax-form"
import type { Cents } from "@/lib/domain/types"
import type { VatReport } from "@/lib/domain/vat"

/**
 * A period's report as the fields of the VAT return (§8.7), in the order and
 * with the names of the return in OmaVero. The codes are those of Verohallinto's
 * data file specification VSRALVKV (version 1.10, 27.2.2026).
 *
 * The superseded 24 % and 14 % rates share a field with the rates that replaced
 * them. A sales rate outside RATES has no field at all: it stays out of 301–303
 * but in 308, so the view warns about it.
 *
 * The bookkeeping records no reverse-charge purchases or imports, so 304–306,
 * 310, 313, 314, 318 and 320 stay empty. Sales on the retired EU category could
 * be either 311 or 312, so they get a row of their own, and only when there are
 * any: that row is not a field in OmaVero.
 */
export function vatReturnSections(report: VatReport): TaxFormSection[] {
  const salesVat = (...rates: number[]) =>
    rates.reduce((acc, r) => acc + (report.sales.byRate.get(r)?.vat ?? 0), 0)
  const zeroRated =
    (report.sales.byRate.get(0)?.net ?? 0) + report.otherSales.nonEu
  const refund = report.due < 0

  const field = (
    code: string,
    fi: string,
    en: string,
    value: Cents,
    opts: { total?: boolean; hint?: { fi: string; en: string } } = {}
  ): TaxFormRow => ({
    kind: "field",
    code,
    label: { fi, en },
    value: value + 0,
    portion: false,
    total: opts.total ?? false,
    unused: false,
    hint: opts.hint,
  })

  return [
    {
      number: "",
      title: {
        fi: "Vero kotimaan myynnistä verokannoittain",
        en: "Tax on domestic sales by tax rate",
      },
      rows: [
        field(
          "301",
          "25,5 %:n vero (myös 24 %)",
          "25.5% tax (also 24%)",
          salesVat(25.5, 24)
        ),
        field(
          "302",
          "13,5 %:n vero (myös 14 %)",
          "13.5% tax (also 14%)",
          salesVat(13.5, 14)
        ),
        field("303", "10 %:n vero", "10% tax", salesVat(10)),
      ],
    },
    {
      number: "",
      title: {
        fi: "Vero ostoista ja maahantuonneista",
        en: "Tax on purchases and imports",
      },
      rows: [
        field(
          "305",
          "Vero tavaraostoista muista EU-maista",
          "Tax on goods purchased from other EU Member States",
          0
        ),
        field(
          "306",
          "Vero palveluostoista muista EU-maista",
          "Tax on services purchased from other EU Member States",
          0
        ),
        field(
          "304",
          "Vero tavaroiden maahantuonneista EU:n ulkopuolelta",
          "Tax on imports of goods from outside the EU",
          0
        ),
        field(
          "318",
          "Vero rakentamispalvelun ja metalliromun ostoista",
          "Tax on purchases of construction services and scrap metal",
          0
        ),
      ],
    },
    {
      number: "",
      title: { fi: "Vähennettävä vero", en: "Deductible tax" },
      rows: [
        field(
          "307",
          "Verokauden vähennettävä vero",
          "Tax deductible for the tax period",
          report.purchases.total.vat
        ),
      ],
    },
    {
      number: "",
      title: {
        fi: "Maksettava tai palautukseen oikeuttava vero",
        en: "Tax payable or tax that qualifies for refund",
      },
      rows: [
        field(
          "308",
          refund ? "Palautukseen oikeuttava vero" : "Maksettava vero",
          refund ? "Tax that qualifies for refund" : "Tax payable",
          Math.abs(report.due),
          { total: true }
        ),
      ],
    },
    {
      number: "",
      title: {
        fi: "Myynnit, ostot ja maahantuonnit",
        en: "Sales, purchases and imports",
      },
      rows: [
        field(
          "309",
          "0-verokannan alainen liikevaihto",
          "Turnover taxable at zero VAT rate",
          zeroRated,
          {
            hint: {
              fi: "Sisältää viennin EU:n ulkopuolelle. Jätä pois verottomat myynnit, joiden ostojen veroa ei saa vähentää, kuten terveydenhuoltopalvelut.",
              en: "Includes exports outside the EU. Leave out exempt sales whose purchase VAT you cannot deduct, such as healthcare services.",
            },
          }
        ),
        field(
          "311",
          "Tavaroiden myynnit muihin EU-maihin",
          "Sales of goods to other EU Member States",
          report.otherSales.euGoods,
          {
            hint: {
              fi: "Anna näistä myynneistä lisäksi yhteenvetoilmoitus, ks. välilehti Yhteenvetoilmoitus.",
              en: "These sales also go on an EC Sales List.",
            },
          }
        ),
        field(
          "312",
          "Palvelujen myynnit muihin EU-maihin",
          "Sales of services to other EU Member States",
          report.otherSales.euServices,
          {
            hint: {
              fi: "Vain palvelut, jotka verotetaan ostajan maassa. Muut, kuten kiinteistöön kohdistuvat palvelut, kuuluvat 0-verokannan liikevaihtoon. Anna näistä myynneistä lisäksi yhteenvetoilmoitus.",
              en: "Only services taxed in the buyer's country. Others, such as services related to real estate, belong in the zero-rate turnover. These sales also go on an EC Sales List.",
            },
          }
        ),
        ...(report.otherSales.eu !== 0
          ? [
              field(
                "311/312",
                "EU-myynnit, joista ei tiedetä, ovatko ne tavaroita vai palveluja",
                "EU sales not marked as goods or services",
                report.otherSales.eu,
                {
                  hint: {
                    fi: "Nämä kirjaukset ovat vanhassa luokassa Myynti – EU. Vaihda niiden luokaksi Myynti – EU, tavarat tai palvelut, niin summa siirtyy oikeaan kohtaan.",
                    en: "These entries are on the old category Sales – EU. Change their category to Sales – EU, goods or services, and the amount moves to the right field.",
                  },
                }
              ),
            ]
          : []),
        field(
          "313",
          "Tavaraostot muista EU-maista",
          "Purchases of goods from other EU Member States",
          0
        ),
        field(
          "314",
          "Palveluostot muista EU-maista",
          "Purchases of services from other EU Member States",
          0
        ),
        field(
          "310",
          "Tavaroiden maahantuonnit EU:n ulkopuolelta",
          "Imports of goods from outside the EU",
          0
        ),
        field(
          "319",
          "Rakentamispalvelun ja metalliromun myynnit",
          "Sales of construction services and scrap metal",
          report.otherSales.reverse
        ),
        field(
          "320",
          "Rakentamispalvelun ja metalliromun ostot",
          "Purchases of construction services and scrap metal",
          0
        ),
      ],
    },
  ]
}

/** Every field of the sections, keyed by code. */
export function vatReturnValues(
  sections: readonly TaxFormSection[]
): ReadonlyMap<string, Cents> {
  const out = new Map<string, Cents>()
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.kind === "field") out.set(row.code, row.value)
    }
  }
  return out
}
