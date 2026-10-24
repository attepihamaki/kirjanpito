/** Canonical origin, used for metadataBase, hreflang and the sitemap. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kirjanpito.vercel.app"
).replace(/\/$/, "")

/** The two indexed landing pages. */
export const LANDING_ROUTES = {
  fi: "/",
  en: "/en",
} as const

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

export const APP_ROUTE_LIST = Object.values(APP_ROUTES)

/** Where "no bookkeeping open" sends the user back to. */
export function landingFor(lang: "fi" | "en"): string {
  return lang === "en" ? LANDING_ROUTES.en : LANDING_ROUTES.fi
}
