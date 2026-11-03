// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import {
  clearAllEntries,
  deleteEntry,
  renumberVouchers,
} from "@/lib/commands/book-commands"
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

  it("refuses to delete an entry in a filed period (KPL 2:7)", async () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    const before = useBookStore.getState().entries.length

    expect(await deleteEntry(ctx, october())).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(useBookStore.getState().entries).toHaveLength(before)
  })

  it("refuses to clear a book with an entry in a filed period", async () => {
    useBookStore.setState({ vatFiled: { "2026-10": "2026-12-14" } })
    const before = useBookStore.getState().entries.length

    await clearAllEntries(ctx)
    expect(useBookStore.getState().entries).toHaveLength(before)
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
