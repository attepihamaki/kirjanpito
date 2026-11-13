// @vitest-environment jsdom
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { storeInboxFile } from "@/lib/commands/inbox-commands"
import { buildBookFile, openFile } from "@/lib/commands/io-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { journal } from "@/lib/domain/books"
import { isShare } from "@/lib/domain/calc"
import { demoBook, receiptPdf } from "@/lib/domain/demo-book"
import { SETTINGS_VERSION } from "@/lib/domain/settings-file"
import { carveSplit } from "@/lib/domain/split"
import { indexCategories } from "@/lib/domain/types"
import { unpackZip } from "@/lib/domain/zip"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/*
 * Every book file an earlier build wrote has to keep opening, with the same
 * figures (§7.6). `test/fixtures/books` holds one ZIP per format the app has
 * written, each beside a JSON of what opening it gave when it was made. This
 * test opens every one through the real open path and compares.
 *
 * A change to `SETTINGS_VERSION` or the CSV columns adds a fixture: run
 *   WRITE_BOOK_FIXTURE=1 npx vitest run lib/commands/book-fixtures.test.ts
 * and commit the two new files. Never edit or delete an old fixture to make
 * the test pass; a figure that moved is a book that would open differently.
 */

const FIXTURES = join(process.cwd(), "test", "fixtures", "books")

/** The day the fixture book is written as of, so the demo book is the same every time. */
const FIXTURE_TODAY = "2026-11-13"

/*
 * jsdom's Blob does not survive fake-indexeddb's structured clone in a form
 * the ZIP reader can use, so the store is a map that hands back what it got.
 */
const stored = new Map<string, Blob | Uint8Array>()
vi.mock("@/lib/browser/receipt-store", async (original) => {
  const actual = await original<typeof import("@/lib/browser/receipt-store")>()
  return {
    ...actual,
    putReceipt: vi.fn(async (id: string, blob: Blob) => {
      stored.set(id, blob)
    }),
    getReceipt: vi.fn(async (id: string) => stored.get(id)),
  }
})

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

/** What an opened book must still say: counts, the features in use and every year's totals. */
function summary() {
  const s = useBookStore.getState()
  const cats = indexCategories(s.cats)
  const years = [...new Set(s.entries.map((e) => e.date.slice(0, 4)))].sort()
  return {
    entries: s.entries.length,
    vouchers: s.entries
      .map((e) => e.voucher ?? 0)
      .sort((a, b) => a - b)
      .join(","),
    shared: s.entries.filter((e) => isShare(e.share)).length,
    split: s.entries.filter((e) => e.split !== undefined).length,
    tagged: s.entries.filter((e) => e.tags?.length).length,
    noted: s.entries.filter((e) => e.note).length,
    attachments: s.entries.reduce((n, e) => n + (e.atts?.length ?? 0), 0),
    rules: s.categoryRules.map((r) => ({
      contains: r.contains,
      catId: r.catId,
      vatRate: r.vatRate,
      share: r.share ?? null,
    })),
    invoices: s.invoices.length,
    customers: s.customers.length,
    inbox: s.inbox.length,
    vatFiled: Object.keys(s.vatFiled).sort(),
    businessName: s.businessName,
    years: Object.fromEntries(
      years.map((y) => {
        const book = journal(s.entries, cats, Number(y))
        return [y, { income: book.income, expense: book.expense }]
      })
    ),
  }
}

