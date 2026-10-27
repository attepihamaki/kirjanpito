// @vitest-environment jsdom
import JSZip from "jszip"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { openFile } from "@/lib/commands/io-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"
import type { Ctx } from "@/lib/commands/ctx"

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const CSV = [
  "pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;tosite",
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
    const zip = new JSZip()
    zip.file(
      "kirjanpito.csv",
      [
        "pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;tosite",
        "2026-01-08;Lasku 1001;tulo;300;Myynti – Suomi;2510,00;25,5;brutto;",
        "2026-02-01;Adobe;kulu;334;Ohjelmistot;24,00;25,5;brutto;",
      ].join("\r\n")
    )
    zip.file("settings.json", JSON.stringify(settings))
    const bytes = await zip.generateAsync({ type: "uint8array" })
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
        vatPeriod: "quarter",
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
    expect(state.vatPeriod).toBe("quarter")
    expect(state.vatMode).toBe("quarter")
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
})
