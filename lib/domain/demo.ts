import { uid } from "@/lib/domain/id"
import type { Entry, EntryType } from "@/lib/domain/types"

export const DEMO_YEAR = 2026

type Row = readonly [
  pvm: string,
  selite: string,
  tyyppi: EntryType,
  catId: string,
  summa: number,
  alv: number,
]

/** The sixteen sample entries from CLAUDE.md §10. All amounts are gross. */
const ROWS: readonly Row[] = [
  [
    "2026-01-08",
    "Lasku 1001 – Mäkinen Rakennus Oy",
    "tulo",
    "300-suomi",
    251000,
    25.5,
  ],
  ["2026-01-15", "Osto – K-Rauta – tarvikkeet", "kulu", "333", 18640, 25.5],
  ["2026-01-31", "Puhelinliittymä – Elisa", "kulu", "344-muut", 2990, 25.5],
  ["2026-02-12", "Lasku 1002 – Virtanen", "tulo", "300-suomi", 125500, 25.5],
  ["2026-02-20", "Työtilan vuokra, helmikuu", "kulu", "343", 45000, 25.5],
  ["2026-03-03", "Lasku 1003 – Nordic Build AB", "tulo", "300-eu", 320000, 0],
  ["2026-03-18", "Polttoaine – Neste", "kulu", "344-ajo", 9235, 25.5],
  ["2026-03-20", "Työtilan vuokra, maaliskuu", "kulu", "343", 45000, 25.5],
  [
    "2026-04-09",
    "Lounaspalaveri asiakkaan kanssa",
    "kulu",
    "344-kokous",
    4860,
    13.5,
  ],
  ["2026-04-20", "Työtilan vuokra, huhtikuu", "kulu", "343", 45000, 25.5],
  ["2026-05-14", "Lasku 1004 – Laaksonen Oy", "tulo", "300-kaant", 480000, 0],
  ["2026-06-02", "YEL-maksu", "kulu", "336", 31000, 0],
  [
    "2026-09-22",
    "Kirjanpito-ohjelma, vuosimaksu",
    "kulu",
    "344-muut",
    11900,
    25.5,
  ],
  ["2026-10-10", "Osto – K-Rauta – Tarvikkeet", "kulu", "333", 10000, 25.5],
  [
    "2026-10-28",
    "Lasku 1005 – Mäkinen Rakennus Oy",
    "tulo",
    "300-suomi",
    188250,
    25.5,
  ],
  ["2026-10-30", "Pankin palvelumaksut", "kulu", "349", 850, 0],
]

export function demoEntries(makeId: () => string = uid): Entry[] {
  return ROWS.map(([pvm, selite, tyyppi, catId, summa, alv]) => ({
    id: makeId(),
    pvm,
    selite,
    tyyppi,
    catId,
    summa,
    alv,
    syotto: "brutto" as const,
  }))
}
