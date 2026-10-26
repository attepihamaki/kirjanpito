"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { APP_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * `/app` itself is not a view — it is the bookmarkable, guessable parent of
 * the five that are. Without a page here the static export has no
 * `out/app/index.html` and the URL lands on the 404.
 *
 * `output: "export"` rules out a server-side redirect, so it happens on the
 * client, which costs nothing: the app is client-only anyway and AppShell
 * already holds back every route until the store has rehydrated.
 *
 * Only the open case is handled. A closed bookkeeping is already sent to the
 * landing page by AppShell (§8.1), and racing it from here would mean two
 * navigations for one decision.
 */
export function AppIndexRedirect() {
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)
  const router = useRouter()

  React.useEffect(() => {
    /*
     * replace, not push: /app is a waypoint, and Back should leave the app
     * rather than bounce through it.
     */
    if (hydrated && open) router.replace(APP_ROUTES.ledger)
  }, [hydrated, open, router])

  return null
}
