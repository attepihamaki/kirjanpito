import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { emptyParty } from "@/lib/domain/invoice"
import {
  OVERVIEW_RULES,
  overviewFindings,
  type OverviewContext,
} from "@/lib/domain/overview-rules"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { vatTimeline } from "@/lib/domain/vat-deadline"

const cats = indexCategories(defaultCategories())

function sale(id: string, date: string, extra: Partial<Entry> = {}): Entry {
  return {
    id,
    date,
    description: id,
    type: "income",
    catId: "300-domestic",
    amount: 10_000,
    vatRate: 25.5,
    amountMode: "gross",
    atts: [{ id: "a", name: "r.pdf", type: "application/pdf", size: 1 }],
    ...extra,
  }
}

function context(
  entries: Entry[],
  today: string,
  over: Partial<OverviewContext> = {}
): OverviewContext {
  const year = Number(today.slice(0, 4))
  return {
    entries,
    yearEntries: entries.filter((e) => e.date.startsWith(`${year}-`)),
    cats,
    year,
    today,
    bookStart: null,
    timeline: [],
    form5Filed: {},
    yearEnd: {},
    recurring: [],
    invoices: [],
    yearsArchived: {},
    ...over,
  }
}

const ids = (ctx: OverviewContext) => overviewFindings(ctx).map((f) => f.ruleId)

