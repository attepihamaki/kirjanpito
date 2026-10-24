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
  tili: number
  side: EntryType
  name: Readonly<Record<Lang, string>>
  /** Group heading this line sits under, if any. */
  group: Readonly<Record<Lang, string>> | null
  /** Default VAT % for categories on this line. */
  alv: number
  /** Expense summary bucket. Null on income lines. */
  bucket: Bucket | null
  /** Lines 365–367: listed on the statement but not deducted (§6.3). */
  nondeductible: boolean
}

/**
 * VAT rates offered in the entry dialog.
 *
 * The general rate rose to 25,5 % on 1 September 2024 and the 14 % rate was
 * lowered to 13,5 % at the start of 2026. Older rates are kept so older
 * entries and corrections still work.
 */
export const RATES: readonly number[] = [25.5, 24, 14, 13.5, 10, 0]

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
  l("300", 300, "tulo", "Tuotot ammatista", "Business revenue", null, 25.5),
  l("301", 301, "tulo", "Muut tuotot", "Other revenue", null, 0),
  l(
    "312",
    312,
    "tulo",
    "Varausten vähennys",
    "Decrease in provisions",
    GROUP.varVah,
    0
  ),
  l(
    "313",
    313,
    "tulo",
    "Auton yksityiskäyttö",
    "Private use of car",
    GROUP.yksityis,
    0
  ),
  l(
    "314",
    314,
    "tulo",
    "Tavaroiden yksityiskäyttö",
    "Private use of goods",
    GROUP.yksityis,
    0
  ),
  l(
    "315",
    315,
    "tulo",
    "Muu yksityiskäyttö",
    "Other private use",
    GROUP.yksityis,
    0
  ),
  l(
    "317",
    317,
    "tulo",
    "Tuloslaskelman verovapaat tuotot",
    "Tax-exempt income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "318",
    318,
    "tulo",
    "Saadut avustukset ja tuet",
    "Grants and subsidies received",
    GROUP.muutTuotot,
    0
  ),
  l(
    "319",
    319,
    "tulo",
    "Saadut osingot",
    "Dividends received",
    GROUP.muutTuotot,
    0
  ),
  l(
    "323",
    323,
    "tulo",
    "Korkotuotot ja muut rahoitustuotot",
    "Interest and other financial income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "324",
    324,
    "tulo",
    "Muut veronalaiset tuotot",
    "Other taxable income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "333",
    333,
    "kulu",
    "Ostot ja varastojen muutokset",
    "Purchases and change in inventory",
    null,
    25.5,
    "ostot"
  ),
  l(
    "334",
    334,
    "kulu",
    "Ulkopuoliset palvelut",
    "External services",
    null,
    25.5,
    "ostot"
  ),
  l(
    "335",
    335,
    "kulu",
    "Palkat ja palkkiot",
    "Wages and fees",
    GROUP.henkilosto,
    0,
    "henk"
  ),
  l(
    "336",
    336,
    "kulu",
    "Eläke- ja henkilösivukulut",
    "Pension and other personnel costs",
    GROUP.henkilosto,
    0,
    "henk"
  ),
  l("337", 337, "kulu", "Poistot", "Depreciation", GROUP.poistot, 0, "poist"),
  l(
    "341",
    341,
    "kulu",
    "Edustuskulut",
    "Entertainment expenses",
    GROUP.poistot,
    0,
    "poist"
  ),
  l("343", 343, "kulu", "Vuokrat", "Rent", GROUP.poistot, 25.5, "poist"),
  l(
    "344-matka",
    344,
    "kulu",
    "Matkakulut",
    "Travel expenses",
    GROUP.muutVah,
    25.5,
    "muut"
  ),
  l(
    "344-ajo",
    344,
    "kulu",
    "Ajoneuvokulut",
    "Vehicle expenses",
    GROUP.muutVah,
    25.5,
    "muut"
  ),
  l(
    "344-kokous",
    344,
    "kulu",
    "Kokous- ja neuvottelukulut",
    "Meeting expenses",
    GROUP.muutVah,
    25.5,
    "muut"
  ),
  l(
    "344-muut",
    344,
    "kulu",
    "Muut vähennyskelpoiset kulut",
    "Other deductible expenses",
    GROUP.muutVah,
    25.5,
    "muut"
  ),
  l(
    "354",
    354,
    "kulu",
    "Kirjanpidon ulkopuoliset vähennyskelpoiset kulut",
    "Deductible expenses outside bookkeeping",
    GROUP.muutVah,
    0,
    "muut"
  ),
  l(
    "346",
    346,
    "kulu",
    "Korkokulut",
    "Interest expenses",
    GROUP.rahoitus,
    0,
    "rah"
  ),
  l(
    "349",
    349,
    "kulu",
    "Muut rahoituskulut",
    "Other financial expenses",
    GROUP.rahoitus,
    0,
    "rah"
  ),
  l(
    "353",
    353,
    "kulu",
    "Varausten lisäykset",
    "Increase in provisions",
    GROUP.varMuutos,
    0,
    "var"
  ),
  l(
    "365",
    365,
    "kulu",
    "Välittömät verot",
    "Direct taxes",
    GROUP.vahKelvoton,
    0,
    "vk",
    true
  ),
  l(
    "366",
    366,
    "kulu",
    "Sakot ja muut rangaistusmaksut",
    "Fines and penalties",
    GROUP.vahKelvoton,
    0,
    "vk",
    true
  ),
  l(
    "367",
    367,
    "kulu",
    "Muut vähennyskelvottomat kulut",
    "Other non-deductible expenses",
    GROUP.vahKelvoton,
    0,
    "vk",
    true
  ),
]

