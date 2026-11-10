import { describe, expect, it } from "vitest"

import {
  isInvoiceSaleKind,
  isReverseCharge,
  rowSaleKind,
  vatNotes,
} from "@/lib/domain/invoice-vat"

describe("VAT on an invoice (§8.27)", () => {
  it("reads the kind of sale from the built-in category, and any other as domestic", () => {
    expect(rowSaleKind("300-eu-goods")).toBe("euGoods")
    expect(rowSaleKind("300-reverse")).toBe("reverse")
    expect(rowSaleKind("300-domestic")).toBe("domestic")
    expect(rowSaleKind("c-own-sales")).toBe("domestic")
    expect(isInvoiceSaleKind("eu")).toBe(false)
  })

  it("shows no rate when the buyer reports the VAT", () => {
    expect(isReverseCharge("euServices")).toBe(true)
    expect(isReverseCharge("reverse")).toBe(true)
    expect(isReverseCharge("euGoods")).toBe(false)
    expect(isReverseCharge("nonEu")).toBe(false)
  })

  it("prints each note once in a fixed order, and only the seller's own when unregistered", () => {
    const rows = [
      { catId: "300-reverse" },
      { catId: "300-domestic" },
      { catId: "300-eu-goods" },
      { catId: "300-reverse" },
    ]
    expect(vatNotes(rows, true)).toEqual(["euGoods", "reverse"])
    expect(vatNotes([{ catId: "300-domestic" }], true)).toEqual([])
    expect(vatNotes(rows, false)).toEqual(["unregistered"])
  })
})
