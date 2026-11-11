import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { proposeForRows, registerParty } from "@/lib/domain/bank-match"
import type { BankRow } from "@/lib/domain/bank-csv"
import { ecSales } from "@/lib/domain/ec-sales"
import { flaggedEntryIds } from "@/lib/domain/entry-checks"
import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
} from "@/lib/domain/invoice"
import { parseCustomers, serializeCustomers } from "@/lib/domain/invoice-file"
import { parseCsv, serializeCsv } from "@/lib/domain/csv"
import {
  partyDefaults,
  partyFitsSide,
  partyOf,
  partySummary,
} from "@/lib/domain/parties"
import { indexCategories, type Entry } from "@/lib/domain/types"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)

/** An enabled expense category other than 333, for a rule to point at. */
const OTHER_COST = baseCats.find(
  (c) =>
    c.enabled &&
    c.id !== "333" &&
    !c.euPurchase &&
    c.id.startsWith("3") &&
    Number(c.id.slice(0, 3)) > 333
)!.id

function party(over: Partial<Customer> = {}): Customer {
  return {
    ...CUSTOMER_DEFAULTS,
    ...emptyParty(),
    id: "p1",
    name: "Mäkinen Rakennus Oy",
    language: "fi",
    ...over,
  }
}

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    voucher: 1,
    date: "2026-03-10",
    description: "Lasku",
    type: "expense",
    catId: "333",
    amount: 12_450,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

function row(over: Partial<BankRow>): BankRow {
  return {
    date: "2026-10-28",
    amount: -12_450,
    counterparty: "",
    message: "",
    reference: "",
    kind: "TILISIIRTO",
    ...over,
  }
}

describe("register file", () => {
  it("reads a register written before suppliers as customers", () => {
    const old = JSON.stringify({
      customers: [{ id: "c1", name: "Vanha Oy", country: "FI" }],
    })
    expect(parseCustomers(old).customers[0]).toMatchObject({
      role: "customer",
      incomeCat: null,
      expenseCat: null,
      vatRate: null,
    })
  })

  it("round-trips the role and the defaults", () => {
    const p = party({
      role: "both",
      incomeCat: "300-domestic",
      expenseCat: "333",
      vatRate: 14,
    })
    expect(parseCustomers(serializeCustomers([p])).customers[0]).toEqual(p)
  })

  it("drops a rate that is not a VAT rate", () => {
    const text = JSON.stringify({
      customers: [{ ...party(), vatRate: 120 }],
    })
    expect(parseCustomers(text).customers[0].vatRate).toBeNull()
  })
})

describe("partyFitsSide", () => {
  it("puts customers on sales and suppliers on costs", () => {
    expect(partyFitsSide(party({ role: "customer" }), "income")).toBe(true)
    expect(partyFitsSide(party({ role: "customer" }), "expense")).toBe(false)
    expect(partyFitsSide(party({ role: "supplier" }), "expense")).toBe(true)
    expect(partyFitsSide(party({ role: "both" }), "income")).toBe(true)
  })
})

describe("partyDefaults", () => {
  it("gives the side's category with the party's rate or the category's", () => {
    const p = party({ role: "both", expenseCat: "333", incomeCat: null })
    expect(partyDefaults(p, "expense", cats)).toEqual({
      catId: "333",
      vatRate: cats.get("333")?.vatRate,
    })
    expect(partyDefaults({ ...p, vatRate: 14 }, "expense", cats)?.vatRate).toBe(
      14
    )
    expect(partyDefaults(p, "income", cats)).toBeNull()
  })

  it("ignores a category on the wrong side or one switched off", () => {
    expect(
      partyDefaults(party({ expenseCat: "300-domestic" }), "expense", cats)
    ).toBeNull()
    const off = indexCategories(
      baseCats.map((c) => (c.id === "333" ? { ...c, enabled: false } : c))
    )
    expect(
      partyDefaults(party({ expenseCat: "333" }), "expense", off)
    ).toBeNull()
  })
})

describe("partyOf", () => {
  it("finds the entry's party, and nothing for one since deleted", () => {
    expect(partyOf(entry({ party: "p1" }), [party()])?.id).toBe("p1")
    expect(partyOf(entry({ party: "gone" }), [party()])).toBeUndefined()
    expect(partyOf(entry(), [party()])).toBeUndefined()
  })
})

