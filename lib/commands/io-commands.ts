import { toast } from "@/components/ui/toast"
import type { DateRange } from "@/lib/domain/books"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import { NO_PAY_MONTHS } from "@/lib/domain/tax-calendar"

import { releaseAllObjectUrls } from "@/lib/browser/object-urls"
import { fileToUint8Array, saveBlob } from "@/lib/browser/download"
import {
  hasWritePermission,
  isFileHandleSupported,
  lastModified,
  pickFileToOpen,
  pickFileToSave,
  recallHandle,
  rememberHandle,
  requestWritePermission,
  writeFile,
} from "@/lib/browser/file-handle"
import {
  getReceipt,
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { readStoredTheme } from "@/lib/browser/theme"
import {
  decodeCsv,
  parseCsv,
  serializeCsv,
  type ImportSuccess,
} from "@/lib/domain/csv"
import { parseBankCsv } from "@/lib/domain/bank-csv"
import { csvColumnLabel, csvHeaderLine } from "@/lib/domain/csv-header"
import { uid } from "@/lib/domain/id"
import {
  CSV_FILE_NAME,
  attachmentKey,
  buildReceiptPaths,
  cleanFileName,
  defaultFileBaseName,
  mimeForName,
} from "@/lib/domain/receipt-path"
import {
  indexCategories,
  type Attachment,
  type Entry,
  type Lang,
} from "@/lib/domain/types"
import { checkIntegrity, sealSettings } from "@/lib/domain/integrity"
import {
  parseCustomers,
  parseInvoices,
  serializeCustomers,
  serializeInvoices,
} from "@/lib/domain/invoice-file"
import type { Customer, Invoice } from "@/lib/domain/invoice"
import { invoicesOfEntries } from "@/lib/domain/invoice-calc"
import {
  parseSettings,
  serializeSettings,
  type BookSettings,
  type ParsedSettings,
} from "@/lib/domain/settings-file"
import {
  archiveBlockers,
  archiveContents,
  movableEntries,
  rolledOpenings,
  type ArchiveBlocker,
} from "@/lib/domain/year-archive"
import { normalizeLayout } from "@/lib/domain/overview-layout"
import {
  ZipEntryTooLargeError,
  ZipPasswordRequiredError,
  ZipWrongPasswordError,
  packZip,
  receiptReader,
  unpackZip,
  type UnpackedZip,
} from "@/lib/domain/zip"
import { SKIP_CODE_KEYS } from "@/lib/i18n/messages"
import { APP_ROUTES } from "@/lib/site"
import { alertDialog, choose, confirm } from "@/lib/ui/confirm"
import { askPassword } from "@/lib/ui/password-prompt"
import { heldPassword, holdPassword } from "@/lib/commands/book-password"
import { askNewPassword } from "@/lib/commands/encryption-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { guardDirty, refuseIfOpenElsewhere } from "@/lib/commands/book-commands"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

/**
 * Commands that read or write a bookkeeping file. Imported lazily from the
 * landing page so jszip and papaparse stay out of its bundle.
 */

const ZIP_MIME = "application/zip"

/* -------------------------------------------------------------------------
 * Import
 * ---------------------------------------------------------------------- */

function importSummary(
  ctx: Ctx,
  result: ImportSuccess,
  receipts: {
    imported: number
    missing: number
  },
  settings: ParsedSettings | null
): string {
  const rejected = result.rejectedReceiptCount
  let text = ctx.t("io.imported", { n: result.entries.length })
  if (result.newCategoryCount) {
    text += ctx.t("io.newCategories", { n: result.newCategoryCount })
  }
  if (receipts.imported) {
    text += ctx.t("io.receiptsImported", { n: receipts.imported })
  }
  if (receipts.missing) {
    text += ctx.t("io.receiptsMissing", { n: receipts.missing })
  }
  if (rejected) {
    text += ctx.t("io.receiptsRejected", { n: rejected })
  }
  /*
   * A column this app does not know was not read, so say which: a file from
   * some other shape would otherwise lose it without a word.
   */
  const unknown = result.warnings.find((w) => w.code === "unknown-columns")
  if (unknown) {
    text += ctx.t("io.unknownColumns", {
      n: unknown.columns.length,
      c: unknown.columns.join(", "),
    })
  }
  const dissolved = result.warnings.find((w) => w.code === "split-dissolved")
  if (dissolved) text += ctx.t("io.splitDissolved", { n: dissolved.rows })
  const unlinked = result.warnings.find((w) => w.code === "reverses-dissolved")
  if (unlinked) text += ctx.t("io.reversesDissolved", { n: unlinked.rows })
  const unsold = result.warnings.find((w) => w.code === "sells-dissolved")
  if (unsold) text += ctx.t("io.sellsDissolved", { n: unsold.rows })
  if (result.skipped.length) {
    const first = result.skipped
      .slice(0, 3)
      .map((s) =>
        ctx.t("io.rowError", {
          n: s.line,
          /*
           * SKIP_CODE_KEYS is the map a test walks to prove every domain
           * code can be shown, so the keys are not spelled out again here.
           */
          f: ctx.t(SKIP_CODE_KEYS[s.code]),
        })
      )
      .join(", ")
    text += ctx.t("io.skipped", { n: result.skipped.length, e: first })
  }
  if (settings?.fromNewerVersion) text += ctx.t("io.settingsNewer")
  return text
}

/**
 * Open a CSV or ZIP the user picked or dropped.
 *
 * `handle` is the file it can later be saved back to (§7.5), and is null for
 * a drop or an `<input type="file">` pick, neither of which yields one.
 */
export async function openFile(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null = null
): Promise<void> {
  /*
   * A second file dropped while the first is still being unpacked would
   * interleave two `replaceBook` calls and leave a mixed bookkeeping.
   */
  if (useBookStore.getState().importing) return
  if (await refuseIfOpenElsewhere(ctx)) return

  const isZip =
    file.name.toLowerCase().endsWith(".zip") || file.type === ZIP_MIME
  // Before the unsaved-changes prompt: a statement replaces nothing.
  if (!isZip && (await claimBankStatement(ctx, file))) return
  if (!(await guardDirty(ctx, true))) return

  /*
   * The UI shows nothing for the first few hundred milliseconds (see
   * `useDelayedFlag`), so a CSV still opens without a flicker.
   */
  useBookStore.getState().setImporting(true)
  try {
    const opened = isZip
      ? await importZip(ctx, file, handle)
      : await importCsv(ctx, file, handle)
    /*
     * Only a file that actually became the open bookkeeping is remembered;
     * a rejected CSV must not leave the previous book pointing at it.
     */
    if (opened) await rememberHandle(handle)
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.readFailed") })
  } finally {
    useBookStore.getState().setImporting(false)
  }
}

/**
 * Open through the file picker, which — unlike an `<input type="file">` —
 * hands back a handle the bookkeeping can be saved to. Falls back to null so
 * the caller can open its own input on browsers without the picker.
 */
export async function pickAndOpenFile(ctx: Ctx): Promise<boolean> {
  if (!isFileHandleSupported()) return false
  let handle: FileSystemFileHandle | null = null
  try {
    handle = await pickFileToOpen()
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.readFailed") })
    return true
  }
  // Cancelling the picker is a normal outcome, and still "handled".
  if (handle) await openFile(ctx, await handle.getFile(), handle)
  return true
}

/** Put back the link to the file this bookkeeping came from, after a reload. */
export async function restoreFileHandle(): Promise<void> {
  const handle = await recallHandle()
  if (!handle) return
  const state = useBookStore.getState()
  // A bookkeeping that is no longer open has no file behind it.
  if (!state.open || state.fileHandle) return
  useBookStore.setState({ fileHandle: handle })
}

async function importCsv(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null
): Promise<boolean> {
  const text = decodeCsv(await fileToUint8Array(file))
  const result = parseCsv(text, useBookStore.getState().cats, uid)
  if (!result.ok) {
    await refuseFile(ctx, failureMessage(ctx, result))
    return false
  }

  /*
   * §7.2: paths in a plain CSV become missing attachments that keep the path,
   * so re-exporting does not lose the reference.
   */
  let missing = 0
  const entries: Entry[] = result.entries.map(({ paths, ...entry }) => {
    missing += paths.length
    return {
      ...entry,
      ...(paths.length ? { atts: paths.map(missingAttachment) } : {}),
    }
  })

  applyImport(
    ctx,
    file,
    handle,
    result,
    entries,
    { imported: 0, missing },
    null,
    { encrypted: false }
  )
  return true
}

async function importZip(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null
): Promise<boolean> {
  const data = await fileToUint8Array(file)
  let unpacked: UnpackedZip | null
  let password: string | undefined
  try {
    unpacked = await unpackZip(data)
  } catch (error) {
    if (error instanceof ZipPasswordRequiredError) {
      const unlocked = await unlockZip(ctx, file.name, data)
      // Cancelling is a normal outcome and opens nothing.
      if (!unlocked) return false
      unpacked = unlocked.unpacked
      password = unlocked.password
    } else if (error instanceof ZipEntryTooLargeError) {
      await refuseFile(ctx, ctx.t("io.zipTooLarge"))
      return false
    } else throw error
  }
  if (!unpacked) {
    await refuseFile(ctx, ctx.t("io.zipNoCsv"))
    return false
  }

  const settings = unpacked.settingsText
    ? parseSettings(unpacked.settingsText)
    : null
  /*
   * The file's own categories are the base the CSV is matched against, so a
   * custom category comes back with its id, line and rate rather than being
   * recreated from its name (§7.6).
   */
  const result = parseCsv(
    unpacked.csvText,
    settings?.categories ?? useBookStore.getState().cats,
    uid
  )
  if (!result.ok) {
    await refuseFile(ctx, failureMessage(ctx, result))
    return false
  }

  const canStore = isReceiptStorageSupported()
  let imported = 0
  let missing = 0

  const entries: Entry[] = []
  /* A path two entries list is stored once and both point at the same blob. */
  const stored = new Map<string, Attachment>()
  for (const { paths, ...entry } of result.entries) {
    const atts: Attachment[] = []
    for (const path of paths) {
      const seen = stored.get(path)
      if (seen) {
        atts.push({ ...seen })
        continue
      }
      const bytes = canStore ? await unpacked.readReceipt(path) : null
      if (!bytes) {
        missing += 1
        atts.push(missingAttachment(path))
        continue
      }
      const id = `a-${uid()}`
      const name = path.split("/").pop() ?? path
      /*
       * A ZIP entry carries no MIME type, so it is derived from the name —
       * one of the image or PDF types, since `parseCsv` admits no other path.
       */
      const type = mimeForName(name)
      const blob = new Blob([bytes as BlobPart], { type })
      try {
        await putReceipt(id, blob)
        const att: Attachment = { id, name, type, size: blob.size }
        stored.set(path, att)
        atts.push(att)
        imported += 1
      } catch {
        missing += 1
        atts.push(missingAttachment(path))
      }
    }
    entries.push({ ...entry, ...(atts.length ? { atts } : {}) })
  }

  const invoiceRecords = unpacked.invoicesText
    ? parseInvoices(unpacked.invoicesText)
    : { invoices: [], skipped: 0 }
  const customerRecords = unpacked.customersText
    ? parseCustomers(unpacked.customersText)
    : { customers: [], skipped: 0 }

  applyImport(
    ctx,
    file,
    handle,
    result,
    entries,
    { imported, missing },
    settings,
    {
      encrypted: unpacked.encrypted,
      password,
      invoices: invoiceRecords.invoices,
      customers: customerRecords.customers,
    }
  )
  const skippedRecords = invoiceRecords.skipped + customerRecords.skipped
  if (skippedRecords > 0) {
    await alertDialog({
      title: ctx.t("io.skippedRecordsTitle"),
      message: ctx.t("io.skippedRecords", { n: skippedRecords }),
      closeLabel: ctx.t("common.close"),
    })
  }
  await reportEdits(
    ctx,
    await checkIntegrity(unpacked.csvText, unpacked.settingsText, {
      invoices: unpacked.invoicesText,
      customers: unpacked.customersText,
    })
  )
  return true
}

/**
 * Tell the user that the file was changed outside the app (§7.9). The book is
 * already open: the edit may be intended, so the dialog informs and blocks
 * nothing. The log gets a record, and the next save writes a fresh seal.
 */
async function reportEdits(
  ctx: Ctx,
  result: Awaited<ReturnType<typeof checkIntegrity>>
): Promise<void> {
  if (result.status !== "edited") return
  useBookStore.setState((s) => ({
    changeLog: [
      ...s.changeLog,
      { at: new Date().toISOString(), action: "external-edit" },
    ],
  }))
  const parts = [
    result.csv ? ctx.t("io.editedEntries") : null,
    result.settings ? ctx.t("io.editedSettings") : null,
    result.invoices ? ctx.t("io.editedInvoices") : null,
    result.customers ? ctx.t("io.editedCustomers") : null,
  ].filter((p): p is string => p !== null)
  await alertDialog({
    title: ctx.t("io.editedTitle"),
    message: ctx.t("io.edited", { parts: parts.join(" ") }),
    closeLabel: ctx.t("common.close"),
  })
}

/**
 * Ask for the password of an encrypted archive until it fits or the user gives
 * up (§7.8). The check runs inside the dialog, so a wrong password shows its
 * message and keeps the dialog open. Returns null when the user cancels.
 */
async function unlockZip(
  ctx: Ctx,
  name: string,
  data: Uint8Array
): Promise<{ unpacked: UnpackedZip | null; password: string } | null> {
  let unpacked: UnpackedZip | null = null
  /*
   * The import overlay would sit over the dialog and the user is deciding, not
   * waiting, so the busy flag is down while the question is open.
   */
  const store = useBookStore.getState()
  store.setImporting(false)
  try {
    const password = await askPassword({
      title: ctx.t("io.passwordTitle"),
      message: ctx.t("io.passwordOpenMessage", { f: name }),
      fieldLabel: ctx.t("io.passwordLabel"),
      confirmLabel: ctx.t("io.passwordOpen"),
      cancelLabel: ctx.t("common.cancel"),
      verify: async (candidate) => {
        try {
          unpacked = await unpackZip(data, undefined, candidate)
          return null
        } catch (error) {
          if (error instanceof ZipWrongPasswordError) {
            return ctx.t("io.passwordWrong")
          }
          if (error instanceof ZipEntryTooLargeError) {
            return ctx.t("io.zipTooLarge")
          }
          console.error(error)
          return ctx.t("io.readFailed")
        }
      },
    })
    return password === null ? null : { unpacked, password }
  } finally {
    useBookStore.getState().setImporting(true)
  }
}

function missingAttachment(path: string): Attachment {
  return {
    id: null,
    name: path.split("/").pop() ?? path,
    type: "",
    size: 0,
    missing: true,
    path,
  }
}

/**
 * Nothing was imported, so the user has to read why: a dialog rather than a
 * toast, which is easy to miss and carries an explanation badly (§8).
 */
function refuseFile(ctx: Ctx, title: string): Promise<void> {
  return alertDialog({
    title: ctx.t("io.notOpened"),
    message: title,
    closeLabel: ctx.t("common.close"),
  })
}

/**
 * A CSV that is a bank statement and no bookkeeping (§8.16). With a book open
 * it goes to the review list on the ledger; with none there is nothing to
 * match it against, so the user is told what to do. True when the file was
 * dealt with, so the caller opens nothing.
 */
async function claimBankStatement(ctx: Ctx, file: File): Promise<boolean> {
  const text = decodeCsv(await fileToUint8Array(file))
  const own = parseCsv(text, useBookStore.getState().cats, uid)
  if (own.ok || own.code !== "not-a-book" || !parseBankCsv(text).ok) {
    return false
  }
  const state = useBookStore.getState()
  if (!state.open) {
    await refuseFile(ctx, ctx.t("bank.needBook"))
    return true
  }
  ctx.navigate(APP_ROUTES.ledger)
  state.openDialog({ kind: "bank-import", text, fileName: file.name })
  return true
}

function failureMessage(
  ctx: Ctx,
  result: Extract<ReturnType<typeof parseCsv>, { ok: false }>
): string {
  if (result.code === "empty-file") return ctx.t("io.fileEmpty")
  if (result.code === "not-a-book") {
    return ctx.t("io.notABook", {
      h: csvHeaderLine(useLangStore.getState().lang),
    })
  }
  if (result.code === "missing-columns") {
    /*
     * The UI language, not the book's: this is a message about a file that
     * has just been refused, so there is no book whose language to follow.
     */
    const lang = useLangStore.getState().lang
    return ctx.t("io.missingColumn", {
      c: result.missing.map((m) => csvColumnLabel(m, lang)).join(", "),
      h: csvHeaderLine(lang),
    })
  }
  return ctx.t("io.noRows", { e: String(result.skipped.length) })
}

function applyImport(
  ctx: Ctx,
  file: File,
  handle: FileSystemFileHandle | null,
  result: ImportSuccess,
  entries: Entry[],
  receipts: { imported: number; missing: number },
  settings: ParsedSettings | null,
  archive: {
    encrypted: boolean
    password?: string
    invoices?: Invoice[]
    customers?: Customer[]
  }
): void {
  releaseAllObjectUrls()
  useBookStore.getState().replaceBook({
    encrypted: archive.encrypted,
    archiveYear: settings?.archiveOf ?? null,
    invoices: archive.invoices,
    customers: archive.customers,
    entries,
    cats: result.categories,
    // The name carries its extension (§7.3).
    fileName: file.name || null,
    fileHandle: handle,
    /*
     * The baseline a later save compares against: anything that moves this
     * timestamp happened outside the app and must not be overwritten blind.
     */
    savedAt: handle ? file.lastModified : null,
    // §7.1: after import the selected year is the latest year in the file.
    year: result.latestYear ?? new Date().getFullYear(),
    // A freshly read file is, by definition, already saved.
    dirty: false,
    settings: settings
      ? {
          exportLang: settings.exportLang,
          businessId: settings.businessId,
          businessName: settings.businessName,
          businessPhone: settings.businessPhone,
          vatPeriod: settings.vatPeriod,
          traderType: settings.traderType,
          hiddenFeatures: settings.hiddenFeatures,
          bookStart: settings.bookStart,
          vatFiled: settings.vatFiled,
          vatFiledFigures: settings.vatFiledFigures,
          taxPayment: settings.taxPayment,
          yearsArchived: settings.yearsArchived,
          form5Filed: settings.form5Filed,
          archives: settings.archives,
          recurring: settings.recurring,
          categoryRules: settings.categoryRules,
          assetOpening: settings.assetOpening,
          bankBalance: settings.bankBalance,
          payMonths: settings.payMonths,
          loanOpening: settings.loanOpening,
          yearEnd: settings.yearEnd,
          invoiceSettings: settings.invoiceSettings,
          changeLog: settings.changeLog,
          overviewLayout: settings.overviewLayout,
          autosave: settings.autosave,
          ledgerSize: settings.pageSize?.ledger,
          ctSize: settings.pageSize?.categories,
        }
      : undefined,
  })
  /* The password belongs to the book just opened, so it is held after the swap. */
  if (archive.password) holdPassword(archive.password)
  /*
   * The language and theme are preferences of the browser as much as of the
   * book (§12), so opening a file switches to them but they never mark it
   * dirty. The landing page goes on using the browser's own key.
   */
  if (settings?.language) useLangStore.getState().setLang(settings.language)
  if (settings?.theme) ctx.setTheme?.(settings.theme)
  toast.add({ title: importSummary(ctx, result, receipts, settings) })
  ctx.navigate(APP_ROUTES.overview)
}

/* -------------------------------------------------------------------------
 * Writing the bookkeeping out
 * ---------------------------------------------------------------------- */

/** The bookkeeping as the bytes of a file, named but not yet anywhere. */
export interface BookFile {
  name: string
  blob: Blob
  /** The state it was built from, to tell whether it is still current. */
  version: BookVersion
  /** Receipts the CSV lists that are not in this file. */
  absentReceipts: number
  /** Those of them this browser was supposed to hold. */
  lostReceipts: number
}

/**
 * Everything whose change marks the book dirty (§8.11). Store actions replace
 * these rather than mutate them, so comparing identities is enough.
 */
function bookVersion() {
  const s = useBookStore.getState()
  return [
    s.entries,
    s.cats,
    s.exportLang,
    s.businessId,
    s.businessName,
    s.businessPhone,
    s.vatPeriod,
    s.traderType,
    s.hiddenFeatures,
    s.bookStart,
    s.vatFiled,
    s.vatFiledFigures,
    s.taxPayment,
    s.yearsArchived,
    s.form5Filed,
    s.archives,
    s.overviewLayout,
    s.recurring,
    s.categoryRules,
    s.assetOpening,
    s.bankBalance,
    s.payMonths,
    s.loanOpening,
    s.yearEnd,
    s.invoiceSettings,
    s.invoices,
    s.customers,
    s.changeLog,
    s.encrypted,
  ] as const
}

type BookVersion = ReturnType<typeof bookVersion>

/**
 * Whether the book has moved on from what was written. Packing and writing
 * take time and leave the UI usable, so a change made meanwhile is not in the
 * file and the book has to stay dirty.
 */
function changedSince(version: BookVersion): boolean {
  return bookVersion().some((part, i) => part !== version[i])
}

/** Everything `settings.json` holds, as the app stands right now (§7.6). */
function currentSettingsText(over: Partial<BookSettings> = {}): string {
  const s = useBookStore.getState()
  return serializeSettings({
    language: useLangStore.getState().lang,
    theme: readStoredTheme(),
    exportLang: s.exportLang,
    businessId: s.businessId,
    businessName: s.businessName,
    businessPhone: s.businessPhone,
    vatPeriod: s.vatPeriod,
    traderType: s.traderType,
    hiddenFeatures: s.hiddenFeatures,
    bookStart: s.bookStart,
    vatFiled: s.vatFiled,
    vatFiledFigures: s.vatFiledFigures,
    taxPayment: s.taxPayment,
    yearsArchived: s.yearsArchived,
    form5Filed: s.form5Filed,
    archives: s.archives,
    archiveOf: s.archiveYear,
    overviewLayout: normalizeLayout(s.overviewLayout),
    autosave: s.autosave,
    encrypted: s.encrypted,
    categories: s.cats,
    pageSize: { ledger: s.ledgerSize, categories: s.ctSize },
    recurring: s.recurring,
    categoryRules: s.categoryRules,
    assetOpening: s.assetOpening,
    bankBalance: s.bankBalance,
    payMonths: s.payMonths,
    loanOpening: s.loanOpening,
    yearEnd: s.yearEnd,
    invoiceSettings: s.invoiceSettings,
    changeLog: s.changeLog,
    ...over,
  })
}

/**
 * Reads receipts out of the ZIP a save is about to replace, so one this browser
 * does not hold stays in the file (§7.5): it may have run out of room when the
 * file was opened. The file is read only if a receipt turns out to need it.
 */
function carryFrom(
  source: FileSystemFileHandle | null
): ((path: string) => Promise<Uint8Array | null>) | undefined {
  if (!source?.name.toLowerCase().endsWith(".zip")) return undefined
  let reader: Promise<(path: string) => Promise<Uint8Array | null>> | undefined
  return async (path) => {
    reader ??= source
      .getFile()
      .then(fileToUint8Array)
      .then((bytes) => receiptReader(bytes, heldPassword() ?? undefined))
      .catch((error: unknown) => {
        // Gone, unreadable or not a ZIP: there is nothing in it to keep.
        console.warn("Could not read the file being replaced", error)
        return async () => null
      })
    return (await reader)(path)
  }
}

/** The ZIP's own name. A name cleaned away falls back to the default (§7.3). */
function bookFileName(baseName: string, lang: Lang): string {
  return `${cleanFileName(baseName) || defaultFileBaseName(lang)}.zip`
}

/** A bookkeeping is a ZIP, because settings.json has to travel with the entries (§7.6). */
export async function buildBookFile(
  baseName: string,
  source: FileSystemFileHandle | null = null,
  /** Write these entries and these settings instead of the open book's (§8.19). */
  only?: { entries: readonly Entry[]; settings: Partial<BookSettings> }
): Promise<BookFile> {
  const { cats, exportLang, encrypted } = useBookStore.getState()
  const entries = only?.entries ?? useBookStore.getState().entries
  const version = bookVersion()
  /*
   * An encrypted book is never written plain because a password is missing:
   * the callers ask first, and this stops anything that did not.
   */
  if (encrypted && !heldPassword()) throw new Error("No password for the book")
  const paths = buildReceiptPaths(entries, exportLang)
  /*
   * Paths are always written, so a CSV taken out of the ZIP still records
   * which receipts existed (§7.1).
   */
  const csvText = serializeCsv(entries, indexCategories(cats), {
    lang: exportLang,
    paths,
  })

  const attachmentIds = new Map<string, string>()
  let absentReceipts = 0
  let lostReceipts = 0
  for (const e of entries) {
    for (const [i, a] of (e.atts ?? []).entries()) {
      if (!a.id) continue
      const key = attachmentKey(e.id, i)
      attachmentIds.set(key, a.id)
      /*
       * A stored file outside the receipt rule (§7.4) has no path, so it stays
       * out of the ZIP. It counts as lost, or it would vanish without a word.
       */
      if (!paths.has(key)) {
        absentReceipts += 1
        lostReceipts += 1
      }
    }
  }
  /* A book with no invoices or customers writes neither file, so it stays as it was. */
  const state = useBookStore.getState()
  const { invoices, customers } = only
    ? invoicesOfEntries(only.entries, state.invoices, state.customers)
    : state
  const invoicesText = invoices.length ? serializeInvoices(invoices) : undefined
  const customersText = customers.length
    ? serializeCustomers(customers)
    : undefined
  const bytes = await packZip({
    csvName: CSV_FILE_NAME[exportLang],
    csvText,
    paths,
    attachmentIds,
    read: async (id) => (await getReceipt(id)) ?? null,
    settingsText: await sealSettings(
      currentSettingsText(only?.settings),
      csvText,
      { invoices: invoicesText, customers: customersText }
    ),
    invoicesText,
    customersText,
    password: encrypted ? (heldPassword() ?? undefined) : undefined,
    carry: carryFrom(source),
    onAbsent: (key) => {
      absentReceipts += 1
      if (attachmentIds.has(key)) lostReceipts += 1
    },
  })
  return {
    name: bookFileName(baseName, exportLang),
    blob: new Blob([bytes as BlobPart], { type: ZIP_MIME }),
    version,
    absentReceipts,
    lostReceipts,
  }
}

/**
 * An encrypted book needs its password before it can be written (§7.8). When
 * this session has none, because the file was opened in an earlier one, it is
 * asked for here. Returns false when the user cancels.
 *
 * Writing with a mistyped password would lock the user out of their own file,
 * so the answer is checked against the file being replaced when that file is
 * encrypted. With no such file there is nothing to check against, so the
 * password is asked twice instead.
 */
export async function ensurePassword(
  ctx: Ctx,
  source: FileSystemFileHandle | null
): Promise<boolean> {
  const state = useBookStore.getState()
  if (!state.encrypted || heldPassword()) return true

  let onDisk: Uint8Array | null = null
  if (source?.name.toLowerCase().endsWith(".zip")) {
    try {
      const bytes = await fileToUint8Array(await source.getFile())
      await unpackZip(bytes)
    } catch (error) {
      // Only an encrypted file gives a password to check against.
      if (error instanceof ZipPasswordRequiredError) {
        onDisk = await fileToUint8Array(await source.getFile())
      }
    }
  }

  let password: string | null
  if (onDisk) {
    const data = onDisk
    password = await askPassword({
      title: ctx.t("io.passwordSaveTitle"),
      message: ctx.t("io.passwordSaveMessage"),
      fieldLabel: ctx.t("io.passwordLabel"),
      confirmLabel: ctx.t("io.passwordSave"),
      cancelLabel: ctx.t("common.cancel"),
      verify: async (candidate) => {
        try {
          await unpackZip(data, undefined, candidate)
          return null
        } catch (error) {
          if (error instanceof ZipWrongPasswordError) {
            return ctx.t("io.passwordWrong")
          }
          console.error(error)
          return ctx.t("io.readFailed")
        }
      },
    })
  } else {
    password = await askNewPassword(ctx)
  }
  if (!password || replacedSince(state.bookEpoch)) return false
  holdPassword(password)
  return true
}

/** The name without its extension, for seeding a picker or a dialog. */
function baseOf(fileName: string): string {
  return fileName.replace(/\.(csv|zip)$/i, "")
}

/**
 * Download a copy (§7.3). This never touches the linked file, so it clears
 * the dirty flag only when there is no linked file to go stale, or the dot
 * would claim the user's bookkeeping was written when it was not.
 */
export async function exportBook(ctx: Ctx, baseName: string): Promise<void> {
  const { entries, dirty, fileHandle } = useBookStore.getState()
  if (!entries.length && !dirty) {
    toast.add({ title: ctx.t("io.nothingToExport") })
    return
  }

  try {
    if (!(await ensurePassword(ctx, fileHandle))) return
    const file = await buildBookFile(baseName, fileHandle)
    if (file.absentReceipts) {
      toast.add({ title: ctx.t("io.receiptsLost", { n: file.absentReceipts }) })
    }
    saveBlob(file.blob, file.name)
    if (!fileHandle) {
      useBookStore.getState().markSaved({
        fileName: file.name,
        dirty: changedSince(file.version),
      })
    }
    toast.add({ title: ctx.t("io.exported", { f: file.name }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.exportFailed") })
  }
}

/**
 * Whether another bookkeeping has taken over since `epoch`. A save leaves the
 * UI usable, so a file can be opened or closed while one is under way. From
 * then on the save must not write the new book into the old file, and must not
 * link the old file to the new book, or the next save would overwrite it.
 */
function replacedSince(epoch: number): boolean {
  return useBookStore.getState().bookEpoch !== epoch
}

/**
 * Write the bookkeeping back to the file it was opened from (§7.5), asking
 * for a file when there is none yet, when its shape has changed, or when it
 * has gone missing. Must be called from a user gesture: both the write
 * permission prompt and the save picker need one.
 *
 * `suggestedBase` seeds the picker in those cases; the caller supplies it
 * because the default name is language-dependent (§7.3).
 */
export async function saveBook(ctx: Ctx, suggestedBase: string): Promise<void> {
  const state = useBookStore.getState()
  if (state.archiveYear !== null) {
    toast.add({ title: ctx.t("io.archiveReadOnly") })
    return
  }
  // A dirty book with no entries still differs from its file: the last one was deleted.
  if (!state.entries.length && !state.dirty) {
    toast.add({ title: ctx.t("io.nothingToExport") })
    return
  }
  if (state.saving) return

  useBookStore.getState().setSaving(true)
  try {
    /*
     * The password comes before the picker: answering the dialog is a fresh
     * user gesture, so the permission prompt and the picker still work.
     */
    if (!(await ensurePassword(ctx, state.fileHandle))) return
    /*
     * The handle comes next. The permission prompt and the save picker both
     * need a recent user gesture, which packing a ZIP of receipts can outlast,
     * and a user who backs out should not have to wait for the packing.
     */
    const base = state.fileName ? baseOf(state.fileName) : suggestedBase
    const handle = await handleToWrite(
      ctx,
      bookFileName(base, state.exportLang)
    )
    if (!handle || replacedSince(state.bookEpoch)) return

    const file = await buildBookFile(base, state.fileHandle)
    if (file.lostReceipts && handle === state.fileHandle) {
      const goAhead = await confirm({
        title: ctx.t("confirm.receiptsLostTitle"),
        message: ctx.t("confirm.receiptsLostMessage", {
          n: file.lostReceipts,
          f: handle.name,
        }),
        confirmLabel: ctx.t("confirm.receiptsLostConfirm"),
        cancelLabel: ctx.t("common.cancel"),
      })
      if (!goAhead) return
    }
    if (replacedSince(state.bookEpoch)) return

    await writeFile(handle, file.blob)
    if (replacedSince(state.bookEpoch)) return
    useBookStore.getState().markSaved({
      fileName: handle.name,
      fileHandle: handle,
      savedAt: await lastModified(handle),
      dirty: changedSince(file.version),
    })
    await rememberHandle(handle)
    // A save that could ask is what autosave was waiting for.
    useBookStore.getState().setAutosavePaused(false)
    toast.add({ title: ctx.t("io.saved", { f: handle.name }) })
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.saveFailed") })
  } finally {
    useBookStore.getState().setSaving(false)
  }
}

/**
 * The handle `saveBook` should write to, or null if the user backed out.
 *
 * A linked file is reused only when it can still take this bookkeeping: the
 * extension has to match its shape, since a book that has grown receipts is a
 * ZIP and cannot be written into a path called `.csv`, and nothing may have
 * touched it since we last read or wrote it.
 */
async function handleToWrite(
  ctx: Ctx,
  zipName: string
): Promise<FileSystemFileHandle | null> {
  const { fileHandle, fileName, savedAt } = useBookStore.getState()
  const pick = () => pickFileToSave(zipName)

  if (!fileHandle) return pick()

  if (!fileHandle.name.toLowerCase().endsWith(".zip")) {
    toast.add({ title: ctx.t("io.shapeChanged", { f: zipName }) })
    return pick()
  }

  if (!(await requestWritePermission(fileHandle))) {
    toast.add({ title: ctx.t("io.saveDenied") })
    return null
  }

  let onDisk: number
  try {
    onDisk = await lastModified(fileHandle)
  } catch {
    // Moved, renamed or deleted since it was opened.
    useBookStore.getState().forgetFileHandle()
    await rememberHandle(null)
    toast.add({ title: ctx.t("io.fileGone") })
    return pick()
  }

  if (savedAt !== null && onDisk !== savedAt) {
    const overwrite = await confirm({
      title: ctx.t("confirm.overwriteTitle"),
      message: ctx.t("confirm.overwriteMessage", {
        f: fileName ?? fileHandle.name,
      }),
      confirmLabel: ctx.t("confirm.overwriteConfirm"),
      cancelLabel: ctx.t("common.cancel"),
    })
    if (!overwrite) return null
  }

  return fileHandle
}

/**
 * Save without asking anything (§7.5): no picker, no permission prompt, no
 * overwrite question. Wherever `saveBook` would have asked, this stops
 * instead and pauses autosave, and the amber dot stays until a manual save.
 * Returns whether it wrote the file.
 */
export async function autosaveBook(ctx: Ctx): Promise<boolean> {
  const state = useBookStore.getState()
  const handle = state.fileHandle
  if (state.archiveYear !== null) return false
  if (!state.autosave || state.autosavePaused || !state.dirty) return false
  if (state.saving || state.importing) return false

  const pause = () => {
    useBookStore.getState().setAutosavePaused(true)
    return false
  }
  if (!handle || !handle.name.toLowerCase().endsWith(".zip")) return pause()
  if (!(await hasWritePermission(handle))) return pause()
  // Nothing unattended asks for a password.
  if (state.encrypted && !heldPassword()) return pause()

  useBookStore.getState().setSaving(true)
  try {
    let onDisk: number
    try {
      onDisk = await lastModified(handle)
    } catch {
      return pause()
    }
    if (state.savedAt !== null && onDisk !== state.savedAt) return pause()
    if (replacedSince(state.bookEpoch)) return false

    const file = await buildBookFile(baseOf(handle.name), handle)
    // A manual save can ask about this. Nothing unattended may drop a receipt.
    if (file.lostReceipts) return pause()
    if (replacedSince(state.bookEpoch)) return false
    await writeFile(handle, file.blob)
    if (replacedSince(state.bookEpoch)) return false
    useBookStore.getState().markSaved({
      fileName: handle.name,
      fileHandle: handle,
      savedAt: await lastModified(handle),
      dirty: changedSince(file.version),
    })
    return true
  } catch (error) {
    console.error(error)
    return failAutosave(ctx, state.bookEpoch)
  } finally {
    useBookStore.getState().setSaving(false)
  }
}

/** Failed writes in a row after which autosave stops trying (§7.5). */
export const AUTOSAVE_MAX_FAILURES = 5

/**
 * A write that threw may be a cloud folder syncing or a file another program
 * holds, so autosave counts it and tries again later (`autosaveDelay`) instead
 * of stopping at once. The first failure says so in a toast. The last one
 * pauses autosave until a manual save, and says that too.
 */
function failAutosave(ctx: Ctx, epoch: number): boolean {
  if (replacedSince(epoch)) return false
  const store = useBookStore.getState()
  const failures = store.autosaveFailures + 1
  if (failures >= AUTOSAVE_MAX_FAILURES) {
    toast.add({ title: ctx.t("io.saveFailed") })
    store.setAutosavePaused(true)
    return false
  }
  store.setAutosaveFailures(failures)
  if (failures === 1) toast.add({ title: ctx.t("io.autosaveRetry") })
  return false
}

/* -------------------------------------------------------------------------
 * Archiving a closed year (§8.19)
 * ---------------------------------------------------------------------- */

function blockerText(ctx: Ctx, year: number, b: ArchiveBlocker): string {
  switch (b.kind) {
    case "running":
      return ctx.t("io.archiveRunning", { y: year })
    case "form5":
      return ctx.t("io.archiveForm5", { y: year })
    case "vat":
      return ctx.t("io.archiveVat", { p: b.periods.join(", ") })
    case "older":
      return ctx.t("io.archiveOlder", { y: b.year })
    case "unsettled":
      return ctx.t("io.archiveUnsettled", { n: b.count })
    case "assetOpening":
      return ctx.t("io.archiveAssetOpening")
    case "empty":
      return ctx.t("io.archiveEmpty", { y: year })
  }
}

/**
 * The `settings.json` of a year's archive (§8.19): the year's own marks, its
 * year-end figures and its change log records, and nothing else of the book.
 */
export function archiveSettings(
  state: ReturnType<typeof useBookStore.getState>,
  year: number,
  today: string
): Partial<BookSettings> {
  const key = String(year)
  return {
    archives: {},
    archiveOf: year,
    autosave: false,
    vatFiled: Object.fromEntries(
      Object.entries(state.vatFiled).filter(([k]) => k.startsWith(key))
    ),
    vatFiledFigures: Object.fromEntries(
      Object.entries(state.vatFiledFigures).filter(([k]) => k.startsWith(key))
    ),
    taxPayment: state.taxPayment,
    yearsArchived: { [key]: today },
    form5Filed: state.form5Filed[key] ? { [key]: state.form5Filed[key] } : {},
    recurring: [],
    categoryRules: [],
    bankBalance: null,
    payMonths: NO_PAY_MONTHS,
    yearEnd: Object.fromEntries(
      Object.entries(state.yearEnd).filter(
        ([k]) => k === key || k === String(year - 1)
      )
    ),
    changeLog: state.changeLog.filter((r) =>
      [r.date, r.period?.replace(/^form5-/, "")].some((d) => d?.startsWith(key))
    ),
  }
}

/**
 * The `settings.json` of an audit package's book ZIP (§8.25): the VAT marks of
 * the periods that lie wholly in the range and the change log records dated in
 * it. Unlike an archive's it is an ordinary book, not a read-only year.
 */
export function auditSettings(
  state: ReturnType<typeof useBookStore.getState>,
  range: DateRange
): Partial<BookSettings> {
  const inside = (key: string) => {
    const p = periodFromKey(key)
    return p !== null && p.from >= range.from && p.to <= range.to
  }
  const onlyInside = <T>(marks: Record<string, T>) =>
    Object.fromEntries(Object.entries(marks).filter(([key]) => inside(key)))
  return {
    archives: {},
    archiveOf: null,
    autosave: false,
    vatFiled: onlyInside(state.vatFiled),
    vatFiledFigures: onlyInside(state.vatFiledFigures),
    taxPayment: state.taxPayment,
    yearsArchived: {},
    form5Filed: {},
    recurring: [],
    categoryRules: [],
    bankBalance: null,
    payMonths: NO_PAY_MONTHS,
    yearEnd: {},
    changeLog: state.changeLog.filter(
      (r) => !!r.date && r.date >= range.from && r.date <= range.to
    ),
  }
}

/**
 * Move a closed year out of the working book into a ZIP of its own (§8.19).
 * The archive is written and read back before anything leaves the book, so a
 * failure at any point leaves the book as it was. Must be called from a user
 * gesture, for the save picker.
 */
export async function archiveClosedYear(
  ctx: Ctx,
  year: number,
  today: string
): Promise<boolean> {
  const state = useBookStore.getState()
  if (state.archiveYear !== null || state.saving || state.importing) {
    return false
  }
  const cats = indexCategories(state.cats)
  const blockers = archiveBlockers({
    year,
    entries: state.entries,
    cats,
    today,
    vatPeriod: state.vatPeriod,
    vatFiled: state.vatFiled,
    form5Filed: state.form5Filed,
    assetOpening: state.assetOpening,
  })
  if (blockers.length) {
    await alertDialog({
      title: ctx.t("io.archiveBlockedTitle", { y: year }),
      message: blockers.map((b) => blockerText(ctx, year, b)).join("\n"),
      closeLabel: ctx.t("common.close"),
    })
    return false
  }
  /* Entries leave the book only once the archive is known to be on disk. */
  if (!isFileHandleSupported()) {
    await alertDialog({
      title: ctx.t("io.archiveNeedsPickerTitle"),
      message: ctx.t("io.archiveNeedsPicker"),
      closeLabel: ctx.t("common.close"),
    })
    return false
  }

  const leaving = movableEntries(state.entries, year)
  const contents = archiveContents(state.entries, year)
  const answer = await choose({
    title: ctx.t("confirm.archiveTitle", { y: year }),
    message: ctx.t("confirm.archiveMessage", { y: year, n: leaving.length }),
    confirmLabel: ctx.t("confirm.archiveConfirm"),
    alternativeLabel: ctx.t("confirm.archivePackConfirm"),
    cancelLabel: ctx.t("common.cancel"),
    destructive: false,
  })
  if (answer === "cancel") return false
  const withPackage = answer === "alternative"

  useBookStore.getState().setSaving(true)
  try {
    if (!(await ensurePassword(ctx, state.fileHandle))) return false
    const base = state.fileName
      ? baseOf(state.fileName)
      : defaultFileBaseName(state.exportLang)
    const handle = await pickFileToSave(
      bookFileName(`${base}-${year}`, state.exportLang)
    )
    if (!handle || replacedSince(state.bookEpoch)) return false

    const settings = archiveSettings(state, year, today)
    const file = await buildBookFile(base, null, {
      entries: contents,
      settings,
    })
    if (file.absentReceipts) {
      await alertDialog({
        title: ctx.t("io.archiveBlockedTitle", { y: year }),
        message: ctx.t("io.archiveLost", { n: file.absentReceipts }),
        closeLabel: ctx.t("common.close"),
      })
      return false
    }
    if (replacedSince(state.bookEpoch)) return false

    /* Read the bytes back first: a file that does not open is no archive. */
    const bytes = new Uint8Array(await file.blob.arrayBuffer())
    const check = await unpackZip(bytes, undefined, heldPassword() ?? undefined)
    if (!check || check.csvText.trim() === "") {
      throw new Error("The archive does not read back")
    }

    /*
     * The package is built before anything is written, from the book as it
     * still is, so a failure here leaves both the book and the disk alone.
     */
    const pack = withPackage
      ? await (
          await import("@/lib/commands/retention-commands")
        ).makeRetentionPackage({
          state: useBookStore.getState(),
          year,
          base,
          book: { name: file.name, bytes },
        })
      : null
    if (replacedSince(state.bookEpoch)) return false

    await writeFile(handle, file.blob)
    if (replacedSince(state.bookEpoch)) return false
    if (pack) saveBlob(pack.blob, pack.name)

    const now = useBookStore.getState()
    const firstMonth = now.entries.map((e) => e.date.slice(0, 7)).sort()[0]
    const next = rolledOpenings({
      year,
      entries: now.entries,
      cats,
      assetOpening: now.assetOpening,
      loanOpening: now.loanOpening,
    })
    now.applyArchive({
      year,
      stub: { file: handle.name, on: today, entries: contents.length },
      removeIds: leaving.map((e) => e.id),
      /* The VAT timeline starts at the first entry; keep it from moving. */
      bookStart: now.bookStart ?? firstMonth ?? null,
      assetOpening: next.assetOpening,
      loanOpening: next.loanOpening,
    })
    toast.add({
      title: ctx.t("io.archiveDone", {
        y: year,
        f: handle.name,
        n: leaving.length,
      }),
    })
    return true
  } catch (error) {
    console.error(error)
    toast.add({ title: ctx.t("io.archiveFailed") })
    return false
  } finally {
    useBookStore.getState().setSaving(false)
  }
}
