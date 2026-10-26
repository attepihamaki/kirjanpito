"use client"

import { create } from "zustand"

import type { Lang } from "@/lib/domain/types"

/**
 * The UI language, in its own localStorage key.
 *
 * It holds the bare value — `lang` is `"fi"` or `"en"`, not a JSON blob —
 * the way next-themes keeps `theme`. The two app-level preferences then look
 * the same in devtools, and neither depends on a bookkeeping being open:
 * the landing page and the 404 need the language, and they must not touch
 * the `bookkeeping` key to get it (§12).
 *
 * The key is written only when the user picks a language. Reading it never
 * creates it, so a visitor who never opens the picker leaves no trace.
 */
export const LANG_STORAGE_KEY = "lang"

export const DEFAULT_LANG: Lang = "fi"

const LANGS: readonly Lang[] = ["fi", "en"]

function readLang(): Lang | null {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY)
    return LANGS.includes(raw as Lang) ? (raw as Lang) : null
  } catch {
    return null
  }
}

/** Exported for the book store's migration off the prototype-era blob. */
export function writeLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // Storage unavailable; the choice lasts for this session only.
  }
}

interface LangStore {
  lang: Lang
  /** False until `hydrate()` has run; see the note in `StoreHydrator`. */
  hydrated: boolean
  setLang(lang: Lang): void
  hydrate(): void
}

export const useLangStore = create<LangStore>()((set) => ({
  lang: DEFAULT_LANG,
  hydrated: false,

  setLang: (lang) => {
    writeLang(lang)
    set({ lang })
  },

  // Prerender must not touch localStorage: the default is Finnish, which is
  // what the prerendered HTML says, so the first client render matches byte
  // for byte and this effect-time read is the only divergence (§11b).
  hydrate: () => set({ lang: readLang() ?? DEFAULT_LANG, hydrated: true }),
}))
