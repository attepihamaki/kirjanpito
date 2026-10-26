"use client"

import * as React from "react"
import { FileTextIcon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFormatters } from "@/components/lang-provider"
import { getReceipt } from "@/lib/browser/receipt-store"
import { acquireObjectUrl, releaseObjectUrl } from "@/lib/browser/object-urls"
import { isPdf } from "@/lib/domain/receipt-path"
import type { Attachment } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

/** A 3:4 thumbnail, cropped to the top (§8.5). */
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
    if (!att.id || att.missing || pdf) return
    let cancelled = false
    const id = att.id

    void (async () => {
      try {
        const blob = await getReceipt(id)
        if (!blob || cancelled) {
          if (!cancelled) setFailed(true)
          return
        }
        setUrl(acquireObjectUrl(id, blob))
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      releaseObjectUrl(id)
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
        ) : pdf ? (
          <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
            <FileTextIcon className="size-6 text-muted-foreground" />
            <span className="rounded-sm bg-background px-1 text-[0.6rem] font-medium">
              PDF
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
          <span className="flex size-full items-center justify-center p-2 text-center text-[0.65rem] break-all text-muted-foreground">
            {att.name}
          </span>
        ) : (
          <span className="flex size-full items-center justify-center">
            <Spinner />
          </span>
        )}
      </button>

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {attachments.map((att, i) => (
          <Thumb
            key={att.id ?? `${att.path}-${i}`}
            att={att}
            onOpen={() => onOpen(i)}
            onRemove={() => onRemove(i)}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className={cn(
            "flex aspect-3/4 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors",
            "hover:border-primary hover:text-foreground",
            "focus-ring",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {busy ? <Spinner /> : <PlusIcon className="size-5" />}
          <span className="px-1 text-center text-[0.7rem]">
            {f.t("receipt.add")}
          </span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{f.t("receipt.hint")}</p>
    </div>
  )
}
