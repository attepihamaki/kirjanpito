import { describe, expect, it } from "vitest"

import {
  CUSTOMER_DEFAULTS,
  emptyParty,
  type Customer,
} from "@/lib/domain/invoice"
import type { Payable } from "@/lib/domain/payables"
import {
  executionDateFor,
  finnishBic,
  isBic,
  localDateTime,
  paymentFileXml,
  paymentMessageId,
  paymentOrderFor,
  type PaymentBatch,
  type PaymentOrder,
} from "@/lib/domain/payment-file"
import type { Entry } from "@/lib/domain/types"

function bill(over: Partial<Payable> = {}, lead: Partial<Entry> = {}): Payable {
  const entry: Entry = {
    id: "entry-1",
    voucher: 41,
    date: "2026-11-02",
    description: "Sähkölasku marraskuu",
    type: "expense",
    catId: "334",
    amount: 12_450,
    vatRate: 25.5,
    amountMode: "gross",
    paidOn: null,
    ...lead,
  }
  return {
    entries: [entry],
    lead: entry,
    open: 12_450,
    daysLate: 0,
    group: "later",
    iban: "FI2112345600000785",
    reference: "1232",
    due: "2026-11-20",
    ...over,
  }
}

const supplier: Customer = {
  ...emptyParty(),
  ...CUSTOMER_DEFAULTS,
  id: "p1",
  role: "supplier",
  language: "fi",
  name: "Helen Oy",
}

describe("executionDateFor", () => {
  it("pays on the due date, or today when that is past or missing", () => {
    expect(executionDateFor(bill(), "2026-11-11")).toBe("2026-11-20")
    expect(executionDateFor(bill({ due: "2026-11-01" }), "2026-11-11")).toBe(
      "2026-11-11"
    )
    expect(executionDateFor(bill({ due: undefined }), "2026-11-11")).toBe(
      "2026-11-11"
    )
  })
})

describe("paymentOrderFor", () => {
  it("names the register's supplier and carries the reference", () => {
    const order = paymentOrderFor(bill({}, { party: "p1" }), "2026-11-20", [
      supplier,
    ])
    expect(order).toEqual({
      endToEndId: "2026-41",
      amount: 12_450,
      creditorName: "Helen Oy",
      creditorIban: "FI2112345600000785",
      reference: "1232",
      executionDate: "2026-11-20",
    })
  })

  it("falls back on the description, sent as the message without a reference", () => {
    const order = paymentOrderFor(
      bill({ reference: undefined }),
      "2026-11-20",
      []
    ) as PaymentOrder
    expect(order.creditorName).toBe("Sähkölasku marraskuu")
    expect(order.message).toBe("Sähkölasku marraskuu")
    expect(order.reference).toBeUndefined()
  })

  it("drops a reference whose check digit is wrong", () => {
    const order = paymentOrderFor(
      bill({ reference: "1233" }),
      "2026-11-20",
      []
    ) as PaymentOrder
    expect(order.reference).toBeUndefined()
  })

  it("refuses a bill without a valid IBAN or with nothing owed", () => {
    expect(paymentOrderFor(bill({ iban: undefined }), "2026-11-20", [])).toBe(
      "noIban"
    )
    expect(
      paymentOrderFor(bill({ iban: "FI2112345600000786" }), "2026-11-20", [])
    ).toBe("noIban")
    expect(paymentOrderFor(bill({ open: -500 }), "2026-11-20", [])).toBe(
      "notOwed"
    )
  })
})

describe("finnishBic", () => {
  it("reads the bank from the account number, the longest prefix first", () => {
    expect(finnishBic("FI35 5000 0120 2535 04")).toBe("OKOYFIHH")
    expect(finnishBic("FI2112345600000785")).toBe("NDEAFIHH")
    expect(finnishBic("FI3640550012345678")).toBe("HELSFIHH")
    expect(finnishBic("FI4636001234567890")).toBe("SBANFIHH")
  })

  it("is empty for a foreign or invalid IBAN", () => {
    expect(finnishBic("DE89370400440532013000")).toBe("")
    expect(finnishBic("FI2112345600000786")).toBe("")
  })
})

