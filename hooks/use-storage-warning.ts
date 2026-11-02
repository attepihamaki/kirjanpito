"use client"

import * as React from "react"

import { useT } from "@/components/lang-provider"
import { toast } from "@/components/ui/toast"
import {
  isStorageBehind,
  subscribeStorageBehind,
  useBookStore,
} from "@/stores/book-store"

/** Whether the last write to browser storage failed (§12). */
export function useStorageBehind(): boolean {
  return React.useSyncExternalStore(
    subscribeStorageBehind,
    isStorageBehind,
    () => false
  )
}

/**
 * Tells the user when the browser stops keeping their work (§12): private
 * browsing, blocked site data or a full quota. The toast stays until a write
 * succeeds again or the bookkeeping is closed, because until then a reload
 * or a closed tab loses everything since the last file save. The file menu
 * repeats it for a user who dismissed the toast. Mount once, in the app shell.
 */
export function useStorageWarning() {
  const t = useT()
  const behind = useStorageBehind()
  const open = useBookStore((s) => s.open)
  const show = behind && open

  React.useEffect(() => {
    if (!show) return
    const id = toast.add({
      type: "warning",
      priority: "high",
      title: t("file.storageTitle"),
      description: t("file.storageMessage"),
      timeout: 0,
    })
    return () => toast.close(id)
  }, [show, t])
}
