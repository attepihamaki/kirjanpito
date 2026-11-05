// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  autosaveBook,
  exportBook,
  openFile,
  saveBook,
} from "@/lib/commands/io-commands"
import {
  forgetPassword,
  heldPassword,
  holdPassword,
} from "@/lib/commands/book-password"
import {
  removeBookEncryption,
  setBookPassword,
} from "@/lib/commands/encryption-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { packZip, unpackZip } from "@/lib/domain/zip"
import { createAppT } from "@/lib/i18n/messages"
import { registerConfirmHandler } from "@/lib/ui/confirm"
import {
  registerPasswordHandler,
  type PasswordPromptOptions,
} from "@/lib/ui/password-prompt"
import { useBookStore } from "@/stores/book-store"
import type { Ctx } from "@/lib/commands/ctx"

/* Encrypting the saved file and opening one that is encrypted (§7.8). */

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const PASSWORD = "correct horse battery"

const CSV = [
  "date;description;type;account;category;amount;vat;mode;receipts",
  "2026-01-08;Lasku 1001;tulo;300;Myynti – Suomi;2510,00;25,5;brutto;",
].join("\r\n")

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

async function zipBytes(password?: string) {
  return packZip({
    csvName: "kirjanpito.csv",
    csvText: CSV,
    paths: new Map(),
    attachmentIds: new Map(),
    read: async () => null,
    settingsText: "{}",
    password,
  })
}

async function zipFile(password?: string) {
  return new File([(await zipBytes(password)) as BlobPart], "kirjanpito.zip", {
    type: "application/zip",
  })
}

/** A handle for a ZIP on disk with `onDisk` in it; records what is written. */
function fakeHandle(onDisk: File) {
  const written: Blob[] = []
  const handle = {
    name: "kirjanpito.zip",
    written,
    lastModified: 1000,
    queryPermission: vi.fn(async () => "granted"),
    requestPermission: vi.fn(async () => "granted"),
    getFile: vi.fn(
      async () =>
        new File([onDisk], "kirjanpito.zip", {
          lastModified: handle.lastModified,
        })
    ),
    createWritable: vi.fn(async () => ({
      write: async (blob: Blob) => {
        written.push(blob)
      },
      close: async () => {
        handle.lastModified += 1000
      },
      abort: async () => {},
    })),
  }
  return handle
}

function link(handle: ReturnType<typeof fakeHandle>) {
  useBookStore.setState({
    open: true,
    entries: [sample()],
    dirty: true,
    fileName: handle.name,
    fileHandle: handle as unknown as FileSystemFileHandle,
    savedAt: handle.lastModified,
  })
}

async function bytesOf(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * A user who types each guess in turn. Every guess goes through the dialog's
 * `verify`, as the real host does, and the first one it accepts is the answer.
 */
function typing(...guesses: string[]) {
  const asked: PasswordPromptOptions[] = []
  const wrong: string[] = []
  registerPasswordHandler(async (options) => {
    asked.push(options)
    for (const guess of guesses) {
      const problem = (await options.verify?.(guess)) ?? null
      if (problem === null) return guess
      wrong.push(problem)
    }
    return null
  })
  return { asked, wrong }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  registerPasswordHandler(null)
  registerConfirmHandler(null)
  forgetPassword()
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
    encrypted: false,
    autosave: false,
    autosavePaused: false,
  })
})

describe("opening an encrypted file", () => {
  it("asks for the password and keeps it for the first save", async () => {
    const { asked, wrong } = typing("not it", PASSWORD)
    await openFile(ctx, await zipFile(PASSWORD))

    expect(asked).toHaveLength(1)
    // The wrong guess is answered inside the dialog, which stays open.
    expect(wrong).toEqual([ctx.t("io.passwordWrong")])
    const state = useBookStore.getState()
    expect(state.entries).toHaveLength(1)
    expect(state.encrypted).toBe(true)
    expect(state.dirty).toBe(false)
    expect(heldPassword()).toBe(PASSWORD)
  })

  it("opens nothing when the prompt is cancelled", async () => {
    typing()
    await openFile(ctx, await zipFile(PASSWORD))

    const state = useBookStore.getState()
    expect(state.open).toBe(false)
    expect(state.entries).toEqual([])
    expect(state.importing).toBe(false)
    expect(heldPassword()).toBeNull()
  })

  it("does not ask for a plain file", async () => {
    const { asked } = typing()
    await openFile(ctx, await zipFile())

    expect(asked).toHaveLength(0)
    expect(useBookStore.getState().encrypted).toBe(false)
    expect(useBookStore.getState().entries).toHaveLength(1)
  })

  it("drops the password when another book takes over", async () => {
    typing(PASSWORD)
    await openFile(ctx, await zipFile(PASSWORD))
    expect(heldPassword()).toBe(PASSWORD)

    useBookStore.getState().newBook(2026, "fi")
    expect(heldPassword()).toBeNull()
    expect(useBookStore.getState().encrypted).toBe(false)
  })
})

