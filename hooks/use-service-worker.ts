"use client"

import * as React from "react"

import { registerServiceWorker } from "@/lib/browser/service-worker"

/**
 * Register the service worker (§11b). Mount once, in the app shell, where a
 * bookkeeping is open: a visitor who only reads the landing page gets no
 * worker and no cache, as they get no stored bookkeeping (§12).
 *
 * Production only. The export is the only place `sw.js` exists, and a worker
 * caching the dev server's files would serve stale code.
 */
export function useServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") void registerServiceWorker()
  }, [])
}
