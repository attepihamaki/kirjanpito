import { addDays } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import type { Customer } from "@/lib/domain/invoice"
import type { Cents, Entry, EntryType } from "@/lib/domain/types"

/**
 * The demo book (§8.32): a made-up sole trader's year, for trying the app
 * without typing anything in. Every name in it is invented. It is not the §10
 * fixture, which the tests own and the app never loads.
 */

export const DEMO_BUSINESS = {
  name: "Esimerkki Tmi",
  /* A made-up y-tunnus with a valid check digit. */
  id: "1234567-1",
} as const

type Party = "makinen" | "virtanen" | "laaksonen" | "rauta" | "tila"

type Row = readonly [
  month: number,
  day: number,
  description: string,
  type: EntryType,
  catId: string,
  amount: Cents,
  vatRate: number,
  party?: Party,
]

/** One year of entries; a month's rent, phone, YEL and bank fees repeat. */
const ROWS: readonly Row[] = [
  [
    1,
    8,
    "Lasku 1001 – Mäkinen Rakennus Oy",
    "income",
    "300-domestic",
    251000,
    25.5,
    "makinen",
  ],
  [
    1,
    15,
    "Tarvikkeet – Rautakauppa Nurmi",
    "expense",
    "333",
    18640,
    25.5,
    "rauta",
  ],
  [
    2,
    12,
    "Lasku 1002 – Virtanen Design",
    "income",
    "300-domestic",
    125500,
    25.5,
    "virtanen",
  ],
  [
    3,
    9,
    "Lasku 1003 – Laaksonen Oy",
    "income",
    "300-domestic",
    188250,
    25.5,
    "laaksonen",
  ],
  [3, 18, "Polttoaine", "expense", "344-vehicle", 9235, 25.5],
  [
    4,
    9,
    "Lounaspalaveri asiakkaan kanssa",
    "expense",
    "344-meeting",
    4860,
    13.5,
  ],
  [
    4,
    22,
    "Lasku 1004 – Mäkinen Rakennus Oy",
    "income",
    "300-domestic",
    313750,
    25.5,
    "makinen",
  ],
  [
    5,
    14,
    "Lasku 1005 – Virtanen Design",
    "income",
    "300-domestic",
    94125,
    25.5,
    "virtanen",
  ],
  [
    6,
    3,
    "Tarvikkeet – Rautakauppa Nurmi",
    "expense",
    "333",
    24310,
    25.5,
    "rauta",
  ],
  [
    6,
    19,
    "Lasku 1006 – Laaksonen Oy",
    "income",
    "300-domestic",
    220000,
    25.5,
    "laaksonen",
  ],
  [
    8,
    20,
    "Lasku 1007 – Mäkinen Rakennus Oy",
    "income",
    "300-domestic",
    276100,
    25.5,
    "makinen",
  ],
  [
    9,
    16,
    "Lasku 1008 – Mäkinen Rakennus Oy",
    "income",
    "300-domestic",
    150600,
    25.5,
    "makinen",
  ],
  [
    9,
    22,
    "Kirjanpito-ohjelma, vuosimaksu",
    "expense",
    "344-other",
    11900,
    25.5,
  ],
  [
    10,
    10,
    "Tarvikkeet – Rautakauppa Nurmi",
    "expense",
    "333",
    10000,
    25.5,
    "rauta",
  ],
  [
    10,
    28,
    "Lasku 1009 – Virtanen Design",
    "income",
    "300-domestic",
    188250,
    25.5,
    "virtanen",
  ],
  [
    11,
    14,
    "Lasku 1010 – Laaksonen Oy",
    "income",
    "300-domestic",
    156875,
    25.5,
    "laaksonen",
  ],
  [12, 5, "Polttoaine", "expense", "344-vehicle", 8710, 25.5],
]

type MonthlyRow = readonly [
  day: number,
  description: string,
  type: EntryType,
  catId: string,
  amount: Cents,
  vatRate: number,
  party?: Party,
]

const MONTHLY: readonly MonthlyRow[] = [
  [20, "Työtilan vuokra", "expense", "343", 45000, 25.5, "tila"],
  [28, "Puhelinliittymä", "expense", "344-other", 2990, 25.5],
  [20, "YEL-maksu", "expense", "336", 31000, 0],
  [30, "Pankin palvelumaksut", "expense", "349", 850, 0],
]

