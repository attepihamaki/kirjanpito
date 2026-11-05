// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import {
  deleteBook,
  deleteEntry,
  offerEditUndo,
  renumberVouchers,
} from "@/lib/commands/book-commands"
import type { Entry } from "@/lib/domain/types"
import {
  deleteEntries,
  recategorizeEntries,
  splitEntry,
} from "@/lib/commands/bulk-commands"
import { confirmFiledChange } from "@/lib/commands/filed-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { collectLiveIds } from "@/lib/domain/gc"
import { assignVouchers } from "@/lib/domain/voucher"
import { createAppT } from "@/lib/i18n/messages"
import { LANDING } from "@/lib/site"
import { choose, confirm } from "@/lib/ui/confirm"
import { BOOK_STORAGE_KEY, useBookStore } from "@/stores/book-store"

/** Intl puts no-break spaces in money; the expectations use plain ones. */
const flat = (s: string | undefined) => (s ?? "").replace(/[  ]/g, " ")

/* Undoing a deletion, and warning about filed periods (§8.11). */

vi.mock("@/lib/ui/confirm", () => ({
  confirm: vi.fn(async () => true),
  choose: vi.fn(async () => "confirm"),
}))

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
    useBookStore.getState().newBook(2026, "fi")

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

describe("deleteEntry on a split receipt", () => {
  function splitInto(n: number) {
    const store = useBookStore.getState()
    const ids = store.entries.slice(0, n).map((e) => e.id)
    store.updateEntries(
      store.entries.slice(0, n).map((e) => ({ ...e, split: "g1" }))
    )
    return ids
  }

  it("deletes every part and undoes them together", async () => {
    const [first] = splitInto(3)
    vi.mocked(choose).mockResolvedValueOnce("confirm")
    await deleteEntry(
      ctx,
      useBookStore.getState().entries.find((e) => e.id === first)!
    )
    expect(useBookStore.getState().entries).toHaveLength(13)

    clickUndo()
    expect(useBookStore.getState().entries).toHaveLength(16)
  })

  it("deletes only this part when asked to", async () => {
    const [first] = splitInto(3)
    vi.mocked(choose).mockResolvedValueOnce("alternative")
    await deleteEntry(
      ctx,
      useBookStore.getState().entries.find((e) => e.id === first)!
    )
    const left = useBookStore.getState().entries
    expect(left).toHaveLength(15)
    expect(left.filter((e) => e.split === "g1")).toHaveLength(2)
  })

  it("does nothing on cancel", async () => {
    const [first] = splitInto(2)
    vi.mocked(choose).mockResolvedValueOnce("cancel")
    const ok = await deleteEntry(
      ctx,
      useBookStore.getState().entries.find((e) => e.id === first)!
    )
    expect(ok).toBe(false)
    expect(useBookStore.getState().entries).toHaveLength(16)
  })

  it("asks the ordinary question about an entry with no other parts", async () => {
    const [only] = splitInto(1)
    vi.mocked(choose).mockClear()
    await deleteEntry(
      ctx,
      useBookStore.getState().entries.find((e) => e.id === only)!
    )
    expect(choose).not.toHaveBeenCalled()
    expect(useBookStore.getState().entries).toHaveLength(15)
  })
})

describe("splitEntry", () => {
  const first = () => useBookStore.getState().entries[0]

  it("leaves the rest on the original and adds a linked part", async () => {
    const before = first()
    expect(
      await splitEntry(ctx, before, {
        amount: 1_000,
        catId: "301",
        vatRate: 0,
      })
    ).toBe(true)

    const entries = useBookStore.getState().entries
    expect(entries).toHaveLength(17)
    const original = entries.find((e) => e.id === before.id)!
    const part = entries.find(
      (e) => e.split === original.split && e.id !== before.id
    )!
    expect(original.amount).toBe(before.amount - 1_000)
    expect(part.amount).toBe(1_000)
    expect(part.voucher).toBeDefined()
    expect(part.atts?.map((a) => a.id)).toEqual(before.atts?.map((a) => a.id))
  })

  it("puts the original back and removes the part on undo", async () => {
    const before = first()
    await splitEntry(ctx, before, {
      amount: 1_000,
      catId: "301",
      vatRate: 0,
    })
    clickUndo()
    const entries = useBookStore.getState().entries
    expect(entries).toHaveLength(16)
    expect(entries.find((e) => e.id === before.id)).toEqual(before)
  })

  it("will not undo once the original has been edited", async () => {
    const before = first()
    await splitEntry(ctx, before, {
      amount: 1_000,
      catId: "301",
      vatRate: 0,
    })
    const edited = useBookStore
      .getState()
      .entries.find((e) => e.id === before.id)!
    useBookStore.getState().upsertEntry({ ...edited, description: "Muutettu" })
    clickUndo()
    expect(useBookStore.getState().entries).toHaveLength(17)
  })

  it("refuses an amount that is not smaller than the entry", async () => {
    const before = first()
    expect(
      await splitEntry(ctx, before, {
        amount: before.amount,
        catId: "301",
        vatRate: 0,
      })
    ).toBe(false)
    expect(useBookStore.getState().entries).toHaveLength(16)
  })
})

