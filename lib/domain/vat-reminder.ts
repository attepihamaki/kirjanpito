import { daysBetween, type TimelinePeriod } from "@/lib/domain/vat-deadline"

/** How many days before the due date the banner starts to show (§8.7). */
const VAT_REMINDER_DAYS = 7

export interface VatReminder {
  period: TimelinePeriod
  /** Days to the due date. Negative once the return is overdue. */
  days: number
  overdue: boolean
}

/**
 * The return the banner is about: the oldest overdue one, else the first
 * closed, unfiled one that falls due within `leadDays`. Null when nothing needs
 * the user yet. An open period is never a reminder, since its figures are not
 * final, and a filed one never is either.
 */
export function vatReminder(
  timeline: readonly TimelinePeriod[],
  today: string,
  leadDays: number = VAT_REMINDER_DAYS
): VatReminder | null {
  for (const period of timeline) {
    const days = daysBetween(today, period.due)
    if (period.status === "overdue") {
      return { period, days, overdue: true }
    }
    if (period.status === "due" && days <= leadDays) {
      return { period, days, overdue: false }
    }
  }
  return null
}
