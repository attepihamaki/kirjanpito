import type { Entry } from "@/lib/domain/types"

/**
 * Every receipt id that must survive garbage collection.
 *
 * `draftAttachmentIds` is load-bearing: receipts freshly attached in an open
 * entry dialog belong to no saved entry yet, so a sweep triggered by some
 * other action would delete them out from under the user.
 */
export function collectLiveIds(
  entries: readonly Entry[],
  draftAttachmentIds: readonly string[] = []
): Set<string> {
  const live = new Set<string>(draftAttachmentIds)
  for (const entry of entries) {
    for (const att of entry.atts ?? []) {
      if (att.id) live.add(att.id)
    }
  }
  return live
}
