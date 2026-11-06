import { ecSales } from "@/lib/domain/ec-sales"
import { isoDate, monthOf, yearOf } from "@/lib/domain/dates"
import { form5Due } from "@/lib/domain/tax-return-deadline"
import {
  nextWorkingDay,
  periodStatus,
  vatPeriods,
  type VatPeriodKind,
} from "@/lib/domain/vat-deadline"
import type { CategoryMap, Entry } from "@/lib/domain/types"

/**
 * The tax calendar (§8.22): every date the book can name for one calendar
 * year, in order. Pure, so the view and the `.ics` export read the same list.
 *
 * Dates the app works out itself are the VAT returns (§6.5), the EC Sales
 * List (§8.7) and Form 5 (`data/rules.json`). The YEL contribution and advance
 * tax depend on the insurer's and Verohallinto's decision for the user, so the
 * user picks the months and the app supplies the day.
 */

/** Months (1 to 12) the user pays in. A setting, kept in `settings.json`. */
export interface PayMonths {
  yel: number[]
  advanceTax: number[]
}

export const NO_PAY_MONTHS: PayMonths = { yel: [], advanceTax: [] }

/** Day of the month a YEL instalment falls due (Elo, Varma). */
const YEL_DAY = 20

/** Day of the month an advance tax instalment falls due (vero.fi). */
const ADVANCE_TAX_DAY = 23

export type CalendarKind = "vat" | "ec" | "form5" | "yel" | "advanceTax"

export interface CalendarEvent {
  /** Stable across exports, so a calendar app updates an event in place. */
  id: string
  kind: CalendarKind
  /** ISO, already moved past weekends and holidays. */
  date: string
  /**
   * What the date is for: a VAT period key (`2026-09`), the month an EC list
   * covers (`2026-03`), the tax year of Form 5, or the month of an instalment.
   */
  ref: string
  /** Already dealt with: a return marked as filed. */
  done: boolean
}

export interface CalendarInput {
  year: number
  today: string
  vatPeriod: VatPeriodKind
  /** The day the book owes VAT returns from, or null (§6.5). */
  startDate: string | null
  vatFiled: Readonly<Record<string, string>>
  form5Filed: Readonly<Record<string, string>>
  payMonths: PayMonths
  entries: readonly Entry[]
  cats: CategoryMap
}

function monthList(months: readonly number[]): number[] {
  return [...new Set(months)]
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    .sort((a, b) => a - b)
}

/** The month's instalment day, or the next working day. */
function instalmentDate(year: number, month: number, day: number): string {
  return nextWorkingDay(isoDate(year, month, day) as string)
}

/** The year's dates, oldest first. */
export function taxCalendar(input: CalendarInput): CalendarEvent[] {
  const { year } = input
  const out: CalendarEvent[] = []

  // The last periods of the year before fall due in this one.
  for (const y of [year - 1, year]) {
    for (const p of vatPeriods(input.vatPeriod, y)) {
      if (yearOf(p.due) !== year) continue
      const status = periodStatus(
        p,
        input.today,
        input.vatFiled,
        input.startDate
      )
      if (status === "before") continue
      out.push({
        id: `vat-${p.key}`,
        kind: "vat",
        date: p.due,
        ref: p.key,
        done: status === "filed",
      })
    }
  }

  // Only a month with EU sales owes a list, so only those are listed.
  for (const y of [year - 1, year]) {
    for (const m of ecSales(input.entries, input.cats, y)) {
      if (yearOf(m.due) !== year) continue
      out.push({
        id: `ec-${m.key}`,
        kind: "ec",
        date: m.due,
        ref: m.key,
        done: false,
      })
    }
  }

  const due = form5Due(year - 1)
  if (due && yearOf(due) === year) {
    out.push({
      id: `form5-${year - 1}`,
      kind: "form5",
      date: due,
      ref: String(year - 1),
      done: Boolean(input.form5Filed[String(year - 1)]),
    })
  }

  for (const m of monthList(input.payMonths.yel)) {
    out.push({
      id: `yel-${year}-${m}`,
      kind: "yel",
      date: instalmentDate(year, m, YEL_DAY),
      ref: `${year}-${String(m).padStart(2, "0")}`,
      done: false,
    })
  }
  for (const m of monthList(input.payMonths.advanceTax)) {
    out.push({
      id: `tax-${year}-${m}`,
      kind: "advanceTax",
      date: instalmentDate(year, m, ADVANCE_TAX_DAY),
      ref: `${year}-${String(m).padStart(2, "0")}`,
      done: false,
    })
  }

  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  )
}

/* -------------------------------------------------------------------------
 * iCalendar
 * ---------------------------------------------------------------------- */

/** RFC 5545 text escaping. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/** Lines over 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const enc = new TextEncoder()
  const parts: string[] = []
  let cur = ""
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > (parts.length ? 74 : 75)) {
      parts.push(cur)
      cur = ""
      bytes = 0
    }
    cur += ch
    bytes += n
  }
  parts.push(cur)
  return parts.join("\r\n ")
}

const compact = (iso: string) => iso.replace(/-/g, "")

function nextDay(iso: string): string {
  const d = new Date(
    Date.UTC(yearOf(iso), monthOf(iso) - 1, Number(iso.slice(8, 10)) + 1)
  )
  return d.toISOString().slice(0, 10)
}

export interface IcsEvent {
  id: string
  date: string
  title: string
  description?: string
}

/**
 * The events as an iCalendar file of all-day entries, each with a reminder the
 * day before. `now` stamps the file and is passed in so the output is
 * deterministic.
 */
export function toIcs(
  events: readonly IcsEvent[],
  name: string,
  now: Date
): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kirjanpito//Tax calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(name)}`,
  ]
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@kirjanpito`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`,
      `SUMMARY:${escapeText(e.title)}`
    )
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    lines.push(
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(e.title)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT"
    )
  }
  lines.push("END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}
