import Papa from "papaparse"
import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  CSV_HEADER,
  detectDelimiter,
  parseCsv,
  serializeCsv,
  type ImportSuccess,
} from "@/lib/domain/csv"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { createIdFactory } from "@/lib/domain/id"
import { MINUS, NBSP } from "@/lib/domain/money"
import {
  canonical,
  canonicalImported,
  csvText,
  entriesFromImport,
} from "@/lib/domain/test-helpers/canonical"
import {
  indexCategories,
  type Attachment,
  type Entry,
} from "@/lib/domain/types"

const baseCats = defaultCategories()
const cats = indexCategories(baseCats)
const sample = sampleEntries(createIdFactory("e"))

const HEADER = CSV_HEADER.join(";")

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

function att(over: Partial<Attachment> = {}): Attachment {
  return {
    id: "a1",
    name: "lasku.pdf",
    type: "application/pdf",
    size: 10,
    ...over,
  }
}

/** Narrow a result to success, failing loudly with its code otherwise. */
function ok(result: ReturnType<typeof parseCsv>): ImportSuccess {
  if (!result.ok) throw new Error(`expected success, got ${result.code}`)
  return result
}

describe("serializeCsv", () => {
  const out = serializeCsv(sample, cats)

  it("starts with a BOM and the exact header", () => {
    expect(out.startsWith(`﻿${HEADER}\r\n`)).toBe(true)
    expect(HEADER).toBe("pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;tosite")
  })

  it("uses CRLF and ends with one", () => {
    expect(out.endsWith("\r\n")).toBe(true)
    expect(out.split("\r\n").filter(Boolean)).toHaveLength(17)
  })

  it("sorts rows by date", () => {
    const dates = out
      .split("\r\n")
      .slice(1)
      .filter(Boolean)
      .map((l) => l.split(";")[0])
    expect(dates).toEqual([...dates].sort())
  })

  it("writes the account number and the Finnish category name", () => {
    expect(out).toContain(";300;Myynti – Suomi;")
    expect(out).not.toContain("Sales – Finland")
  })

  it("writes amounts with a decimal comma and no grouping", () => {
    expect(out).toContain(";1882,50;")
    expect(out).toContain(";2510,00;")
  })

  it("writes rates with a decimal comma", () => {
    expect(out).toContain(";25,5;")
    expect(out).toContain(";0;")
  })

  it("contains no Unicode minus and no no-break space", () => {
    const withNegative = serializeCsv([entry({ amount: -5099 })], cats)
    expect(withNegative).toContain(";-50,99;")
    expect(withNegative).not.toContain(MINUS)
    expect(withNegative).not.toContain(NBSP)
  })

  it("quotes only the fields that need it, doubling inner quotes", () => {
    const text = serializeCsv(
      [
        entry({ description: 'Lasku; "iso"' }),
        entry({ id: "e2", description: "Tavis" }),
      ],
      cats
    )
    expect(text).toContain('"Lasku; ""iso"""')
    expect(text).toContain(";Tavis;")
  })

  it("quotes a description containing a newline", () => {
    const text = serializeCsv([entry({ description: "Rivi1\nRivi2" })], cats)
    expect(text).toContain('"Rivi1\nRivi2"')
  })

  it("trims the description", () => {
    expect(serializeCsv([entry({ description: "  Lasku  " })], cats)).toContain(
      ";Lasku;"
    )
  })

  it("joins several receipt paths with a pipe", () => {
    const text = serializeCsv(
      [entry({ atts: [att({ name: "a.jpg" }), att({ name: "b.pdf" })] })],
      cats
    )
    expect(text).toContain(
      "tositteet/2026/10/2026-10-28_lasku-1005_1.jpg|tositteet/2026/10/2026-10-28_lasku-1005_2.pdf"
    )
  })

  // The prototype emitted an empty tosite for real attachments when no ZIP
  // was produced, making a CSV-only export lossy.
  it("writes receipt paths even when no ZIP is produced", () => {
    const text = serializeCsv([entry({ atts: [att()] })], cats)
    expect(text).toContain("tositteet/2026/10/2026-10-28_lasku-1005.pdf")
  })
})

