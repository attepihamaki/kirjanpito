import { describe, expect, it } from "vitest"

import {
  EMPTY_HISTORY,
  changedEntries,
  historyAttachmentIds,
  record,
  stepBack,
  stepForward,
  unchangedInvoices,
  type Snapshot,
} from "@/lib/domain/history"
import type { Invoice } from "@/lib/domain/invoice"
import type { Entry } from "@/lib/domain/types"

function entry(id: string, extra: Partial<Entry> = {}): Entry {
  return {
    id,
    date: "2026-01-01",
    description: id,
    type: "expense",
    catId: "333",
    amount: 100,
    vatRate: 25.5,
    amountMode: "gross",
    ...extra,
  }
}

const snap = (...entries: Entry[]): Snapshot => ({
  entries,
  cats: [],
  invoices: [],
})

describe("history", () => {
  it("steps back and forward through recorded states", () => {
    const a = snap()
    const b = snap(entry("1"))
    const c = snap(entry("1"), entry("2"))
    let h = record(record(EMPTY_HISTORY, a), b)

    const back = stepBack(h, c)!
    expect(back.target).toBe(b)
    h = back.history
    const back2 = stepBack(h, b)!
    expect(back2.target).toBe(a)
    h = back2.history
    expect(stepBack(h, a)).toBeNull()

    const fwd = stepForward(h, a)!
    expect(fwd.target).toBe(b)
    expect(fwd.history.past).toEqual([a])
    expect(stepForward(fwd.history, b)!.target).toBe(c)
  })

  it("drops the redo stack on a new change", () => {
    const h = { past: [snap()], future: [snap(entry("1"))] }
    expect(record(h, snap(entry("2"))).future).toEqual([])
  })

  it("lists added, removed and changed entries in both versions", () => {
    const kept = entry("1")
    const editedFrom = entry("2")
    const editedTo = entry("2", { amount: 200 })
    const removed = entry("3")
    const added = entry("4")
    const changed = changedEntries(
      [kept, editedFrom, removed],
      [kept, editedTo, added]
    )
    expect(changed).toEqual(
      expect.arrayContaining([editedFrom, editedTo, removed, added])
    )
    expect(changed).not.toContain(kept)
  })

  it("collects receipt ids from both stacks", () => {
    const att = (id: string) => ({ id, name: id, type: "image/png", size: 1 })
    const h = {
      past: [snap(entry("1", { atts: [att("a")] }))],
      future: [snap(entry("2", { atts: [att("b"), att("a")] }))],
    }
    expect(historyAttachmentIds(h).sort()).toEqual(["a", "b"])
  })

  it("leaves only the invoices both versions share to lock their entries", () => {
    const kept = { id: "a" } as Invoice
    const issued = { id: "b", number: 1 } as Invoice
    const draft = { id: "b", number: null } as Invoice
    expect(unchangedInvoices([kept, issued], [kept, draft])).toEqual([kept])
    expect(unchangedInvoices([kept, issued], [kept])).toEqual([kept])
    expect(unchangedInvoices([kept], [kept, issued])).toEqual([kept])
  })
})
