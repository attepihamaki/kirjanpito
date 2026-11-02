// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import { clearAllEntries, deleteEntry } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { collectLiveIds } from "@/lib/domain/gc"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/* Undoing a deleted entry or a cleared bookkeeping (§8.11). */

vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

type ToastOptions = Parameters<typeof toast.add>[0]
let raised: ToastOptions[] = []

function lastUndo(): ToastOptions {
  const t = [...raised].reverse().find((o) => o.actionProps)
  if (!t) throw new Error("no undo toast")
  return t
}

function clickUndo() {
  const onClick = lastUndo().actionProps?.onClick
  onClick?.({} as never)
}

beforeEach(() => {
  raised = []
  vi.spyOn(toast, "add").mockImplementation((options) => {
    raised.push(options)
    return String(raised.length)
  })
  vi.spyOn(toast, "close").mockImplementation(() => {})
  const entries = sampleEntries(createIdFactory("u"))
  entries[0].atts = [
    { id: "att-1", name: "a.pdf", type: "application/pdf", size: 1 },
  ]
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries,
    cats: defaultCategories(),
    year: 2026,
    dirty: false,
    undoAttachmentIds: [],
  })
})

describe("deleteEntry", () => {
  it("puts the entry back on undo", async () => {
    const entry = useBookStore.getState().entries[0]
    await deleteEntry(ctx, entry)
    expect(useBookStore.getState().entries).toHaveLength(15)

    clickUndo()
    const back = useBookStore.getState().entries.find((e) => e.id === entry.id)
    expect(back).toEqual(entry)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  it("keeps the entry's receipts from the sweep until the toast is gone", async () => {
    const entry = useBookStore.getState().entries[0]
    await deleteEntry(ctx, entry)

    const s = useBookStore.getState()
    expect(
      collectLiveIds(s.entries, [
        ...s.draftAttachmentIds,
        ...s.undoAttachmentIds,
      ])
    ).toContain("att-1")

    lastUndo().onRemove?.()
    expect(useBookStore.getState().undoAttachmentIds).toEqual([])
  })

  it("does nothing once another bookkeeping has taken over", async () => {
    await deleteEntry(ctx, useBookStore.getState().entries[0])
    useBookStore.getState().newBook(2026)

    clickUndo()
    expect(useBookStore.getState().entries).toEqual([])
  })

  it("does not duplicate an entry when undone twice", async () => {
    await deleteEntry(ctx, useBookStore.getState().entries[0])
    clickUndo()
    clickUndo()
    expect(useBookStore.getState().entries).toHaveLength(16)
  })
})

describe("clearAllEntries", () => {
  it("brings every entry back on undo", async () => {
    const before = useBookStore.getState().entries
    await clearAllEntries(ctx)
    expect(useBookStore.getState().entries).toEqual([])

    clickUndo()
    expect(useBookStore.getState().entries).toEqual(before)
  })

  it("offers no undo when there was nothing to clear", async () => {
    useBookStore.setState({ entries: [] })
    await clearAllEntries(ctx)
    expect(raised.every((o) => !o.actionProps)).toBe(true)
  })
})