describe("detectDelimiter", () => {
  it("picks the semicolon for a standard export", () => {
    expect(detectDelimiter(csvText([HEADER]))).toBe(";")
  })

  it("picks the comma for a comma file", () => {
    expect(detectDelimiter(csvText([CSV_HEADER.join(",")]))).toBe(",")
  })

  it("picks the tab for a TSV", () => {
    expect(detectDelimiter(csvText([CSV_HEADER.join("\t")]))).toBe("\t")
  })

  // Counting raw occurrences, as the prototype did, would pick ";" here.
  it("is not fooled by a quoted field containing another delimiter", () => {
    const header = 'pvm,selite,"a;b;c;d;e",summa,tyyppi'
    expect(detectDelimiter(csvText([header]))).toBe(",")
  })
})

describe("parseCsv — happy path", () => {
  it("reads a standard export", () => {
    const r = ok(
      parseCsv(serializeCsv(sample, cats), baseCats, createIdFactory())
    )
    expect(r.entries).toHaveLength(16)
    expect(r.skipped).toEqual([])
    expect(r.newCategoryCount).toBe(0)
    expect(r.latestYear).toBe(2026)
    expect(r.delimiter).toBe(";")
  })

  it("matches headers case-insensitively", () => {
    const r = ok(
      parseCsv(
        csvText(["PVM;Selite;TYYPPI;summa", "2026-01-08;Lasku;tulo;100,00"]),
        baseCats
      )
    )
    expect(r.entries[0].amount).toBe(10000)
  })

  it("strips a BOM and tolerates LF, CRLF and trailing blank lines", () => {
    const r = ok(
      parseCsv("﻿pvm;tyyppi;summa\n2026-01-08;tulo;100,00\r\n\r\n", baseCats)
    )
    expect(r.entries).toHaveLength(1)
  })

  it("ignores unknown extra columns", () => {
    const r = ok(
      parseCsv(
        csvText(["pvm;tyyppi;summa;muuta", "2026-01-08;tulo;100,00;roskaa"]),
        baseCats
      )
    )
    expect(r.entries).toHaveLength(1)
  })

  it("reports the latest year in the file", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;summa",
          "2024-01-08;tulo;100,00",
          "2027-05-01;tulo;100,00",
          "2026-01-08;tulo;100,00",
        ]),
        baseCats
      )
    )
    expect(r.latestYear).toBe(2027)
  })
})

describe("parseCsv — required columns", () => {
  it("rejects an empty file", () => {
    expect(parseCsv("", baseCats)).toEqual({ ok: false, code: "empty-file" })
    expect(parseCsv("   \r\n", baseCats)).toEqual({
      ok: false,
      code: "empty-file",
    })
  })

  it("names the missing required columns", () => {
    expect(parseCsv(csvText(["selite;luokka", "a;b"]), baseCats)).toEqual({
      ok: false,
      code: "missing-columns",
      missing: ["pvm", "tyyppi", "summa"],
    })
  })

  it("accepts a file with only the three required columns", () => {
    const r = ok(
      parseCsv(csvText(["pvm;tyyppi;summa", "8.1.2026;kulu;12,50"]), baseCats)
    )
    expect(r.entries[0]).toMatchObject({
      date: "2026-01-08",
      type: "expense",
      amount: 1250,
      amountMode: "gross",
    })
  })
})

