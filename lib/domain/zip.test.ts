import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { parseCsv, serializeCsv, type ImportSuccess } from "@/lib/domain/csv"
import { createIdFactory } from "@/lib/domain/id"
import { attachmentKey, buildReceiptPaths } from "@/lib/domain/receipt-path"
import { entriesFromImport } from "@/lib/domain/test-helpers/canonical"
import {
  indexCategories,
  type Attachment,
  type Entry,
} from "@/lib/domain/types"
import {
  dirOf,
  findCsvEntry,
  packZip,
  resolveReceipt,
  unpackZip,
} from "@/lib/domain/zip"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)
const enc = new TextEncoder()

function att(over: Partial<Attachment> = {}): Attachment {
  return {
    id: "a1",
    name: "lasku.pdf",
    type: "application/pdf",
    size: 10,
    ...over,
  }
}

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    date: "2026-10-28",
    description: "Lasku 1005",
    type: "income",
    catId: "300-domestic",
    amount: 188250,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

/** Build the pack inputs for a set of entries, reading synthetic bytes. */
function packInputs(entries: Entry[]) {
  const paths = buildReceiptPaths(entries)
  const attachmentIds = new Map<string, string>()
  for (const e of entries) {
    for (const [i, a] of (e.atts ?? []).entries()) {
      if (a.id) attachmentIds.set(attachmentKey(e.id, i), a.id)
    }
  }
  return {
    csvName: "kirjanpito_2026-10-24.csv",
    csvText: serializeCsv(entries, cats, paths),
    paths,
    attachmentIds,
    read: async (id: string) => enc.encode(`bytes-${id}`),
  }
}

function ok(result: ReturnType<typeof parseCsv>): ImportSuccess {
  if (!result.ok) throw new Error(`expected success, got ${result.code}`)
  return result
}

describe("findCsvEntry", () => {
  it("picks the shallowest CSV", () => {
    expect(findCsvEntry(["a/b/x.csv", "y.csv"])).toBe("y.csv")
  })

  it("ignores __MACOSX", () => {
    expect(findCsvEntry(["__MACOSX/x.csv", "deep/a/b/y.csv"])).toBe(
      "deep/a/b/y.csv"
    )
  })

  it("breaks depth ties deterministically", () => {
    expect(findCsvEntry(["b.csv", "a.csv"])).toBe("a.csv")
  })

  it("returns null when there is no CSV", () => {
    expect(findCsvEntry(["a.jpg", "b/c.pdf"])).toBeNull()
  })
})

describe("dirOf", () => {
  it("returns the folder with a trailing slash, or empty at the root", () => {
    expect(dirOf("kirjanpito/data.csv")).toBe("kirjanpito/")
    expect(dirOf("data.csv")).toBe("")
  })
})

describe("packZip", () => {
  it("lays the archive out as documented", async () => {
    const entries = [entry({ atts: [att({ id: "a1", name: "lasku.pdf" })] })]
    const unpacked = (await unpackZip(await packZip(packInputs(entries))))!
    expect(unpacked.csvPath).toBe("kirjanpito_2026-10-24.csv")
    expect([...unpacked.files.keys()]).toEqual([
      "tositteet/2026/10/2026-10-28_lasku-1005.pdf",
    ])
  })

  it("stores receipts uncompressed and deflates the CSV", async () => {
    // Incompressible receipt bytes next to a highly repetitive CSV.
    const random = new Uint8Array(64 * 1024)
    for (let i = 0; i < random.length; i++) random[i] = (i * 2654435761) & 0xff
    const csvText = "pvm;tyyppi;summa\r\n".repeat(4000)

    const bytes = await packZip({
      csvName: "a.csv",
      csvText,
      paths: new Map([["k", "tositteet/2026/01/x.bin"]]),
      attachmentIds: new Map([["k", "id1"]]),
      read: async () => random,
    })

    /*
     * A STORE'd 64 KB payload plus a deflated CSV must land well under the
     * uncompressed total; if the CSV were stored too it would be far larger.
     */
    expect(bytes.byteLength).toBeGreaterThan(random.byteLength)
    expect(bytes.byteLength).toBeLessThan(
      random.byteLength + csvText.length / 4
    )
  })

  it("skips an attachment whose reader returns null", async () => {
    const entries = [entry({ atts: [att({ id: "gone" })] })]
    const bytes = await packZip({
      ...packInputs(entries),
      read: async () => null,
    })
    const unpacked = (await unpackZip(bytes))!
    expect(unpacked.files.size).toBe(0)
  })

  it("skips an attachment with no stored id", async () => {
    const entries = [entry({ atts: [att({ id: null, name: "x.pdf" })] })]
    const unpacked = (await unpackZip(await packZip(packInputs(entries))))!
    expect(unpacked.files.size).toBe(0)
  })
})

