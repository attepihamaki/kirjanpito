/**
 * The path prefix the site is served under, or "" when it is served from the
 * root of a host.
 *
 * The site is a static export on GitHub Pages, from the project repo
 * attepihamaki/kirjanpito, so Pages serves it under the repository's own path
 * — attepihamaki.github.io/kirjanpito — and every absolute path in the app
 * has to carry that prefix.
 *
 * `next.config.ts` imports this as `basePath`, which is enough on its own:
 * Next prefixes every route, every `next/link` and every `_next/` asset with
 * it, so nothing in the app spells the prefix out. The single exception is
 * `lib/browser/pdf.ts`, which hands pdf.js a worker URL that never passes
 * through Next — it imports this constant instead.
 *
 * To serve from a host root again (a custom domain, or a user/organisation
 * Pages repo), set this to "" and SITE_URL to that origin; `public/CNAME`
 * would come back with it, since a deploy without that file clears the
 * repository's custom-domain setting.
 */
export const BASE_PATH = "/kirjanpito"

/**
 * Canonical URL of the site, used for metadataBase, robots and the sitemap.
 * It includes BASE_PATH: the site's root document is
 * https://attepihamaki.github.io/kirjanpito/, not the host root, and Next
 * joins this pathname onto the relative URLs in the metadata.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  `https://attepihamaki.github.io${BASE_PATH}`
).replace(/\/$/, "")

/**
 * Whether search engines may index the site.
 *
 * **Off while the site is served from attepihamaki.github.io/kirjanpito.**
 * That address is a working URL, not the published one, and a search result
 * pointing at it would outlive the move to the real domain — as a duplicate
 * of it, competing with the page it is a copy of. Turn this on in the same
 * change that sets BASE_PATH back to "" and SITE_URL to the custom domain.
 *
 * It drives exactly three things: the robots meta tag on every document
 * (`app/layout.tsx`), `robots.txt` (`app/robots.ts`) and the sitemap
 * (`app/sitemap.ts`). `test/seo.test.tsx` checks that all three agree with it.
 *
 * Nothing else changes with it. The Open Graph card is still generated and
 * still declared, so a link pasted into Slack, WhatsApp or iMessage previews
 * normally — noindex keeps a page out of search results, not out of a chat.
 */
export const INDEXABLE = false

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
