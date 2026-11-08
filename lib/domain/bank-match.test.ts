import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import type { BankRow } from "@/lib/domain/bank-csv"
import {
  normalizeName,
  proposeForRows,
  suggestFromHistory,
  suggestFromWords,
  withInvoiceEntries,
} from "@/lib/domain/bank-match"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import { indexCategories, type Entry } from "@/lib/domain/types"

const cats = indexCategories(defaultCategories())

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e",
    date: "2026-10-01",
    description: "Testi",
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

const ctx = (entries: Entry[]) => ({ entries, cats })

describe("normalizeName", () => {
  it("drops company suffixes, case and diacritics", () => {
    expect(normalizeName("Mäkinen Rakennus Oy")).toBe("makinen rakennus")
  })
})

describe("proposeForRows, open entries", () => {
  it("matches a unique open entry of the same amount and side", () => {
    const open = entry({ id: "a", paidOn: null })
    expect(proposeForRows([row({})], ctx([open]))).toEqual([
      { kind: "match", entryId: "a", confidence: "amount" },
    ])
  })

  it("is likely when an invoice number in the message is in the description", () => {
    const open = entry({ id: "a", paidOn: null, description: "Lasku 55501" })
    const [p] = proposeForRows([row({ message: "Lasku 55501" })], ctx([open]))
    expect(p).toEqual({ kind: "match", entryId: "a", confidence: "likely" })
  })

  it("uses the text to choose between equal amounts", () => {
    const a = entry({
      id: "a",
      paidOn: null,
      description: "K-Rauta tarvikkeet",
    })
    const b = entry({ id: "b", paidOn: null, description: "Neste polttoaine" })
    const [p] = proposeForRows(
      [row({ counterparty: "Neste Oyj" })],
      ctx([a, b])
    )
    expect(p).toEqual({ kind: "match", entryId: "b", confidence: "likely" })
  })

  it("is ambiguous when nothing tells equal entries apart", () => {
    const a = entry({ id: "a", paidOn: null })
    const b = entry({ id: "b", paidOn: null })
    expect(proposeForRows([row({})], ctx([a, b]))[0]).toEqual({
      kind: "ambiguous",
      entryIds: ["a", "b"],
    })
  })

  it("lets two payments claim one invoice each", () => {
    const a = entry({ id: "a", paidOn: null })
    const b = entry({ id: "b", paidOn: null })
    const out = proposeForRows(
      [row({ message: "Lasku 1111" }), row({ message: "Lasku 2222" })],
      ctx([a, b])
    )
    expect(out[0].kind).toBe("ambiguous")
    const single = proposeForRows([row({}), row({})], ctx([a]))
    expect(single.map((p) => p.kind)).toEqual(["match", "new"])
  })

  it("ignores a paid entry, the wrong side and the wrong amount", () => {
    const paid = entry({ id: "p" })
    const income = entry({ id: "i", type: "income", paidOn: null })
    const other = entry({ id: "o", amount: 999, paidOn: null })
    const [p] = proposeForRows([row({})], ctx([paid, income, other]))
    expect(p.kind).toBe("new")
  })

  it("never offers an entry that cannot be unpaid", () => {
    const vat = entry({
      id: "v",
      catId: "vat-payment",
      vatRate: 0,
      paidOn: null,
    })
    expect(proposeForRows([row({})], ctx([vat]))[0].kind).toBe("new")
  })
})

describe("proposeForRows, already booked", () => {
  it("recognises an entry paid that day for that amount", () => {
    const paid = entry({ id: "p", date: "2026-10-28" })
    expect(proposeForRows([row({})], ctx([paid]))[0]).toEqual({
      kind: "booked",
      entryId: "p",
    })
  })

  it("uses the payment date, not the invoice date", () => {
    const paid = entry({ id: "p", date: "2026-10-01", paidOn: "2026-10-28" })
    expect(proposeForRows([row({})], ctx([paid]))[0].kind).toBe("booked")
  })
})

