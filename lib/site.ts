/**
 * The path prefix the site is served under, or "" when it is served from the
 * root of a host. GitHub Pages serves this project repo under its own name.
 *
 * `next.config.ts` imports it as `basePath`, which covers every route, every
 * `next/link` and every `_next/` asset. The one place that spells the prefix
 * out is `lib/browser/pdf.ts`: its worker URL never passes through Next.
 *
 * To serve from a host root, set this to "" and SITE_URL to that origin, and
 * add `public/CNAME` containing the domain.
 */
export const BASE_PATH = "/kirjanpito"

/**
 * Canonical URL of the site, used for metadataBase, robots and the sitemap.
 * It includes BASE_PATH, because the site's root document is
 * https://attepihamaki.github.io/kirjanpito/ rather than the host root, and
 * Next joins this pathname onto the relative URLs in the metadata.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  `https://attepihamaki.github.io${BASE_PATH}`
).replace(/\/$/, "")

/**
 * Whether search engines may index the site. Off while it is served from the
 * github.io working URL; turn it on in the same change that sets BASE_PATH
 * back to "" and SITE_URL to the custom domain.
 *
 * It drives exactly three things: the robots meta tag on every document
 * (`app/layout.tsx`), `robots.txt` (`app/robots.ts`) and the sitemap
 * (`app/sitemap.ts`). `test/seo.test.tsx` checks that all three agree with it.
 *
 * The Open Graph card is not gated by it: noindex keeps a page out of search
 * results, not out of a chat app's link preview.
 */
export const INDEXABLE = false

/**
 * The account-feed proxy's origin, with a leading space, or "" when the build
 * names none. Only a build that sets it can reach any host besides the site.
 */
const BANK_PROXY_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_BANK_PROXY_URL
    return url ? ` ${new URL(url).origin}` : ""
  } catch {
    return ""
  }
})()

/**
 * What a page may load and where it may send data. The bookkeeping stays in the
 * browser (§1), so `connect-src` and `form-action` hold the app to that even if
 * a script gets in.
 *
 * It goes out as a meta tag, because GitHub Pages cannot set headers. That rules
 * out `frame-ancestors`, which browsers ignore in a meta tag. `'unsafe-inline'`
 * stays on scripts because a static export has no per-request nonce for Next's
 * inline bootstrap, and on styles because components set inline styles.
 * Thumbnails are `data:` and `blob:` images, and pdf.js loads fonts as `data:`.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${BANK_PROXY_ORIGIN}`,
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ")

/**
 * The landing page — the one indexed document.
 *
 * There is no per-language URL. Only Finnish is indexed, so the landing is
 * prerendered in Finnish and switches to the stored preference on the client
 * like the app does, which keeps the UI language a pure state change rather
 * than a navigation.
 */
export const LANDING = "/"

/**
 * The privacy statement (§8.3). Public like the landing page, and in the
 * sitemap, so a link to it from outside the app resolves.
 */
export const PRIVACY = "/privacy"

/**
 * The landing page's FAQ section. The id is English like the routes, because
 * it is an address rather than a label.
 */
export const LANDING_FAQ_ID = "faq"

/**
 * The bookkeeping app. Everything under /app is noindex and renders nothing
 * until the store has rehydrated from localStorage.
 *
 * The URLs are English in both UI languages, and each path segment is the key
 * it has here, so a route and the code linking to it cannot drift apart. Only
 * the visible labels are translated.
 */
export const APP_ROUTES = {
  overview: "/app/overview",
  ledger: "/app/ledger",
  invoices: "/app/invoices",
  vat: "/app/vat",
  statement: "/app/statement",
  summary: "/app/summary",
  calendar: "/app/calendar",
  settings: "/app/settings",
} as const

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]

/**
 * The bookkeeping view's sub-pages (§8.4): the entries, and the journal and
 * general ledger that KPL 2:4 asks for, as printable sheets.
 */
export const LEDGER_ROUTES = {
  entries: APP_ROUTES.ledger,
  journal: `${APP_ROUTES.ledger}/journal`,
  accounts: `${APP_ROUTES.ledger}/accounts`,
  chart: `${APP_ROUTES.ledger}/chart`,
} as const

/**
 * The settings sub-pages (§8.10). The general page is the settings route
 * itself, so a link to Asetukset lands on it.
 */
export const SETTINGS_ROUTES = {
  general: APP_ROUTES.settings,
  categories: `${APP_ROUTES.settings}/categories`,
  recurring: `${APP_ROUTES.settings}/recurring`,
  calendar: `${APP_ROUTES.settings}/calendar`,
  rules: `${APP_ROUTES.settings}/rules`,
  invoicing: `${APP_ROUTES.settings}/invoicing`,
} as const

/** The invoice view's sub-pages (§8.27, §8.30): invoices, money owed both ways, and the registers. */
export const INVOICE_ROUTES = {
  list: APP_ROUTES.invoices,
  recurring: `${APP_ROUTES.invoices}/recurring`,
  aging: `${APP_ROUTES.invoices}/aging`,
  payables: `${APP_ROUTES.invoices}/payables`,
  parties: `${APP_ROUTES.invoices}/parties`,
  products: `${APP_ROUTES.invoices}/products`,
} as const

/**
 * The income statement's sub-pages (§8.8): the sheet itself, the same figures
 * as Form 5's fields for copying into OmaVero, the stocktake, the fixed asset
 * register and the calculated deductions.
 */
export const STATEMENT_ROUTES = {
  sheet: APP_ROUTES.statement,
  balance: `${APP_ROUTES.statement}/balance`,
  inventory: `${APP_ROUTES.statement}/inventory`,
  assets: `${APP_ROUTES.statement}/assets`,
  deductions: `${APP_ROUTES.statement}/deductions`,
} as const

/**
 * The VAT view's sub-pages (§8.7): the calculation, and the EC Sales List.
 */
export const VAT_ROUTES = {
  sheet: APP_ROUTES.vat,
  ec: `${APP_ROUTES.vat}/ec`,
} as const
