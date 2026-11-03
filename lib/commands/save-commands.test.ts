// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  autosaveBook,
  exportBook,
  openFile,
  saveBook,
} from "@/lib/commands/io-commands"
import { getReceipt } from "@/lib/browser/receipt-store"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Attachment } from "@/lib/domain/types"
import { packZip, unpackZip } from "@/lib/domain/zip"
import { registerConfirmHandler } from "@/lib/ui/confirm"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import type { Ctx } from "@/lib/commands/ctx"

/* Saving the bookkeeping back to the file it was opened from (§7.5). */

vi.mock("@/lib/browser/receipt-store", async (original) => {
  const actual = await original<typeof import("@/lib/browser/receipt-store")>()
  return { ...actual, getReceipt: vi.fn(actual.getReceipt) }
})

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const CSV = [
  "date;description;type;account;category;amount;vat;mode;receipts",
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
      /*
       * A real write moves the file's modification time, and the guard
       * against outside edits only works if the app follows it.
       */
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
    expect(archive?.csvText).toContain("date;description")
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
  it("keeps a change made while the file was being written", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    stubPickers(null)
    linkZip(handle)
    handle.createWritable.mockImplementationOnce(async () => ({
      write: async (blob: Blob) => {
        handle.written.push(blob)
        useBookStore.getState().removeEntry("e1")
      },
      close: async () => {
        handle.lastModified += 1000
      },
      abort: async () => {},
    }))

    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toHaveLength(1)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  /* Deleting the last entry has to reach the file as well. */
  it("saves a book whose last entry was deleted", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    stubPickers(null)
    linkZip(handle)
    useBookStore.getState().removeEntry("e1")

    await saveBook(ctx, "kirjanpito")

    const zip = await unzipped(handle.written[0])
    expect(zip?.csvText.trim().split("\r\n")).toHaveLength(1)
    expect(useBookStore.getState().dirty).toBe(false)
  })

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
    await exportBook(ctx, "kirjanpito")

    expect(useBookStore.getState().dirty).toBe(false)
    expect(useBookStore.getState().fileName).toBe("kirjanpito.zip")
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

    await exportBook(ctx, "kopio")

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

describe("receipts the browser does not hold", () => {
  const PATH = "tositteet/2026/01/kuitti.jpg"
  const bytes = new TextEncoder().encode("kuitti")
  const missing: Attachment = {
    id: null,
    name: "kuitti.jpg",
    type: "",
    size: 0,
    missing: true,
    path: PATH,
  }
  const gone: Attachment = {
    id: "a-gone",
    name: "kuitti.jpg",
    type: "image/jpeg",
    size: 6,
  }

  /** A linked ZIP on disk that holds the receipt at `PATH`, or none at all. */
  async function zipOnDisk(att: Attachment, withReceipt: boolean) {
    const handle = fakeHandle("kirjanpito.zip")
    const data = await packZip({
      csvName: "kirjanpito.csv",
      csvText: CSV,
      paths: new Map(withReceipt ? [["x#0", PATH]] : []),
      attachmentIds: new Map([["x#0", "x"]]),
      read: async () => bytes,
      settingsText: "{}",
    })
    handle.getFile.mockImplementation(
      async () =>
        new File([data as BlobPart], handle.name, {
          lastModified: handle.lastModified,
        })
    )
    linkZip(handle)
    useBookStore.setState({ entries: [{ ...sample(), atts: [att] }] })
    return handle
  }

  beforeEach(() => {
    vi.unstubAllGlobals()
    stubPickers(null)
    registerConfirmHandler(null)
    useBookStore.setState({
      autosave: false,
      autosavePaused: false,
      saving: false,
    })
  })

  it("keeps a missing receipt in the file it overwrites", async () => {
    const handle = await zipOnDisk(missing, true)

    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toHaveLength(1)
    const saved = await unzipped(handle.written[0])
    expect(new TextDecoder().decode((await saved?.readReceipt(PATH))!)).toBe(
      "kuitti"
    )
  })

  it("does not ask about a receipt the file never held", async () => {
    const handle = await zipOnDisk(missing, false)
    const asked = vi.fn(async () => false)
    registerConfirmHandler(asked)

    await saveBook(ctx, "kirjanpito")

    expect(asked).not.toHaveBeenCalled()
    expect(handle.written).toHaveLength(1)
  })

  it("asks before saving without a stored receipt it cannot find", async () => {
    const handle = await zipOnDisk(gone, false)
    const asked = vi.fn(async () => false)
    registerConfirmHandler(asked)

    await saveBook(ctx, "kirjanpito")

    expect(asked).toHaveBeenCalledOnce()
    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  it("saves anyway when the user says so", async () => {
    const handle = await zipOnDisk(gone, false)
    registerConfirmHandler(async () => true)

    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toHaveLength(1)
  })

  it("makes autosave stop rather than drop one", async () => {
    const handle = await zipOnDisk(gone, false)
    useBookStore.setState({ autosave: true })

    expect(await autosaveBook(ctx)).toBe(false)
    expect(handle.written).toHaveLength(0)
    expect(useBookStore.getState().autosavePaused).toBe(true)
  })

  it("autosaves a missing receipt the file can keep", async () => {
    const handle = await zipOnDisk(missing, true)
    useBookStore.setState({ autosave: true })

    expect(await autosaveBook(ctx)).toBe(true)
    const saved = await unzipped(handle.written[0])
    expect(new TextDecoder().decode((await saved?.readReceipt(PATH))!)).toBe(
      "kuitti"
    )
  })

  /*
   * The picker needs a recent user gesture, so it comes before the packing,
   * which is also what spares a user who cancels from waiting for it.
   */
  it("asks for the file before reading any receipt", async () => {
    vi.mocked(getReceipt).mockClear()
    useBookStore.setState({
      open: true,
      entries: [{ ...sample(), atts: [gone] }],
      dirty: true,
      fileName: null,
      fileHandle: null,
      savedAt: null,
    })

    await saveBook(ctx, "kirjanpito")

    expect(window.showSaveFilePicker).toHaveBeenCalledOnce()
    expect(getReceipt).not.toHaveBeenCalled()
  })

  it("asks for write permission before reading any receipt", async () => {
    vi.mocked(getReceipt).mockClear()
    const handle = await zipOnDisk(gone, false)
    handle.permission = "denied"

    await saveBook(ctx, "kirjanpito")

    expect(getReceipt).not.toHaveBeenCalled()
    expect(handle.written).toHaveLength(0)
  })
})

describe("another book taking over during a save (§7.5)", () => {
  const OTHER_CSV =
    "date;description;type;account;category;amount;vat\n2026-02-01;Toinen;kulu;333;;1,00;0\n"

  /** A linked ZIP whose write waits until the test lets it finish. */
  function slowZip() {
    const handle = fakeHandle("kirjanpito.zip")
    let finish = () => {}
    const gate = new Promise<void>((resolve) => {
      finish = resolve
    })
    handle.createWritable.mockImplementation(async () => ({
      write: async (blob: Blob) => {
        await gate
        handle.written.push(blob)
      },
      close: async () => {
        handle.lastModified += 1000
      },
      abort: async () => {},
    }))
    linkZip(handle)
    return { handle, finish }
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve, 20))

  beforeEach(() => {
    vi.unstubAllGlobals()
    stubPickers(null)
    registerConfirmHandler(async () => true)
    useBookStore.setState({
      autosave: false,
      autosavePaused: false,
      saving: false,
      importing: false,
    })
  })

  it("leaves a file opened meanwhile linked to itself", async () => {
    const { handle, finish } = slowZip()
    const other = fakeHandle("toinen.csv")

    const saving = saveBook(ctx, "kirjanpito")
    await tick()
    await openFile(
      ctx,
      new File([OTHER_CSV], other.name, { lastModified: 5000 }),
      asHandle(other)
    )
    finish()
    await saving

    const state = useBookStore.getState()
    expect(state.fileHandle).toBe(asHandle(other))
    expect(state.fileName).toBe("toinen.csv")
    expect(state.savedAt).toBe(5000)
    expect(state.entries[0].description).toBe("Toinen")
    // The old book reached its own file before the new one took over.
    const saved = await unzipped(handle.written[0])
    expect(saved?.csvText).toContain("Lasku")
  })

  it("does not link a closed book's file again", async () => {
    const { finish } = slowZip()

    const saving = saveBook(ctx, "kirjanpito")
    await tick()
    useBookStore.getState().closeBook()
    finish()
    await saving

    const state = useBookStore.getState()
    expect(state.fileHandle).toBeNull()
    expect(state.fileName).toBeNull()
    expect(state.dirty).toBe(false)
  })

  it("holds for autosave too", async () => {
    const { finish } = slowZip()
    const other = fakeHandle("toinen.csv")
    useBookStore.setState({ autosave: true })

    const saving = autosaveBook(ctx)
    await tick()
    await openFile(
      ctx,
      new File([OTHER_CSV], other.name, { lastModified: 5000 }),
      asHandle(other)
    )
    finish()

    expect(await saving).toBe(false)
    expect(useBookStore.getState().fileHandle).toBe(asHandle(other))
  })

  it("does not write a new book into the old file", async () => {
    const handle = fakeHandle("kirjanpito.zip")
    linkZip(handle)
    let grant: (permission: PermissionState) => void = () => {}
    handle.queryPermission.mockImplementation(
      () =>
        new Promise<PermissionState>((resolve) => {
          grant = resolve
        })
    )

    const saving = saveBook(ctx, "kirjanpito")
    await tick()
    useBookStore.getState().newBook(2026)
    grant("granted")
    await saving

    expect(handle.written).toHaveLength(0)
  })
})
