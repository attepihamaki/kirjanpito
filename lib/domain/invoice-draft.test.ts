import { describe, expect, it } from "vitest"

import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
  type Invoice,
  type RecurringInvoice,
} from "@/lib/domain/invoice"
import {
  canCopy,
  copyDraft,
  firstRecurringDate,
  nextRecurringDate,
  productFromRow,
  productRow,
  recurringDrafts,
  recurringEnded,
  templateFromInvoice,
} from "@/lib/domain/invoice-draft"
import { parseInvoiceSettings, parseInvoices } from "@/lib/domain/invoice-file"

const customer: Customer = {
  ...CUSTOMER_DEFAULTS,
  ...emptyParty(),
  id: "c1",
  name: "Asiakas Oy",
  street: "Uusi katu 5",
  postcode: "00100",
  city: "Helsinki",
  language: "fi",
  termDays: 30,
}

const issued: Invoice = {
  id: "i1",
  number: 1001,
  date: "2026-08-15",
  dueDate: "2026-08-29",
  supplyFrom: "2026-08-01",
  supplyTo: "2026-08-31",
  customerId: "c1",
  customer: { ...emptyParty(), name: "Asiakas Oy", street: "Vanha katu 1" },
  language: "en",
  rows: [
    {
      description: "Ylläpito",
      quantityMilli: 1000,
      unit: "kk",
      unitCents: 20_000,
      vatRate: 24,
      catId: "300-domestic",
    },
  ],
  note: "Kiitos",
  terms: "Netto 14",
  reference: "10013",
  seller: null,
  issuedAt: "2026-08-15T10:00:00.000Z",
  entryIds: ["e1"],
  credits: null,
  reminders: [
    {
      id: "m1",
      date: "2026-09-10",
      open: 25_100,
      rate: 11.5,
      interest: 50,
      fee: 500,
      newDueDate: "2026-09-24",
    },
  ],
}

let n = 0
const ctx = {
  termDays: 14,
  customers: [customer],
  makeId: () => `d${++n}`,
}

describe("copyDraft", () => {
  it("starts a dated draft with the rows, the note and the customer's details now", () => {
    const draft = copyDraft(issued, "2026-11-10", ctx)
    expect(draft).toMatchObject({
      number: null,
      date: "2026-11-10",
      dueDate: "2026-12-10",
      supplyFrom: null,
      supplyTo: null,
      customerId: "c1",
      language: "en",
      note: "Kiitos",
      terms: "",
      reference: null,
      issuedAt: null,
      entryIds: [],
      credits: null,
    })
    expect(draft.customer.street).toBe("Uusi katu 5")
    expect(draft.reminders).toBeUndefined()
    expect(draft.id).not.toBe(issued.id)
  })

  it("moves a VAT rate that has changed since on to the new date", () => {
    expect(copyDraft(issued, "2026-11-10", ctx).rows[0].vatRate).toBe(25.5)
  })

  it("keeps the typed customer and the book's term when the register has no such customer", () => {
    const typed = { ...issued, customerId: null }
    const draft = copyDraft(typed, "2026-11-10", ctx)
    expect(draft.customer.street).toBe("Vanha katu 1")
    expect(draft.dueDate).toBe("2026-11-24")
  })

  it("does not copy a credit note", () => {
    expect(canCopy(issued)).toBe(true)
    expect(canCopy({ ...issued, credits: "i0" })).toBe(false)
  })
})

describe("the schedule", () => {
  it("moves on by whole months, to the month's last day when it is shorter", () => {
    const monthly = { every: 1, day: 31 }
    expect(nextRecurringDate(monthly, "2026-01-31")).toBe("2026-02-28")
    expect(nextRecurringDate(monthly, "2026-02-28")).toBe("2026-03-31")
    expect(nextRecurringDate({ every: 3, day: 15 }, "2026-11-15")).toBe(
      "2027-02-15"
    )
    expect(nextRecurringDate({ every: 12, day: 29 }, "2028-02-29")).toBe(
      "2029-02-28"
    )
  })

  it("starts a template after today, so nothing past is made", () => {
    expect(firstRecurringDate(1, "2026-08-15", "2026-11-10")).toBe("2026-11-15")
    expect(firstRecurringDate(1, "2026-08-15", "2026-11-15")).toBe("2026-12-15")
    expect(firstRecurringDate(3, "2026-11-10", "2026-11-10")).toBe("2027-02-10")
  })
})

