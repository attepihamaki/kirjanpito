import { describe, expect, it } from "vitest"

import { code128C } from "@/lib/domain/code128"
import { BARCODE_MAX_CENTS, virtualBarcode } from "@/lib/domain/invoice-barcode"
import { epcPayload } from "@/lib/domain/invoice-epc"
import { rfReference } from "@/lib/domain/invoice-reference"

const IBAN = "FI21 1234 5600 0007 85"

describe("virtualBarcode", () => {
  it("lays out version 4 for a Finnish reference", () => {
    const code = virtualBarcode({
      iban: IBAN,
      cents: 48250,
      reference: "1234561",
      dueDate: "2026-12-15",
    })
    expect(code).toBe(
      "4" +
        "2112345600000785" +
        "00048250" +
        "000" +
        "00000000000001234561" +
        "261215"
    )
    expect(code).toHaveLength(54)
  })

  it("lays out version 5 with the zeros between the check digits and the reference", () => {
    const reference = rfReference("539007547034") as string
    const code = virtualBarcode({
      iban: IBAN,
      cents: 100,
      reference,
      dueDate: "2027-01-02",
    })
    expect(code).toBe(
      "5" +
        "2112345600000785" +
        "00000100" +
        "18" +
        "000000000539007547034" +
        "270102"
    )
    expect(code).toHaveLength(54)
  })

  it("writes six zeros when there is no due date", () => {
    const code = virtualBarcode({
      iban: IBAN,
      cents: 100,
      reference: "1234561",
      dueDate: null,
    })
    expect(code?.slice(-6)).toBe("000000")
  })

  it("accepts a reference written with spaces", () => {
    const spaced = virtualBarcode({
      iban: IBAN,
      cents: 100,
      reference: "12 34561",
      dueDate: null,
    })
    const plain = virtualBarcode({
      iban: IBAN,
      cents: 100,
      reference: "1234561",
      dueDate: null,
    })
    expect(spaced).toBe(plain)
  })

  it("holds the largest amount and refuses one cent more", () => {
    expect(
      virtualBarcode({
        iban: IBAN,
        cents: BARCODE_MAX_CENTS,
        reference: "1234561",
        dueDate: null,
      })
    ).not.toBeNull()
    expect(
      virtualBarcode({
        iban: IBAN,
        cents: BARCODE_MAX_CENTS + 1,
        reference: "1234561",
        dueDate: null,
      })
    ).toBeNull()
  })

  it.each([
    ["a non-Finnish IBAN", { iban: "DE89370400440532013000" }],
    ["a bad IBAN", { iban: "FI2112345600000786" }],
    ["a negative amount", { cents: -1 }],
    ["a fractional amount", { cents: 1.5 }],
    ["a reference with a wrong check digit", { reference: "1234562" }],
    ["a date out of shape", { dueDate: "15.12.2026" }],
  ])("refuses %s", (_name, override) => {
    const base = {
      iban: IBAN,
      cents: 100,
      reference: "1234561",
      dueDate: "2026-12-15",
    }
    expect(virtualBarcode({ ...base, ...override })).toBeNull()
  })
})

describe("code128C", () => {
  it("matches the bars an established encoder gives for the version 4 example", () => {
    const digits =
      "4" +
      "2112345600000785" +
      "00048250" +
      "000" +
      "00000000000001234561" +
      "261215"
    const bars = code128C(digits)
      ?.map((bar) => (bar ? "1" : "0"))
      .join("")
    expect(bars).toBe(
      "11010011100101101110001100010010011101101110101110110001110111101011011001100110110011001100001010011000101110110110011001110111011011100101100110110011001101100110011011001100110110011001101100110011011001100110110011001101100110011001101100111011011101011101100011001000010111001001101011001110010111001100110010010001100011101011"
    )
  })

  it("is 11 modules per symbol and 13 for the stop", () => {
    const bars = code128C("0000") as boolean[]
    expect(bars).toHaveLength(11 * 4 + 13)
  })

  it("starts with the start-C pattern and ends with the stop", () => {
    const bars = (code128C("1234") as boolean[])
      .map((bar) => (bar ? "1" : "0"))
      .join("")
    expect(bars.startsWith("11010011100")).toBe(true)
    expect(bars.endsWith("1100011101011")).toBe(true)
  })

  it.each(["", "123", "12a4"])("refuses %s", (digits) => {
    expect(code128C(digits)).toBeNull()
  })
})

describe("epcPayload", () => {
  it("writes the lines of a transfer with an RF reference", () => {
    const rf = rfReference("1001") as string
    expect(
      epcPayload({
        name: "Oma Yritys",
        iban: IBAN,
        cents: 124000,
        rfReference: rf,
      })
    ).toBe(
      [
        "BCD",
        "002",
        "1",
        "SCT",
        "",
        "Oma Yritys",
        "FI2112345600000785",
        "EUR1240.00",
        "",
        rf,
        "",
      ].join("\n")
    )
  })

  it("writes the message when there is no RF reference", () => {
    const text = epcPayload({
      name: "Oma Yritys",
      iban: IBAN,
      cents: 5,
      message: "Lasku 1001  viite 10016",
    })
    expect(text?.split("\n").slice(7)).toEqual([
      "EUR0.05",
      "",
      "",
      "Lasku 1001 viite 10016",
    ])
  })

  it("leaves the message out when an RF reference is given", () => {
    const rf = rfReference("1001") as string
    const text = epcPayload({
      name: "A",
      iban: IBAN,
      cents: 100,
      rfReference: rf,
      message: "ignored",
    })
    expect(text?.endsWith("\n")).toBe(true)
  })

  it("cuts the name to 70 characters and the message to 140", () => {
    const text = epcPayload({
      name: "x".repeat(100),
      iban: IBAN,
      cents: 100,
      message: "y".repeat(200),
    }) as string
    const lines = text.split("\n")
    expect(lines[5]).toHaveLength(70)
    expect(lines[10]).toHaveLength(140)
  })

  it.each([
    ["a bad IBAN", { iban: "FI00" }],
    ["a zero amount", { cents: 0 }],
    ["an empty name", { name: "  " }],
    ["a wrong RF check", { rfReference: "RF00539007547034" }],
  ])("refuses %s", (_name, override) => {
    expect(
      epcPayload({ name: "A", iban: IBAN, cents: 100, ...override })
    ).toBeNull()
  })
})
