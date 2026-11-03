import { describe, expect, it } from "vitest"

import { defaultCategories, EU_PURCHASES } from "@/lib/domain/accounts"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import {
  moveEuPurchasesToCategories,
  syncEuPurchase,
} from "@/lib/domain/eu-purchase-category"
import { incomeStatement } from "@/lib/domain/income-statement"
import { parseSettings } from "@/lib/domain/settings-file"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"
import { compareCategories } from "@/stores/selectors"

const cats = defaultCategories()

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "a",
    voucher: 1,
    date: "2026-03-10",
    description: "Pilvipalvelu",
    type: "expense",
    catId: "344-eu-services",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "net",
    euPurchase: "services",
    ...over,
  }
}

const noId = () => "new"

describe("the EU purchase categories", () => {
  it("each sit on a line and say what they buy", () => {
    const byId = indexCategories(cats)
    for (const def of EU_PURCHASES) {
      expect(byId.get(def.id)).toMatchObject({
        line: def.line,
        euPurchase: def.euPurchase,
        vatRate: 25.5,
        enabled: true,
        custom: false,
      })
    }
  })

  it("leave each line's own category first", () => {
    const on333 = cats.filter((c) => c.line === "333").map((c) => c.id)
    expect(on333).toEqual(["333", "333-eu-goods"])
  })

  it("put the cost on their own Form 5 line", () => {
    const { lines } = incomeStatement([entry()], indexCategories(cats), 2026)
    expect(lines.find((l) => l.line.key === "344-other")?.net).toBe(10_000)
  })

  it("drop the status from a line that cannot be a purchase", () => {
    const text = JSON.stringify({
      categories: [
        {
          id: "c-1",
          line: "300",
          name: "Myynti",
          vatRate: 0,
          enabled: true,
          custom: true,
          euPurchase: "goods",
        },
      ],
    })
    const back = parseSettings(text).categories?.find((c) => c.id === "c-1")
    expect(back?.euPurchase).toBeUndefined()
  })
})

describe("the order categories are listed in", () => {
  it("puts a line's own category before its EU one", () => {
    const names = (a: Category, b: Category) =>
      a.name.localeCompare(b.name, "fi")
    const on333 = cats
      .filter((c) => c.line === "333")
      .reverse()
      .sort((a, b) => compareCategories(a, b, names))
      .map((c) => c.name)
    expect(on333).toEqual([
      "Ostot ja varastojen muutokset",
      "Ostot ja varastojen muutokset – EU",
    ])
  })
})

describe("syncEuPurchase", () => {
  it("marks an entry on an EU category, net", () => {
    const [synced] = syncEuPurchase(
      [entry({ euPurchase: undefined, amountMode: "gross" })],
      cats
    )
    expect(synced.euPurchase).toBe("services")
    expect(synced.amountMode).toBe("net")
  })

  it("clears the mark on any other category", () => {
    const [synced] = syncEuPurchase([entry({ catId: "344-other" })], cats)
    expect(synced.euPurchase).toBeUndefined()
  })

  it("returns an entry that needs nothing as the same object", () => {
    const e = entry()
    expect(syncEuPurchase([e], cats)[0]).toBe(e)
  })
})

