import type {
  Bucket,
  Category,
  EntryType,
  EuPurchase,
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
   * Lines whose VAT the buyer cannot deduct: entertainment (AVL 114 § 1 mom.
   * 3 kohta) and the non-deductible expenses 365–367. Such a cost is booked
   * at its gross amount with 0 % VAT, so the tax stays part of the cost.
   */
  noVatDeduction: boolean
  /**
   * Dividends: the percentage that is taxable business income, which Form 5
   * asks for as 320 (of 319) and 322 (of 321). Null on every other line (§6.3).
   */
  taxableShare: number | null
  /**
   * Line 327, surplus from non-listed co-operatives: Form 5's 327, with the
   * taxable part as 328. The share is tiered, so it is not `taxableShare`.
   */
  surplus: boolean
  /**
   * Fixed asset purchases and sales (§5): not on the income statement or Form
   * 5, since the cost is deducted as depreciation, but on the VAT return.
   */
  capital: boolean
  /**
   * VAT paid to Verohallinto or refunded by it (§6.6): a debt to the state
   * being settled, so neither income nor an expense, and not on the VAT return.
   */
  settlement: boolean
  /**
   * Money moving between the owner and the business (§6.7): a movement in
   * equity, so neither income nor an expense, and not on the VAT return.
   */
  owner: boolean
  /**
   * A loan drawn or repaid (§6.8): a financing transaction, so neither income
   * nor an expense, and not on the VAT return. Interest stays on 346.
   */
  loan: boolean
}

/** Lines off the income statement: fixed assets, VAT settlements, the owner's transfers and loans (§5). */
export function offStatement(line: AccountLine | undefined): boolean {
  return !!line && (line.capital || line.settlement || line.owner || line.loan)
}

/** Lines an EU purchase can sit on: costs and fixed assets, not money only moving (§6.9). */
export function canBeEuPurchase(line: AccountLine | undefined): boolean {
  return (
    line?.side === "expense" && !line.settlement && !line.owner && !line.loan
  )
}

/**
 * Whether a cost on this line can be used partly privately (§6.12): any cost
 * that is not money only moving, and not an EU purchase, whose amount carries
 * no tax of the seller's.
 */
export function canHaveShare(
  line: AccountLine | undefined,
  euPurchase: unknown
): boolean {
  return canBeEuPurchase(line) && !euPurchase
}

/** The rate an EU category starts from: what a Finnish buyer usually reports (§6.9). */
export const GENERAL_RATE = 25.5

