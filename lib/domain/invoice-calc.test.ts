import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { calcEntry } from "@/lib/domain/calc"
import { createIdFactory } from "@/lib/domain/id"
import {
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Invoice,
  type InvoiceRow,
  type InvoiceSettings,
} from "@/lib/domain/invoice"
import {
  buildIssue,
  creditableAmount,
  creditDraft,
  invoicesOfEntries,
  creditedAmount,
  invoiceGroups,
  invoiceTotals,
  issueProblems,
  nextInvoiceNumber,
  rowNet,
  type BusinessDetails,
} from "@/lib/domain/invoice-calc"

const row = (over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  description: "Työ",
  quantityMilli: 1000,
  unit: "kpl",
  unitCents: 10_000,
  vatRate: 25.5,
  catId: "300-domestic",
  ...over,
})

function draft(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    number: null,
    date: "2026-11-01",
    dueDate: "2026-11-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: {
      ...emptyParty(),
      name: "Asiakas Oy",
      street: "Tie 1",
      city: "Espoo",
    },
    language: "fi",
    rows: [row()],
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

const settings: InvoiceSettings = {
  ...DEFAULT_INVOICE_SETTINGS,
  street: "Katu 2",
  postcode: "00100",
  city: "Helsinki",
  iban: "FI2112345600000785",
}
const business: BusinessDetails = {
  name: "Oma Yritys",
  businessId: "0112038-9",
  phone: "09 1234567",
}
const cats = defaultCategories()

describe("rowNet", () => {
  it("multiplies in thousandths and rounds to the cent", () => {
    expect(rowNet({ quantityMilli: 1500, unitCents: 6000 })).toBe(9000)
    expect(rowNet({ quantityMilli: 333, unitCents: 1000 })).toBe(333)
    expect(rowNet({ quantityMilli: 1, unitCents: 1 })).toBe(0)
  })
})

describe("invoiceGroups and invoiceTotals", () => {
  it("groups by category and rate, in first-seen order", () => {
    const groups = invoiceGroups([
      row({ unitCents: 10_000 }),
      row({ vatRate: 14, catId: "300-domestic", unitCents: 5000 }),
      row({ unitCents: 2000 }),
    ])
    expect(groups.map((g) => [g.vatRate, g.net])).toEqual([
      [25.5, 12_000],
      [14, 5000],
    ])
  })

  it("takes each group's VAT from calcEntry, so the entry and the invoice agree", () => {
    const rows = [
      row({ unitCents: 3333, quantityMilli: 3000 }),
      row({ vatRate: 14, unitCents: 999 }),
    ]
    for (const group of invoiceGroups(rows)) {
      expect(group.vat).toBe(
        calcEntry({
          amount: group.net,
          vatRate: group.vatRate,
          amountMode: "net",
        }).vat
      )
    }
  })

  it("totals per rate, lowest first, and adds up to the gross", () => {
    const totals = invoiceTotals([
      row({ unitCents: 10_000 }),
      row({ vatRate: 0, unitCents: 500 }),
      row({ vatRate: 14, unitCents: 1000 }),
    ])
    expect(totals.rates.map((r) => r.vatRate)).toEqual([0, 14, 25.5])
    expect(totals.net).toBe(11_500)
    expect(totals.vat).toBe(2550 + 140)
    expect(totals.gross).toBe(totals.net + totals.vat)
  })

  it("is zero for no rows", () => {
    expect(invoiceTotals([])).toEqual({ net: 0, vat: 0, gross: 0, rates: [] })
  })
})

describe("nextInvoiceNumber", () => {
  const issued = (number: number) => draft({ number })

  it("starts at the first number", () => {
    expect(nextInvoiceNumber([], 1001)).toBe(1001)
  })

  it("is one past the highest, whatever order they come in", () => {
    expect(
      nextInvoiceNumber([issued(1001), issued(1005), issued(1003)], 1001)
    ).toBe(1006)
  })

  it("counts a number reserved by a reopened draft as used", () => {
    expect(
      nextInvoiceNumber([issued(1001), draft({ reservedNumber: 1002 })], 1001)
    ).toBe(1003)
  })

  it("ignores drafts and never goes below the first number", () => {
    expect(nextInvoiceNumber([draft()], 2000)).toBe(2000)
    expect(nextInvoiceNumber([issued(1001)], 2000)).toBe(2000)
  })
})

