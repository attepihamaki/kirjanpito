"use client"

import * as React from "react"

import { requestPersistentStorage } from "@/lib/browser/persist-storage"
import { useBookStore } from "@/stores/book-store"

/**
 * Ask for persistent storage at the first unsaved change (§12). A browser that
 * shows the user a prompt then shows it when there is work to protect, not on
 * opening the page. Mount once, in the app shell.
 */
export function usePersistentStorage() {
  const dirty = useBookStore((s) => s.dirty)

  React.useEffect(() => {
    if (dirty) void requestPersistentStorage()
  }, [dirty])
}
