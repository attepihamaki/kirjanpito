import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { yearOf } from "@/lib/domain/dates"

const entries = sampleEntries(createIdFactory("d"))

describe("sampleEntries", () => {
  it("has sixteen entries, all in 2026 and all gross", () => {
    expect(entries).toHaveLength(16)
    expect(entries.every((e) => yearOf(e.date) === 2026)).toBe(true)
    expect(entries.every((e) => e.amountMode === "gross")).toBe(true)
  })

  // Spelled out rather than snapshotted: a snapshot would quietly absorb a
  // regression on the next `-u`.
  it("matches the §10 table", () => {
    expect(
      entries.map((e) => [
        e.date,
        e.description,
        e.type,
        e.catId,
        e.amount,
        e.vatRate,
      ])
    ).toEqual([
      [
        "2026-01-08",
        "Lasku 1001 – Mäkinen Rakennus Oy",
        "income",
        "300-domestic",
        251000,
        25.5,
      ],
      [
        "2026-01-15",
        "Osto – K-Rauta – tarvikkeet",
        "expense",
        "333",
        18640,
        25.5,
      ],
      [
        "2026-01-31",
        "Puhelinliittymä – Elisa",
        "expense",
        "344-other",
        2990,
        25.5,
      ],
      [
        "2026-02-12",
        "Lasku 1002 – Virtanen",
        "income",
        "300-domestic",
        125500,
        25.5,
      ],
      [
        "2026-02-20",
        "Työtilan vuokra, helmikuu",
        "expense",
        "343",
        45000,
        25.5,
      ],
      [
        "2026-03-03",
        "Lasku 1003 – Nordic Build AB",
        "income",
        "300-eu",
        320000,
        0,
      ],
      [
        "2026-03-18",
        "Polttoaine – Neste",
        "expense",
        "344-vehicle",
        9235,
        25.5,
      ],
      [
        "2026-03-20",
        "Työtilan vuokra, maaliskuu",
        "expense",
        "343",
        45000,
        25.5,
      ],
      [
        "2026-04-09",
        "Lounaspalaveri asiakkaan kanssa",
        "expense",
        "344-meeting",
        4860,
        13.5,
      ],
      [
        "2026-04-20",
        "Työtilan vuokra, huhtikuu",
        "expense",
        "343",
        45000,
        25.5,
      ],
      [
        "2026-05-14",
        "Lasku 1004 – Laaksonen Oy",
        "income",
        "300-reverse",
        480000,
        0,
      ],
      ["2026-06-02", "YEL-maksu", "expense", "336", 31000, 0],
      [
        "2026-09-22",
        "Kirjanpito-ohjelma, vuosimaksu",
        "expense",
        "344-other",
        11900,
        25.5,
      ],
      [
        "2026-10-10",
        "Osto – K-Rauta – Tarvikkeet",
        "expense",
        "333",
        10000,
        25.5,
      ],
      [
        "2026-10-28",
        "Lasku 1005 – Mäkinen Rakennus Oy",
        "income",
        "300-domestic",
        188250,
        25.5,
      ],
      ["2026-10-30", "Pankin palvelumaksut", "expense", "349", 850, 0],
    ])
  })

  it("books every entry to a real default category of the right side", () => {
    const cats = new Map(defaultCategories().map((c) => [c.id, c]))
    for (const e of entries) {
      const cat = cats.get(e.catId)
      expect(cat, `missing category ${e.catId}`).toBeDefined()
    }
  })

  it("uses the injected id factory and keeps ids unique", () => {
    expect(entries[0].id).toBe("d-1")
    expect(new Set(entries.map((e) => e.id)).size).toBe(16)
  })

  it("attaches no receipts", () => {
    expect(entries.every((e) => e.atts === undefined)).toBe(true)
  })
})
