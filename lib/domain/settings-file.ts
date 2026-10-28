import { LINE_BY_KEY, defaultCategories } from "@/lib/domain/accounts"
import {
  normalizeLayout,
  type OverviewWidget,
} from "@/lib/domain/overview-layout"
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
  overviewLayout: OverviewWidget[]
  autosave: boolean
  /** The full category list: the defaults as the user left them, plus custom ones. */
  categories: Category[]
  pageSize: { ledger: PageSize; categories: PageSize }
}

/**
 * What a file supplied. Every field is optional: absent means the file did
 * not carry a usable value, and the caller keeps what it already has.
 */
export type ParsedSettings = Partial<BookSettings>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const PERIOD_KEY = /^\d{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$/
const SALES_KINDS: readonly SalesKind[] = ["domestic", "eu", "nonEu", "reverse"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function pageSize(value: unknown): PageSize | undefined {
  return (PAGE_SIZES as readonly unknown[]).includes(value)
    ? (value as PageSize)
    : undefined
}

function parseCategory(value: unknown): Category | null {
  if (!isRecord(value)) return null
  const { id, line, name, vatRate, kind, enabled, custom } = value
  if (typeof id !== "string" || !id) return null
  if (typeof line !== "string" || !LINE_BY_KEY.has(line)) return null
  if (typeof name !== "string" || !name.trim()) return null
  if (typeof vatRate !== "number" || !(vatRate >= 0 && vatRate < 100)) {
    return null
  }
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
 * Custom categories come across whole.
 */
export function mergeCategories(fromFile: readonly Category[]): Category[] {
  const byId = new Map(fromFile.map((c) => [c.id, c]))
  const defaults = defaultCategories().map((d) => {
    const own = byId.get(d.id)
    return own && !own.custom
      ? { ...d, enabled: own.enabled, vatRate: own.vatRate }
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
  }
  return `${JSON.stringify(file, null, 2)}\n`
}