describe("recurringDrafts", () => {
  const template = (
    over: Partial<RecurringInvoice> = {}
  ): RecurringInvoice => ({
    ...templateFromInvoice(issued, "r1", 1, "2026-09-30"),
    day: 31,
    ...over,
  })

  it("makes one draft for each date that has come, and moves the template on", () => {
    const run = recurringDrafts([template()], "2026-11-10", ctx)
    expect(run.drafts.map((d) => [d.date, d.recurring])).toEqual([
      ["2026-09-30", "r1"],
      ["2026-10-31", "r1"],
    ])
    expect(run.drafts[0].dueDate).toBe("2026-10-30")
    expect(run.templates[0].next).toBe("2026-11-30")
  })

  it("makes nothing before the date, while paused, or after the last date", () => {
    const early = template({ next: "2026-11-11" })
    const paused = template({ paused: true })
    const ended = template({ until: "2026-09-29" })
    const run = recurringDrafts([early, paused, ended], "2026-11-10", ctx)
    expect(run.drafts).toEqual([])
    expect(run.templates).toEqual([early, paused, ended])
    expect(recurringEnded(ended)).toBe(true)
  })

  it("stops at the last date", () => {
    const run = recurringDrafts(
      [template({ until: "2026-10-15" })],
      "2026-11-10",
      ctx
    )
    expect(run.drafts.map((d) => d.date)).toEqual(["2026-09-30"])
    expect(recurringEnded(run.templates[0])).toBe(true)
  })

  it("makes at most a year of drafts for a book left closed a long time", () => {
    const run = recurringDrafts(
      [template({ next: "2020-01-31" })],
      "2026-11-10",
      ctx
    )
    expect(run.drafts).toHaveLength(12)
    expect(run.drafts[11].date).toBe("2026-10-31")
    expect(run.templates[0].next).toBe("2026-11-30")
  })
})

describe("products", () => {
  it("fill a row and are kept from one", () => {
    const product = productFromRow(issued.rows[0], "p1")
    expect(product).toEqual({
      id: "p1",
      name: "Ylläpito",
      unit: "kk",
      unitCents: 20_000,
      vatRate: 24,
      catId: "300-domestic",
    })
    expect(productRow(product, "2026-11-10")).toEqual({
      ...issued.rows[0],
      vatRate: 25.5,
    })
  })
})

describe("in the files", () => {
  it("drop a product or a template that cannot be read and keep the rest", () => {
    const good = templateFromInvoice(issued, "r1", 3, "2026-12-31")
    const settings = parseInvoiceSettings({
      products: [
        productFromRow(issued.rows[0], "p1"),
        { id: "p2", name: "", unitCents: 1, vatRate: 24, catId: "x" },
        { id: "p3", name: "Kallis", unitCents: -5, vatRate: 24, catId: "x" },
        productFromRow(issued.rows[0], "p1"),
      ],
      recurring: [
        good,
        { ...good, id: "r2", every: 5 },
        { ...good, id: "r3", rows: [] },
        { ...good, id: "r4", day: 0 },
      ],
    })
    expect(settings.products.map((p) => p.id)).toEqual(["p1"])
    expect(settings.recurring).toEqual([good])
  })

  it("keep the template an invoice was made from", () => {
    const draft = { ...copyDraft(issued, "2026-11-10", ctx), recurring: "r1" }
    const text = JSON.stringify({ invoices: [draft] })
    expect(parseInvoices(text).invoices[0].recurring).toBe("r1")
  })
})