describe("proposeForRows, new entries", () => {
  it("drafts a gross, positive amount with the counterparty as description", () => {
    const [p] = proposeForRows(
      [
        row({
          amount: 250_000,
          counterparty: "Asiakas Oy",
          message: "Lasku 7",
        }),
      ],
      ctx([])
    )
    expect(p).toEqual({
      kind: "new",
      draft: {
        type: "income",
        description: "Asiakas Oy – Lasku 7",
        amount: 250_000,
        catId: null,
        vatRate: null,
      },
    })
  })

  it("takes category and newest rate from earlier entries naming the counterparty", () => {
    const history = [
      entry({
        id: "1",
        description: "K-Rauta – tarvikkeet",
        catId: "333",
        date: "2026-01-02",
        vatRate: 24,
      }),
      entry({
        id: "2",
        description: "K-Rauta tarvikkeet",
        catId: "333",
        date: "2026-09-02",
        vatRate: 25.5,
      }),
      entry({
        id: "3",
        description: "K-Rauta työkalu",
        catId: "344-other",
        date: "2026-03-01",
      }),
    ]
    expect(suggestFromHistory("K-Rauta Oy", "expense", ctx(history))).toEqual({
      catId: "333",
      vatRate: 25.5,
    })
  })

  it("guesses a category from the words of an unseen counterparty", () => {
    const [p] = proposeForRows(
      [row({ counterparty: "Elisa Oyj", message: "Liittymä 10/2026" })],
      ctx([])
    )
    expect(p).toMatchObject({
      kind: "new",
      draft: { catId: "344-other", vatRate: null, guessed: true },
    })
  })

  it("prefers history to a word guess and does not flag it", () => {
    const history = [
      entry({ id: "1", description: "Elisa Oyj", catId: "334", vatRate: 25.5 }),
    ]
    const [p] = proposeForRows(
      [row({ counterparty: "Elisa Oyj" })],
      ctx(history)
    )
    expect(p).toMatchObject({ kind: "new", draft: { catId: "334" } })
    if (p.kind === "new") expect(p.draft.guessed).toBeUndefined()
  })

  it("guesses nothing for money in, a disabled category or no known word", () => {
    const [income] = proposeForRows(
      [row({ amount: 5000, counterparty: "Elisa Oyj" })],
      ctx([])
    )
    if (income.kind === "new") expect(income.draft.catId).toBeNull()
    expect(suggestFromWords("Elisa", "expense", new Map())).toBeNull()
    const [none] = proposeForRows([row({ counterparty: "Xyz Oy" })], ctx([]))
    if (none.kind === "new") expect(none.draft.guessed).toBeUndefined()
  })

  it("suggests nothing for an unknown counterparty or the other side", () => {
    const history = [entry({ id: "1", description: "K-Rauta" })]
    expect(suggestFromHistory("Elisa", "expense", ctx(history))).toBeNull()
    expect(suggestFromHistory("K-Rauta", "income", ctx(history))).toBeNull()
    expect(suggestFromHistory("", "expense", ctx(history))).toBeNull()
  })
})

describe("proposeForRows, VAT payments and refunds", () => {
  const dues = [
    { key: "2026-09", due: 36_218 },
    { key: "2026-10", due: -5_000 },
  ]
  const withDues = { entries: [], cats, dues }

  it("proposes the tax payment of a closed period for money out of that amount", () => {
    const [p] = proposeForRows(
      [
        row({
          date: "2026-11-12",
          amount: -36_218,
          counterparty: "Verohallinto",
        }),
      ],
      withDues
    )
    expect(p).toMatchObject({
      kind: "new",
      draft: { catId: "vat-payment", vatRate: 0, settles: "2026-09" },
    })
  })

  it("proposes the refund of a period for money in of that amount", () => {
    const [p] = proposeForRows(
      [row({ date: "2026-12-20", amount: 5_000 })],
      withDues
    )
    expect(p).toMatchObject({
      kind: "new",
      draft: { catId: "vat-refund", settles: "2026-10" },
    })
  })

  it("leaves a row alone that arrived before the period closed", () => {
    const [p] = proposeForRows(
      [row({ date: "2026-09-20", amount: -36_218 })],
      withDues
    )
    expect(p.kind === "new" && p.draft.settles).toBeFalsy()
  })

  it("uses each period once", () => {
    const rows = [
      row({ date: "2026-11-12", amount: -36_218 }),
      row({ date: "2026-11-13", amount: -36_218 }),
    ]
    const [a, b] = proposeForRows(rows, withDues)
    expect(a).toMatchObject({ draft: { settles: "2026-09" } })
    expect(b.kind === "new" && b.draft.settles).toBeFalsy()
  })
})

