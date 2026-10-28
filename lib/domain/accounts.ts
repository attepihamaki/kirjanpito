import type {
  Bucket,
  Category,
  EntryType,
  Lang,
  SalesKind,
} from "@/lib/domain/types"

/** One line of the income statement (tuloslaskelma), per CLAUDE.md §5. */
export interface AccountLine {
  key: string
  /** Account number (tili). Several lines may share one, e.g. the four 344s. */
  account: number
  side: EntryType
  name: Readonly<Record<Lang, string>>
  /** Group heading this line sits under, if any. */
  group: Readonly<Record<Lang, string>> | null
  /** Default VAT % for categories on this line. */
  vatRate: number
  /** Expense summary bucket. Null on income lines. */
  bucket: Bucket | null
  /** Lines 365–367: listed on the statement but not deducted (§6.3). */
  nondeductible: boolean
  /** Line 317: listed on the statement but not taxed, so not in the result (§6.3). */
  taxExempt: boolean
  /** Line 341: only half is deducted, as Form 5's field 342 (§6.3). */
  halfDeductible: boolean
  /**
   * Dividends: the percentage that is taxable business income, which Form 5
   * asks for as 320 (of 319) and 322 (of 321). Null on every other line (§6.3).
   */
  taxableShare: number | null
}

/**
 * VAT rates offered in the entry dialog.
 *
 * The general rate rose to 25,5 % on 1 September 2024 and the 14 % rate was
 * lowered to 13,5 % at the start of 2026. Older rates are kept so older
 * entries and corrections still work.
 */
export const RATES: readonly number[] = [25.5, 24, 14, 13.5, 10, 0]
/**
 * The taxable share of a dividend in a sole trader's business income source:
 * 85 % from a listed company, 75 % from any other (vero.fi, Osinkotulojen
 * verotus, 2.4; EVL 6 a § 6 mom.).
 */
const TAXABLE_SHARE: Readonly<Record<string, number>> = { "319": 85, "321": 75 }

const GROUP = {
  varVah: { fi: "Varausten vähennys", en: "Decrease in provisions" },
  yksityis: { fi: "Yksityiskäyttö", en: "Private use" },
  muutTuotot: { fi: "Muut tuotot", en: "Other income" },
  henkilosto: { fi: "Henkilöstökulut", en: "Personnel expenses" },
  poistot: {
    fi: "Poistot, edustuskulut ja vuokrat",
    en: "Depreciation, entertainment and rent",
  },
  muutVah: {
    fi: "Muut vähennyskelpoiset kulut",
    en: "Other deductible expenses",
  },
  rahoitus: { fi: "Rahoituskulut", en: "Financial expenses" },
  varMuutos: { fi: "Varausten muutokset", en: "Changes in provisions" },
  vahKelvoton: {
    fi: "Vähennyskelvottomat kulut",
    en: "Non-deductible expenses",
  },
} as const

/**
 * The chart of accounts, in display order.
 *
 * Note that 354 deliberately precedes 346/349/353: it belongs under the "Muut
 * vähennyskelpoiset kulut" heading, and sorting numerically would orphan it
 * from that heading. CLAUDE.md §5's table has the same order and states that
 * the table order is the display order.
 */
