"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"

/**
 * The "Tulosta" button of a printable view (§8.8). `onPrint` replaces the
 * plain `window.print()` for a view that has to change what it shows first.
 */
export function PrintButton({ onPrint }: { onPrint?: () => void }) {
  const t = useT()
  return (
    <Button variant="outline" onClick={onPrint ?? (() => window.print())}>
      <PrinterIcon data-icon="inline-start" />
      {t("common.print")}
    </Button>
  )
}
