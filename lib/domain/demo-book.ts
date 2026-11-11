import { calcEntry } from "@/lib/domain/calc"
import { addDays } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import {
  DEFAULT_INVOICE_SETTINGS,
  type Customer,
  type Invoice,
  type InvoiceRow,
  type InvoiceSettings,
  type Party as InvoiceParty,
  type Quote,
} from "@/lib/domain/invoice"
import { sellerOf } from "@/lib/domain/invoice-calc"
import { finnishReference } from "@/lib/domain/invoice-reference"
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

/*
 * The seller's side of an invoice, so the invoices below print whole and a
 * new one can be issued at once. The IBAN is the example one Finnish banks
 * publish, with valid check digits.
 */
const DEMO_SELLER = {
  street: "Esimerkkikatu 1",
  postcode: "33100",
  city: "Tampere",
  email: "laskutus@esimerkki.example",
  iban: "FI1410093000123458",
} as const

/** A receipt waiting in the inbox (§8.31): its file name and the lines printed on it. */
export interface DemoReceipt {
  name: string
  /** How many days before today it was added. */
  daysAgo: number
  lines: (today: string) => string[]
}

const fiDate = (iso: string) =>
  `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.${iso.slice(0, 4)}`

const RECEIPTS: readonly DemoReceipt[] = [
  {
    name: "kuitti-polttoaine.pdf",
    daysAgo: 2,
    lines: (today) => [
      "Huoltoasema Virta Oy",
      "Y-tunnus 7654321-8",
      "KUITTI",
      `Päivämäärä ${fiDate(addDays(today, -2))}`,
      "Diesel 38,21 l",
      "Veroton 58,64 EUR",
      "ALV 25,5 % 14,95 EUR",
      "Yhteensä 73,59 EUR",
    ],
  },
  {
    name: "lasku-toimistotarvike.pdf",
    daysAgo: 1,
    lines: (today) => [
      "Toimistotarvike Kaari Oy",
      "Y-tunnus 2345678-9",
      "LASKU 20418",
      `Laskun päivämäärä ${fiDate(addDays(today, -1))}`,
      `Eräpäivä ${fiDate(addDays(today, 13))}`,
      "Tulostuspaperi ja kansiot",
      "Veroton 38,41 EUR",
      "ALV 25,5 % 9,79 EUR",
      "Yhteensä 48,20 EUR",
    ],
  },
]

/**
 * A one-page PDF with `lines` as text, written by hand so the demo needs no
 * PDF library: a catalog, a page, the Helvetica standard font and one content
 * stream. The text layer is real, so the inbox reads the receipt as it reads
 * any PDF.
 */
export function receiptPdf(lines: readonly string[]): Uint8Array {
  /* WinAnsi is Latin-1 for these letters, with the euro sign at 0x80. */
  const bytesOf = (text: string) =>
    Array.from(text, (ch) => {
      const code = ch.charCodeAt(0)
      return ch === "€" ? 0x80 : code < 256 ? code : 0x3f
    })
  const escaped = (line: string) => line.replace(/[\\()]/g, (c) => `\\${c}`)
  const content = bytesOf(
    [
      "BT",
      "/F1 11 Tf",
      "15 TL",
      "1 0 0 1 28 380 Tm",
      ...lines.map((line) => `(${escaped(line)}) Tj T*`),
      "ET",
    ].join("\n")
  )
  const objects: number[][] = [
    bytesOf("<< /Type /Catalog /Pages 2 0 R >>"),
    bytesOf("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    bytesOf(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 298 420] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>"
    ),
    bytesOf(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    ),
    [
      ...bytesOf(`<< /Length ${content.length} >>\nstream\n`),
      ...content,
      ...bytesOf("\nendstream"),
    ],
  ]
  const out: number[] = bytesOf("%PDF-1.4\n")
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out.push(...bytesOf(`${i + 1} 0 obj\n`), ...body, ...bytesOf("\nendobj\n"))
  })
  const xref = out.length
  out.push(
    ...bytesOf(
      [
        "xref",
        `0 ${objects.length + 1}`,
        "0000000000 65535 f ",
        ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `),
        "trailer",
        `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
        "startxref",
        String(xref),
        "%%EOF",
        "",
      ].join("\n")
    )
  )
  return Uint8Array.from(out)
}

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
 *
 * Every sale has the invoice it was booked from, built from the entry's own
 * figures, so the invoice list, the receivables and the quotes have something
 * to show and no total moves. Two quotes go with them, one accepted and
 * invoiced and one still open, and two receipts wait in the inbox.
 */
export function demoBook(today: string): {
  year: number
  entries: Entry[]
  customers: Customer[]
  invoices: Invoice[]
  invoiceSettings: InvoiceSettings
  receipts: readonly DemoReceipt[]
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

  const settings = { ...DEFAULT_INVOICE_SETTINGS, ...DEMO_SELLER }
  const seller = sellerOf(settings, {
    name: DEMO_BUSINESS.name,
    businessId: DEMO_BUSINESS.id,
    phone: null,
  })
  const partyOf = (id: string | undefined): InvoiceParty => {
    const c = customers.find((x) => x.id === id)
    return {
      name: c?.name ?? "",
      street: c?.street ?? "",
      postcode: c?.postcode ?? "",
      city: c?.city ?? "",
      country: "FI",
      vatId: "",
      email: "",
    }
  }
  const row = (description: string, unitCents: Cents): InvoiceRow => ({
    description,
    quantityMilli: 1000,
    unit: "kpl",
    unitCents,
    vatRate: 25.5,
    catId: "300-domestic",
  })

  const invoices = entries.flatMap((e): Invoice[] => {
    const number = Number(/^Lasku (\d+)/.exec(e.description)?.[1])
    const reference = number ? finnishReference(number) : null
    if (!reference) return []
    return [
      {
        id: `i-${uid()}`,
        number,
        date: e.date,
        dueDate: addDays(e.date, settings.termDays),
        supplyFrom: null,
        supplyTo: null,
        customerId: e.party ?? null,
        customer: partyOf(e.party),
        language: "fi",
        rows: [row("Työ sopimuksen mukaan", calcEntry(e).net)],
        note: "",
        terms: "",
        reference,
        seller,
        issuedAt: `${e.date}T09:00:00.000Z`,
        entryIds: [e.id],
        credits: null,
      },
    ]
  })

  /* The quote the latest invoice came from, and one the customer has not answered. */
  const quotes: Quote[] = []
  const invoiced = invoices.at(-1)
  if (invoiced) {
    quotes.push({
      id: `q-${uid()}`,
      number: 1,
      date: addDays(invoiced.date, -21),
      validUntil: addDays(invoiced.date, 9),
      customerId: invoiced.customerId,
      customer: { ...invoiced.customer },
      language: "fi",
      rows: invoiced.rows.map((r) => ({ ...r })),
      note: "",
      outcome: "accepted",
      invoiceId: invoiced.id,
    })
  }
  quotes.push({
    id: `q-${uid()}`,
    number: quotes.length + 1,
    date: addDays(today, -3),
    validUntil: addDays(today, 27),
    customerId: ids.laaksonen,
    customer: partyOf(ids.laaksonen),
    language: "fi",
    rows: [
      {
        ...row("Suunnittelutyö", 8500),
        quantityMilli: 12000,
        unit: "h",
      },
      row("Tarvikkeet", 32000),
    ],
    note: "",
    outcome: null,
    invoiceId: null,
  })

  return {
    year,
    entries,
    customers,
    invoices,
    invoiceSettings: { ...settings, quotes },
    receipts: RECEIPTS,
  }
}
