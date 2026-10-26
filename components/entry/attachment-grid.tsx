"use client"

import * as React from "react"
import { FileTextIcon, PlusIcon, XIcon } from "lucide-react"

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

/** A 3:4 thumbnail, cropped to the top. */
function Thumb({
  att,
  onOpen,
  onRemove,
}: {
  att: Attachment
  onOpen: () => void
  onRemove: () => void
}) {
  const f = useFormatters()
  const [url, setUrl] = React.useState<string | null>(null)
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

      <Button
        variant="secondary"
        size="icon-xs"
        aria-label={f.t("receipt.remove")}
        onClick={onRemove}
        className="absolute top-1 right-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <XIcon />
      </Button>
    </div>
  )
}

export function AttachmentGrid({
  attachments,
  onAdd,
  onOpen,
  onRemove,
  busy,
  className,
}: {
  attachments: readonly Attachment[]
  onAdd: () => void
  onOpen: (index: number) => void
  onRemove: (index: number) => void
  busy?: boolean
  className?: string
}) {
  const f = useFormatters()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h3 className="text-sm font-medium">{f.t("receipt.sectionTitle")}</h3>
      {/*
       * Three columns only while the dialog is stacked and the grid has the
       * full width; two in the narrow right-hand column beside the receipt
       * preview. The breakpoint is the dialog's own `md:grid-cols`.
       */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
        {attachments.map((att, i) => (
          <Thumb
            key={att.id ?? `${att.path}-${i}`}
            att={att}
            onOpen={() => onOpen(i)}
            onRemove={() => onRemove(i)}
          />
        ))}
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
      </div>
      <p className="text-xs text-muted-foreground">{f.t("receipt.hint")}</p>
    </div>
  )
}
