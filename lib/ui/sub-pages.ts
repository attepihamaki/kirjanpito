import type { Feature } from "@/lib/domain/features"
import type { MessageKey } from "@/lib/i18n/messages"
import {
  APP_ROUTES,
  INVOICE_ROUTES,
  LEDGER_ROUTES,
  SETTINGS_ROUTES,
  STATEMENT_ROUTES,
  VAT_ROUTES,
} from "@/lib/site"

/**
 * One page of a section, as a link in the sidebar's list under it. `feature`
 * is the part of the app the page belongs to (§8.26): the link is left out
 * while that part is not in use.
 */
export type SubPage = { href: string; label: MessageKey; feature?: Feature }

export type NavSectionId =
  | "overview"
  | "ledger"
  | "sales"
  | "purchases"
  | "vat"
  | "statement"
  | "summary"
  | "calendar"
  | "settings"

/**
 * A row of the sidebar (§8.2). A section with `pages` lists them under its
 * row while one of them is open, and its own link goes to the first. A
 * section with none is a single page.
 */
export interface NavSection {
  id: NavSectionId
  label: MessageKey
  href: string
  pages: readonly SubPage[]
}

/*
 * The whole navigation: one level of sections, and under a section one flat
 * list of its pages. Every route of a view's `*_ROUTES` is in exactly one
 * section, which `sub-pages.test.ts` checks. Invoices are two sections, one
 * for each direction money is owed in, so the bills to pay are not filed
 * under the invoices the business sends.
 */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "overview",
    label: "nav.overview",
    href: APP_ROUTES.overview,
    pages: [],
  },
  {
    id: "ledger",
    label: "nav.ledger",
    href: APP_ROUTES.ledger,
    pages: [
      { href: LEDGER_ROUTES.entries, label: "ledger.entriesTab" },
      { href: LEDGER_ROUTES.inbox, label: "inbox.tab" },
      { href: LEDGER_ROUTES.journal, label: "ledger.journalTab" },
      { href: LEDGER_ROUTES.accounts, label: "ledger.accountsTab" },
      { href: LEDGER_ROUTES.chart, label: "ledger.chartTab" },
    ],
  },
  {
    id: "sales",
    label: "nav.sales",
    href: INVOICE_ROUTES.list,
    pages: [
      { href: INVOICE_ROUTES.list, label: "invoice.tabInvoices" },
      { href: INVOICE_ROUTES.recurring, label: "invoice.tabRecurring" },
      { href: INVOICE_ROUTES.quotes, label: "quote.tab" },
      { href: INVOICE_ROUTES.aging, label: "invoice.tabAging" },
      { href: INVOICE_ROUTES.parties, label: "party.tab" },
      { href: INVOICE_ROUTES.products, label: "invoice.tabProducts" },
    ],
  },
  {
    id: "purchases",
    label: "nav.purchases",
    href: INVOICE_ROUTES.payables,
    pages: [],
  },
  {
    id: "vat",
    label: "nav.vat",
    href: APP_ROUTES.vat,
    pages: [
      { href: VAT_ROUTES.sheet, label: "vat.sheetTab" },
      { href: VAT_ROUTES.ec, label: "vat.ecTab", feature: "euSales" },
    ],
  },
  {
    id: "statement",
    label: "nav.statement",
    href: APP_ROUTES.statement,
    pages: [
      { href: STATEMENT_ROUTES.sheet, label: "statement.sheetTab" },
      { href: STATEMENT_ROUTES.balance, label: "balance.tab" },
      { href: STATEMENT_ROUTES.inventory, label: "inventory.tab" },
      { href: STATEMENT_ROUTES.assets, label: "assets.tab" },
      { href: STATEMENT_ROUTES.deductions, label: "deductions.tab" },
      { href: STATEMENT_ROUTES.losses, label: "losses.tab" },
    ],
  },
  { id: "summary", label: "nav.summary", href: APP_ROUTES.summary, pages: [] },
  {
    id: "calendar",
    label: "nav.calendar",
    href: APP_ROUTES.calendar,
    pages: [],
  },
  {
    id: "settings",
    label: "nav.settings",
    href: APP_ROUTES.settings,
    pages: [
      { href: SETTINGS_ROUTES.general, label: "settings.general" },
      { href: SETTINGS_ROUTES.calendar, label: "settings.calendarTab" },
      { href: SETTINGS_ROUTES.categories, label: "settings.categories" },
      { href: SETTINGS_ROUTES.rules, label: "settings.rulesTab" },
      { href: SETTINGS_ROUTES.recurring, label: "recurring.tab" },
      { href: SETTINGS_ROUTES.invoicing, label: "invoice.settingsTab" },
    ],
  },
]

/** `path` with the trailing slash that `trailingSlash` adds taken off. */
function trimPath(path: string): string {
  return path.length > 1 ? path.replace(/\/$/, "") : path
}

/** The section with the given id. */
export function navSection(id: NavSectionId): NavSection {
  return NAV_SECTIONS.find((s) => s.id === id) as NavSection
}

/**
 * The section `path` belongs to, or undefined outside the app's views. A
 * page listed in a section decides it. A deeper path goes to the section
 * whose own link is its longest prefix, so `/app/invoices/payables` is the
 * purchases section although `/app/invoices` is the sales one.
 */
export function sectionOf(path: string): NavSection | undefined {
  const at = trimPath(path)
  const exact = NAV_SECTIONS.find(
    (s) => s.href === at || s.pages.some((p) => p.href === at)
  )
  if (exact) return exact
  return NAV_SECTIONS.filter((s) => at.startsWith(`${s.href}/`)).sort(
    (a, b) => b.href.length - a.href.length
  )[0]
}

/** The page of `section` that `path` is, or undefined when it is none of them. */
export function pageOf(section: NavSection, path: string): SubPage | undefined {
  const at = trimPath(path)
  return section.pages.find((p) => p.href === at)
}

/**
 * The pages of `section` to list: those whose part of the app is in use, and
 * the page that is open whatever its part, so a view never lacks its own
 * link.
 */
export function shownPages(
  section: NavSection,
  features: ReadonlySet<Feature>,
  path: string
): readonly SubPage[] {
  const at = trimPath(path)
  return section.pages.filter(
    (p) => !p.feature || features.has(p.feature) || p.href === at
  )
}
