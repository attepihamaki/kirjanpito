"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useT } from "@/components/lang-provider"
import { useBookStore } from "@/stores/book-store"

/** FI | EN inside the app, where language is a stored preference (§8.2). */
export function LangToggle({ className }: { className?: string }) {
  const t = useT()
  const lang = useBookStore((s) => s.lang)
  const setLang = useBookStore((s) => s.setLang)

  return (
    <ToggleGroup
      className={className}
      aria-label={t("language")}
      value={[lang]}
      onValueChange={(value) => {
        const next = value[0]
        if (next === "fi" || next === "en") setLang(next)
      }}
    >
      <ToggleGroupItem value="fi" lang="fi" aria-label="Suomi">
        FI
      </ToggleGroupItem>
      <ToggleGroupItem value="en" lang="en" aria-label="English">
        EN
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
