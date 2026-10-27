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
 * The landing page — the one indexed document.
 *
 * There is no per-language URL. Only Finnish is indexed, so the landing is
 * prerendered in Finnish and switches to the stored preference on the client
 * like the app does, which keeps the UI language a pure state change rather
 * than a navigation.
 */
export const LANDING = "/"

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
  vat: "/app/vat",
  statement: "/app/statement",
  summary: "/app/summary",
  settings: "/app/settings",
} as const

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]
