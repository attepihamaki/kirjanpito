let requested = false

/**
 * Ask the browser not to evict this site's storage (§12), once per page load.
 * Until a change reaches the file, localStorage and IndexedDB hold the only
 * copy, and a best-effort origin can lose them under disk pressure. Firefox
 * asks the user and Chromium decides by itself, so a refusal changes nothing
 * and is not reported.
 */
export async function requestPersistentStorage(): Promise<void> {
  if (requested) return
  requested = true
  try {
    const storage = navigator.storage
    if (!storage?.persist) return
    if (await storage.persisted?.()) return
    await storage.persist()
  } catch {
    // Storage is blocked here. useStorageWarning already covers that.
  }
}

/** Forget the request, so each test starts from a fresh page load. */
export function resetPersistRequest(): void {
  requested = false
}
