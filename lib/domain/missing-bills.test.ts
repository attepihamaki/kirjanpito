import { describe, expect, it } from "vitest"

import { billKey, missingBills, monthIgnore } from "@/lib/domain/missing-bills"
import type { RecurringEntry } from "@/lib/domain/recurring"
import type { Entry } from "@/lib/domain/types"

let n = 0
const bill = (date: string, over: Partial<Entry> = {}): Entry => ({
  id: `e${++n}`,
  date,
  description: `Puhelin ${date.slice(5, 7)}/${date.slice(0, 4)}`,
  type: "expense",
  catId: "344-other",
  amount: 2_990,
  vatRate: 25.5,
  amountMode: "gross",
  ...over,
})

/* A phone bill on the 5th of August, September and October. */
const phone = [bill("2026-08-05"), bill("2026-09-04"), bill("2026-10-05")]

describe("billKey", () => {
  it("groups descriptions that differ only in numbers and case", () => {
    expect(billKey(bill("2026-01-05"))).toBe(billKey(bill("2026-02-05")))
    expect(billKey(bill("2026-01-05", { description: "PUHELIN 1/2026" }))).toBe(
      billKey(bill("2026-01-05"))
    )
  })

  it("prefers the counterparty and refuses a description of numbers", () => {
    expect(billKey(bill("2026-01-05", { party: "p1" }))).toBe("party:p1")
    expect(billKey(bill("2026-01-05", { description: "123" }))).toBe("")
  })
})

describe("missingBills", () => {
  it("waits for the usual day and the grace days to pass", () => {
    expect(missingBills(phone, "2026-11-10")).toEqual([])
    const [missing] = missingBills(phone, "2026-11-11")
    expect(missing.month).toBe("2026-11")
    expect(missing.day).toBe(5)
    expect(missing.expected).toBe(2_990)
    expect(missing.last.date).toBe("2026-10-05")
  })

  it("says nothing once the month has the bill", () => {
    expect(missingBills([...phone, bill("2026-11-20")], "2026-11-25")).toEqual(
      []
    )
  })

  it("needs three months in a row before it expects a bill", () => {
    expect(missingBills(phone.slice(1), "2026-11-25")).toEqual([])
    expect(missingBills([phone[0], phone[2]], "2026-11-25")).toEqual([])
  })

  it("reports last month on the first days of a month, and only that month", () => {
    const run = [bill("2026-07-05"), ...phone]
    const found = missingBills(
      run.filter((e) => !e.date.startsWith("2026-10")),
      "2026-11-02"
    )
    expect(found.map((b) => b.month)).toEqual(["2026-10"])
    const later = missingBills(
      run.filter((e) => !e.date.startsWith("2026-10")),
      "2026-11-28"
    )
    expect(later.map((b) => b.month)).toEqual(["2026-10"])
  })

  it("reports a bill of the month's last days from the next month", () => {
    const late = [bill("2026-01-28"), bill("2026-02-28"), bill("2026-03-30")]
    expect(missingBills(late, "2026-04-30")).toEqual([])
    expect(missingBills(late, "2026-05-01").map((b) => b.month)).toEqual([
      "2026-04",
    ])
  })

  it("takes the middle of the monthly totals as the amount to expect", () => {
    const amounts = [
      bill("2026-08-05", { amount: 1_000 }),
      bill("2026-09-05", { amount: 5_000 }),
      bill("2026-09-06", { amount: 1_000 }),
      bill("2026-10-05", { amount: 3_000 }),
    ]
    expect(missingBills(amounts, "2026-11-20")[0].expected).toBe(3_000)
  })

  it("leaves out income, VAT payments, split parts and recurring templates", () => {
    const of = (over: Partial<Entry>) => phone.map((e) => ({ ...e, ...over }))
    expect(missingBills(of({ type: "income" }), "2026-11-20")).toEqual([])
    expect(missingBills(of({ settles: "2026-09" }), "2026-11-20")).toEqual([])
    expect(missingBills(of({ split: "s" }), "2026-11-20")).toEqual([])
    const template: RecurringEntry = {
      id: "r1",
      description: "Puhelin",
      type: "expense",
      catId: "344-other",
      amount: 2_990,
      vatRate: 25.5,
      amountMode: "gross",
      day: 5,
      from: "2026-01",
    }
    expect(
      missingBills(of({ description: "Puhelin" }), "2026-11-20", [template])
    ).toEqual([])
  })

  it("respects an ignore for good and for one month", () => {
    const key = billKey(phone[0])
    expect(missingBills(phone, "2026-11-20", [], [key])).toEqual([])
    expect(
      missingBills(phone, "2026-11-20", [], [monthIgnore(key, "2026-11")])
    ).toEqual([])
    expect(
      missingBills(phone, "2026-11-20", [], [monthIgnore(key, "2026-10")])
    ).toHaveLength(1)
  })
})
