import { describe, expect, it } from "vitest"

import { billBarcode, billIban, billReference } from "@/lib/domain/bill-payment"
import { parseVirtualBarcode } from "@/lib/domain/invoice-text"
import type { Entry } from "@/lib/domain/types"

const bill: Entry = {
  id: "b",
  date: "2026-11-01",
  description: "Sähkö",
  type: "expense",
  catId: "333",
  amount: 12_400,
  vatRate: 25.5,
  amountMode: "gross",
  paidOn: null,
  due: "2026-11-20",
  iban: "FI2112345600000785",
  reference: "1232",
}

describe("billIban and billReference", () => {
  it("compact a valid value and refuse one whose check digits fail", () => {
    expect(billIban("fi21 1234 5600 0007 85")).toBe("FI2112345600000785")
    expect(billIban("FI21 1234 5600 0007 86")).toBeNull()
    expect(billReference("RF18 5390 0754 7034")).toBe("RF18539007547034")
    expect(billReference("1 232")).toBe("1232")
    expect(billReference("1233")).toBeNull()
    expect(billReference("")).toBeNull()
  })
})

describe("billBarcode", () => {
  it("reads back as the bill's account, amount, reference and due date", () => {
    const code = billBarcode(bill)!
    expect(code).toHaveLength(54)
    expect(parseVirtualBarcode(code)).toEqual({
      amount: 12_400,
      dueDate: "2026-11-20",
      iban: "FI2112345600000785",
      reference: "1232",
    })
  })

  it("takes the amount still to pay when given", () => {
    expect(parseVirtualBarcode(billBarcode(bill, 5_000)!)?.amount).toBe(5_000)
  })

  it("is null without a reference or with a foreign IBAN", () => {
    expect(billBarcode({ ...bill, reference: undefined })).toBeNull()
    expect(billBarcode({ ...bill, iban: "DE89370400440532013000" })).toBeNull()
  })
})
