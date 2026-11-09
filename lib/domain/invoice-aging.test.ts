import { describe, expect, it } from "vitest"

import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import { agingBucket, agingReport } from "@/lib/domain/invoice-aging"
import type { Entry } from "@/lib/domain/types"

const TODAY = "2026-11-10"

function entry(id: string, amount: number, paidOn: string | null): Entry {
  return {
    id,
    date: "2026-09-01",
    description: "Lasku",
    type: "income",
    catId: "300-domestic",
    amount,
    vatRate: 0,
    amountMode: "gross",
    paidOn,
  }
}

function invoice(over: Partial<Invoice>): Invoice {
  return {
    id: "i1",
    number: 1,
    date: "2026-09-01",
    dueDate: "2026-09-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: "c1",
    customer: { ...emptyParty(), name: "Asiakas Oy" },
    language: "fi",
    rows: [],
    note: "",
    terms: "",
    reference: null,
    seller: null,
    issuedAt: "2026-09-01T10:00:00",
    entryIds: ["e1"],
    credits: null,
    ...over,
  }
}

describe("agingBucket", () => {
  it("counts the due day as not yet late", () => {
    expect(agingBucket(TODAY, TODAY)).toBe("notDue")
    expect(agingBucket("2026-11-11", TODAY)).toBe("notDue")
  })

  it("splits the late days at 14, 30 and 60", () => {
    const at = (days: number) => {
      const d = new Date(Date.UTC(2026, 10, 10 - days))
      return agingBucket(d.toISOString().slice(0, 10), TODAY)
    }
    expect([1, 14, 15, 30, 31, 60, 61].map(at)).toEqual([
      "late14",
      "late14",
      "late30",
      "late30",
      "late60",
      "late60",
      "later",
    ])
  })
})

describe("agingReport", () => {
  it("groups the unpaid by customer and bucket, the largest debt first", () => {
    const entries = [
      entry("e1", 10_000, null),
      entry("e2", 5000, null),
      entry("e3", 20_000, null),
      entry("e4", 7000, "2026-10-01"),
    ]
    const report = agingReport(
      [
        invoice({ id: "a", entryIds: ["e1"], dueDate: "2026-09-15" }),
        invoice({
          id: "b",
          number: 2,
          entryIds: ["e2"],
          dueDate: "2026-11-20",
        }),
        invoice({
          id: "c",
          number: 3,
          customerId: "c2",
          customer: { ...emptyParty(), name: "Toinen Oy" },
          entryIds: ["e3"],
          dueDate: "2026-11-01",
        }),
        invoice({ id: "d", number: 4, entryIds: ["e4"] }),
      ],
      entries,
      TODAY
    )
    expect(report.customers.map((c) => c.name)).toEqual([
      "Toinen Oy",
      "Asiakas Oy",
    ])
    expect(report.customers[1].buckets).toMatchObject({
      later: 0,
      late60: 10_000,
      notDue: 5000,
    })
    expect(report.total).toBe(35_000)
    expect(report.buckets.late14).toBe(20_000)
  })

  it("skips drafts and counts an unsettled credit note as negative", () => {
    const entries = [entry("e1", 10_000, null), entry("e2", -4000, null)]
    const report = agingReport(
      [
        invoice({ entryIds: ["e1"] }),
        invoice({
          id: "cr",
          number: 2,
          credits: "i1",
          entryIds: ["e2"],
          dueDate: "2026-11-05",
        }),
        invoice({ id: "dr", number: null, entryIds: [] }),
      ],
      entries,
      TODAY
    )
    expect(report.customers).toHaveLength(1)
    expect(report.customers[0].total).toBe(6000)
  })
})
