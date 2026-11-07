import { describe, expect, it } from "vitest"

import { categoryUsage, mostUsedCategories } from "@/lib/domain/category-usage"
import type { Category } from "@/lib/domain/types"

const cat = (id: string) => ({ id }) as Category

describe("category usage", () => {
  it("counts entries per category", () => {
    const usage = categoryUsage([
      { catId: "a" },
      { catId: "b" },
      { catId: "a" },
    ])
    expect(usage.get("a")).toBe(2)
    expect(usage.get("b")).toBe(1)
    expect(usage.get("c")).toBeUndefined()
  })

  it("lists the most used first and keeps the given order on ties", () => {
    const usage = categoryUsage([
      { catId: "c" },
      { catId: "c" },
      { catId: "b" },
    ])
    const top = mostUsedCategories(
      [cat("a"), cat("b"), cat("c"), cat("d")],
      usage
    )
    expect(top.map((c) => c.id)).toEqual(["c", "b"])
  })

  it("stops at the limit and skips unused categories", () => {
    const usage = categoryUsage([
      { catId: "a" },
      { catId: "b" },
      { catId: "c" },
    ])
    const top = mostUsedCategories(
      [cat("a"), cat("b"), cat("c"), cat("d")],
      usage,
      2
    )
    expect(top.map((c) => c.id)).toEqual(["a", "b"])
  })
})
