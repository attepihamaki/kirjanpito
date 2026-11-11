import { describe, expect, it } from "vitest"

import { cashForecast, type ForecastInput } from "@/lib/domain/cash-forecast"
import { emptyParty, type RecurringInvoice } from "@/lib/domain/invoice"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"

const catMap = indexCategories([
  {
    id: "333",
    line: "333",
    name: "Ostot",
    vatRate: 25.5,
    enabled: true,
    custom: false,
  },
  {
    id: "300-domestic",
    line: "300",
    name: "Myynti",
    vatRate: 25.5,
    kind: "domestic",
    enabled: true,
    custom: false,
  },
] satisfies Category[])

const entry = (over: Partial<Entry>): Entry => ({
  id: "e1",
  date: "2026-11-01",
  description: "Entry",
  type: "expense",
  catId: "333",
  amount: 10_000,
  vatRate: 0,
  amountMode: "gross",
  paidOn: null,
  ...over,
})

const template: RecurringInvoice = {
  id: "t1",
  customerId: null,
  customer: { ...emptyParty(), name: "Kuukausiasiakas" },
  language: "fi",
  rows: [
    {
      description: "Ylläpito",
      quantityMilli: 1000,
      unit: "kk",
      unitCents: 20_000,
      vatRate: 0,
      catId: "300-domestic",
    },
  ],
  note: "",
  every: 1,
  day: 1,
  next: "2026-12-01",
  until: "2027-01-31",
  paused: false,
}

const base = (over: Partial<ForecastInput> = {}): ForecastInput => ({
  today: "2026-11-11",
  balance: 100_000,
  entries: [],
  catMap,
  invoices: [],
  recurring: [],
  recurringInvoices: [],
  customers: [],
  termDays: 14,
  taxes: [],
  ...over,
})

describe("cashForecast (§8.12)", () => {
  it("is flat with nothing coming, over 13 weeks", () => {
    const f = cashForecast(base())
    expect(f.weeks).toHaveLength(13)
    expect(f.weeks[0]).toMatchObject({ start: "2026-11-11", end: "2026-11-17" })
    expect(f.weeks.every((w) => w.balance === 100_000)).toBe(true)
    expect(f.hasBalance).toBe(true)
  })

  it("puts open entries on their due dates and overdue ones in the first week", () => {
    const f = cashForecast(
      base({
        entries: [
          entry({ id: "bill", due: "2026-11-20", amount: 30_000 }),
          entry({ id: "late", due: "2026-11-01", amount: 5000 }),
          entry({
            id: "sale",
            type: "income",
            catId: "300-domestic",
            amount: 40_000,
          }),
          entry({ id: "paid", paidOn: "2026-11-02" }),
          entry({ id: "cash", cash: true, paidOn: "2026-11-02" }),
          entry({ id: "far", due: "2027-06-01" }),
        ],
        invoices: [
          {
            id: "i1",
            number: 1001,
            date: "2026-11-01",
            dueDate: "2026-11-27",
            supplyFrom: null,
            supplyTo: null,
            customerId: null,
            customer: emptyParty(),
            language: "fi",
            rows: [],
            note: "",
            terms: "",
            reference: "10016",
            seller: null,
            issuedAt: "2026-11-01T08:00:00.000Z",
            entryIds: ["sale"],
            credits: null,
          },
        ],
      })
    )
    expect(f.flows.map((x) => [x.kind, x.date, x.amount])).toEqual([
      ["bill", "2026-11-11", -5000],
      ["bill", "2026-11-20", -30_000],
      ["receivable", "2026-11-27", 40_000],
    ])
    expect(f.overdueOut).toBe(-5000)
    expect(f.weeks[0].balance).toBe(95_000)
    expect(f.weeks[1].balance).toBe(65_000)
    expect(f.weeks[2].balance).toBe(105_000)
    expect(f.lowest.start).toBe("2026-11-18")
  })

  it("adds recurring entries not yet booked, and invoices from templates on their due dates", () => {
    const f = cashForecast(
      base({
        recurring: [
          {
            id: "r1",
            description: "Vuokra",
            type: "expense",
            catId: "333",
            amount: 50_000,
            vatRate: 0,
            amountMode: "gross",
            day: 5,
            from: "2026-01",
          },
        ],
        entries: [
          entry({
            id: "dec",
            date: "2026-12-05",
            description: "Vuokra",
            amount: 50_000,
          }),
        ],
        recurringInvoices: [template],
      })
    )
    const rent = f.flows.filter((x) => x.kind === "recurring")
    expect(rent.map((x) => x.date)).toEqual(["2027-01-05", "2027-02-05"])
    const invoices = f.flows.filter((x) => x.kind === "recurringInvoice")
    expect(invoices.map((x) => [x.date, x.amount])).toEqual([
      ["2026-12-15", 20_000],
      ["2027-01-15", 20_000],
    ])
  })

  it("takes VAT and advance tax as payments, a refund as money in", () => {
    const f = cashForecast(
      base({
        balance: null,
        taxes: [
          { kind: "vat", date: "2026-12-12", amount: 25_000, label: "Lokakuu" },
          {
            kind: "vat",
            date: "2027-01-12",
            amount: -3000,
            label: "Marraskuu",
          },
          { kind: "advanceTax", date: "2026-11-23", amount: 0, label: "x" },
        ],
      })
    )
    expect(f.hasBalance).toBe(false)
    expect(f.flows.map((x) => x.amount)).toEqual([-25_000, 3000])
    expect(f.weeks.at(-1)!.balance).toBe(-22_000)
  })
})
