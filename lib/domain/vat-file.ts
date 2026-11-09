import { formatAmountForCsv } from "@/lib/domain/money"
import type { VatReport } from "@/lib/domain/vat"
import type { VatPeriod } from "@/lib/domain/vat-deadline"
import { vatReturnSections, vatReturnValues } from "@/lib/domain/vat-return"

/**
 * The VAT return as the data file Ilmoitin.fi takes (§8.7): Verohallinto's
 * specification VSRALVKV, version 1.10. The file is text, one `code:value` line
 * per field, from `000:VSRALVKV` to `999:1`. The user uploads it themselves;
 * nothing here sends anything.
 */

/** The program name written to 048. */
const VAT_FILE_PROGRAM = "Kirjanpito"

/** Suffix of 014, which the specification builds as `Y-TUNNUS_AN2`. */
const SOFTWARE_SUFFIX = "KP"

/** AN35: the longest a program name or phone number may be. */
const MAX_AN35 = 35

/** The fields that carry an amount, in the order of the specification. */
const AMOUNT_CODES = [
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "308",
  "309",
  "310",
  "311",
  "312",
  "313",
  "314",
  "318",
  "319",
  "320",
] as const

/**
 * The reason a replacement return gives for the correction: the fields 332 to
 * 335 of the specification, each a flag that is `1` when set. At most one
 * applies; none means the file is an original return.
 */
export const CORRECTION_REASONS = ["332", "333", "334", "335"] as const
export type CorrectionReason = (typeof CORRECTION_REASONS)[number]

/** Why a period cannot be written as a file. */
export type VatFileBlock =
  /** The business ID is not set, and 010 is required. */
  | "no-business-id"
  /** Sales on the retired EU category: 311 or 312 cannot be told apart. */
  | "eu-unsplit"
  /** 308 differs from the tax fields minus 307, which check #1924 refuses. */
  | "sum-mismatch"

export interface VatFileInput {
  report: VatReport
  period: VatPeriod
  /** `0112038-9`, or null when not set. */
  businessId: string | null
  /** The contact phone for 042, or null. */
  phone: string | null
  /** When the file is made, for 198. */
  now: Date
  /** The reason for a replacement return (§8.7), or absent for an original. */
  correction?: CorrectionReason | null
}

export type VatFileResult =
  | { ok: true; text: string; fileName: string }
  | { ok: false; reason: VatFileBlock }

const pad2 = (n: number) => String(n).padStart(2, "0")

/** `DDMMYYYYHHMMSS`, in the user's own time, as the specification's example. */
function timestamp(d: Date): string {
  return (
    pad2(d.getDate()) +
    pad2(d.getMonth() + 1) +
    String(d.getFullYear()) +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  )
}

/**
 * A phone number cut to what AN35 and a plain-text file can carry: digits,
 * plus, hyphen and single spaces. Null when nothing is left.
 */
export function vatFilePhone(value: string | null): string | null {
  const clean = (value ?? "")
    .replace(/[^0-9+\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_AN35)
    .trim()
  return clean || null
}

/**
 * The file for a closed period, or the reason it cannot be made.
 *
 * A period with no amounts is a nil return: `056:1` and no amount fields, since
 * check #1142 forbids both together. Otherwise every amount field is written,
 * zeros included. 308 is signed here (a refund is negative), where the view
 * shows it unsigned under a "refund" label.
 */
export function vatReturnFile(input: VatFileInput): VatFileResult {
  const { report, period } = input
  if (!input.businessId) return { ok: false, reason: "no-business-id" }
  if (report.otherSales.eu !== 0) return { ok: false, reason: "eu-unsplit" }

  const values = new Map(vatReturnValues(vatReturnSections(report)))
  values.set("308", report.due)
  const v = (code: string) => values.get(code) ?? 0

  const tax = ["301", "302", "303", "304", "305", "306", "318"].reduce(
    (acc, code) => acc + v(code),
    0
  )
  if (tax - v("307") !== v("308")) return { ok: false, reason: "sum-mismatch" }

  const lines: string[] = [
    "000:VSRALVKV",
    `198:${timestamp(input.now)}`,
    `048:${VAT_FILE_PROGRAM}`,
    `014:${input.businessId}_${SOFTWARE_SUFFIX}`,
    `010:${input.businessId}`,
    `050:${period.kind === "month" ? "K" : period.kind === "quarter" ? "Q" : "V"}`,
  ]
  if (period.kind !== "year") lines.push(`052:${period.index}`)
  lines.push(`053:${period.year}`)

  const nil = AMOUNT_CODES.every((code) => v(code) === 0)
  if (nil) lines.push("056:1")
  else {
    for (const code of AMOUNT_CODES) {
      lines.push(`${code}:${formatAmountForCsv(v(code))}`)
    }
  }

  if (input.correction) lines.push(`${input.correction}:1`)

  const phone = vatFilePhone(input.phone)
  if (phone) lines.push(`042:${phone}`)
  lines.push("999:1")

  return {
    ok: true,
    text: lines.join("\r\n") + "\r\n",
    fileName: `VSRALVKV-${input.businessId}-${period.key}${input.correction ? "-korvaava" : ""}.txt`,
  }
}
