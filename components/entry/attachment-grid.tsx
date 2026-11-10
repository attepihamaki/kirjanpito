"use client"

import * as React from "react"
import { FileTextIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react"

import { BusyIcon } from "@/components/common/busy-button"
import { DropTile } from "@/components/common/drop-tile"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFormatters } from "@/components/lang-provider"
import { getReceipt } from "@/lib/browser/receipt-store"
import { acquireObjectUrl, releaseObjectUrl } from "@/lib/browser/object-urls"
import { isPdf } from "@/lib/domain/receipt-path"
import type { Attachment } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

/*
 * Rendered PDF pages, by receipt id. Reopening an entry should not open and
 * render its PDFs again, and a receipt's bytes never change under its id. The
 * oldest goes first once there are more than a dialog or two's worth.
 */
const PDF_THUMBNAILS_KEPT = 50
const pdfThumbnails = new Map<string, string>()

function rememberPdfThumbnail(id: string, url: string): void {
  pdfThumbnails.set(id, url)
  if (pdfThumbnails.size > PDF_THUMBNAILS_KEPT) {
    pdfThumbnails.delete(pdfThumbnails.keys().next().value as string)
  }
}

/** A 3:4 thumbnail, cropped to the top. */
export function Thumb({
  att,
  onOpen,
  onRemove,
}: {
  att: Attachment
  onOpen: () => void
  onRemove?: () => void
}) {
  const f = useFormatters()
  const [url, setUrl] = React.useState<string | null>(() =>
    att.id && isPdf(att) ? (pdfThumbnails.get(att.id) ?? null) : null
  )
  const [failed, setFailed] = React.useState(false)
  const pdf = isPdf(att)

  React.useEffect(() => {
    if (!att.id || att.missing) return
    let cancelled = false
    /*
     * Only the image branch takes a reference on the shared object URL; a PDF
     * thumbnail is a data URL that the cleanup must not try to release.
     */
    let acquired = false
    const id = att.id
    if (pdf && pdfThumbnails.has(id)) return

    void (async () => {
      try {
        const blob = await getReceipt(id)
        if (cancelled) return
        if (!blob) {
          setFailed(true)
          return
        }
        if (pdf) {
          const { renderPdfThumbnail } = await import("@/lib/browser/pdf")
          const dataUrl = await renderPdfThumbnail(blob)
          rememberPdfThumbnail(id, dataUrl)
          if (cancelled) return
          setUrl(dataUrl)
          return
        }
        acquired = true
        setUrl(acquireObjectUrl(id, blob))
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (acquired) releaseObjectUrl(id)
    }
  }, [att.id, att.missing, pdf])

  return (
    <div className="group relative aspect-3/4 overflow-hidden rounded-md border bg-muted">
      <button
        type="button"
        onClick={onOpen}
        aria-label={f.t("receipt.open")}
        className="focus-ring size-full"
      >
        {att.missing ? (
          <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
            <FileTextIcon className="size-5 text-muted-foreground" />
            <span className="text-[0.65rem] text-muted-foreground">
              {f.t("receipt.missing")}
            </span>
          </span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={att.name}
            className="size-full object-cover object-top"
            // A HEIC outside Safari is stored but cannot be drawn (§7.4).
            onError={() => {
              setUrl(null)
              setFailed(true)
            }}
          />
        ) : failed ? (
          /* An undecodable image or PDF falls back to naming the file. */
          <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
            {pdf ? (
              <FileTextIcon className="size-6 text-muted-foreground" />
            ) : null}
            <span className="text-[0.65rem] break-all text-muted-foreground">
              {att.name}
            </span>
          </span>
        ) : (
          <span className="flex size-full items-center justify-center">
            <Spinner />
          </span>
        )}
      </button>

      {pdf && url ? (
        /*
         * On the rendered page, not on the theme: the thumbnail is a white
         * sheet in both themes, so the badge takes the paper colours.
         */
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-sm bg-paper-foreground px-1.5 py-px text-[0.6rem] font-semibold text-paper">
          PDF
        </span>
      ) : null}

      {onRemove ? (
        <Button
          variant="secondary"
          size="icon-xs"
          aria-label={f.t("receipt.remove")}
          onClick={onRemove}
          className="absolute top-1 right-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}

export function AttachmentGrid({
  attachments,
  onAdd,
  onOpen,
  onRemove,
  busy,
  readOnly,
  className,
}: {
  attachments: readonly Attachment[]
  onAdd: () => void
  onOpen: (index: number) => void
  onRemove: (index: number) => void
  busy?: boolean
  /** Opens the receipts only: an entry in a locked period (§8.11). */
  readOnly?: boolean
  className?: string
}) {
  const f = useFormatters()

  if (readOnly && attachments.length === 0) return null

  /* Nothing attached yet: one tall tile that fills the column beside the receipt. */
  if (attachments.length === 0) {
    return (
      <DropTile
        onClick={onAdd}
        disabled={busy}
        className={cn(
          "flex min-h-32 flex-col items-center justify-center gap-1 rounded-xl text-center text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <BusyIcon busy={busy} icon={UploadIcon} className="mb-1 size-5" />
        <span className="px-2 text-sm font-medium text-foreground">
          {f.t("receipt.add")}
        </span>
        <span className="px-2 text-xs">{f.t("receipt.kinds")}</span>
      </DropTile>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 content-start gap-2", className)}>
      {attachments.map((att, i) => (
        <Thumb
          key={att.id ?? `${att.path}-${i}`}
          att={att}
          onOpen={() => onOpen(i)}
          onRemove={readOnly ? undefined : () => onRemove(i)}
        />
      ))}
      {readOnly ? null : (
        <DropTile
          onClick={onAdd}
          disabled={busy}
          className="flex aspect-3/4 flex-col items-center justify-center gap-1 rounded-md text-muted-foreground hover:text-foreground"
        >
          <BusyIcon busy={busy} icon={PlusIcon} className="size-5" />
          <span className="px-1 text-center text-[0.7rem]">
            {f.t("receipt.add")}
          </span>
        </DropTile>
      )}
    </div>
  )
}
