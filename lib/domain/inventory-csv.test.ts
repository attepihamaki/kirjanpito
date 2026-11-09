import { describe, expect, it } from "vitest"

import type { StockItem } from "@/lib/domain/inventory"
import {
  formatQuantity,
  parseQuantity,
  parseStockCsv,
  serializeStockCsv,
} from "@/lib/domain/inventory-csv"

const item: StockItem = {
  id: "s1",
  name: "Kahvi; tumma",
  sku: "K-1",
  unit: "kpl",
  kind: "goods",
  quantityMilli: 12_500,
  unitCents: 450,
  layers: [],
  lowerUnitCents: 300,
  lowerReason: "Vanhenee",
}

describe("parseQuantity", () => {
  it("reads whole numbers and up to three decimals", () => {
    expect(parseQuantity("12")).toBe(12_000)
    expect(parseQuantity("12,5")).toBe(12_500)
    expect(parseQuantity("0.125")).toBe(125)
    expect(parseQuantity("1 000")).toBe(1_000_000)
  })

  it("refuses text, negatives and more than three decimals", () => {
    expect(parseQuantity("abc")).toBeNull()
    expect(parseQuantity("-1")).toBeNull()
    expect(parseQuantity("1,2345")).toBeNull()
    expect(parseQuantity("")).toBeNull()
  })
})

describe("the stock CSV", () => {
  it("round-trips a list in either language", () => {
    for (const lang of ["fi", "en"] as const) {
      const parsed = parseStockCsv(serializeStockCsv([item], lang))
      expect(parsed).toEqual({
        ok: true,
        skipped: 0,
        rows: [
          {
            name: item.name,
            sku: "K-1",
            unit: "kpl",
            kind: "goods",
            quantityMilli: 12_500,
            unitCents: 450,
            lowerUnitCents: 300,
            lowerReason: "Vanhenee",
          },
        ],
      })
    }
  })

  it("writes a Finnish decimal comma and a byte order mark", () => {
    const text = serializeStockCsv([item], "fi")
    expect(text.startsWith("﻿Nimi;")).toBe(true)
    expect(text).toContain(";12,5;4,50;")
  })

  it("reads a spreadsheet export with its own header names", () => {
    const parsed = parseStockCsv(
      "Tuote;Kpl;Hankintahinta\nPaita;3;19,90\nHousut;x;5\n;2;1\n"
    )
    expect(parsed.ok && parsed.rows).toEqual([
      expect.objectContaining({
        name: "Paita",
        quantityMilli: 3000,
        unitCents: 1990,
      }),
    ])
    expect(parsed.ok && parsed.skipped).toBe(2)
  })

  it("reads a materials row and a missing cost as zero", () => {
    const parsed = parseStockCsv("Name,Qty,Type\nThread,4,materials\n")
    expect(parsed.ok && parsed.rows[0]).toMatchObject({
      kind: "materials",
      unitCents: 0,
    })
  })

  it("refuses an empty file and one with no name or quantity column", () => {
    expect(parseStockCsv("")).toEqual({ ok: false, reason: "empty" })
    expect(parseStockCsv("a;b\n1;2\n")).toEqual({
      ok: false,
      reason: "no-columns",
    })
  })
})

describe("formatQuantity", () => {
  it("follows the language's decimal mark", () => {
    expect(formatQuantity(12_500, "fi")).toBe("12,5")
    expect(formatQuantity(12_500, "en")).toBe("12.5")
    expect(formatQuantity(3000, "fi")).toBe("3")
  })
})
