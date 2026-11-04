// @vitest-environment jsdom
import { PDFDocument } from "pdf-lib"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import { renderMemoPdf } from "@/lib/browser/memo-pdf"
import type { Ctx } from "@/lib/commands/ctx"
import { bookWithMemo, storeMemo } from "@/lib/commands/memo-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import type { MemoVoucher } from "@/lib/domain/memo-voucher"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/* The memo voucher a calculated entry rests on (KPL 2:5, §8.8). */

vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

/** Receipt storage in memory; `failing` makes a write throw, as a full quota does. */
const stored = new Map<string, Blob>()
let failing = false
vi.mock("@/lib/browser/receipt-store", () => ({
  isReceiptStorageSupported: () => true,
  putReceipt: async (id: string, blob: Blob) => {
    if (failing) throw new Error("quota")
    stored.set(id, blob)
  },
}))
const getReceipt = async (id: string) => stored.get(id)

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const memo: MemoVoucher = {
  title: "Muistiotosite",
  heading: "Poisto 2026",
  business: "Oma Yritys · Y-tunnus 0112038-9",
  made: "Laadittu 4.11.2026",
  entryTitle: "Kirjaus",
  entry: [
    { label: "Päivämäärä", value: "4.11.2026" },
    { label: "Kuvaus", value: "Poisto 2026, koneet ja kalusto" },
  ],
  calcTitle: "Laskelma",
  calculation: [
    { label: "Poistopohja", value: "4\u00a0000,00 €" },
    { label: "Muutos", value: "\u2212250,00\u202f€", strong: true },
    { label: "Pitkä selite", value: "sana ".repeat(80) },
  ],
  notes: ["Peruste. ".repeat(40)],
}

const depreciation: Entry = {
  id: "e-1",
  date: "2026-11-04",
  description: "Poisto 2026, koneet ja kalusto",
  type: "expense",
  catId: "337",
  amount: 100_000,
  vatRate: 0,
  amountMode: "net",
}

beforeEach(() => {
  stored.clear()
  failing = false
  vi.spyOn(toast, "add").mockImplementation(() => "1")
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year: 2026,
    draftAttachmentIds: [],
    yearsArchived: {},
    form5Filed: {},
    vatFiled: {},
  })
})

describe("renderMemoPdf", () => {
  it("draws a one-page PDF, whatever the text holds", async () => {
    const bytes = await renderMemoPdf(memo)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-")
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe("Muistiotosite: Poisto 2026")
  })
})

describe("storeMemo", () => {
  it("stores the PDF and keeps its id registered until it is released", async () => {
    const att = await storeMemo(ctx, memo)
    expect(att).toMatchObject({
      name: "Muistiotosite - Poisto 2026.pdf",
      type: "application/pdf",
    })
    expect((await getReceipt(att!.id!))?.size).toBe(att!.size)
    expect(useBookStore.getState().draftAttachmentIds).toContain(att!.id)
  })
})

describe("bookWithMemo", () => {
  it("books the entry with its memo, so the receipt check passes", async () => {
    expect(
      await bookWithMemo(ctx, depreciation, memo, "Poisto kirjattu.")
    ).toBe(true)
    const [entry] = useBookStore.getState().entries
    expect(entry.atts).toHaveLength(1)
    expect(await getReceipt(entry.atts![0].id!)).toBeDefined()
    // The entry holds it now, so the draft list lets it go.
    expect(useBookStore.getState().draftAttachmentIds).toEqual([])
    const cats = indexCategories(useBookStore.getState().cats)
    expect(flaggedEntryIds("noReceipt", [entry], cats, "2026-11-04").size).toBe(
      0
    )
  })

  it("books without a memo when it cannot be stored, and the check flags it", async () => {
    failing = true
    const raised: string[] = []
    vi.mocked(toast.add).mockImplementation((o) => {
      raised.push(String(o.title))
      return "1"
    })
    expect(
      await bookWithMemo(ctx, depreciation, memo, "Poisto kirjattu.")
    ).toBe(true)
    const [entry] = useBookStore.getState().entries
    expect(entry.atts).toBeUndefined()
    expect(raised).toContain(ctx.t("memo.failed"))
    const cats = indexCategories(useBookStore.getState().cats)
    expect(
      flaggedEntryIds("noReceipt", [entry], cats, "2026-11-04").has(entry.id)
    ).toBe(true)
  })
})
