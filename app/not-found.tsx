import type { Metadata } from "next"

import { NotFoundPage } from "@/components/not-found-page"

/**
 * The 404 document, emitted by the static export as `out/404.html`.
 *
 * One document serves every unmatched URL, so its language cannot come from
 * the route. It follows the stored preference like the app: Finnish in the
 * prerendered HTML — the store's default, so the first client render still
 * matches — and the preference once the store has rehydrated.
 */
// Next already emits `noindex` for this route, so only the title is set here.
export const metadata: Metadata = {
  title: "Sivua ei löytynyt – Kirjanpito",
}

export default function NotFound() {
  return <NotFoundPage />
}
