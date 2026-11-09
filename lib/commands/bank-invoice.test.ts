// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import { bookBankRows } from "@/lib/commands/bank-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import { parseBankCsv } from "@/lib/domain/bank-csv"
import { proposeForRows, withInvoiceEntries } from "@/lib/domain/bank-match"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import { invoiceStatus } from "@/lib/domain/invoice-status"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/* A bank row that pays an invoice closes all its entries at once (§8.27). */

vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const sale = (id: string, amount: number, vatRate: number): Entry => ({
  id,
  date: "2026-11-01",
  description: "Lasku 1001 – Asiakas Oy",
  type: "income",
  catId: "300-domestic",
  amount,
  vatRate,
  amountMode: "net",
  paidOn: null,
})

const invoice: Invoice = {
  id: "i1",
  number: 1001,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: emptyParty(),
  language: "fi",
  rows: [],
  note: "",
  terms: "",
  reference: "10016",
  seller: null,
  issuedAt: "2026-11-01T09:00:00.000Z",
  entryIds: ["a", "b"],
  credits: null,
}

/* 100,00 at 25,5 % and 50,00 at 14 %: 125,50 and 57,00, 182,50 together. */
const STATEMENT = [
  "Kirjauspäivä;Määrä EUROA;Saaja/Maksaja;Viesti;Viite;Arkistointitunnus",
  "2026-11-10;182,50;Asiakas Oy;Lasku;10016;20261110ABC",
].join("\n")

beforeEach(() => {
  vi.spyOn(toast, "add").mockImplementation(() => "t1")
  useBookStore.setState({
    open: true,
    hydrated: true,
    cats: defaultCategories(),
    entries: [sale("a", 10_000, 25.5), sale("b", 5000, 14)],
    invoices: [invoice],
    yearsArchived: {},
    form5Filed: {},
    vatFiled: {},
  })
})

describe("paying an invoice from a bank statement", () => {
  it("reads the statement row as a match by reference and books every entry", async () => {
    const parsed = parseBankCsv(STATEMENT)
    if (!parsed.ok) throw new Error("statement not read")
    const state = useBookStore.getState()
    const [proposal] = proposeForRows(parsed.rows, {
      entries: state.entries,
      invoices: state.invoices,
      cats: indexCategories(state.cats),
    })
    expect(proposal).toMatchObject({ kind: "match", confidence: "reference" })
    if (proposal.kind !== "match") return

    const paid = withInvoiceEntries(
      [{ entryId: proposal.entryId, on: parsed.rows[0].date }],
      state.invoices,
      state.entries
    )
    expect(await bookBankRows(ctx, { paid, added: [] })).toBe(true)

    const after = useBookStore.getState()
    const byId = new Map(after.entries.map((e) => [e.id, e]))
    expect(after.entries.map((e) => e.paidOn)).toEqual([
      "2026-11-10",
      "2026-11-10",
    ])
    expect(invoiceStatus(invoice, byId, "2026-11-11")).toBe("paid")
  })

  it("is read as booked when the same statement comes in again", async () => {
    const parsed = parseBankCsv(STATEMENT)
    if (!parsed.ok) throw new Error("statement not read")
    const state = useBookStore.getState()
    const paid = withInvoiceEntries(
      [{ entryId: "a", on: "2026-11-10" }],
      state.invoices,
      state.entries
    )
    await bookBankRows(ctx, { paid, added: [] })

    const after = useBookStore.getState()
    const [again] = proposeForRows(parsed.rows, {
      entries: after.entries,
      invoices: after.invoices,
      cats: indexCategories(after.cats),
    })
    expect(again.kind).toBe("booked")
  })

  it("undoes both payments together", async () => {
    const paid = withInvoiceEntries(
      [{ entryId: "a", on: "2026-11-10" }],
      useBookStore.getState().invoices,
      useBookStore.getState().entries
    )
    await bookBankRows(ctx, { paid, added: [] })
    const options = vi.mocked(toast.add).mock.calls.at(-1)![0]
    options.actionProps!.onClick!({} as never)
    expect(useBookStore.getState().entries.map((e) => e.paidOn)).toEqual([
      null,
      null,
    ])
  })
})

describe("paying an invoice in part from a bank statement", () => {
  const PART = STATEMENT.replace("182,50", "100,00")

  it("is proposed as a part payment by reference", () => {
    const parsed = parseBankCsv(PART)
    if (!parsed.ok) throw new Error("statement not read")
    const state = useBookStore.getState()
    const [proposal] = proposeForRows(parsed.rows, {
      entries: state.entries,
      invoices: state.invoices,
      cats: indexCategories(state.cats),
    })
    expect(proposal).toMatchObject({
      kind: "match",
      confidence: "reference",
      partial: { invoiceId: "i1" },
    })
  })

  it("books only what arrived, leaves the rest open and undoes whole", async () => {
    expect(
      await bookBankRows(ctx, {
        paid: [],
        added: [],
        partial: [{ invoiceId: "i1", amount: 10_000, on: "2026-11-10" }],
      })
    ).toBe(true)

    const after = useBookStore.getState()
    const byId = new Map(after.entries.map((e) => [e.id, e]))
    const open = after.entries.filter((e) => e.paidOn === null)
    const paid = after.entries.filter((e) => e.paidOn !== null)
    expect(paid.reduce((s, e) => s + e.amount, 0)).toBeGreaterThan(0)
    expect(after.invoices[0].entryIds).toHaveLength(after.entries.length)
    expect(open.length).toBeGreaterThan(0)
    expect(invoiceStatus(after.invoices[0], byId, "2026-11-20")).toBe("overdue")

    const undo = vi.mocked(toast.add).mock.calls.at(-1)![0].actionProps!
    undo.onClick!({} as never)
    const undone = useBookStore.getState()
    expect(undone.entries.map((e) => e.id)).toEqual(["a", "b"])
    expect(undone.invoices[0].entryIds).toEqual(["a", "b"])
    expect(undone.entries.every((e) => e.paidOn === null)).toBe(true)
  })
})
