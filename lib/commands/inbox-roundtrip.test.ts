// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getReceipt } from "@/lib/browser/receipt-store"
import { buildBookFile, openFile } from "@/lib/commands/io-commands"
import { defaultCategories } from "@/lib/domain/accounts"
import { unpackZip } from "@/lib/domain/zip"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import type { Ctx } from "@/lib/commands/ctx"

/* The same in-memory receipt store as the other round-trip tests. */
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

beforeEach(() => {
  stored.clear()
  useBookStore.setState(useBookStore.getInitialState())
})

describe("the inbox through save and open (§8.31)", () => {
  it("writes the files and their list, and reads both back", async () => {
    stored.set("a-in", new TextEncoder().encode("pdf-bytes"))
    useBookStore.setState({
      open: true,
      hydrated: true,
      cats: defaultCategories(),
      entries: [],
      inbox: [
        {
          id: "a-in",
          name: "lasku.pdf",
          type: "application/pdf",
          size: 9,
          added: "2026-11-10",
          guess: { date: "2026-11-02", amount: 12550, vendor: "Nurmi" },
        },
      ],
    })

    const file = await buildBookFile("kirjanpito")
    const bytes = new Uint8Array(await file.blob.arrayBuffer())
    const archive = (await unpackZip(bytes))!
    expect(archive.otherFiles).toEqual(["saapuneet/lasku.pdf"])
    expect(JSON.parse(archive.settingsText!).inbox).toEqual([
      {
        name: "lasku.pdf",
        type: "application/pdf",
        size: 9,
        added: "2026-11-10",
        guess: { date: "2026-11-02", amount: 12550, vendor: "Nurmi" },
        path: "saapuneet/lasku.pdf",
      },
    ])

    useBookStore.getState().newBook(2026, "fi")
    expect(useBookStore.getState().inbox).toEqual([])
    await openFile(ctx, new File([bytes], "kirjanpito.zip"))

    const [item] = useBookStore.getState().inbox
    expect(item).toMatchObject({ name: "lasku.pdf", added: "2026-11-10" })
    expect(item.guess?.amount).toBe(12550)
    const blob = (await getReceipt(item.id)) as Blob
    expect(await blob.text()).toBe("pdf-bytes")
  })

  it("writes no inbox into a file of some entries only", async () => {
    stored.set("a-in", new TextEncoder().encode("x"))
    useBookStore.setState({
      open: true,
      hydrated: true,
      inbox: [
        {
          id: "a-in",
          name: "kuva.jpg",
          type: "image/jpeg",
          size: 1,
          added: "2026-11-10",
        },
      ],
    })
    const file = await buildBookFile("osa", null, { entries: [], settings: {} })
    const archive = (await unpackZip(
      new Uint8Array(await file.blob.arrayBuffer())
    ))!
    expect(archive.otherFiles).toEqual([])
    expect(JSON.parse(archive.settingsText!).inbox).toBeUndefined()
  })
})