/** Sales the EC Sales List covers, the retired category included (§5, §8.7). */
export function isEuSaleKind(kind: SalesKind | undefined): boolean {
  return kind === "euGoods" || kind === "euServices" || kind === "eu"
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
  yksityis: { fi: "Yksityiskäyttö", en: "Private use" },
  muutTuotot: { fi: "Muut tuotot", en: "Other income" },
  henkilosto: { fi: "Henkilöstökulut", en: "Staff expenses" },
  muutVah: {
    fi: "Muut vähennyskelpoiset kulut",
    en: "Other deductible expenses",
  },
  rahoitus: { fi: "Rahoituskulut", en: "Financial expenses" },
  varMuutos: { fi: "Varausten muutokset", en: "Changes in reserves" },
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
  l("300", 300, "income", "Liikevaihto", "Net sales", null, 25.5),
  l(
    "301",
    301,
    "income",
    "Liiketoiminnan muut tuotot",
    "Other operating income",
    null,
    0
  ),
  l(
    "312",
    312,
    "income",
    "Varausten vähennys",
    "Relieved write-offs and reserves",
    null,
    0
  ),
  l(
    "313",
    313,
    "income",
    "Auton yksityiskäyttö",
    "Private use of a car",
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
    "Tax-exempt income in the profit and loss account",
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
    "327",
    327,
    "income",
    "Ylijäämät muista kuin julkisesti noteeratuista osuuskunnista",
    "Surplus from non-listed co-operatives",
    GROUP.muutTuotot,
    0
  ),
  l(
    "323",
    323,
    "income",
    "Korkotuotot ja muut rahoitustuotot",
    "Interest income and other financial income",
    GROUP.muutTuotot,
    0
  ),
  l(
    "324",
    324,
    "income",
    "Muut veronalaiset tuotot (ei tilikauden tuloslaskelmassa)",
    "Other taxable income (off-income-statement)",
    GROUP.muutTuotot,
    0
  ),
  l(
    "333",
    333,
    "expense",
    "Ostot ja varastojen muutokset",
    "Purchases and changes in inventory",
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
    "Wages, salaries and fringe benefits",
    GROUP.henkilosto,
    0,
    "personnel"
  ),
  l(
    "336",
    336,
    "expense",
    "Eläke- ja henkilösivukulut",
    "Pension and other staff expenses",
    GROUP.henkilosto,
    0,
    "personnel"
  ),
  l("337", 337, "expense", "Poistot", "Depreciation", null, 0, "depreciation"),
  l(
    "341",
    341,
    "expense",
    "Edustuskulut",
    "Entertainment expenses",
    null,
    0,
    "depreciation"
  ),
  l(
    "343",
    343,
    "expense",
    "Vuokrat",
    "Rental expenses",
    null,
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
    13.5,
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
    "Deductible expenses not entered in accounting",
    GROUP.muutVah,
    0,
    "otherDeductible"
  ),
  l(
    "364-travel",
    364,
    "expense",
    "Lisävähennys tilapäisistä työmatkoista",
    "Additional deduction for temporary business trips",
    GROUP.muutVah,
    0,
    "otherDeductible"
  ),
  l(
    "364-car",
    364,
    "expense",
    "Lisävähennys yksityisauton käytöstä",
    "Additional deduction for use of a private car",
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
    "Other financial costs",
    GROUP.rahoitus,
    0,
    "financial"
  ),
  l(
    "353",
    353,
    "expense",
    "Varausten lisäykset",
    "Increases to reserves",
    GROUP.varMuutos,
    0,
    "provisions"
  ),
  l(
    "365",
    365,
    "expense",
    "Ennakkoverot ja muut välittömät verot",
    "Advance tax and other direct taxes",
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
    "Fines and other penalty fees",
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

/**
 * Machinery and equipment, in and out (§8.8). Kept out of `LINES`, which is
 * the income statement. The account is the usual balance sheet one, because
 * the CSV needs a number and Form 5 has none for these.
 */
export const CAPITAL_LINES: readonly AccountLine[] = [
  {
    ...l(
      "asset-purchase",
      1100,
      "expense",
      "Koneiden ja kaluston hankinta",
      "Purchase of machinery and equipment",
      null,
      25.5
    ),
    capital: true,
  },
  {
    ...l(
      "asset-sale",
      1100,
      "income",
      "Koneiden ja kaluston myynti",
      "Sale of machinery and equipment",
      null,
      25.5
    ),
    capital: true,
  },
]

/**
 * The VAT a return leaves to pay or to receive (§6.6), each payment or refund
 * an entry with its own voucher number. Single-entry books have no balance
 * sheet, so 2939 is the app's own account for the CSV's `tili` column, not one
 * Form 5 asks for.
 */
export const SETTLEMENT_LINES: readonly AccountLine[] = [
  {
    ...l(
      "vat-payment",
      2939,
      "expense",
      "Arvonlisäveron maksu",
      "VAT payment",
      null,
      0
    ),
    settlement: true,
  },
  {
    ...l(
      "vat-refund",
      2939,
      "income",
      "Arvonlisäveron palautus",
      "VAT refund",
      null,
      0
    ),
    settlement: true,
  },
]

/**
 * The owner's own money going into the business and out of it (§6.7). Vero
 * places these on the private account (yksityistili), part of equity. Single-
 * entry books have no balance sheet, so 2000 is the app's own account for the
 * CSV's `tili` column, not one Form 5 asks for.
 */
export const OWNER_LINES: readonly AccountLine[] = [
  {
    ...l(
      "owner-withdrawal",
      2000,
      "expense",
      "Yksityisotto",
      "Owner’s withdrawal",
      null,
      0
    ),
    owner: true,
  },
  {
    ...l(
      "owner-investment",
      2000,
      "income",
      "Yksityissijoitus",
      "Owner’s investment",
      null,
      0
    ),
    owner: true,
  },
]

/**
 * Loans drawn and repaid (§6.8). KPL 2:1 has the books record financing
 * transactions. Single-entry books have no balance sheet, so 2600 is the app's
 * own account for the CSV's `account` column, not one Form 5 asks for.
 */
export const LOAN_LINES: readonly AccountLine[] = [
  {
    ...l(
      "loan-drawdown",
      2600,
      "income",
      "Lainan nosto",
      "Loan drawdown",
      null,
      0
    ),
    loan: true,
  },
  {
    ...l(
      "loan-repayment",
      2600,
      "expense",
      "Lainan lyhennys",
      "Loan repayment",
      null,
      0
    ),
    loan: true,
  },
]

/** Every line a category can sit on: the statement's, then the off-statement ones above. */
export const ALL_LINES: readonly AccountLine[] = [
  ...LINES,
  ...CAPITAL_LINES,
  ...SETTLEMENT_LINES,
  ...OWNER_LINES,
  ...LOAN_LINES,
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
    noVatDeduction: key === "341" || nondeductible,
    taxableShare: TAXABLE_SHARE[key] ?? null,
    surplus: key === "327",
    capital: false,
    settlement: false,
    owner: false,
    loan: false,
  }
}

/** Display order of the income statement. */
export const LINE_KEYS: readonly string[] = LINES.map((x) => x.key)

export const LINE_BY_KEY: ReadonlyMap<string, AccountLine> = new Map(
  ALL_LINES.map((x) => [x.key, x])
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

/** The sales categories on line 300 (§5). */
export const SALES: readonly SalesCategoryDef[] = [
  {
    id: "300-domestic",
    fi: "Myynti – Suomi",
    en: "Sales – Finland",
    vatRate: 25.5,
    kind: "domestic",
  },
  {
    id: "300-eu-goods",
    fi: "Myynti – EU, tavarat",
    en: "Sales – EU, goods",
    vatRate: 0,
    kind: "euGoods",
  },
  {
    id: "300-eu-services",
    fi: "Myynti – EU, palvelut",
    en: "Sales – EU, services",
    vatRate: 0,
    kind: "euServices",
  },
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
  { id: "300-eu", fi: "Myynti – EU", en: "Sales – EU", vatRate: 0, kind: "eu" },
]

export interface EuPurchaseCategoryDef {
  id: string
  line: string
  fi: string
  en: string
  euPurchase: EuPurchase
}

/**
 * Purchases whose tax the buyer reports (§6.9): from other EU countries, the
 * counterpart of the EU sales, then imports from outside the EU and the
 * domestic reverse-charge purchases of scrap metal and construction services.
 * Each sits on a line of its own rather than on one shared line like the sales,
 * because Form 5 has no single line for purchases. A custom category covers any
 * other line (§8.10). They come after the other categories, so a CSV row with
 * no category name still finds its line's own category.
 */
export const EU_PURCHASES: readonly EuPurchaseCategoryDef[] = [
  {
    id: "333-eu-goods",
    line: "333",
    fi: "Ostot ja varastojen muutokset – EU",
    en: "Purchases and changes in inventory – EU",
    euPurchase: "goods",
  },
  {
    id: "334-eu-services",
    line: "334",
    fi: "Ulkopuoliset palvelut – EU",
    en: "External services – EU",
    euPurchase: "services",
  },
  {
    id: "344-eu-services",
    line: "344-other",
    fi: "Muut vähennyskelpoiset kulut – EU, palvelut",
    en: "Other deductible expenses – EU, services",
    euPurchase: "services",
  },
  {
    id: "asset-purchase-eu",
    line: "asset-purchase",
    fi: "Koneiden ja kaluston hankinta – EU",
    en: "Purchase of machinery and equipment – EU",
    euPurchase: "goods",
  },
  {
    id: "333-import",
    line: "333",
    fi: "Ostot ja varastojen muutokset – maahantuonti",
    en: "Purchases and changes in inventory – import",
    euPurchase: "import",
  },
  {
    id: "333-reverse",
    line: "333",
    fi: "Ostot ja varastojen muutokset – metalliromu",
    en: "Purchases and changes in inventory – scrap metal",
    euPurchase: "reverse",
  },
  {
    id: "334-reverse",
    line: "334",
    fi: "Ulkopuoliset palvelut – rakentaminen",
    en: "External services – construction",
    euPurchase: "reverse",
  },
]

/**
 * A category that no new entry should use. It stays in the list so that older
 * entries and files keep their category, and the VAT return asks the user to
 * sort those entries, because nothing in them says goods or services.
 */
export const RETIRED_CATEGORY_ID = "300-eu"

/**
 * English names of the default categories, keyed by category id. Used on CSV
 * import so a file exported from an English UI still matches (§7.1).
 */
export const DEFAULT_EN_NAMES: Readonly<Record<string, string>> =
  Object.fromEntries([
    ...SALES.map((s) => [s.id, s.en]),
    ...EU_PURCHASES.map((p) => [p.id, p.en]),
    ...ALL_LINES.filter((x) => x.key !== "300").map((x) => [x.key, x.name.en]),
  ])

/**
 * Which category a CSV row with no `category` books to, by account number. Only
 * accounts carrying several categories need an entry here; the rest resolve to
 * their single category.
 */
export const DEFAULT_CATEGORY_FOR_ACCOUNT: Readonly<Record<number, string>> = {
  300: "300-domestic",
  344: "344-other",
  364: "364-travel",
}

/**
 * Other names a file may give a default category, matched on CSV import like
 * the Finnish and English names (§7.1).
 */
export const FORMER_NAMES: Readonly<Record<string, readonly string[]>> = {
  "301": ["Muut tuotot", "Other revenue"],
  "312": ["Decrease in provisions"],
  "313": ["Private use of car"],
  "317": ["Tax-exempt income"],
  "319": ["Saadut osingot", "Dividends received"],
  "323": ["Interest and other financial income"],
  "324": ["Muut veronalaiset tuotot", "Other taxable income"],
  "333": ["Purchases and change in inventory"],
  "333-eu-goods": ["Ostot – EU, tavarat", "Purchases – EU, goods"],
  "335": ["Wages and fees"],
  "336": ["Pension and other personnel costs"],
  "343": ["Rent"],
  "349": ["Other financial expenses"],
  "353": ["Increase in provisions"],
  "354": ["Deductible expenses outside bookkeeping"],
  "365": ["Välittömät verot", "Direct taxes"],
  "366": ["Fines and penalties"],
  "asset-purchase": ["Käyttöomaisuuden hankinta", "Purchase of fixed assets"],
  "asset-sale": ["Käyttöomaisuuden myynti", "Sale of fixed assets"],
}

/** The built-in categories: six sales, one per remaining line and seven purchases whose tax the buyer reports. */
export function defaultCategories(): Category[] {
  const sales: Category[] = SALES.map((s) => ({
    id: s.id,
    line: "300",
    name: s.fi,
    vatRate: s.vatRate,
    kind: s.kind,
    enabled: s.id !== RETIRED_CATEGORY_ID,
    custom: false,
  }))
  const rest: Category[] = ALL_LINES.filter((x) => x.key !== "300").map(
    (x) => ({
      id: x.key,
      line: x.key,
      name: x.name.fi,
      vatRate: x.vatRate,
      ...(x.side === "income" ? { kind: "domestic" as const } : {}),
      enabled: true,
      custom: false,
    })
  )
  const euPurchases: Category[] = EU_PURCHASES.map((p) => ({
    id: p.id,
    line: p.line,
    name: p.fi,
    vatRate: GENERAL_RATE,
    euPurchase: p.euPurchase,
    enabled: true,
    custom: false,
  }))
  return [...sales, ...rest, ...euPurchases]
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
