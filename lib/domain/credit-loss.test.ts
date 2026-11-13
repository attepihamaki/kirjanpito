import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  canWriteOff,
  creditLossEntries,
  writtenOffIds,
} from "@/lib/domain/credit-loss"
import type { Invoice } from "@/lib/domain/invoice"
import { invoiceStatus } from "@/lib/domain/invoice-status"
import { netByLine } from "@/lib/domain/income-statement"
import { taxBasisEntries } from "@/lib/domain/open-items"
import { vatReport } from "@/lib/domain/vat"
import { indexCategories, type Entry } from "@/lib/domain/types"

/* Writing off an unpaid sale (§6.18). */

const cats = indexCategories(defaultCategories())

const sale: Entry = {
  id: "s1",
  date: "2026-03-10",
  description: "Lasku 1001 – Asiakas Oy",
  type: "income",
  catId: "300-domestic",
  amount: 100_000,
  vatRate: 25.5,
  amountMode: "net",
  paidOn: null,
  party: "p1",
}

const LOSS_DAY = "2026-11-05"

const writeOff = (open: Entry[]) =>
  creditLossEntries(
    open,
    LOSS_DAY,
    () => "loss",
    (e) => `Luottotappio: ${e.description}`
  )

const inYear = (entries: readonly Entry[], year: string) =>
  entries.filter((e) => e.date.startsWith(year))

const inMonth = (entries: readonly Entry[], month: string) =>
  entries.filter((e) => e.date.startsWith(month))

describe("canWriteOff", () => {
  it("takes an unpaid sale only", () => {
    expect(canWriteOff(sale, cats)).toBe(true)
    expect(canWriteOff({ ...sale, paidOn: undefined }, cats)).toBe(false)
    expect(canWriteOff({ ...sale, type: "expense", catId: "333" }, cats)).toBe(
      false
    )
    expect(canWriteOff({ ...sale, creditLoss: true, amount: -1 }, cats)).toBe(
      false
    )
  })
})

describe("creditLossEntries", () => {
  const { updated, added, gross } = writeOff([sale])
  const book = [...updated, ...added]

  it("closes the sale on the loss's day and reverses it in full", () => {
    expect(updated[0].paidOn).toBe(LOSS_DAY)
    expect(added[0]).toMatchObject({
      date: LOSS_DAY,
      amount: -100_000,
      vatRate: 25.5,
      amountMode: "net",
      reverses: "s1",
      creditLoss: true,
      party: "p1",
    })
    expect(gross).toBe(125_500)
  })

  it("takes the VAT off the return of the loss's month and leaves the sale's own alone", () => {
    expect(vatReport(inMonth(book, "2026-03"), cats).due).toBe(25_500)
    expect(vatReport(inMonth(book, "2026-11"), cats).due).toBe(-25_500)
  })

  it("nets to nothing for an ammatinharjoittaja, who never received the money", () => {
    const basis = taxBasisEntries(book, "professional")
    expect(netByLine(inYear(basis, "2026"), cats).get("300") ?? 0).toBe(0)
  })

  it("lowers a liikkeenharjoittaja's sales in the year of the loss", () => {
    const sold2025 = { ...sale, date: "2025-09-01" }
    const off = writeOff([sold2025])
    const basis = taxBasisEntries([...off.updated, ...off.added], "business")
    expect(netByLine(inYear(basis, "2025"), cats).get("300")).toBe(100_000)
    expect(netByLine(inYear(basis, "2026"), cats).get("300")).toBe(-100_000)
  })
})

describe("invoice status", () => {
  it("reads as a credit loss once written off", () => {
    const invoice = {
      number: 1001,
      credits: null,
      rows: [],
      discount: null,
      dueDate: "2026-03-24",
      entryIds: ["s1"],
    } as unknown as Invoice
    const { updated, added } = writeOff([sale])
    const byId = new Map([...updated, ...added].map((e) => [e.id, e]))
    expect(writtenOffIds(byId).has("s1")).toBe(true)
    expect(invoiceStatus(invoice, byId, LOSS_DAY)).toBe("creditLoss")
  })
})
