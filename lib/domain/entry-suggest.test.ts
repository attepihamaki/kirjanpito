import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  descriptionKey,
  descriptionSuggestions,
  suggestCategoryFor,
  type SuggestContext,
} from "@/lib/domain/entry-suggest"
import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
} from "@/lib/domain/invoice"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

let n = 0
function entry(over: Partial<Entry>): Entry {
  return {
    id: `e${n++}`,
    date: "2026-10-01",
    description: "Testi",
    type: "expense",
    catId: "333",
    amount: 12_450,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

function party(over: Partial<Customer>): Customer {
  return {
    ...emptyParty(),
    ...CUSTOMER_DEFAULTS,
    id: "p1",
    language: "fi",
    ...over,
  } as Customer
}

const ctx = (entries: Entry[], more: Partial<SuggestContext> = {}) => ({
  entries,
  cats,
  ...more,
})

describe("descriptionKey", () => {
  it("ignores case, spacing and numbers", () => {
    expect(descriptionKey("  Elisa   Puhelin ")).toBe("elisa puhelin")
    expect(descriptionKey("Vuokra, 01/2026")).toBe(
      descriptionKey("vuokra, 12/2025")
    )
  })
})

describe("descriptionSuggestions", () => {
  const book = [
    entry({ description: "Elisa puhelin", date: "2026-01-05", catId: "334" }),
    entry({
      description: "elisa  puhelin",
      date: "2026-02-05",
      catId: "334",
      amount: 3_990,
    }),
    entry({ description: "Kahvila Elise", date: "2026-03-01" }),
    entry({ description: "Puhelinteline", date: "2026-03-02" }),
    entry({
      description: "Elisa myynti",
      type: "income",
      catId: "300-domestic",
    }),
  ]

  it("groups by description and takes the newest entry's details", () => {
    const [first] = descriptionSuggestions("eli", "expense", ctx(book))
    expect(first).toMatchObject({
      description: "elisa  puhelin",
      catId: "334",
      gross: 3_990,
      uses: 2,
      lastDate: "2026-02-05",
    })
  })

  it("matches each typed word against the start of a word", () => {
    const found = descriptionSuggestions("puh", "expense", ctx(book))
    expect(found.map((s) => descriptionKey(s.description))).toEqual([
      "puhelinteline",
      "elisa puhelin",
    ])
    expect(descriptionSuggestions("lisa", "expense", ctx(book))).toEqual([])
  })

  it("offers a monthly description once, as the newest month wrote it", () => {
    const months = ["01", "02", "03"].map((m) =>
      entry({ description: `Vuokra, ${m}/2026`, date: `2026-${m}-01` })
    )
    const found = descriptionSuggestions("vuo", "expense", ctx(months))
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ description: "Vuokra, 03/2026", uses: 3 })
    expect(
      descriptionSuggestions("Vuokra, 04/2026", "expense", ctx(months))
    ).toEqual([])
  })

  it("keeps to the side asked for", () => {
    const found = descriptionSuggestions("elisa", "income", ctx(book))
    expect(found.map((s) => s.description)).toEqual(["Elisa myynti"])
  })

  it("puts the most used first among equal starts", () => {
    const found = descriptionSuggestions("el", "expense", ctx(book))
    expect(found[0].uses).toBe(2)
  })

  it("does not suggest the text back, nor anything for one letter", () => {
    expect(
      descriptionSuggestions("Elisa puhelin", "expense", ctx(book))
    ).toEqual([])
    expect(descriptionSuggestions("e", "expense", ctx(book))).toEqual([])
  })

  it("leaves out entries on a disabled category and VAT payments", () => {
    const off = indexCategories(
      defaultCategories().map((c) =>
        c.id === "334" ? { ...c, enabled: false } : c
      )
    )
    const found = descriptionSuggestions("elisa", "expense", {
      entries: [
        ...book,
        entry({
          description: "Elisa ALV",
          catId: "vat-payment",
          settles: "2026-01",
        }),
      ],
      cats: off,
    })
    expect(found).toEqual([])
  })

  it("names the newest entry's party only while it is in the register", () => {
    const withParty = [entry({ description: "Elisa puhelin", party: "p1" })]
    expect(
      descriptionSuggestions("eli", "expense", ctx(withParty))[0].party
    ).toBeUndefined()
    expect(
      descriptionSuggestions(
        "eli",
        "expense",
        ctx(withParty, { parties: [party({})] })
      )[0].party
    ).toBe("p1")
  })
})

describe("suggestCategoryFor", () => {
  it("prefers the user's rule", () => {
    const hit = suggestCategoryFor(
      "Elisa puhelin",
      "expense",
      ctx([entry({ description: "Elisa puhelin", catId: "334" })], {
        rules: [{ id: "r", contains: "elisa", catId: "333", vatRate: null }],
      })
    )
    expect(hit).toEqual({ catId: "333", vatRate: null, source: "rule" })
  })

  it("uses the same description booked before", () => {
    const hit = suggestCategoryFor(
      "ELISA puhelin",
      "expense",
      ctx([entry({ description: "Elisa puhelin", catId: "334", vatRate: 14 })])
    )
    expect(hit).toEqual({ catId: "334", vatRate: 14, source: "history" })
  })

  it("falls back on a register entry the text names", () => {
    const hit = suggestCategoryFor(
      "Lasku 12 Mäkinen Rakennus",
      "expense",
      ctx([], {
        parties: [
          party({
            name: "Mäkinen Rakennus Oy",
            role: "supplier",
            expenseCat: "334",
          }),
        ],
      })
    )
    expect(hit).toMatchObject({ catId: "334", party: "p1", source: "party" })
  })

  it("then on an earlier description that contains the text", () => {
    const hit = suggestCategoryFor(
      "K-Market",
      "expense",
      ctx([entry({ description: "K-Market Kamppi", catId: "334" })])
    )
    expect(hit).toMatchObject({ catId: "334", source: "history" })
  })

  it("has nothing for an empty or unknown text", () => {
    expect(suggestCategoryFor(" ", "expense", ctx([]))).toBeNull()
    expect(suggestCategoryFor("Uusi kauppa", "expense", ctx([]))).toBeNull()
  })
})
