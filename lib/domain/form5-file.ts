import { parseHetu } from "@/lib/domain/hetu"
import { parseBusinessId } from "@/lib/domain/business-id"
import { form5Values } from "@/lib/domain/form5"
import type { Form5Balance } from "@/lib/domain/form5-balance"
import { FORM5_FIELDS } from "@/lib/domain/form5-spec"
import { evaluate } from "@/lib/domain/rules/engine"
import { FORM5_RULES } from "@/lib/domain/rules/form5-rules"
import { fieldPlain, type TaxFormSection } from "@/lib/domain/tax-form"
import { vatFilePhone } from "@/lib/domain/vat-file"

/**
 * Form 5 as the data file Ilmoitin.fi takes (§8.8): Verohallinto's
 * specification for 2026, version 1.0, record `VSY00526`. The file is text, one
 * `code:value` line per field, from `000:VSY00526` to `999:1`. The user uploads
 * it themselves; nothing here sends anything. The intermediary's ID (045) is
 * left out, since the service fills it in.
 */

const RECORD = "VSY00526"
const PROGRAM = "Kirjanpito"
const SOFTWARE_SUFFIX = "KP"

/** Why the file cannot be made. */
export type Form5FileBlock =
  /** The business ID is not set, and 014 is built from it. */
  | "no-business-id"
  /** 010 is neither a valid personal ID nor a valid business ID. */
  | "bad-taxpayer-id"
  /** Negative equity makes interest non-deductible, and the rate is missing. */
  | "interest-rate"
  /** A check of the specification fails for the figures. */
  | "checks"

export interface Form5FileWarning {
  /** The specification's check, such as `Form 5 spec 2026 #1410`. */
  source: string
  codes: readonly number[]
}

export type Form5FileResult =
  | {
      ok: true
      text: string
      fileName: string
      /** Remarks Ilmoitin shows beside the return and does not refuse it for. */
      warnings: readonly Form5FileWarning[]
    }
  | { ok: false; reason: Form5FileBlock; codes?: readonly number[] }

export interface Form5FileInput {
  year: number
  sections: readonly TaxFormSection[]
  balance: Form5Balance
  /** The business ID, for 014. */
  businessId: string | null
  /** 010: the taxpayer's personal ID or business ID, as typed. */
  taxpayerId: string
  /** 042, or null. */
  phone: string | null
  /** When the file is made, for 198. */
  now: Date
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** `DDMMYYYYHHMMSS`, in the user's own time. */
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
 * Fields written when their partner is. A check asks for the one beside the
 * other to be present, and zero is a value (#424, #839, #835, #1177, #838).
 */
const PAIRS: readonly (readonly number[])[] = [
  [341, 342],
  [346, 347],
  [337, 338],
  [358, 359],
  [733, 734],
  [749, 750, 725],
  [316, 358, 359],
  [355, 358, 359],
  [718, 733, 734],
  [725, 733, 734],
  [747, 383],
  [313, 396, 271, 273, 381],
]

/** The file for a year, or the reason it cannot be made. */
export function form5File(input: Form5FileInput): Form5FileResult {
  if (!input.businessId) return { ok: false, reason: "no-business-id" }
  const taxpayer =
    parseHetu(input.taxpayerId) ?? parseBusinessId(input.taxpayerId)
  if (!taxpayer) return { ok: false, reason: "bad-taxpayer-id" }
  if (input.balance.interest.rateMissing) {
    return { ok: false, reason: "interest-rate" }
  }

  const values = form5Values(input.sections)
  const v = (code: number) => values.get(code) ?? 0
  const findings = evaluate(FORM5_RULES, v)
  const blockers = findings.filter((finding) => finding.severity === "blocker")
  if (blockers.length > 0) {
    const codes = [...new Set(blockers.flatMap((b) => b.data.codes))].sort(
      (a, b) => a - b
    )
    return { ok: false, reason: "checks", codes }
  }

  const present = new Set<number>()
  for (const [code, value] of values) if (value !== 0) present.add(code)
  for (const group of PAIRS) {
    if (group.some((code) => values.has(code) && present.has(code))) {
      for (const code of group) if (values.has(code)) present.add(code)
    }
  }
  const nil = present.size === 0

  const lines: string[] = [
    `000:${RECORD}`,
    `198:${timestamp(input.now)}`,
    `048:${PROGRAM}`,
    `014:${input.businessId}_${SOFTWARE_SUFFIX}`,
    `010:${taxpayer}`,
    `054:0101${input.year}-3112${input.year}`,
  ]
  if (nil) lines.push("969:1")
  const phone = vatFilePhone(input.phone)
  if (phone) lines.push(`042:${phone}`)
  if (!nil) {
    for (const field of FORM5_FIELDS) {
      if (!present.has(field.code)) continue
      lines.push(
        `${field.code}:${fieldPlain({ value: v(field.code), unit: unitOf(field.format) })}`
      )
    }
  }
  lines.push("999:1")

  return {
    ok: true,
    text: lines.join("\r\n") + "\r\n",
    fileName: `Lomake5-${input.year}.txt`,
    warnings: findings
      .filter((finding) => finding.severity === "warn")
      .map((finding) => ({
        source: finding.source,
        codes: finding.data.codes,
      })),
  }
}

/** The way a value is written: money with a decimal comma, the rest as the form's format says. */
function unitOf(format: string): "number" | "percent" | undefined {
  if (format.endsWith("D3,2") || format === "D2,2") return "percent"
  if (format.startsWith("N") || format.startsWith("+N")) return "number"
  return undefined
}
