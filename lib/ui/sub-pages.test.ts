import { describe, expect, it } from "vitest"

import { MESSAGES } from "@/lib/i18n/messages"
import {
  APP_ROUTES,
  INVOICE_ROUTES,
  LEDGER_ROUTES,
  SETTINGS_ROUTES,
  STATEMENT_ROUTES,
  VAT_ROUTES,
} from "@/lib/site"
import {
  NAV_SECTIONS,
  navSection,
  pageOf,
  sectionOf,
  shownPages,
} from "@/lib/ui/sub-pages"

const hrefsOf = (...ids: Parameters<typeof navSection>[0][]) =>
  ids
    .flatMap((id) => {
      const s = navSection(id)
      return s.pages.length ? s.pages.map((p) => p.href) : [s.href]
    })
    .sort()

describe("the navigation tree", () => {
  it("puts every route of a view in exactly one section", () => {
    expect(hrefsOf("ledger")).toEqual(Object.values(LEDGER_ROUTES).sort())
    expect(hrefsOf("sales", "purchases")).toEqual(
      Object.values(INVOICE_ROUTES).sort()
    )
    expect(hrefsOf("vat")).toEqual(Object.values(VAT_ROUTES).sort())
    expect(hrefsOf("statement")).toEqual(Object.values(STATEMENT_ROUTES).sort())
    expect(hrefsOf("settings")).toEqual(Object.values(SETTINGS_ROUTES).sort())
  })

  it("has a section for every top-level route", () => {
    for (const route of Object.values(APP_ROUTES)) {
      expect(sectionOf(route)).toBeDefined()
    }
  })

  it("links a section with pages to the first of them", () => {
    for (const s of NAV_SECTIONS) {
      if (s.pages.length) expect(s.href).toBe(s.pages[0].href)
    }
  })

  it("labels every section and page with a known key", () => {
    for (const s of NAV_SECTIONS) {
      expect(MESSAGES).toHaveProperty(s.label)
      for (const p of s.pages) expect(MESSAGES).toHaveProperty(p.label)
    }
  })
})

describe("sectionOf", () => {
  it("finds the section of each page, with or without a trailing slash", () => {
    for (const s of NAV_SECTIONS) {
      for (const p of s.pages) {
        expect(sectionOf(p.href)?.id).toBe(s.id)
        expect(sectionOf(`${p.href}/`)?.id).toBe(s.id)
      }
    }
  })

  it("keeps the bills to pay apart from the invoices sent", () => {
    expect(sectionOf(INVOICE_ROUTES.payables)?.id).toBe("purchases")
    expect(sectionOf(INVOICE_ROUTES.aging)?.id).toBe("sales")
    expect(sectionOf(`${INVOICE_ROUTES.payables}/x`)?.id).toBe("purchases")
  })

  it("finds none for a path outside the views", () => {
    expect(sectionOf("/privacy")).toBeUndefined()
  })
})

describe("pageOf and shownPages", () => {
  const vat = navSection("vat")

  it("names the page that is open", () => {
    expect(pageOf(navSection("ledger"), "/app/ledger/journal/")?.label).toBe(
      "ledger.journalTab"
    )
    expect(
      pageOf(navSection("ledger"), "/app/ledger/journal/x")
    ).toBeUndefined()
  })

  it("leaves out a page whose part of the app is not in use", () => {
    expect(shownPages(vat, new Set(), VAT_ROUTES.sheet)).toHaveLength(1)
    expect(
      shownPages(vat, new Set(["euSales"]), VAT_ROUTES.sheet)
    ).toHaveLength(2)
  })

  it("keeps the open page whatever its part", () => {
    expect(shownPages(vat, new Set(), VAT_ROUTES.ec)).toHaveLength(2)
  })
})
