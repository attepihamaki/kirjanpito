import type { Metadata } from "next"

import "@/app/globals.css"
import { HtmlShell } from "@/components/html-shell"
import { NotFoundPage } from "@/components/not-found-page"
import { StoreHydrator } from "@/components/store-hydrator"

/**
 * The 404 document, emitted by the static export as `out/404.html`.
 *
 * `global-not-found` rather than `not-found`: an unmatched URL belongs to
 * neither the `(fi)` nor the `(en)` route group, so no root layout wraps it
 * and it has to render its own `<html>` and `<body>`. See next.config.ts.
 */
// Next already emits `noindex` for this route, so only the title is set here.
export const metadata: Metadata = {
  title: "Sivua ei löytynyt – Kirjanpito",
}

export default function NotFound() {
  return (
    <HtmlShell lang="fi">
      <StoreHydrator />
      <NotFoundPage />
    </HtmlShell>
  )
}
