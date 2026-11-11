import {
  cleanReference,
  ibanIn,
  parseBankCsv,
  type BankMapping,
  type BankParseResult,
  type BankRow,
  type BankSkippedRow,
  type StatementBalance,
  type StatementInfo,
} from "@/lib/domain/bank-csv"
import { parseCsvDate } from "@/lib/domain/dates"
import type { Cents } from "@/lib/domain/types"

/**
 * ISO 20022 bank statement, `camt.053` (§8.16), the XML account statement
 * Finnish banks give alongside or instead of a CSV. Pure: no DOM, so the
 * XML is read by the small reader below, which knows elements, attributes,
 * text, CDATA, comments and the five predefined entities, and nothing more.
 * That is all a statement uses.
 *
 * Every version from `camt.053.001.02` to `.13` reads the same way here: the
 * paths this module follows did not move between them, apart from a related
 * party's name, which later versions wrap in `Pty`, and both are tried.
 */

/* -------------------------------------------------------------------------
 * XML
 * ---------------------------------------------------------------------- */

interface XmlNode {
  /** Local name, the namespace prefix dropped. */
  name: string
  attrs: Record<string, string>
  children: XmlNode[]
  text: string
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

const localName = (qname: string) => qname.slice(qname.indexOf(":") + 1)

/** The document's root element, or null when the text is not well-formed enough to read. */
function parseXml(text: string): XmlNode | null {
  const root: XmlNode = { name: "#root", attrs: {}, children: [], text: "" }
  const stack: XmlNode[] = [root]
  const tag =
    /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y
  const attr = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let i = 0
  while (i < text.length) {
    const lt = text.indexOf("<", i)
    const top = stack[stack.length - 1]
    if (lt < 0) break
    if (lt > i) top.text += decodeEntities(text.slice(i, lt))
    if (text.startsWith("<?", lt)) {
      const end = text.indexOf("?>", lt)
      if (end < 0) return null
      i = end + 2
    } else if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt)
      if (end < 0) return null
      i = end + 3
    } else if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt)
      if (end < 0) return null
      top.text += text.slice(lt + 9, end)
      i = end + 3
    } else if (text.startsWith("<!", lt)) {
      // A DOCTYPE. Its internal subset is not read, so no entity is ever expanded from it.
      const end = text.indexOf(">", lt)
      if (end < 0) return null
      i = end + 1
    } else {
      tag.lastIndex = lt
      const m = tag.exec(text)
      if (!m) return null
      const [, closing, qname, rawAttrs, selfClosing] = m
      const name = localName(qname)
      if (closing) {
        if (stack.length < 2 || top.name !== name) return null
        stack.pop()
      } else {
        const attrs: Record<string, string> = {}
        for (const a of rawAttrs.matchAll(attr)) {
          attrs[localName(a[1])] = decodeEntities(a[2] ?? a[3] ?? "")
        }
        const node: XmlNode = { name, attrs, children: [], text: "" }
        top.children.push(node)
        if (!selfClosing) stack.push(node)
      }
      i = tag.lastIndex
    }
  }
  if (stack.length !== 1) return null
  return root.children[0] ?? null
}

/** The children of `node` along a path of local names. */
function all(node: XmlNode | undefined, ...path: string[]): XmlNode[] {
  let level = node ? [node] : []
  for (const step of path) {
    level = level.flatMap((n) => n.children.filter((c) => c.name === step))
  }
  return level
}

const first = (node: XmlNode | undefined, ...path: string[]) =>
  all(node, ...path)[0]

const textOf = (node: XmlNode | undefined, ...path: string[]) =>
  (first(node, ...path)?.text ?? "").trim()

/* -------------------------------------------------------------------------
 * Statement
 * ---------------------------------------------------------------------- */

/** Whether the text is a camt.053 statement, judged by its root element and namespace. */
export function isCamt053(text: string): boolean {
  const head = text.slice(0, 2000)
  return (
    /<(?:[\w.-]+:)?Document[\s>]/.test(head) &&
    /urn:iso:std:iso:20022:tech:xsd:camt\.053/.test(head)
  )
}

/** An XML amount, "1234.5" with a point, as cents. Never a sign: CdtDbtInd says which way. */
function parseXmlAmount(raw: string): Cents | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw.trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"))
}

/** A `Dt` or a `DtTm`, as an ISO date. */
function dateIn(node: XmlNode | undefined): string | null {
  const raw = textOf(node, "Dt") || textOf(node, "DtTm")
  return parseCsvDate(raw.slice(0, 10))
}

const signed = (amount: Cents, indicator: string) =>
  indicator === "DBIT" ? -amount : amount

/** The other party: the debtor on money in, the creditor on money out. */
function partyName(details: XmlNode | undefined, credit: boolean): string {
  const role = credit ? "Dbtr" : "Cdtr"
  return (
    textOf(details, "RltdPties", role, "Pty", "Nm") ||
    textOf(details, "RltdPties", role, "Nm")
  )
}

/** The other party's account, read from the same side as its name. */
function partyIban(
  details: XmlNode | undefined,
  credit: boolean
): string | undefined {
  const role = credit ? "DbtrAcct" : "CdtrAcct"
  return ibanIn(textOf(details, "RltdPties", role, "Id", "IBAN"))
}

