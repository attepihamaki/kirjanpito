import { billIban, billReference } from "@/lib/domain/bill-payment"
import { isRfReference } from "@/lib/domain/invoice-reference"
import type { Customer } from "@/lib/domain/invoice"
import type { Payable } from "@/lib/domain/payables"
import type { Cents } from "@/lib/domain/types"

/*
 * A SEPA credit transfer file (ISO 20022 pain.001) of bills to pay (§8.30),
 * uploaded to the bank so the bills need not be typed in one by one. The file
 * only asks the bank to pay; nothing in the book changes until a bill is
 * marked paid.
 */

/**
 * The schema version: `03` is the 2009 version every Finnish bank's
 * guidelines describe, `09` the 2019 version of the current EPC rulebook.
 */
export type PaymentFileVersion = "03" | "09"

export const PAYMENT_FILE_VERSIONS: readonly PaymentFileVersion[] = ["03", "09"]

export interface PaymentOrder {
  /** Unique within the file, at most 35 characters; the bank returns it on the statement. */
  endToEndId: string
  amount: Cents
  creditorName: string
  /** Compact and valid. */
  creditorIban: string
  /** A Finnish or RF reference, compact; when there is none, `message` is sent. */
  reference?: string
  message?: string
  /** The day the bank is asked to pay, ISO. */
  executionDate: string
}

export interface PaymentBatch {
  /** Unique per file, at most 35 characters. */
  messageId: string
  /** Local time the file was made, `YYYY-MM-DDTHH:MM:SS`. */
  createdAt: string
  debtorName: string
  debtorIban: string
  /** The payer bank's BIC, or "" to leave it to the bank. */
  debtorBic: string
  orders: readonly PaymentOrder[]
}

/** Why a bill cannot go into the file. */
export type PaymentSkip = "noIban" | "notOwed"

/* -------------------------------------------------------------------------
 * Orders from bills
 * ---------------------------------------------------------------------- */

/**
 * The day a bill is paid: its due date, or `today` when it has none or the
 * day is already past, since a bank does not take a date behind it.
 */
export function executionDateFor(bill: Payable, today: string): string {
  return bill.due && bill.due > today ? bill.due : today
}

/**
 * The transfer that pays a bill, or the reason it cannot be one. The payee is
 * the register entry the bill names, failing that the voucher's description.
 */
export function paymentOrderFor(
  bill: Payable,
  executionDate: string,
  parties: readonly Customer[]
): PaymentOrder | PaymentSkip {
  const iban = billIban(bill.iban)
  if (!iban) return "noIban"
  if (bill.open <= 0) return "notOwed"
  const party = bill.lead.party
    ? parties.find((p) => p.id === bill.lead.party)
    : undefined
  const description = bill.lead.description.trim()
  const reference = billReference(bill.reference)
  const year = bill.lead.date.slice(0, 4)
  return {
    endToEndId: bill.lead.voucher
      ? `${year}-${bill.lead.voucher}`
      : bill.lead.id.slice(0, 35),
    amount: bill.open,
    creditorName: party?.name.trim() || description || iban,
    creditorIban: iban,
    ...(reference
      ? { reference }
      : description
        ? { message: description }
        : {}),
    executionDate,
  }
}

/* -------------------------------------------------------------------------
 * The payer bank
 * ---------------------------------------------------------------------- */

/*
 * The BICs of Finnish banks by the leading digits of the account number, the
 * longest prefix winning. The export dialog shows the result and lets the user
 * correct it, so a bank missing here costs a field to type, not a bad file.
 */
const FINNISH_BICS: readonly [string, string][] = [
  ["405", "HELSFIHH"],
  ["497", "HELSFIHH"],
  ["713", "CITIFIHX"],
  ["717", "BIGKFIH1"],
  ["799", "HOLVFIHH"],
  ["31", "HANDFIHH"],
  ["33", "ESSEFIHX"],
  ["34", "DABAFIHX"],
  ["36", "SBANFIHH"],
  ["37", "DNBAFIHX"],
  ["38", "SWEDFIHH"],
  ["39", "SBANFIHH"],
  ["47", "POPFFI22"],
  ["1", "NDEAFIHH"],
  ["2", "NDEAFIHH"],
  ["4", "ITELFIHH"],
  ["5", "OKOYFIHH"],
  ["6", "AABAFI22"],
  ["8", "DABAFIHH"],
]

/** The BIC of a Finnish IBAN's bank, or "" when it is not Finnish or not known. */
export function finnishBic(iban: string): string {
  const compact = billIban(iban)
  if (!compact?.startsWith("FI")) return ""
  const account = compact.slice(4)
  const hit = FINNISH_BICS.filter(([prefix]) =>
    account.startsWith(prefix)
  ).sort((a, b) => b[0].length - a[0].length)[0]
  return hit?.[1] ?? ""
}

/** Whether a BIC has the shape ISO 9362 gives it: 8 or 11 characters. */
export function isBic(value: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value)
}

/* -------------------------------------------------------------------------
 * XML
 * ---------------------------------------------------------------------- */

/*
 * The SEPA character set, with the Finnish letters Finnish banks also take.
 * Anything else is reduced to its base letter, or a space when it has none.
 */
