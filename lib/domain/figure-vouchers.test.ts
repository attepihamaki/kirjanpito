import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  balanceContribution,
  entryFigureRefs,
  figureRows,
  form5Selection,
  resultContribution,
  rowsTotal,
  statementContribution,
  vatContribution,
  vatFieldSelector,
} from "@/lib/domain/figure-vouchers"
import { filterPeriod } from "@/lib/domain/period"
import { taxBasisEntries } from "@/lib/domain/open-items"
import { form5Sections, form5Values } from "@/lib/domain/form5"
import { incomeStatement } from "@/lib/domain/income-statement"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import { vatReturnSections } from "@/lib/domain/vat-return"

const cats = indexCategories(defaultCategories())
const entries = sampleEntries()

function entry(over: Partial<Entry>): Entry {
  return { ...entries[0], id: "x", ...over }
}

describe("VAT return figures", () => {
  it("every field's vouchers add up to the field", () => {
    const report = vatReport(entries, cats)
    for (const section of vatReturnSections(report)) {
      for (const row of section.rows) {
        if (row.kind !== "field") continue
        const rows = figureRows(
          entries,
          vatContribution(cats, vatFieldSelector(row.code))
        )
        const expected = row.code === "308" ? report.due : row.value
        expect(rowsTotal(rows), row.code).toBe(expected)
      }
    }
  })

  it("adds up per month too, with a refund carrying a minus", () => {
    const refund = [
      entry({ id: "a", type: "expense", catId: "333", amount: 12_400 }),
    ]
    const rows = figureRows(
      refund,
      vatContribution(cats, vatFieldSelector("308"))
    )
    expect(rowsTotal(rows)).toBe(vatReport(refund, cats).due)
    expect(rowsTotal(rows)).toBeLessThan(0)
  })

  it("leaves out an entry the return does not count", () => {
    const wages = [entry({ id: "w", type: "expense", catId: "335", vatRate: 0 })]
    expect(
      figureRows(wages, vatContribution(cats, vatFieldSelector("307")))
    ).toEqual([])
  })
})

describe("income statement and Form 5 figures", () => {
  const year = 2026
  const statement = incomeStatement(entries, cats, year)
  const values = form5Values(form5Sections(statement))

  it("every line's vouchers add up to the line in full", () => {
    for (const { line, net } of statement.lines) {
      const selection = form5Selection(line.account)!
      const rows = figureRows(
        entries,
        statementContribution(cats, year, selection)
      )
      // 344 and 364 each hold several lines under one account.
      const sameAccount = statement.lines
        .filter((l) => l.line.account === line.account)
        .reduce((acc, l) => acc + l.net, 0)
      expect(rowsTotal(rows), String(line.account)).toBe(sameAccount)
      expect(net).toBeDefined()
    }
  })

  it("the Form 5 codes with a full amount match the form's value", () => {
    for (const [code, value] of values) {
      const selection = form5Selection(code)
      if (!selection || [320, 322, 328, 338, 342, 347].includes(code)) continue
      const rows = figureRows(
        entries,
        statementContribution(cats, year, selection)
      )
      expect(rowsTotal(rows), String(code)).toBe(value)
    }
  })

  it("revenue, deductible expenses and the result match the statement", () => {
    const rev = figureRows(
      entries,
      statementContribution(cats, year, form5Selection(316)!)
    )
    const ded = figureRows(
      entries,
      statementContribution(cats, year, form5Selection(355)!)
    )
    expect(rowsTotal(rev)).toBe(statement.revenueTotal)
    expect(rowsTotal(ded)).toBe(statement.deductibleTotal)
    expect(rowsTotal(figureRows(entries, resultContribution(cats, year, false)))).toBe(
      statement.result
    )
  })

  it("a loss adds up to the positive figure the form asks for", () => {
    const loss = [entry({ id: "c", type: "expense", catId: "333", amount: 5000 })]
    const s = incomeStatement(loss, cats, year)
    expect(s.resultLine).toBe("359")
    expect(
      rowsTotal(figureRows(loss, resultContribution(cats, year, true)))
    ).toBe(s.resultMagnitude)
  })

  it("keeps the full amount of a portion's parent line", () => {
    const rows = figureRows(
      [
        entry({
          id: "e",
          type: "expense",
          catId: "341",
          amount: 10_000,
          vatRate: 0,
          amountMode: "net",
        }),
      ],
      statementContribution(cats, year, form5Selection(342)!)
    )
    // 342 counts half, but its vouchers are listed in full.
    expect(rowsTotal(rows)).toBe(10_000)
  })

  it("has no selection for a code that is not a statement line", () => {
    expect(form5Selection(704)).toBeNull()
  })
})

