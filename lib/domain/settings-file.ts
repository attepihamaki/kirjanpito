import { type TaxPayment } from "@/lib/domain/vat-filing"
import {
  LINE_BY_KEY,
  RETIRED_CATEGORY_ID,
  canBeEuPurchase,
  canHaveShare,
  defaultCategories,
} from "@/lib/domain/accounts"
import { isShare } from "@/lib/domain/calc"
import { FEATURES, type Feature } from "@/lib/domain/features"
import { parseBusinessId } from "@/lib/domain/business-id"
import { isVatRate } from "@/lib/domain/money"
import type { AssetOpening } from "@/lib/domain/assets"
import type { BankBalance } from "@/lib/domain/bank-balance"
import type { PayMonths } from "@/lib/domain/tax-calendar"
import {
  LOGGED_FIELDS,
  type ChangeAction,
  type ChangeRecord,
  type FieldChange,
  type LoggedField,
} from "@/lib/domain/change-log"
import {
  EMPTY_YEAR_END,
  type LoanOpening,
  type YearEnd,
} from "@/lib/domain/form5-balance"
import {
  normalizeLayout,
  type OverviewWidget,
} from "@/lib/domain/overview-layout"
import {
  foldText,
  MIN_RULE_TEXT,
  type CategoryRule,
} from "@/lib/domain/category-rules"
import type { RecurringEntry } from "@/lib/domain/recurring"
import {
  EU_PURCHASE_KINDS,
  type Category,
  type EuPurchase,
  type Lang,
  type SalesKind,
} from "@/lib/domain/types"
import type { TraderType } from "@/lib/domain/open-items"
import type { VatPeriodKind } from "@/lib/domain/vat-deadline"
import type { ArchiveStub } from "@/lib/domain/year-archive"

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