/** The demo book with one of every feature the file format carries that the demo leaves out. */
async function fixtureBook(): Promise<void> {
  const { receipts, ...book } = demoBook(FIXTURE_TODAY)
  const inbox = []
  for (const receipt of receipts) {
    const file = new File(
      [receiptPdf(receipt.lines(FIXTURE_TODAY)) as BlobPart],
      receipt.name,
      { type: "application/pdf" }
    )
    inbox.push(await storeInboxFile(file, FIXTURE_TODAY, receipt.name))
  }
  useBookStore.getState().startDemo({
    ...book,
    inbox,
    businessName: "Fixture Oy",
    businessId: "1234567-1",
    filed: [{ key: `${book.year}-01`, on: `${book.year}-02-12` }],
  })

  stored.set("a-receipt", new TextEncoder().encode("%PDF-1.4 fixture"))
  const entries = useBookStore.getState().entries.map((e, i) => {
    if (e.description.startsWith("Puhelinliittymä")) return { ...e, share: 60 }
    if (i === 1) {
      return {
        ...e,
        tags: ["projekti-a"],
        note: "Tarkista kuitti",
        atts: [
          {
            id: "a-receipt",
            name: "kuitti.pdf",
            type: "application/pdf",
            size: 16,
          },
        ],
      }
    }
    return e
  })
  const supplies = entries.find((e) => e.catId === "333")!
  const carved = carveSplit(
    supplies,
    { amount: 2_000, catId: "344-meeting", vatRate: 13.5 },
    indexCategories(useBookStore.getState().cats),
    { part: "e-split-part", split: "split-1" }
  )
  if (!carved.ok) throw new Error(carved.error)
  /* Through the store's own actions, which number the vouchers and log the change. */
  const store = useBookStore.getState()
  store.updateEntries(
    entries.map((e) => (e.id === supplies.id ? carved.original : e))
  )
  store.addEntries([carved.part])
  useBookStore.setState({
    categoryRules: [
      {
        id: "r1",
        contains: "Elisa",
        catId: "344-other",
        vatRate: null,
        share: 60,
      },
      { id: "r2", contains: "Neste", catId: "344-vehicle", vatRate: 25.5 },
    ],
    dirty: true,
  })
}

async function reopen(bytes: Uint8Array, name: string): Promise<void> {
  useBookStore.setState(useBookStore.getInitialState())
  await openFile(ctx, new File([bytes as BlobPart], name))
}

beforeEach(() => {
  stored.clear()
  useBookStore.setState(useBookStore.getInitialState())
})

const fixtures = readdirSync(FIXTURES)
  .filter((name) => name.endsWith(".zip"))
  .sort()

describe("book files written by earlier builds (§7.6)", () => {
  it.runIf(process.env.WRITE_BOOK_FIXTURE)(
    "writes a fixture of the current format",
    async () => {
      await fixtureBook()
      const file = await buildBookFile("kirjanpito")
      const bytes = new Uint8Array(await file.blob.arrayBuffer())
      const name = `v${SETTINGS_VERSION}-${FIXTURE_TODAY}`
      /* What reading gives, not what was in memory, is the baseline. */
      await reopen(bytes, `${name}.zip`)
      mkdirSync(FIXTURES, { recursive: true })
      writeFileSync(join(FIXTURES, `${name}.zip`), bytes)
      writeFileSync(
        join(FIXTURES, `${name}.json`),
        `${JSON.stringify(summary(), null, 2)}\n`
      )
    }
  )

  /* Skipped while writing, since the folder was listed before the new fixture existed. */
  it.skipIf(process.env.WRITE_BOOK_FIXTURE)(
    "has a fixture of the current settings version",
    async () => {
      const versions = await Promise.all(
        fixtures.map(async (name) => {
          const zip = await unpackZip(readFileSync(join(FIXTURES, name)))
          return JSON.parse(zip?.settingsText ?? "{}").version
        })
      )
      expect(versions).toContain(SETTINGS_VERSION)
    }
  )

  it.each(fixtures)(
    "opens %s with the figures it was written with",
    async (name) => {
      const bytes = new Uint8Array(readFileSync(join(FIXTURES, name)))
      const expected = JSON.parse(
        readFileSync(join(FIXTURES, name.replace(/\.zip$/, ".json")), "utf8")
      )
      await reopen(bytes, name)
      expect(summary()).toEqual(expected)
      expect(useBookStore.getState().dirty).toBe(false)
    }
  )
})