describe("parseCsv — leniency", () => {
  it("accepts both date formats in one file", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;summa",
          "2026-01-08;tulo;1,00",
          "9.1.2026;tulo;1,00",
        ]),
        baseCats
      )
    )
    expect(r.entries.map((e) => e.date)).toEqual(["2026-01-08", "2026-01-09"])
  })

  it("accepts messy amounts", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;summa",
          "2026-01-08;tulo;1 882,50 €",
          `2026-01-09;tulo;1${NBSP}882,50`,
          `2026-01-10;kulu;${MINUS}12,00`,
        ]),
        baseCats
      )
    )
    expect(r.entries.map((e) => e.amount)).toEqual([188250, 188250, -1200])
  })

  // The input is the CSV's own `syotto` value and stays Finnish; the expected
  // value is the English AmountMode the parser maps it to.
  it.each([
    ["netto", "net"],
    ["veroton", "net"],
    ["NETTO", "net"],
    ["brutto", "gross"],
    ["verollinen", "gross"],
    ["", "gross"],
    ["roskaa", "gross"],
  ])("maps syotto %j to %s", (input, expected) => {
    const r = ok(
      parseCsv(
        csvText(["pvm;tyyppi;summa;syotto", `2026-01-08;tulo;1,00;${input}`]),
        baseCats
      )
    )
    expect(r.entries[0].amountMode).toBe(expected)
  })

  it("falls back to the category default when alv is empty", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;tili;luokka;summa;alv",
          "2026-01-08;kulu;333;Ostot ja varastojen muutokset;100,00;",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].vatRate).toBe(25.5)
  })

  it("falls back to the category default when alv is unparseable", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;tili;luokka;summa;alv",
          "2026-01-08;kulu;333;Ostot ja varastojen muutokset;100,00;roskaa",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].vatRate).toBe(25.5)
  })

  it("honours an explicit zero rate rather than the default", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;tili;luokka;summa;alv",
          "2026-01-08;kulu;333;Ostot ja varastojen muutokset;100,00;0",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].vatRate).toBe(0)
  })
})

describe("parseCsv — category matching", () => {
  const parse = (rows: string[]) =>
    ok(
      parseCsv(
        csvText(["pvm;tyyppi;tili;luokka;summa;alv", ...rows]),
        baseCats,
        createIdFactory("c")
      )
    )

  it("matches the Finnish name, case-insensitively", () => {
    const r = parse(["2026-01-08;kulu;333;ostot ja VARASTOJEN muutokset;1,00;"])
    expect(r.entries[0].catId).toBe("333")
    expect(r.newCategoryCount).toBe(0)
  })

  it("matches the English default name", () => {
    const r = parse([
      "2026-01-08;kulu;333;Purchases and change in inventory;1,00;",
    ])
    expect(r.entries[0].catId).toBe("333")
  })

  // The prototype took the first category on the account, which on 344 meant
  // Matkakulut rather than Muut vähennyskelpoiset kulut.
  it("books an empty luokka on 344 to Muut vähennyskelpoiset kulut", () => {
    expect(parse(["2026-01-08;kulu;344;;1,00;"]).entries[0].catId).toBe(
      "344-other"
    )
  })

  it("books an empty luokka on 300 to Myynti – Suomi", () => {
    expect(parse(["2026-01-08;tulo;300;;1,00;"]).entries[0].catId).toBe(
      "300-domestic"
    )
  })

  it("creates a custom category for an unknown name on a known account", () => {
    const r = parse(["2026-01-08;kulu;344;Pilvipalvelut;1,00;25,5"])
    const created = r.categories.find((c) => c.name === "Pilvipalvelut")!
    expect(created).toMatchObject({
      line: "344-other",
      vatRate: 25.5,
      enabled: true,
      custom: true,
    })
    expect(r.entries[0].catId).toBe(created.id)
    expect(r.newCategoryCount).toBe(1)
    expect(r.warnings).toContainEqual({
      code: "new-category",
      line: 2,
      catId: created.id,
      name: "Pilvipalvelut",
    })
  })

  it("creates one category for two rows with the same unknown name", () => {
    const r = parse([
      "2026-01-08;kulu;344;Pilvipalvelut;1,00;25,5",
      "2026-02-08;kulu;344;Pilvipalvelut;2,00;25,5",
    ])
    expect(r.newCategoryCount).toBe(1)
    expect(r.entries[0].catId).toBe(r.entries[1].catId)
  })

  it("keeps the same name on an income and an expense account distinct", () => {
    const r = parse([
      "2026-01-08;tulo;301;Sekalaista;1,00;0",
      "2026-02-08;kulu;344;Sekalaista;1,00;0",
    ])
    expect(r.newCategoryCount).toBe(2)
    expect(r.entries[0].catId).not.toBe(r.entries[1].catId)
  })

  it("books an unknown account to 301 or 344-other with a warning", () => {
    const r = parse([
      "2026-01-08;tulo;999;Jotain;1,00;0",
      "2026-02-08;kulu;999;Jotain;1,00;0",
    ])
    expect(r.entries.map((e) => e.catId)).toEqual(["301", "344-other"])
    expect(r.warnings).toEqual([
      {
        code: "unknown-account",
        line: 2,
        account: "999",
        name: "Jotain",
        bookedTo: "301",
      },
      {
        code: "unknown-account",
        line: 3,
        account: "999",
        name: "Jotain",
        bookedTo: "344-other",
      },
    ])
  })
})