describe("moveEuPurchasesToCategories", () => {
  const move = (entries: Entry[], list: readonly Category[] = cats) =>
    moveEuPurchasesToCategories({ entries, recurring: [], cats: list }, noId)

  it("moves a marked entry to the EU category on its line", () => {
    const { entries, cats: after } = move([entry({ catId: "344-other" })])
    expect(entries[0].catId).toBe("344-eu-services")
    expect(after).toHaveLength(cats.length)
  })

  it("makes a category for a line that has none, keeping the line", () => {
    const { entries, cats: after } = move([entry({ catId: "343" })])
    const created = after.find((c) => c.id === entries[0].catId)
    expect(created).toMatchObject({
      line: "343",
      name: "Vuokrat – EU, palvelut",
      euPurchase: "services",
      custom: true,
    })
  })

  it("makes one category for several entries", () => {
    const { entries, cats: after } = move([
      entry({ id: "a", catId: "343" }),
      entry({ id: "b", catId: "343" }),
    ])
    expect(entries[0].catId).toBe(entries[1].catId)
    expect(after).toHaveLength(cats.length + 1)
  })

  it("gives a custom category a sibling of its own name", () => {
    const own: Category = {
      id: "c-own",
      line: "344-other",
      name: "Ohjelmistot",
      vatRate: 25.5,
      enabled: true,
      custom: true,
    }
    const { entries, cats: after } = move(
      [entry({ catId: "c-own" })],
      [...cats, own]
    )
    expect(after.find((c) => c.id === entries[0].catId)?.name).toBe(
      "Ohjelmistot – EU, palvelut"
    )
  })

  it("leaves every figure as it was", () => {
    const before = [
      entry({ catId: "344-other" }),
      entry({ id: "b", catId: "343" }),
    ]
    const { entries, cats: after } = move(before)
    const report = (e: Entry[], c: readonly Category[]) =>
      vatReport(e, indexCategories(c))
    const statement = (e: Entry[], c: readonly Category[]) =>
      incomeStatement(e, indexCategories(c), 2026).result

    expect(report(entries, after).due).toBe(report(before, cats).due)
    expect(report(entries, after).euPurchases).toEqual(
      report(before, cats).euPurchases
    )
    expect(statement(entries, after)).toBe(statement(before, cats))
  })

  it("moves a recurring template too", () => {
    const { recurring } = moveEuPurchasesToCategories(
      {
        entries: [],
        recurring: [
          {
            id: "r",
            description: "Pilvi",
            type: "expense",
            catId: "344-other",
            amount: 10_000,
            vatRate: 25.5,
            amountMode: "net",
            euPurchase: "services",
            day: 1,
            from: "2026-01",
          },
        ],
        cats,
      },
      noId
    )
    expect(recurring[0].catId).toBe("344-eu-services")
  })
})

describe("the CSV", () => {
  it("round-trips an entry on an EU category", () => {
    const text = serializeCsv([entry()], indexCategories(cats))
    const result = parseCsv(text, cats, noId)
    if (!result.ok) throw new Error(result.code)
    expect(result.entries[0]).toMatchObject({
      catId: "344-eu-services",
      euPurchase: "services",
    })
    expect(result.newCategoryCount).toBe(0)
  })

  it.each([
    ["fi", "Ostot ja varastojen muutokset – EU", "Ostot – EU, tavarat"],
    ["en", "Purchases and changes in inventory – EU", "Purchases – EU, goods"],
  ] as const)(
    "finds the EU goods category by its former name in a %s file",
    (lang, name, former) => {
      const goods = entry({ catId: "333-eu-goods", euPurchase: "goods" })
      const text = serializeCsv([goods], indexCategories(cats), { lang })
      expect(text).toContain(name)
      const result = parseCsv(text.replace(name, former), cats, noId)
      if (!result.ok) throw new Error(result.code)
      expect(result.entries[0]?.catId).toBe("333-eu-goods")
      expect(result.newCategoryCount).toBe(0)
    }
  )

  it("round-trips an EU category in an English file", () => {
    const text = serializeCsv([entry()], indexCategories(cats), { lang: "en" })
    expect(text).toContain("Other deductible expenses – EU, services")
    const result = parseCsv(text, cats, noId)
    if (!result.ok) throw new Error(result.code)
    expect(result.entries[0]).toMatchObject({
      catId: "344-eu-services",
      euPurchase: "services",
    })
    expect(result.newCategoryCount).toBe(0)
  })

  it("takes the status from a category the row brings in", () => {
    const text = serializeCsv(
      [entry({ catId: "c-1" })],
      indexCategories([
        ...cats,
        {
          id: "c-1",
          line: "344-other",
          name: "Ohjelmistot – EU",
          vatRate: 25.5,
          euPurchase: "services",
          enabled: true,
          custom: true,
        },
      ])
    )
    const result = parseCsv(text, cats, noId)
    if (!result.ok) throw new Error(result.code)
    const created = result.categories.find((c) => c.name === "Ohjelmistot – EU")
    expect(created?.euPurchase).toBe("services")
  })

  it("keeps the mark of an older file's row for the move on opening", () => {
    const text = serializeCsv(
      [entry({ catId: "344-other" })],
      indexCategories(cats)
    )
    const result = parseCsv(text, cats, noId)
    if (!result.ok) throw new Error(result.code)
    expect(result.entries[0]).toMatchObject({
      catId: "344-other",
      euPurchase: "services",
    })
  })
})
