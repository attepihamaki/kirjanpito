import {
  LINE_BY_KEY,
  RETIRED_CATEGORY_ID,
  defaultCategories,
} from "@/lib/domain/accounts"
import { isVatRate } from "@/lib/domain/money"
import type { AssetOpening } from "@/lib/domain/assets"
import type { BankBalance } from "@/lib/domain/bank-balance"
import type { ChangeRecord } from "@/lib/domain/change-log"
import {
  EMPTY_YEAR_END,
  type LoanOpening,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import {
  normalizeLayout,
  type OverviewWidget,
} from "@/lib/domain/overview-layout"
import type { RecurringEntry } from "@/lib/domain/recurring"
import type { Category, Lang, SalesKind } from "@/lib/domain/types"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"

/**
 * `settings.json`, the second file in a bookkeeping ZIP (§7.6).
 *
 * The CSV holds the entries and stays the Finnish, Excel-friendly format of
 * §7.1. Everything else that belongs to a bookkeeping lives here: the
 * categories, how often VAT is filed and which returns are filed, the
 * overview layout, and the user's preferences. Its keys are English, like the
 * fields in browser storage, because nobody edits it by hand.
 *
 * Reading is lenient in the way the CSV import is: a missing file means
 * defaults, and a bad value is dropped on its own while the rest is kept.
 */

export const SETTINGS_FILE_NAME = "settings.json"

/** Version of the shape below. A reader ignores keys it does not know. */
export const SETTINGS_VERSION = 1

export const PAGE_SIZES = [10, 25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export type ThemeChoice = "light" | "dark" | "system"

export interface BookSettings {
  language: Lang
  theme: ThemeChoice
  vatPeriod: VatPeriodKind
  /** `"2026-10"`: the month the bookkeeping began, or null to follow the first entry. */
  bookStart: string | null
  /** Period key (`"2026-09"`, `"2026-Q3"`, `"2026"`) → ISO date it was marked. */
  vatFiled: Record<string, string>
  /** Year (`"2025"`) → ISO date its material was marked as stored away. */
  yearsArchived: Record<string, string>
  /** Year (`"2025"`) → ISO date its Form 5 was marked as filed (§8.8). */
  form5Filed: Record<string, string>
  overviewLayout: OverviewWidget[]
  autosave: boolean
  /** The full category list: the defaults as the user left them, plus custom ones. */
  categories: Category[]
  pageSize: { ledger: PageSize; categories: PageSize }
  /** Monthly templates (§8.5). */
  recurring: RecurringEntry[]
  /** The fixed asset balance the register starts from, or null (§8.8). */
  assetOpening: AssetOpening | null
  /** The bank balance as last read, or null (§8.12). */
  bankBalance: BankBalance | null
  /** The loans outstanding when the book starts, or null (§6.8). */
  loanOpening: LoanOpening | null
  /** Year (`"2026"`) → what the book cannot supply for Form 5 (§8.8). */
  yearEnd: Record<string, YearEnd>
  /** What has happened to the entries, oldest first (§8.11). */
  changeLog: ChangeRecord[]
}

/**
 * What a file supplied. Every field is optional: absent means the file did
 * not carry a usable value, and the caller keeps what it already has.
 */
export type ParsedSettings = Partial<BookSettings>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR = /^[0-9]{4}$/
const PERIOD_KEY = /^\d{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$/
const SALES_KINDS: readonly SalesKind[] = [
  "domestic",
  "euGoods",
  "euServices",
  "eu",
  "nonEu",
  "reverse",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function pageSize(value: unknown): PageSize | undefined {
  return (PAGE_SIZES as readonly unknown[]).includes(value)
    ? (value as PageSize)
    : undefined
}

function parseRecurring(value: unknown): RecurringEntry | null {
  if (!isRecord(value)) return null
  const {
    id,
    description,
    type,
    catId,
    amount,
    vatRate,
    amountMode,
    euPurchase,
    day,
    from,
  } = value
  if (typeof id !== "string" || !id) return null
  if (typeof description !== "string" || !description.trim()) return null
  if (type !== "income" && type !== "expense") return null
  if (typeof catId !== "string" || !catId) return null
  if (!Number.isInteger(amount) || amount === 0) return null
  if (typeof vatRate !== "number" || !isVatRate(vatRate)) return null
  if (amountMode !== "gross" && amountMode !== "net") return null
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) {
    return null
  }
  if (typeof from !== "string" || !MONTH.test(from)) return null
  return {
    id,
    description: description.trim(),
    type,
    catId,
    amount: amount as number,
    vatRate,
    amountMode,
    ...(euPurchase === "goods" || euPurchase === "services"
      ? { euPurchase }
      : {}),
    day: day as number,
    from,
  }
}

function parseCategory(value: unknown): Category | null {
  if (!isRecord(value)) return null
  const { id, line, name, vatRate, kind, enabled, custom } = value
  if (typeof id !== "string" || !id) return null
  if (typeof line !== "string" || !LINE_BY_KEY.has(line)) return null
  if (typeof name !== "string" || !name.trim()) return null
  if (typeof vatRate !== "number" || !isVatRate(vatRate)) return null
  if (typeof enabled !== "boolean") return null
  const cat: Category = {
    id,
    line,
    name: name.trim(),
    vatRate,
    enabled,
    custom: custom === true,
  }
  if (SALES_KINDS.includes(kind as SalesKind)) cat.kind = kind as SalesKind
  return cat
}

/**
 * Overlay the file's categories on the defaults. A default keeps its own id,
 * line, name and kind, which are the chart of accounts, and takes only the
 * user's choices from the file: whether it is enabled and its default rate.
 * Custom categories come across whole. A default the file does not list, which
 * is how a newer default reaches an older file, comes in as it is. The retired
 * category stays disabled, or an older file would offer it again.
 */
export function mergeCategories(fromFile: readonly Category[]): Category[] {
  const byId = new Map(fromFile.map((c) => [c.id, c]))
  const defaults = defaultCategories().map((d) => {
    const own = byId.get(d.id)
    return own && !own.custom
      ? {
          ...d,
          enabled: d.id !== RETIRED_CATEGORY_ID && own.enabled,
          vatRate: own.vatRate,
        }
      : d
  })
  const known = new Set(defaults.map((d) => d.id))
  const custom = fromFile.filter((c) => c.custom && !known.has(c.id))
  return [...defaults, ...custom]
}

export function parseSettings(text: string): ParsedSettings {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {}
  }
  if (!isRecord(raw)) return {}

  const out: ParsedSettings = {}
  if (raw.language === "fi" || raw.language === "en") {
    out.language = raw.language
  }
  if (raw.theme === "light" || raw.theme === "dark" || raw.theme === "system") {
    out.theme = raw.theme
  }
  if (
    raw.vatPeriod === "month" ||
    raw.vatPeriod === "quarter" ||
    raw.vatPeriod === "year"
  ) {
    out.vatPeriod = raw.vatPeriod
  }
  if (raw.bookStart === null) out.bookStart = null
  else if (typeof raw.bookStart === "string" && MONTH.test(raw.bookStart)) {
    out.bookStart = raw.bookStart
  }
  if (isRecord(raw.vatFiled)) {
    const filed: Record<string, string> = {}
    for (const [key, date] of Object.entries(raw.vatFiled)) {
      if (
        PERIOD_KEY.test(key) &&
        typeof date === "string" &&
        ISO_DATE.test(date)
      ) {
        filed[key] = date
      }
    }
    out.vatFiled = filed
  }
  if (isRecord(raw.yearsArchived)) {
    const archived: Record<string, string> = {}
    for (const [key, date] of Object.entries(raw.yearsArchived)) {
      if (YEAR.test(key) && typeof date === "string" && ISO_DATE.test(date)) {
        archived[key] = date
      }
    }
    out.yearsArchived = archived
  }
  if (isRecord(raw.form5Filed)) {
    const filed: Record<string, string> = {}
    for (const [key, date] of Object.entries(raw.form5Filed)) {
      if (YEAR.test(key) && typeof date === "string" && ISO_DATE.test(date)) {
        filed[key] = date
      }
    }
    out.form5Filed = filed
  }
  if (isRecord(raw.overview) && Array.isArray(raw.overview.layout)) {
    out.overviewLayout = normalizeLayout(raw.overview.layout)
  }
  if (typeof raw.autosave === "boolean") out.autosave = raw.autosave
  if (Array.isArray(raw.categories)) {
    const cats = raw.categories
      .map(parseCategory)
      .filter((c): c is Category => c !== null)
    out.categories = mergeCategories(cats)
  }
  if (Array.isArray(raw.recurring)) {
    out.recurring = raw.recurring
      .map(parseRecurring)
      .filter((r): r is RecurringEntry => r !== null)
  }
  if (raw.assetOpening === null) out.assetOpening = null
  else if (
    isRecord(raw.assetOpening) &&
    Number.isInteger(raw.assetOpening.year) &&
    Number.isInteger(raw.assetOpening.amount) &&
    (raw.assetOpening.amount as number) >= 0
  ) {
    out.assetOpening = {
      year: raw.assetOpening.year as number,
      amount: raw.assetOpening.amount as number,
    }
  }
  if (raw.loanOpening === null) out.loanOpening = null
  else if (
    isRecord(raw.loanOpening) &&
    Number.isInteger(raw.loanOpening.year) &&
    Number.isInteger(raw.loanOpening.amount) &&
    (raw.loanOpening.amount as number) >= 0
  ) {
    out.loanOpening = {
      year: raw.loanOpening.year as number,
      amount: raw.loanOpening.amount as number,
    }
  }
  if (isRecord(raw.yearEnd)) {
    const years: Record<string, YearEnd> = {}
    for (const [key, value] of Object.entries(raw.yearEnd)) {
      if (!YEAR.test(key) || !isRecord(value)) continue
      const row: YearEnd = { ...EMPTY_YEAR_END }
      for (const field of Object.keys(row) as (keyof YearEnd)[]) {
        const amount = value[field]
        if (Number.isInteger(amount) && (amount as number) >= 0) {
          row[field] = amount as number
        }
      }
      years[key] = row
    }
    out.yearEnd = years
  }
  if (Array.isArray(raw.changeLog)) {
    out.changeLog = raw.changeLog.filter(
      (r): r is ChangeRecord =>
        isRecord(r) && typeof r.at === "string" && typeof r.action === "string"
    )
  }
  if (raw.bankBalance === null) out.bankBalance = null
  else if (
    isRecord(raw.bankBalance) &&
    Number.isInteger(raw.bankBalance.amount) &&
    typeof raw.bankBalance.date === "string" &&
    ISO_DATE.test(raw.bankBalance.date)
  ) {
    out.bankBalance = {
      amount: raw.bankBalance.amount as number,
      date: raw.bankBalance.date,
    }
  }
  if (isRecord(raw.pageSize)) {
    const ledger = pageSize(raw.pageSize.ledger)
    const categories = pageSize(raw.pageSize.categories)
    if (ledger && categories) out.pageSize = { ledger, categories }
  }
  return out
}

/** Pretty-printed, so a curious user can read it, with a trailing newline. */
export function serializeSettings(s: BookSettings): string {
  const file = {
    version: SETTINGS_VERSION,
    language: s.language,
    theme: s.theme,
    vatPeriod: s.vatPeriod,
    bookStart: s.bookStart,
    vatFiled: Object.fromEntries(
      Object.entries(s.vatFiled).sort(([a], [b]) => a.localeCompare(b))
    ),
    yearsArchived: Object.fromEntries(
      Object.entries(s.yearsArchived).sort(([a], [b]) => a.localeCompare(b))
    ),
    form5Filed: Object.fromEntries(
      Object.entries(s.form5Filed).sort(([a], [b]) => a.localeCompare(b))
    ),
    overview: { layout: s.overviewLayout },
    autosave: s.autosave,
    categories: s.categories.map((c) => ({
      id: c.id,
      line: c.line,
      name: c.name,
      vatRate: c.vatRate,
      ...(c.kind ? { kind: c.kind } : {}),
      enabled: c.enabled,
      custom: c.custom,
    })),
    pageSize: s.pageSize,
    recurring: s.recurring,
    assetOpening: s.assetOpening,
    bankBalance: s.bankBalance,
    loanOpening: s.loanOpening,
    yearEnd: s.yearEnd,
    changeLog: s.changeLog,
  }
  return `${JSON.stringify(file, null, 2)}\n`
}
