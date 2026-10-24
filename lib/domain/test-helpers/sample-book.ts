import { uid } from "@/lib/domain/id"
import type { Entry, EntryType } from "@/lib/domain/types"

/**
 * The §10 reference bookkeeping, all of it in 2026. It is a test fixture and
 * nothing else: the app has no sample ledger and no code outside `*.test.ts`
 * may import this file. The §10 figures are what the calculations are verified
 * against.
 */

type Row = readonly [
  date: string,
  description: string,
  type: EntryType,
  catId: string,
  amount: number,
  vatRate: number,
]

/** The sixteen entries from CLAUDE.md §10. All amounts are gross. */
const ROWS: readonly Row[] = [
  [
    "2026-01-08",
    "Lasku 1001 – Mäkinen Rakennus Oy",
    "income",
    "300-domestic",
    251000,
    25.5,
  ],
  ["2026-01-15", "Osto – K-Rauta – tarvikkeet", "expense", "333", 18640, 25.5],
  ["2026-01-31", "Puhelinliittymä – Elisa", "expense", "344-other", 2990, 25.5],
  [
    "2026-02-12",
    "Lasku 1002 – Virtanen",
    "income",
    "300-domestic",
    125500,
    25.5,
  ],
  ["2026-02-20", "Työtilan vuokra, helmikuu", "expense", "343", 45000, 25.5],
  ["2026-03-03", "Lasku 1003 – Nordic Build AB", "income", "300-eu", 320000, 0],
  ["2026-03-18", "Polttoaine – Neste", "expense", "344-vehicle", 9235, 25.5],
  ["2026-03-20", "Työtilan vuokra, maaliskuu", "expense", "343", 45000, 25.5],
  [
    "2026-04-09",
    "Lounaspalaveri asiakkaan kanssa",
    "expense",
    "344-meeting",
    4860,
    13.5,
  ],
  ["2026-04-20", "Työtilan vuokra, huhtikuu", "expense", "343", 45000, 25.5],
  [
    "2026-05-14",
    "Lasku 1004 – Laaksonen Oy",
    "income",
    "300-reverse",
    480000,
    0,
  ],
  ["2026-06-02", "YEL-maksu", "expense", "336", 31000, 0],
  [
    "2026-09-22",
    "Kirjanpito-ohjelma, vuosimaksu",
    "expense",
    "344-other",
    11900,
    25.5,
  ],
  ["2026-10-10", "Osto – K-Rauta – Tarvikkeet", "expense", "333", 10000, 25.5],
  [
    "2026-10-28",
    "Lasku 1005 – Mäkinen Rakennus Oy",
    "income",
    "300-domestic",
    188250,
    25.5,
  ],
  ["2026-10-30", "Pankin palvelumaksut", "expense", "349", 850, 0],
]

export function sampleEntries(makeId: () => string = uid): Entry[] {
  return ROWS.map(([date, description, type, catId, amount, vatRate]) => ({
    id: makeId(),
    date,
    description,
    type,
    catId,
    amount,
    vatRate,
    amountMode: "gross" as const,
  }))
}