describe("issueProblems", () => {
  const problems = (invoice: Invoice, s = settings, b = business) =>
    issueProblems(invoice, s, b, cats)

  it("passes a complete invoice", () => {
    expect(problems(draft())).toEqual([])
  })

  it("names every missing piece", () => {
    const empty = draft({ rows: [], customer: emptyParty() })
    expect(
      problems(empty, DEFAULT_INVOICE_SETTINGS, {
        name: null,
        businessId: null,
        phone: null,
      })
    ).toEqual([
      "noRows",
      "noCustomer",
      "sellerName",
      "sellerId",
      "sellerAddress",
      "sellerIban",
    ])
  })

  it("wants the customer's address", () => {
    const noAddress = draft({ customer: { ...emptyParty(), name: "Asiakas" } })
    expect(problems(noAddress)).toEqual(["customerAddress"])
  })

  it.each([
    ["a blank description", { description: " " }],
    ["a zero quantity", { quantityMilli: 0 }],
    ["a negative price", { unitCents: -1 }],
  ])("refuses %s", (_name, over) => {
    expect(problems(draft({ rows: [row(over)] }))).toContain("badRow")
  })

  it.each([
    ["an unknown category", "nope"],
    ["an expense category", "333"],
    ["an EU sales category", "300-eu-goods"],
  ])("refuses %s", (_name, catId) => {
    expect(problems(draft({ rows: [row({ catId })] }))).toContain("badCategory")
  })

  it("refuses a disabled category", () => {
    const off = cats.map((c) =>
      c.id === "300-domestic" ? { ...c, enabled: false } : c
    )
    expect(issueProblems(draft(), settings, business, off)).toContain(
      "badCategory"
    )
  })

  it("refuses an invoice of nothing and a due date before the invoice date", () => {
    expect(problems(draft({ rows: [row({ unitCents: 0 })] }))).toEqual([
      "noTotal",
    ])
    expect(problems(draft({ dueDate: "2026-10-31" }))).toEqual([
      "dueBeforeDate",
    ])
  })
})

describe("buildIssue", () => {
  const build = (invoice: Invoice, invoices: Invoice[] = []) =>
    buildIssue({
      invoice,
      settings,
      business,
      invoices,
      now: "2026-11-01T09:00:00.000Z",
      makeId: createIdFactory("x"),
    })

  it("numbers the invoice, makes its reference and snapshots the seller", () => {
    const { invoice } = build(draft())
    expect(invoice.number).toBe(1001)
    expect(invoice.reference).toBe("10016")
    expect(invoice.issuedAt).toBe("2026-11-01T09:00:00.000Z")
    expect(invoice.seller).toMatchObject({
      name: "Oma Yritys",
      businessId: "0112038-9",
      vatId: "FI01120389",
      iban: "FI2112345600000785",
      city: "Helsinki",
    })
  })

  it("takes the reserved number back and spends it", () => {
    const { invoice } = build(draft({ reservedNumber: 1003 }), [
      draft({ id: "o", number: 1004 }),
    ])
    expect(invoice.number).toBe(1003)
    expect(invoice.reference).toBe("10032")
    expect(invoice.reservedNumber).toBeUndefined()
  })

  it("books one open income entry per group, net, dated on the invoice date", () => {
    const { invoice, entries } = build(
      draft({ rows: [row(), row({ unitCents: 5000 })] })
    )
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      date: "2026-11-01",
      type: "income",
      catId: "300-domestic",
      amount: 15_000,
      vatRate: 25.5,
      amountMode: "net",
      paidOn: null,
      description: "Lasku 1001 – Asiakas Oy",
    })
    expect(entries[0]).not.toHaveProperty("split")
    expect(invoice.entryIds).toEqual([entries[0].id])
  })

  it("links the entries of several rates with one split id", () => {
    const { entries } = build(draft({ rows: [row(), row({ vatRate: 14 })] }))
    expect(entries).toHaveLength(2)
    expect(entries[0].split).toBeDefined()
    expect(entries[0].split).toBe(entries[1].split)
    expect(entries.map((e) => e.vatRate)).toEqual([25.5, 14])
  })

  it("takes the next number after the ones issued", () => {
    const { invoice } = build(draft(), [draft({ number: 1007 })])
    expect(invoice.number).toBe(1008)
  })

  it("words the entry in the invoice language", () => {
    const { entries } = build(draft({ language: "en" }))
    expect(entries[0].description).toBe("Invoice 1001 – Asiakas Oy")
  })

  it("books gross amounts equal to the invoice total", () => {
    const rows = [
      row({ unitCents: 3333, quantityMilli: 3000 }),
      row({ vatRate: 14, unitCents: 999 }),
    ]
    const { entries } = build(draft({ rows }))
    const gross = entries.reduce((sum, e) => sum + calcEntry(e).gross, 0)
    expect(gross).toBe(invoiceTotals(rows).gross)
  })
})

