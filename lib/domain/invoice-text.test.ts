import { describe, expect, it } from "vitest"

import {
  describeInvoice,
  isEmptyGuess,
  layoutTextRuns,
  parseInvoiceText,
  parseVirtualBarcode,
  previousEntryFrom,
  suggestCategory,
} from "@/lib/domain/invoice-text"
import type { Entry } from "@/lib/domain/types"

/* A typical Finnish invoice as extractPdfText lays it out. */
const FINNISH = [
  "Mäkinen Rakennus Oy\tLASKU",
  "Rakentajankatu 1\tLaskun pvm\t28.10.2026",
  "00100 Helsinki\tLaskun numero\t1005",
  "Y-tunnus 1234567-8\tEräpäivä\t11.11.2026",
  "",
  "Asiakas Tmi Esimerkki",
  "Kuvaus\tMäärä\tà-hinta\tALV %\tYhteensä",
  "Laatoitustyö\t1\t1 500,00\t25,5 %\t1 500,00",
  "Veroton yhteensä\t1 500,00",
  "ALV 25,5 % yhteensä\t382,50",
  "Yhteensä (sis. ALV)\t1 882,50 €",
].join("\n")

describe("parseInvoiceText", () => {
  it("reads a Finnish invoice", () => {
    expect(parseInvoiceText(FINNISH)).toEqual({
      date: "2026-10-28",
      dueDate: "2026-11-11",
      amount: 188250,
      vatRate: 25.5,
      vendor: "Mäkinen Rakennus Oy",
      invoiceNumber: "1005",
      items: ["Laatoitustyö"],
    })
  })

  it("skips the net and VAT subtotals when picking the total", () => {
    const text = [
      "Veroton yhteensä 1 000,00",
      "ALV yhteensä 255,00",
      "Maksettava 1 255,00",
    ].join("\n")
    expect(parseInvoiceText(text).amount).toBe(125500)
  })

  it("takes the amount under a total heading", () => {
    expect(parseInvoiceText("Maksettava yhteensä\n124,50 €").amount).toBe(12450)
  })

  it("reads an English invoice", () => {
    const text = [
      "Nordic Build AB",
      "Invoice number: INV-2026-042",
      "Invoice date 2026-03-03\tDue date 2026-03-17",
      "VAT 0 %\t0.00",
      "Total\t3,200.00",
    ].join("\n")
    expect(parseInvoiceText(text)).toMatchObject({
      date: "2026-03-03",
      dueDate: "2026-03-17",
      amount: 320000,
      vatRate: 0,
      vendor: "Nordic Build AB",
      invoiceNumber: "INV-2026-042",
    })
  })

  it("prefers the virtual barcode's amount and due date", () => {
    const text = [
      "Yhteensä 999,99",
      "Virtuaaliviivakoodi",
      "4 7915800000000017 001882 50 000 00000000000000012345 261111",
    ].join("\n")
    expect(parseInvoiceText(text)).toMatchObject({
      amount: 188250,
      dueDate: "2026-11-11",
    })
  })

  it("does not read a date as an amount", () => {
    expect(parseInvoiceText("Päiväys 12.10.2026").amount).toBeNull()
  })

  it("falls back to the first date that is not a due date", () => {
    const text = "Eräpäivä 14.11.2026\nHelsinki 31.10.2026"
    expect(parseInvoiceText(text).date).toBe("2026-10-31")
  })

  it("finds nothing in an empty text layer", () => {
    expect(isEmptyGuess(parseInvoiceText(""))).toBe(true)
  })
})

describe("parseVirtualBarcode", () => {
  it("reads version 5 the same way", () => {
    const code =
      "5" +
      "7915800000000017" +
      "000124" +
      "50" +
      "0".repeat(21) +
      "12" +
      "000000"
    expect(parseVirtualBarcode(code)).toEqual({ amount: 12450, dueDate: null })
  })

  it("rejects anything but 54 digits starting with 4 or 5", () => {
    expect(parseVirtualBarcode("1".repeat(54))).toBeNull()
    expect(parseVirtualBarcode("4".repeat(53))).toBeNull()
  })
})

