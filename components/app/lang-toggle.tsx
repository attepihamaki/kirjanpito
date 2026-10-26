"use client"

import { LanguagesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useT } from "@/components/lang-provider"
import { useLangStore } from "@/stores/lang-store"
import type { Lang } from "@/lib/domain/types"

/** Endonyms, so each option reads the same whichever language is active. */
const LANGS: ReadonlyArray<{ code: Lang; label: string }> = [
  { code: "fi", label: "Suomi" },
  { code: "en", label: "English" },
]

/**
 * The language picker (§8.2): an icon button opening a checked list, the way
 * FormBox's header does it. Language is a stored preference, never a route
 * (§11b), so choosing one is a pure state change.
 */
export function LangToggle({ className }: { className?: string }) {
  const t = useT()
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={t("app.language")}
            title={t("app.language")}
          />
        }
      >
        <LanguagesIcon />
      </DropdownMenuTrigger>
      {/* The default content width tracks the trigger, which here is a 32px
          icon button. */}
      <DropdownMenuContent align="end" className="w-auto min-w-36">
        <DropdownMenuRadioGroup
          value={lang}
          onValueChange={(value) => setLang(value as Lang)}
        >
          {LANGS.map(({ code, label }) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