describe("unpackZip", () => {
  it("round-trips text and bytes exactly", async () => {
    const entries = [entry({ atts: [att({ id: "a1" })] })]
    const input = packInputs(entries)
    const unpacked = (await unpackZip(await packZip(input)))!
    expect(unpacked.csvText).toBe(input.csvText)
    expect([...unpacked.files.values()][0]).toEqual(enc.encode("bytes-a1"))
  })

  it("returns null for an archive with no CSV", async () => {
    const bytes = await packZip({
      csvName: "notes.txt",
      csvText: "ei csv",
      paths: new Map(),
      attachmentIds: new Map(),
      read: async () => null,
    })
    expect(await unpackZip(bytes)).toBeNull()
  })
})

describe("resolveReceipt", () => {
  const files = new Map([
    ["kirjanpito/tositteet/2026/01/a.jpg", enc.encode("nested")],
    ["tositteet/2026/01/b.jpg", enc.encode("root")],
  ])

  it("resolves relative to the CSV's folder", () => {
    expect(
      resolveReceipt(files, "kirjanpito/", "tositteet/2026/01/a.jpg")
    ).toEqual(enc.encode("nested"))
  })

  it("falls back to the archive root", () => {
    expect(
      resolveReceipt(files, "kirjanpito/", "tositteet/2026/01/b.jpg")
    ).toEqual(enc.encode("root"))
  })

  it("returns null for a path that is not there", () => {
    expect(resolveReceipt(files, "", "tositteet/nope.jpg")).toBeNull()
  })
})

describe("full ZIP round trip", () => {
  const entries = [
    entry({
      id: "e1",
      date: "2026-01-15",
      description: "Osto – K-Rauta – tarvikkeet",
      type: "expense",
      catId: "333",
      amount: 18640,
      atts: [
        att({ id: "a1", name: "kuitti.jpg", type: "image/jpeg" }),
        att({ id: "a2", name: "lasku.pdf" }),
      ],
    }),
    entry({ id: "e2", atts: [att({ id: "a3", name: "lasku.pdf" })] }),
  ]

  it("restores every receipt", async () => {
    const bytes = await packZip(packInputs(entries))
    const unpacked = (await unpackZip(bytes))!
    const imported = ok(
      parseCsv(unpacked.csvText, baseCats, createIdFactory("r"))
    )
    const csvDir = dirOf(unpacked.csvPath)

    const resolved = imported.entries.flatMap((e) =>
      e.paths.map((p) => resolveReceipt(unpacked.files, csvDir, p))
    )
    expect(resolved).toHaveLength(3)
    expect(resolved.every(Boolean)).toBe(true)
    expect(resolved[0]).toEqual(enc.encode("bytes-a1"))
    expect(resolved[2]).toEqual(enc.encode("bytes-a3"))
  })

  it("resolves receipts when the CSV sits in a subfolder", async () => {
    const input = packInputs(entries)
    const bytes = await packZip({
      ...input,
      csvName: "kirjanpito/data.csv",
      paths: new Map([...input.paths].map(([k, v]) => [k, `kirjanpito/${v}`])),
    })
    const unpacked = (await unpackZip(bytes))!
    expect(dirOf(unpacked.csvPath)).toBe("kirjanpito/")
    const imported = ok(
      parseCsv(unpacked.csvText, baseCats, createIdFactory("r"))
    )
    const first = imported.entries[0].paths[0]
    expect(
      resolveReceipt(unpacked.files, dirOf(unpacked.csvPath), first)
    ).toEqual(enc.encode("bytes-a1"))
  })

  /*
   * §7.2: importing a plain CSV keeps the paths so re-exporting does not lose
   * the reference.
   */
  it("yields missing attachments that keep their paths on a plain CSV import", () => {
    const text = serializeCsv(entries, cats)
    const imported = ok(parseCsv(text, baseCats, createIdFactory("r")))
    const restored = entriesFromImport(imported.entries)
    const atts = restored.flatMap((e) => e.atts ?? [])
    expect(atts).toHaveLength(3)
    expect(atts.every((a) => a.missing && a.id === null)).toBe(true)
    expect(atts.map((a) => a.path)).toEqual([
      "tositteet/2026/01/2026-01-15_osto-k-rauta-tarvikkeet_1.jpg",
      "tositteet/2026/01/2026-01-15_osto-k-rauta-tarvikkeet_2.pdf",
      "tositteet/2026/10/2026-10-28_lasku-1005.pdf",
    ])
  })
})