describe("Form 5 balance figures", () => {
  it("lists the open sales behind 711 and ignores paid ones", () => {
    const open = entry({
      id: "o",
      date: "2026-12-01",
      type: "income",
      catId: "300-domestic",
      amount: 12_550,
      paidOn: null,
    })
    const paid = entry({ id: "p", date: "2026-12-02", type: "income", paidOn: undefined })
    const rows = figureRows(
      [open, paid],
      balanceContribution(711, cats, 2026)!
    )
    expect(rows.map((r) => r.entryId)).toEqual(["o"])
  })

  it("has no vouchers for a typed-in field", () => {
    expect(balanceContribution(708, cats, 2026)).toBeNull()
  })
})

describe("liabilities (725, 749)", () => {
  const open = (id: string, over: Partial<Entry> = {}) =>
    entry({
      id,
      date: "2026-12-01",
      type: "expense",
      catId: "333",
      amount: 12_400,
      vatRate: 0,
      amountMode: "net",
      paidOn: null,
      ...over,
    })

  it("lists open purchases under 749 and adds the loans under 725", () => {
    const loan = entry({
      id: "l",
      date: "2025-03-01",
      type: "income",
      catId: "loan-drawdown",
      amount: 500_000,
      vatRate: 0,
      amountMode: "net",
    })
    const repay = { ...loan, id: "r", type: "expense", catId: "loan-repayment", amount: 100_000 } as Entry
    const all = [open("o"), loan, repay]
    const current = figureRows(all, balanceContribution(749, cats, 2026)!)
    expect(current.map((r) => r.entryId)).toEqual(["o"])
    const total = figureRows(all, balanceContribution(725, cats, 2026)!)
    expect(rowsTotal(total)).toBe(12_400 + 500_000 - 100_000)
  })

  it("leaves a loan drawn after the year out", () => {
    const later = entry({
      id: "l",
      date: "2027-01-02",
      type: "income",
      catId: "loan-drawdown",
      amount: 100_000,
      vatRate: 0,
      amountMode: "net",
    })
    expect(figureRows([later], balanceContribution(725, cats, 2026)!)).toEqual([])
  })
})

describe("where a voucher counts", () => {
  const ctx = { vatPeriod: "month" as const, trader: "professional" as const, years: [2026] }

  it("finds every voucher in the list of each figure it names", () => {
    const basis = taxBasisEntries(entries, "professional")
    for (const e of entries) {
      for (const ref of entryFigureRefs(e, cats, ctx)) {
        if (ref.kind === "vat") {
          const rows = figureRows(
            filterPeriod(entries, ref.period),
            vatContribution(cats, vatFieldSelector(ref.code))
          )
          const row = rows.find((r) => r.entryId === e.id)
          expect(row?.amount, `${e.description} ${ref.code}`).toBe(ref.amount)
        } else {
          const sel = form5Selection(ref.code)
          const contribution = sel
            ? statementContribution(cats, ref.year, sel)
            : balanceContribution(ref.code, cats, ref.year)!
          const rows = figureRows(sel ? basis : entries, contribution)
          expect(
            rows.find((r) => r.entryId === e.id)?.amount,
            `${e.description} ${ref.code}`
          ).toBe(ref.amount)
        }
      }
    }
  })

  it("names the return's fields and Form 5's lines for a sale", () => {
    const sale = entries.find((e) => e.description.startsWith("Lasku 1005"))!
    const refs = entryFigureRefs(sale, cats, ctx)
    expect(refs.filter((r) => r.kind === "vat").map((r) => r.code)).toEqual(["301"])
    expect(refs.filter((r) => r.kind === "form5").map((r) => r.code)).toEqual([300])
  })

  it("has nothing for a VAT payment, which is off both returns", () => {
    const pay = entry({ id: "p", type: "expense", catId: "vat-payment", vatRate: 0 })
    expect(entryFigureRefs(pay, cats, ctx)).toEqual([])
  })

  it("leaves an open voucher off the statement but on the return", () => {
    const sale = entry({ id: "o", type: "income", catId: "300-domestic", paidOn: null })
    const refs = entryFigureRefs(sale, cats, ctx)
    expect(refs.some((r) => r.kind === "vat")).toBe(true)
    expect(refs.some((r) => r.kind === "form5" && r.code === 300)).toBe(false)
    expect(refs.some((r) => r.kind === "form5" && r.code === 711)).toBe(true)
  })

  it("follows the filing period", () => {
    const sale = entries.find((e) => e.description.startsWith("Lasku 1005"))!
    const [ref] = entryFigureRefs(sale, cats, { ...ctx, vatPeriod: "quarter" })
    expect(ref).toMatchObject({ kind: "vat", period: { kind: "quarter", quarter: 4 } })
  })
})