describe("credit notes", () => {
  const original = (over: Partial<Invoice> = {}): Invoice => ({
    ...draft(),
    id: "orig",
    number: 1001,
    reference: "10016",
    issuedAt: "2026-11-01T09:00:00.000Z",
    entryIds: ["oe"],
    ...over,
  })
  /* 100,00 + 25,5 % = 125,50 gross. */
  const note = (over: Partial<Invoice> = {}): Invoice => ({
    ...creditDraft(original(), "c1", "2026-11-20"),
    ...over,
  })
  const withNote = (n: Invoice, others: Invoice[] = [original()]) =>
    issueProblems(n, settings, business, cats, [...others, n])

  it("is the invoice rows with their quantities turned negative", () => {
    const n = creditDraft(original(), "c1", "2026-11-20")
    expect(n).toMatchObject({
      number: null,
      credits: "orig",
      date: "2026-11-20",
      dueDate: "2026-11-20",
      language: "fi",
    })
    expect(n.rows.map((r) => r.quantityMilli)).toEqual([-1000])
    expect(invoiceTotals(n.rows).gross).toBe(-12_550)
  })

  it("is the exact opposite of its invoice, rounding included", () => {
    const rows = [
      row({ quantityMilli: 3000, unitCents: 3333 }),
      row({ vatRate: 14, unitCents: 999 }),
    ]
    const n = creditDraft(original({ rows }), "c1", "2026-11-20")
    const a = invoiceTotals(rows)
    const b = invoiceTotals(n.rows)
    expect(b.net).toBe(-a.net)
    expect(b.vat).toBe(-a.vat)
    expect(b.gross).toBe(-a.gross)
  })

  it("passes when it credits an issued invoice", () => {
    expect(withNote(note())).toEqual([])
  })

  it("wants negative quantities and a negative total", () => {
    expect(withNote(note({ rows: [row()] }))).toContain("badRow")
    expect(withNote(note({ rows: [row()] }))).toContain("noTotal")
  })

  it("needs an issued invoice to credit", () => {
    expect(withNote(note(), [])).toContain("creditOriginal")
    expect(withNote(note(), [original({ number: null })])).toContain(
      "creditOriginal"
    )
  })

  it("will not credit more than is left on the invoice", () => {
    const big = note({ rows: [row({ quantityMilli: -2000 })] })
    expect(withNote(big)).toEqual(["creditTooLarge"])
    const first = note({ id: "c0", number: 1002 })
    expect(withNote(note(), [original(), first])).toEqual(["creditTooLarge"])
  })

  it("counts only issued credit notes", () => {
    const o = original()
    const issued = note({ id: "c0", number: 1002 })
    const unissued = note({ id: "c9" })
    expect(creditedAmount(o, [o, issued, unissued])).toBe(12_550)
    expect(creditableAmount(o, [o, issued, unissued])).toBe(0)
    expect(creditableAmount(o, [o, unissued])).toBe(12_550)
  })

  describe("when issued", () => {
    const build = (
      n: Invoice,
      extra: Partial<Parameters<typeof buildIssue>[0]> = {}
    ) =>
      buildIssue({
        invoice: n,
        settings,
        business,
        invoices: [original()],
        now: "2026-11-20T09:00:00.000Z",
        makeId: createIdFactory("x"),
        originalEntries: [
          {
            id: "oe",
            date: "2026-11-01",
            description: "Lasku 1001",
            type: "income",
            catId: "300-domestic",
            amount: 10_000,
            vatRate: 25.5,
            amountMode: "net",
            paidOn: null,
          },
        ],
        ...extra,
      })

    it("books negative open entries that point at the entry they credit", () => {
      const { invoice, entries } = build(note())
      expect(invoice.number).toBe(1002)
      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({
        type: "income",
        amount: -10_000,
        vatRate: 25.5,
        amountMode: "net",
        paidOn: null,
        reverses: "oe",
        description: "Hyvityslasku 1002 – Asiakas Oy",
      })
      expect(calcEntry(entries[0]).gross).toBe(-12_550)
    })

    it("books them paid on their own date when the credit cancels an unpaid invoice", () => {
      const { entries } = build(note(), { settled: true })
      expect(entries[0].paidOn).toBeUndefined()
    })

    it("words the entry in English for an English credit note", () => {
      const { entries } = build(note({ language: "en" }))
      expect(entries[0].description).toBe("Credit note 1002 – Asiakas Oy")
    })

    it("points a rate it cannot match at the first entry of the invoice", () => {
      const other = note({ rows: [row({ quantityMilli: -1000, vatRate: 14 })] })
      expect(build(other).entries[0].reverses).toBe("oe")
    })
  })
})

describe("invoicesOfEntries", () => {
  const owned = (id: string, entryIds: string[], customerId: string | null) =>
    ({ ...draft(), id, number: 1001, entryIds, customerId }) as Invoice
  const customer = (id: string) => ({
    ...emptyParty(),
    id,
    name: id,
    language: "fi" as const,
    termDays: null,
  })
  const entries = [{ id: "a" }, { id: "c" }] as Entry[]

  it("keeps the invoices that own one of the entries, and their customers", () => {
    const result = invoicesOfEntries(
      entries,
      [
        owned("i1", ["a", "b"], "k1"),
        owned("i2", ["z"], "k2"),
        owned("i3", ["c"], null),
      ],
      [customer("k1"), customer("k2")]
    )
    expect(result.invoices.map((i) => i.id)).toEqual(["i1", "i3"])
    expect(result.customers.map((c) => c.id)).toEqual(["k1"])
  })

  it("is empty for entries no invoice owns", () => {
    expect(
      invoicesOfEntries(entries, [owned("i2", ["z"], "k2")], [customer("k2")])
    ).toEqual({
      invoices: [],
      customers: [],
    })
  })
})
