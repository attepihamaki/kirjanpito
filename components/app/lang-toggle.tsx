"use client"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useT } from "@/components/lang-provider"
import { useBookStore } from "@/stores/book-store"

/** FI | EN inside the app, where language is a stored preference (§8.2). */
export function LangToggle({
  className,
  compact,
}: {
  className?: string
  /** One button naming the other language, for the mobile top bar (§8.2). */
  compact?: boolean
}) {
  const t = useT()
  const lang = useBookStore((s) => s.lang)
  const setLang = useBookStore((s) => s.setLang)

  if (compact) {
    const other = lang === "fi" ? "en" : "fi"
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        lang={other}
        aria-label={t("switchLang")}
        title={t("switchLang")}
        onClick={() => setLang(other)}
      >
        <span className="text-xs font-semibold">{other.toUpperCase()}</span>
      </Button>
    )
  }

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
