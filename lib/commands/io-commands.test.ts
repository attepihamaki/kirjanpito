// @vitest-environment jsdom
import {
  TextReader,
  Uint8ArrayWriter,
  ZipWriter,
} from "@zip.js/zip.js/index-native.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import { openFile } from "@/lib/commands/io-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { registerConfirmHandler, type ConfirmOptions } from "@/lib/ui/confirm"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"
import type { Ctx } from "@/lib/commands/ctx"

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const CSV = [
  "date;description;type;account;category;amount;vat;mode;receipts",
  "2026-01-08;Lasku 1001;tulo;300;Myynti – Suomi;2510,00;25,5;brutto;",
].join("\r\n")

function pick(name: string, text = CSV) {
  return new File([text], name, { type: "text/csv" })
}

describe("opening a file", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: false,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      dirty: false,
      fileName: null,
      importing: false,
    })
  })

  /*
   * §7.3: the name of the file the bookkeeping came from, with its extension,
   * is what the sidebar shows.
   */
  it("remembers the name of the file it was opened from", async () => {
    await openFile(ctx, pick("kirjanpito_2026-10-24.csv"))

    const state = useBookStore.getState()
    expect(state.entries).toHaveLength(1)
    expect(state.fileName).toBe("kirjanpito_2026-10-24.csv")
    // A freshly imported file is, by definition, already exported.
    expect(state.dirty).toBe(false)
  })

  it("keeps the extension it was actually given", async () => {
    await openFile(ctx, pick("tilikausi 2025.CSV"))
    expect(useBookStore.getState().fileName).toBe("tilikausi 2025.CSV")
  })

  it("leaves the name unset when the file could not be read", async () => {
    await openFile(ctx, pick("rikki.csv", "ei;otsikoita\n1;2"))
    expect(useBookStore.getState().fileName).toBeNull()
    expect(useBookStore.getState().entries).toHaveLength(0)
  })
})

/*
 * Reading a ZIP means unpacking it and writing every receipt to IndexedDB,
 * which takes seconds. The flag is what the sidebar spinner and the overlay
 * hang off; `useDelayedFlag` is what keeps them from flashing for a CSV that
 * opens in a millisecond.
 */
describe("the importing flag", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: false,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      dirty: false,
      fileName: null,
      importing: false,
    })
  })

  it("is raised while the file is read and lowered afterwards", async () => {
    const seen: boolean[] = []
    const stop = useBookStore.subscribe((s) => seen.push(s.importing))

    await openFile(ctx, pick("kirjanpito.csv"))
    stop()

    expect(seen).toContain(true)
    expect(useBookStore.getState().importing).toBe(false)
  })

  it("is lowered again when the file could not be read", async () => {
    await openFile(ctx, pick("rikki.csv", "ei;otsikoita\n1;2"))
    expect(useBookStore.getState().importing).toBe(false)
  })

  it("makes a second file dropped mid-import a no-op", async () => {
    useBookStore.setState({ importing: true })

    await openFile(ctx, pick("kirjanpito.csv"))

    /*
     * Nothing was read, and the flag belongs to the import already running —
     * this call must not clear it on its way out.
     */
    expect(useBookStore.getState().entries).toHaveLength(0)
    expect(useBookStore.getState().importing).toBe(true)
  })
})

