import { describe, expect, it } from "vitest"

import {
  allHelpTopics,
  form5Help,
  lineHelp,
  vatReturnHelp,
  viewHelp,
} from "@/lib/domain/field-help"
import { vatReturnSections } from "@/lib/domain/vat-return"
import { defaultCategories } from "@/lib/domain/accounts"
import { indexCategories } from "@/lib/domain/types"
import { vatReport } from "@/lib/domain/vat"

describe("field help", () => {
  it("has a Finnish and an English text for every topic", () => {
    for (const topic of allHelpTopics()) {
      expect(topic.text.fi.length).toBeGreaterThan(20)
      expect(topic.text.en.length).toBeGreaterThan(20)
    }
  })

  it("links only to vero.fi over https", () => {
    for (const { source } of allHelpTopics()) {
      if (!source) continue
      const url = new URL(source.url)
      expect(url.protocol).toBe("https:")
      expect(url.hostname).toBe("www.vero.fi")
    }
  })

  it("uses no em or en dashes", () => {
    for (const { text, source } of allHelpTopics()) {
      expect(JSON.stringify([text, source?.title])).not.toMatch(/[–—]/)
    }
  })

  it("explains every VAT return field except the app's own 311/312 row", () => {
    const codes = vatReturnSections(
      vatReport([], indexCategories(defaultCategories()))
    )
      .flatMap((s) => s.rows)
      .flatMap((r) => (r.kind === "field" ? [r.code] : []))
    for (const code of codes) expect(vatReturnHelp(code), code).not.toBeNull()
  })

  it("looks up form 5 fields, statement lines and views", () => {
    expect(form5Help("341")?.source).toBeDefined()
    expect(form5Help("999")).toBeNull()
    expect(lineHelp(341)).toBe(form5Help("341"))
    expect(lineHelp(343)).toBeNull()
    expect(viewHelp("overview.bank")?.source).toBeUndefined()
    for (const id of [
      "ledger.net",
      "ledger.vat",
      "ledger.gross",
      "ledger.category",
      "entry.vatRate",
      "settings.traderType",
      "settings.vatPeriod",
      "settings.bookStart",
      "settings.defaultVat",
    ]) {
      expect(viewHelp(id), id).not.toBeNull()
    }
  })
})
