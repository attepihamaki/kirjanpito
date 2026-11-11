import { describe, expect, it } from "vitest"

import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import { parseInvoices, serializeInvoices } from "@/lib/domain/invoice-file"
import {
  invoiceFileIds,
  invoiceFileKey,
  invoiceFilePaths,
  invoicesForFile,
  relinkInvoices,
} from "@/lib/domain/invoice-links"
import type { Entry } from "@/lib/domain/types"

function entry(id: string, voucher: number, date = "2026-11-01"): Entry {
  return {
    id,
    voucher,
    date,
    description: "x",
    type: "income",
    catId: "300-domestic",
    amount: 100,
    vatRate: 25.5,
    amountMode: "net",
  }
}

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    number: null,
    date: "2026-11-01",
    dueDate: "2026-11-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: { ...emptyParty(), name: "Asiakas" },
    language: "fi",
    rows: [
      {
        description: "Kulu",
        quantityMilli: 1000,
        unit: "",
        unitCents: 100,
        vatRate: 25.5,
        catId: "300-domestic",
        rebills: "old-cost",
      },
    ],
    note: "",
    terms: "",
    reference: null,
    seller: null,
    issuedAt: null,
    entryIds: ["old-sale"],
    credits: null,
    reminders: [
      {
        id: "r",
        date: "2026-12-01",
        open: 100,
        rate: 11.5,
        interest: 1,
        fee: 500,
        newDueDate: "2026-12-08",
        entryIds: ["old-fee"],
      },
    ],
    ...over,
  }
}

describe("entry links in invoices.json (§7.6)", () => {
  it("names entries by voucher and finds them again under their new ids", () => {
    const before = [
      entry("old-sale", 7),
      entry("old-cost", 3, "2025-12-30"),
      entry("old-fee", 9),
    ]
    const issued = invoice({
      number: 1001,
      reference: "10016",
      issuedAt: "2026-11-01T10:00:00Z",
      seller: {
        ...emptyParty(),
        name: "Oma",
        businessId: "0112038-9",
        phone: "",
        iban: "",
        vatRegistered: true,
      },
    })
    const text = serializeInvoices(invoicesForFile([issued], before))
    expect(text).toContain('"#7/2026"')
    expect(text).toContain('"#3/2025"')
    expect(text).not.toContain("old-sale")

    const after = [
      entry("new-sale", 7),
      entry("new-cost", 3, "2025-12-30"),
      entry("new-fee", 9),
    ]
    const [back] = relinkInvoices(parseInvoices(text).invoices, after)
    expect(back.entryIds).toEqual(["new-sale"])
    expect(back.rows[0].rebills).toBe("new-cost")
    expect(back.reminders?.[0].entryIds).toEqual(["new-fee"])
  })

  it("drops a link to an entry the file does not hold", () => {
    const [written] = invoicesForFile([invoice()], [entry("old-sale", 7)])
    expect(written.rows[0].rebills).toBeUndefined()
    expect(written.reminders?.[0].entryIds).toBeUndefined()
    const [back] = relinkInvoices([written], [])
    expect(back.entryIds).toEqual([])
  })

  it("keeps an id that is no voucher key, from a file written before keys", () => {
    const [back] = relinkInvoices([invoice()], [entry("old-sale", 7)])
    expect(back.entryIds).toEqual(["old-sale"])
  })
})

describe("attached files in invoices.json and the ZIP (§8.27)", () => {
  const files = [
    {
      id: "a-1",
      name: "Tuntilista.pdf",
      type: "application/pdf" as const,
      size: 10,
    },
    {
      id: "a-2",
      name: "Tuntilista.pdf",
      type: "application/pdf" as const,
      size: 20,
    },
  ]

  it("gives each file a path of its own, by invoice number", () => {
    const paths = invoiceFilePaths(
      [
        invoice({ files }),
        invoice({ id: "i2", number: 1004, files: [files[0]] }),
      ],
      "fi"
    )
    expect(paths.get(invoiceFileKey("i1", 0))).toBe(
      "laskujen-liitteet/luonnos-Tuntilista.pdf"
    )
    expect(paths.get(invoiceFileKey("i1", 1))).toBe(
      "laskujen-liitteet/luonnos-Tuntilista-2.pdf"
    )
    expect(paths.get(invoiceFileKey("i2", 0))).toBe(
      "laskujen-liitteet/1004-Tuntilista.pdf"
    )
  })

  it("writes paths, not stored ids, and reads them back for the opener", () => {
    const list = [invoice({ files })]
    const text = serializeInvoices(list, invoiceFilePaths(list, "en"))
    expect(text).not.toContain("a-1")
    const parsed = parseInvoices(text)
    expect(parsed.invoices[0].files).toEqual([
      { id: "", name: "Tuntilista.pdf", type: "application/pdf", size: 10 },
      { id: "", name: "Tuntilista.pdf", type: "application/pdf", size: 20 },
    ])
    expect(parsed.filePaths.get(invoiceFileKey("i1", 1))).toBe(
      "invoice-attachments/draft-Tuntilista-2.pdf"
    )
  })

  it("keeps the kind and the links, and drops a file of a type it does not carry", () => {
    const text = JSON.stringify({
      invoices: [
        {
          ...invoice({ kind: "advance" }),
          files: [{ name: "x.gif", type: "image/gif", size: 1, path: "x.gif" }],
        },
      ],
    })
    const [back] = parseInvoices(text).invoices
    expect(back.kind).toBe("advance")
    expect(back.rows[0].rebills).toBe("old-cost")
    expect(back.files).toBeUndefined()
  })

  it("lists the stored ids for the receipt sweep", () => {
    expect(invoiceFileIds([invoice({ files }), invoice()])).toEqual([
      "a-1",
      "a-2",
    ])
  })
})