describe("isBic", () => {
  it("takes 8 or 11 characters", () => {
    expect(isBic("OKOYFIHH")).toBe(true)
    expect(isBic("OKOYFIHHXXX")).toBe(true)
    expect(isBic("OKOYFI")).toBe(false)
    expect(isBic("okoyfihh")).toBe(false)
  })
})

describe("paymentFileXml", () => {
  const orders: PaymentOrder[] = [
    {
      endToEndId: "2026-41",
      amount: 12_450,
      creditorName: "Helen Oy",
      creditorIban: "FI2112345600000785",
      reference: "1232",
      executionDate: "2026-11-20",
    },
    {
      endToEndId: "2026-42",
      amount: 5,
      creditorName: "Café <Ääni> & Co",
      creditorIban: "FI2112345600000785",
      message: "Lasku 7",
      executionDate: "2026-11-12",
    },
    {
      endToEndId: "2026-43",
      amount: 100_000,
      creditorName: "RF Oy",
      creditorIban: "FI2112345600000785",
      reference: "RF18539007547034",
      executionDate: "2026-11-20",
    },
  ]
  const batch: PaymentBatch = {
    messageId: "KP20261111101500",
    createdAt: "2026-11-11T10:15:00",
    debtorName: "Toiminimi Testi",
    debtorIban: "FI3550000120253504",
    debtorBic: "OKOYFIHH",
    orders,
  }

  it("totals the group header and each day's block", () => {
    const out = paymentFileXml(batch, "03")
    expect(out).toContain("<NbOfTxs>3</NbOfTxs><CtrlSum>1124.55</CtrlSum>")
    expect(out).toContain("<NbOfTxs>1</NbOfTxs><CtrlSum>0.05</CtrlSum>")
    expect(out).toContain("<NbOfTxs>2</NbOfTxs><CtrlSum>1124.50</CtrlSum>")
  })

  it("puts the days in order", () => {
    const out = paymentFileXml(batch, "03")
    expect(out.indexOf("2026-11-12")).toBeLessThan(out.indexOf("2026-11-20"))
  })

  it("writes each version's own date and BIC elements", () => {
    const v3 = paymentFileXml(batch, "03")
    expect(v3).toContain("pain.001.001.03")
    expect(v3).toContain("<ReqdExctnDt>2026-11-12</ReqdExctnDt>")
    expect(v3).toContain("<BIC>OKOYFIHH</BIC>")
    const v9 = paymentFileXml(batch, "09")
    expect(v9).toContain("pain.001.001.09")
    expect(v9).toContain("<ReqdExctnDt><Dt>2026-11-12</Dt></ReqdExctnDt>")
    expect(v9).toContain("<BICFI>OKOYFIHH</BICFI>")
  })

  it("leaves the BIC to the bank when none is given", () => {
    const out = paymentFileXml({ ...batch, debtorBic: "" }, "03")
    expect(out).toContain("<Othr><Id>NOTPROVIDED</Id></Othr>")
  })

  it("sends a reference structured and a message unstructured", () => {
    const out = paymentFileXml(batch, "03")
    expect(out).toContain(
      "<Tp><CdOrPrtry><Cd>SCOR</Cd></CdOrPrtry></Tp><Ref>1232</Ref>"
    )
    expect(out).toContain(
      "<Tp><CdOrPrtry><Cd>SCOR</Cd></CdOrPrtry><Issr>ISO</Issr></Tp><Ref>RF18539007547034</Ref>"
    )
    expect(out).toContain("<Ustrd>Lasku 7</Ustrd>")
  })

  it("keeps names to the SEPA characters and escapes the rest", () => {
    const out = paymentFileXml(batch, "03")
    expect(out).toContain("<Nm>Cafe Ääni Co</Nm>")
    expect(out).not.toMatch(/<Nm>[^<]*&/)
  })
})

describe("ids and times", () => {
  it("are taken from the local clock", () => {
    const now = new Date(2026, 10, 11, 9, 5, 7)
    expect(paymentMessageId(now)).toBe("KP20261111090507")
    expect(localDateTime(now)).toBe("2026-11-11T09:05:07")
  })
})
