import { describe, expect, it } from "vitest"

import { emptyParty, type Invoice, type Seller } from "@/lib/domain/invoice"
import { invoiceMail, mailtoUrl } from "@/lib/domain/invoice-mail"

const seller: Seller = {
  ...emptyParty(),
  name: "Oma Yritys",
  businessId: "0112038-9",
  phone: "",
  iban: "FI2112345600000785",
  vatRegistered: true,
}

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "i1",
  number: 1001,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: { ...emptyParty(), name: "Asiakas Oy", email: " osto@asiakas.fi " },
  language: "fi",
  rows: [
    {
      description: "Työ",
      quantityMilli: 1000,
      unit: "h",
      unitCents: 10_000,
      vatRate: 25.5,
      catId: "300-domestic",
    },
  ],
  note: "",
  terms: "",
  reference: "10016",
  seller,
  issuedAt: "2026-11-01T09:00:00.000Z",
  entryIds: [],
  credits: null,
  ...over,
})

/* The amount has no-break spaces, which a mail program shows as plain ones. */
const flat = (text: string) => text.replace(/[  ]/g, " ")

describe("invoiceMail", () => {
  it("writes a Finnish invoice mail with the payment details", () => {
    const mail = invoiceMail(invoice())
    expect(mail.to).toBe("osto@asiakas.fi")
    expect(mail.subject).toBe("Lasku 1001 – Oma Yritys")
    expect(flat(mail.body)).toBe(
      [
        "Hei,",
        "",
        "Oheisena lasku 1001, yhteensä 125,50 €. Eräpäivä on 15.11.2026.",
        "",
        "Tilinumero: FI21 1234 5600 0007 85",
        "Viitenumero: 10016",
        "",
        "Ystävällisin terveisin,",
        "Oma Yritys",
      ].join("\n")
    )
  })

  it("writes an English invoice mail", () => {
    const mail = invoiceMail(invoice({ language: "en" }))
    expect(mail.subject).toBe("Invoice 1001 – Oma Yritys")
    expect(flat(mail.body)).toContain(
      "Attached is invoice 1001, 125,50 € in total. It is due on 15 Nov 2026."
    )
    expect(mail.body).toContain("Reference number: 10016")
    expect(mail.body).toContain("Kind regards,")
  })

  it("writes a credit note mail with no payment details", () => {
    const note = invoice({
      number: 1002,
      credits: "i1",
      rows: [{ ...invoice().rows[0], quantityMilli: -1000 }],
    })
    const mail = invoiceMail(note, 1001)
    expect(mail.subject).toBe("Hyvityslasku 1002 – Oma Yritys")
    expect(flat(mail.body)).toContain(
      "Oheisena hyvityslasku 1002 laskusta 1001, yhteensä −125,50 €."
    )
    expect(mail.body).not.toContain("Tilinumero")
    expect(mail.body).not.toContain("Eräpäivä")
  })

  it("leaves out the credited number when it is not known", () => {
    const note = invoice({ credits: "i1", language: "en" })
    expect(invoiceMail(note).body).toContain("Attached is credit note 1001,")
  })

  it("has no address when the customer has none", () => {
    expect(
      invoiceMail(invoice({ customer: { ...emptyParty(), name: "X" } })).to
    ).toBe("")
  })

  it("refuses a draft", () => {
    expect(() =>
      invoiceMail(invoice({ number: null, seller: null, reference: null }))
    ).toThrow()
  })
})

describe("mailtoUrl", () => {
  it("encodes the subject and body and breaks lines as CRLF", () => {
    const url = mailtoUrl({
      to: "osto@asiakas.fi",
      subject: "Lasku 1001 – Oma Yritys",
      body: "Hei,\n\nÄiti & isä?",
    })
    expect(url).toBe(
      "mailto:osto@asiakas.fi?subject=Lasku%201001%20%E2%80%93%20Oma%20Yritys&body=Hei%2C%0D%0A%0D%0A%C3%84iti%20%26%20is%C3%A4%3F"
    )
  })

  it("is a valid link with no address", () => {
    expect(mailtoUrl({ to: "", subject: "A", body: "B" })).toBe(
      "mailto:?subject=A&body=B"
    )
  })
})
