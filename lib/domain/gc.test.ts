import { describe, expect, it } from "vitest"

import { collectLiveIds } from "@/lib/domain/gc"
import type { Attachment, Entry } from "@/lib/domain/types"

function entry(id: string, atts: Attachment[]): Entry {
  return {
    id,
    date: "2026-01-15",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 1000,
    vatRate: 25.5,
    amountMode: "gross",
    atts,
  }
}

const att = (
  id: string | null,
  over: Partial<Attachment> = {}
): Attachment => ({
  id,
  name: "a.jpg",
  type: "image/jpeg",
  size: 10,
  ...over,
})

describe("collectLiveIds", () => {
  it("collects ids from every entry's attachments", () => {
    const live = collectLiveIds([
      entry("e1", [att("a1"), att("a2")]),
      entry("e2", [att("a3")]),
    ])
    expect([...live].sort()).toEqual(["a1", "a2", "a3"])
  })

  it("ignores missing attachments, which have no stored blob", () => {
    const live = collectLiveIds([
      entry("e1", [att(null, { missing: true, path: "x.jpg" })]),
    ])
    expect(live.size).toBe(0)
  })

  it("tolerates entries with no attachments", () => {
    const bare: Entry = { ...entry("e1", []), atts: undefined }
    expect(collectLiveIds([bare]).size).toBe(0)
    expect(collectLiveIds([]).size).toBe(0)
  })

  /*
   * Without this, a sweep triggered elsewhere would delete receipts the user
   * has just attached in an open dialog but not yet saved.
   */
  it("keeps draft ids that belong to no saved entry", () => {
    const live = collectLiveIds(
      [entry("e1", [att("a1")])],
      ["draft-1", "draft-2"]
    )
    expect([...live].sort()).toEqual(["a1", "draft-1", "draft-2"])
  })

  it("does not double-count an id that is both saved and draft", () => {
    expect(collectLiveIds([entry("e1", [att("a1")])], ["a1"]).size).toBe(1)
  })
})
