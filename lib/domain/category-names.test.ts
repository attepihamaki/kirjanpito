import { describe, expect, it } from "vitest"
import { categoryNameTaken } from "@/lib/domain/category-names"
import type { Category } from "@/lib/domain/types"

function cat(
  over: Partial<Category> & Pick<Category, "id" | "line">
): Category {
  return {
    name: "",
    vatRate: 0,
    enabled: true,
    custom: false,
    ...over,
  }
}

const custom = cat({
  id: "c-1",
  line: "343",
  name: "Toimistovuokra",
  custom: true,
})

describe("categoryNameTaken", () => {
  it("is taken by the same name on the same account and side", () => {
    expect(categoryNameTaken([custom], "Toimistovuokra", "343")).toBe(true)
  })

  it("ignores letter case and surrounding whitespace in the needle", () => {
    expect(categoryNameTaken([custom], "  TOIMISTOvuokra  ", "343")).toBe(true)
  })

  it("is free when the name differs", () => {
    expect(categoryNameTaken([custom], "Varastovuokra", "343")).toBe(false)
  })

  it("is free on another account of the same side", () => {
    expect(categoryNameTaken([custom], "Toimistovuokra", "335")).toBe(false)
  })

  it("is free on the other side", () => {
    expect(categoryNameTaken([custom], "Toimistovuokra", "301")).toBe(false)
  })

  it("is free in an empty list", () => {
    expect(categoryNameTaken([], "Toimistovuokra", "343")).toBe(false)
  })

  it("ignores the category named by exceptId", () => {
    expect(categoryNameTaken([custom], "Toimistovuokra", "343", "c-1")).toBe(
      false
    )
  })

  it("still finds another category with the name when exceptId is given", () => {
    const twin = cat({
      id: "c-2",
      line: "343",
      name: "Toimistovuokra",
      custom: true,
    })
    expect(
      categoryNameTaken([custom, twin], "Toimistovuokra", "343", "c-1")
    ).toBe(true)
  })

  describe("default categories", () => {
    const rent = cat({ id: "343", line: "343", name: "Vuokrat" })

    it("take their Finnish name", () => {
      expect(categoryNameTaken([rent], "vuokrat", "343")).toBe(true)
    })

    it("take their English name", () => {
      expect(categoryNameTaken([rent], " rental EXPENSES", "343")).toBe(true)
    })

    it("take their former names", () => {
      expect(categoryNameTaken([rent], "Rent", "343")).toBe(true)
    })

    it("do not take their names on another account", () => {
      expect(categoryNameTaken([rent], "Rental expenses", "335")).toBe(false)
    })
  })

  describe("custom categories", () => {
    it("take only their own name, not the English or former names of their id", () => {
      const own = cat({ id: "343", line: "343", name: "Oma", custom: true })
      expect(categoryNameTaken([own], "Oma", "343")).toBe(true)
      expect(categoryNameTaken([own], "Rental expenses", "343")).toBe(false)
      expect(categoryNameTaken([own], "Rent", "343")).toBe(false)
    })
  })
})
