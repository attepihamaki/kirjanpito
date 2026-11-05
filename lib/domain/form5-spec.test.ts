import { describe, expect, it } from "vitest"

import { form5Sections } from "@/lib/domain/form5"
import {
  FORM5_FIELDS,
  form5Field,
  form5Label,
  isMoneyField,
} from "@/lib/domain/form5-spec"
import { defaultCategories } from "@/lib/domain/accounts"
import { incomeStatement } from "@/lib/domain/income-statement"
import { indexCategories } from "@/lib/domain/types"

describe("Form 5 field catalogue", () => {
  it("lists each code once", () => {
    const codes = FORM5_FIELDS.map((f) => f.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("holds the specification's wording and format", () => {
    expect(form5Field(300)).toMatchObject({
      fi: "Liikevaihto",
      format: "G13,2",
      required: true,
    })
    expect(form5Field(342).fi).toBe(
      "Vähennyskelpoinen osuus 50 % (EVL 8 § 8 kohta)"
    )
    expect(isMoneyField(form5Field(369))).toBe(false)
    expect(isMoneyField(form5Field(358))).toBe(true)
  })

  it("prints totals in sentence case without the explaining clause", () => {
    expect(form5Label(355)).toBe(
      "Elinkeinotoiminnan verotuksessa vähennyskelpoiset kulut yhteensä"
    )
    expect(form5Label(358)).toBe("Elinkeinotoiminnan tulos")
    expect(form5Label(392)).not.toMatch(/\.$/)
  })

  it("is the source of every label on the Form 5 view", () => {
    const sections = form5Sections(
      incomeStatement([], indexCategories(defaultCategories()), 2026)
    )
    for (const section of sections) {
      for (const row of section.rows) {
        if (row.kind === "field") {
          expect(row.label.fi).toBe(form5Label(Number(row.code)))
        }
      }
    }
  })

  it("rejects a code the form does not have", () => {
    expect(() => form5Field(1)).toThrow(/no field/)
  })
})
