import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import { parseCsv, serializeCsv, type ImportSuccess } from "@/lib/domain/csv"
import { createIdFactory } from "@/lib/domain/id"
import {
  CSV_FILE_NAME,
  attachmentKey,
  buildReceiptPaths,
} from "@/lib/domain/receipt-path"
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
  receiptReader,
  unpackZip,
  ZipEntryTooLargeError,
  ZipPasswordRequiredError,
  ZipWrongPasswordError,
} from "@/lib/domain/zip"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)
const SETTINGS_TEXT = '{"version":1}'
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
    csvName: CSV_FILE_NAME.fi,
    csvText: serializeCsv(entries, cats, { paths }),
    paths,
    attachmentIds,
    read: async (id: string) => enc.encode(`bytes-${id}`),
    settingsText: SETTINGS_TEXT,
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

describe("packZip with a receipt two entries share", () => {
  const shared = att({ id: "a-shared", name: "kuitti.pdf" })
  const entries = [
    entry({ id: "e1", description: "Työkalut", atts: [shared] }),
    entry({ id: "e2", description: "Lounas", atts: [{ ...shared }] }),
  ]

  it("writes the file once and reads it once", async () => {
    const reads: string[] = []
    const input = packInputs(entries)
    const unpacked = (await unpackZip(
      await packZip({
        ...input,
        read: async (id) => {
          reads.push(id)
          return enc.encode(`bytes-${id}`)
        },
      })
    ))!
    expect(unpacked.otherFiles).toEqual(["liitteet/2026/10/kuitti.pdf"])
    expect(reads).toEqual(["a-shared"])
  })

  it("comes back as one stored file listed by both entries", async () => {
    const unpacked = (await unpackZip(await packZip(packInputs(entries))))!
    const parsed = ok(
      parseCsv(unpacked.csvText, baseCats, createIdFactory("t"))
    )
    expect(parsed.entries.map((e) => e.paths)).toEqual([
      ["liitteet/2026/10/kuitti.pdf"],
      ["liitteet/2026/10/kuitti.pdf"],
    ])
  })

  it("reports an absent shared file for each entry that lists it", async () => {
    const absent: string[] = []
    await packZip({
      ...packInputs(entries),
      read: async () => null,
      onAbsent: (key) => absent.push(key),
    })
    expect(absent.sort()).toEqual(["e1#0", "e2#0"])
  })
})

