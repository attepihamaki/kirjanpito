import { describe, expect, it } from "vitest"

import { type Inventory, type StockItem } from "@/lib/domain/inventory"
import { parseInventory, serializeInventory } from "@/lib/domain/inventory-file"

function row(over: Partial<StockItem> = {}): StockItem {
  return {
    id: "s1",
    name: "Kahvi",
    sku: "K-1",
    unit: "kpl",
    kind: "goods",
    quantityMilli: 12_500,
    unitCents: 450,
    layers: [{ date: "2026-03-01", quantityMilli: 12_500, unitCents: 450 }],
    lowerUnitCents: 300,
    lowerReason: "Vanhenee",
    ...over,
  }
}

describe("inventory.json", () => {
  it("round-trips a book", () => {
    const inv: Inventory = {
      method: "fifo",
      years: { "2026": [row(), row({ id: "s2", name: "Aaa" })] },
    }
    const parsed = parseInventory(serializeInventory(inv))
    expect(parsed.skipped).toBe(0)
    expect(parsed.inventory.method).toBe("fifo")
    expect(parsed.inventory.years["2026"].map((r) => r.name)).toEqual([
      "Aaa",
      "Kahvi",
    ])
    expect(parsed.inventory.years["2026"][1]).toEqual(row())
  })

  it("writes the same text for the same stock", () => {
    const a = { method: "average" as const, years: { "2026": [row()] } }
    expect(serializeInventory(a)).toBe(serializeInventory(a))
    expect(serializeInventory(a).endsWith("\n")).toBe(true)
  })

  it("drops a row that cannot be read and counts it", () => {
    const text = JSON.stringify({
      version: 1,
      method: "average",
      years: {
        "2026": [
          row(),
          { ...row({ id: "s2" }), quantityMilli: 1.5 },
          { ...row({ id: "s3" }), layers: [{ date: "x" }] },
          { ...row(), id: "s1" },
          "junk",
        ],
        abc: [row()],
      },
    })
    const parsed = parseInventory(text)
    expect(parsed.inventory.years["2026"].map((r) => r.id)).toEqual(["s1"])
    expect(parsed.inventory.years.abc).toBeUndefined()
    expect(parsed.skipped).toBe(4)
  })

  it("falls back to the average method and an empty book", () => {
    expect(parseInventory("not json").inventory).toEqual({
      method: "average",
      years: {},
    })
    expect(
      parseInventory('{"method":"lifo","years":{}}').inventory.method
    ).toBe("average")
  })
})
