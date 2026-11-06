import { describe, expect, it } from "vitest"

import { renderReportPdf } from "@/lib/browser/report-pdf"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sha256Bytes } from "@/lib/domain/integrity"
import {
  HASH_FILE,
  README_FILE,
  RECEIPT_HASH_FILE,
  buildPackageFiles,
  hashList,
  packageFileName,
  reportFileName,
} from "@/lib/domain/retention-package"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { assignVouchers } from "@/lib/domain/voucher"
import {
  yearReports,
  type ReportDoc,
  type ReportRow,
  type YearReportInput,
} from "@/lib/domain/year-reports"
import { packFiles, unpackZip } from "@/lib/domain/zip"
import { createFormatters } from "@/lib/i18n/create-formatters"

/* The year archive package (§8.21). */

const entries = [...assignVouchers(sampleEntries(createIdFactory("p")))]
const input: YearReportInput = {
  year: 2026,
  entries,
  cats: defaultCategories(),
  traderType: "business",
  yearEnd: undefined,
  assetOpening: null,
  loanOpening: null,
  businessName: "Oma Yritys",
  businessId: "0112038-9",
  exportLang: "fi",
}
const fi = createFormatters("fi")
const en = createFormatters("en")

/** Every cell of every table of a report, flattened to find a figure. */
function cells(doc: ReportDoc): string[] {
  return doc.blocks.flatMap((b) =>
    b.kind === "table"
      ? b.rows.flatMap((r: ReportRow) =>
          r.kind === "data"
            ? r.cells
            : r.kind === "total"
              ? [r.label, ...r.cells]
              : r.kind === "group" || r.kind === "heading"
                ? [r.text]
                : []
        )
      : [b.text]
  )
}

/** `Intl` writes a no-break space before the euro sign; compare without it. */
const plain = (s: string) => s.replace(/[  ]/g, " ").replace(/−/g, "-")

describe("year reports", () => {
  const docs = yearReports(fi, input)
  const byId = Object.fromEntries(docs.map((d) => [d.id, d]))

  it("makes the five reports in the order of the package", () => {
    expect(docs.map((d) => d.id)).toEqual([
      "journal",
      "ledger",
      "accounts",
      "statement",
      "form5",
    ])
    expect(docs.map((d) => d.title)).toEqual([
      "Päiväkirja 2026",
      "Pääkirja 2026",
      "Tililuettelo 2026",
      "Tuloslaskelma 2026",
      "Lomake 5 2026",
    ])
  })

  it("names the business and the period under every title", () => {
    for (const doc of docs) {
      expect(doc.header[0]).toBe("Oma Yritys · Y-tunnus 0112038-9")
      expect(doc.header[1]).toContain("1.1.2026")
    }
  })

  it("gives the journal the §10 totals", () => {
    const text = cells(byId.journal).map(plain)
    expect(text).toContain("12 500,00 €")
    expect(text).toContain("-1 857,47 €")
  })

  it("lists every voucher of the year once in the journal", () => {
    const numbers = byId.journal.blocks
      .flatMap((b) => (b.kind === "table" ? b.rows : []))
      .flatMap((r) => (r.kind === "data" ? [r.cells[0]] : []))
    expect(numbers).toEqual(Array.from({ length: 16 }, (_, i) => String(i + 1)))
  })

  it("ends the statement in the §10 result", () => {
    const text = cells(byId.statement).map(plain)
    expect(text).toContain("358 Elinkeinotoiminnan tulos")
    expect(text).toContain("10 642,53 €")
  })

  it("puts the result in Form 5's field 358", () => {
    const rows = byId.form5.blocks
      .flatMap((b) => (b.kind === "table" ? b.rows : []))
      .flatMap((r) => (r.kind === "data" ? [r.cells] : []))
    const result = rows.find((c) => c[0] === "358")
    expect(plain(result?.[2] ?? "")).toBe("10 642,53 €")
  })

  it("lists the books of KPL 2:7a with the receipt folder of the book", () => {
    const text = cells(byId.accounts).join("\n")
    expect(text).toContain("liitteet")
    expect(text).toContain("Liikevaihto")
  })

  it("follows the export language", () => {
    const english = yearReports(en, { ...input, exportLang: "en" })
    expect(english[0].title).toBe("Journal 2026")
    expect(english[3].title).toBe("Income statement 2026")
  })

  it("keeps a year with no vouchers readable", () => {
    const empty = yearReports(fi, { ...input, year: 2020 })
    expect(cells(empty[0])).toEqual(["Ei tositteita vuonna 2020."])
  })
})