describe("packZip", () => {
  it("lays the archive out as documented", async () => {
    const entries = [entry({ atts: [att({ id: "a1", name: "lasku.pdf" })] })]
    const unpacked = (await unpackZip(await packZip(packInputs(entries))))!
    expect(unpacked.csvPath).toBe("tositteet.csv")
    expect(unpacked.settingsText).toBe(SETTINGS_TEXT)
    expect(unpacked.otherFiles).toEqual(["liitteet/2026/10/lasku.pdf"])
  })

  it("reads an archive without settings.json as having none", async () => {
    const { ZipWriter, Uint8ArrayWriter, TextReader } =
      await import("@zip.js/zip.js/index-native.js")
    const zip = new ZipWriter(new Uint8ArrayWriter())
    await zip.add("a.csv", new TextReader("date;type;amount"))
    const bytes = await zip.close()
    expect((await unpackZip(bytes))?.settingsText).toBeNull()
  })

  it("stores receipts uncompressed and deflates the CSV", async () => {
    // Incompressible receipt bytes next to a highly repetitive CSV.
    const random = new Uint8Array(64 * 1024)
    for (let i = 0; i < random.length; i++) random[i] = (i * 2654435761) & 0xff
    const csvText = "date;type;amount\r\n".repeat(4000)

    const bytes = await packZip({
      csvName: "a.csv",
      csvText,
      paths: new Map([["k", "liitteet/2026/01/x.bin"]]),
      attachmentIds: new Map([["k", "id1"]]),
      read: async () => random,
      settingsText: SETTINGS_TEXT,
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
    expect(unpacked.otherFiles.length).toBe(0)
  })

  it("skips an attachment with no stored id", async () => {
    const entries = [entry({ atts: [att({ id: null, name: "x.pdf" })] })]
    const unpacked = (await unpackZip(await packZip(packInputs(entries))))!
    expect(unpacked.otherFiles.length).toBe(0)
  })
})

describe("unpackZip", () => {
  it("round-trips text and bytes exactly", async () => {
    const entries = [entry({ atts: [att({ id: "a1" })] })]
    const input = packInputs(entries)
    const unpacked = (await unpackZip(await packZip(input)))!
    expect(unpacked.csvText).toBe(input.csvText)
    expect(await unpacked.readReceipt(unpacked.otherFiles[0])).toEqual(
      enc.encode("bytes-a1")
    )
  })

  it("returns null for an archive with no CSV", async () => {
    const bytes = await packZip({
      csvName: "notes.txt",
      csvText: "ei csv",
      paths: new Map(),
      attachmentIds: new Map(),
      read: async () => null,
      settingsText: SETTINGS_TEXT,
    })
    expect(await unpackZip(bytes)).toBeNull()
  })
})

describe("readReceipt", () => {
  const archive = (csvName: string, path: string) =>
    packZip({
      csvName,
      csvText: "date;type;amount\r\n",
      paths: new Map([["e#0", path]]),
      attachmentIds: new Map([["e#0", "a1"]]),
      read: async () => enc.encode("kuitti"),
      settingsText: SETTINGS_TEXT,
    })

  it("resolves relative to the CSV's folder", async () => {
    const bytes = await archive("kirjanpito/data.csv", "kirjanpito/a.jpg")
    const unpacked = (await unpackZip(bytes))!
    expect(await unpacked.readReceipt("a.jpg")).toEqual(enc.encode("kuitti"))
  })

  it("falls back to the archive root", async () => {
    const bytes = await archive("kirjanpito/data.csv", "liitteet/a.jpg")
    const unpacked = (await unpackZip(bytes))!
    expect(await unpacked.readReceipt("liitteet/a.jpg")).toEqual(
      enc.encode("kuitti")
    )
  })

  it("returns null for a path that is not there", async () => {
    const unpacked = (await unpackZip(await archive("data.csv", "a.jpg")))!
    expect(await unpacked.readReceipt("liitteet/nope.jpg")).toBeNull()
  })

  /*
   * Changing the export language renames the receipt folder, so a save asks
   * the file it is replacing for a path that file never held. Finding the
   * receipt by its name is what keeps it from being dropped (§7.2).
   */
  it("finds a receipt that has moved to another folder", async () => {
    const bytes = await archive("data.csv", "tositteet/2026/10/a.jpg")
    const unpacked = (await unpackZip(bytes))!
    expect(await unpacked.readReceipt("liitteet/2026/10/a.jpg")).toEqual(
      enc.encode("kuitti")
    )
  })

  /** Two receipts of the same archive, at the paths given. */
  async function archiveOf(...paths: string[]) {
    const bytes = await packZip({
      csvName: "data.csv",
      csvText: "date;type;amount\r\n",
      paths: new Map(paths.map((p, i) => [`e#${i}`, p])),
      attachmentIds: new Map(paths.map((_, i) => [`e#${i}`, `a${i}`])),
      read: async (id) => enc.encode(id),
      settingsText: SETTINGS_TEXT,
    })
    return (await unpackZip(bytes))!
  }

  /*
   * Two receipts of different months may well share a name, so the folder
   * rename must not make either ambiguous: the month is part of the path.
   */
  it("tells two receipts of the same name apart by their month", async () => {
    const unpacked = await archiveOf(
      "tositteet/2026/10/a.jpg",
      "tositteet/2026/11/a.jpg"
    )
    expect(await unpacked.readReceipt("liitteet/2026/11/a.jpg")).toEqual(
      enc.encode("a1")
    )
  })

  it("refuses the fallback when two files share a name", async () => {
    const unpacked = await archiveOf("yksi/a.jpg", "kaksi/a.jpg")
    expect(await unpacked.readReceipt("liitteet/a.jpg")).toBeNull()
  })

  it("refuses the fallback when two folders hold the same path", async () => {
    const unpacked = await archiveOf(
      "yksi/2026/10/a.jpg",
      "kaksi/2026/10/a.jpg"
    )
    expect(await unpacked.readReceipt("liitteet/2026/10/a.jpg")).toBeNull()
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
    const resolved = await Promise.all(
      imported.entries.flatMap((e) => e.paths.map(unpacked.readReceipt))
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
    expect(await unpacked.readReceipt(first)).toEqual(enc.encode("bytes-a1"))
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
      "liitteet/2026/01/kuitti.jpg",
      "liitteet/2026/01/lasku.pdf",
      "liitteet/2026/10/lasku.pdf",
    ])
  })
})

describe("carrying receipts from the file being replaced", () => {
  const PATH = "liitteet/2026/01/lasku.pdf"
  const packed = (over: Partial<Parameters<typeof packZip>[0]> = {}) =>
    packZip({
      csvName: "kirjanpito.csv",
      csvText: "date;type;amount\r\n",
      paths: new Map([["e#0", PATH]]),
      attachmentIds: new Map(),
      read: async () => null,
      settingsText: SETTINGS_TEXT,
      ...over,
    })
  const bytes = enc.encode("kuitti")

  it("finds a receipt by the path the CSV lists it under", async () => {
    const old = await packed({
      attachmentIds: new Map([["e#0", "a1"]]),
      read: async () => bytes,
    })
    const read = await receiptReader(old)
    expect(await read(PATH)).toEqual(bytes)
    expect(await read("liitteet/ei-ole.pdf")).toBeNull()
  })

  it("keeps a receipt this browser does not hold", async () => {
    const unpacked = await unpackZip(await packed({ carry: async () => bytes }))
    expect(await unpacked?.readReceipt(PATH)).toEqual(bytes)
  })

  it("prefers the stored bytes over the old file's", async () => {
    const stored = enc.encode("uusi")
    const unpacked = await unpackZip(
      await packed({
        attachmentIds: new Map([["e#0", "a1"]]),
        read: async () => stored,
        carry: async () => bytes,
      })
    )
    expect(await unpacked?.readReceipt(PATH)).toEqual(stored)
  })

  it("reports a listed receipt with no bytes, stored or not", async () => {
    const absent: string[] = []
    await packed({ onAbsent: (key) => absent.push(key) })
    await packed({
      attachmentIds: new Map([["e#0", "a1"]]),
      onAbsent: (key) => absent.push(key),
    })
    expect(absent).toEqual(["e#0", "e#0"])
  })

  it("does not report a receipt it carried over", async () => {
    const absent: string[] = []
    await packed({
      carry: async () => bytes,
      onAbsent: (key) => absent.push(key),
    })
    expect(absent).toEqual([])
  })
})

describe("decompression limits", () => {
  const limits = { textBytes: 1000, receiptBytes: 1000 }
  const packed = (csvText: string, receipt: Uint8Array) =>
    packZip({
      csvName: "tositteet.csv",
      csvText,
      paths: new Map([["e#0", "liitteet/2026/01/a.pdf"]]),
      attachmentIds: new Map([["e#0", "a1"]]),
      read: async () => receipt,
      settingsText: SETTINGS_TEXT,
    })

  it("refuses a CSV that unpacks past the limit", async () => {
    const bytes = await packed("x".repeat(5000), enc.encode("kuitti"))
    await expect(unpackZip(bytes, limits)).rejects.toBeInstanceOf(
      ZipEntryTooLargeError
    )
  })

  it("reads a receipt past the limit as missing", async () => {
    const bytes = await packed("date;type;amount\r\n", new Uint8Array(5000))
    const unpacked = (await unpackZip(bytes, limits))!
    expect(await unpacked.readReceipt("liitteet/2026/01/a.pdf")).toBeNull()
  })

  it("reads entries within the limit whole", async () => {
    const receipt = new Uint8Array(900).fill(7)
    const bytes = await packed("date;type;amount\r\n", receipt)
    const unpacked = (await unpackZip(bytes, limits))!
    expect(await unpacked.readReceipt("liitteet/2026/01/a.pdf")).toEqual(
      receipt
    )
  })
})

describe("an encrypted archive (§7.8)", () => {
  const PASSWORD = "correct horse battery"
  const secret = "Salainen asiakas Oy"
  const entries = [
    entry({
      description: secret,
      atts: [att({ id: "a1", name: "lasku.pdf" })],
    }),
  ]

  function encrypted(password: string | undefined = PASSWORD) {
    return packZip({
      ...packInputs(entries),
      read: async () => enc.encode("kuitin sisältö"),
      password,
    })
  }

  /** Whether `needle` appears anywhere in the archive's bytes. */
  function contains(bytes: Uint8Array, needle: string) {
    return Buffer.from(bytes).includes(Buffer.from(needle))
  }

  it("keeps the CSV, settings and receipts out of the bytes", async () => {
    const bytes = await encrypted()
    expect(contains(bytes, secret)).toBe(false)
    expect(contains(bytes, "kuitin sisältö")).toBe(false)
    expect(contains(bytes, "version")).toBe(false)
  })

  it("is the same archive in plain form when no password is given", async () => {
    const bytes = await packZip({
      ...packInputs(entries),
      read: async () => enc.encode("kuitin sisältö"),
    })
    expect(contains(bytes, "kuitin sisältö")).toBe(true)
    expect((await unpackZip(bytes))?.encrypted).toBe(false)
  })

  it("opens with the password and reads the same content", async () => {
    const bytes = await encrypted()
    const unpacked = (await unpackZip(bytes, undefined, PASSWORD))!
    expect(unpacked.encrypted).toBe(true)
    expect(unpacked.csvText).toContain(secret)
    expect(unpacked.settingsText).toBe(SETTINGS_TEXT)
    expect(unpacked.otherFiles).toEqual(["liitteet/2026/10/lasku.pdf"])
    const receipt = await unpacked.readReceipt("liitteet/2026/10/lasku.pdf")
    expect(new TextDecoder().decode(receipt!)).toBe("kuitin sisältö")
  })

  it("asks for a password when none is given", async () => {
    await expect(unpackZip(await encrypted())).rejects.toBeInstanceOf(
      ZipPasswordRequiredError
    )
  })

  it("refuses a wrong password", async () => {
    await expect(
      unpackZip(await encrypted(), undefined, "not the password")
    ).rejects.toBeInstanceOf(ZipWrongPasswordError)
  })

  it("reads receipts back with the password, for a save that carries them", async () => {
    const lookup = await receiptReader(await encrypted(), PASSWORD)
    const receipt = await lookup("liitteet/2026/10/lasku.pdf")
    expect(new TextDecoder().decode(receipt!)).toBe("kuitin sisältö")
  })

  it("reads a receipt as missing when the password does not fit it", async () => {
    const lookup = await receiptReader(await encrypted(), "not the password")
    expect(await lookup("liitteet/2026/10/lasku.pdf")).toBeNull()
  })

  it("still caps what an entry may unpack to", async () => {
    const bytes = await encrypted()
    await expect(
      unpackZip(bytes, { textBytes: 4, receiptBytes: 4 }, PASSWORD)
    ).rejects.toBeInstanceOf(ZipEntryTooLargeError)
    const lookup = await receiptReader(bytes, PASSWORD)
    expect(lookup).toBeTypeOf("function")
  })

  it("is ignored by a plain archive opened with a password", async () => {
    const bytes = await packZip(packInputs(entries))
    const unpacked = await unpackZip(bytes, undefined, "anything")
    expect(unpacked?.encrypted).toBe(false)
    expect(unpacked?.csvText).toContain(secret)
  })
})