describe("a payment shared across a split", () => {
  it("moves the other parts when one is marked open, and back on undo", () => {
    const store = useBookStore.getState()
    const [a, b] = store.entries.filter(
      (e) => e.type === "expense" && e.vatRate > 0
    )
    store.updateEntries([
      { ...a, split: "g1" },
      { ...b, date: a.date, split: "g1" },
    ])
    const now = useBookStore.getState().entries
    const first = now.find((e) => e.id === a.id)!
    useBookStore.getState().upsertEntry({ ...first, paidOn: null })

    const after = useBookStore.getState().entries
    expect(after.find((e) => e.id === b.id)?.paidOn).toBeNull()

    useBookStore.getState().upsertEntry({ ...first, paidOn: undefined })
    const paid = useBookStore.getState().entries
    expect(paid.find((e) => e.id === b.id)?.paidOn).toBeUndefined()
  })
})

describe("offerEditUndo", () => {
  function edit(changes: Partial<Entry>) {
    const store = useBookStore.getState()
    const before = store.entries[0]
    store.upsertEntry({ ...before, ...changes })
    offerEditUndo(ctx, before, store.recurring)
    return before
  }

  it("puts the entry back as it was", () => {
    const before = edit({ description: "Muutettu", amount: 1 })
    clickUndo()
    expect(
      useBookStore.getState().entries.find((e) => e.id === before.id)
    ).toEqual(before)
  })

  it("brings back the old voucher number after a move to another year", () => {
    const before = edit({ date: "2027-01-05" })
    const moved = useBookStore
      .getState()
      .entries.find((e) => e.id === before.id)
    expect(moved?.voucher).toBe(1)
    clickUndo()
    const back = useBookStore.getState().entries.find((e) => e.id === before.id)
    expect(back).toEqual(before)
  })

  it("restores the monthly template the edit changed", () => {
    const store = useBookStore.getState()
    const template = {
      id: "r1",
      description: "Vuokra",
      type: "expense" as const,
      catId: "343",
      amount: 45000,
      vatRate: 25.5,
      amountMode: "gross" as const,
      day: 20,
      from: "2026-02",
    }
    store.upsertRecurring(template)
    const before = store.entries[0]
    const recurringBefore = useBookStore.getState().recurring
    store.upsertEntry({ ...before, description: "Muutettu" })
    store.upsertRecurring({ ...template, amount: 50000 })
    store.upsertRecurring({ ...template, id: "r2" })
    offerEditUndo(ctx, before, recurringBefore)

    clickUndo()
    expect(useBookStore.getState().recurring).toEqual([template])
  })

  it("keeps the receipts of the old entry from the sweep until the toast is gone", () => {
    edit({ atts: [] })
    const s = useBookStore.getState()
    expect(collectLiveIds(s.entries, s.undoAttachmentIds)).toContain("att-1")
    lastUndo().onRemove?.()
    expect(useBookStore.getState().undoAttachmentIds).toEqual([])
  })

  it("refuses when the entry was changed again", () => {
    const before = edit({ description: "Muutettu" })
    const store = useBookStore.getState()
    store.upsertEntry({ ...store.entries[0], description: "Taas" })
    clickUndo()
    expect(
      useBookStore.getState().entries.find((e) => e.id === before.id)
        ?.description
    ).toBe("Taas")
    expect(raised.at(-1)?.title).toBe(ctx.t("entry.editUndoChanged"))
  })

  it("does nothing once another bookkeeping has taken over", () => {
    edit({ description: "Muutettu" })
    useBookStore.getState().newBook(2026, "fi")
    clickUndo()
    expect(useBookStore.getState().entries).toEqual([])
  })
})

