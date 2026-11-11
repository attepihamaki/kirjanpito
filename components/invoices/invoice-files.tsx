"use client"

import * as React from "react"
import { ExternalLinkIcon, PaperclipIcon, Trash2Icon } from "lucide-react"

import { DropTile } from "@/components/common/drop-tile"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { FieldDescription } from "@/components/ui/field"
import { toast } from "@/components/ui/toast"
import {
  getReceipt,
  isReceiptStorageSupported,
  putReceipt,
} from "@/lib/browser/receipt-store"
import { releaseDraftAttachment } from "@/lib/commands/memo-commands"
import { uid } from "@/lib/domain/id"
import {
  INVOICE_FILE_BYTES_MAX,
  INVOICE_FILE_TYPES,
  INVOICE_FILES_MAX,
  isInvoiceFileType,
  type InvoiceFile,
} from "@/lib/domain/invoice"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** The picker's filter: the types an invoice carries, by MIME type and extension. */
const ACCEPT = [...INVOICE_FILE_TYPES, ".pdf", ".png", ".jpg", ".jpeg"].join(
  ","
)

const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files")

/** A JPEG named `.jpg` may come with an empty type; the name decides then. */
function typeOf(file: File): string {
  if (file.type) return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "application/pdf"
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  return ""
}

/**
 * The files attached to an invoice (§8.27): picked here, stored in IndexedDB
 * like receipts and printed after the invoice when its PDF is drawn. A file
 * is held as a draft attachment until the dialog closes, so a receipt sweep
 * does not take it before the invoice is saved; a file of an invoice that was
 * never saved goes in the next sweep.
 */
export function InvoiceFiles({
  files,
  onChange,
  disabled,
}: {
  files: readonly InvoiceFile[]
  onChange: (files: InvoiceFile[]) => void
  disabled: boolean
}) {
  const f = useFormatters()
  const pickRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  /* Enter and leave fire for every child the drag crosses, so the zone counts them. */
  const [over, setOver] = React.useState(false)
  const depth = React.useRef(0)
  const held = React.useRef<string[]>([])

  React.useEffect(() => {
    const ids = held.current
    return () => {
      for (const id of ids) releaseDraftAttachment(id)
    }
  }, [])

  const add = async (picked: File[]) => {
    if (!isReceiptStorageSupported()) {
      toast.add({ title: f.t("invoice.filesNoStorage") })
      return
    }
    setBusy(true)
    const next = [...files]
    try {
      for (const file of picked) {
        if (next.length >= INVOICE_FILES_MAX) {
          toast.add({
            title: f.t("invoice.filesTooMany", { n: INVOICE_FILES_MAX }),
          })
          break
        }
        const type = typeOf(file)
        if (!isInvoiceFileType(type)) {
          toast.add({ title: f.t("invoice.filesBadType", { x: file.name }) })
          continue
        }
        if (file.size > INVOICE_FILE_BYTES_MAX) {
          toast.add({ title: f.t("invoice.filesTooLarge", { x: file.name }) })
          continue
        }
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (type === "application/pdf") {
          const { canAppendPdf } =
            await import("@/lib/browser/invoice-attachments")
          if (!(await canAppendPdf(bytes))) {
            toast.add({
              title: f.t("invoice.filesUnreadable", { x: file.name }),
            })
            continue
          }
        }
        const id = `a-${uid()}`
        const store = useBookStore.getState()
        store.setDraftAttachmentIds([...store.draftAttachmentIds, id])
        held.current.push(id)
        await putReceipt(id, new Blob([bytes as BlobPart], { type }))
        next.push({ id, name: file.name, type, size: file.size })
      }
    } catch (error) {
      console.warn("An invoice attachment could not be stored", error)
      toast.add({ title: f.t("invoice.filesFailed") })
    } finally {
      setBusy(false)
    }
    onChange(next)
  }

  const open = async (file: InvoiceFile) => {
    const blob = await getReceipt(file.id).catch(() => undefined)
    if (!blob) {
      toast.add({ title: f.t("invoice.filesMissing", { x: file.name }) })
      return
    }
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener")
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  if (disabled && files.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{f.t("invoice.files")}</h3>
      {files.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {files.map((file, index) => (
            <li key={file.id} className="flex items-center gap-2">
              <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="tabular text-xs text-muted-foreground">
                {f.size(file.size)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={f.t("invoice.filesOpen", { x: file.name })}
                title={f.t("invoice.filesOpen", { x: file.name })}
                onClick={() => void open(file)}
              >
                <ExternalLinkIcon />
              </Button>
              {disabled ? null : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={f.t("invoice.filesRemove", { x: file.name })}
                  title={f.t("invoice.filesRemove", { x: file.name })}
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                >
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {disabled ? null : (
        <>
          <DropTile
            disabled={busy || files.length >= INVOICE_FILES_MAX}
            onClick={() => pickRef.current?.click()}
            onDragEnter={(e) => {
              if (!hasFiles(e)) return
              depth.current += 1
              setOver(true)
            }}
            onDragOver={(e) => {
              if (!hasFiles(e)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = "copy"
            }}
            onDragLeave={() => {
              depth.current = Math.max(0, depth.current - 1)
              if (depth.current === 0) setOver(false)
            }}
            onDrop={(e) => {
              if (!hasFiles(e)) return
              /* Taken here, so the window's own drop handler leaves it (§8.2). */
              e.preventDefault()
              depth.current = 0
              setOver(false)
              const dropped = [...(e.dataTransfer.files ?? [])]
              if (dropped.length > 0 && files.length < INVOICE_FILES_MAX)
                void add(dropped)
            }}
            className={cn(
              "flex min-h-18 w-full items-center justify-center gap-2.5 rounded-lg bg-muted/30 px-4 text-center text-sm text-muted-foreground",
              over && "border-primary bg-primary/5 text-foreground"
            )}
          >
            <PaperclipIcon aria-hidden className="size-4.5 shrink-0" />
            <span>
              {f.t("invoice.filesDrop")}{" "}
              <span className="font-medium text-primary underline underline-offset-2">
                {f.t("invoice.filesPick")}
              </span>
            </span>
          </DropTile>
          <FieldDescription>
            {f.t("invoice.filesHint", { n: INVOICE_FILES_MAX })}
          </FieldDescription>
          <input
            ref={pickRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const picked = [...(event.target.files ?? [])]
              event.target.value = ""
              if (picked.length > 0) void add(picked)
            }}
          />
        </>
      )}
    </section>
  )
}