describe("report PDFs", () => {
  it("renders every report to a PDF that has pages", async () => {
    for (const doc of yearReports(fi, input)) {
      const bytes = await renderReportPdf(doc)
      expect(new TextDecoder().decode(bytes.slice(0, 5)), doc.id).toBe("%PDF-")
      expect(bytes.length, doc.id).toBeGreaterThan(1000)
    }
  })

  it("spreads a long journal over several pages", async () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      ...entries[0],
      id: `m${i}`,
      voucher: 100 + i,
      description: `Rivi ${i}`,
    }))
    const [journalDoc] = yearReports(fi, { ...input, entries: many })
    const bytes = await renderReportPdf(journalDoc)
    const { PDFDocument } = await import("pdf-lib")
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(3)
  })
})

describe("package", () => {
  const book = { name: "kirjanpito-2026.zip", bytes: new Uint8Array([1, 2, 3]) }
  const reports = [
    { title: "Päiväkirja 2026", bytes: new Uint8Array([4, 5]) },
    { title: "Pääkirja 2026", bytes: new Uint8Array([6]) },
  ]

  it("names the files for the order and the language", () => {
    expect(reportFileName(0, "Päiväkirja 2026")).toBe("1 - Päiväkirja 2026.pdf")
    expect(packageFileName("kirjanpito", 2026, "fi")).toBe(
      "kirjanpito-2026-sailytyspaketti.zip"
    )
    expect(packageFileName("books", 2026, "en")).toBe(
      "books-2026-retention-package.zip"
    )
  })

  it("writes the hash list in the form sha256sum -c reads", () => {
    expect(
      hashList([
        { path: "b.txt", hash: "bb" },
        { path: "a.txt", hash: "aa" },
      ])
    ).toBe("aa  a.txt\nbb  b.txt\n")
  })

  it("hashes every file except the hash list itself", async () => {
    const files = await buildPackageFiles({
      f: fi,
      year: 2026,
      exportLang: "fi",
      reports,
      book,
      receiptHashes: [{ path: "liitteet/2026/01/a.jpg", hash: "ab" }],
      encrypted: false,
    })
    const paths = files.map((f) => f.path).sort()
    expect(paths).toEqual(
      [
        "raportit/1 - Päiväkirja 2026.pdf",
        "raportit/2 - Pääkirja 2026.pdf",
        "kirjanpito-2026.zip",
        RECEIPT_HASH_FILE,
        README_FILE,
        HASH_FILE,
      ].sort()
    )

    const list = new TextDecoder().decode(
      files.find((f) => f.path === HASH_FILE)!.bytes
    )
    const listed = list
      .trim()
      .split("\n")
      .map((l) => l.split("  "))
    expect(listed.map(([, p]) => p).sort()).toEqual(
      paths.filter((p) => p !== HASH_FILE).sort()
    )
    for (const [hash, path] of listed) {
      const file = files.find((f) => f.path === path)!
      expect(hash, path).toBe(await sha256Bytes(file.bytes))
    }
  })

  it("records the receipts by their paths inside the book ZIP", async () => {
    const files = await buildPackageFiles({
      f: fi,
      year: 2026,
      exportLang: "fi",
      reports,
      book,
      receiptHashes: [{ path: "liitteet/2026/01/a.jpg", hash: "ab" }],
      encrypted: false,
    })
    const text = new TextDecoder().decode(
      files.find((f) => f.path === RECEIPT_HASH_FILE)!.bytes
    )
    expect(text).toBe("ab  liitteet/2026/01/a.jpg\n")
  })

  it("says in the README when the book ZIP is encrypted", async () => {
    const readme = async (encrypted: boolean) =>
      new TextDecoder().decode(
        (
          await buildPackageFiles({
            f: en,
            year: 2026,
            exportLang: "en",
            reports,
            book,
            receiptHashes: [],
            encrypted,
          })
        ).find((f) => f.path === README_FILE)!.bytes
      )
    expect(await readme(true)).toContain("is encrypted, but the reports")
    expect(await readme(false)).not.toContain("is encrypted, but the reports")
    expect(await readme(false)).toContain(
      "31.12.2036".replace("31.12.", "31 Dec ")
    )
  })

  it("round-trips through a ZIP that stays unencrypted", async () => {
    const files = await buildPackageFiles({
      f: fi,
      year: 2026,
      exportLang: "fi",
      reports,
      book,
      receiptHashes: [],
      encrypted: true,
    })
    const bytes = await packFiles(files)
    expect(new TextDecoder().decode(bytes.slice(0, 2))).toBe("PK")
    /* No CSV in the package, so the reader reports it is not a book. */
    expect(await unpackZip(bytes)).toBeNull()
  })
})
