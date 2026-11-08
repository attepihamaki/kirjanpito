// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import { saveBlob } from "@/lib/browser/download"
import { openMailto, shareFile } from "@/lib/browser/share"
import type { Ctx } from "@/lib/commands/ctx"
import {
  issueInvoice,
  markInvoicePaid,
  sendInvoice,
  startCreditNote,
} from "@/lib/commands/invoice-commands"
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

vi.mock("@/lib/browser/share", () => ({
  shareFile: vi.fn(async () => "unsupported"),
  openMailto: vi.fn(),
}))
vi.mock("@/lib/browser/download", () => ({ saveBlob: vi.fn() }))

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
  terms: "",
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

describe("credit notes", () => {
  /* Issue the draft, then start a credit note for it and return its id. */
  async function issuedAndCredited(): Promise<string> {
    await issueInvoice(ctx, "i1")
    const id = startCreditNote(ctx, "i1")
    if (!id) throw new Error("no credit note started")
    return id
  }

  const credit = () =>
    useBookStore.getState().invoices.find((i) => i.credits === "i1")!

  it("starts a draft with the rows turned negative and the customer copied", async () => {
    const id = await issuedAndCredited()
    const note = credit()
    expect(note.id).toBe(id)
    expect(note).toMatchObject({
      number: null,
      credits: "i1",
      language: "fi",
      customer: { name: "Asiakas Oy" },
    })
    expect(note.rows.map((r) => r.quantityMilli)).toEqual([-2000, -1000])
  })

  it("will not start one for a draft, for a credit note or for what is fully credited", async () => {
    expect(startCreditNote(ctx, "i1")).toBeNull()
    const id = await issuedAndCredited()
    expect(startCreditNote(ctx, id)).toBeNull()
    expect(await issueInvoice(ctx, id)).toBe(true)
    vi.mocked(toast.add).mockClear()
    expect(startCreditNote(ctx, "i1")).toBeNull()
    expect(messages()).toEqual(["Laskusta ei ole enää hyvitettävää."])
  })

  it("cancels an unpaid invoice: the credit entries and the invoice entries are all paid", async () => {
    const id = await issuedAndCredited()
    expect(await issueInvoice(ctx, id)).toBe(true)
    const { entries, invoices } = useBookStore.getState()
    const note = invoices.find((i) => i.id === id)!
    expect(note.number).toBe(1002)
    expect(entries).toHaveLength(4)
    /* The invoice is paid on the credit's date and the credit on its own. */
    expect(entries.map((e) => e.paidOn)).toEqual([
      note.date,
      note.date,
      undefined,
      undefined,
    ])
    const credits = entries.filter((e) => note.entryIds.includes(e.id))
    expect(credits.every((e) => e.amount < 0)).toBe(true)
    expect(credits.map((e) => e.reverses).sort()).toEqual(
      invoices[0].entryIds.slice().sort()
    )
    expect(credits[0].atts?.[0].name).toBe("Hyvityslasku 1002 - Asiakas Oy.pdf")
  })

  it("leaves the credit open when the invoice was already paid", async () => {
    await issueInvoice(ctx, "i1")
    await markInvoicePaid(ctx, "i1", "2026-11-05")
    const id = startCreditNote(ctx, "i1")!
    expect(await issueInvoice(ctx, id)).toBe(true)
    const { entries, invoices } = useBookStore.getState()
    const note = invoices.find((i) => i.id === id)!
    expect(
      entries.filter((e) => !note.entryIds.includes(e.id)).map((e) => e.paidOn)
    ).toEqual(["2026-11-05", "2026-11-05"])
    expect(
      entries.filter((e) => note.entryIds.includes(e.id)).map((e) => e.paidOn)
    ).toEqual([null, null])
  })

  it("credits part of an invoice and leaves both sides open", async () => {
    const id = await issuedAndCredited()
    const { invoices, setInvoices } = useBookStore.getState()
    setInvoices(
      invoices.map((i) => (i.id === id ? { ...i, rows: i.rows.slice(1) } : i))
    )
    expect(await issueInvoice(ctx, id)).toBe(true)
    const { entries } = useBookStore.getState()
    expect(entries.map((e) => e.paidOn)).toEqual([null, null, null])
    expect(entries.at(-1)!.amount).toBe(-1000)
  })

  it("refuses a credit larger than what is left", async () => {
    const id = await issuedAndCredited()
    const { invoices, setInvoices } = useBookStore.getState()
    setInvoices(
      invoices.map((i) =>
        i.id === id
          ? { ...i, rows: i.rows.map((r) => ({ ...r, quantityMilli: -5000 })) }
          : i
      )
    )
    vi.mocked(toast.add).mockClear()
    expect(await issueInvoice(ctx, id)).toBe(false)
    expect(useBookStore.getState().entries).toHaveLength(2)
    expect(messages()).toEqual([
      "Hyvitys on suurempi kuin laskusta on vielä hyvitettävissä.",
    ])
  })

  it("puts everything back when the toast's undo is used", async () => {
    const id = await issuedAndCredited()
    await issueInvoice(ctx, id)
    const options = vi.mocked(toast.add).mock.calls.at(-1)![0]
    options.actionProps!.onClick!({} as never)
    const state = useBookStore.getState()
    expect(state.entries).toHaveLength(2)
    expect(state.entries.map((e) => e.paidOn)).toEqual([null, null])
    expect(state.invoices.find((i) => i.id === id)?.number).toBeNull()
  })
})

