"use client"

import * as React from "react"

import type { Lang } from "@/lib/domain/types"
import { createFormatters, type Formatters } from "@/lib/i18n/create-formatters"
import { useLangStore } from "@/stores/lang-store"

const LangContext = React.createContext<Formatters>(createFormatters("fi"))

/**
 * Supplies the formatters and `t()` for a subtree.
 *
 * The landing pages pass a literal `lang` baked at build time, because the
 * language of an indexed document is a property of its URL. The app reads the
 * stored preference instead, which is safe only because nothing translated
 * renders before the store has hydrated.
 */
export function LangProvider({
  lang,
  children,
}: {
  lang: Lang
  children: React.ReactNode
}) {
  const formatters = React.useMemo(() => createFormatters(lang), [lang])
  return (
    <LangContext.Provider value={formatters}>{children}</LangContext.Provider>
  )
}

/** The app's provider: language comes from the stored preference. */
export function AppLangProvider({ children }: { children: React.ReactNode }) {
  const lang = useLangStore((s) => s.lang)
  return <LangProvider lang={lang}>{children}</LangProvider>
}

export function useFormatters(): Formatters {
  return React.useContext(LangContext)
}

/** Shorthand for the common case. */
export function useT() {
  return React.useContext(LangContext).t
}

/**
 * Keeps `document.documentElement.lang` in step with the stored preference.
 *
 * The attribute is set imperatively rather than rendered: the JSX prop in
 * HtmlShell is a literal that never changes, so React has nothing to revert.
 * This is how next-themes manages `class` on the same element.
 */
export function LangHtmlAttr() {
  const lang = useLangStore((s) => s.lang)
  const hydrated = useLangStore((s) => s.hydrated)

  React.useEffect(() => {
    if (hydrated) document.documentElement.lang = lang
  }, [lang, hydrated])

  return null
}
