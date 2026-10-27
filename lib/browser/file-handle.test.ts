import { describe, expect, it } from "vitest"

import { dropHandles } from "@/lib/browser/file-handle"

/* A drop's items, as a Chromium browser hands them over (§7.5). */
function items(
  entries: Array<{ kind: string; handle?: unknown; throws?: boolean }>
): DataTransferItemList {
  return entries.map((e) => ({
    kind: e.kind,
    getAsFileSystemHandle:
      e.handle === undefined && !e.throws
        ? undefined
        : () => {
            if (e.throws) throw new Error("gone")
            return Promise.resolve(e.handle)
          },
  })) as unknown as DataTransferItemList
}

const file = (name: string) => ({ name }) as File

describe("dropHandles", () => {
  it("finds the handle of each dropped file by name", async () => {
    const handle = { kind: "file", name: "kirjanpito.zip" }
    const handleFor = dropHandles(
      items([{ kind: "string" }, { kind: "file", handle }])
    )
    expect(await handleFor(file("kirjanpito.zip"))).toBe(handle)
    expect(await handleFor(file("muu.zip"))).toBeNull()
  })

  it("gives null where the browser has no handles", async () => {
    expect(
      await dropHandles(items([{ kind: "file" }]))(file("a.zip"))
    ).toBeNull()
    expect(await dropHandles(undefined)(file("a.zip"))).toBeNull()
  })

  it("gives null for a folder or a failed lookup", async () => {
    const handleFor = dropHandles(
      items([
        { kind: "file", handle: { kind: "directory", name: "a.zip" } },
        { kind: "file", throws: true },
      ])
    )
    expect(await handleFor(file("a.zip"))).toBeNull()
  })
})
