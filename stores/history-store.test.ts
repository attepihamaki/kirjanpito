// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { EMPTY_HISTORY } from "@/lib/domain/history"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"
import {
  applyHistoryStep,
  startRecordingHistory,
  useHistoryStore,
} from "@/stores/history-store"

const INITIAL = useBookStore.getState()

function entry(id: string, extra: Partial<Entry> = {}): Entry {
  return {
    id,
    date: "2026-03-01",
    description: id,
    type: "expense",
    catId: "333",
    amount: 12400,
    vatRate: 25.5,
    amountMode: "gross",
    ...extra,
  }
}

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve))
const allow = () => true
const book = () => useBookStore.getState()

describe("undo and redo (§8.20)", () => {
  let stop: () => void

  beforeEach(() => {
    localStorage.clear()
    useBookStore.setState(INITIAL, true)
    book().newBook(2026, "fi")
    useBookStore.setState({ hydrated: true })
    useHistoryStore.setState(EMPTY_HISTORY)
    stop = startRecordingHistory()
  })
  afterEach(() => stop())

  it("undoes and redoes an added entry", async () => {
    book().addEntries([entry("a")])
    await tick()
    expect(useHistoryStore.getState().past).toHaveLength(1)

    expect(applyHistoryStep("undo", allow)).toBe(true)
    expect(book().entries).toHaveLength(0)
    expect(book().dirty).toBe(true)

    expect(applyHistoryStep("redo", allow)).toBe(true)
    expect(book().entries.map((e) => e.id)).toEqual(["a"])
    expect(book().entries[0].voucher).toBe(1)
  })

  it("counts writes in the same task as one step", async () => {
    book().addEntries([entry("a")])
    book().addEntries([entry("b")])
    await tick()
    expect(useHistoryStore.getState().past).toHaveLength(1)
    applyHistoryStep("undo", allow)
    expect(book().entries).toHaveLength(0)
  })

  it("brings back a deleted entry with its voucher number", async () => {
    book().addEntries([entry("a"), entry("b")])
    await tick()
    book().removeEntry("a")
    await tick()
    applyHistoryStep("undo", allow)
    expect(book().entries.map((e) => [e.id, e.voucher])).toEqual([
      ["a", 1],
      ["b", 2],
    ])
  })

  it("drops the redo stack on a new change", async () => {
    book().addEntries([entry("a")])
    await tick()
    applyHistoryStep("undo", allow)
    expect(useHistoryStore.getState().future).toHaveLength(1)
    book().addEntries([entry("b")])
    await tick()
    expect(useHistoryStore.getState().future).toHaveLength(0)
  })

  it("covers category changes", async () => {
    const before = book().cats
    book().removeCategory(before[0].id)
    await tick()
    applyHistoryStep("undo", allow)
    expect(book().cats).toEqual(before)
  })

  it("leaves both stacks alone when the step is vetoed", async () => {
    book().addEntries([entry("a")])
    await tick()
    expect(applyHistoryStep("undo", () => false)).toBe(false)
    expect(useHistoryStore.getState().past).toHaveLength(1)
    expect(book().entries).toHaveLength(1)
  })

  it("drops the stacks when the book is saved", async () => {
    book().addEntries([entry("a")])
    await tick()
    book().markSaved({ fileName: "k.zip" })
    expect(useHistoryStore.getState().past).toHaveLength(0)
  })

  it("drops the stacks when another bookkeeping takes over", async () => {
    book().addEntries([entry("a")])
    await tick()
    book().newBook(2027, "fi")
    expect(useHistoryStore.getState().past).toHaveLength(0)
    expect(applyHistoryStep("undo", allow)).toBe(false)
  })

  it("does not record a change before the store has hydrated", async () => {
    useBookStore.setState({ hydrated: false })
    book().addEntries([entry("a")])
    await tick()
    expect(useHistoryStore.getState().past).toHaveLength(0)
  })
})