describe("parseCsv — skipped rows", () => {
  it("reports bad dates, types and amounts with codes", () => {
    const r = parseCsv(
      csvText([
        "pvm;tyyppi;summa",
        "2026-02-30;tulo;1,00",
        "2026-01-08;jotain;1,00",
        "2026-01-08;tulo;roskaa",
        "2026-01-08;tulo;1,00",
      ]),
      baseCats
    )
    expect(ok(r).skipped).toEqual([
      { line: 2, code: "bad-date" },
      { line: 3, code: "bad-type" },
      { line: 4, code: "bad-amount" },
    ])
  })

  // The prototype filtered blank rows before numbering, so its line numbers
  // did not match what the user sees in the file.
  it("reports physical line numbers when the file has blank lines", () => {
    const r = ok(
      parseCsv(
        csvText([
          "pvm;tyyppi;summa",
          "",
          "2026-01-08;tulo;1,00",
          "",
          "2026-02-30;tulo;1,00",
        ]),
        baseCats
      )
    )
    expect(r.skipped).toEqual([{ line: 5, code: "bad-date" }])
  })

  it("fails with no-rows-read when every row is bad", () => {
    expect(
      parseCsv(csvText(["pvm;tyyppi;summa", "roskaa;tulo;1,00"]), baseCats)
    ).toEqual({
      ok: false,
      code: "no-rows-read",
      skipped: [{ line: 2, code: "bad-date" }],
    })
  })

  it("never emits translated text, only codes and params", () => {
    const r = parseCsv(
      csvText([
        "pvm;tyyppi;tili;luokka;summa",
        "2026-02-30;tulo;300;;1,00",
        "2026-01-08;tulo;999;Jotain;1,00",
      ]),
      baseCats
    )
    expect(JSON.stringify(r)).not.toMatch(/rivi|row |tuntematon|unknown cat/i)
  })
})