describe("deleteBook", () => {
  beforeEach(() => {
    vi.mocked(confirm).mockClear()
    vi.mocked(ctx.navigate).mockClear()
    localStorage.setItem(BOOK_STORAGE_KEY, "{}")
  })

  it("warns that it is permanent before doing anything", async () => {
    await deleteBook(ctx)
    const options = vi.mocked(confirm).mock.calls[0][0]
    expect(options.message).toContain("eikä poistoa voi perua")
    expect(options.message).toContain("Lataa kirjanpito tiedostoksi ensin")
  })

  it("empties the book, drops the stored blob and goes to the landing page", async () => {
    await deleteBook(ctx)

    const s = useBookStore.getState()
    expect(s.open).toBe(false)
    expect(s.entries).toEqual([])
    expect(s.dirty).toBe(false)
    expect(localStorage.getItem(BOOK_STORAGE_KEY)).toBeNull()
    expect(ctx.navigate).toHaveBeenCalledWith(LANDING)
  })

  it("leaves everything alone when the user cancels", async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false)
    const before = useBookStore.getState().entries

    await deleteBook(ctx)

    expect(useBookStore.getState().entries).toEqual(before)
    expect(useBookStore.getState().open).toBe(true)
    expect(localStorage.getItem(BOOK_STORAGE_KEY)).toBe("{}")
    expect(ctx.navigate).not.toHaveBeenCalled()
  })

  it("deletes a book with filed periods and unsaved changes", async () => {
    useBookStore.setState({
      vatFiled: { "2026-10": "2026-12-14" },
      dirty: true,
    })

    await deleteBook(ctx)

    expect(useBookStore.getState().entries).toEqual([])
    expect(useBookStore.getState().vatFiled).toEqual({})
  })
})

describe("changes to a filed period", () => {
  const october = () =>
    useBookStore.getState().entries.find((e) => e.date === "2026-10-28")!

  beforeEach(() => {
    vi.mocked(confirm).mockClear()
    useBookStore.setState({ vatPeriod: "month", vatFiled: {} })
  })

  it("refuses to delete an entry in a filed period (KPL 2:7)", async () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    const before = useBookStore.getState().entries.length

    expect(await deleteEntry(ctx, october())).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(useBookStore.getState().entries).toHaveLength(before)
  })

  it("still deletes an entry the filed return does not count", async () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    const fee = useBookStore
      .getState()
      .entries.find((e) => e.date === "2026-10-30")!
    vi.mocked(confirm).mockResolvedValueOnce(true)

    expect(await deleteEntry(ctx, fee)).toBe(true)
    clickUndo()
  })

  it("says how to correct a return when a new entry goes into its period", async () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    const added = { ...october(), id: "new", amount: 100_000 }
    vi.mocked(confirm).mockResolvedValueOnce(false)

    await confirmFiledChange([...useBookStore.getState().entries, added])
    const message = flat(vi.mocked(confirm).mock.calls[0][0].message)
    expect(message).toContain(
      "Lokakuu 2026 on merkitty ilmoitetuksi 14.12.2026."
    )
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
      "Poistetaanko 2 tositetta?"
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

  it("refuses to move or delete entries of a filed period", async () => {
    useBookStore.setState({ vatFiled: { "2026-02": "2026-04-12" } })
    const sale = pick("2026-02-12")

    expect(await recategorizeEntries(ctx, sale, "300-eu-goods")).toBe(false)
    expect(await deleteEntries(ctx, sale)).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(pick("2026-02-12")[0].catId).toBe("300-domestic")
  })

  it("does nothing for entries already in the category", async () => {
    expect(await recategorizeEntries(ctx, pick("2026-02-20"), "343")).toBe(
      false
    )
  })
})

