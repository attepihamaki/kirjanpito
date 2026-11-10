import { describe, expect, it } from "vitest"

import {
  capChangeLog,
  entryChanges,
  relinkChangeLog,
  versionAfter,
  type ChangeRecord,
} from "@/lib/domain/change-log"
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
      { field: "paidOn", from: null, to: "open" },
    ])
  })

  it("records that a voucher became part of a split, not the link's id", () => {
    const [joined] = entryChanges(
      [entry()],
      [entry({ amount: 40_000, split: "g-7f3a" })],
      AT
    )
    expect(joined.changes).toContainEqual({
      field: "split",
      from: null,
      to: "split",
    })
    expect(
      entryChanges([entry({ split: "g1" })], [entry({ split: "g2" })], AT)
    ).toEqual([])
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

  it("gives each voucher its own record when all are cleared", () => {
    const rows = [entry(), entry({ id: "b", voucher: 2 })]
    expect(entryChanges(rows, [], AT).map((r) => r.entryId)).toEqual(["a", "b"])
  })

  it("records a new number on the voucher itself", () => {
    const [record] = entryChanges([entry()], [entry({ voucher: 2 })], AT)
    expect(record.entryId).toBe("a")
    expect(record.changes).toEqual([{ field: "voucher", from: 1, to: 2 }])
  })
})

describe("relinkChangeLog", () => {
  const record = (
    action: ChangeRecord["action"],
    entryId: string,
    voucher: number,
    date: string
  ): ChangeRecord => ({ at: AT, action, entryId, voucher, date })

  it("points a file's records at the entries read from it", () => {
    const log = [
      record("add", "old", 1, "2026-03-10"),
      record("edit", "old", 1, "2026-03-10"),
    ]
    const relinked = relinkChangeLog(log, [entry({ id: "new" })])
    expect(relinked.map((r) => r.entryId)).toEqual(["new", "new"])
  })

  it("follows the voucher number and year the entry was left with", () => {
    const log = [
      record("add", "old", 4, "2025-12-30"),
      record("edit", "old", 1, "2026-03-10"),
    ]
    const entries = [
      entry({ id: "other", voucher: 4, date: "2025-12-30" }),
      entry({ id: "new" }),
    ]
    expect(relinkChangeLog(log, entries).map((r) => r.entryId)).toEqual([
      "new",
      "new",
    ])
  })

  it("leaves a deleted entry's records on their old id", () => {
    const log = [
      record("add", "gone", 1, "2026-03-10"),
      record("delete", "gone", 1, "2026-03-10"),
    ]
    const relinked = relinkChangeLog(log, [entry({ id: "new" })])
    expect(relinked.map((r) => r.entryId)).toEqual(["gone", "gone"])
  })
})

describe("capChangeLog", () => {
  const rec = (action: ChangeRecord["action"], n: number): ChangeRecord => ({
    at: AT,
    action,
    voucher: n,
  })

  it("drops the oldest edits first and keeps lock records", () => {
    const log = [rec("lock", 0), rec("add", 1), rec("edit", 2), rec("add", 3)]
    const out = capChangeLog(log, 3)
    expect(out.map((r) => r.voucher)).toEqual([0, 2, 3])
  })

  it("leaves a short log alone", () => {
    const log = [rec("add", 1)]
    expect(capChangeLog(log, 5)).toBe(log)
  })
})

describe("versionAfter", () => {
  /* The entry's own records, oldest first, as the store writes them. */
  const history = (...steps: Entry[]): ChangeRecord[] =>
    steps.flatMap((e, i) =>
      entryChanges(i === 0 ? [] : [steps[i - 1]], [e], AT)
    )

  const v1 = entry()
  const v2 = entry({ amount: 50_000, description: "Toimitilan vuokra" })
  const v3 = entry({
    amount: 50_000,
    description: "Toimitilan vuokra",
    paidOn: null,
    due: "2026-03-31",
    atts: [{ id: "x", name: "lasku.pdf", type: "application/pdf", size: 9 }],
  })
  const log = history(v1, v2, v3)

  it("undoes every later edit, newest first", () => {
    expect(versionAfter(v3, log, 1)).toEqual({
      entry: { ...v2, atts: v3.atts },
      kept: ["atts"],
    })
    expect(versionAfter(v3, log, 0)?.entry).toEqual({ ...v1, atts: v3.atts })
  })

  it("puts an open voucher back as open", () => {
    const paid = entry({ paidOn: "2026-04-02" })
    const log2 = history(v1, entry({ paidOn: null }), paid)
    expect(versionAfter(paid, log2, 1)?.entry.paidOn).toBeNull()
    expect(versionAfter(paid, log2, 0)?.entry).toEqual(v1)
  })

  it("has nothing to restore at the newest step", () => {
    expect(versionAfter(v3, log, 2)).toBeNull()
    expect(versionAfter(v3, log, -1)).toBeNull()
  })
})
