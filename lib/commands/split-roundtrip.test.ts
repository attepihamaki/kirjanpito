// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getReceipt } from "@/lib/browser/receipt-store"
import { openFile, saveBook } from "@/lib/commands/io-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Attachment, Entry } from "@/lib/domain/types"
import { unpackZip } from "@/lib/domain/zip"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import type { Ctx } from "@/lib/commands/ctx"

/*
 * A split receipt through the real save and open paths (§8.4): the link, the
 * single stored file and the voucher numbers all have to come back.
 */

/*
 * jsdom's Blob does not survive fake-indexeddb's structured clone in a form
 * JSZip can read, so the store is a map that hands back what it was given.
 */
const stored = new Map<string, Blob | Uint8Array>()
vi.mock("@/lib/browser/receipt-store", async (original) => {
  const actual = await original<typeof import("@/lib/browser/receipt-store")>()
  return {
    ...actual,
    putReceipt: vi.fn(async (id: string, blob: Blob) => {
      stored.set(id, blob)
    }),
    getReceipt: vi.fn(async (id: string) => stored.get(id)),
  }
})

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

const shared: Attachment = {
  id: "a-shared",
  name: "k-rauta.pdf",
  type: "application/pdf",
  size: 9,
}

function part(over: Partial<Entry>): Entry {
  return {
    id: "a",
    voucher: 1,
    date: "2026-03-10",
    description: "K-Rauta",
    type: "expense",
    catId: "333",
    amount: 10_050,
    vatRate: 25.5,
    amountMode: "gross",
    split: "g1",
    atts: [{ ...shared }],
    ...over,
  }
}

function fakeZip() {
  const written: Blob[] = []
  const handle = {
    name: "kirjanpito.zip",
    written,
    lastModified: 1000,
    queryPermission: vi.fn(async () => "granted"),
    requestPermission: vi.fn(async () => "granted"),
    getFile: vi.fn(
      async () =>
        new File([], "kirjanpito.zip", { lastModified: handle.lastModified })
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

beforeEach(() => {
  stored.clear()
  vi.unstubAllGlobals()
  useBookStore.setState(useBookStore.getInitialState())
})

describe("a split receipt through save and open", () => {
  it("keeps the link, the voucher numbers and one stored file", async () => {
    stored.set("a-shared", new TextEncoder().encode("pdf-bytes"))
    const handle = fakeZip()
    useBookStore.setState({
      open: true,
      hydrated: true,
      cats: defaultCategories(),
      entries: [
        part({ id: "a", voucher: 1 }),
        part({
          id: "b",
          voucher: 2,
          catId: "344-meeting",
          amount: 2_500,
          vatRate: 13.5,
          description: "Lounas",
        }),
      ],
      dirty: true,
      fileName: handle.name,
      fileHandle: handle as unknown as FileSystemFileHandle,
      savedAt: handle.lastModified,
    })

    await saveBook(ctx, "kirjanpito")
    expect(handle.written).toHaveLength(1)
    const bytes = new Uint8Array(await handle.written[0].arrayBuffer())

    const archive = (await unpackZip(bytes))!
    expect(archive.otherFiles).toEqual(["liitteet/2026/03/k-rauta.pdf"])

    useBookStore.getState().newBook(2026, "fi")
    expect(useBookStore.getState().entries).toEqual([])
    await openFile(ctx, new File([bytes], "kirjanpito.zip"))

    const entries = useBookStore.getState().entries
    expect(entries).toHaveLength(2)
    const [first, second] = [...entries].sort(
      (x, y) => (x.voucher ?? 0) - (y.voucher ?? 0)
    )
    expect([first.voucher, second.voucher]).toEqual([1, 2])
    expect(first.split).toBeDefined()
    expect(second.split).toBe(first.split)
    expect(first.description).toBe("K-Rauta")
    expect(second.description).toBe("Lounas")

    expect(first.atts?.[0].id).toBeTruthy()
    expect(second.atts?.[0].id).toBe(first.atts?.[0].id)
    const blob = (await getReceipt(first.atts![0].id!)) as Blob
    expect(await blob.text()).toBe("pdf-bytes")
  })
})