describe("renumberVouchers", () => {
  const voucher = (id: string, date: string, n?: number) => ({
    id,
    date,
    ...(n ? { voucher: n } : {}),
    description: id,
    type: "expense" as const,
    catId: "333",
    amount: 1000,
    vatRate: 25.5,
    amountMode: "gross" as const,
  })
  const numbers = () =>
    Object.fromEntries(
      useBookStore.getState().entries.map((e) => [e.id, e.voucher])
    )

  beforeEach(() => {
    vi.mocked(confirm).mockClear()
    useBookStore.setState({
      entries: [
        voucher("late", "2026-03-01", 1),
        voucher("early", "2026-01-01", 2),
      ],
      yearsArchived: {},
      vatFiled: {},
      dirty: false,
    })
  })

  it("renumbers after asking, marks the book dirty and can be undone", async () => {
    expect(await renumberVouchers(ctx, 2026)).toBe(true)
    expect(confirm).toHaveBeenCalledOnce()
    expect(numbers()).toEqual({ early: 1, late: 2 })
    expect(useBookStore.getState().dirty).toBe(true)

    clickUndo()
    expect(numbers()).toEqual({ late: 1, early: 2 })
  })

  it("changes nothing when the user cancels", async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false)
    expect(await renumberVouchers(ctx, 2026)).toBe(false)
    expect(numbers()).toEqual({ late: 1, early: 2 })
  })

  it("does not ask when the numbers are already in order", async () => {
    useBookStore.setState({ entries: [voucher("a", "2026-01-01", 1)] })
    expect(await renumberVouchers(ctx, 2026)).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it("refuses a year whose Form 5 is filed", async () => {
    useBookStore.setState({ form5Filed: { "2026": "2027-03-20" } })
    expect(await renumberVouchers(ctx, 2026)).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    useBookStore.setState({ form5Filed: {} })
  })

  it("refuses a year with an entry in a stored year or filed period", async () => {
    useBookStore.setState({ yearsArchived: { "2026": "2027-01-20" } })
    expect(await renumberVouchers(ctx, 2026)).toBe(false)
    useBookStore.setState({
      yearsArchived: {},
      vatFiled: { "2026-01": "2026-03-12" },
    })
    expect(await renumberVouchers(ctx, 2026)).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it("keeps an entry added since when undone", async () => {
    await renumberVouchers(ctx, 2026)
    useBookStore.getState().addEntries([voucher("new", "2026-04-01")])
    clickUndo()
    expect(numbers()).toEqual({ late: 1, early: 2, new: 3 })
  })
})

describe("the change log (§8.11)", () => {
  const added = {
    id: "logged",
    date: "2026-07-01",
    description: "Testi",
    type: "expense" as const,
    catId: "333",
    amount: 1000,
    vatRate: 25.5,
    amountMode: "gross" as const,
  }
  const actions = () => useBookStore.getState().changeLog.map((r) => r.action)

  beforeEach(() => {
    useBookStore.setState({ entries: [], changeLog: [], vatFiled: {} })
  })

  it("records an entry's life, from adding to an undone delete", () => {
    const store = useBookStore.getState()
    store.addEntries([added])
    store.upsertEntry({ ...added, amount: 2000 })
    store.removeEntry("logged")
    store.restoreEntries([added])
    expect(actions()).toEqual(["add", "edit", "delete", "restore"])
    expect(useBookStore.getState().changeLog[1].changes).toEqual([
      { field: "amount", from: 1000, to: 2000 },
    ])
  })

  it("records Form 5 marked and unmarked", () => {
    const store = useBookStore.getState()
    store.setForm5Filed(2026, "2027-03-20")
    expect(useBookStore.getState().form5Filed).toEqual({
      "2026": "2027-03-20",
    })
    store.setForm5Filed(2026, null)
    expect(useBookStore.getState().form5Filed).toEqual({})
    expect(actions()).toEqual(["lock", "unlock"])
    expect(useBookStore.getState().changeLog[0].period).toBe("form5-2026")
  })

  it("records a mark set and removed", () => {
    const store = useBookStore.getState()
    store.setVatFiled("2026-07", "2026-09-14")
    store.setVatFiled("2026-07", null)
    expect(actions()).toEqual(["lock", "unlock"])
    expect(useBookStore.getState().changeLog[0].period).toBe("2026-07")
  })

  it("lets a payment date be set on a locked entry's record", () => {
    const store = useBookStore.getState()
    store.addEntries([{ ...added, paidOn: null }])
    store.setVatFiled("2026-07", "2026-09-14")
    store.upsertEntry({
      ...useBookStore.getState().entries[0],
      paidOn: "2026-10-01",
    })
    expect(actions()).toEqual(["add", "lock", "edit"])
  })
})
