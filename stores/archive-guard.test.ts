// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import { useBookStore } from "@/stores/book-store"

const INITIAL = useBookStore.getState()

describe("an archive book is read-only (§8.19)", () => {
  beforeEach(() => {
    localStorage.clear()
    useBookStore.setState(INITIAL, true)
    useBookStore.getState().newBook(2025, "fi")
  })

  const archive = () =>
    useBookStore.getState().replaceBook({
      entries: [],
      cats: useBookStore.getState().cats,
      fileName: "a.zip",
      year: 2025,
      dirty: false,
      fileHandle: null,
      savedAt: null,
      archiveYear: 2025,
    })

  it("drops changes to the book's data", () => {
    archive()
    useBookStore.getState().setBusinessName("Oma Oy")
    useBookStore.getState().setVatFiled("2025", "2026-02-10")
    const s = useBookStore.getState()
    expect(s.businessName).toBeNull()
    expect(s.vatFiled).toEqual({})
    expect(s.dirty).toBe(false)
  })

  it("still lets the view change", () => {
    archive()
    useBookStore.getState().setMonth(3)
    expect(useBookStore.getState().month).toBe(3)
  })

  it("opens only dialogs that show", () => {
    archive()
    useBookStore.getState().openDialog({ kind: "entry", mode: "new" })
    expect(useBookStore.getState().dialog.kind).toBe("none")
    useBookStore.getState().openDialog({ kind: "export" })
    expect(useBookStore.getState().dialog.kind).toBe("export")
  })

  it("is a working book again after closing", () => {
    archive()
    useBookStore.getState().closeBook()
    expect(useBookStore.getState().archiveYear).toBeNull()
    useBookStore.getState().newBook(2026, "fi")
    useBookStore.getState().setBusinessName("Oma Oy")
    expect(useBookStore.getState().businessName).toBe("Oma Oy")
  })

  it("applyArchive removes entries and records the stub in a working book", () => {
    useBookStore.getState().upsertEntry({
      id: "e1",
      date: "2025-03-01",
      description: "x",
      type: "expense",
      catId: "333",
      amount: 100,
      vatRate: 25.5,
      amountMode: "gross",
    })
    useBookStore.getState().applyArchive({
      year: 2025,
      stub: { file: "a.zip", on: "2026-11-05", entries: 1 },
      removeIds: ["e1"],
      bookStart: "2025-03",
      assetOpening: null,
      loanOpening: null,
    })
    const s = useBookStore.getState()
    expect(s.entries).toEqual([])
    expect(s.archives["2025"].file).toBe("a.zip")
    expect(s.yearsArchived["2025"]).toBe("2026-11-05")
    expect(s.bookStart).toBe("2025-03")
  })
})