function sepaText(text: string, max: number): string {
  const clean = Array.from(text.normalize("NFC"), (ch) => {
    if (/[A-Za-z0-9/\-?:().,'+ ÅÄÖåäö]/.test(ch)) return ch
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "")
    return /^[A-Za-z]$/.test(base) ? base : " "
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
  return Array.from(clean).slice(0, max).join("").trim()
}

function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;")
}

function euros(cents: Cents): string {
  const whole = Math.floor(cents / 100)
  return `${whole}.${String(cents % 100).padStart(2, "0")}`
}

/** The sum of the orders' amounts. */
export function batchTotal(orders: readonly PaymentOrder[]): Cents {
  return orders.reduce((sum, o) => sum + o.amount, 0)
}

function agent(bic: string, version: PaymentFileVersion): string {
  if (!bic) return "<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>"
  return version === "09"
    ? `<FinInstnId><BICFI>${bic}</BICFI></FinInstnId>`
    : `<FinInstnId><BIC>${bic}</BIC></FinInstnId>`
}

function remittance(order: PaymentOrder): string {
  if (order.reference) {
    // An RF reference names ISO as its issuer; a Finnish one does not.
    const issuer = isRfReference(order.reference) ? "<Issr>ISO</Issr>" : ""
    return (
      "<RmtInf><Strd><CdtrRefInf>" +
      `<Tp><CdOrPrtry><Cd>SCOR</Cd></CdOrPrtry>${issuer}</Tp>` +
      `<Ref>${xml(order.reference)}</Ref>` +
      "</CdtrRefInf></Strd></RmtInf>"
    )
  }
  const message = order.message ? sepaText(order.message, 140) : ""
  return message ? `<RmtInf><Ustrd>${xml(message)}</Ustrd></RmtInf>` : ""
}

/**
 * The file. Orders are grouped by execution date, one payment information
 * block per day, in date order. Every amount is positive, which
 * `paymentOrderFor` sees to.
 */
export function paymentFileXml(
  batch: PaymentBatch,
  version: PaymentFileVersion
): string {
  const byDate = new Map<string, PaymentOrder[]>()
  for (const o of batch.orders) {
    const list = byDate.get(o.executionDate)
    if (list) list.push(o)
    else byDate.set(o.executionDate, [o])
  }
  const debtorName = xml(sepaText(batch.debtorName, 70))
  const blocks = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, orders], i) => {
      const executed =
        version === "09"
          ? `<ReqdExctnDt><Dt>${date}</Dt></ReqdExctnDt>`
          : `<ReqdExctnDt>${date}</ReqdExctnDt>`
      const transfers = orders
        .map(
          (o) =>
            "<CdtTrfTxInf>" +
            `<PmtId><EndToEndId>${xml(sepaText(o.endToEndId, 35))}</EndToEndId></PmtId>` +
            `<Amt><InstdAmt Ccy="EUR">${euros(o.amount)}</InstdAmt></Amt>` +
            `<Cdtr><Nm>${xml(sepaText(o.creditorName, 70))}</Nm></Cdtr>` +
            `<CdtrAcct><Id><IBAN>${o.creditorIban}</IBAN></Id></CdtrAcct>` +
            remittance(o) +
            "</CdtTrfTxInf>"
        )
        .join("\n")
      return (
        "<PmtInf>" +
        `<PmtInfId>${xml(`${batch.messageId}-${i + 1}`.slice(-35))}</PmtInfId>` +
        "<PmtMtd>TRF</PmtMtd>" +
        `<NbOfTxs>${orders.length}</NbOfTxs>` +
        `<CtrlSum>${euros(batchTotal(orders))}</CtrlSum>` +
        "<PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>" +
        executed +
        `<Dbtr><Nm>${debtorName}</Nm></Dbtr>` +
        `<DbtrAcct><Id><IBAN>${batch.debtorIban}</IBAN></Id></DbtrAcct>` +
        `<DbtrAgt>${agent(batch.debtorBic, version)}</DbtrAgt>` +
        "<ChrgBr>SLEV</ChrgBr>\n" +
        transfers +
        "\n</PmtInf>"
      )
    })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.${version}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    "<CstmrCdtTrfInitn>",
    "<GrpHdr>" +
      `<MsgId>${xml(batch.messageId.slice(0, 35))}</MsgId>` +
      `<CreDtTm>${batch.createdAt}</CreDtTm>` +
      `<NbOfTxs>${batch.orders.length}</NbOfTxs>` +
      `<CtrlSum>${euros(batchTotal(batch.orders))}</CtrlSum>` +
      `<InitgPty><Nm>${debtorName}</Nm></InitgPty>` +
      "</GrpHdr>",
    ...blocks,
    "</CstmrCdtTrfInitn>",
    "</Document>",
    "",
  ].join("\n")
}

/** A message id from the moment the file is made: `KP` and the time to the second. */
export function paymentMessageId(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0")
  return (
    `KP${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  )
}

/** The local time as `YYYY-MM-DDTHH:MM:SS`, as the group header records it. */
export function localDateTime(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return (
    `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}` +
    `T${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
  )
}
