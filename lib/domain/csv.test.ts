import Papa from "papaparse"
import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  CSV_HEADER,
  csvHeaderLine,
  detectDelimiter,
  decodeCsv,
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

let nextAttId = 0

/** Each call is a distinct stored file, as two real attachments are. */
function att(over: Partial<Attachment> = {}): Attachment {
  return {
    id: `a${++nextAttId}`,
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

  it("starts with a BOM and the exact header of its language", () => {
    expect(out.startsWith(`﻿${csvHeaderLine("fi")}\r\n`)).toBe(true)
    expect(csvHeaderLine("fi")).toBe(
      "tositenro;päivämäärä;selite;tyyppi;tili;luokka;summa;alv;verollisuus;liitteet;verokausi;maksettu;ostajan_alv;eu_osto;käteinen;jaettu;osuus;korjaa;myy;jakso_alkaa;jakso_päättyy"
    )
    expect(HEADER).toBe(
      "voucher;date;description;type;account;category;amount;vat;mode;receipts;settles;paid;buyer_vat;eu_purchase;cash;split;share;reverses;sells;period_from;period_to"
    )
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

  it("writes the English category name in an English file", () => {
    const en = serializeCsv(sample, cats, { lang: "en" })
    expect(en).toContain(";300;Sales – Finland;")
    expect(en).not.toContain("Myynti – Suomi")
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
    expect(text).toContain("liitteet/2026/10/a.jpg|liitteet/2026/10/b.pdf")
  })

  it("writes receipt paths even when no ZIP is produced", () => {
    const text = serializeCsv([entry({ atts: [att()] })], cats)
    expect(text).toContain("liitteet/2026/10/lasku.pdf")
  })

  it("writes no path for an attachment that is not an image or a PDF", () => {
    const text = serializeCsv(
      [
        entry({
          atts: [
            att({ name: "muistiinpanot.txt", type: "text/plain" }),
            att({
              id: null,
              name: "vanha.txt",
              missing: true,
              path: "vanha/polku.txt",
            }),
          ],
        }),
      ],
      cats
    )
    expect(text).not.toContain(".txt")
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

  it("is not fooled by a quoted field containing another delimiter", () => {
    const header = 'date,description,"a;b;c;d;e",amount,type'
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
        csvText([
          "DATE;Description;TYPE;amount",
          "2026-01-08;Lasku;tulo;100,00",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].amount).toBe(10000)
  })

  it("strips a BOM and tolerates LF, CRLF and trailing blank lines", () => {
    const r = ok(
      parseCsv("﻿date;type;amount\n2026-01-08;tulo;100,00\r\n\r\n", baseCats)
    )
    expect(r.entries).toHaveLength(1)
  })

  it("ignores unknown extra columns", () => {
    const r = ok(
      parseCsv(
        csvText(["date;type;amount;muuta", "2026-01-08;tulo;100,00;roskaa"]),
        baseCats
      )
    )
    expect(r.entries).toHaveLength(1)
  })

  it("reports the latest year in the file", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;amount",
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

describe("parseCsv — Finnish column names", () => {
  const FINNISH_HEADER = csvHeaderLine("fi")
  const ROW =
    "7;2026-11-12;ALV-maksu;kulu;2939;Arvonlisäveron maksu;362,18;0;netto;liitteet/2026/11/a.pdf;2026-10"
  const EXPECTED = {
    voucher: 7,
    date: "2026-11-12",
    description: "ALV-maksu",
    type: "expense",
    catId: "vat-payment",
    amount: 36218,
    vatRate: 0,
    amountMode: "net",
    paths: ["liitteet/2026/11/a.pdf"],
    settles: "2026-10",
  }

  it("reads every column of a file with the Finnish header", () => {
    const r = ok(parseCsv(csvText([FINNISH_HEADER, ROW]), baseCats))
    expect(r.entries[0]).toMatchObject(EXPECTED)
  })

  it("reads the same row under the English header", () => {
    const r = ok(parseCsv(csvText([HEADER, ROW]), baseCats))
    expect(r.entries[0]).toMatchObject(EXPECTED)
  })

  it.each([",", "\t"] as const)(
    "detects %j in a Finnish header",
    (delimiter) => {
      const header = FINNISH_HEADER.replaceAll(";", delimiter)
      expect(detectDelimiter(csvText([header]))).toBe(delimiter)
    }
  )

  it("matches Finnish names case-insensitively", () => {
    const r = ok(
      parseCsv(
        csvText([
          "PÄIVÄMÄÄRÄ;Selite;TYYPPI;summa",
          "2026-01-08;Lasku;tulo;100,00",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].amount).toBe(10000)
  })

  it("accepts a header that mixes the two languages", () => {
    const r = ok(
      parseCsv(
        csvText(["päivämäärä;type;summa", "2026-01-08;tulo;1,00"]),
        baseCats
      )
    )
    expect(r.entries).toHaveLength(1)
  })

  it("names a missing column in English", () => {
    expect(parseCsv(csvText(["päivämäärä;selite", "a;b"]), baseCats)).toEqual({
      ok: false,
      code: "missing-columns",
      missing: ["type", "amount"],
    })
  })

  it("writes whichever header the export language asks for", () => {
    const r = ok(parseCsv(csvText([FINNISH_HEADER, ROW]), baseCats))
    const entries = entriesFromImport(r.entries)
    const cats = indexCategories(r.categories)

    const fi = serializeCsv(entries, cats, { lang: "fi" })
    expect(fi.split("\r\n")[0]).toBe(`﻿${FINNISH_HEADER}`)
    expect(fi).toContain(";kulu;")
    expect(fi).toContain(";netto;")

    const en = serializeCsv(entries, cats, { lang: "en" })
    expect(en.split("\r\n")[0]).toBe(`﻿${HEADER}`)
    expect(en).toContain(";expense;")
    expect(en).toContain(";net;")
  })
})

describe("the words in a cell follow the export language", () => {
  const e = entry({
    type: "expense",
    catId: "344-other",
    amountMode: "net",
    paidOn: null,
    euPurchase: "goods",
    vatRate: 25.5,
  })

  /*
   * An unrecognised `mode` reads as gross, so a word the writer knows and the
   * reader does not would keep the number and change what it means: 1 000,00
   * net at 25,5 % would come back as 1 000,00 gross, i.e. 796,81 net. Nothing
   * downstream would notice, so this is asserted per language and per mode.
   */
  it.each(["fi", "en"] as const)(
    "brings every amount mode back unchanged from a %s file",
    (lang) => {
      for (const amountMode of ["gross", "net"] as const) {
        const one = entry({ amountMode, amount: 100_000, vatRate: 25.5 })
        const text = serializeCsv([one], cats, { lang })
        const back = ok(parseCsv(text, baseCats)).entries[0]
        expect(back.amountMode).toBe(amountMode)
        expect(back.amount).toBe(100_000)
      }
    }
  )

  it.each(["fi", "en"] as const)(
    "round-trips type, payment and EU purchase through a %s file",
    (lang) => {
      const text = serializeCsv([e], cats, { lang })
      const back = ok(parseCsv(text, baseCats)).entries[0]
      expect(back).toMatchObject({
        type: "expense",
        catId: "344-other",
        amountMode: "net",
        paidOn: null,
        euPurchase: "goods",
      })
    }
  )

  it.each(["fi", "en"] as const)(
    "round-trips an import and a reverse-charge purchase through a %s file",
    (lang) => {
      for (const kind of ["import", "reverse"] as const) {
        const one = entry({ ...e, euPurchase: kind })
        const text = serializeCsv([one], cats, { lang })
        const back = ok(parseCsv(text, baseCats)).entries[0]
        expect(back.euPurchase).toBe(kind)
      }
    }
  )

  it("writes the English words only in an English file", () => {
    const en = serializeCsv([e], cats, { lang: "en" })
    expect(en).toContain(";expense;")
    expect(en).toContain(";net;")
    expect(en).toContain(";open;")
    expect(en).toContain(";goods")

    const fi = serializeCsv([e], cats, { lang: "fi" })
    expect(fi).toContain(";kulu;")
    expect(fi).toContain(";netto;")
    expect(fi).toContain(";avoin;")
    expect(fi).toContain(";tavara")
  })

  /*
   * The decimal comma and the ";" delimiter are what let the file open in a
   * European Excel, and the ISO date is unambiguous. None of them is a word,
   * so none of them follows the language (§7.1).
   */
  it("writes the same numbers, dates and delimiter in both languages", () => {
    const strip = (text: string) =>
      text
        .split("\r\n")
        .slice(1)
        .map((line) => line.split(";"))
        // Drop the three columns that hold words.
        .map((cells) => [cells[1], cells[6], cells[7], cells[11]])

    expect(strip(serializeCsv(sample, cats, { lang: "en" }))).toEqual(
      strip(serializeCsv(sample, cats, { lang: "fi" }))
    )
    expect(serializeCsv(sample, cats, { lang: "en" })).toContain(";1882,50;")
    expect(serializeCsv(sample, cats, { lang: "en" })).toContain(";25,5;")
  })

  it("still accepts veroton, which it never writes", () => {
    const text = csvText([
      HEADER,
      "1;2026-01-08;A;tulo;300;;10,00;25,5;veroton",
    ])
    expect(ok(parseCsv(text, baseCats)).entries[0].amountMode).toBe("net")
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
    expect(
      parseCsv(csvText(["description;category", "a;b"]), baseCats)
    ).toEqual({
      ok: false,
      code: "missing-columns",
      missing: ["date", "type", "amount"],
    })
  })

  /*
   * No compatibility layer stands behind an older or foreign file, so one has
   * to be refused or reported rather than half-read (§8).
   */
  it("refuses a file in which nothing is a bookkeeping column", () => {
    expect(
      parseCsv(csvText(["nimi;osoite;puhelin", "a;b;c"]), baseCats)
    ).toEqual({ ok: false, code: "not-a-book" })
  })

  it("imports but reports a column it does not know", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;amount;tosite",
          "2026-01-08;tulo;100,00;liitteet/a.pdf",
        ]),
        baseCats
      )
    )
    expect(r.entries).toHaveLength(1)
    // The column was not read, so its path is not carried into the entry.
    expect(r.entries[0].paths).toEqual([])
    expect(r.warnings).toContainEqual({
      code: "unknown-columns",
      columns: ["tosite"],
    })
  })

  it("says nothing about a file whose every column it knows", () => {
    const r = ok(parseCsv(serializeCsv(sample, cats), baseCats))
    expect(r.warnings).toEqual([])
  })

  it("accepts a file with only the three required columns", () => {
    const r = ok(
      parseCsv(csvText(["date;type;amount", "8.1.2026;kulu;12,50"]), baseCats)
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
          "date;type;amount",
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
          "date;type;amount",
          "2026-01-08;tulo;1 882,50 €",
          `2026-01-09;tulo;1${NBSP}882,50`,
          `2026-01-10;kulu;${MINUS}12,00`,
        ]),
        baseCats
      )
    )
    expect(r.entries.map((e) => e.amount)).toEqual([188250, 188250, -1200])
  })

  /*
   * The input is the CSV's own `mode` value and stays Finnish; the expected
   * value is the English AmountMode the parser maps it to.
   */
  it.each([
    ["netto", "net"],
    ["veroton", "net"],
    ["NETTO", "net"],
    ["brutto", "gross"],
    ["verollinen", "gross"],
    ["", "gross"],
    ["roskaa", "gross"],
  ])("maps mode %j to %s", (input, expected) => {
    const r = ok(
      parseCsv(
        csvText(["date;type;amount;mode", `2026-01-08;tulo;1,00;${input}`]),
        baseCats
      )
    )
    expect(r.entries[0].amountMode).toBe(expected)
  })

  it("falls back to the category default when vat is empty", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;account;category;amount;vat",
          "2026-01-08;kulu;333;Ostot ja varastojen muutokset;100,00;",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].vatRate).toBe(25.5)
  })

  it("falls back to the category default when vat is unparseable", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;account;category;amount;vat",
          "2026-01-08;kulu;333;Ostot ja varastojen muutokset;100,00;roskaa",
        ]),
        baseCats
      )
    )
    expect(r.entries[0].vatRate).toBe(25.5)
  })

  it.each(["-100", "100", "150"])(
    "falls back to the category default when vat is %s",
    (rate) => {
      const r = ok(
        parseCsv(
          csvText([
            "date;type;account;category;amount;vat",
            `2026-01-08;kulu;333;Ostot ja varastojen muutokset;100,00;${rate}`,
          ]),
          baseCats
        )
      )
      expect(r.entries[0].vatRate).toBe(25.5)
    }
  )

  it("does not give a new category an impossible rate", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;account;category;amount;vat",
          "2026-01-08;kulu;344;Pilvipalvelut;100,00;-100",
        ]),
        baseCats
      )
    )
    expect(r.categories.find((c) => c.name === "Pilvipalvelut")?.vatRate).toBe(
      25.5
    )
  })

  it("honours an explicit zero rate rather than the default", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;account;category;amount;vat",
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
        csvText(["date;type;account;category;amount;vat", ...rows]),
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
      "2026-01-08;kulu;333;Purchases and changes in inventory;1,00;",
    ])
    expect(r.entries[0].catId).toBe("333")
  })

  it.each([
    ["kulu;333;Purchases and change in inventory", "333"],
    ["tulo;301;Muut tuotot", "301"],
    ["kulu;365;Välittömät verot", "365"],
    ["kulu;1100;Käyttöomaisuuden hankinta", "asset-purchase"],
    ["tulo;1100;Sale of fixed assets", "asset-sale"],
  ])("keeps a file's older name %s on its category", (row, id) => {
    const r = parse([`2026-01-08;${row};1,00;`])
    expect(r.entries[0].catId).toBe(id)
    expect(r.newCategoryCount).toBe(0)
  })

  it("matches a former name of a default category", () => {
    const r = parse(["2026-05-08;tulo;319;Saadut osingot;10,00;0"])
    expect(r.entries[0].catId).toBe("319")
    expect(r.newCategoryCount).toBe(0)
  })

  it("books an empty category on 344 to Muut vähennyskelpoiset kulut", () => {
    expect(parse(["2026-01-08;kulu;344;;1,00;"]).entries[0].catId).toBe(
      "344-other"
    )
  })

  it("books an empty category on 300 to Myynti – Suomi", () => {
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
        "date;type;amount",
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

  it("reports physical line numbers when the file has blank lines", () => {
    const r = ok(
      parseCsv(
        csvText([
          "date;type;amount",
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

  /* What saving a bookkeeping with no entries writes. */
  it("reads a header with no rows as a bookkeeping with no entries", () => {
    const r = parseCsv(csvText(["date;type;amount"]), baseCats)
    expect(r.ok && r.entries).toEqual([])
  })

  it("fails with no-rows-read when every row is bad", () => {
    expect(
      parseCsv(csvText(["date;type;amount", "roskaa;tulo;1,00"]), baseCats)
    ).toEqual({
      ok: false,
      code: "no-rows-read",
      skipped: [{ line: 2, code: "bad-date" }],
    })
  })

  it("never emits translated text, only codes and params", () => {
    const r = parseCsv(
      csvText([
        "date;type;account;category;amount",
        "2026-02-30;tulo;300;;1,00",
        "2026-01-08;tulo;999;Jotain;1,00",
      ]),
      baseCats
    )
    expect(JSON.stringify(r)).not.toMatch(/rivi|row |tuntematon|unknown cat/i)
  })
})

describe("formula guard", () => {
  const cells = (text: string) =>
    Papa.parse<string[]>(text.slice(1), { delimiter: ";" }).data

  it.each(['=HYPERLINK("http://x")', "+358 40", "-alennus", "@SUM(A1)"])(
    "writes %s as text, not a formula",
    (description) => {
      const rows = cells(serializeCsv([entry({ description })], cats))
      expect(rows[1][2]).toBe(`'${description}`)
    }
  )

  it("leaves ordinary text and negative amounts alone", () => {
    const rows = cells(
      serializeCsv(
        [entry({ description: "Hyvitys – Oy", amount: -1250 })],
        cats
      )
    )
    expect(rows[1][2]).toBe("Hyvitys – Oy")
    expect(rows[1][6]).toBe("-12,50")
  })

  it("guards custom category names too", () => {
    const custom = {
      id: "c-x",
      line: "344-other",
      name: "=Ohjelmistot",
      vatRate: 25.5,
      enabled: true,
      custom: true,
    }
    const rows = cells(
      serializeCsv(
        [entry({ type: "expense", catId: "c-x" })],
        indexCategories([...baseCats, custom])
      )
    )
    expect(rows[1][5]).toBe("'=Ohjelmistot")
  })

  it.each(["=1+1", "-alennus", "'=already quoted", "''@two", "'plain", "'"])(
    "round-trips %s unchanged",
    (description) => {
      const text = serializeCsv([entry({ description })], cats)
      const r = ok(parseCsv(text, baseCats, createIdFactory("f")))
      expect(r.entries[0].description).toBe(description)
    }
  )

  it("reads a hand-written formula cell as it is", () => {
    const text = [HEADER, ";2026-01-08;=1+1;tulo;300;;10,00;25,5;brutto;"].join(
      "\r\n"
    )
    const r = ok(parseCsv(text, baseCats, createIdFactory("f")))
    expect(r.entries[0].description).toBe("=1+1")
  })
})

describe("voucher numbers", () => {
  it("writes the number first and reads it back", () => {
    const text = serializeCsv([entry({ voucher: 7 })], cats)
    expect(text.split("\r\n")[1].startsWith("7;2026-10-28;")).toBe(true)
    const r = ok(parseCsv(text, baseCats, createIdFactory("v")))
    expect(r.entries[0].voucher).toBe(7)
  })

  it("leaves the number to the book when the file has none", () => {
    const text = csvText([
      "date;description;type;account;category;amount;vat;mode;receipts",
      "2026-10-28;Lasku;tulo;300;;100,00;25,5;brutto;",
    ])
    const r = ok(parseCsv(text, baseCats, createIdFactory("v")))
    expect(r.entries[0].voucher).toBeUndefined()
  })

  it.each(["0", "-3", "2,5", "A12"])("ignores %s as a number", (raw) => {
    const text = csvText([
      HEADER,
      `${raw};2026-10-28;Lasku;tulo;300;;100,00;25,5;brutto;`,
    ])
    const r = ok(parseCsv(text, baseCats, createIdFactory("v")))
    expect(r.entries[0].voucher).toBeUndefined()
  })

  it("orders rows of one day by number", () => {
    const text = serializeCsv(
      [entry({ id: "b", voucher: 9 }), entry({ id: "a", voucher: 3 })],
      cats
    )
    const lines = text.split("\r\n")
    expect(lines[1].startsWith("3;")).toBe(true)
    expect(lines[2].startsWith("9;")).toBe(true)
  })
})

describe("VAT settlements", () => {
  const payment = entry({
    id: "p1",
    voucher: 7,
    date: "2026-11-12",
    description: "ALV-maksu",
    type: "expense",
    catId: "vat-payment",
    amount: 36_218,
    vatRate: 0,
    settles: "2026-10",
  })

  it("writes and reads back the period a payment settles", () => {
    const text = serializeCsv([payment], cats)
    expect(text).toContain(
      ";2939;Arvonlisäveron maksu;362,18;0;brutto;;2026-10;;;;;;;;;;\r\n"
    )

    const back = ok(parseCsv(text, baseCats)).entries[0]
    expect(back.catId).toBe("vat-payment")
    expect(back.settles).toBe("2026-10")
  })

  it("drops a period on any other entry, and one that names no period", () => {
    const rows = [
      HEADER,
      "1;2026-10-28;Lasku;tulo;300;Myynti – Suomi;100;25,5;brutto;;2026-10",
      "2;2026-11-12;ALV;kulu;2939;Arvonlisäveron maksu;100;0;brutto;;pian",
    ].join("\n")
    const [sale, vat] = ok(parseCsv(rows, baseCats)).entries

    expect(sale.settles).toBeUndefined()
    expect(vat.catId).toBe("vat-payment")
    expect(vat.settles).toBeUndefined()
  })

  it("tells the owner's withdrawal and investment apart on one account", () => {
    const rows = [
      HEADER,
      "1;2026-03-02;Oma raha;tulo;2361;Yksityissijoitus;5000;0;brutto;;",
      "2;2026-06-30;Nosto;kulu;2365;;1200;0;brutto;;",
    ].join("\n")
    const [investment, withdrawal] = ok(parseCsv(rows, baseCats)).entries

    expect(investment.catId).toBe("owner-investment")
    expect(withdrawal.catId).toBe("owner-withdrawal")
  })

  it.each([
    ["tulo;2000;", "owner-investment"],
    ["kulu;2000;", "owner-withdrawal"],
    ["tulo;2939;", "vat-refund"],
    ["kulu;2939;", "vat-payment"],
    ["tulo;2600;", "loan-drawdown"],
    ["kulu;2600;", "loan-repayment"],
    ["kulu;1100;", "asset-purchase"],
    ["tulo;1100;", "asset-sale"],
  ])("reads the older account in %s as its line", (row, id) => {
    const r = ok(
      parseCsv(
        [HEADER, `1;2026-06-30;X;${row};100;0;brutto;;`].join("\n"),
        baseCats
      )
    )
    expect(r.entries[0].catId).toBe(id)
    expect(r.warnings).toEqual([])
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
        name: "a.jpg",
        type: "",
        size: 0,
        missing: true,
        path: "liitteet/2026/10/a.jpg",
      },
      {
        id: null,
        name: "b.pdf",
        type: "",
        size: 0,
        missing: true,
        path: "liitteet/2026/10/b.pdf",
      },
    ])
  })

  it("drops a listed path that is not an image or a PDF, and counts it", () => {
    const text = csvText([
      HEADER,
      ";2026-10-28;Lasku;tulo;300;Myynti – Suomi;100,00;25,5;brutto;a.jpg|notes.txt",
    ])
    const result = ok(parseCsv(text, baseCats, createIdFactory("x")))
    expect(result.entries[0].paths).toEqual(["a.jpg"])
    expect(result.rejectedReceiptCount).toBe(1)
  })

  /*
   * If anything about the normalisation disagreed between the two sides, the
   * second pass would differ.
   */
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
    /*
     * Re-emit the same cells with commas, quoting as a real comma file must:
     * the decimal commas in `amount` force every amount to be quoted.
     */
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

describe("decodeCsv", () => {
  const TEXT = "Työtilan vuokra – äö"

  it("reads UTF-8, with or without a BOM", () => {
    const bytes = new TextEncoder().encode(TEXT)
    expect(decodeCsv(bytes)).toBe(TEXT)
    expect(decodeCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]))).toBe(
      `\ufeff${TEXT}`
    )
  })

  it("reads the Windows code page Excel's plain CSV is saved in", () => {
    const bytes = Uint8Array.from(
      [...TEXT].map((c) => (c === "–" ? 0x96 : c.charCodeAt(0)))
    )
    expect(decodeCsv(bytes)).toBe(TEXT)
  })

  it("reads UTF-16 in both byte orders", () => {
    const units = [...TEXT].map((c) => c.charCodeAt(0))
    const le = units.flatMap((u) => [u & 0xff, u >> 8])
    const be = units.flatMap((u) => [u >> 8, u & 0xff])
    expect(decodeCsv(new Uint8Array([0xff, 0xfe, ...le]))).toBe(TEXT)
    expect(decodeCsv(new Uint8Array([0xfe, 0xff, ...be]))).toBe(TEXT)
  })

  it("lets an Excel file match the standard categories", () => {
    const text =
      "date;type;account;category;amount\n8.1.2026;kulu;336;Eläke- ja henkilösivukulut;1,00\n"
    const bytes = Uint8Array.from([...text].map((c) => c.charCodeAt(0)))
    const r = parseCsv(decodeCsv(bytes), defaultCategories())
    expect(r.ok && r.newCategoryCount).toBe(0)
  })
})

describe("paid column", () => {
  const roundTrip = (over: Partial<Entry>) => {
    const entry: Entry = {
      id: "p",
      date: "2026-12-15",
      description: "Lasku",
      type: "income",
      catId: "300-domestic",
      amount: 10_000,
      vatRate: 25.5,
      amountMode: "gross",
      ...over,
    }
    return ok(parseCsv(serializeCsv([entry], cats), baseCats)).entries[0]
  }

  it("round-trips a payment date and an open entry", () => {
    expect(roundTrip({ paidOn: "2027-01-10" }).paidOn).toBe("2027-01-10")
    expect(roundTrip({ paidOn: null }).paidOn).toBeNull()
  })

  it("leaves the field absent on an entry paid on its date", () => {
    expect(roundTrip({}).paidOn).toBeUndefined()
  })

  it("drops it on a line with no separate payment", () => {
    const owner = roundTrip({
      type: "expense",
      catId: "owner-withdrawal",
      vatRate: 0,
      paidOn: null,
    })
    expect(owner.paidOn).toBeUndefined()
  })
})

describe("period columns", () => {
  const roundTrip = (over: Partial<Entry>) => {
    const entry: Entry = {
      id: "p",
      date: "2026-11-05",
      description: "Vakuutus",
      type: "expense",
      catId: "333",
      amount: 36_500,
      vatRate: 0,
      amountMode: "net",
      ...over,
    }
    return ok(parseCsv(serializeCsv([entry], cats), baseCats)).entries[0]
  }

  it("round-trips a period", () => {
    const back = roundTrip({
      periodFrom: "2026-11-01",
      periodTo: "2027-10-31",
    })
    expect(back.periodFrom).toBe("2026-11-01")
    expect(back.periodTo).toBe("2027-10-31")
  })

  it("leaves the fields absent on an entry with no period", () => {
    const back = roundTrip({})
    expect(back.periodFrom).toBeUndefined()
    expect(back.periodTo).toBeUndefined()
  })

  it("drops a period whose end comes before its start", () => {
    const back = roundTrip({ periodFrom: "2027-01-01", periodTo: "2026-01-01" })
    expect(back.periodFrom).toBeUndefined()
    expect(back.periodTo).toBeUndefined()
  })

  it("drops it on a line with no separate payment", () => {
    const back = roundTrip({
      catId: "owner-withdrawal",
      periodFrom: "2026-11-01",
      periodTo: "2027-10-31",
    })
    expect(back.periodFrom).toBeUndefined()
  })
})

describe("buyer_vat column", () => {
  const back = (catId: string) => {
    const e: Entry = {
      id: "b",
      date: "2026-03-03",
      description: "",
      type: "income",
      catId,
      amount: 10_000,
      vatRate: 0,
      amountMode: "gross",
      buyerVatId: "SE1234",
    }
    return ok(parseCsv(serializeCsv([e], cats), baseCats)).entries[0]
  }

  it("round-trips on an EU sale", () => {
    expect(back("300-eu-goods").buyerVatId).toBe("SE1234")
  })

  it("drops it on any other category", () => {
    expect(back("300-domestic").buyerVatId).toBeUndefined()
  })
})

describe("cash column", () => {
  const entry = (over: Partial<Entry>): Entry => ({
    id: "c",
    date: "2026-03-10",
    description: "Kuitti",
    type: "expense",
    catId: "333",
    amount: 1_990,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  })
  const back = (e: Entry, lang?: "fi" | "en") =>
    ok(parseCsv(serializeCsv([e], cats, { lang }), baseCats)).entries[0]

  it("round-trips in both languages", () => {
    expect(serializeCsv([entry({ cash: true })], cats)).toContain(
      ";kyllä;;;;;;\r\n"
    )
    expect(back(entry({ cash: true })).cash).toBe(true)
    expect(back(entry({ cash: true }), "en").cash).toBe(true)
    expect(back(entry({})).cash).toBeUndefined()
  })

  it("keeps it only where a payment is", () => {
    expect(back(entry({ cash: true, paidOn: null })).cash).toBeUndefined()
    expect(
      back(entry({ cash: true, catId: "337", vatRate: 0 })).cash
    ).toBeUndefined()
  })
})

describe("split column", () => {
  const part = (
    id: string,
    voucher: number,
    over: Partial<Entry> = {}
  ): Entry => ({
    id,
    voucher,
    date: "2026-03-10",
    description: "Kuitti",
    type: "expense",
    catId: "333",
    amount: 1_990,
    vatRate: 25.5,
    amountMode: "gross",
    split: "g1",
    ...over,
  })
  const read = (entries: Entry[], lang: "fi" | "en" = "fi") =>
    ok(parseCsv(serializeCsv(entries, cats, { lang }), baseCats))

  it("writes the first part's voucher number on every part", () => {
    const text = serializeCsv([part("a", 4), part("b", 5)], cats)
    const rows = text.split("\r\n").filter(Boolean).slice(1)
    expect(rows.map((r) => r.split(";").at(-6))).toEqual(["4", "4"])
  })

  it("links the parts again on import, in both languages", () => {
    for (const lang of ["fi", "en"] as const) {
      const [a, b] = read([part("a", 4), part("b", 5)], lang).entries
      expect(a.split).toBeDefined()
      expect(b.split).toBe(a.split)
    }
  })

  it("keeps two splits in one year apart", () => {
    const parts = [
      part("a", 4),
      part("b", 5),
      part("c", 6, { split: "g2" }),
      part("d", 7, { split: "g2" }),
    ]
    const [a, b, c, d] = read(parts).entries
    expect(a.split).toBe(b.split)
    expect(c.split).toBe(d.split)
    expect(a.split).not.toBe(c.split)
  })

  it("leaves an ordinary entry without a split", () => {
    const [x] = read([part("a", 4, { split: undefined })]).entries
    expect(x.split).toBeUndefined()
  })

  it("does not write a group of one or a group whose first part has no number", () => {
    const lone = serializeCsv([part("a", 4)], cats)
    const unnumbered = serializeCsv(
      [part("a", 4, { voucher: undefined }), part("b", 5)],
      cats
    )
    for (const text of [lone, unnumbered]) {
      const rows = text.split("\r\n").filter(Boolean).slice(1)
      expect(rows.every((r) => r.endsWith(";"))).toBe(true)
    }
  })

  it("does not link a part dated in another year than the first", () => {
    const parts = [part("a", 4), part("b", 5, { date: "2027-01-02" })]
    const result = read(parts)
    expect(result.entries.every((e) => e.split === undefined)).toBe(true)
  })

  it("stands a row alone when no other row holds its number, and says so", () => {
    const text = serializeCsv([part("a", 4), part("b", 5)], cats).replace(
      /;4;;;;;\r\n$/,
      ";9;;;;;\r\n"
    )
    const result = ok(parseCsv(text, baseCats))
    expect(result.entries.every((e) => e.split === undefined)).toBe(true)
    expect(result.warnings).toContainEqual({ code: "split-dissolved", rows: 2 })
  })

  it("ignores a cell that is not a number", () => {
    const text = serializeCsv([part("a", 4), part("b", 5)], cats).replace(
      /;4;;;;;\r\n/g,
      ";x;;;;;\r\n"
    )
    const result = ok(parseCsv(text, baseCats))
    expect(result.entries.every((e) => e.split === undefined)).toBe(true)
    expect(result.warnings.some((w) => w.code === "split-dissolved")).toBe(
      false
    )
  })
})

describe("formula guard after a separator", () => {
  const cells = (text: string) =>
    Papa.parse<string[]>(text.slice(1), { delimiter: ";" }).data

  /*
   * An Excel whose list separator is a comma splits the row at the comma, so
   * the part after it must not start a formula either.
   */
  it.each([
    ["Lasku,=cmd|'/c calc'!A1,x", "Lasku,'=cmd|'/c calc'!A1,x"],
    ["Alennus, -10 %", "Alennus, '-10 %"],
    ["a\t@SUM(A1)", "a\t'@SUM(A1)"],
    ["=a,+b", "'=a,'+b"],
  ])("writes %j as %j", (description, written) => {
    const rows = cells(serializeCsv([entry({ description })], cats))
    expect(rows[1][2]).toBe(written)
  })

  it.each(["Lasku,=cmd|'/c calc'!A1,x", "a,'=b", "a, ''-b", "1,5 kg, 2,0 kg"])(
    "reads %j back unchanged",
    (description) => {
      const text = serializeCsv([entry({ description })], cats)
      expect(ok(parseCsv(text, baseCats)).entries[0].description).toBe(
        description
      )
    }
  )
})

describe("words from the file", () => {
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])(
    "skips a row whose type is %j",
    (type) => {
      const r = parseCsv(
        csvText([HEADER, `1;2026-01-08;x;${type};344;;10,00;0;;;;;;;`]),
        baseCats
      )
      expect(r.ok).toBe(false)
    }
  )

  it("ignores an EU purchase value that is a prototype property", () => {
    const r = ok(
      parseCsv(
        csvText([HEADER, "1;2026-01-08;x;kulu;333;;10,00;0;;;;;;constructor;"]),
        baseCats
      )
    )
    expect(r.entries[0].euPurchase).toBeUndefined()
  })
})

describe("receipt paths from the file", () => {
  it.each([
    "../../evil.pdf",
    "liitteet/../../evil.pdf",
    "/etc/evil.pdf",
    "C:/Users/evil.pdf",
    "liitteet\\2026\\evil.pdf",
    "liitteet//evil.pdf",
    "./evil.pdf",
  ])("drops %j as outside the archive", (path) => {
    const r = ok(
      parseCsv(
        csvText([HEADER, `1;2026-01-08;x;kulu;333;;10,00;0;;${path};;;;;`]),
        baseCats
      )
    )
    expect(r.entries[0].paths).toEqual([])
    expect(r.rejectedReceiptCount).toBe(1)
  })

  it("does not write a stored path that leads outside the archive", () => {
    const text = serializeCsv(
      [
        entry({
          atts: [att({ id: null, missing: true, path: "../../evil.pdf" })],
        }),
      ],
      cats
    )
    expect(text).not.toContain("evil")
  })
})