describe("saving an encrypted book", () => {
  it("writes an archive that needs the password", async () => {
    const handle = fakeHandle(await zipFile(PASSWORD))
    link(handle)
    useBookStore.setState({ encrypted: true })
    holdPassword(PASSWORD)

    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toHaveLength(1)
    const bytes = await bytesOf(handle.written[0])
    await expect(unpackZip(bytes)).rejects.toThrow()
    const archive = await unpackZip(bytes, undefined, PASSWORD)
    expect(archive?.csvText).toContain("Lasku 1001")
    expect(archive?.encrypted).toBe(true)
  })

  it("checks a password asked after a reload against the file", async () => {
    const handle = fakeHandle(await zipFile(PASSWORD))
    link(handle)
    useBookStore.setState({ encrypted: true })
    const { asked, wrong } = typing("typo", PASSWORD)

    await saveBook(ctx, "kirjanpito")

    // A typo would otherwise lock the user out of their own file.
    expect(wrong).toEqual([ctx.t("io.passwordWrong")])
    expect(asked[0].repeat).toBeUndefined()
    expect(handle.written).toHaveLength(1)
    expect(
      (await unpackZip(await bytesOf(handle.written[0]), undefined, PASSWORD))
        ?.encrypted
    ).toBe(true)
  })

  it("writes nothing when the password prompt is cancelled", async () => {
    const handle = fakeHandle(await zipFile(PASSWORD))
    link(handle)
    useBookStore.setState({ encrypted: true })
    typing()

    await saveBook(ctx, "kirjanpito")

    expect(handle.written).toEqual([])
    expect(useBookStore.getState().dirty).toBe(true)
    expect(useBookStore.getState().saving).toBe(false)
  })

  it("asks twice for a new password when there is no file to check", async () => {
    const handle = fakeHandle(await zipFile())
    link(handle)
    useBookStore.setState({ encrypted: true })
    const { asked } = typing(PASSWORD)

    await saveBook(ctx, "kirjanpito")

    expect(asked[0].repeat).toBeDefined()
    const archive = await unpackZip(
      await bytesOf(handle.written[0]),
      undefined,
      PASSWORD
    )
    expect(archive?.encrypted).toBe(true)
  })

  it("encrypts a downloaded copy too", async () => {
    const click = vi.fn()
    const blobs: Blob[] = []
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        blobs.push(blob)
        return "blob:x"
      },
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click)
    useBookStore.setState({ open: true, entries: [sample()], dirty: true })
    useBookStore.setState({ encrypted: true })
    holdPassword(PASSWORD)

    await exportBook(ctx, "kopio")

    expect(blobs).toHaveLength(1)
    await expect(unpackZip(await bytesOf(blobs[0]))).rejects.toThrow()
  })

  it("never writes a plain file from autosave when the password is gone", async () => {
    const handle = fakeHandle(await zipFile(PASSWORD))
    link(handle)
    useBookStore.setState({ encrypted: true, autosave: true })

    expect(await autosaveBook(ctx)).toBe(false)

    expect(handle.written).toEqual([])
    expect(useBookStore.getState().autosavePaused).toBe(true)
  })

  it("autosaves once the password is held", async () => {
    const handle = fakeHandle(await zipFile(PASSWORD))
    link(handle)
    useBookStore.setState({ encrypted: true, autosave: true })
    holdPassword(PASSWORD)

    expect(await autosaveBook(ctx)).toBe(true)

    expect(handle.written).toHaveLength(1)
  })
})

describe("turning encryption on and off", () => {
  it("holds the new password and marks the book dirty", async () => {
    useBookStore.setState({ open: true, dirty: false })
    const { asked } = typing("short", PASSWORD)

    await setBookPassword(ctx)

    // The length floor is checked inside the dialog, like a wrong password.
    expect(asked[0].repeat).toBeDefined()
    const state = useBookStore.getState()
    expect(state.encrypted).toBe(true)
    expect(state.dirty).toBe(true)
    expect(heldPassword()).toBe(PASSWORD)
  })

  it("changes nothing when the prompt is cancelled", async () => {
    useBookStore.setState({ open: true, dirty: false })
    typing()

    await setBookPassword(ctx)

    expect(useBookStore.getState().encrypted).toBe(false)
    expect(useBookStore.getState().dirty).toBe(false)
  })

  it("turns encryption off only after a confirmation", async () => {
    useBookStore.setState({ open: true, encrypted: true, dirty: false })

    registerConfirmHandler(async () => false)
    await removeBookEncryption(ctx)
    expect(useBookStore.getState().encrypted).toBe(true)

    registerConfirmHandler(async () => true)
    await removeBookEncryption(ctx)
    expect(useBookStore.getState().encrypted).toBe(false)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  it("writes a plain file after encryption is turned off", async () => {
    const handle = fakeHandle(await zipFile(PASSWORD))
    link(handle)
    useBookStore.setState({ encrypted: true })
    holdPassword(PASSWORD)
    registerConfirmHandler(async () => true)
    await removeBookEncryption(ctx)

    await saveBook(ctx, "kirjanpito")

    const archive = await unpackZip(await bytesOf(handle.written[0]))
    expect(archive?.encrypted).toBe(false)
  })
})
