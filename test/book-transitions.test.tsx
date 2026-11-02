// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { offerUndo } from "@/lib/commands/book-commands"
import { recategorizeEntries } from "@/lib/commands/bulk-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Category, Entry } from "@/lib/domain/types"
import { createAppT } from "@/lib/i18n/messages"
import { toast } from "@/components/ui/toast"
import { useBookStore } from "@/stores/book-store"
import { filterAndSortEntries } from "@/stores/selectors"

/* What carries over between books, and what an undo may touch (§8.11). */

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const custom: Category = {
  id: "c-oma",
  line: "344-other",
  name: "Oma luokka",
  vatRate: 25.5,
  enabled: true,
  custom: true,
}

const entry = (over: Partial<Entry> = {}): Entry => ({
  id: "e1",
  voucher: 1,
  date: "2026-03-10",
  description: "Vuokra",
  type: "expense",
  catId: "343",
  amount: 45_000,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

/** The onClick of the undo button on the toast raised last. */
function lastUndo(spy: ReturnType<typeof vi.spyOn>): () => void {
  const options = spy.mock.calls.at(-1)?.[0] as {
    actionProps: { onClick: () => void }
  }
  return options.actionProps.onClick
}

describe("a new or closed book", () => {
  beforeEach(() => {
    useBookStore.setState({
      cats: [
        ...defaultCategories().map((c) =>
          c.id === "343" ? { ...c, vatRate: 10, enabled: false } : c
        ),
        custom,
      ],
    })
  })

  it.each(["newBook", "closeBook"] as const)(
    "%s starts from the default categories",
    (action) => {
      if (action === "newBook") useBookStore.getState().newBook(2026)
      else useBookStore.getState().closeBook()

      expect(useBookStore.getState().cats).toEqual(defaultCategories())
    }
  )
})

describe("undo", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: true,
      cats: [...defaultCategories(), custom],
      entries: [entry()],
      vatFiled: {},
      undoAttachmentIds: [],
    })
  })

  it("of a category change keeps an edit made since", async () => {
    const spy = vi.spyOn(toast, "add")
    await recategorizeEntries(ctx, [entry()], "344-other")
    useBookStore.getState().upsertEntry({
      ...useBookStore.getState().entries[0],
      amount: 99_900,
    })

    lastUndo(spy)()

    const [after] = useBookStore.getState().entries
    expect(after.catId).toBe("343")
    expect(after.amount).toBe(99_900)
  })

  it("of a category change leaves an entry moved again", async () => {
    const spy = vi.spyOn(toast, "add")
    await recategorizeEntries(ctx, [entry()], "344-other")
    useBookStore.getState().upsertEntry({
      ...useBookStore.getState().entries[0],
      catId: "333",
    })

    lastUndo(spy)()

    expect(useBookStore.getState().entries[0].catId).toBe("333")
  })

  it("of a delete brings back a custom category deleted since", () => {
    const spy = vi.spyOn(toast, "add")
    const removed = entry({ catId: custom.id })
    offerUndo(ctx, [removed], "poistettu", "palautettu")
    useBookStore.getState().removeCategory(custom.id)

    lastUndo(spy)()

    const state = useBookStore.getState()
    expect(state.entries.some((e) => e.id === removed.id)).toBe(true)
    expect(state.cats.some((c) => c.id === custom.id)).toBe(true)
  })
})

describe("the ledger's order", () => {
  const rows = [
    entry({ id: "b", voucher: 2, amount: 100 }),
    entry({ id: "a", voucher: 1, amount: 100 }),
    entry({ id: "c", voucher: 3, amount: 100 }),
  ]
  const order = (sort: { key: "gross"; dir: 1 | -1 } | null) =>
    filterAndSortEntries(
      rows,
      new Map(),
      { query: "", type: "all", catId: "all", flagged: null, sort },
      "fi",
      new Intl.Collator("fi")
    ).map((e) => e.id)

  it("follows the voucher number within a date", () => {
    expect(order(null)).toEqual(["a", "b", "c"])
  })

  it("stays in book order among equal keys, either way", () => {
    expect(order({ key: "gross", dir: 1 })).toEqual(["a", "b", "c"])
    expect(order({ key: "gross", dir: -1 })).toEqual(["a", "b", "c"])
  })
})
