"use client"

import { useFormatters } from "@/components/lang-provider"
import { useBookStore } from "@/stores/book-store"

/** The business's name and ID under a printable sheet's title, when set (§8.10). */
export function BusinessLine() {
  const f = useFormatters()
  const businessName = useBookStore((s) => s.businessName)
  const businessId = useBookStore((s) => s.businessId)
  if (!businessName && !businessId) return null

  return (
    <p className="tabular text-sm text-muted-foreground">
      {businessName}
      {businessName && businessId ? " · " : null}
      {businessId ? `${f.t("common.businessId")} ${businessId}` : null}
    </p>
  )
}