describe("previousEntryFrom", () => {
  const entry = (id: string, date: string, description: string): Entry => ({
    id,
    date,
    description,
    type: "expense",
    catId: "333",
    amount: 100,
    vatRate: 25.5,
    amountMode: "gross",
  })

  it("returns the latest entry naming the vendor", () => {
    const entries = [
      entry("a", "2026-01-15", "Osto – K-Rauta – tarvikkeet"),
      entry("b", "2026-10-10", "Osto – k-rauta – Tarvikkeet"),
      entry("c", "2026-11-01", "Polttoaine – Neste"),
    ]
    expect(previousEntryFrom(entries, "K-Rauta")?.id).toBe("b")
    expect(previousEntryFrom(entries, null)).toBeUndefined()
  })
})

describe("layoutTextRuns", () => {
  const run = (str: string, x: number, y: number) => ({
    str,
    x,
    y,
    width: str.length * 5,
    height: 10,
  })

  it("orders rows top down and separates wide gaps with a tab", () => {
    const text = layoutTextRuns([
      run("1 882,50", 300, 100),
      run("Yhteensä", 50, 101),
      run("Lasku", 50, 700),
      run("1005", 80, 700),
    ])
    expect(text).toBe("Lasku 1005\nYhteensä\t1 882,50")
  })
})

/*
 * A prepayment invoice whose seller appears only in the footer, laid out as
 * extractPdfText gives it. Names and numbers are made up.
 */
const FOOTER_SELLER = [
  "Ennakkolasku",
  "Laskunro:\tPäiväys:\tAsiakasnro:\tTilausnro:\tSivu:",
  "2026-10-27 111222333\t7000001\t1",
  "Toimitusosoite:\tLaskutusosoite:",
  "Tmi Esimerkki\tTmi Esimerkki",
  "Tuotenro\tKuvaus\tMäärä\tHinta\tSumma",
  "3099834\tPELA 512775 Kuljetusalusta ilman työkalusarjaa, 10 laatikkoa\t1\t890,00\t890,00",
  "Postnord kappaletavara\t1\t31,25\t31,25",
  "Summa\t921,25",
  "Maksa tilille SE00 ja käytä viitteenä tilausnumeroa. ALV 25,5%\t187,19",
  "Tavara on myyjän omaisuutta.\tMaksettava EUR\t921,25",
  "Osoite:\tYritysnro:\tPuhelin:\tKotisivu:",
  "Esimerkkikauppa.fi\t556000-0000\t09 000 0000\tinfo@esimerkkikauppa.fi",
  "Esimerkkikauppa Svenska AB ALV-numero\twww.esimerkkikauppa.fi",
].join("\n")

describe("seller, rows and category", () => {
  const guess = parseInvoiceText(FOOTER_SELLER)

  it("finds the seller beside its business ID, not the buyer", () => {
    expect(guess.vendor).toBe("Esimerkkikauppa Svenska AB")
  })

  it("reads the rows under the item heading", () => {
    expect(guess.items).toEqual([
      "PELA 512775 Kuljetusalusta ilman työkalusarjaa, 10 laatikkoa",
      "Postnord kappaletavara",
    ])
  })

  it("reads the date from under its heading", () => {
    expect(guess.date).toBe("2026-10-27")
    expect(guess.amount).toBe(92125)
  })

  it("describes the invoice by seller and first row, cut at a comma", () => {
    expect(describeInvoice(guess, (n) => `Lasku ${n}`)).toBe(
      "Esimerkkikauppa Svenska AB – PELA 512775 Kuljetusalusta ilman työkalusarjaa"
    )
  })

  it("puts goods with no other hint on line 333", () => {
    expect(suggestCategory(guess)).toBe("333")
  })

  it("names the invoice number first when there is one", () => {
    expect(
      describeInvoice(parseInvoiceText(FINNISH), (n) => `Lasku ${n}`)
    ).toBe("Lasku 1005 – Mäkinen Rakennus Oy – Laatoitustyö")
  })

  it("falls back to the web domain for the seller's name", () => {
    expect(parseInvoiceText("Kiitos tilauksesta\nwww.kauppa.fi").vendor).toBe(
      "Kauppa"
    )
  })

  it("picks a category from words in the seller's name and rows", () => {
    const base = { ...guess, items: [] as string[] }
    expect(suggestCategory({ ...base, vendor: "Neste Oyj" })).toBe(
      "344-vehicle"
    )
    expect(
      suggestCategory({ ...base, items: ["Puhelinliittymä 10/2026"] })
    ).toBe("344-other")
    expect(suggestCategory({ ...base, items: ["Lounas 2 hlö"] })).toBe(
      "344-meeting"
    )
    expect(suggestCategory({ ...base, vendor: null })).toBeNull()
  })
})