describe("OVERVIEW_RULES", () => {
  it("gives every rule a source", () => {
    for (const rule of OVERVIEW_RULES.rules) expect(rule.source).not.toBe("")
  })

  it("reminds of bills overdue and bills due within a week", () => {
    const bill = (id: string, due: string): Entry => ({
      id,
      date: "2026-05-01",
      description: id,
      type: "expense",
      catId: "333",
      amount: 5_000,
      vatRate: 0,
      amountMode: "gross",
      paidOn: null,
      due,
    })
    const found = overviewFindings(
      context(
        [
          bill("late", "2026-06-01"),
          bill("soon", "2026-06-18"),
          bill("later", "2026-07-30"),
          { ...bill("paid", "2026-06-02"), paidOn: "2026-06-01" },
        ],
        "2026-06-15"
      )
    )
    const overdue = found.find((f) => f.ruleId === "billsOverdue")
    const soon = found.find((f) => f.ruleId === "billsDueSoon")
    expect(overdue?.severity).toBe("warn")
    expect(overdue?.data).toEqual({
      count: 1,
      total: 5_000,
      first: "2026-06-01",
    })
    expect(soon?.severity).toBe("info")
    expect(soon?.data).toEqual({ count: 1, total: 5_000, first: "2026-06-18" })
  })

  it("finds nothing in an empty book", () => {
    expect(ids(context([], "2026-06-15"))).toEqual([])
  })

  it("reports an overdue return as a blocker and one due soon as a warning", () => {
    const today = "2026-04-20"
    const timeline = vatTimeline("month", "2026-02-01", today, {})
    const found = overviewFindings(context([], today, { timeline }))
    const overdue = found.filter((f) => f.ruleId === "vatOverdue")
    const soon = found.filter((f) => f.ruleId === "vatDueSoon")
    expect(overdue.map((f) => f.severity)).toEqual(["blocker"])
    expect(soon).toHaveLength(1)
    expect(soon[0]?.severity).toBe("warn")
  })

  it("leaves a filed period out", () => {
    const today = "2026-04-20"
    const timeline = vatTimeline("month", "2026-02-01", today, {
      "2026-02": "2026-03-10",
    })
    expect(ids(context([], today, { timeline }))).not.toContain("vatOverdue")
  })

  it("lists empty months from the first entry to the last complete month", () => {
    const entries = [
      sale("a", "2026-02-10"),
      sale("b", "2026-04-10"),
      sale("c", "2026-06-10"),
    ]
    const found = overviewFindings(context(entries, "2026-07-15"))
    const empty = found.find((f) => f.ruleId === "emptyMonths")
    expect(empty?.ruleId === "emptyMonths" && empty.data.months).toEqual([3, 5])
  })

  it("skips empty months before the book's start", () => {
    const entries = [sale("a", "2026-01-10"), sale("b", "2026-05-10")]
    const found = overviewFindings(
      context(entries, "2026-06-15", { bookStart: "2026-04" })
    )
    const empty = found.find((f) => f.ruleId === "emptyMonths")
    expect(empty?.ruleId === "emptyMonths" && empty.data.months).toEqual([4])
  })

  it("counts receipts missing from the file", () => {
    const missing = sale("a", "2026-03-01", {
      atts: [
        {
          id: null,
          name: "x.pdf",
          type: "application/pdf",
          size: 0,
          missing: true,
        },
      ],
    })
    const found = overviewFindings(context([missing], "2026-03-15"))
    const row = found.find((f) => f.ruleId === "missingReceipts")
    expect(row?.ruleId === "missingReceipts" && row.data.count).toBe(1)
  })

  it("reminds about open items", () => {
    const open = sale("a", "2026-03-01", { paidOn: null })
    expect(ids(context([open], "2026-03-15"))).toContain("openItems")
  })

  it("reminds about last year's Form 5 until it is marked filed", () => {
    const last = sale("a", "2025-06-01")
    expect(ids(context([last], "2026-03-01"))).toContain("form5Due")
    expect(
      ids(
        context([last], "2026-03-01", { form5Filed: { "2025": "2026-02-01" } })
      )
    ).not.toContain("form5Due")
  })

  it("offers to open next year in November", () => {
    const found = overviewFindings(
      context([sale("a", "2026-05-01")], "2026-11-10")
    )
    const row = found.find((f) => f.ruleId === "newYear")
    expect(row?.ruleId === "newYear" && row.data.year).toBe(2027)
  })

  it("lists recurring entries due this month", () => {
    const found = overviewFindings(
      context([], "2026-05-10", {
        recurring: [
          {
            id: "r",
            description: "Puhelin",
            type: "expense",
            catId: "372",
            amount: 2_000,
            vatRate: 25.5,
            amountMode: "gross",
            day: 1,
            from: "2026-01",
          },
        ],
      })
    )
    const row = found.find((f) => f.ruleId === "recurringDue")
    expect(row?.ruleId === "recurringDue" && row.data.month).toBe("2026-05")
  })

  it("counts the drafts recurring invoices made that are not issued yet", () => {
    const draft = {
      id: "d",
      number: null,
      date: "2026-05-01",
      dueDate: "2026-05-15",
      supplyFrom: null,
      supplyTo: null,
      customerId: null,
      customer: emptyParty(),
      language: "fi" as const,
      rows: [],
      note: "",
      terms: "",
      reference: null,
      seller: null,
      issuedAt: null,
      entryIds: [],
      credits: null,
    }
    const found = overviewFindings(
      context([], "2026-05-10", {
        invoices: [
          { ...draft, recurring: "r" },
          { ...draft, id: "e", recurring: "r" },
          { ...draft, id: "f" },
        ],
      })
    )
    const row = found.find((f) => f.ruleId === "recurringDrafts")
    expect(row?.ruleId === "recurringDrafts" && row.data.count).toBe(2)
  })

  it("reminds to put away a closed year until it is marked stored", () => {
    const old = sale("a", "2024-06-01")
    const found = overviewFindings(context([old], "2026-03-01"))
    const row = found.find((f) => f.ruleId === "yearToArchive")
    expect(row?.ruleId === "yearToArchive" && row.data).toEqual({
      year: 2024,
      books: "2034-12-31",
      vouchers: "2030-12-31",
    })
    expect(
      ids(context([old], "2026-03-01", { yearsArchived: { "2024": "x" } }))
    ).not.toContain("yearToArchive")
  })

  it("says once per stage when a held year's retention has ended", () => {
    const old = sale("a", "2019-06-01")
    const rows = (over: Partial<OverviewContext> = {}) =>
      overviewFindings(context([old], "2026-03-01", over)).flatMap((f) =>
        f.ruleId === "retentionEnded" ? [f.data] : []
      )
    expect(rows()).toEqual([
      {
        year: 2019,
        stage: "vouchers",
        books: "2029-12-31",
        vouchers: "2025-12-31",
      },
    ])
    expect(rows({ retentionNoted: { "2019": "vouchers" } })).toEqual([])
    /* A year archived out of the book is still the user's to keep. */
    const archived = overviewFindings(
      context([], "2030-01-02", { archives: { "2019": {} } })
    ).flatMap((f) => (f.ruleId === "retentionEnded" ? [f.data.stage] : []))
    expect(archived).toEqual(["books"])
  })

  it("says when the rule tables lack this year", () => {
    expect(ids(context([], "2028-01-05"))).toContain("rulesStale")
  })
})
