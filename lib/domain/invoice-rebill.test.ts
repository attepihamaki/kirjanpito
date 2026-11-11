import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import { creditDraft } from "@/lib/domain/invoice-calc"
import { copyDraft, templateFromInvoice } from "@/lib/domain/invoice-draft"
import {
  isRebillable,
  rebillCandidates,
  rebillProblems,
  rebillRow,
  rebilledBy,
} from "@/lib/domain/invoice-rebill"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function cost(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    voucher: 3,
    date: "2026-11-03",
    description: "Junalippu Tampere",
    type: "expense",
    catId: "344-travel",
    amount: 11_350,
    vatRate: 13.5,
    amountMode: "gross",
    ...over,
  }
}

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    number: 1001,
    date: "2026-11-10",
    dueDate: "2026-11-24",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: { ...emptyParty(), name: "Asiakas" },
    language: "fi",
    rows: [],
    note: "",
    terms: "",
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: [],
    credits: null,
    ...over,
  }
}

const sale = { id: "300-domestic", vatRate: 25.5 }

describe("re-billing a cost (§8.27)", () => {
  it("bills the cost without VAT on the sale's category and rate, with the markup", () => {
    expect(rebillRow(cost(), sale, 0, "fi")).toEqual({
      description: "Junalippu Tampere 3.11.2026",
      quantityMilli: 1000,
      unit: "",
      unitCents: 10_000,
      vatRate: 25.5,
      catId: "300-domestic",
      rebills: "e1",
    })
    expect(rebillRow(cost(), sale, 12.5, "fi").unitCents).toBe(11_250)
  })

  it("bills only the business share of a cost used partly privately", () => {
    expect(rebillRow(cost({ share: 50 }), sale, 0, "fi").unitCents).toBe(5_000)
  })

  it("offers costs only, not income, VAT payments or owner transfers", () => {
    expect(isRebillable(cost(), cats)).toBe(true)
    expect(
      isRebillable(cost({ type: "income", catId: "300-domestic" }), cats)
    ).toBe(false)
    expect(isRebillable(cost({ catId: "2939" }), cats)).toBe(false)
  })

  it("does not offer a cost an invoice already bills, until a credit note gives it back", () => {
    const entries = [cost(), cost({ id: "e2", description: "Tarvikkeet" })]
    const billed = invoice({ rows: [rebillRow(entries[0], sale, 0, "fi")] })
    expect(
      rebillCandidates(entries, cats, [billed], null).map((e) => e.id)
    ).toEqual(["e2"])
    /* The invoice itself still sees the entry as its own. */
    expect(rebillCandidates(entries, cats, [billed], "i1")).toHaveLength(2)
    const credit = { ...creditDraft(billed, "c", "2026-11-20"), number: 1002 }
    expect(rebilledBy([billed, credit], null).size).toBe(0)
  })

  it("refuses an entry billed twice, on one invoice or across two", () => {
    const row = rebillRow(cost(), sale, 0, "fi")
    expect(
      rebillProblems(invoice({ number: null, rows: [row, row] }), [])
    ).toEqual(["rebilledTwice"])
    const other = invoice({ id: "i0", rows: [row] })
    const next = invoice({ id: "i2", number: null, rows: [row] })
    expect(rebillProblems(next, [other, next])).toEqual(["rebilledTwice"])
    expect(rebillProblems(next, [{ ...other, number: null }, next])).toEqual([])
  })

  it("does not carry the link to a copy or a recurring template", () => {
    const source = invoice({ rows: [rebillRow(cost(), sale, 0, "fi")] })
    const copy = copyDraft(source, "2026-12-01", {
      termDays: 14,
      customers: [],
      makeId: () => "x",
    })
    expect(copy.rows[0].rebills).toBeUndefined()
    const template = templateFromInvoice(source, "t", 1, "2026-12-10")
    expect(template.rows[0].rebills).toBeUndefined()
  })
})
