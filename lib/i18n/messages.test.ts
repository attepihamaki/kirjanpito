import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { NBSP } from "@/lib/domain/money"
import { createFormatters } from "@/lib/i18n/create-formatters"
import { APP_DICT } from "@/lib/i18n/dict/app"
import { LANDING_DICT } from "@/lib/i18n/dict/landing"
import {
  ANOMALY_CODE_KEYS,
  MESSAGES,
  SKIP_CODE_KEYS,
  WARNING_CODE_KEYS,
  createAppT,
  t,
} from "@/lib/i18n/messages"
import { createT, pl } from "@/lib/i18n/t"

describe("dictionary integrity", () => {
  it("gives every key both a Finnish and an English value", () => {
    for (const [key, message] of Object.entries(MESSAGES)) {
      expect(message, key).toHaveLength(2)
      for (const value of message) {
        expect(["string", "function"], key).toContain(typeof value)
        if (typeof value === "string") expect(value, key).not.toBe("")
      }
    }
  })

  it("puts every key in exactly one of the two modules", () => {
    const shared = Object.keys(LANDING_DICT).filter((k) => k in APP_DICT)
    expect(shared).toEqual([])
    expect(Object.keys(MESSAGES)).toHaveLength(
      Object.keys(LANDING_DICT).length + Object.keys(APP_DICT).length
    )
  })

  /*
   * Every key is `namespace.name`, so a call site reads as what it is and the
   * dictionary can be scanned a section at a time.
   */
  it("names every key namespace.name, from a known namespace", () => {
    const NAMESPACES = [
      "app",
      "common",
      "confirm",
      "entry",
      "file",
      "io",
      "landing",
      "ledger",
      "nav",
      "notFound",
      "receipt",
      "settings",
      "statement",
      "summary",
      "table",
      "vat",
      "viewer",
    ]
    for (const key of Object.keys(MESSAGES)) {
      expect(key, key).toMatch(/^[a-z][A-Za-z]*\.[a-z][A-Za-z0-9]*$/)
      expect(NAMESPACES, key).toContain(key.split(".")[0])
    }
  })

  it("uses the same {param} placeholders in both languages", () => {
    const names = (v: string) =>
      [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [key, [fi, en]] of Object.entries(MESSAGES)) {
      // Plural functions are checked through their rendered output below.
      if (typeof fi !== "string" || typeof en !== "string") continue
      expect(names(en), key).toEqual(names(fi))
    }
  })
})

describe("translate", () => {
  it("returns the value for the chosen language", () => {
    expect(t("app.name", "fi")).toBe("Kirjanpito")
    expect(t("app.name", "en")).toBe("Bookkeeping")
  })

  it("interpolates params", () => {
    expect(t("confirm.deleteMessage", "fi", { x: "Lasku 1005" })).toBe(
      "Kirjaus ”Lasku 1005” poistetaan."
    )
    expect(t("table.pageOf", "en", { p: 1, n: 2 })).toBe("Page 1 of 2")
  })

  it("leaves an unknown placeholder untouched", () => {
    expect(t("table.pageOf", "en", { p: 1 })).toBe("Page 1 of {n}")
  })

  it("returns the key itself when it is missing", () => {
    const dict = { known: ["a", "b"] } as const
    expect(createT(dict, "fi")("known")).toBe("a")
    // @ts-expect-error — deliberately probing an unknown key
    expect(createT(dict, "fi")("nope")).toBe("nope")
  })

  it("picks singular at n = 1 and plural otherwise, in both languages", () => {
    expect(t("ledger.entryCount", "fi", { n: 1 })).toBe("1 kirjaus")
    expect(t("ledger.entryCount", "fi", { n: 16 })).toBe("16 kirjausta")
    expect(t("ledger.entryCount", "en", { n: 1 })).toBe("1 entry")
    expect(t("ledger.entryCount", "en", { n: 16 })).toBe("16 entries")
    expect(t("receipt.count", "fi", { n: 2 })).toBe("2 tositetta")
    expect(t("settings.categoryCount", "en", { n: 32 })).toBe("32 categories")
  })

  it("builds plural messages from pl()", () => {
    const fn = pl("yksi", "{n} monta")
    expect(fn({ n: 1 })).toBe("yksi")
    expect(fn({ n: 2 })).toBe("{n} monta")
  })

  it("binds a language with createAppT", () => {
    expect(createAppT("en")("nav.ledger")).toBe("Bookkeeping")
  })
})