/* A bookkeeping ZIP carries its settings beside the CSV (§7.6). */
describe("settings.json", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: false,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      dirty: false,
      fileName: null,
      importing: false,
      vatPeriod: "month",
      vatFiled: { "2025-01": "2025-03-10" },
    })
    useLangStore.setState({ lang: "fi" })
  })

  async function zipFile(settings: unknown) {
    const zip = new ZipWriter(new Uint8ArrayWriter())
    await zip.add(
      "kirjanpito.csv",
      new TextReader(
        [
          "date;description;type;account;category;amount;vat;mode;receipts",
          "2026-01-08;Lasku 1001;tulo;300;Myynti – Suomi;2510,00;25,5;brutto;",
          "2026-02-01;Adobe;kulu;334;Ohjelmistot;24,00;25,5;brutto;",
        ].join("\r\n")
      )
    )
    await zip.add("settings.json", new TextReader(JSON.stringify(settings)))
    const bytes = await zip.close()
    return new File([bytes as BlobPart], "kirjanpito.zip", {
      type: "application/zip",
    })
  }

  it("restores what the file carried", async () => {
    const setTheme = vi.fn()
    const navigate = vi.fn()
    await openFile(
      { ...ctx, navigate, setTheme },
      await zipFile({
        version: 1,
        language: "en",
        theme: "dark",
        businessId: "0112038-9",
        businessName: "Oma Oy",
        vatPeriod: "quarter",
        bookStart: "2025-10",
        vatFiled: { "2026-Q1": "2026-05-11" },
        overview: { layout: [{ id: "checks", size: "L", hidden: false }] },
        categories: [
          {
            id: "c-soft",
            line: "334",
            name: "Ohjelmistot",
            vatRate: 25.5,
            enabled: true,
            custom: true,
          },
        ],
        pageSize: { ledger: 50, categories: 25 },
      })
    )

    const state = useBookStore.getState()
    expect(state.entries).toHaveLength(2)
    expect(state.businessId).toBe("0112038-9")
    expect(state.businessName).toBe("Oma Oy")
    expect(state.vatPeriod).toBe("quarter")
    expect(state.bookStart).toBe("2025-10")
    expect(state.vatFiled).toEqual({ "2026-Q1": "2026-05-11" })
    expect(state.overviewLayout[0].id).toBe("checks")
    expect(state.ledgerSize).toBe(50)
    // The custom category came back with its own id, not recreated.
    expect(state.entries[1].catId).toBe("c-soft")
    expect(state.cats.filter((c) => c.name === "Ohjelmistot")).toHaveLength(1)
    expect(useLangStore.getState().lang).toBe("en")
    expect(setTheme).toHaveBeenCalledWith("dark")
    expect(state.dirty).toBe(false)
    expect(navigate).toHaveBeenCalledWith("/app/overview")
  })

  it("starts a plain CSV with no filed returns", async () => {
    await openFile(ctx, pick("kirjanpito.csv"))
    expect(useBookStore.getState().vatFiled).toEqual({})
    expect(useBookStore.getState().vatPeriod).toBe("month")
  })

  it("takes the export language from the file", async () => {
    await openFile(ctx, await zipFile({ version: 1, exportLang: "en" }))
    expect(useBookStore.getState().exportLang).toBe("en")
  })

  /*
   * Absent means Finnish — the documented default — rather than whatever the
   * book being replaced happened to use.
   */
  it("falls back to Finnish for a file that does not say", async () => {
    useBookStore.setState({ exportLang: "en" })
    await openFile(ctx, await zipFile({ version: 1 }))
    expect(useBookStore.getState().exportLang).toBe("fi")

    useBookStore.setState({ exportLang: "en", open: false, dirty: false })
    await openFile(ctx, pick("kirjanpito.csv"))
    expect(useBookStore.getState().exportLang).toBe("fi")
  })
})

/*
 * Nothing reads an older or foreign file shape, so one has to be refused or
 * reported rather than half-read (§8).
 */
describe("a file the app does not understand", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: false,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      dirty: false,
      fileName: null,
      importing: false,
    })
    useLangStore.setState({ lang: "fi" })
  })

  it("is refused in a dialog the user has to close", async () => {
    const shown: ConfirmOptions[] = []
    registerConfirmHandler(async (options) => {
      shown.push(options)
      return true
    })

    await openFile(ctx, pick("osoitteet.csv", "nimi;osoite\nA;B"))

    expect(shown).toHaveLength(1)
    expect(shown[0].title).toBe("Tiedostoa ei voitu avata")
    expect(shown[0].message).toContain("ei ole kirjanpitotiedosto")
    // One button: there is nothing here to decide.
    expect(shown[0].cancelLabel).toBe(undefined)
    expect(useBookStore.getState().open).toBe(false)

    registerConfirmHandler(null)
  })

  it("opens a file with an unreadable column, and says which", async () => {
    const toasted: string[] = []
    vi.spyOn(toast, "add").mockImplementation(({ title }) => {
      toasted.push(String(title))
      return "toast"
    })

    await openFile(
      ctx,
      pick(
        "vanha.csv",
        [
          "date;type;amount;tosite",
          "2026-01-08;tulo;10,00;liitteet/a.pdf",
        ].join("\r\n")
      )
    )

    expect(useBookStore.getState().entries).toHaveLength(1)
    expect(toasted.join()).toContain("tosite")
    vi.restoreAllMocks()
  })
})
