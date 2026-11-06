"use client"

import * as React from "react"

import type { Lang } from "@/lib/domain/types"
import { createFormatters, type Formatters } from "@/lib/i18n/create-formatters"
import { useLangStore } from "@/stores/lang-store"

const LangContext = React.createContext<Formatters>(createFormatters("fi"))

/**
 * Supplies the formatters and `t()` for a subtree. `AppLangProvider` below
 * binds it to the stored preference, which is safe only because nothing
 * translated renders before the store has hydrated.
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
function AppLangProvider({ children }: { children: React.ReactNode }) {
  const lang = useLangStore((s) => s.lang)
  return <LangProvider lang={lang}>{children}</LangProvider>
}

/**
 * The root of a rendered document: the app shell, the landing page and the
 * 404 all start with this. It binds the subtree to the stored language and
 * keeps `<html lang>` in step, which every one of them needs and none of them
 * may do differently.
 */
export function LangRoot({ children }: { children: React.ReactNode }) {
  return (
    <AppLangProvider>
      <LangHtmlAttr />
      {children}
    </AppLangProvider>
  )
}

export function useFormatters(): Formatters {
  return React.useContext(LangContext)
}

/** Shorthand for the common case. */
export function useT() {
  return React.useContext(LangContext).t
}

/**
 * Keeps `document.documentElement.lang` and the document title in step with
 * the stored preference (§9). The Finnish title is whatever the page's own
 * metadata set, which is kept for switching back.
 *
 * The attribute is set imperatively rather than rendered: the JSX prop in
 * HtmlShell is a literal that never changes, so React has nothing to revert.
 * This is how next-themes manages `class` on the same element.
 */
function LangHtmlAttr() {
  const lang = useLangStore((s) => s.lang)
  const hydrated = useLangStore((s) => s.hydrated)
  const t = useT()
  const finnishTitle = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!hydrated) return
    document.documentElement.lang = lang
    finnishTitle.current ??= document.title
    document.title =
      lang === "en" ? t("app.documentTitle") : finnishTitle.current
  }, [lang, hydrated, t])

  return null
}
