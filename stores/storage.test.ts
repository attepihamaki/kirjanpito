// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
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
    useBookStore.getState().newBook(2026, "fi")
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

  it("reads a stored customer register from before roles as customers", async () => {
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({
        version: 11,
        state: {
          open: true,
          entries: [],
          customers: [
            { id: "c1", name: "Vanha Oy", language: "fi", termDays: 14 },
          ],
        },
      })
    )

    await useBookStore.persist.rehydrate()

    expect(useBookStore.getState().customers[0]).toMatchObject({
      role: "customer",
      termDays: 14,
      incomeCat: null,
      expenseCat: null,
      vatRate: null,
    })
  })

  it("adds the EU goods and services categories to an older list", async () => {
    const cats = defaultCategories()
      .filter((c) => !c.id.startsWith("300-eu-"))
      .map((c) => (c.id === "333" ? { ...c, vatRate: 24 } : c))
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 2, state: { open: true, cats } })
    )

    await useBookStore.persist.rehydrate()

    const byId = new Map(useBookStore.getState().cats.map((c) => [c.id, c]))
    expect(byId.get("300-eu-goods")?.enabled).toBe(true)
    expect(byId.get("300-eu-services")?.enabled).toBe(true)
    expect(byId.get("300-eu")?.enabled).toBe(false)
    expect(byId.get("333")?.vatRate).toBe(24)
  })

  it("moves a stored EU purchase to an EU category on its line", async () => {
    const cats = defaultCategories().filter((c) => !c.euPurchase)
    const entries = [
      {
        id: "a",
        voucher: 1,
        date: "2026-03-10",
        description: "Pilvipalvelu",
        type: "expense",
        catId: "344-other",
        amount: 10_000,
        vatRate: 25.5,
        amountMode: "net",
        euPurchase: "services",
      },
    ]
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 9, state: { open: true, cats, entries } })
    )

    await useBookStore.persist.rehydrate()

    expect(useBookStore.getState().entries[0]).toMatchObject({
      catId: "344-eu-services",
      euPurchase: "services",
      amount: 10_000,
    })
  })

  it("adds the VAT payment and refund categories to a stored list", async () => {
    const cats = defaultCategories().filter((c) => !c.id.startsWith("vat-"))
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 5, state: { open: true, cats } })
    )

    await useBookStore.persist.rehydrate()

    const ids = useBookStore.getState().cats.map((c) => c.id)
    expect(ids).toContain("vat-payment")
    expect(ids).toContain("vat-refund")
  })

  it("adds the owner's transfer categories to a stored list", async () => {
    const cats = defaultCategories().filter((c) => !c.id.startsWith("owner-"))
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 6, state: { open: true, cats } })
    )

    await useBookStore.persist.rehydrate()

    const ids = useBookStore.getState().cats.map((c) => c.id)
    expect(ids).toContain("owner-withdrawal")
    expect(ids).toContain("owner-investment")
  })

  it("gives a stored default its current name and keeps its rate", async () => {
    const cats = defaultCategories().map((c) =>
      c.id === "301"
        ? { ...c, name: "Muut tuotot" }
        : c.id === "344-travel"
          ? { ...c, vatRate: 25.5 }
          : c
    )
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 8, state: { open: true, cats } })
    )

    await useBookStore.persist.rehydrate()

    const byId = new Map(useBookStore.getState().cats.map((c) => [c.id, c]))
    expect(byId.get("301")?.name).toBe("Liiketoiminnan muut tuotot")
    expect(byId.get("344-travel")?.vatRate).toBe(25.5)
  })

  it("renames the EU goods category in a list stored at version 10", async () => {
    const cats = defaultCategories().map((c) =>
      c.id === "333-eu-goods"
        ? { ...c, name: "Ostot – EU, tavarat", enabled: false }
        : c
    )
    localStorage.setItem(
      BOOK_STORAGE_KEY,
      JSON.stringify({ version: 10, state: { open: true, cats } })
    )

    await useBookStore.persist.rehydrate()

    const cat = useBookStore
      .getState()
      .cats.find((c) => c.id === "333-eu-goods")
    expect(cat?.name).toBe("Ostot ja varastojen muutokset – EU")
    expect(cat?.enabled).toBe(false)
  })

  /* Every step guards on the data, so a second run changes nothing (§12). */
  it("migrates a blob that is already current without changing it", () => {
    const migrate = useBookStore.persist.getOptions().migrate!
    const old = {
      open: true,
      cats: defaultCategories().filter((c) => c.id !== "333-eu-goods"),
      entries: [
        {
          id: "a",
          date: "2026-02-01",
          type: "expense",
          catId: "333",
          amount: 1,
        },
        {
          id: "b",
          date: "2026-01-01",
          type: "expense",
          catId: "333",
          amount: 2,
        },
      ],
    }

    const once = migrate(old, 9)
    const twice = migrate(JSON.parse(JSON.stringify(once)), 11)

    expect(twice).toEqual(once)
  })

  /*
   * The guard against outside edits compares against it (§7.5), so a reload
   * must not turn it off.
   */
  it("keeps the linked file's timestamp across a reload", () => {
    useBookStore.getState().newBook(2026, "fi")
    useBookStore.getState().markSaved({ fileName: "k.zip", savedAt: 1234 })

    expect(storedBook()?.state.savedAt).toBe(1234)
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
