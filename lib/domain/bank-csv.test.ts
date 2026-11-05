import { describe, expect, it } from "vitest"

import { guessMapping, parseBankCsv } from "@/lib/domain/bank-csv"

const OP_HEADER =
  '"Kirjauspäivä";"Arvopäivä";"Määrä EUROA";"Laji";"Selitys";"Saaja/Maksaja";"Saajan tilinumero";"Saajan pankin BIC";"Viite";"Viesti";"Arkistointitunnus"'

const OP_FILE = [
  "﻿" + OP_HEADER,
  '"2026-10-19";"2026-10-19";1000,00;"505";"PANO";"Testi Tuula";"";"";"ref=";"";"20261019/593619/1D9992"',
  '"2026-10-27";"2026-10-27";-921,25;"106";"TILISIIRTO";"Esimerkki Oy";"SE1312000000012410148301";"DABASESXXXX";"ref=";"Viesti: 7103249";"20261027/593156/0V0868"',
  '"2026-10-28";"2026-10-28";-124,50;"106";"TILISIIRTO";"Toimittaja Oy";"";"";"ref=1234 5674";"Lasku 55";"20261028/1/1"',
  '"huono";"2026-10-28";-1,00;"106";"X";"";"";"";"ref=";"";""',
  '"2026-10-29";"2026-10-29";abc;"106";"X";"";"";"";"ref=";"";""',
].join("\r\n")

describe("parseBankCsv, OP layout", () => {
  const result = parseBankCsv(OP_FILE)

  it("recognises the layout without a mapping", () => {
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.preset).toBe("op")
  })

  it("reads signed amounts in cents and ISO dates", () => {
    if (!result.ok) throw new Error("not ok")
    expect(result.rows.map((r) => [r.date, r.amount])).toEqual([
      ["2026-10-19", 100000],
      ["2026-10-27", -92125],
      ["2026-10-28", -12450],
    ])
  })

  it("strips the ref= prefix and spaces from the reference", () => {
    if (!result.ok) throw new Error("not ok")
    expect(result.rows[0].reference).toBe("")
    expect(result.rows[2].reference).toBe("12345674")
  })

  it("keeps counterparty, message, kind and the bank's id", () => {
    if (!result.ok) throw new Error("not ok")
    expect(result.rows[1]).toMatchObject({
      counterparty: "Esimerkki Oy",
      message: "Viesti: 7103249",
      kind: "TILISIIRTO",
      bankId: "20261027/593156/0V0868",
    })
  })

  it("skips and counts bad rows with their line numbers", () => {
    if (!result.ok) throw new Error("not ok")
    expect(result.skipped).toEqual([
      { line: 5, code: "bad-date" },
      { line: 6, code: "bad-amount" },
    ])
  })
})

describe("parseBankCsv, other banks", () => {
  const text = [
    "Päivämäärä;Saaja;Viesti;Summa",
    "3.11.2026;Kauppa Oy;Kuitti;-12,90",
  ].join("\n")

  it("asks for a mapping when a required header cannot be found", () => {
    const r = parseBankCsv("foo;bar\n1;2")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("needs-mapping")
  })

  it("guesses a mapping from header names", () => {
    expect(guessMapping(["Päivämäärä", "Saaja", "Viesti", "Summa"])).toEqual({
      counterparty: "Saaja",
      message: "Viesti",
      amount: "Summa",
    })
  })

  it("parses with an explicit mapping, in D.M.YYYY dates", () => {
    const r = parseBankCsv(text, {
      date: "Päivämäärä",
      amount: "Summa",
      counterparty: "Saaja",
      message: "Viesti",
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.preset).toBeNull()
      expect(r.rows).toEqual([
        {
          date: "2026-11-03",
          amount: -1290,
          counterparty: "Kauppa Oy",
          message: "Kuitti",
          reference: "",
          kind: "",
        },
      ])
    }
  })

  it("reads separate debit and credit columns", () => {
    const r = parseBankCsv(
      "Date,Debit,Credit,Name\n2026-11-01,10.00,,A\n2026-11-02,,25.50,B",
      { date: "Date", debit: "Debit", credit: "Credit", counterparty: "Name" }
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.rows.map((x) => x.amount)).toEqual([-1000, 2550])
  })

  it("reports an empty file", () => {
    const r = parseBankCsv("")
    expect(r.ok).toBe(false)
  })
})
