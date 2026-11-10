// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import {
  redateEntries,
  setEntriesPaid,
  setEntriesVat,
} from "@/lib/commands/bulk-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/* Editing several ledger rows at once (§8.4). */

vi.mock("@/lib/ui/confirm", () => ({
  confirm: vi.fn(async () => true),
  choose: vi.fn(async () => "confirm"),
}))

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

type ToastOptions = Parameters<typeof toast.add>[0]
let raised: ToastOptions[] = []

const undo = () =>
  [...raised]
    .reverse()
    .find((o) => o.actionProps)
    ?.actionProps?.onClick?.({} as never)

const entry = (id: string, over: Partial<Entry> = {}): Entry => ({
  id,
  date: "2026-03-10",
  description: id,
  type: "expense",
  catId: "344-other",
  amount: 12_550,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

const byId = (id: string) =>
  useBookStore.getState().entries.find((e) => e.id === id)!

beforeEach(() => {
  raised = []
  vi.spyOn(toast, "add").mockImplementation((options) => {
    raised.push(options)
    return String(raised.length)
  })
  vi.spyOn(toast, "close").mockImplementation(() => {})
  useBookStore.setState({
    open: true,
    hydrated: true,
    cats: defaultCategories(),
    year: 2026,
    entries: [
      entry("a"),
      entry("b", { split: "s", paidOn: null }),
      entry("c", { split: "s", paidOn: null, amount: 1_000 }),
      entry("d", { date: "2025-12-30" }),
    ],
    vatFiled: {},
    form5Filed: {},
    yearsArchived: {},
    invoices: [],
  })
})

describe("bulk edits", () => {
  it("moves the selection to one date, a split receipt whole, and undoes it", async () => {
    const s = useBookStore.getState()
    expect(await redateEntries(ctx, [byId("a"), byId("b")], "2026-04-01")).toBe(
      true
    )
    expect(["a", "b", "c"].map((id) => byId(id).date)).toEqual([
      "2026-04-01",
      "2026-04-01",
      "2026-04-01",
    ])
    undo()
    expect(useBookStore.getState().entries.map((e) => e.date)).toEqual(
      s.entries.map((e) => e.date)
    )
  })

  it("keeps the date inside the entries' own year", async () => {
    expect(await redateEntries(ctx, [byId("a"), byId("d")], "2026-04-01")).toBe(
      false
    )
    expect(byId("d").date).toBe("2025-12-30")
  })

  it("gives every selected entry one rate, but not an EU purchase", async () => {
    expect(await setEntriesVat(ctx, [byId("a"), byId("d")], 14)).toBe(true)
    expect([byId("a").vatRate, byId("d").vatRate]).toEqual([14, 14])
    useBookStore.setState({
      entries: [entry("e", { euPurchase: "goods" as Entry["euPurchase"] })],
    })
    expect(await setEntriesVat(ctx, [byId("e")], 0)).toBe(false)
  })

  it("marks the selection paid on one day, the split's parts together", async () => {
    expect(await setEntriesPaid(ctx, [byId("b")], "2026-03-20")).toBe(true)
    expect([byId("b").paidOn, byId("c").paidOn]).toEqual([
      "2026-03-20",
      "2026-03-20",
    ])
    useBookStore.setState({ form5Filed: { "2026": "2027-03-01" } })
    expect(await setEntriesPaid(ctx, [byId("a")], "2026-03-25")).toBe(false)
  })
})
