import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { createFormatters } from "@/lib/i18n/create-formatters"

const purchases = defaultCategories().find((c) => c.id === "333")!

describe("catLabel", () => {
  it("leads with the account number by default", () => {
    expect(createFormatters("fi").catLabel(purchases)).toBe(
      `333 ${purchases.name}`
    )
  })

  it("is the name alone when account numbers are hidden", () => {
    const f = createFormatters("fi", false)
    expect(f.catLabel(purchases)).toBe(purchases.name)
    expect(f.catLabel(undefined)).toBe("")
  })

  it("keeps a separate bundle per choice", () => {
    expect(createFormatters("en", false)).not.toBe(createFormatters("en"))
    expect(createFormatters("en", false)).toBe(createFormatters("en", false))
  })
})