const PAGE_SIZES = [10, 25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export type ThemeChoice = "light" | "dark" | "system"

export interface BookSettings {
  language: Lang
  theme: ThemeChoice
  /**
   * The language the bookkeeping is written out in (§7.1, §7.2): the ZIP's
   * suggested name, the CSV's name and column labels, the word in each
   * `type`, `mode`, `eu_purchase` and `paid` cell, the category names, and the
   * receipt folder. It belongs to the book rather than to the browser, so a
   * file opened elsewhere is saved back in the shape it arrived in.
   */
  exportLang: Lang
  /** `"0112038-9"`: the business's own y-tunnus, or null if not given (§8.10). */
  businessId: string | null
  /** The business's own name, or null (§8.10). */
  businessName: string | null
  /** The contact phone for the VAT file's 042 (§8.7), or null. */
  businessPhone: string | null
  vatPeriod: VatPeriodKind
  /** Which kind of sole trader keeps the book (§6.3). */
  traderType: TraderType
  /** Features the user switched off (§8.26). Absent in a file means none. */
  hiddenFeatures: Feature[]
  /** `"2026-10"`: the month the bookkeeping began, or null to follow the first entry. */
  bookStart: string | null
  /** Period key (`"2026-09"`, `"2026-Q3"`, `"2026"`) → ISO date it was marked. */
  vatFiled: Record<string, string>
  /** Period key → the return's figures on the day it was marked (§6.5). */
  vatFiledFigures: Record<string, Record<string, number>>
  /** Where VAT is paid: the tax account and its reference (§8.7). */
  taxPayment: TaxPayment
  /** Year (`"2025"`) → ISO date its material was marked as stored away. */
  yearsArchived: Record<string, string>
  /** Year (`"2025"`) → ISO date its Form 5 was marked as filed (§8.8). */
  form5Filed: Record<string, string>
  /** Year (`"2025"`) → where its entries went when it was archived (§8.19). */
  archives: Record<string, ArchiveStub>
  /**
   * Present only in an archive file: the year it holds. A book opened from
   * such a file is read-only (§8.19).
   */
  archiveOf: number | null
  overviewLayout: OverviewWidget[]
  autosave: boolean
  /** The ZIP is written AES-encrypted (§7.8). */
  encrypted: boolean
  /** The full category list: the defaults as the user left them, plus custom ones. */
  categories: Category[]
  pageSize: { ledger: PageSize; categories: PageSize }
  /** Monthly templates (§8.5). */
  recurring: RecurringEntry[]
  /** The user's rules for picking a category, in order (§8.17). */
  categoryRules: CategoryRule[]
  /** The fixed asset balance the register starts from, or null (§8.8). */
  assetOpening: AssetOpening | null
  /** The bank balance as last read, or null (§8.12). */
  bankBalance: BankBalance | null
  /** The months YEL and advance tax fall in (§8.22). */
  payMonths: PayMonths
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
export type ParsedSettings = Partial<BookSettings> & {
  /**
   * The file says it was written by a later version than this one, so it may
   * hold settings this reader passed over. Reading stays lenient; the import
   * says so rather than leaving the loss silent (§8).
   */
  fromNewerVersion?: true
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR = /^[0-9]{4}$/
/** A VAT return field: "301", or "311/312" for the unsplit EU sales. */
const FIELD_CODE = /^\d{3}(\/\d{3})?$/
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
    ...(isEuPurchase(euPurchase) ? { euPurchase } : {}),
    day: day as number,
    from,
  }
}

function parseCategoryRule(value: unknown): CategoryRule | null {
  if (!isRecord(value)) return null
  const { id, contains, catId, vatRate } = value
  if (typeof id !== "string" || !id) return null
  if (
    typeof contains !== "string" ||
    foldText(contains).length < MIN_RULE_TEXT
  ) {
    return null
  }
  if (typeof catId !== "string" || !catId) return null
  if (vatRate != null && (typeof vatRate !== "number" || !isVatRate(vatRate))) {
    return null
  }
  return { id, contains: contains.trim(), catId, vatRate: vatRate ?? null }
}

function isEuPurchase(value: unknown): value is EuPurchase {
  return EU_PURCHASE_KINDS.includes(value as EuPurchase)
}

function parseCategory(value: unknown): Category | null {
  if (!isRecord(value)) return null
  const { id, line, name, vatRate, kind, euPurchase, share, enabled, custom } =
    value
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
  if (isEuPurchase(euPurchase) && canBeEuPurchase(LINE_BY_KEY.get(line))) {
    cat.euPurchase = euPurchase
  }
  // A share belongs to a cost that is not an EU purchase (§6.12).
  if (isShare(share) && canHaveShare(LINE_BY_KEY.get(line), cat.euPurchase)) {
    cat.share = share
  }
  return cat
}

function parseFieldChange(value: unknown): FieldChange | null {
  if (!isRecord(value)) return null
  const { field, from, to } = value
  const isValue = (v: unknown): v is FieldChange["from"] =>
    v === null || typeof v === "string" || typeof v === "number"
  if (!LOGGED_FIELDS.includes(field as LoggedField)) return null
  if (!isValue(from) || !isValue(to)) return null
  return { field: field as LoggedField, from, to }
}

/**
 * One record of the change log, rebuilt field by field, because its dialog
 * renders what it holds. An action this version does not know is kept, so that
 * saving a newer file does not cut its log; the dialog shows it with no text.
 */
function parseChangeRecord(value: unknown): ChangeRecord | null {
  if (!isRecord(value)) return null
  const { at, action, entryId, voucher, date, description, changes, period } =
    value
  if (typeof at !== "string" || Number.isNaN(Date.parse(at))) return null
  if (typeof action !== "string" || !action) return null
  return {
    at,
    action: action as ChangeAction,
    ...(typeof entryId === "string" && entryId ? { entryId } : {}),
    ...(Number.isInteger(voucher) ? { voucher: voucher as number } : {}),
    ...(typeof date === "string" && ISO_DATE.test(date) ? { date } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(Array.isArray(changes)
      ? {
          changes: changes
            .map(parseFieldChange)
            .filter((c): c is FieldChange => c !== null),
        }
      : {}),
    ...(typeof period === "string" ? { period } : {}),
  }
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
          ...(own.share ? { share: own.share } : {}),
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
  if (typeof raw.version === "number" && raw.version > SETTINGS_VERSION) {
    out.fromNewerVersion = true
  }
  if (raw.language === "fi" || raw.language === "en") {
    out.language = raw.language
  }
  if (raw.theme === "light" || raw.theme === "dark" || raw.theme === "system") {
    out.theme = raw.theme
  }
  if (raw.exportLang === "fi" || raw.exportLang === "en") {
    out.exportLang = raw.exportLang
  }
  if (raw.businessId === null) out.businessId = null
  else if (typeof raw.businessId === "string") {
    const businessId = parseBusinessId(raw.businessId)
    if (businessId) out.businessId = businessId
  }
  if (raw.businessName === null) out.businessName = null
  else if (typeof raw.businessName === "string" && raw.businessName.trim()) {
    out.businessName = raw.businessName.trim()
  }
  if (raw.businessPhone === null) out.businessPhone = null
  else if (typeof raw.businessPhone === "string" && raw.businessPhone.trim()) {
    out.businessPhone = raw.businessPhone.trim()
  }
  if (
    raw.vatPeriod === "month" ||
    raw.vatPeriod === "quarter" ||
    raw.vatPeriod === "year"
  ) {
    out.vatPeriod = raw.vatPeriod
  }
  if (raw.traderType === "professional" || raw.traderType === "business") {
    out.traderType = raw.traderType
  }
  if (Array.isArray(raw.hiddenFeatures)) {
    const listed: unknown[] = raw.hiddenFeatures
    out.hiddenFeatures = FEATURES.filter((f) => listed.includes(f))
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
  if (isRecord(raw.vatFiledFigures)) {
    const figures: Record<string, Record<string, number>> = {}
    for (const [key, fields] of Object.entries(raw.vatFiledFigures)) {
      if (!PERIOD_KEY.test(key) || !isRecord(fields)) continue
      const kept: Record<string, number> = {}
      for (const [code, cents] of Object.entries(fields)) {
        if (
          FIELD_CODE.test(code) &&
          typeof cents === "number" &&
          Number.isInteger(cents) &&
          cents !== 0
        ) {
          kept[code] = cents
        }
      }
      figures[key] = kept
    }
    out.vatFiledFigures = figures
  }
  if (isRecord(raw.taxPayment)) {
    const text = (v: unknown) =>
      typeof v === "string" ? v.trim().slice(0, 64) : ""
    out.taxPayment = {
      iban: text(raw.taxPayment.iban),
      reference: text(raw.taxPayment.reference),
    }
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
  if (isRecord(raw.archives)) {
    const stubs: Record<string, ArchiveStub> = {}
    for (const [key, value] of Object.entries(raw.archives)) {
      if (!YEAR.test(key) || !isRecord(value)) continue
      if (
        typeof value.file === "string" &&
        value.file &&
        typeof value.on === "string" &&
        ISO_DATE.test(value.on) &&
        Number.isInteger(value.entries) &&
        (value.entries as number) >= 0
      ) {
        stubs[key] = {
          file: value.file,
          on: value.on,
          entries: value.entries as number,
        }
      }
    }
    out.archives = stubs
  }
  if (raw.archiveOf === null) out.archiveOf = null
  else if (
    typeof raw.archiveOf === "number" &&
    Number.isInteger(raw.archiveOf) &&
    YEAR.test(String(raw.archiveOf))
  ) {
    out.archiveOf = raw.archiveOf
  }
  if (isRecord(raw.overview) && Array.isArray(raw.overview.layout)) {
    out.overviewLayout = normalizeLayout(raw.overview.layout)
  }
  if (typeof raw.autosave === "boolean") out.autosave = raw.autosave
  if (typeof raw.encrypted === "boolean") out.encrypted = raw.encrypted
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
  if (Array.isArray(raw.categoryRules)) {
    out.categoryRules = raw.categoryRules
      .map(parseCategoryRule)
      .filter((r): r is CategoryRule => r !== null)
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
    out.changeLog = raw.changeLog
      .map(parseChangeRecord)
      .filter((r): r is ChangeRecord => r !== null)
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
  if (isRecord(raw.payMonths)) {
    const months = (v: unknown): number[] =>
      Array.isArray(v)
        ? [...new Set(v)]
            .filter(
              (m): m is number => Number.isInteger(m) && m >= 1 && m <= 12
            )
            .sort((a, b) => a - b)
        : []
    const yearly: Record<string, number> = {}
    if (isRecord(raw.payMonths.advanceTaxYearly)) {
      for (const [year, cents] of Object.entries(
        raw.payMonths.advanceTaxYearly
      )) {
        if (
          /^\d{4}$/.test(year) &&
          typeof cents === "number" &&
          Number.isInteger(cents) &&
          cents > 0
        ) {
          yearly[year] = cents
        }
      }
    }
    const rate = raw.payMonths.taxRate
    out.payMonths = {
      yel: months(raw.payMonths.yel),
      advanceTax: months(raw.payMonths.advanceTax),
      advanceTaxYearly: yearly,
      taxRate:
        typeof rate === "number" && Number.isFinite(rate) && rate >= 0
          ? rate
          : null,
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
    exportLang: s.exportLang,
    businessId: s.businessId,
    businessName: s.businessName,
    businessPhone: s.businessPhone,
    vatPeriod: s.vatPeriod,
    traderType: s.traderType,
    hiddenFeatures: [...s.hiddenFeatures],
    bookStart: s.bookStart,
    vatFiled: Object.fromEntries(
      Object.entries(s.vatFiled).sort(([a], [b]) => a.localeCompare(b))
    ),
    vatFiledFigures: Object.fromEntries(
      Object.entries(s.vatFiledFigures).sort(([a], [b]) => a.localeCompare(b))
    ),
    taxPayment: s.taxPayment,
    yearsArchived: Object.fromEntries(
      Object.entries(s.yearsArchived).sort(([a], [b]) => a.localeCompare(b))
    ),
    form5Filed: Object.fromEntries(
      Object.entries(s.form5Filed).sort(([a], [b]) => a.localeCompare(b))
    ),
    archives: Object.fromEntries(
      Object.entries(s.archives).sort(([a], [b]) => a.localeCompare(b))
    ),
    ...(s.archiveOf !== null ? { archiveOf: s.archiveOf } : {}),
    overview: { layout: s.overviewLayout },
    autosave: s.autosave,
    encrypted: s.encrypted,
    categories: s.categories.map((c) => ({
      id: c.id,
      line: c.line,
      name: c.name,
      vatRate: c.vatRate,
      ...(c.kind ? { kind: c.kind } : {}),
      ...(c.euPurchase ? { euPurchase: c.euPurchase } : {}),
      ...(c.share ? { share: c.share } : {}),
      enabled: c.enabled,
      custom: c.custom,
    })),
    pageSize: s.pageSize,
    recurring: s.recurring,
    categoryRules: s.categoryRules,
    assetOpening: s.assetOpening,
    bankBalance: s.bankBalance,
    payMonths: s.payMonths,
    loanOpening: s.loanOpening,
    yearEnd: s.yearEnd,
    changeLog: s.changeLog,
  }
  return `${JSON.stringify(file, null, 2)}\n`
}