describe("sendInvoice", () => {
  async function issued() {
    await issueInvoice(ctx, "i1")
    return useBookStore.getState().invoices[0]
  }

  beforeEach(() => {
    vi.mocked(shareFile).mockReset().mockResolvedValue("unsupported")
    vi.mocked(openMailto).mockReset()
    vi.mocked(saveBlob).mockReset()
  })

  it("hands the PDF and the text to the share sheet, and does nothing more", async () => {
    vi.mocked(shareFile).mockResolvedValue("shared")
    await sendInvoice(ctx, await issued())
    expect(shareFile).toHaveBeenCalledOnce()
    const [file, message] = vi.mocked(shareFile).mock.calls[0]
    expect(file.name).toBe("Lasku 1001 - Asiakas Oy.pdf")
    expect(file.type).toBe("application/pdf")
    expect(message.title).toBe("Lasku 1001 – Oma Yritys")
    expect(message.text).toContain("Viitenumero: 10016")
    expect(saveBlob).not.toHaveBeenCalled()
    expect(openMailto).not.toHaveBeenCalled()
  })

  it("does nothing more when the user cancels the share sheet", async () => {
    vi.mocked(shareFile).mockResolvedValue("cancelled")
    await sendInvoice(ctx, await issued())
    expect(saveBlob).not.toHaveBeenCalled()
    expect(openMailto).not.toHaveBeenCalled()
  })

  it("downloads the PDF and opens a mail where there is no share sheet", async () => {
    const invoice = await issued()
    vi.mocked(toast.add).mockClear()
    await sendInvoice(ctx, {
      ...invoice,
      customer: { ...invoice.customer, email: "osto@asiakas.fi" },
    })
    expect(saveBlob).toHaveBeenCalledOnce()
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toBe(
      "Lasku 1001 - Asiakas Oy.pdf"
    )
    const url = vi.mocked(openMailto).mock.calls[0][0]
    expect(url.startsWith("mailto:osto@asiakas.fi?subject=Lasku%201001")).toBe(
      true
    )
    expect(messages()).toEqual([
      "PDF ladattiin. Liitä se avautuneeseen sähköpostiin.",
    ])
  })

  it("sends nothing for a draft", async () => {
    await sendInvoice(ctx, useBookStore.getState().invoices[0])
    expect(shareFile).not.toHaveBeenCalled()
    expect(openMailto).not.toHaveBeenCalled()
  })
})
