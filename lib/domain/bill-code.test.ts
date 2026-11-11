import { describe, expect, it } from "vitest"

import { billCodeFrom, parseEpcQr } from "@/lib/domain/bill-code"
import { virtualBarcode } from "@/lib/domain/invoice-barcode"

const IBAN = "FI2112345600000785"

const epc = (lines: string[]) => lines.join("\n")

describe("parseEpcQr", () => {
  it("reads the payee, account, amount and reference", () => {
    expect(
      parseEpcQr(
        epc([
          "BCD",
          "002",
          "1",
          "SCT",
          "NDEAFIHH",
          "Helen Oy",
          "FI21 1234 5600 0007 85",
          "EUR123.4",
          "",
          "RF18539007547034",
          "",
        ])
      )
    ).toEqual({
      iban: IBAN,
      amount: 12_340,
      reference: "RF18539007547034",
      dueDate: null,
      name: "Helen Oy",
      message: null,
    })
  })

  it("keeps the text when there is no reference, and allows lines left off", () => {
    const code = parseEpcQr(
      epc([
        "BCD",
        "001",
        "1",
        "SCT",
        "",
        "Kahvila",
        IBAN,
        "",
        "",
        "",
        "Lasku 7",
      ])
    )
    expect(code).toMatchObject({
      amount: null,
      reference: null,
      message: "Lasku 7",
    })
    expect(
      parseEpcQr(epc(["BCD", "002", "1", "SCT", "", "Kahvila", IBAN]))
    ).toMatchObject({ iban: IBAN, amount: null })
  })

  it("accepts CRLF and an instant transfer", () => {
    const code = parseEpcQr(
      ["BCD", "002", "1", "INST", "", "X", IBAN, "EUR5"].join("\r\n")
    )
    expect(code?.amount).toBe(500)
  })

  it("refuses anything else", () => {
    expect(parseEpcQr("https://example.com")).toBeNull()
    expect(
      parseEpcQr(epc(["BCD", "003", "1", "SCT", "", "X", IBAN]))
    ).toBeNull()
    expect(
      parseEpcQr(epc(["BCD", "002", "1", "SCT", "", "X", "FI2112345600000786"]))
    ).toBeNull()
  })
})

describe("billCodeFrom", () => {
  const barcode = virtualBarcode({
    iban: IBAN,
    cents: 45_000,
    reference: "44105",
    dueDate: "2026-11-30",
  })!

  it("reads the bank barcode with its due date", () => {
    expect(billCodeFrom([barcode])).toEqual({
      iban: IBAN,
      amount: 45_000,
      reference: "44105",
      dueDate: "2026-11-30",
      name: null,
      message: null,
    })
  })

  it("prefers the bank barcode over a QR code", () => {
    const qr = epc(["BCD", "002", "1", "SCT", "", "X", IBAN, "EUR1.00"])
    expect(billCodeFrom([qr, barcode])?.amount).toBe(45_000)
    expect(billCodeFrom(["junk", qr])?.amount).toBe(100)
  })

  it("is null when nothing is a bill code", () => {
    expect(billCodeFrom([])).toBeNull()
    expect(billCodeFrom(["12345", "hello"])).toBeNull()
  })
})
