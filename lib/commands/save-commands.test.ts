// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  autosaveBook,
  exportBook,
  openFile,
  saveBook,
} from "@/lib/commands/io-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { unpackZip } from "@/lib/domain/zip"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import type { Ctx } from "@/lib/commands/ctx"

/* Saving the bookkeeping back to the file it was opened from (§7.5). */

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const CSV = [
  "pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;tosite",
  "2026-01-08;Lasku 1001;tulo;300;Myynti – Suomi;2510,00;25,5;brutto;",
].join("\r\n")

/**
 * A stand-in for a `FileSystemFileHandle`: it records what was written and
 * reports a modification time the test controls, which is the whole of what
 * `saveBook` asks a handle for.
 */
function fakeHandle(name: string, lastModified = 1000) {
  const written: Blob[] = []
  const handle = {
    name,
    written,
    lastModified,
    permission: "granted" as PermissionState,
    queryPermission: vi.fn(async () => handle.permission),
    requestPermission: vi.fn(async () => handle.permission),
    getFile: vi.fn(
      async () =>
        new File([CSV], name, {
          lastModified: handle.lastModified,
        })
    ),
    createWritable: vi.fn(async () => ({
      write: async (blob: Blob) => {
        written.push(blob)
      },
      // A real write moves the file's modification time, and the guard
      // against outside edits only works if the app follows it.
      close: async () => {
        handle.lastModified += 1000
      },
      abort: async () => {},
    })),
  }
  return handle
}

type FakeHandle = ReturnType<typeof fakeHandle>

function asHandle(handle: FakeHandle): FileSystemFileHandle {
  return handle as unknown as FileSystemFileHandle
}

/** The save picker's answer, or null for a user who cancelled it. */
function stubPickers(saveResult: FakeHandle | null) {
  const showSaveFilePicker = vi.fn(async () => {
    if (!saveResult) throw new DOMException("cancelled", "AbortError")
    return asHandle(saveResult)
  })
  vi.stubGlobal("showOpenFilePicker", vi.fn())
  vi.stubGlobal("showSaveFilePicker", showSaveFilePicker)
  return showSaveFilePicker
}

async function openLinked(handle: FakeHandle) {
  await openFile(
    ctx,
    new File([CSV], handle.name, {
      type: "text/csv",
      lastModified: handle.lastModified,
    }),
    asHandle(handle)
  )
}

/** A bookkeeping already linked to a ZIP on disk, as after its first save. */
function linkZip(handle: FakeHandle) {
  useBookStore.setState({
    open: true,
    entries: [sample()],
    dirty: true,
    fileName: handle.name,
    fileHandle: asHandle(handle),
    savedAt: handle.lastModified,
  })
}

async function unzipped(blob: Blob) {
  return unpackZip(new Uint8Array(await blob.arrayBuffer()))
}

describe("saving back to the opened file", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    useBookStore.setState({
      open: false,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      dirty: false,
      fileName: null,
      fileHandle: null,
      savedAt: null,
      importing: false,
      saving: false,
    })
  })

  it("links the file it was opened from", async () => {
    const handle = fakeHandle("kirjanpito.csv")
    stubPickers(null)
    await openLinked(handle)
    expect(useBookStore.getState().fileHandle).toBe(asHandle(handle))
  })

  /*
   * A bookkeeping is a ZIP, since settings.json travels with it (§7.6), so a
   * book opened from a plain CSV has outgrown that file on its first save.
   */
  it("moves a book opened from a CSV into a ZIP, then writes back to it", async () => {
    const csv = fakeHandle("kirjanpito.csv")
    const zip = fakeHandle("kirjanpito.zip")
    const picker = stubPickers(zip)
    await openLinked(csv)
    useBookStore.getState().upsertEntry(sample())

    await saveBook(ctx, "kirjanpito")
    expect(picker).toHaveBeenCalledOnce()
    expect(csv.written).toHaveLength(0)
    expect(zip.written).toHaveLength(1)
    const archive = await unzipped(zip.written[0])
    expect(archive?.csvText).toContain("pvm;selite")
    expect(archive?.settingsText).toContain('"vatPeriod"')
    expect(useBookStore.getState().dirty).toBe(false)

    useBookStore.getState().upsertEntry({ ...sample(), id: "e2" })
    await saveBook(ctx, "kirjanpito")
    expect(picker).toHaveBeenCalledOnce()
    expect(zip.written).toHaveLength(2)
  })

  /*
   * A file picked through an `<input>` or dropped carries no handle, so the
   * first save has to ask where the bookkeeping should live.
   */
  it("asks for a file when there is nothing to write back to", async () => {
    const chosen = fakeHandle("uusi.zip")
    const picker = stubPickers(chosen)
    await openFile(ctx, new File([CSV], "kirjanpito.csv", { type: "text/csv" }))
    expect(useBookStore.getState().fileHandle).toBeNull()

    await saveBook(ctx, "kirjanpito")

    expect(picker).toHaveBeenCalledOnce()
    expect(chosen.written).toHaveLength(1)
    expect(useBookStore.getState().fileName).toBe("uusi.zip")
    expect(useBookStore.getState().fileHandle).toBe(asHandle(chosen))
  })

  it("writes nothing when the user cancels the picker", async () => {
    stubPickers(null)
    await openFile(ctx, new File([CSV], "kirjanpito.csv", { type: "text/csv" }))
    useBookStore.setState({ dirty: true })

    await saveBook(ctx, "kirjanpito")

    expect(useBookStore.getState().dirty).toBe(true)
    expect(useBookStore.getState().fileHandle).toBeNull()
  })

  it("leaves the bookkeeping dirty when permission is refused", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    handle.permission = "denied"
    stubPickers(null)
    linkZip(handle)

    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  /*
   * The file's own timestamp is the only evidence available that something
   * else — a spreadsheet, another tab — has written to it since it was read.
   */
  it("refuses to overwrite a file changed outside the app", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    const picker = stubPickers(null)
    linkZip(handle)

    handle.lastModified = 2000
    await saveBook(ctx, "kirjanpito")

    // The confirm dialog has no host in this test, so it resolves to false.
    expect(picker).not.toHaveBeenCalled()
    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  /*
   * Writing moves the file's timestamp, so without following it the app would
   * mistake its own save for an outside edit and question the next one.
   */
  it("follows the file's timestamp so a second save is not questioned", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    stubPickers(null)
    linkZip(handle)

    await saveBook(ctx, "kirjanpito")
    expect(useBookStore.getState().savedAt).toBe(handle.lastModified)

    useBookStore.getState().upsertEntry({ ...sample(), id: "e2" })
    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toHaveLength(2)
    expect(useBookStore.getState().dirty).toBe(false)
  })
})