/*
 * This is what keeps lib/domain free of user-facing text without letting a
 * code reach the UI untranslated.
 */
describe("every domain code has a message", () => {
  it.each([
    ...Object.entries(SKIP_CODE_KEYS),
    ...Object.entries(WARNING_CODE_KEYS),
    ...Object.entries(ANOMALY_CODE_KEYS),
  ])("maps %s to a real key", (_code, key) => {
    expect(MESSAGES[key]).toBeDefined()
  })

  it("covers all three skip codes", () => {
    expect(Object.keys(SKIP_CODE_KEYS).sort()).toEqual([
      "bad-amount",
      "bad-date",
      "bad-type",
    ])
  })
})

describe("createFormatters", () => {
  const fi = createFormatters("fi")
  const en = createFormatters("en")
  const cats = defaultCategories()
  const byId = (id: string) => cats.find((c) => c.id === id)!

  it("memoises per language", () => {
    expect(createFormatters("fi")).toBe(fi)
    expect(fi).not.toBe(en)
  })

  it("keeps currency Finnish in both languages", () => {
    expect(fi.money(123456)).toBe(`1${NBSP}234,56${NBSP}€`)
    expect(en.money(123456)).toBe(`1${NBSP}234,56${NBSP}€`)
  })

  it("switches dates, rates and file sizes by language", () => {
    expect(fi.date("2026-01-08")).toBe("8.1.2026")
    expect(en.date("2026-01-08")).toBe("8 Jan 2026")
    expect(fi.rate(25.5)).toBe(`25,5${NBSP}%`)
    expect(en.rate(25.5)).toBe("25.5%")
    expect(fi.size(139000)).toBe(`136${NBSP}kt`)
    expect(en.size(139000)).toBe(`136${NBSP}KB`)
  })

  it("translates category and line names", () => {
    expect(fi.catName(byId("333"))).toBe("Ostot ja varastojen muutokset")
    expect(en.catName(byId("333"))).toBe("Purchases and change in inventory")
    expect(en.catLabel(byId("333"))).toBe(
      "333 Purchases and change in inventory"
    )
  })

  it("names months long and short", () => {
    expect(fi.month(0)).toBe("Tammikuu")
    expect(fi.month(0, true)).toBe("Tammi")
    expect(en.month(9, true)).toBe("Oct")
    expect(fi.month(99)).toBe("")
  })

  it("sorts numerically and case-insensitively", () => {
    const names = ["beta", "Alfa", "item10", "item2"]
    expect([...names].sort(fi.collator.compare)).toEqual([
      "Alfa",
      "beta",
      "item2",
      "item10",
    ])
  })

  /*
   * The whole reason for a locale-aware collator: in the Finnish alphabet Ä
   * follows Z, while English treats it as a variant of A.
   */
  it("places Ä after Z in Finnish but with A in English", () => {
    const names = ["Ärjy", "Alfa", "Zulu"]
    expect([...names].sort(fi.collator.compare)).toEqual([
      "Alfa",
      "Zulu",
      "Ärjy",
    ])
    expect([...names].sort(en.collator.compare)).toEqual([
      "Alfa",
      "Ärjy",
      "Zulu",
    ])
  })

  it("exposes a bound t()", () => {
    expect(fi.t("nav.ledger")).toBe("Kirjanpito")
    expect(en.t("ledger.entryCount", { n: 3 })).toBe("3 entries")
  })
})