describe("CSV round trip", () => {
  const roundTrip = (entries: Entry[], startCats = baseCats) => {
    const text = serializeCsv(entries, indexCategories(startCats))
    const r = ok(parseCsv(text, startCats, createIdFactory("r")))
    return { text, result: r, cats: indexCategories(r.categories) }
  }

  it("reproduces the sample data", () => {
    const { result, cats: after } = roundTrip(sample)
    expect(canonicalImported(result.entries, after)).toEqual(
      canonical(sample, cats)
    )
  })

  it("preserves custom categories, matched by account, side and name", () => {
    const custom = {
      id: "c-local",
      line: "344-other",
      name: "Pilvipalvelut",
      vatRate: 25.5,
      enabled: true,
      custom: true,
    }
    const startCats = [...baseCats, custom]
    const entries = [entry({ type: "expense", catId: "c-local", amount: 5000 })]
    const { result, cats: after } = roundTrip(entries, startCats)
    expect(result.newCategoryCount).toBe(0)
    expect(canonicalImported(result.entries, after)).toEqual(
      canonical(entries, indexCategories(startCats))
    )
  })

  it("merges two custom categories sharing an account and name", () => {
    const startCats = [
      ...baseCats,
      {
        id: "c-a",
        line: "344-other",
        name: "Sama",
        vatRate: 10,
        enabled: true,
        custom: true,
      },
      {
        id: "c-b",
        line: "344-other",
        name: "Sama",
        vatRate: 10,
        enabled: true,
        custom: true,
      },
    ]
    const entries = [
      entry({
        id: "x",
        type: "expense",
        catId: "c-a",
        amount: 100,
        vatRate: 10,
      }),
      entry({
        id: "y",
        type: "expense",
        catId: "c-b",
        amount: 200,
        vatRate: 10,
      }),
    ]
    const { result } = roundTrip(entries, startCats)
    expect(result.entries[0].catId).toBe(result.entries[1].catId)
  })

  it.each([
    ["net", { amountMode: "net" as const }],
    ["gross", { amountMode: "gross" as const }],
    ["a negative amount", { amount: -4500 }],
    ["a zero rate", { vatRate: 0 }],
    ["a rate outside RATES", { vatRate: 9 }],
    ["a semicolon and quotes", { description: 'Lasku; "iso" – 1/2' }],
    ["a newline", { description: "Rivi1\nRivi2" }],
  ])("survives %s", (_name, over) => {
    const entries = [entry(over)]
    const { result, cats: after } = roundTrip(entries)
    expect(canonicalImported(result.entries, after)).toEqual(
      canonical(entries, cats)
    )
  })

  it("brings receipt paths back as missing attachments", () => {
    const entries = [
      entry({ atts: [att({ name: "a.jpg" }), att({ name: "b.pdf" })] }),
    ]
    const { result } = roundTrip(entries)
    const restored = entriesFromImport(result.entries)
    expect(restored[0].atts).toEqual([
      {
        id: null,
        name: "2026-10-28_lasku-1005_1.jpg",
        type: "",
        size: 0,
        missing: true,
        path: "tositteet/2026/10/2026-10-28_lasku-1005_1.jpg",
      },
      {
        id: null,
        name: "2026-10-28_lasku-1005_2.pdf",
        type: "",
        size: 0,
        missing: true,
        path: "tositteet/2026/10/2026-10-28_lasku-1005_2.pdf",
      },
    ])
  })

  // The strongest assertion here: if anything about the normalisation
  // disagreed between the two sides, the second pass would differ.
  it("is idempotent — a second serialize is byte-identical", () => {
    const first = serializeCsv(sample, cats)
    const r = ok(parseCsv(first, baseCats, createIdFactory("r")))
    const second = serializeCsv(
      entriesFromImport(r.entries),
      indexCategories(r.categories)
    )
    expect(second).toBe(first)
  })

  it("round-trips through a comma-delimited file", () => {
    // Re-emit the same cells with commas, quoting as a real comma file must:
    // the decimal commas in `summa` force every amount to be quoted.
    const cells = Papa.parse<string[]>(serializeCsv(sample, cats).slice(1), {
      header: false,
      delimiter: ";",
      skipEmptyLines: true,
    }).data
    const commaText = Papa.unparse(cells, { delimiter: "," })

    const r = ok(parseCsv(commaText, baseCats, createIdFactory("r")))
    expect(r.delimiter).toBe(",")
    expect(canonicalImported(r.entries, indexCategories(r.categories))).toEqual(
      canonical(sample, cats)
    )
  })
})
