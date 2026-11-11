import { describe, expect, it } from "vitest"

import { MESSAGES } from "@/lib/i18n/messages"
import {
  INVOICE_ROUTES,
  LEDGER_ROUTES,
  SETTINGS_ROUTES,
  STATEMENT_ROUTES,
} from "@/lib/site"
import {
  activeGroupIndex,
  INVOICE_GROUPS,
  LEDGER_GROUPS,
  SETTINGS_GROUPS,
  STATEMENT_GROUPS,
  type SubPageGroup,
} from "@/lib/ui/sub-pages"

const VIEWS: Array<[string, Record<string, string>, readonly SubPageGroup[]]> =
  [
    ["ledger", LEDGER_ROUTES, LEDGER_GROUPS],
    ["invoices", INVOICE_ROUTES, INVOICE_GROUPS],
    ["statement", STATEMENT_ROUTES, STATEMENT_GROUPS],
    ["settings", SETTINGS_ROUTES, SETTINGS_GROUPS],
  ]

describe.each(VIEWS)("%s tabs", (_, routes, groups) => {
  it("put every route in exactly one group", () => {
    const hrefs = groups.flatMap((g) => g.pages.map((p) => p.href))
    expect([...hrefs].sort()).toEqual(Object.values(routes).sort())
  })

  it("have at most four tabs", () => {
    expect(groups.length).toBeLessThanOrEqual(4)
  })

  it("label every tab and page with a known key", () => {
    for (const g of groups) {
      expect(MESSAGES).toHaveProperty(g.label)
      for (const p of g.pages) expect(MESSAGES).toHaveProperty(p.label)
    }
  })

  it("light the group of each of its pages, with or without a trailing slash", () => {
    groups.forEach((g, i) => {
      for (const p of g.pages) {
        expect(activeGroupIndex(groups, p.href)).toBe(i)
        expect(activeGroupIndex(groups, `${p.href}/`)).toBe(i)
      }
    })
  })
})

describe("activeGroupIndex", () => {
  it("finds no group for a path outside the view", () => {
    expect(activeGroupIndex(LEDGER_GROUPS, "/app/vat")).toBe(-1)
  })

  it("does not light a group for a deeper path under one of its pages", () => {
    expect(activeGroupIndex(LEDGER_GROUPS, "/app/ledger/journal/x")).toBe(-1)
  })
})