describe("downloading a copy", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    useBookStore.setState({
      open: true,
      hydrated: true,
      entries: [sample()],
      cats: defaultCategories(),
      dirty: true,
      fileName: null,
      fileHandle: null,
      savedAt: null,
      saving: false,
    })
    // jsdom has no object URLs; the download itself is not what is under test.
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:x"),
      revokeObjectURL: vi.fn(),
    })
  })

  /* With no file behind it, the copy is the only place the work exists. */
  it("clears the dirty flag when there is no linked file", async () => {
    await exportBook(ctx, "kirjanpito", false)

    expect(useBookStore.getState().dirty).toBe(false)
    expect(useBookStore.getState().fileName).toBe("kirjanpito.zip")
  })

  it("writes a bare CSV only when asked to", async () => {
    await exportBook(ctx, "kirjanpito", true)

    expect(useBookStore.getState().fileName).toBe("kirjanpito.csv")
  })

  /*
   * With one, the copy says nothing about that file, and claiming otherwise
   * would let the user close a bookkeeping whose own file is still stale.
   */
  it("leaves the dirty flag alone when a file is linked", async () => {
    const handle = fakeHandle("oma.csv")
    useBookStore.setState({
      fileHandle: asHandle(handle),
      fileName: "oma.csv",
    })

    await exportBook(ctx, "kopio", false)

    expect(useBookStore.getState().dirty).toBe(true)
    expect(useBookStore.getState().fileName).toBe("oma.csv")
    expect(handle.written).toHaveLength(0)
  })
})

function sample() {
  return {
    id: "e1",
    date: "2026-01-08",
    description: "Lasku 1001",
    type: "income" as const,
    catId: "300-domestic",
    amount: 251000,
    vatRate: 25.5,
    amountMode: "gross" as const,
  }
}

/*
 * Opt-in autosave (§7.5): it writes only where nothing has to be asked, and
 * otherwise stops and waits for a manual save.
 */
describe("autosave", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    useBookStore.setState({
      hydrated: true,
      cats: defaultCategories(),
      saving: false,
      importing: false,
      autosave: true,
      autosavePaused: false,
    })
  })

  it("writes to a linked ZIP it may already write to", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    linkZip(handle)

    expect(await autosaveBook(ctx)).toBe(true)
    expect(handle.written).toHaveLength(1)
    expect(useBookStore.getState().dirty).toBe(false)
    expect(useBookStore.getState().savedAt).toBe(handle.lastModified)
  })

  it("never asks for permission, and pauses instead", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    handle.permission = "prompt"
    linkZip(handle)

    expect(await autosaveBook(ctx)).toBe(false)
    expect(handle.requestPermission).not.toHaveBeenCalled()
    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().autosavePaused).toBe(true)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  it("pauses on a file changed outside the app, without asking", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    linkZip(handle)
    handle.lastModified = 5000

    expect(await autosaveBook(ctx)).toBe(false)
    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().autosavePaused).toBe(true)
  })

  it("pauses on a linked CSV, which a ZIP cannot be written into", async () => {
    const handle = fakeHandle("kirjanpito.csv")
    linkZip(handle)

    expect(await autosaveBook(ctx)).toBe(false)
    expect(useBookStore.getState().autosavePaused).toBe(true)
  })

  it("does nothing while it is off", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    linkZip(handle)
    useBookStore.setState({ autosave: false })

    expect(await autosaveBook(ctx)).toBe(false)
    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().autosavePaused).toBe(false)
  })

  it("starts again after a manual save", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    stubPickers(null)
    linkZip(handle)
    useBookStore.setState({ autosavePaused: true })

    await saveBook(ctx, "kirjanpito")

    expect(useBookStore.getState().autosavePaused).toBe(false)
  })
})
