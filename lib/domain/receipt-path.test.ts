import { describe, expect, it } from "vitest"

import {
  attachmentKey,
  buildReceiptPaths,
  cleanFileName,
  defaultFileBaseName,
  suggestedBaseName,
  extensionFor,
  isPdf,
  isReceiptFile,
  isReceiptPath,
  mimeForName,
  receiptStem,
} from "@/lib/domain/receipt-path"
import type { Attachment, Entry } from "@/lib/domain/types"

function att(over: Partial<Attachment> = {}): Attachment {
  return { id: "a1", name: "kuva.jpg", type: "image/jpeg", size: 100, ...over }
}

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    date: "2026-10-28",
    description: "Lasku 1005 – Mäkinen Rakennus Oy",
    type: "income",
    catId: "300-domestic",
    amount: 188250,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

describe("receiptStem", () => {
  /*
   * The point of the whole rule: a name the user chose comes through intact,
   * spaces, dots, case and Finnish letters included. Only the extension goes,
   * because the path puts it back.
   */
  it.each([
    [
      "2.11.2026 - HC-Maschinentechnik - Lasku.pdf",
      "2.11.2026 - HC-Maschinentechnik - Lasku",
    ],
    ["IMG_4417.jpg", "IMG_4417"],
    ["Ääkkösiä öitä Åland.jpg", "Ääkkösiä öitä Åland"],
    ["Osto – K-Rauta – tarvikkeet.pdf", "Osto – K-Rauta – tarvikkeet"],
    ["report.final.pdf", "report.final"],
    ["kuitti", "kuitti"],
  ])("keeps %j as %j", (input, expected) => {
    expect(receiptStem(input)).toBe(expected)
  })

  it("drops what no file system would take", () => {
    expect(receiptStem('a\\b/c:d*e?f"g<h>i|j.pdf')).toBe("abcdefghij")
    const ctrl = [0x00, 0x07, 0x1f, 0x7f]
      .map((c) => String.fromCharCode(c))
      .join("")
    expect(receiptStem(`kui${ctrl}tti.pdf`)).toBe("kuitti")
  })

  /* `|` separates the receipt paths in the CSV and `"` quotes a field (§7.1). */
  it("leaves nothing that would break the CSV's receipts column", () => {
    expect(receiptStem('a|b"c.pdf')).not.toMatch(/[|"]/)
  })

  it("falls back when nothing usable is left", () => {
    expect(receiptStem("<<>>.jpg")).toBe("liite")
    expect(receiptStem("   .jpg")).toBe("liite")
    expect(receiptStem("")).toBe("liite")
  })

  /* Windows trims these when it creates the file, so we must not write them. */
  it("trims leading and trailing dots and spaces", () => {
    expect(receiptStem("  kuitti  .pdf")).toBe("kuitti")
    expect(receiptStem("...kuitti....pdf")).toBe("kuitti")
  })

  it("steps around an MS-DOS device name", () => {
    expect(receiptStem("CON.pdf")).toBe("CON_")
    expect(receiptStem("nul.jpg")).toBe("nul_")
    expect(receiptStem("com1.pdf")).toBe("com1_")
    expect(receiptStem("console.pdf")).toBe("console")
  })

  it("cuts a very long name and leaves no ragged edge", () => {
    expect(receiptStem("a".repeat(400) + ".pdf")).toBe("a".repeat(100))
    expect(receiptStem("a".repeat(99) + " b.pdf")).toBe("a".repeat(99))
  })

  /*
   * Everything above either removes a character that could never survive, or
   * is a no-op on its own output. That is what makes the ZIP path a fixed
   * point, so a book does not rename its receipts on every round trip.
   */
  it("is idempotent", () => {
    for (const name of [
      "2.11.2026 - HC-Maschinentechnik - Lasku.pdf",
      "CON.pdf",
      "  ...x... .pdf",
      '<>|".pdf',
      "a".repeat(400) + ".pdf",
      "Ääkkösiä.jpg",
    ]) {
      const once = receiptStem(name)
      expect(receiptStem(once)).toBe(once)
    }
  })
})

describe("mimeForName / extensionFor / isPdf", () => {
  it("maps known extensions to MIME types", () => {
    expect(mimeForName("a.heic")).toBe("image/heic")
    expect(mimeForName("a.PDF")).toBe("application/pdf")
    expect(mimeForName("a.zzz")).toBe("application/octet-stream")
  })

  it("prefers the file name's extension, normalising jpeg to jpg", () => {
    expect(extensionFor(att({ name: "a.JPEG" }))).toBe("jpg")
    expect(extensionFor(att({ name: "a.PDF" }))).toBe("pdf")
  })

  it("falls back to the MIME type, then to bin", () => {
    expect(extensionFor({ name: "receipt", type: "image/png" })).toBe("png")
    expect(extensionFor({ name: "x", type: "application/octet-stream" })).toBe(
      "bin"
    )
  })

  it("recognises PDFs by either name or type", () => {
    expect(isPdf({ name: "a.pdf", type: "" })).toBe(true)
    expect(isPdf({ name: "a", type: "application/pdf" })).toBe(true)
    expect(isPdf(att())).toBe(false)
  })
})

describe("isReceiptFile", () => {
  it.each([
    ["kuitti.jpg", ""],
    ["kuitti.JPEG", ""],
    ["kuitti.png", ""],
    ["kuitti.webp", ""],
    ["kuitti.gif", ""],
    ["kuitti.heic", ""],
    ["kuitti.heif", ""],
    ["lasku.pdf", ""],
    ["scan", "image/tiff"],
    ["scan", "application/pdf"],
  ])("accepts an image or a PDF: %j %j", (name, type) => {
    expect(isReceiptFile({ name, type })).toBe(true)
  })

  it.each([
    ["muistiinpanot.txt", "text/plain"],
    ["kirjanpito.csv", "text/csv"],
    ["arkisto.zip", "application/zip"],
    ["asennus.exe", ""],
    ["kuitti", ""],
    ["kuitti", "application/octet-stream"],
    /* A prototype property is not an extension the table knows. */
    ["x.constructor", ""],
  ])("rejects anything else: %j %j", (name, type) => {
    expect(isReceiptFile({ name, type })).toBe(false)
  })
})

describe("buildReceiptPaths", () => {
  it("names the file after the file", () => {
    const e = entry({
      atts: [att({ name: "2.11.2026 - HC-Maschinentechnik - Lasku.pdf" })],
    })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toBe(
      "liitteet/2026/10/2.11.2026 - HC-Maschinentechnik - Lasku.pdf"
    )
  })

  /* The names tell them apart, so neither needs an index. */
  it("keeps each of an entry's receipts under its own name", () => {
    const e = entry({
      id: "e2",
      date: "2026-01-15",
      atts: [att({ name: "kuitti.jpg" }), att({ name: "lasku.pdf" })],
    })
    const paths = buildReceiptPaths([e])
    expect(paths.get(attachmentKey("e2", 0))).toBe(
      "liitteet/2026/01/kuitti.jpg"
    )
    expect(paths.get(attachmentKey("e2", 1))).toBe("liitteet/2026/01/lasku.pdf")
  })

  it("takes the extension from the MIME type when the name has none", () => {
    const e = entry({ atts: [att({ name: "scan", type: "image/png" })] })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toBe(
      "liitteet/2026/10/scan.png"
    )
  })

  it("appends -2 then -3 on collisions", () => {
    const mk = (id: string) => entry({ id, date: "2026-01-15", atts: [att()] })
    const paths = buildReceiptPaths([mk("a"), mk("b"), mk("c")])
    expect(paths.get(attachmentKey("a", 0))).toBe("liitteet/2026/01/kuva.jpg")
    expect(paths.get(attachmentKey("b", 0))).toBe("liitteet/2026/01/kuva-2.jpg")
    expect(paths.get(attachmentKey("c", 0))).toBe("liitteet/2026/01/kuva-3.jpg")
  })

  it("detects collisions case-insensitively", () => {
    const paths = buildReceiptPaths([
      entry({ id: "a", date: "2026-01-15", atts: [att({ name: "Kuva.jpg" })] }),
      entry({ id: "b", date: "2026-01-15", atts: [att({ name: "kuva.jpg" })] }),
    ])
    expect(paths.get(attachmentKey("b", 0))).toBe("liitteet/2026/01/kuva-2.jpg")
  })

  /* Only within one month: the folder already keeps the two apart. */
  it("leaves the same name in another month alone", () => {
    const paths = buildReceiptPaths([
      entry({ id: "a", date: "2026-01-15", atts: [att({ name: "kuva.jpg" })] }),
      entry({ id: "b", date: "2026-02-15", atts: [att({ name: "kuva.jpg" })] }),
    ])
    expect(paths.get(attachmentKey("a", 0))).toBe("liitteet/2026/01/kuva.jpg")
    expect(paths.get(attachmentKey("b", 0))).toBe("liitteet/2026/02/kuva.jpg")
  })

  it("falls back for a name a file system could not take at all", () => {
    const e = entry({ atts: [att({ name: '<>|".jpg' })] })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toBe(
      "liitteet/2026/10/liite.jpg"
    )
  })

  /*
   * The name a re-import reads off the path is the name the next export
   * writes, so a book can go round any number of times without its receipts
   * drifting. `slug` is idempotent over its own output, which is what makes
   * this hold.
   */
  it("makes the path a fixed point", () => {
    for (const name of [
      "2.11.2026 - HC-Maschinentechnik - Lasku.pdf",
      "IMG_4417.jpg",
      "Ääkkösiä öitä.jpg",
      "!!!.jpg",
      "a".repeat(80) + ".pdf",
    ]) {
      const first = entry({ atts: [att({ name })] })
      const path = buildReceiptPaths([first]).get(attachmentKey("e1", 0))!
      const again = entry({
        atts: [att({ name: path.split("/").pop()! })],
      })
      expect(buildReceiptPaths([again]).get(attachmentKey("e1", 0))).toBe(path)
    }
  })

  it("keeps a missing attachment's stored path", () => {
    const e = entry({
      atts: [att({ id: null, missing: true, path: "vanha/polku.jpg" })],
    })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toBe(
      "vanha/polku.jpg"
    )
  })

  it("gives no path to an attachment that is not an image or a PDF", () => {
    const e = entry({
      atts: [
        att({ name: "muistiinpanot.txt", type: "text/plain" }),
        att({ id: null, missing: true, path: "vanha/polku.txt" }),
      ],
    })
    const paths = buildReceiptPaths([e])
    expect(paths.has(attachmentKey("e1", 0))).toBe(false)
    expect(paths.has(attachmentKey("e1", 1))).toBe(false)
  })

  it("reserves a missing path, pushing a colliding real receipt to -2", () => {
    const missing = entry({
      id: "a",
      date: "2026-01-15",
      atts: [
        att({ id: null, missing: true, path: "liitteet/2026/01/kuva.jpg" }),
      ],
    })
    const real = entry({ id: "b", date: "2026-01-15", atts: [att()] })
    /*
     * Order the real entry first: reserving missing paths up front means the
     * result does not depend on which one is seen first.
     */
    const paths = buildReceiptPaths([real, missing])
    expect(paths.get(attachmentKey("b", 0))).toBe("liitteet/2026/01/kuva-2.jpg")
  })

  it("zero-pads the month folder", () => {
    const e = entry({ date: "2026-01-05", atts: [att()] })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toContain(
      "liitteet/2026/01/"
    )
  })

  it("names the folder in the export language", () => {
    const e = entry({ atts: [att({ name: "lasku.pdf" })] })
    expect(buildReceiptPaths([e], "en").get(attachmentKey("e1", 0))).toBe(
      "attachments/2026/10/lasku.pdf"
    )
  })

  it("is stable under input shuffling", () => {
    const entries = [
      entry({ id: "a", date: "2026-03-01", atts: [att({ name: "a.jpg" })] }),
      entry({ id: "b", date: "2026-01-01", atts: [att({ name: "b.jpg" })] }),
      entry({ id: "c", date: "2026-02-01", atts: [att({ name: "c.jpg" })] }),
    ]
    const a = buildReceiptPaths(entries)
    const b = buildReceiptPaths([...entries].reverse())
    expect(Object.fromEntries(b)).toEqual(Object.fromEntries(a))
  })

  it("ignores entries with no attachments", () => {
    expect(buildReceiptPaths([entry()]).size).toBe(0)
  })
})

describe("cleanFileName", () => {
  it("strips characters a file system rejects", () => {
    expect(cleanFileName('kir\\jan/pito:*?"<>|')).toBe("kirjanpito")
  })

  it("strips control characters", () => {
    const ctrl = [0x00, 0x07, 0x1f, 0x7f]
      .map((c) => String.fromCharCode(c))
      .join("")
    expect(cleanFileName(`kirjan${ctrl}pito`)).toBe("kirjanpito")
  })

  it("keeps a dot that is not a .csv suffix", () => {
    expect(cleanFileName("kirjanpito.2026")).toBe("kirjanpito.2026")
    expect(cleanFileName("abccsv")).toBe("abccsv")
  })

  it("keeps Finnish letters and spaces", () => {
    expect(cleanFileName("Tilikausi 2026 – Mäkinen Öy")).toBe(
      "Tilikausi 2026 – Mäkinen Öy"
    )
  })

  it("strips a trailing .csv or .zip, case-insensitively", () => {
    expect(cleanFileName("kirjanpito.CSV")).toBe("kirjanpito")
    expect(cleanFileName("kirjanpito.zip")).toBe("kirjanpito")
  })

  it("trims and tolerates an empty name", () => {
    expect(cleanFileName("  nimi  ")).toBe("nimi")
    expect(cleanFileName("")).toBe("")
  })
})

describe("suggestedBaseName", () => {
  it("reuses the last file's name as it was, date included", () => {
    expect(suggestedBaseName("toiminimi_2026-10-24.zip", "fi")).toBe(
      "toiminimi_2026-10-24"
    )
    expect(suggestedBaseName("oma.csv", "en")).toBe("oma")
  })

  it("falls back to the default", () => {
    expect(suggestedBaseName(null, "fi")).toBe("kirjanpito")
    expect(suggestedBaseName(".zip", "en")).toBe("bookkeeping")
  })
})

describe("defaultFileBaseName", () => {
  it("is the bare stem, with no date", () => {
    expect(defaultFileBaseName("fi")).toBe("kirjanpito")
    expect(defaultFileBaseName("en")).toBe("bookkeeping")
  })
})

describe("receipt types round-trip", () => {
  /*
   * A file accepted by its MIME type has to read back by its path, or the next
   * open loses its link to the entry.
   */
  it.each([
    ["piirros.svg", "image/svg+xml"],
    ["skannaus.bmp", "image/bmp"],
    ["kuva.avif", "image/avif"],
    ["skannaus.tif", "image/tiff"],
    ["kuva", "image/png"],
    ["lasku.lopullinen", "application/pdf"],
  ])("%j (%s) is written under a path that reads back", (name, type) => {
    const a = att({ name, type })
    expect(isReceiptFile(a)).toBe(true)
    const path = buildReceiptPaths([entry({ atts: [a] })]).get("e1#0")!
    expect(isReceiptPath(path)).toBe(true)
  })

  it("rejects an image type it cannot read back", () => {
    expect(isReceiptFile({ name: "kuvake", type: "image/x-icon" })).toBe(false)
  })

  it("does not take a prototype property for a known type", () => {
    expect(mimeForName("x.constructor")).toBe("application/octet-stream")
    expect(extensionFor({ name: "x", type: "constructor" })).toBe("bin")
  })
})

describe("isReceiptPath", () => {
  it.each(["liitteet/2026/10/lasku.pdf", "a.jpg", "Kansio/2.11.2026 - X.pdf"])(
    "accepts %j",
    (path) => expect(isReceiptPath(path)).toBe(true)
  )

  it.each([
    "../a.pdf",
    "a/../../b.pdf",
    "/a.pdf",
    "a//b.pdf",
    "./a.pdf",
    "C:/a.pdf",
    "a\\b.pdf",
    "a/b.txt",
  ])("rejects %j", (path) => expect(isReceiptPath(path)).toBe(false))
})
