// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { toast } from "@/components/ui/toast"
import type { Ctx } from "@/lib/commands/ctx"
import {
  forgetEarlierSave,
  restoreEarlierSave,
  takeSnapshot,
} from "@/lib/commands/snapshot-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { assignVouchers } from "@/lib/domain/voucher"
import { createAppT } from "@/lib/i18n/messages"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore } from "@/stores/book-store"
import { useSnapshotStore } from "@/stores/snapshot-store"

/* Earlier saves (§8.36), over an in-memory stand-in for IndexedDB. */

const books = new Map<string, unknown>()

vi.mock("@/lib/browser/receipt-store", async (original) => ({
  ...(await original<typeof import("@/lib/browser/receipt-store")>()),
  isReceiptStorageSupported: () => true,
}))

vi.mock("@/lib/browser/file-handle", async (original) => ({
  ...(await original<typeof import("@/lib/browser/file-handle")>()),
  rememberHandle: vi.fn(async () => {}),
}))

vi.mock("@/lib/browser/snapshot-store", async () => {
  const { useSnapshotStore } = await import("@/stores/snapshot-store")
  return {
    loadSnapshotIndex: async () => {
      if (!useSnapshotStore.getState().loaded)
        useSnapshotStore.getState().setMetas([])
      return useSnapshotStore.getState().metas
    },
    putSnapshot: async (
      meta: { id: string },
      book: unknown,
      metas: never[],
      dropped: string[]
    ) => {
      books.set(meta.id, structuredClone(book))
      useSnapshotStore.getState().setMetas(metas)
      for (const id of dropped) books.delete(id)
    },
    getSnapshot: async (id: string) => books.get(id),
    deleteSnapshot: async (id: string, metas: { id: string }[]) => {
      useSnapshotStore
        .getState()
        .setMetas(metas.filter((m) => m.id !== id) as never[])
      books.delete(id)
    },
  }
})

vi.mock("@/lib/ui/confirm", () => ({
  confirm: vi.fn(async () => true),
  choose: vi.fn(async () => "confirm"),
}))

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }
const handle = { name: "kirjanpito.zip" } as FileSystemFileHandle

beforeEach(() => {
  books.clear()
  useSnapshotStore.setState({ loaded: false, metas: [] })
  vi.spyOn(toast, "add").mockImplementation(() => "1")
  const entries = [...assignVouchers(sampleEntries(createIdFactory("u")))]
  entries[0].atts = [
    { id: "att-1", name: "a.pdf", type: "application/pdf", size: 1 },
  ]
  useBookStore.setState({
    open: true,
    hydrated: true,
    demo: false,
    archiveYear: null,
    entries,
    cats: defaultCategories(),
    year: 2026,
    dirty: false,
    fileName: "kirjanpito.zip",
    fileHandle: handle,
    savedAt: 1,
    businessName: "Testi Tmi",
    changeLog: [],
  })
})

describe("takeSnapshot", () => {
  it("keeps the book and the receipts it uses", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    expect(meta).toMatchObject({
      reason: "save",
      fileName: "kirjanpito.zip",
      businessName: "Testi Tmi",
      entries: useBookStore.getState().entries.length,
      attachmentIds: ["att-1"],
    })
    expect(books.has(meta.id)).toBe(true)
  })

  it("takes none of a demo book or an open archive", async () => {
    useBookStore.setState({ demo: true })
    await takeSnapshot("save")
    useBookStore.setState({ demo: false, archiveYear: 2025 })
    await takeSnapshot("save")
    expect(useSnapshotStore.getState().metas).toEqual([])
  })
})

describe("restoreEarlierSave", () => {
  it("brings the book back, keeps the file and logs the change", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    const before = useBookStore.getState().entries
    const gone = before[1]
    useBookStore.getState().removeEntry(gone.id)
    expect(useBookStore.getState().entries).toHaveLength(before.length - 1)

    expect(await restoreEarlierSave(ctx, meta, "11.11.2026 12.00")).toBe(true)

    const s = useBookStore.getState()
    expect(s.entries.map((e) => e.id).sort()).toEqual(
      before.map((e) => e.id).sort()
    )
    expect(s.dirty).toBe(true)
    expect(s.fileHandle).toBe(handle)
    expect(s.changeLog.map((r) => r.action)).toEqual(["delete", "restore"])
    expect(s.changeLog[1].entryId).toBe(gone.id)
    /* The state before the restore is kept, so it can be undone. */
    expect(useSnapshotStore.getState().metas.map((m) => m.reason)).toEqual([
      "restore",
      "save",
    ])
  })

  it("unlinks the open file when the save is of another one", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    useBookStore.setState({ fileName: "toinen.zip" })
    expect(await restoreEarlierSave(ctx, meta, "x")).toBe(true)
    const s = useBookStore.getState()
    expect(s.fileName).toBe("kirjanpito.zip")
    expect(s.fileHandle).toBeNull()
    expect(s.savedAt).toBeNull()
  })

  it("does nothing when the user cancels", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    const entries = useBookStore.getState().entries
    vi.mocked(confirm).mockResolvedValueOnce(false)
    expect(await restoreEarlierSave(ctx, meta, "x")).toBe(false)
    expect(useBookStore.getState().entries).toBe(entries)
    expect(useSnapshotStore.getState().metas).toHaveLength(1)
  })

  it("stops when the current book cannot be kept first", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    const store = await import("@/lib/browser/snapshot-store")
    vi.spyOn(store, "putSnapshot").mockRejectedValueOnce(new Error("full"))
    const entries = useBookStore.getState().entries
    expect(await restoreEarlierSave(ctx, meta, "x")).toBe(false)
    expect(useBookStore.getState().entries).toBe(entries)
  })

  it("is refused while an archive is open", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    useBookStore.setState({ archiveYear: 2025 })
    expect(await restoreEarlierSave(ctx, meta, "x")).toBe(false)
  })
})

describe("forgetEarlierSave", () => {
  it("removes the save from the list", async () => {
    await takeSnapshot("save")
    const [meta] = useSnapshotStore.getState().metas
    await forgetEarlierSave(ctx, meta)
    expect(useSnapshotStore.getState().metas).toEqual([])
    expect(books.has(meta.id)).toBe(false)
  })
})
