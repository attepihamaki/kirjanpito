import { describe, expect, it } from "vitest"

import {
  apiRows,
  rowsToOpCsv,
  type ApiTransaction,
} from "@/lib/domain/bank-api"
import { parseBankCsv } from "@/lib/domain/bank-csv"

const txs: ApiTransaction[] = [
  {
    entry_reference: "A1",
    transaction_amount: { amount: "124.00", currency: "EUR" },
    credit_debit_indicator: "CRDT",
    debtor: { name: "Asiakas Oy" },
    creditor: { name: "Minä" },
    booking_date: "2026-03-04",
    value_date: "2026-03-03",
    remittance_information: ["Lasku 1001"],
    reference_number: "1001 5",
  },
  {
    entry_reference: "A2",
    transaction_amount: { amount: "9.90", currency: "EUR" },
    credit_debit_indicator: "DBIT",
    creditor: { name: "Teleoperaattori" },
    booking_date: "2026-03-05",
    remittance_information: [],
  },
  {
    transaction_amount: { amount: "5", currency: "SEK" },
    booking_date: "2026-03-06",
  },
  { transaction_amount: { amount: "5", currency: "EUR" } },
]

describe("apiRows", () => {
  it("signs the amount and picks the other party", () => {
    const rows = apiRows(txs)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      amount: 12400,
      counterparty: "Asiakas Oy",
      reference: "10015",
    })
    expect(rows[1]).toMatchObject({
      amount: -990,
      counterparty: "Teleoperaattori",
    })
  })
})

describe("rowsToOpCsv", () => {
  it("is read back by the statement parser as OP's layout", () => {
    const rows = apiRows(txs)
    const parsed = parseBankCsv(rowsToOpCsv(rows))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.preset).toBe("op")
    expect(
      parsed.rows.map((r) => [r.date, r.amount, r.counterparty, r.reference])
    ).toEqual([
      ["2026-03-04", 12400, "Asiakas Oy", "10015"],
      ["2026-03-05", -990, "Teleoperaattori", ""],
    ])
  })
})