export const LINES: readonly AccountLine[] = [
  l("300", 300, "income", "Tuotot ammatista", "Business revenue", null, 25.5),
  l("301", 301, "income", "Muut tuotot", "Other revenue", null, 0),
  l(
    "312",
    312,
    "income",
    "Varausten vähennys",
    "Decrease in provisions",
    GROUP.varVah,
    0
  ),
  l(
    "313",
    313,
    "income",
    "Auton yksityiskäyttö",
    "Private use of car",
    GROUP.yksityis,
    0
  ),
  l(
    "314",
    314,
    "income",
    "Tavaroiden yksityiskäyttö",
    "Private use of goods",
    GROUP.yksityis,
    0
  ),
  l(
    "315",
    315,
    "income",
    "Muu yksityiskäyttö",
    "Other private use",
    GROUP.yksityis,
    0
  ),
  l(
    "317",
    317,
    "income",
    "Tuloslaskelman verovapaat tuotot",
    "Tax-exempt income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "318",
    318,
    "income",
    "Saadut avustukset ja tuet",
    "Grants and subsidies received",
    GROUP.muutTuotot,
    0
  ),
  l(
    "319",
    319,
    "income",
    "Osingot julkisesti noteeratuista yhtiöistä",
    "Dividends from listed companies",
    GROUP.muutTuotot,
    0
  ),
  l(
    "321",
    321,
    "income",
    "Osingot muista kuin julkisesti noteeratuista yhtiöistä",
    "Dividends from non-listed companies",
    GROUP.muutTuotot,
    0
  ),
  l(
    "323",
    323,
    "income",
    "Korkotuotot ja muut rahoitustuotot",
    "Interest and other financial income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "324",
    324,
    "income",
    "Muut veronalaiset tuotot",
    "Other taxable income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "333",
    333,
    "expense",
    "Ostot ja varastojen muutokset",
    "Purchases and change in inventory",
    null,
    25.5,
    "purchases"
  ),
  l(
    "334",
    334,
    "expense",
    "Ulkopuoliset palvelut",
    "External services",
    null,
    25.5,
    "purchases"
  ),
  l(
    "335",
    335,
    "expense",
    "Palkat ja palkkiot",
    "Wages and fees",
    GROUP.henkilosto,
    0,
    "personnel"
  ),
  l(
    "336",
    336,
    "expense",
    "Eläke- ja henkilösivukulut",
    "Pension and other personnel costs",
    GROUP.henkilosto,
    0,
    "personnel"
  ),
  l(
    "337",
    337,
    "expense",
    "Poistot",
    "Depreciation",
    GROUP.poistot,
    0,
    "depreciation"
  ),
  l(
    "341",
    341,
    "expense",
    "Edustuskulut",
    "Entertainment expenses",
    GROUP.poistot,
    0,
    "depreciation"
  ),
  l(
    "343",
    343,
    "expense",
    "Vuokrat",
    "Rent",
    GROUP.poistot,
    25.5,
    "depreciation"
  ),
  l(
    "344-travel",
    344,
    "expense",
    "Matkakulut",
    "Travel expenses",
    GROUP.muutVah,
    25.5,
    "otherDeductible"
  ),
  l(
    "344-vehicle",
    344,
    "expense",
    "Ajoneuvokulut",
    "Vehicle expenses",
    GROUP.muutVah,
    25.5,
    "otherDeductible"
  ),
  l(
    "344-meeting",
    344,
    "expense",
    "Kokous- ja neuvottelukulut",
    "Meeting expenses",
    GROUP.muutVah,
    25.5,
    "otherDeductible"
  ),
  l(
    "344-other",
    344,
    "expense",
    "Muut vähennyskelpoiset kulut",
    "Other deductible expenses",
    GROUP.muutVah,
    25.5,
    "otherDeductible"
  ),
  l(
    "354",
    354,
    "expense",
    "Kirjanpidon ulkopuoliset vähennyskelpoiset kulut",
    "Deductible expenses outside bookkeeping",
    GROUP.muutVah,
    0,
    "otherDeductible"
  ),
  l(
    "346",
    346,
    "expense",
    "Korkokulut",
    "Interest expenses",
    GROUP.rahoitus,
    0,
    "financial"
  ),
  l(
    "349",
    349,
    "expense",
    "Muut rahoituskulut",
    "Other financial expenses",
    GROUP.rahoitus,
    0,
    "financial"
  ),
  l(
    "353",
    353,
    "expense",
    "Varausten lisäykset",
    "Increase in provisions",
    GROUP.varMuutos,
    0,
    "provisions"
  ),
  l(
    "365",
    365,
    "expense",
    "Välittömät verot",
    "Direct taxes",
    GROUP.vahKelvoton,
    0,
    "nondeductible",
    true
  ),
  l(
    "366",
    366,
    "expense",
    "Sakot ja muut rangaistusmaksut",
    "Fines and penalties",
    GROUP.vahKelvoton,
    0,
    "nondeductible",
    true
  ),
  l(
    "367",
    367,
    "expense",
    "Muut vähennyskelvottomat kulut",
    "Other non-deductible expenses",
    GROUP.vahKelvoton,
    0,
    "nondeductible",
    true
  ),
]

