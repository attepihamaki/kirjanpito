import { createStore, del, get, set, type UseStore } from "idb-keyval"

/**
 * Writing back to the file the user opened (§7.5), through the File System
 * Access API.
 *
 * Two facts shape everything here. The pickers exist only on Chromium
 * desktop, and a file taken from `<input type="file">` or a drop carries no
 * handle at all — so a handle is always optional and `isFileHandleSupported`
 * gates every part of the UI that mentions saving. The second: a handle's
 * write permission reverts to "prompt" on reload, and re-granting it needs a
 * user gesture, which is why saving is an explicit action and never automatic.
 */

/** The handle database, kept apart from the receipts one (§12). */
const DB_NAME = "bookkeeping-file"
const STORE_NAME = "handle"
const KEY = "book"

type PermissionDescriptor = { mode: "read" | "readwrite" }

type PickerType = {
  description: string
  accept: Record<string, string[]>
}

declare global {
  /*
   * Neither the permission methods nor the pickers are in lib.dom. They are
   * declared structurally rather than pulled in as a dependency, since this
   * module is the only caller and feature-detects all of them.
   */
  interface FileSystemHandle {
    queryPermission?(d: PermissionDescriptor): Promise<PermissionState>
    requestPermission?(d: PermissionDescriptor): Promise<PermissionState>
  }

  interface Window {
    showOpenFilePicker?(options?: {
      types?: PickerType[]
      multiple?: boolean
      excludeAcceptAllOption?: boolean
    }): Promise<FileSystemFileHandle[]>
    showSaveFilePicker?(options?: {
      suggestedName?: string
      types?: PickerType[]
      excludeAcceptAllOption?: boolean
    }): Promise<FileSystemFileHandle>
  }
}

const CSV_TYPE: PickerType = {
  description: "CSV",
  accept: { "text/csv": [".csv"] },
}
const ZIP_TYPE: PickerType = {
  description: "ZIP",
  accept: { "application/zip": [".zip"] },
}

export function isFileHandleSupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.showOpenFilePicker === "function" &&
      typeof window.showSaveFilePicker === "function"
    )
  } catch {
    return false
  }
}

/**
 * Cancelling a picker throws `AbortError`, which is a normal outcome and not
 * worth a toast. Anything else is a real failure and is rethrown.
 */
function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

/** Null when the user cancelled or the browser has no picker. */
export async function pickFileToOpen(): Promise<FileSystemFileHandle | null> {
  if (!isFileHandleSupported()) return null
  try {
    const [handle] = await window.showOpenFilePicker!({
      types: [{ description: "CSV / ZIP", accept: { ...CSV_TYPE.accept, ...ZIP_TYPE.accept } }],
      multiple: false,
    })
    return handle ?? null
  } catch (error) {
    if (isAbort(error)) return null
    throw error
  }
}

/** Null when the user cancelled or the browser has no picker. */
export async function pickFileToSave(
  suggestedName: string,
  isZip: boolean
): Promise<FileSystemFileHandle | null> {
  if (!isFileHandleSupported()) return null
  try {
    return await window.showSaveFilePicker!({
      suggestedName,
      types: [isZip ? ZIP_TYPE : CSV_TYPE],
    })
  } catch (error) {
    if (isAbort(error)) return null
    throw error
  }
}

/**
 * Ask for write permission, prompting if it has not been granted yet. Must be
 * called from a user gesture, or the browser refuses the prompt outright.
 */
export async function requestWritePermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const descriptor: PermissionDescriptor = { mode: "readwrite" }
  try {
    if ((await handle.queryPermission?.(descriptor)) === "granted") return true
    return (await handle.requestPermission?.(descriptor)) === "granted"
  } catch {
    return false
  }
}

/**
 * Overwrite the file. `createWritable` streams into a swap file that the
 * browser moves into place on `close`, so a failure part-way through leaves
 * the bookkeeping on disk untouched.
 */
export async function writeFile(
  handle: FileSystemFileHandle,
  blob: Blob
): Promise<void> {
  const writable = await handle.createWritable()
  try {
    await writable.write(blob)
  } catch (error) {
    await writable.abort()
    throw error
  }
  await writable.close()
}

/** When the file was last written, as the filesystem sees it. */
export async function lastModified(
  handle: FileSystemFileHandle
): Promise<number> {
  return (await handle.getFile()).lastModified
}

/* -------------------------------------------------------------------------
 * Remembering the handle across reloads
 * ---------------------------------------------------------------------- */

let store: UseStore | null = null

function db(): UseStore {
  if (!store) store = createStore(DB_NAME, STORE_NAME)
  return store
}

/**
 * Handles are structured-cloneable, so IndexedDB can hold one. What it cannot
 * hold is the permission: a recalled handle starts at "prompt" and the next
 * save is what asks for it back.
 */
export async function rememberHandle(
  handle: FileSystemFileHandle | null
): Promise<void> {
  try {
    if (handle) await set(KEY, handle, db())
    else await del(KEY, db())
  } catch {
    // The link is a convenience; losing it only means picking the file again.
  }
}

export async function recallHandle(): Promise<FileSystemFileHandle | null> {
  if (!isFileHandleSupported()) return null
  try {
    return (await get<FileSystemFileHandle>(KEY, db())) ?? null
  } catch {
    return null
  }
}
