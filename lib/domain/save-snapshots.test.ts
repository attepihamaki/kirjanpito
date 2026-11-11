import { describe, expect, it } from "vitest"

import {
  addSnapshot,
  parseSnapshotIndex,
  replacesNewest,
  snapshotAttachmentIds,
  snapshotsToKeep,
  SNAPSHOT_KEEP_RECENT,
  type SnapshotMeta,
} from "@/lib/domain/save-snapshots"

const meta = (
  id: string,
  at: string,
  over: Partial<SnapshotMeta> = {}
): SnapshotMeta => ({
  id,
  at,
  reason: "save",
  fileName: "kirjanpito.zip",
  businessName: null,
  entries: 1,
  attachmentIds: [],
  ...over,
})

const NOW = new Date("2026-11-11T12:00:00+02:00")

describe("snapshotsToKeep", () => {
  it("keeps the newest ones whatever their age", () => {
    const old = Array.from({ length: 12 }, (_, i) =>
      meta(`m${i}`, `2025-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`)
    )
    const keep = snapshotsToKeep(old, NOW)
    expect(keep.size).toBe(SNAPSHOT_KEEP_RECENT)
    expect(keep.has("m11")).toBe(true)
    expect(keep.has("m0")).toBe(false)
  })

  it("keeps the last of each recent day beyond the newest ones", () => {
    const sameDay = Array.from({ length: 12 }, (_, i) =>
      meta(
        `d${i}`,
        `2026-11-11T0${Math.floor(i / 2)}:${i % 2 ? "30" : "00"}:00Z`
      )
    )
    const earlier = [
      meta("a", "2026-11-01T08:00:00Z"),
      meta("b", "2026-11-01T09:00:00Z"),
      meta("c", "2026-09-01T09:00:00Z"),
    ]
    const keep = snapshotsToKeep([...sameDay, ...earlier], NOW)
    expect(keep.has("b")).toBe(true)
    expect(keep.has("a")).toBe(false)
    expect(keep.has("c")).toBe(false)
  })
})

describe("replacesNewest", () => {
  const auto = meta("x", "2026-11-11T10:00:00Z", { reason: "autosave" })

  it("merges autosaves of one file a few minutes apart", () => {
    expect(
      replacesNewest(auto, {
        at: "2026-11-11T10:10:00Z",
        reason: "autosave",
        fileName: "kirjanpito.zip",
      })
    ).toBe(true)
  })

  it("keeps a manual save, a later autosave and another file", () => {
    expect(
      replacesNewest(auto, {
        at: "2026-11-11T10:05:00Z",
        reason: "save",
        fileName: "kirjanpito.zip",
      })
    ).toBe(false)
    expect(
      replacesNewest(auto, {
        at: "2026-11-11T10:30:00Z",
        reason: "autosave",
        fileName: "kirjanpito.zip",
      })
    ).toBe(false)
    expect(
      replacesNewest(auto, {
        at: "2026-11-11T10:05:00Z",
        reason: "autosave",
        fileName: "toinen.zip",
      })
    ).toBe(false)
    expect(
      replacesNewest(meta("s", "2026-11-11T10:00:00Z"), {
        at: "2026-11-11T10:05:00Z",
        reason: "autosave",
        fileName: "kirjanpito.zip",
      })
    ).toBe(false)
  })
})

describe("addSnapshot", () => {
  it("puts the new one first and says which books to delete", () => {
    const auto = meta("x", "2026-11-11T09:00:00Z", { reason: "autosave" })
    const next = meta("y", "2026-11-11T09:05:00Z", { reason: "autosave" })
    const out = addSnapshot([auto], next, NOW)
    expect(out.metas.map((m) => m.id)).toEqual(["y"])
    expect(out.dropped).toEqual(["x"])
  })

  it("drops what the thinning leaves out", () => {
    const old = Array.from({ length: SNAPSHOT_KEEP_RECENT }, (_, i) =>
      meta(`o${i}`, `2025-0${(i % 9) + 1}-01T10:00:00Z`)
    )
    const out = addSnapshot(old, meta("n", "2026-11-11T09:00:00Z"), NOW)
    expect(out.metas).toHaveLength(SNAPSHOT_KEEP_RECENT)
    expect(out.metas[0].id).toBe("n")
    expect(out.dropped).toHaveLength(1)
  })
})

describe("snapshotAttachmentIds and parseSnapshotIndex", () => {
  it("collects every receipt and reads back only well-formed entries", () => {
    const a = meta("a", "2026-11-11T09:00:00Z", { attachmentIds: ["r1", "r2"] })
    const b = meta("b", "2026-11-11T10:00:00Z", { attachmentIds: ["r2", "r3"] })
    expect([...snapshotAttachmentIds([a, b])].sort()).toEqual([
      "r1",
      "r2",
      "r3",
    ])
    expect(
      parseSnapshotIndex([
        a,
        { ...b, reason: "nope" },
        { id: "c", at: "not a date", reason: "save" },
        null,
      ])
    ).toEqual([a])
    expect(parseSnapshotIndex("x")).toEqual([])
  })
})
