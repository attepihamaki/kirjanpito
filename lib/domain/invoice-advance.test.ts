import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import {
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Invoice,
  type InvoiceRow,
} from "@/lib/domain/invoice"
import {
  advanceLeft,
  advanceProblems,
  deductionRows,
  openAdvances,
} from "@/lib/domain/invoice-advance"
import {
  buildIssue,
  creditDraft,
  invoiceTotals,
  issueProblems,
} from "@/lib/domain/invoice-calc"
import { copyDraft } from "@/lib/domain/invoice-draft"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatBasisEntries, vatDate } from "@/lib/domain/vat-basis"

const cats = defaultCategories()
const catMap = indexCategories(cats)

const row = (over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  description: "Työ",
  quantityMilli: 1000,
  unit: "kpl",
  unitCents: 100_000,
  vatRate: 25.5,
  catId: "300-domestic",
  ...over,
})

function draft(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    number: null,
    date: "2026-10-01",
    dueDate: "2026-10-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: "c1",
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

const settings = {
  ...DEFAULT_INVOICE_SETTINGS,
  street: "Katu 2",
  postcode: "00100",
  city: "Helsinki",
  iban: "FI2112345600000785",
}
const business = { name: "Oma", businessId: "0112038-9", phone: "" }

function issue(
  invoice: Invoice,
  invoices: Invoice[] = [],
  originals?: Entry[]
) {
  return buildIssue({
    invoice,
    settings,
    business,
    invoices,
    now: "2026-10-01T10:00:00Z",
    makeId: createIdFactory(invoice.id),
    originalEntries: originals,
  })
}

/* An advance of 1000 € net issued in October and paid in November. */
function paidAdvance() {
  const { invoice, entries } = issue(draft({ id: "adv", kind: "advance" }))
  const paid = entries.map((e) => ({ ...e, paidOn: "2026-11-05" }))
  return { advance: invoice, entries: paid }
}

describe("an advance invoice (§8.27, §6.17)", () => {
  it("books entries flagged as an advance, described as one", () => {
    const { entries } = issue(draft({ kind: "advance" }))
    expect(entries).toHaveLength(1)
    expect(entries[0].advance).toBe(true)
    expect(entries[0].description).toBe("Ennakkolasku 1001 – Asiakas Oy")
  })

  it("has its VAT on the payment date, and none while it is open", () => {
    const { entries } = issue(draft({ kind: "advance" }))
    const open = entries[0]
    expect(vatDate(open, catMap, null)).toBeNull()
    expect(vatBasisEntries([open], catMap, null)).toEqual([])
    const paid = { ...open, paidOn: "2026-11-05" }
    expect(vatDate(paid, catMap, null)).toBe("2026-11-05")
    expect(vatBasisEntries([paid], catMap, null)[0].date).toBe("2026-11-05")
  })

  it("leaves an ordinary invoice on its own date", () => {
    const { entries } = issue(draft())
    expect(entries[0].advance).toBeUndefined()
    expect(vatDate(entries[0], catMap, null)).toBe("2026-10-01")
  })

  it("passes the flag to its credit note's entries", () => {
    const { advance, entries } = paidAdvance()
    const credit = creditDraft(advance, "cr", "2026-11-10")
    const issued = issue(credit, [advance], entries)
    expect(issued.entries.every((e) => e.advance)).toBe(true)
    expect(issued.invoice.number).toBe(1002)
  })

  it("stays an advance when copied", () => {
    const copy = copyDraft(draft({ kind: "advance" }), "2026-12-01", {
      termDays: 14,
      customers: [],
      makeId: () => "copy",
    })
    expect(copy.kind).toBe("advance")
  })
})

describe("deducting an advance on the final invoice", () => {
  it("offers only what was paid", () => {
    const { advance, entries } = paidAdvance()
    const open = entries.map((e) => ({ ...e, paidOn: null }))
    const byOpen = new Map(open.map((e) => [e.id, e]))
    expect(advanceLeft(advance, [advance], byOpen, null)).toEqual([])
    const byPaid = new Map(entries.map((e) => [e.id, e]))
    expect(advanceLeft(advance, [advance], byPaid, null)).toEqual([
      { catId: "300-domestic", vatRate: 25.5, net: 100_000 },
    ])
  })

  it("makes negative rows that the document discount leaves alone", () => {
    const { advance, entries } = paidAdvance()
    const left = advanceLeft(
      advance,
      [advance],
      new Map(entries.map((e) => [e.id, e])),
      null
    )
    const final = draft({
      id: "fin",
      rows: [
        row({ unitCents: 300_000 }),
        ...deductionRows(advance, left, "fi"),
      ],
      discount: 10,
    })
    expect(final.rows[1]).toMatchObject({
      description: "Vähennetään ennakkolasku 1001",
      quantityMilli: -1000,
      advance: "adv",
    })
    /* 3000 € less 10 % is 2700 €, less the 1000 € advance. */
    expect(invoiceTotals(final.rows, final.discount).net).toBe(170_000)
    const { entries: booked } = issue(final, [advance])
    expect(booked).toHaveLength(1)
    expect(booked[0].amount).toBe(170_000)
    expect(booked[0].advance).toBeUndefined()
  })

  it("is not offered again once another invoice deducts it, until that one is credited", () => {
    const { advance, entries } = paidAdvance()
    const byId = new Map(entries.map((e) => [e.id, e]))
    const left = advanceLeft(advance, [advance], byId, null)
    const final = {
      ...draft({
        id: "fin",
        rows: [
          row({ unitCents: 300_000 }),
          ...deductionRows(advance, left, "fi"),
        ],
      }),
      number: 1002,
    }
    const who = { customerId: "c1", name: "Asiakas Oy" }
    expect(openAdvances(who, [advance], byId, null)).toHaveLength(1)
    expect(openAdvances(who, [advance, final], byId, null)).toEqual([])
    const credit = { ...creditDraft(final, "cr", "2026-12-01"), number: 1003 }
    expect(
      openAdvances(who, [advance, final, credit], byId, null)
    ).toHaveLength(1)
  })

  it("refuses a deduction larger than what is left, and one on an advance invoice", () => {
    const { advance, entries } = paidAdvance()
    const tooMuch = draft({
      id: "fin",
      rows: [
        row({ unitCents: 300_000 }),
        {
          ...deductionRows(
            advance,
            [{ catId: "300-domestic", vatRate: 25.5, net: 150_000 }],
            "fi"
          )[0],
        },
      ],
    })
    expect(advanceProblems(tooMuch, [advance], entries)).toEqual([
      "advanceTooLarge",
    ])
    expect(
      advanceProblems({ ...tooMuch, kind: "advance" }, [advance], entries)
    ).toEqual(["advanceOnAdvance"])
  })

  it("accepts the deduction row's negative quantity at issue, and a credit note's positive one", () => {
    const { advance, entries } = paidAdvance()
    const left = advanceLeft(
      advance,
      [advance],
      new Map(entries.map((e) => [e.id, e])),
      null
    )
    const final = draft({
      id: "fin",
      rows: [
        row({ unitCents: 300_000 }),
        ...deductionRows(advance, left, "fi"),
      ],
    })
    expect(
      issueProblems(final, settings, business, cats, [advance], entries)
    ).toEqual([])
    const issuedFinal = issue(final, [advance]).invoice
    const credit = creditDraft(issuedFinal, "cr", "2026-12-01")
    expect(credit.rows[1].quantityMilli).toBe(1000)
    expect(
      issueProblems(
        credit,
        settings,
        business,
        cats,
        [advance, issuedFinal],
        entries
      )
    ).toEqual([])
  })

  it("drops deduction rows from a copy", () => {
    const { advance } = paidAdvance()
    const final = draft({
      rows: [
        row(),
        ...deductionRows(
          advance,
          [{ catId: "300-domestic", vatRate: 25.5, net: 1 }],
          "fi"
        ),
      ],
    })
    const copy = copyDraft(final, "2026-12-01", {
      termDays: 14,
      customers: [],
      makeId: () => "x",
    })
    expect(copy.rows).toHaveLength(1)
  })
})
