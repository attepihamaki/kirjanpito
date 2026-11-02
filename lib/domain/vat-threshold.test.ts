import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatThreshold } from "@/lib/domain/vat-threshold"

/* The 20 000 € turnover limit of VAT liability (§8.12). */

const cats = indexCategories(defaultCategories())
const TODAY = "2026-11-02"

let n = 0
function sale(date: string, euros: number, over: Partial<Entry> = {}): Entry {
  return {
    id: `e${n++}`,
    date,
    description: "",
    type: "income",
    catId: "300-domestic",
    amount: euros * 100,
    vatRate: 0,
    amountMode: "gross",
    ...over,
  }
}
const status = (entries: Entry[]) => vatThreshold(entries, cats, TODAY)

describe("vatThreshold", () => {
  it("adds up this year's sales", () => {
    expect(status([sale("2026-02-01", 4000), sale("2026-03-01", 500)])).toEqual(
      { year: 2026, turnover: 450_000, exceededOn: null, level: "below" }
    )
  })

  it("says nothing with no recent sales", () => {
    expect(status([])).toBeNull()
    expect(status([sale("2024-02-01", 500)])).toBeNull()
  })

  it("says nothing once a sale carries VAT, this year or last", () => {
    const vat = { vatRate: 25.5 }
    expect(status([sale("2026-02-01", 500, vat)])).toBeNull()
    expect(
      status([sale("2025-02-01", 500, vat), sale("2026-02-01", 500)])
    ).toBeNull()
  })

  it("warns from 15 000 €", () => {
    expect(status([sale("2026-02-01", 14_999)])?.level).toBe("below")
    expect(status([sale("2026-02-01", 15_000)])?.level).toBe("near")
  })

  it("allows exactly 20 000 €, and dates the sale that goes over", () => {
    const at = [sale("2026-02-01", 15_000), sale("2026-03-01", 5_000)]
    expect(status(at)?.level).toBe("near")
    const over = status([...at, sale("2026-08-14", 1)])
    expect(over?.level).toBe("over")
    expect(over?.exceededOn).toBe("2026-08-14")
  })

  it("sees last year's turnover over the limit", () => {
    const s = status([sale("2025-12-30", 20_001), sale("2026-01-10", 100)])
    expect(s?.level).toBe("over")
    expect(s?.exceededOn).toBe("2025-12-30")
    expect(s?.turnover).toBe(10_000)
  })

  it("counts EU goods, other countries and reverse charge", () => {
    const s = status([
      sale("2026-01-01", 100, { catId: "300-eu-goods" }),
      sale("2026-01-01", 100, { catId: "300-other" }),
      sale("2026-01-01", 100, { catId: "300-reverse" }),
    ])
    expect(s?.turnover).toBe(30_000)
  })

  it("leaves out EU services and income on other lines", () => {
    const s = status([
      sale("2026-01-01", 100),
      sale("2026-01-01", 900, { catId: "300-eu-services" }),
      sale("2026-01-01", 900, { catId: "318" }),
    ])
    expect(s?.turnover).toBe(10_000)
  })
})