function l(
  key: string,
  tili: number,
  side: EntryType,
  fi: string,
  en: string,
  group: Readonly<Record<Lang, string>> | null,
  alv: number,
  bucket: Bucket | null = null,
  nondeductible = false
): AccountLine {
  return {
    key,
    tili,
    side,
    name: { fi, en },
    group,
    alv,
    bucket,
    nondeductible,
  }
}

/** Display order of the income statement. */
export const LINE_KEYS: readonly string[] = LINES.map((x) => x.key)

export const LINE_BY_KEY: ReadonlyMap<string, AccountLine> = new Map(
  LINES.map((x) => [x.key, x])
)

/** Expense summary buckets, in Yhteenveto column order. */
export const BUCKETS: readonly Bucket[] = [
  "ostot",
  "henk",
  "poist",
  "muut",
  "rah",
  "var",
  "vk",
]

export interface SalesCategoryDef {
  id: string
  nimi: string
  en: string
  alv: number
  kind: SalesKind
}

/** The four sales categories on line 300 (§5). */
export const SALES: readonly SalesCategoryDef[] = [
  {
    id: "300-suomi",
    nimi: "Myynti – Suomi",
    en: "Sales – Finland",
    alv: 25.5,
    kind: "kotimaa",
  },
  { id: "300-eu", nimi: "Myynti – EU", en: "Sales – EU", alv: 0, kind: "eu" },
  {
    id: "300-muut",
    nimi: "Myynti – muut maat",
    en: "Sales – other countries",
    alv: 0,
    kind: "muutmaat",
  },
  {
    id: "300-kaant",
    nimi: "Myynti – käänteinen verotus",
    en: "Sales – reverse charge",
    alv: 0,
    kind: "kaanteinen",
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
 * Which category a CSV row with no `luokka` books to, by account number.
 *
 * The prototype took the first category matching the account, which on 344
 * meant "Matkakulut" rather than "Muut vähennyskelpoiset kulut" — a silent and
 * surprising choice. Only accounts with several categories need an entry here.
 */
export const DEFAULT_CATEGORY_FOR_ACCOUNT: Readonly<Record<number, string>> = {
  300: "300-suomi",
  344: "344-muut",
}

/** The 32 built-in categories: four sales plus one per remaining line. */
export function defaultCategories(): Category[] {
  const sales: Category[] = SALES.map((s) => ({
    id: s.id,
    line: "300",
    nimi: s.nimi,
    alv: s.alv,
    kind: s.kind,
    on: true,
    custom: false,
  }))
  const rest: Category[] = LINES.filter((x) => x.key !== "300").map((x) => ({
    id: x.key,
    line: x.key,
    nimi: x.name.fi,
    alv: x.alv,
    ...(x.side === "tulo" ? { kind: "kotimaa" as const } : {}),
    on: true,
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
  return cat.nimi
}

/** "333 Ostot ja varastojen muutokset". */
export function categoryLabel(cat: Category | undefined, lang: Lang): string {
  if (!cat) return ""
  const line = lineOf(cat)
  return line
    ? `${line.tili} ${categoryName(cat, lang)}`
    : categoryName(cat, lang)
}
