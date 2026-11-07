import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { auditQuickRanges, validAuditRange } from "@/lib/domain/audit-range"
import { accountList, generalLedger, journal } from "@/lib/domain/books"
import { createIdFactory } from "@/lib/domain/id"
import {
  HASH_FILE,
  README_FILE,
  RECEIPT_HASH_FILE,
  auditPackageName,
  buildAuditPackageFiles,
} from "@/lib/domain/retention-package"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { assignVouchers } from "@/lib/domain/voucher"
import {
  auditReports,
  type AuditReportInput,
  type ReportDoc,
} from "@/lib/domain/year-reports"
import { createFormatters } from "@/lib/i18n/create-formatters"

/* The audit package (§8.25). */

const entries = [...assignVouchers(sampleEntries(createIdFactory("a")))]
const cats = defaultCategories()
const catMap = indexCategories(cats)
const fi = createFormatters("fi")

const input: AuditReportInput = {
  entries,
  cats,
  traderType: "business",
  businessName: "Oma Yritys",
  businessId: "0112038-9",
  exportLang: "fi",
  vatPeriod: "quarter",
  bookStart: null,
  vatFiled: {},
  vatFiledFigures: {},
}

const firstHalf = { from: "2026-01-01", to: "2026-06-30" }

function dated(range: { from: string; to: string }): Entry[] {
  return entries.filter((e) => e.date >= range.from && e.date <= range.to)
}

describe("books over a range", () => {
  it("holds only the entries dated in the range, ends included", () => {
    const one = { from: "2026-01-08", to: "2026-01-15" }
    const book = journal(entries, catMap, one)
    expect(book.months.flatMap((m) => m.rows).map((r) => r.entry.date)).toEqual(
      dated(one).map((e) => e.date)
    )
  })

  it("keeps a year as a scope that means the calendar year", () => {
    const year = journal(entries, catMap, 2026)
    const range = journal(entries, catMap, {
      from: "2026-01-01",
      to: "2026-12-31",
    })
    expect(range.income).toEqual(year.income)
    expect(range.expense).toEqual(year.expense)
  })

  it("starts a new month group when the year changes", () => {
    const december = entries[0]
    const moved: Entry[] = [
      { ...december, id: "x1", date: "2025-12-20" },
      { ...december, id: "x2", date: "2026-12-21" },
    ]
    const months = journal(moved, catMap, {
      from: "2025-01-01",
      to: "2026-12-31",
    }).months
    expect(months.map((m) => [m.year, m.month])).toEqual([
      [2025, 12],
      [2026, 12],
    ])
  })

  it("totals each account over the range only", () => {
    const accounts = generalLedger(entries, catMap, firstHalf)
    const rows = accounts.flatMap((a) => a.rows)
    expect(rows.length).toBe(dated(firstHalf).length)
  })

  it("lists the accounts used in the range", () => {
    const list = accountList(entries, cats, {
      from: "2026-03-03",
      to: "2026-03-03",
    })
    expect(list.length).toBeGreaterThan(0)
  })
})

describe("audit reports", () => {
  const docs = auditReports(fi, input, firstHalf)
  const text = (doc: ReportDoc) => JSON.stringify(doc)

  it("makes the three books and then the VAT returns of whole periods", () => {
    expect(docs.slice(0, 3).map((d) => d.id)).toEqual([
      "journal",
      "ledger",
      "accounts",
    ])
    expect(docs.slice(3).every((d) => d.id === "vat")).toBe(true)
    expect(docs.slice(3).length).toBe(2)
  })

  it("names the range under every title", () => {
    for (const doc of docs.slice(0, 3)) {
      expect(doc.title).toContain("1.1.2026")
      expect(doc.title).toContain("30.6.2026")
      expect(doc.header.at(-2)).toContain("30.6.2026")
    }
  })

  it("leaves a period cut by the range out", () => {
    const cut = auditReports(fi, input, {
      from: "2026-02-01",
      to: "2026-06-30",
    })
    expect(cut.filter((d) => d.id === "vat").length).toBe(1)
  })

  it("has no reconciliation to a statement", () => {
    expect(text(docs[1])).not.toContain("reconTitle")
    expect(docs[1].blocks.filter((b) => b.kind === "table")).toHaveLength(1)
  })

  it("says so when the range has no vouchers", () => {
    const empty = auditReports(fi, input, {
      from: "2020-01-01",
      to: "2020-12-31",
    })
    expect(empty[0].blocks[0]).toMatchObject({
      kind: "text",
      text: expect.stringContaining("2020"),
    })
  })
})

describe("audit package files", () => {
  const book = { name: "kirjanpito-x.zip", bytes: new Uint8Array([1, 2, 3]) }
  const reports = [{ title: "Päiväkirja", bytes: new Uint8Array([4]) }]

  it("names the file for the range and the language", () => {
    expect(auditPackageName("kirjanpito", firstHalf, "fi")).toBe(
      "kirjanpito-2026-01-01_2026-06-30-tarkastuspaketti.zip"
    )
    expect(auditPackageName("books", firstHalf, "en")).toBe(
      "books-2026-01-01_2026-06-30-audit-package.zip"
    )
  })

  it("holds the reports, the book, both hash lists and a README", async () => {
    const files = await buildAuditPackageFiles({
      f: fi,
      range: firstHalf,
      exportLang: "fi",
      reports,
      book,
      receiptHashes: [],
      encrypted: false,
    })
    expect(files.map((f) => f.path).sort()).toEqual(
      [
        "raportit/1 - Päiväkirja.pdf",
        book.name,
        RECEIPT_HASH_FILE,
        README_FILE,
        HASH_FILE,
      ].sort()
    )
    const readme = new TextDecoder().decode(
      files.find((f) => f.path === README_FILE)!.bytes
    )
    expect(readme).toContain("Tarkastuspaketti")
    expect(readme).toContain("30.6.2026")
    expect(readme).toContain(book.name)
  })
})

describe("quick ranges", () => {
  it("gives whole years and the quarter before today's", () => {
    const q = auditQuickRanges("2026-11-07")
    expect(q.thisYear).toEqual({ from: "2026-01-01", to: "2026-12-31" })
    expect(q.lastYear).toEqual({ from: "2025-01-01", to: "2025-12-31" })
    expect(q.lastQuarter).toEqual({ from: "2026-07-01", to: "2026-09-30" })
  })

  it("takes last year's fourth quarter in the first quarter", () => {
    expect(auditQuickRanges("2026-02-10").lastQuarter).toEqual({
      from: "2025-10-01",
      to: "2025-12-31",
    })
  })

  it("accepts a range in order and refuses one that is not", () => {
    expect(validAuditRange(firstHalf)).toBe(true)
    expect(validAuditRange({ from: "2026-07-01", to: "2026-01-01" })).toBe(
      false
    )
    expect(validAuditRange({ from: "", to: "2026-01-01" })).toBe(false)
  })
})
