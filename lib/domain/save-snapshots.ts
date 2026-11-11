/**
 * Earlier saves kept in the browser (§8.36). Pure: which snapshots to keep,
 * when a new one replaces the newest, and which receipts they still need.
 * The bytes live in IndexedDB (`lib/browser/snapshot-store.ts`).
 */

/** Why a snapshot was taken. `restore` is the book as it was just before a restore. */
export type SnapshotReason = "open" | "save" | "autosave" | "restore"

const SNAPSHOT_REASONS: readonly SnapshotReason[] = [
  "open",
  "save",
  "autosave",
  "restore",
]

/** What the list shows about a snapshot, without loading the book itself. */
export interface SnapshotMeta {
  id: string
  /** ISO timestamp. */
  at: string
  reason: SnapshotReason
  fileName: string | null
  businessName: string | null
  /** How many entries the book held. */
  entries: number
  /** The stored receipts it refers to, kept out of the receipt sweep (§7.4). */
  attachmentIds: string[]
}

/** The newest snapshots kept whatever their age. */
export const SNAPSHOT_KEEP_RECENT = 10

/** Days back for which the last snapshot of each day is kept as well. */
export const SNAPSHOT_KEEP_DAYS = 30

/** An autosave this soon after another of the same file replaces it rather than adding one. */
const AUTOSAVE_MERGE_MINUTES = 15

const DAY_MS = 24 * 60 * 60 * 1000

/** The local calendar day of an ISO timestamp, as `YYYY-MM-DD`. */
function localDay(at: string): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Newest first, the order the list and the rules below read them in. */
export function sortSnapshots(metas: readonly SnapshotMeta[]): SnapshotMeta[] {
  return [...metas].sort((a, b) => b.at.localeCompare(a.at))
}

/**
 * The ids to keep: the newest `SNAPSHOT_KEEP_RECENT`, and the newest of each
 * day in the last `SNAPSHOT_KEEP_DAYS` days. A busy day thins to its last
 * save, and a month later only the recent ones are left.
 */
export function snapshotsToKeep(
  metas: readonly SnapshotMeta[],
  now: Date
): Set<string> {
  const sorted = sortSnapshots(metas)
  const keep = new Set(sorted.slice(0, SNAPSHOT_KEEP_RECENT).map((m) => m.id))
  const since = now.getTime() - SNAPSHOT_KEEP_DAYS * DAY_MS
  const days = new Set<string>()
  for (const m of sorted) {
    if (new Date(m.at).getTime() < since) continue
    const day = localDay(m.at)
    if (days.has(day)) continue
    days.add(day)
    keep.add(m.id)
  }
  return keep
}

/**
 * Whether a new snapshot takes the place of the newest one. Autosave writes
 * often, so an autosave of the same file within `AUTOSAVE_MERGE_MINUTES` of
 * another autosave replaces it. Anything the user did by hand is kept.
 */
export function replacesNewest(
  newest: SnapshotMeta | undefined,
  next: Pick<SnapshotMeta, "at" | "reason" | "fileName">
): boolean {
  if (!newest || next.reason !== "autosave" || newest.reason !== "autosave") {
    return false
  }
  if (newest.fileName !== next.fileName) return false
  const gap = new Date(next.at).getTime() - new Date(newest.at).getTime()
  return gap >= 0 && gap < AUTOSAVE_MERGE_MINUTES * 60 * 1000
}

/**
 * The index after adding `next`: the newest replaced when `replacesNewest`
 * says so, then thinned by `snapshotsToKeep`. `dropped` are the ids whose
 * stored book can be deleted.
 */
export function addSnapshot(
  metas: readonly SnapshotMeta[],
  next: SnapshotMeta,
  now: Date
): { metas: SnapshotMeta[]; dropped: string[] } {
  const sorted = sortSnapshots(metas)
  const replaced = replacesNewest(sorted[0], next) ? [sorted[0].id] : []
  const all = [next, ...sorted.filter((m) => !replaced.includes(m.id))]
  const keep = snapshotsToKeep(all, now)
  return {
    metas: all.filter((m) => keep.has(m.id)),
    dropped: [
      ...replaced,
      ...all.filter((m) => !keep.has(m.id)).map((m) => m.id),
    ],
  }
}

/** Every stored receipt some snapshot refers to. */
export function snapshotAttachmentIds(
  metas: readonly SnapshotMeta[]
): Set<string> {
  return new Set(metas.flatMap((m) => m.attachmentIds))
}

/** An index read back from storage, with anything malformed left out. */
export function parseSnapshotIndex(value: unknown): SnapshotMeta[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((m): SnapshotMeta[] => {
    if (typeof m !== "object" || m === null) return []
    const r = m as Record<string, unknown>
    if (typeof r.id !== "string" || typeof r.at !== "string") return []
    if (!SNAPSHOT_REASONS.includes(r.reason as SnapshotReason)) return []
    if (Number.isNaN(new Date(r.at).getTime())) return []
    return [
      {
        id: r.id,
        at: r.at,
        reason: r.reason as SnapshotReason,
        fileName: typeof r.fileName === "string" ? r.fileName : null,
        businessName:
          typeof r.businessName === "string" ? r.businessName : null,
        entries: typeof r.entries === "number" ? r.entries : 0,
        attachmentIds: Array.isArray(r.attachmentIds)
          ? r.attachmentIds.filter((a): a is string => typeof a === "string")
          : [],
      },
    ]
  })
}
