/**
 * Canonical origin, used for metadataBase and the sitemap.
 *
 * The site is a static export on GitHub Pages. The repository is a project
 * repo (attepihamaki.github.io/kirjanpito), but the custom domain in
 * public/CNAME serves it from the root of its own host — so there is no path
 * prefix, no `basePath`, and every absolute path in the app stays correct.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kirjanpito.attepihamaki.fi"
).replace(/\/$/, "")

/**
 * The landing page — the one indexed document.
 *
 * There is no per-language URL. Only Finnish is indexed, so the landing is
 * prerendered in Finnish and switches to the stored preference on the client
 * like the app does. That keeps the UI language a pure state change rather
 * than a navigation, and leaves the site with a single root layout.
 */
export const LANDING = "/"

/**
 * The landing page's FAQ, which the app's sidebar links back to.
 *
 * The id is English like the routes (§11b) rather than Finnish like the
 * heading above it: it is an address, not a label.
 */
export const LANDING_FAQ_ID = "faq"
export const LANDING_FAQ = `${LANDING}#${LANDING_FAQ_ID}`

/**
 * The bookkeeping app. Everything under /app is noindex and renders nothing
 * until the store has rehydrated from localStorage.
 *
 * The URLs are English in both UI languages: the path segment is the key, so
 * the route and the code that links to it never drift apart. Only the visible
 * labels are translated.
 */
export const APP_ROUTES = {
  ledger: "/app/ledger",
  vat: "/app/vat",
  statement: "/app/statement",
  summary: "/app/summary",
  settings: "/app/settings",
} as const

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]