const PARTIES: Readonly<
  Record<
    Party,
    Pick<Customer, "name" | "city" | "role" | "incomeCat" | "expenseCat">
  >
> = {
  makinen: {
    name: "Mäkinen Rakennus Oy",
    city: "Tampere",
    role: "customer",
    incomeCat: "300-domestic",
    expenseCat: null,
  },
  virtanen: {
    name: "Virtanen Design",
    city: "Helsinki",
    role: "customer",
    incomeCat: "300-domestic",
    expenseCat: null,
  },
  laaksonen: {
    name: "Laaksonen Oy",
    city: "Turku",
    role: "customer",
    incomeCat: "300-domestic",
    expenseCat: null,
  },
  rauta: {
    name: "Rautakauppa Nurmi",
    city: "Tampere",
    role: "supplier",
    incomeCat: null,
    expenseCat: "333",
  },
  tila: {
    name: "Toimitilat Koivu",
    city: "Tampere",
    role: "supplier",
    incomeCat: null,
    expenseCat: "343",
  },
}

/*
 * The latest rent and phone bill are left to pay (§8.30), with made-up
 * accounts and references whose check digits are right, so Maksettavat has
 * bills to show and a payment file can be made of them.
 */
const BILLS: readonly {
  description: RegExp
  iban: string
  reference: string
  dueDays: number
}[] = [
  {
    description: /^Työtilan vuokra/,
    iban: "FI3550000120253504",
    reference: "44105",
    dueDays: 10,
  },
  {
    description: /^Puhelinliittymä/,
    iban: "FI2112345600000785",
    reference: "20261007",
    dueDays: 14,
  },
]

const pad = (n: number) => String(n).padStart(2, "0")

/** The last day of `month` in `year`, so day 30 or 31 stays inside February. */
function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())
}

/**
 * The year the demo shows: this one once a quarter of it has gone, so the
 * views have something to show, and last year before that.
 */
export function demoYear(today: string): number {
  const year = Number(today.slice(0, 4))
  return Number(today.slice(5, 7)) >= 4 ? year : year - 1
}

/**
 * The demo book as of `today`: the year's entries up to today, and the
 * counterparties they name. The latest sale is left unpaid, so the open
 * items and the receivables have one to show, and so are the latest rent and
 * phone bill.
 */
export function demoBook(today: string): {
  year: number
  entries: Entry[]
  customers: Customer[]
} {
  const year = demoYear(today)
  const ids = Object.fromEntries(
    (Object.keys(PARTIES) as Party[]).map((p) => [p, `c-${uid()}`])
  ) as Record<Party, string>

  const rows: Row[] = [
    ...ROWS,
    ...Array.from({ length: 12 }, (_, i) =>
      MONTHLY.map((r): Row => [i + 1, ...r])
    ).flat(),
  ]
  const entries = rows
    .map(
      ([
        month,
        day,
        description,
        type,
        catId,
        amount,
        vatRate,
        party,
      ]): Entry => {
        const date = `${year}-${pad(month)}-${pad(clampDay(year, month, day))}`
        return {
          id: uid(),
          date,
          description:
            /^(Työtilan vuokra|Puhelinliittymä|YEL-maksu|Pankin)/.test(
              description
            )
              ? `${description}, ${pad(month)}/${year}`
              : description,
          type,
          catId,
          amount,
          vatRate,
          amountMode: "gross" as const,
          ...(party ? { party: ids[party] } : {}),
        }
      }
    )
    .filter((e) => e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  const lastSale = entries.findLast((e) => e.type === "income")
  if (lastSale) lastSale.paidOn = null
  for (const bill of BILLS) {
    const last = entries.findLast((e) => bill.description.test(e.description))
    if (!last) continue
    last.paidOn = null
    last.due = addDays(last.date, bill.dueDays)
    last.iban = bill.iban
    last.reference = bill.reference
  }

  const customers: Customer[] = (Object.keys(PARTIES) as Party[]).map((p) => ({
    id: ids[p],
    ...PARTIES[p],
    street: "",
    postcode: "",
    country: "FI",
    vatId: "",
    email: "",
    language: "fi",
    termDays: null,
    vatRate: null,
  }))

  return { year, entries, customers }
}
