import { describe, expect, it } from "vitest"

import { entryChanges } from "@/lib/domain/change-log"
import type { Entry } from "@/lib/domain/types"

const AT = "2026-11-03T10:00:00.000Z"

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "a",
    voucher: 1,
    date: "2026-03-10",
    description: "Vuokra",
    type: "expense",
    catId: "343",
    amount: 45_000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("entryChanges", () => {
  it("records an added entry", () => {
    expect(entryChanges([], [entry()], AT)).toEqual([
      {
        at: AT,
        action: "add",
        entryId: "a",
        voucher: 1,
        date: "2026-03-10",
        description: "Vuokra",
      },
    ])
  })

  it("records a deleted entry", () => {
    expect(entryChanges([entry()], [], AT)[0].action).toBe("delete")
  })

  it("records only the fields that changed", () => {
    const [record] = entryChanges(
      [entry()],
      [entry({ amount: 50_000, paidOn: null })],
      AT
    )
    expect(record.action).toBe("edit")
    expect(record.changes).toEqual([
      { field: "amount", from: 45_000, to: 50_000 },
    ])
  })

  it("records nothing when nothing changed", () => {
    expect(entryChanges([entry()], [entry()], AT)).toEqual([])
  })

  it("records a payment date going from open to paid", () => {
    const [record] = entryChanges(
      [entry({ paidOn: "2026-04-01" })],
      [entry({ paidOn: "2026-05-01" })],
      AT
    )
    expect(record.changes).toEqual([
      { field: "paidOn", from: "2026-04-01", to: "2026-05-01" },
    ])
  })

  it("names receipts by name and size", () => {
    const att = {
      id: "x",
      name: "kuitti.pdf",
      type: "application/pdf",
      size: 9,
    }
    const [record] = entryChanges([entry()], [entry({ atts: [att] })], AT)
    expect(record.changes).toEqual([
      { field: "atts", from: null, to: "kuitti.pdf (9)" },
    ])
  })

  it("marks restored entries as an undo", () => {
    expect(entryChanges([], [entry()], AT, "restore")[0].action).toBe("restore")
  })

  it("gives one record for clearing", () => {
    expect(entryChanges([entry()], [], AT, "clear")).toEqual([
      { at: AT, action: "clear", count: 1 },
    ])
  })

  it("gives one record for renumbering", () => {
    expect(
      entryChanges([entry()], [entry({ voucher: 2 })], AT, "renumber")
    ).toEqual([{ at: AT, action: "renumber", count: 1 }])
  })
})