function l(
  key: string,
  account: number,
  side: EntryType,
  fi: string,
  en: string,
  group: Readonly<Record<Lang, string>> | null,
  vatRate: number,
  bucket: Bucket | null = null,
  nondeductible = false
): AccountLine {
  return {
    key,
    account,
    side,
    name: { fi, en },
    group,
    vatRate,
    bucket,
    nondeductible,
    taxExempt: key === "317",
    halfDeductible: key === "341",
    taxableShare: TAXABLE_SHARE[key] ?? null,
  }
}

/** Display order of the income statement. */
export const LINE_KEYS: readonly string[] = LINES.map((x) => x.key)

export const LINE_BY_KEY: ReadonlyMap<string, AccountLine> = new Map(
  LINES.map((x) => [x.key, x])
)

/** Expense summary buckets, in Yhteenveto column order. */
export const BUCKETS: readonly Bucket[] = [
  "purchases",
  "personnel",
  "depreciation",
  "otherDeductible",
  "financial",
  "provisions",
  "nondeductible",
]

export interface SalesCategoryDef {
  id: string
  fi: string
  en: string
  vatRate: number
  kind: SalesKind
}

/** The four sales categories on line 300 (§5). */
export const SALES: readonly SalesCategoryDef[] = [
  {
    id: "300-domestic",
    fi: "Myynti – Suomi",
    en: "Sales – Finland",
    vatRate: 25.5,
    kind: "domestic",
  },
  { id: "300-eu", fi: "Myynti – EU", en: "Sales – EU", vatRate: 0, kind: "eu" },
  {
    id: "300-other",
    fi: "Myynti – muut maat",
    en: "Sales – other countries",
    vatRate: 0,
    kind: "nonEu",
  },
  {
    id: "300-reverse",
    fi: "Myynti – käänteinen verotus",
    en: "Sales – reverse charge",
    vatRate: 0,
    kind: "reverse",
  },
]

/**
 * English names of the default categories, keyed by category id. Used on CSV
 * import so a file exported from an English UI still matches (§7.1).
 */
export const DEFAULT_EN_NAMES: Readonly<Record<string, string>> =
  Object.fromEntries([
    ...SALES.map((s) => [s.id, s.en]),
    ...LINES.filter((x) => x.key !== "300").map((x) => [x.key, x.name.en]),
  ])

/**
 * Which category a CSV row with no `luokka` books to, by account number. Only
 * accounts carrying several categories need an entry here; the rest resolve to
 * their single category.
 */
export const DEFAULT_CATEGORY_FOR_ACCOUNT: Readonly<Record<number, string>> = {
  300: "300-domestic",
  344: "344-other",
}

/**
 * Other names a file may give a default category, matched on CSV import like
 * the Finnish and English names (§7.1).
 */
export const FORMER_NAMES: Readonly<Record<string, readonly string[]>> = {
  "319": ["Saadut osingot", "Dividends received"],
}

/** The 33 built-in categories: four sales plus one per remaining line. */
export function defaultCategories(): Category[] {
  const sales: Category[] = SALES.map((s) => ({
    id: s.id,
    line: "300",
    name: s.fi,
    vatRate: s.vatRate,
    kind: s.kind,
    enabled: true,
    custom: false,
  }))
  const rest: Category[] = LINES.filter((x) => x.key !== "300").map((x) => ({
    id: x.key,
    line: x.key,
    name: x.name.fi,
    vatRate: x.vatRate,
    ...(x.side === "income" ? { kind: "domestic" as const } : {}),
    enabled: true,
    custom: false,
  }))
  return [...sales, ...rest]
}

export function lineOf(cat: Category): AccountLine | undefined {
  return LINE_BY_KEY.get(cat.line)
}

export function lineName(line: AccountLine, lang: Lang): string {
  return line.name[lang]
}

export function groupName(line: AccountLine, lang: Lang): string | null {
  return line.group ? line.group[lang] : null
}

/** Default categories are translated; custom ones always use the user's name. */
export function categoryName(cat: Category, lang: Lang): string {
  if (lang === "en" && !cat.custom) {
    const en = DEFAULT_EN_NAMES[cat.id]
    if (en) return en
  }
  return cat.name
}

/** "333 Ostot ja varastojen muutokset". */
export function categoryLabel(cat: Category | undefined, lang: Lang): string {
  if (!cat) return ""
  const line = lineOf(cat)
  return line
    ? `${line.account} ${categoryName(cat, lang)}`
    : categoryName(cat, lang)
}
