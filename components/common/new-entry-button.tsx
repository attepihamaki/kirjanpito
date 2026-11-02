"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { useBookStore } from "@/stores/book-store"

/** "Uusi kirjaus", which the `N` key also does (§8.2). */
export function NewEntryButton({ className }: { className?: string }) {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)
  const label = f.t("ledger.newEntry")

  return (
    <Button
      className={className}
      title={`${label} (N)`}
      aria-keyshortcuts="N"
      onClick={() => openDialog({ kind: "entry", mode: "new" })}
    >
      <PlusIcon data-icon="inline-start" />
      {label}
    </Button>
  )
}
