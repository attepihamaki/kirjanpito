import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import { NOTE_MAX, noteField, normalizeNote } from "@/lib/domain/note"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* The voucher note and the "to check" mark (§8.39). */

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    date: "2026-10-15",
    description: "Puhelin",
    type: "expense",
    catId: "333",
    amount: 4_990,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const back = (e: Entry, lang: "fi" | "en" = "fi") => {
  const parsed = parseCsv(serializeCsv([e], cats, { lang }), baseCats)
  if (!parsed.ok) throw new Error(parsed.code)
  return parsed.entries[0]
}

describe("normalizeNote", () => {
  it("trims, keeps line breaks as \\n and cuts at the limit", () => {
    expect(normalizeNote("  rivi 1\r\nrivi 2  ")).toBe("rivi 1\nrivi 2")
    expect(normalizeNote("x".repeat(NOTE_MAX + 10))).toHaveLength(NOTE_MAX)
    expect(noteField("   ")).toEqual({})
  })
})

describe("CSV columns", () => {
  it("round-trip a note and the mark in both languages", () => {
    const e = entry({
      note: "Kysy kirjanpitäjältä; onko edustusta?\n=SUM(A1)",
      toCheck: true,
    })
    for (const lang of ["fi", "en"] as const) {
      const read = back(e, lang)
      expect(read.note).toBe(e.note)
      expect(read.toCheck).toBe(true)
    }
  })

  it("write nothing for a voucher with neither", () => {
    const read = back(entry())
    expect(read).not.toHaveProperty("note")
    expect(read).not.toHaveProperty("toCheck")
  })

  it("defuse a note that starts like a formula", () => {
    const text = serializeCsv([entry({ note: "=1+1" })], cats)
    expect(text).toContain(";'=1+1;")
  })
})

describe("the toCheck check", () => {
  it("flags only the vouchers the user marked", () => {
    const entries = [entry({ id: "a", toCheck: true }), entry({ id: "b" })]
    expect([
      ...flaggedEntryIds("toCheck", entries, cats, "2026-11-02"),
    ]).toEqual(["a"])
  })
})
