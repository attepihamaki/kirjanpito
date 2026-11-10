// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Ctx } from "@/lib/commands/ctx"
import { openFile } from "@/lib/commands/io-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import { serializeInvoices } from "@/lib/domain/invoice-file"
import { packZip } from "@/lib/domain/zip"
import { createAppT } from "@/lib/i18n/messages"
import { registerConfirmHandler, type ConfirmOptions } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"

/* Opening a book with invoices that cannot all be read (§7.6). */

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const CSV = [
  "date;description;type;account;category;amount;vat;mode;receipts",
  "2026-01-08;Lasku 1001;tulo;300;Myynti – Suomi;2510,00;25,5;brutto;",
].join("\r\n")

const invoice: Invoice = {
  id: "i1",
  number: 1001,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: { ...emptyParty(), name: "Asiakas Oy" },
  language: "fi",
  rows: [],
  note: "",
  terms: "",
  reference: "10016",
  seller: {
    ...emptyParty(),
    businessId: "",
    phone: "",
    iban: "",
    vatRegistered: true,
  },
  issuedAt: "2026-11-01T09:00:00.000Z",
  entryIds: [],
  credits: null,
}

async function zipFile(invoicesText: string): Promise<File> {
  const bytes = await packZip({
    csvName: "kirjanpito.csv",
    csvText: CSV,
    paths: new Map(),
    attachmentIds: new Map(),
    read: async () => null,
    settingsText: "{}",
    invoicesText,
  })
  return new File([bytes as BlobPart], "kirjanpito.zip", {
    type: "application/zip",
  })
}

const alerts: ConfirmOptions[] = []

beforeEach(() => {
  alerts.length = 0
  registerConfirmHandler(async (options) => {
    alerts.push(options)
    return true
  })
  useBookStore.setState({
    open: false,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    invoices: [],
    customers: [],
    dirty: false,
    importing: false,
  })
})

describe("opening a book with invoices", () => {
  it("reads the invoices and says nothing when all of them are readable", async () => {
    await openFile(ctx, await zipFile(serializeInvoices([invoice])))
    expect(useBookStore.getState().invoices).toEqual([invoice])
    expect(alerts).toEqual([])
  })

  it("tells the user how many it could not read, and keeps the rest", async () => {
    const text = JSON.stringify({
      version: 1,
      invoices: [
        invoice,
        { ...invoice, id: "bad", date: "not a date" },
        "junk",
      ],
    })
    await openFile(ctx, await zipFile(text))
    expect(useBookStore.getState().invoices.map((i) => i.id)).toEqual(["i1"])
    expect(alerts).toHaveLength(1)
    expect(alerts[0].title).toBe("Tietueita jäi lukematta")
    expect(alerts[0].message).toContain("2 laskua, asiakasta tai varastoriviä")
  })
})
