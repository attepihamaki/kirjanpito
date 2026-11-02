// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import { clearAllEntries, deleteEntry } from "@/lib/commands/book-commands"
import {
  deleteEntries,
  recategorizeEntries,
} from "@/lib/commands/bulk-commands"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { collectLiveIds } from "@/lib/domain/gc"
import { assignVouchers } from "@/lib/domain/voucher"
import { createAppT } from "@/lib/i18n/messages"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/** Intl puts no-break spaces in money; the expectations use plain ones. */
const flat = (s: string | undefined) => (s ?? "").replace(/[  ]/g, " ")

/* Undoing a deletion, and warning about filed periods (§8.11). */

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
  const entries = [...assignVouchers(sampleEntries(createIdFactory("u")))]
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

describe("changes to a filed period", () => {
  const october = () =>
    useBookStore.getState().entries.find((e) => e.date === "2026-10-28")!

  beforeEach(() => {
    vi.mocked(confirm).mockClear()
    useBookStore.setState({ vatPeriod: "month", vatFiled: {} })
  })

  it("adds what a delete does to a filed return to its confirmation", async () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    await deleteEntry(ctx, october())

    const message = flat(vi.mocked(confirm).mock.calls[0][0].message)
    expect(message).toContain(
      "Lokakuu 2026 on merkitty ilmoitetuksi 14.12.2026."
    )
    expect(message).toContain("Maksettava vero pienenee 382,50 €.")
    expect(message).toContain("seuraavalla ilmoituksella")
  })

  it("keeps the plain confirmation when no filed period changes", async () => {
    await deleteEntry(ctx, october())
    const message = vi.mocked(confirm).mock.calls[0][0].message ?? ""
    expect(message).not.toContain("ilmoitetuksi")
  })

  it("asks before saving into a filed period, and only then", async () => {
    const edited = { ...october(), amount: 100 }
    const after = useBookStore
      .getState()
      .entries.map((e) => (e.id === edited.id ? edited : e))

    expect(await confirmFiledChange(after)).toBe(true)
    expect(confirm).not.toHaveBeenCalled()

    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    vi.mocked(confirm).mockResolvedValueOnce(false)
    expect(await confirmFiledChange(after)).toBe(false)
    expect(confirm).toHaveBeenCalledOnce()
  })
})

describe("bulk actions (§8.4)", () => {
  const pick = (...dates: string[]) =>
    useBookStore.getState().entries.filter((e) => dates.includes(e.date))

  beforeEach(() => {
    vi.mocked(confirm).mockClear()
    useBookStore.setState({ vatFiled: {} })
  })

  it("deletes the selected entries and brings them back on undo", async () => {
    const chosen = pick("2026-02-20", "2026-03-20")
    expect(await deleteEntries(ctx, chosen)).toBe(true)
    expect(vi.mocked(confirm).mock.calls[0][0].title).toBe(
      "Poistetaanko 2 kirjausta?"
    )
    expect(useBookStore.getState().entries).toHaveLength(14)

    clickUndo()
    expect(useBookStore.getState().entries).toHaveLength(16)
    expect(pick("2026-02-20", "2026-03-20")).toEqual(chosen)
  })

  it("moves the selected entries to another category, keeping their rates", async () => {
    const chosen = pick("2026-02-20", "2026-03-20")
    expect(await recategorizeEntries(ctx, chosen, "333")).toBe(true)

    const moved = pick("2026-02-20", "2026-03-20")
    expect(moved.map((e) => e.catId)).toEqual(["333", "333"])
    expect(moved.map((e) => e.vatRate)).toEqual([25.5, 25.5])
    expect(moved.map((e) => e.voucher)).toEqual(chosen.map((e) => e.voucher))

    clickUndo()
    expect(pick("2026-02-20", "2026-03-20").map((e) => e.catId)).toEqual([
      "343",
      "343",
    ])
  })

  it("asks before moving entries of a filed period, and stops on cancel", async () => {
    useBookStore.setState({ vatFiled: { "2026-02": "2026-04-12" } })
    vi.mocked(confirm).mockResolvedValueOnce(false)
    // A Finnish sale moved to EU goods leaves the sales VAT (§6.1).
    const sale = pick("2026-02-12")

    expect(await recategorizeEntries(ctx, sale, "300-eu-goods")).toBe(false)
    expect(confirm).toHaveBeenCalledOnce()
    expect(pick("2026-02-12")[0].catId).toBe("300-domestic")
  })

  it("does nothing for entries already in the category", async () => {
    expect(await recategorizeEntries(ctx, pick("2026-02-20"), "343")).toBe(
      false
    )
  })
})