function balanceOf(stmt: XmlNode, codes: readonly string[]) {
  for (const code of codes) {
    const bal = all(stmt, "Bal").find(
      (b) =>
        textOf(b, "Tp", "CdOrPrtry", "Cd") === code ||
        textOf(b, "Tp", "CdOrPrtry", "Prtry") === code
    )
    if (!bal) continue
    const amount = parseXmlAmount(textOf(bal, "Amt"))
    const date = dateIn(first(bal, "Dt"))
    if (amount === null || !date) continue
    return { amount: signed(amount, textOf(bal, "CdtDbtInd")), date }
  }
  return undefined
}

/**
 * Parse a camt.053 statement into the same rows a CSV gives (§8.16). An
 * entry that carries several transactions with amounts of their own, such as
 * a day's reference payments credited as one, becomes one row each. A
 * pending entry and one in another currency are skipped and counted. The
 * statement's account and its opening and closing balances come along, the
 * first statement's opening and the last one's closing when a file holds
 * several statements of one account.
 */
export function parseCamt053(text: string): BankParseResult {
  const doc = parseXml(text.replace(/^﻿/, ""))
  const statements = all(doc ?? undefined, "BkToCstmrStmt", "Stmt")
  if (!doc || statements.length === 0) {
    return { ok: false, reason: "empty", headers: [], suggested: {} }
  }

  const rows: BankRow[] = []
  const skipped: BankSkippedRow[] = []
  let entryNo = 0
  for (const stmt of statements) {
    for (const ntry of all(stmt, "Ntry")) {
      entryNo += 1
      const status = textOf(ntry, "Sts", "Cd") || textOf(ntry, "Sts") || "BOOK"
      if (status !== "BOOK") {
        skipped.push({ line: entryNo, code: "not-booked" })
        continue
      }
      const amtNode = first(ntry, "Amt")
      if ((amtNode?.attrs.Ccy ?? "EUR") !== "EUR") {
        skipped.push({ line: entryNo, code: "currency" })
        continue
      }
      const date = dateIn(first(ntry, "BookgDt"))
      if (!date) {
        skipped.push({ line: entryNo, code: "bad-date" })
        continue
      }
      const total = parseXmlAmount(amtNode?.text ?? "")
      if (total === null) {
        skipped.push({ line: entryNo, code: "bad-amount" })
        continue
      }
      let indicator = textOf(ntry, "CdtDbtInd")
      // A reversal books the opposite of what the indicator says.
      if (textOf(ntry, "RvslInd") === "true") {
        indicator = indicator === "DBIT" ? "CRDT" : "DBIT"
      }
      const credit = indicator !== "DBIT"
      const valueDate = dateIn(first(ntry, "ValDt")) ?? undefined
      const entryRef = textOf(ntry, "AcctSvcrRef")
      const kind =
        textOf(ntry, "AddtlNtryInf") ||
        textOf(ntry, "BkTxCd", "Prtry", "Cd") ||
        textOf(ntry, "BkTxCd", "Domn", "Fmly", "SubFmlyCd")

      const details = all(ntry, "NtryDtls", "TxDtls")
      const amounts = details.map((d) =>
        parseXmlAmount(textOf(d, "AmtDtls", "TxAmt", "Amt") || textOf(d, "Amt"))
      )
      const splitUp =
        details.length > 1 &&
        amounts.every((a) => a !== null) &&
        amounts.reduce((s, a) => s! + a!, 0) === total
      const parts = splitUp
        ? details.map((d, i) => ({ d, amount: amounts[i]! }))
        : [{ d: details[0], amount: total }]

      parts.forEach(({ d, amount }, i) => {
        const reference = cleanReference(
          textOf(d, "RmtInf", "Strd", "CdtrRefInf", "Ref")
        )
        const message =
          all(d, "RmtInf", "Ustrd")
            .map((u) => u.text.trim())
            .filter(Boolean)
            .join(" ") || textOf(d, "AddtlTxInf")
        const ownRef = textOf(d, "Refs", "AcctSvcrRef")
        const bankId =
          ownRef || (entryRef && splitUp ? `${entryRef}/${i + 1}` : entryRef)
        const iban = partyIban(d, credit)
        rows.push({
          date,
          ...(valueDate ? { valueDate } : {}),
          amount: credit ? amount : -amount,
          counterparty: partyName(d, credit),
          message,
          reference,
          ...(iban ? { iban } : {}),
          ...(bankId ? { bankId } : {}),
          kind,
        })
      })
    }
  }

  const ibans = new Set(
    statements.map((s) => textOf(s, "Acct", "Id", "IBAN")).filter(Boolean)
  )
  const statement: StatementInfo = {}
  if (ibans.size === 1) statement.iban = [...ibans][0]
  if (ibans.size <= 1) {
    const opening: StatementBalance | undefined = balanceOf(statements[0], [
      "OPBD",
      "PRCD",
    ])
    const closing: StatementBalance | undefined = balanceOf(
      statements[statements.length - 1],
      ["CLBD"]
    )
    if (opening) statement.opening = opening
    if (closing) statement.closing = closing
  }

  return {
    ok: true,
    rows,
    skipped,
    headers: [],
    mapping: {},
    preset: "camt053",
    statement,
  }
}

/** A statement in either form: camt.053 XML, or a CSV export (§8.16). */
export function parseBankStatement(
  text: string,
  mapping?: BankMapping
): BankParseResult {
  return isCamt053(text) ? parseCamt053(text) : parseBankCsv(text, mapping)
}