describe("partySummary", () => {
  it("totals the year's vouchers and what is open today", () => {
    const entries = [
      entry({ id: "a", party: "p1", type: "income", catId: "300-domestic" }),
      entry({ id: "b", party: "p1", amount: 2_000 }),
      entry({ id: "c", party: "p1", date: "2025-12-01", paidOn: null }),
      entry({ id: "d", party: "other" }),
    ]
    const s = partySummary("p1", entries, cats, 2026, "2026-06-01")
    expect(s.entries.map((e) => e.id)).toEqual(["a", "b"])
    expect(s.sales).toBe(12_450)
    expect(s.costs).toBe(2_000)
    expect(s.open).toEqual({ receivables: 0, payables: 12_450, count: 1 })
  })
})

describe("bank import and the register", () => {
  const supplier = party({ role: "supplier", expenseCat: "333", vatRate: 14 })

  it("matches a counterparty to the register and takes its defaults", () => {
    const [p] = proposeForRows([row({ counterparty: "MÄKINEN RAKENNUS OY" })], {
      entries: [],
      cats,
      parties: [supplier],
    })
    expect(p.kind === "new" && p.draft).toMatchObject({
      catId: "333",
      vatRate: 14,
      party: "p1",
    })
  })

  it("lets the user's rules win over the register", () => {
    const [p] = proposeForRows([row({ counterparty: "Mäkinen Rakennus" })], {
      entries: [],
      cats,
      parties: [supplier],
      rules: [
        { id: "r", contains: "mäkinen", catId: OTHER_COST, vatRate: 25.5 },
      ],
    })
    expect(p.kind === "new" && p.draft.catId).toBe(OTHER_COST)
    expect(p.kind === "new" && p.draft.party).toBe("p1")
  })

  it("takes only a party on the row's side, the longest name first", () => {
    const parties = [
      party({ id: "short", name: "Mäkinen", role: "supplier" }),
      party({ id: "long", name: "Mäkinen Rakennus", role: "supplier" }),
      party({ id: "buyer", name: "Mäkinen Rakennus Oy Ab", role: "customer" }),
    ]
    expect(
      registerParty("Mäkinen Rakennus Oy", "expense", { parties })?.id
    ).toBe("long")
    expect(registerParty("Mäkinen", "income", { parties })).toBeUndefined()
  })
})

describe("EC Sales List and the register", () => {
  it("uses the party's VAT number when the entry has none, and names it", () => {
    const buyer = party({
      role: "customer",
      name: "Svensk AB",
      vatId: "SE556123456701",
    })
    const sales = [
      entry({
        id: "s1",
        type: "income",
        catId: "300-eu-goods",
        vatRate: 0,
        party: "p1",
      }),
    ]
    const [month] = ecSales(sales, cats, 2026, [buyer])
    expect(month.buyers[0]).toMatchObject({
      vatId: "SE556123456701",
      names: ["Svensk AB"],
    })
  })

  it("keeps the entry's own number first", () => {
    const buyer = party({ vatId: "SE556123456701" })
    const sales = [
      entry({
        type: "income",
        catId: "300-eu-goods",
        vatRate: 0,
        party: "p1",
        buyerVatId: "DE123456789",
      }),
    ]
    expect(ecSales(sales, cats, 2026, [buyer])[0].buyers[0].vatId).toBe(
      "DE123456789"
    )
  })
})

describe("CSV party column", () => {
  it("round-trips the party id in both languages", () => {
    for (const lang of ["fi", "en"] as const) {
      const text = serializeCsv([entry({ party: "abc123" })], cats, { lang })
      const result = parseCsv(text, baseCats)
      expect(result.ok && result.entries[0].party).toBe("abc123")
    }
  })

  it("reads a cell that is not an id as no party", () => {
    const text = serializeCsv([entry({ party: "abc123" })], cats).replace(
      ";abc123;;;;;\r\n",
      ";not an id!;;;;;\r\n"
    )
    const result = parseCsv(text, baseCats)
    expect(result.ok && result.entries[0].party).toBeUndefined()
  })
})

describe("duplicate check", () => {
  it("does not pair a credit with the voucher it reverses", () => {
    const original = entry({ id: "a", description: "Sama" })
    const credit = entry({
      id: "b",
      description: "Sama",
      reverses: "a",
      amount: 12_450,
    })
    expect(
      flaggedEntryIds("duplicate", [original, credit], cats, "2026-06-01")
    ).toEqual(new Set())
  })
})
