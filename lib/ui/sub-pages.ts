import type { MessageKey } from "@/lib/i18n/messages"
import {
  INVOICE_ROUTES,
  LEDGER_ROUTES,
  SETTINGS_ROUTES,
  STATEMENT_ROUTES,
} from "@/lib/site"

/** One sub-page of a view, as a link in its group's switch. */
export type SubPage = { href: string; label: MessageKey }

/**
 * A tab of a view (§8.2). A tab with more than one page shows a switch
 * between them under the tab row; its own link goes to the first.
 */
export type SubPageGroup = { label: MessageKey; pages: readonly SubPage[] }

/*
 * Every route of a view's `*_ROUTES` belongs to exactly one group, which
 * `sub-pages.test.ts` checks. Pages are grouped by what the user is doing:
 * the two books and the account list are one printable reading of the
 * entries, money owed is one question asked both ways, and so on.
 */

/** Kirjanpito (§8.4, §8.31). */
export const LEDGER_GROUPS: readonly SubPageGroup[] = [
  {
    label: "ledger.entriesTab",
    pages: [{ href: LEDGER_ROUTES.entries, label: "ledger.entriesTab" }],
  },
  {
    label: "ledger.booksTab",
    pages: [
      { href: LEDGER_ROUTES.journal, label: "ledger.journalTab" },
      { href: LEDGER_ROUTES.accounts, label: "ledger.accountsTab" },
      { href: LEDGER_ROUTES.chart, label: "ledger.chartTab" },
    ],
  },
  {
    label: "inbox.tab",
    pages: [{ href: LEDGER_ROUTES.inbox, label: "inbox.tab" }],
  },
]

/** Laskutus (§8.27, §8.29, §8.30, §8.34). */
export const INVOICE_GROUPS: readonly SubPageGroup[] = [
  {
    label: "invoice.tabInvoices",
    pages: [
      { href: INVOICE_ROUTES.list, label: "invoice.tabInvoices" },
      { href: INVOICE_ROUTES.recurring, label: "invoice.tabRecurring" },
    ],
  },
  {
    label: "quote.tab",
    pages: [{ href: INVOICE_ROUTES.quotes, label: "quote.tab" }],
  },
  {
    label: "invoice.tabOpen",
    pages: [
      { href: INVOICE_ROUTES.aging, label: "invoice.tabAging" },
      { href: INVOICE_ROUTES.payables, label: "invoice.tabPayables" },
    ],
  },
  {
    label: "invoice.tabRegisters",
    pages: [
      { href: INVOICE_ROUTES.parties, label: "party.tab" },
      { href: INVOICE_ROUTES.products, label: "invoice.tabProducts" },
    ],
  },
]

/** Tuloslaskelma (§8.8, §8.28). */
export const STATEMENT_GROUPS: readonly SubPageGroup[] = [
  {
    label: "statement.sheetTab",
    pages: [{ href: STATEMENT_ROUTES.sheet, label: "statement.sheetTab" }],
  },
  {
    label: "balance.tab",
    pages: [
      { href: STATEMENT_ROUTES.balance, label: "balance.summaryTab" },
      { href: STATEMENT_ROUTES.inventory, label: "inventory.tab" },
      { href: STATEMENT_ROUTES.assets, label: "assets.tab" },
    ],
  },
  {
    label: "deductions.tab",
    pages: [
      { href: STATEMENT_ROUTES.deductions, label: "deductions.tab" },
      { href: STATEMENT_ROUTES.losses, label: "losses.tab" },
    ],
  },
]

/** Asetukset (§8.10). */
export const SETTINGS_GROUPS: readonly SubPageGroup[] = [
  {
    label: "settings.general",
    pages: [
      { href: SETTINGS_ROUTES.general, label: "settings.general" },
      { href: SETTINGS_ROUTES.calendar, label: "settings.calendarTab" },
    ],
  },
  {
    label: "settings.categories",
    pages: [
      { href: SETTINGS_ROUTES.categories, label: "settings.categories" },
      { href: SETTINGS_ROUTES.rules, label: "settings.rulesTab" },
    ],
  },
  {
    label: "recurring.tab",
    pages: [{ href: SETTINGS_ROUTES.recurring, label: "recurring.tab" }],
  },
  {
    label: "invoice.settingsTab",
    pages: [{ href: SETTINGS_ROUTES.invoicing, label: "invoice.settingsTab" }],
  },
]

/** `path` with the trailing slash that `trailingSlash` adds taken off. */
function trimPath(path: string): string {
  return path.length > 1 ? path.replace(/\/$/, "") : path
}

/** The index of the group holding `path`, or -1 when none does. */
export function activeGroupIndex(
  groups: readonly SubPageGroup[],
  path: string
): number {
  const at = trimPath(path)
  return groups.findIndex((g) => g.pages.some((p) => p.href === at))
}
