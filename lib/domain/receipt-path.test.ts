import { describe, expect, it } from "vitest"

import {
  attachmentKey,
  buildReceiptPaths,
  cleanFileName,
  defaultFileBaseName,
  extensionFor,
  isPdf,
  mimeForName,
  slug,
} from "@/lib/domain/receipt-path"
import type { Attachment, Entry } from "@/lib/domain/types"

function att(over: Partial<Attachment> = {}): Attachment {
  return { id: "a1", name: "kuva.jpg", type: "image/jpeg", size: 100, ...over }
}

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    pvm: "2026-10-28",
    selite: "Lasku 1005 – Mäkinen Rakennus Oy",
    tyyppi: "tulo",
    catId: "300-suomi",
    summa: 188250,
    alv: 25.5,
    syotto: "brutto",
    ...over,
  }
}

describe("slug", () => {
  it.each([
    ["Osto – K-Rauta – tarvikkeet", "osto-k-rauta-tarvikkeet"],
    ["Lasku 1005 – Mäkinen Rakennus Oy", "lasku-1005-makinen-rakennus-oy"],
    ["Ääkkösiä öitä Åland", "aakkosia-oita-aland"],
    ["Café Crème", "cafe-creme"],
    ["Työtilan vuokra, helmikuu", "tyotilan-vuokra-helmikuu"],
    ["   ", "tosite"],
    ["!!!", "tosite"],
    ["", "tosite"],
  ])("slugs %j", (input, expected) => {
    expect(slug(input)).toBe(expected)
  })

  it("cuts at 40 characters and trims the trailing dash", () => {
    const long =
      "Lasku 1001 – Mäkinen Rakennus Oy ja pitkä selite joka ylittää neljäkymmentä merkkiä"
    expect(slug(long)).toBe("lasku-1001-makinen-rakennus-oy-ja-pitka")
  })

  it("strips combining marks left by NFD normalisation", () => {
    // Built from code points: "e" followed by a combining acute looks
    // exactly like a precomposed letter, so a literal here would be
    // invisible to anyone reading the test.
    const acute = String.fromCharCode(0x301)
    const diaeresis = String.fromCharCode(0x308)
    expect(slug(`Cafe${acute}`)).toBe("cafe")
    expect(slug(`Ho${diaeresis}tel`)).toBe("hotel")
  })

  it("never exceeds 40 characters or ends with a dash", () => {
    for (const s of [
      "a".repeat(80),
      "Lasku ".repeat(20),
      "– – – ".repeat(10),
      "Ö".repeat(50),
    ]) {
      const out = slug(s)
      expect(out.length).toBeLessThanOrEqual(40)
      expect(out).not.toMatch(/^-|-$/)
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

describe("buildReceiptPaths", () => {
  it("omits the index suffix for a single receipt", () => {
    const e = entry({ atts: [att({ name: "lasku.pdf" })] })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toBe(
      "tositteet/2026/10/2026-10-28_lasku-1005-makinen-rakennus-oy.pdf"
    )
  })

  it("adds 1-based suffixes when an entry has several", () => {
    const e = entry({
      id: "e2",
      pvm: "2026-01-15",
      selite: "Osto – K-Rauta – tarvikkeet",
      atts: [att({ name: "a.jpg" }), att({ name: "b.pdf" })],
    })
    const paths = buildReceiptPaths([e])
    expect(paths.get(attachmentKey("e2", 0))).toBe(
      "tositteet/2026/01/2026-01-15_osto-k-rauta-tarvikkeet_1.jpg"
    )
    expect(paths.get(attachmentKey("e2", 1))).toBe(
      "tositteet/2026/01/2026-01-15_osto-k-rauta-tarvikkeet_2.pdf"
    )
  })

  it("appends -2 then -3 on collisions", () => {
    const mk = (id: string) =>
      entry({ id, pvm: "2026-01-15", selite: "Osto", atts: [att()] })
    const paths = buildReceiptPaths([mk("a"), mk("b"), mk("c")])
    expect(paths.get(attachmentKey("a", 0))).toBe(
      "tositteet/2026/01/2026-01-15_osto.jpg"
    )
    expect(paths.get(attachmentKey("b", 0))).toBe(
      "tositteet/2026/01/2026-01-15_osto-2.jpg"
    )
    expect(paths.get(attachmentKey("c", 0))).toBe(
      "tositteet/2026/01/2026-01-15_osto-3.jpg"
    )
  })

  it("detects collisions case-insensitively", () => {
    const paths = buildReceiptPaths([
      entry({ id: "a", pvm: "2026-01-15", selite: "Osto", atts: [att()] }),
      entry({ id: "b", pvm: "2026-01-15", selite: "osto", atts: [att()] }),
    ])
    expect(paths.get(attachmentKey("b", 0))).toBe(
      "tositteet/2026/01/2026-01-15_osto-2.jpg"
    )
  })

  it("keeps a missing attachment's stored path", () => {
    const e = entry({
      atts: [att({ id: null, missing: true, path: "vanha/polku.jpg" })],
    })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toBe(
      "vanha/polku.jpg"
    )
  })

  it("reserves a missing path, pushing a colliding real receipt to -2", () => {
    const missing = entry({
      id: "a",
      pvm: "2026-01-15",
      selite: "Osto",
      atts: [
        att({
          id: null,
          missing: true,
          path: "tositteet/2026/01/2026-01-15_osto.jpg",
        }),
      ],
    })
    const real = entry({
      id: "b",
      pvm: "2026-01-15",
      selite: "Osto",
      atts: [att()],
    })
    // Order the real entry first: reserving missing paths up front means the
    // result does not depend on which one is seen first.
    const paths = buildReceiptPaths([real, missing])
    expect(paths.get(attachmentKey("b", 0))).toBe(
      "tositteet/2026/01/2026-01-15_osto-2.jpg"
    )
  })

  it("zero-pads the month folder", () => {
    const e = entry({ pvm: "2026-01-05", atts: [att()] })
    expect(buildReceiptPaths([e]).get(attachmentKey("e1", 0))).toContain(
      "tositteet/2026/01/"
    )
  })

  it("is stable under input shuffling", () => {
    const entries = [
      entry({ id: "a", pvm: "2026-03-01", selite: "Yksi", atts: [att()] }),
      entry({ id: "b", pvm: "2026-01-01", selite: "Kaksi", atts: [att()] }),
      entry({ id: "c", pvm: "2026-02-01", selite: "Kolme", atts: [att()] }),
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

  it("strips a trailing .csv, case-insensitively", () => {
    expect(cleanFileName("kirjanpito.CSV")).toBe("kirjanpito")
  })

  it("trims and tolerates an empty name", () => {
    expect(cleanFileName("  nimi  ")).toBe("nimi")
    expect(cleanFileName("")).toBe("")
  })
})

describe("defaultFileBaseName", () => {
  it("uses the Finnish or English stem plus today's date", () => {
    const d = new Date(2026, 9, 24)
    expect(defaultFileBaseName("fi", d)).toBe("kirjanpito_2026-10-24")
    expect(defaultFileBaseName("en", d)).toBe("accounting_2026-10-24")
  })
})
