import { describe, expect, it } from "vitest"

import {
  isCamt053,
  parseBankStatement,
  parseCamt053,
} from "@/lib/domain/bank-camt"

/*
 * A statement written from the ISO 20022 schema (camt.053.001.08), not taken
 * from a bank. It has one of everything this module reads: a payment in with
 * a structured reference, a card payment out, a batch of two reference
 * payments credited as one entry, a reversal, a pending entry and one in
 * another currency.
 */
const CAMT = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <GrpHdr><MsgId>MSG1</MsgId><CreDtTm>2026-11-01T06:00:00</CreDtTm></GrpHdr>
    <Stmt>
      <Id>STMT-2026-10</Id>
      <Acct><Id><IBAN>FI2112345600000785</IBAN></Id></Acct>
      <Bal>
        <Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="EUR">1000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-10-01</Dt></Dt>
      </Bal>
      <Bal>
        <Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="EUR">1435.10</Amt><CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-10-31</Dt></Dt>
      </Bal>
      <Ntry>
        <Amt Ccy="EUR">620.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-05</Dt></BookgDt>
        <ValDt><Dt>2026-10-05</Dt></ValDt>
        <AcctSvcrRef>20261005ABC001</AcctSvcrRef>
        <AddtlNtryInf>VIITESIIRTO</AddtlNtryInf>
        <NtryDtls><TxDtls>
          <RltdPties><Dbtr><Pty><Nm>Asiakas Oy</Nm></Pty></Dbtr></RltdPties>
          <RmtInf><Strd><CdtrRefInf><Ref>1001 3</Ref></CdtrRefInf></Strd></RmtInf>
        </TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">24.90</Amt><CdtDbtInd>DBIT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><DtTm>2026-10-07T12:30:00</DtTm></BookgDt>
        <AcctSvcrRef>20261007ABC002</AcctSvcrRef>
        <AddtlNtryInf>KORTTIOSTO</AddtlNtryInf>
        <NtryDtls><TxDtls>
          <RltdPties><Cdtr><Nm>Kahvila &amp; Leipomo</Nm></Cdtr></RltdPties>
          <RmtInf><Ustrd>Kortti 1234</Ustrd><Ustrd>Osto</Ustrd></RmtInf>
        </TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">150.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-10</Dt></BookgDt>
        <AcctSvcrRef>20261010BATCH</AcctSvcrRef>
        <AddtlNtryInf>VIITESIIRROT</AddtlNtryInf>
        <NtryDtls>
          <TxDtls>
            <AmtDtls><TxAmt><Amt Ccy="EUR">100.00</Amt></TxAmt></AmtDtls>
            <RltdPties><Dbtr><Pty><Nm>Eka Oy</Nm></Pty></Dbtr></RltdPties>
            <RmtInf><Strd><CdtrRefInf><Ref>10029</Ref></CdtrRefInf></Strd></RmtInf>
          </TxDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>20261010BATCH-2</AcctSvcrRef></Refs>
            <AmtDtls><TxAmt><Amt Ccy="EUR">50</Amt></TxAmt></AmtDtls>
            <RltdPties><Dbtr><Pty><Nm>Toka Oy</Nm></Pty></Dbtr></RltdPties>
            <RmtInf><Strd><CdtrRefInf><Ref>10032</Ref></CdtrRefInf></Strd></RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">310.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>
        <RvslInd>true</RvslInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-20</Dt></BookgDt>
        <AcctSvcrRef>20261020REV</AcctSvcrRef>
        <NtryDtls><TxDtls><AddtlTxInf><![CDATA[Palautus <virhe>]]></AddtlTxInf></TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">99.00</Amt><CdtDbtInd>DBIT</CdtDbtInd>
        <Sts><Cd>PDNG</Cd></Sts>
        <BookgDt><Dt>2026-10-30</Dt></BookgDt>
      </Ntry>
      <Ntry>
        <Amt Ccy="SEK">500.00</Amt><CdtDbtInd>DBIT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-30</Dt></BookgDt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>
`

const ok = (text: string) => {
  const result = parseCamt053(text)
  if (!result.ok) throw new Error(result.reason)
  return result
}

describe("isCamt053", () => {
  it("knows a camt.053 document by its namespace", () => {
    expect(isCamt053(CAMT)).toBe(true)
    expect(isCamt053(CAMT.replace("camt.053", "camt.054"))).toBe(false)
    expect(isCamt053("Kirjauspäivä;Määrä EUROA\n")).toBe(false)
  })
})

describe("parseCamt053", () => {
  it("reads booked entries as signed rows", () => {
    const result = ok(CAMT)
    expect(result.preset).toBe("camt053")
    expect(result.rows[0]).toEqual({
      date: "2026-10-05",
      valueDate: "2026-10-05",
      amount: 62_000,
      counterparty: "Asiakas Oy",
      message: "",
      reference: "10013",
      bankId: "20261005ABC001",
      kind: "VIITESIIRTO",
    })
    expect(result.rows[1]).toMatchObject({
      date: "2026-10-07",
      amount: -2_490,
      counterparty: "Kahvila & Leipomo",
      message: "Kortti 1234 Osto",
      kind: "KORTTIOSTO",
    })
  })

  it("splits a batch whose transactions carry their own amounts", () => {
    const rows = ok(CAMT).rows.filter((r) => r.date === "2026-10-10")
    expect(rows.map((r) => [r.amount, r.counterparty, r.reference])).toEqual([
      [10_000, "Eka Oy", "10029"],
      [5_000, "Toka Oy", "10032"],
    ])
    expect(rows.map((r) => r.bankId)).toEqual([
      "20261010BATCH/1",
      "20261010BATCH-2",
    ])
  })

  it("turns a reversal round and reads CDATA as text", () => {
    const row = ok(CAMT).rows.find((r) => r.date === "2026-10-20")
    expect(row?.amount).toBe(-31_000)
    expect(row?.message).toBe("Palautus <virhe>")
  })

  it("skips a pending entry and one in another currency", () => {
    const result = ok(CAMT)
    expect(result.rows).toHaveLength(5)
    expect(result.skipped).toEqual([
      { line: 5, code: "not-booked" },
      { line: 6, code: "currency" },
    ])
  })

  it("carries the account and its opening and closing balances", () => {
    expect(ok(CAMT).statement).toEqual({
      iban: "FI2112345600000785",
      opening: { amount: 100_000, date: "2026-10-01" },
      closing: { amount: 143_510, date: "2026-10-31" },
    })
  })

  it("reads a debit balance as negative", () => {
    const overdrawn = CAMT.replace(
      '<Amt Ccy="EUR">1000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>',
      '<Amt Ccy="EUR">12.50</Amt><CdtDbtInd>DBIT</CdtDbtInd>'
    )
    expect(ok(overdrawn).statement?.opening?.amount).toBe(-1_250)
  })

  it("refuses text that is not a statement", () => {
    expect(parseCamt053("<Document><Stmt></Document>").ok).toBe(false)
    expect(parseCamt053("not xml").ok).toBe(false)
  })
})

describe("parseBankStatement", () => {
  it("sends XML to the camt reader and anything else to the CSV reader", () => {
    expect(parseBankStatement(CAMT)).toMatchObject({ preset: "camt053" })
    const csv = parseBankStatement("Päivä;Summa\n2026-10-01;10,00\n")
    expect(csv.ok && csv.preset).toBe(null)
  })
})
