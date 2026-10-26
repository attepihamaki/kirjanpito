// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import { BOOK_STORAGE_KEY, useBookStore } from "@/stores/book-store"
import { LANG_STORAGE_KEY, useLangStore } from "@/stores/lang-store"

/** Captured before any test mutates the singletons. */
const BOOK_INITIAL = useBookStore.getState()
const LANG_INITIAL = useLangStore.getState()

function storedBook() {
  const raw = localStorage.getItem(BOOK_STORAGE_KEY)
  return raw
    ? (JSON.parse(raw) as { version: number; state: Record<string, unknown> })
    : null
}

describe("persisted preferences and bookkeeping (§12)", () => {
  beforeEach(() => {
    localStorage.clear()
    useBookStore.setState(BOOK_INITIAL, true)
    useLangStore.setState(LANG_INITIAL, true)
  })

  /*
   * The landing page rehydrates to read the open file's name, and a visitor
   * who has never recorded anything must come away with nothing but the
   * preferences they actually set.
   */
  it("leaves no bookkeeping key behind when there is no bookkeeping", async () => {
    await useBookStore.persist.rehydrate()
    useBookStore.getState().setHydrated({ open: false })

    expect(localStorage.getItem(BOOK_STORAGE_KEY)).toBeNull()
  })

  it("creates the key with the bookkeeping and keeps it after a close", () => {
    useBookStore.getState().newBook(2026)
    expect(storedBook()?.state.open).toBe(true)

    /*
     * Page sizes and the sidebar are app preferences living in this blob:
     * closing the file must not take them with it.
     */
    useBookStore.getState().setLedgerSize(50)
    useBookStore.getState().closeBook()

    expect(storedBook()?.state).toMatchObject({
      open: false,
      entries: [],
      ledgerSize: 50,
    })
  })

  it("stores the language as a bare value in its own key", () => {
    useLangStore.getState().setLang("en")

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("en")
    expect(localStorage.getItem(BOOK_STORAGE_KEY)).toBeNull()

    useLangStore.setState({ lang: "fi" })
    useLangStore.getState().hydrate()
    expect(useLangStore.getState().lang).toBe("en")
  })

  it("falls back to Finnish when the stored language is not one of ours", () => {
    localStorage.setItem(LANG_STORAGE_KEY, "sv")
    useLangStore.getState().hydrate()

    expect(useLangStore.getState().lang).toBe("fi")
  })

  it("moves the language and the theme out of an older blob", async () => {
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { open: true, entries: [], lang: "en", theme: "dark" },
      })
    )

    await useBookStore.persist.rehydrate()

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("en")
    expect(localStorage.getItem("theme")).toBe("dark")
    expect(storedBook()?.state).not.toHaveProperty("lang")
    expect(storedBook()?.state).not.toHaveProperty("theme")
  })

  it("keeps the newer key when both hold a language", async () => {
    localStorage.setItem(LANG_STORAGE_KEY, "fi")
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { open: true, lang: "en" } })
    )

    await useBookStore.persist.rehydrate()

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe("fi")
  })
})
