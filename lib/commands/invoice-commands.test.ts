// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import type { Ctx } from "@/lib/commands/ctx"
import { issueInvoice } from "@/lib/commands/invoice-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import {
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Invoice,
} from "@/lib/domain/invoice"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/* Issuing a draft invoice books its entries and stores its PDF (§8.27). */

vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

const stored = new Map<string, Blob>()
let failing = false
vi.mock("@/lib/browser/receipt-store", () => ({
  isReceiptStorageSupported: () => true,
  putReceipt: async (id: string, blob: Blob) => {
    if (failing) throw new Error("quota")
    stored.set(id, blob)
  },
}))

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const draft = (over: Partial<Invoice> = {}): Invoice => ({
  id: "i1",
  number: null,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: {
    ...emptyParty(),
    name: "Asiakas Oy",
    street: "Tie 1",
    postcode: "02100",
    city: "Espoo",
  },
  language: "fi",
  rows: [
    {
      description: "Työ",
      quantityMilli: 2000,
      unit: "h",
      unitCents: 5000,
      vatRate: 25.5,
      catId: "300-domestic",
    },
    {
      description: "Kulut",
      quantityMilli: 1000,
      unit: "kpl",
      unitCents: 1000,
      vatRate: 14,
      catId: "300-domestic",
    },
  ],
  note: "",
  reference: null,
  seller: null,
  issuedAt: null,
  entryIds: [],
  credits: null,
  ...over,
})

function messages(): string[] {
  return vi
    .mocked(toast.add)
    .mock.calls.map(([options]) => String(options.title))
}

beforeEach(() => {
  stored.clear()
  failing = false
  vi.spyOn(toast, "add").mockImplementation(() => "t1")
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
    businessName: "Oma Yritys",
    businessId: "0112038-9",
    businessPhone: null,
    invoiceSettings: {
      ...DEFAULT_INVOICE_SETTINGS,
      street: "Katu 2",
      postcode: "00100",
      city: "Helsinki",
      iban: "FI2112345600000785",
    },
    invoices: [draft()],
    customers: [],
  })
})

describe("issueInvoice", () => {
  it("issues the invoice and books an open entry per rate, each holding the PDF", async () => {
    expect(await issueInvoice(ctx, "i1")).toBe(true)
    const { invoices, entries, draftAttachmentIds } = useBookStore.getState()
    const [invoice] = invoices
    expect(invoice).toMatchObject({ number: 1001, reference: "10016" })
    expect(invoice.entryIds).toHaveLength(2)
    expect(entries.map((e) => e.id).sort()).toEqual(
      [...invoice.entryIds].sort()
    )
    expect(entries.every((e) => e.paidOn === null && e.type === "income")).toBe(
      true
    )
    expect(entries[0].atts).toHaveLength(1)
    expect(entries[0].atts?.[0].id).toBe(entries[1].atts?.[0].id)
    expect(entries[0].atts?.[0].name).toBe("Lasku 1001 - Asiakas Oy.pdf")
    expect(stored.get(entries[0].atts![0].id!)?.type).toBe("application/pdf")
    expect(draftAttachmentIds).toEqual([])
    expect(entries.map((e) => e.voucher).sort()).toEqual([1, 2])
  })

  it("numbers the next invoice after the first", async () => {
    await issueInvoice(ctx, "i1")
    useBookStore
      .getState()
      .setInvoices([...useBookStore.getState().invoices, draft({ id: "i2" })])
    await issueInvoice(ctx, "i2")
    expect(useBookStore.getState().invoices.map((i) => i.number)).toEqual([
      1001, 1002,
    ])
  })

  it("refuses an invoice with a problem and books nothing", async () => {
    useBookStore.getState().setInvoiceSettings(DEFAULT_INVOICE_SETTINGS)
    expect(await issueInvoice(ctx, "i1")).toBe(false)
    expect(useBookStore.getState().entries).toEqual([])
    expect(useBookStore.getState().invoices[0].number).toBeNull()
    expect(messages()).toEqual(["Lisää yrityksen osoite laskutusasetuksiin."])
  })

  it("does not issue an invoice twice", async () => {
    await issueInvoice(ctx, "i1")
    expect(await issueInvoice(ctx, "i1")).toBe(false)
    expect(useBookStore.getState().entries).toHaveLength(2)
  })

  it("refuses a date in a year that is locked", async () => {
    useBookStore.setState({ yearsArchived: { "2026": "2027-01-10" } })
    expect(await issueInvoice(ctx, "i1")).toBe(false)
    expect(useBookStore.getState().entries).toEqual([])
    expect(stored.size).toBe(0)
  })

  it("books the entries without a voucher when the PDF cannot be stored", async () => {
    failing = true
    expect(await issueInvoice(ctx, "i1")).toBe(true)
    const { entries, invoices } = useBookStore.getState()
    expect(invoices[0].number).toBe(1001)
    expect(entries.every((e) => e.atts === undefined)).toBe(true)
    expect(messages()).toContain(
      "Laskun PDF:ää ei voitu tallentaa, joten tositteet kirjattiin ilman liitettä."
    )
  })

  it("puts the draft back when the toast's undo is used", async () => {
    await issueInvoice(ctx, "i1")
    const options = vi.mocked(toast.add).mock.calls.at(-1)![0]
    options.actionProps!.onClick!({} as never)
    const state = useBookStore.getState()
    expect(state.entries).toEqual([])
    expect(state.invoices[0]).toEqual(draft())
  })
})
