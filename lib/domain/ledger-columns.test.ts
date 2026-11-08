import { describe, expect, it } from "vitest"

import { normalizeHiddenColumns, toggleLedgerColumn } from "./ledger-columns"

describe("ledger columns", () => {
  it("drops unknown and repeated values and keeps table order", () => {
    expect(normalizeHiddenColumns(["vat", "bogus", "voucher", "vat"])).toEqual([
      "voucher",
      "vat",
    ])
    expect(normalizeHiddenColumns("voucher")).toEqual([])
  })

  it("hides and shows a column", () => {
    const hidden = toggleLedgerColumn([], "net", false)
    expect(hidden).toEqual(["net"])
    expect(toggleLedgerColumn(hidden, "net", true)).toEqual([])
  })
})