describe("proposeForRows, invoices (§8.27)", () => {
  const sale = (id: string, paidOn: Entry["paidOn"], amount = 10_000): Entry =>
    entry({
      id,
      type: "income",
      catId: "300-domestic",
      amount,
      amountMode: "net",
      vatRate: 25.5,
      paidOn,
    })
  const invoice = (over: Partial<Invoice> = {}): Invoice => ({
    id: "i1",
    number: 1001,
    date: "2026-11-01",
    dueDate: "2026-11-15",
    supplyFrom: null,
    supplyTo: null,
    customerId: null,
    customer: emptyParty(),
    language: "fi",
    rows: [],
    note: "",
    terms: "",
    reference: "10016",
    seller: null,
    issuedAt: "2026-11-01T09:00:00.000Z",
    entryIds: ["a"],
    credits: null,
    ...over,
  })
  const incoming = (over: Partial<BankRow> = {}) =>
    row({ amount: 12_550, date: "2026-11-10", reference: "10016", ...over })
  const withInvoices = (entries: Entry[], invoices: Invoice[]) => ({
    entries,
    cats,
    invoices,
  })

  it("matches the invoice by its reference and the amount it still owes", () => {
    const [p] = proposeForRows(
      [incoming()],
      withInvoices([sale("a", null)], [invoice()])
    )
    expect(p).toEqual({ kind: "match", entryId: "a", confidence: "reference" })
  })

  it("finds the reference in the message and ignores spaces in the reference field", () => {
    const ctxWith = withInvoices([sale("a", null)], [invoice()])
    expect(
      proposeForRows(
        [incoming({ reference: "", message: "Maksu 10016" })],
        ctxWith
      )[0]
    ).toMatchObject({ confidence: "reference" })
    expect(
      proposeForRows([incoming({ reference: "1 0016" })], ctxWith)[0]
    ).toMatchObject({ confidence: "reference" })
  })

  it("matches an invoice of two entries to its total and claims both", () => {
    const entries = [sale("a", null), sale("b", null, 5000)]
    const both = invoice({ entryIds: ["a", "b"] })
    const proposals = proposeForRows(
      [incoming({ amount: 18_825 }), incoming({ amount: 6275, reference: "" })],
      withInvoices(entries, [both])
    )
    expect(proposals[0]).toEqual({
      kind: "match",
      entryId: "a",
      confidence: "reference",
    })
    /* The second row cannot claim the entry the first one took. */
    expect(proposals[1].kind).not.toBe("match")
  })

  it("does not match a part payment or an overpayment by reference", () => {
    const ctxWith = withInvoices([sale("a", null)], [invoice()])
    expect(proposeForRows([incoming({ amount: 5000 })], ctxWith)[0].kind).toBe(
      "new"
    )
    expect(
      proposeForRows([incoming({ amount: 20_000 })], ctxWith)[0].kind
    ).toBe("new")
  })

  it("falls back to the ordinary rules for another reference, money out and a paid invoice", () => {
    const ctxWith = withInvoices([sale("a", null)], [invoice()])
    expect(
      proposeForRows([incoming({ reference: "10029" })], ctxWith)[0]
    ).toEqual({ kind: "match", entryId: "a", confidence: "amount" })
    expect(
      proposeForRows([incoming({ amount: -12_550 })], ctxWith)[0].kind
    ).toBe("new")
    const paid = withInvoices([sale("a", "2026-11-05")], [invoice()])
    expect(proposeForRows([incoming()], paid)[0].kind).toBe("new")
  })

  it("sees an invoice of two entries as already booked when the statement is read again", () => {
    const entries = [sale("a", "2026-11-10"), sale("b", "2026-11-10", 5000)]
    const both = invoice({ entryIds: ["a", "b"] })
    const [p] = proposeForRows(
      [incoming({ amount: 18_825 })],
      withInvoices(entries, [both])
    )
    expect(p).toEqual({ kind: "booked", entryId: "a" })
  })
})

describe("withInvoiceEntries", () => {
  const entries: Entry[] = [
    entry({ id: "a", paidOn: null }),
    entry({ id: "b", paidOn: null }),
    entry({ id: "c", paidOn: "2026-11-01" }),
    entry({ id: "x", paidOn: null }),
  ]
  const inv = { entryIds: ["a", "b", "c"] } as Invoice

  it("adds the invoice's other open entries on the same day", () => {
    expect(
      withInvoiceEntries([{ entryId: "a", on: "2026-11-10" }], [inv], entries)
    ).toEqual([
      { entryId: "a", on: "2026-11-10" },
      { entryId: "b", on: "2026-11-10" },
    ])
  })

  it("leaves an entry that is not on an invoice alone, and adds nothing twice", () => {
    expect(
      withInvoiceEntries([{ entryId: "x", on: "2026-11-10" }], [inv], entries)
    ).toEqual([{ entryId: "x", on: "2026-11-10" }])
    const paid = [
      { entryId: "a", on: "2026-11-10" },
      { entryId: "b", on: "2026-11-10" },
    ]
    expect(withInvoiceEntries(paid, [inv], entries)).toEqual(paid)
  })
})
