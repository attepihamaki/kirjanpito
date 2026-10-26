"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  MaximizeIcon,
  RotateCwIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useFormatters } from "@/components/lang-provider"
import { saveBlob } from "@/lib/browser/download"
import { getReceipt } from "@/lib/browser/receipt-store"
import { isPdf } from "@/lib/domain/receipt-path"
import type { Attachment } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

const ZOOM_STEP = 1.5
const MIN_ZOOM = 1
const MAX_ZOOM = 4

type PdfDoc = Awaited<ReturnType<typeof import("@/lib/browser/pdf").loadPdf>>

type Status =
  | { kind: "loading" }
  | { kind: "missing"; path?: string }
  | { kind: "error" }
  | { kind: "image"; bitmap: ImageBitmap; blob: Blob }
  | { kind: "pdf"; doc: PdfDoc; pages: number; blob: Blob }

/** Near full-screen receipt viewer (§8.6). */
export function ReceiptViewer() {
  const dialog = useBookStore((s) => s.dialog)
  const entries = useBookStore((s) => s.entries)
  const closeDialog = useBookStore((s) => s.closeDialog)

  if (dialog.kind !== "viewer") return null
  const entry = entries.find((e) => e.id === dialog.entryId)
  const attachments = entry?.atts ?? []
  const index = Math.min(Math.max(0, dialog.index), attachments.length - 1)
  const att = attachments[index]
  if (!entry || !att) return null

  // Keyed on the attachment, so moving between receipts remounts with
  // fresh zoom, rotation and page rather than resetting them in an effect.
  return (
    <ViewerBody
      key={(att.id ?? att.path ?? att.name) + ":" + index}
      entryId={entry.id}
      att={att}
      index={index}
      count={attachments.length}
      onClose={closeDialog}
    />
  )
}

function ViewerBody({
  entryId,
  att,
  index,
  count,
  onClose,
}: {
  entryId: string
  att: Attachment
  index: number
  count: number
  onClose: () => void
}) {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)

  const [status, setStatus] = React.useState<Status>({ kind: "loading" })
  const [page, setPage] = React.useState(1)
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)
  // Load the current attachment.
  React.useEffect(() => {
    let cancelled = false

    void (async () => {
      if (att.missing || !att.id) {
        if (!cancelled) setStatus({ kind: "missing", path: att.path })
        return
      }
      try {
        const blob = await getReceipt(att.id)
        if (cancelled) return
        if (!blob) {
          setStatus({ kind: "missing", path: att.path })
          return
        }
        if (isPdf(att)) {
          const { loadPdf } = await import("@/lib/browser/pdf")
          const handle = await loadPdf(blob)
          if (cancelled) {
            void handle.destroy()
            return
          }
          setStatus({ kind: "pdf", doc: handle, pages: handle.numPages, blob })
        } else {
          const bitmap = await createImageBitmap(blob)
          if (cancelled) {
            bitmap.close()
            return
          }
          setStatus({ kind: "image", bitmap, blob })
        }
      } catch {
        if (!cancelled) setStatus({ kind: "error" })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [att])

  // Release decoded resources when the viewer closes or moves on.
  React.useEffect(() => {
    return () => {
      if (status.kind === "image") status.bitmap.close()
      if (status.kind === "pdf") void status.doc.destroy()
    }
  }, [status])

  // Draw, fitted to the stage and scaled for the device pixel ratio.
  const draw = React.useCallback(async () => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    const available = {
      width: Math.max(100, stage.clientWidth - 32),
      height: Math.max(100, stage.clientHeight - 32),
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    if (status.kind === "image") {
      const { bitmap } = status
      const swapped = rotation % 180 !== 0
      const w = swapped ? bitmap.height : bitmap.width
      const h = swapped ? bitmap.width : bitmap.height
      // Never upscale past 100% at fit.
      const fit = Math.min(available.width / w, available.height / h, 1)
      const scale = fit * zoom

      canvas.width = Math.round(w * scale * dpr)
      canvas.height = Math.round(h * scale * dpr)
      canvas.style.width = `${Math.round(w * scale)}px`
      canvas.style.height = `${Math.round(h * scale)}px`

      const context = canvas.getContext("2d")
      if (!context) return
      context.save()
      context.scale(dpr, dpr)
      context.translate((w * scale) / 2, (h * scale) / 2)
      context.rotate((rotation * Math.PI) / 180)
      context.drawImage(
        bitmap,
        (-bitmap.width * scale) / 2,
        (-bitmap.height * scale) / 2,
        bitmap.width * scale,
        bitmap.height * scale
      )
      context.restore()
      return
    }

    if (status.kind === "pdf") {
      const { pdfPageSize, renderPdfPage } = await import("@/lib/browser/pdf")
      const size = await pdfPageSize(status.doc.doc, page)
      const swapped = rotation % 180 !== 0
      const w = swapped ? size.height : size.width
      const h = swapped ? size.width : size.height
      const fit = Math.min(available.width / w, available.height / h)
      await renderPdfPage(status.doc.doc, page, canvas, {
        scale: fit * zoom * dpr,
        rotation,
      })
      canvas.style.width = `${Math.round(w * fit * zoom)}px`
      canvas.style.height = `${Math.round(h * fit * zoom)}px`
    }
  }, [status, zoom, rotation, page])

  React.useEffect(() => {
    void draw()
  }, [draw])

  // Redraw on resize, debounced.
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void draw(), 120)
    }
    window.addEventListener("resize", onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", onResize)
    }
  }, [draw])

  const go = React.useCallback(
    (delta: number) => {
      const next = index + delta
      if (next < 0 || next >= count) return
      openDialog({ kind: "viewer", entryId, index: next })
    },
    [entryId, index, count, openDialog]
  )

  // ←/→ move between receipts, +/− zoom (§8.6).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP))
      } else if (e.key === "-") {
        setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP))
      }
    }
    // Capture phase: Base UI's dialog consumes arrow keys for its own focus
    // handling before they bubble to window, so ArrowLeft/Right never
    // reached us. "+" and "-" were unaffected, which is what made it look
    // like the listener was working.
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [go])

  const blob =
    status.kind === "image" || status.kind === "pdf" ? status.blob : null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92svh] max-w-[min(96vw,72rem)] flex-col gap-3 sm:max-w-[min(96vw,72rem)]">
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate">{att.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {f.t("viewer.receiptOf", { i: index + 1, n: count })}
            {att.size ? ` · ${f.size(att.size)}` : ""}
          </p>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1 border-y py-2">
          {count > 1 ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={f.t("viewer.prevReceipt")}
                disabled={index === 0}
                onClick={() => go(-1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={f.t("viewer.nextReceipt")}
                disabled={index === count - 1}
                onClick={() => go(1)}
              >
                <ChevronRightIcon />
              </Button>
            </>
          ) : null}

          {status.kind === "pdf" && status.pages > 1 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={f.t("viewer.prevPage")}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <span className="tabular text-xs text-muted-foreground">
                {f.t("viewer.pageOf", { p: page, n: status.pages })}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={f.t("viewer.nextPage")}
                disabled={page >= status.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("viewer.zoomOut")}
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP))}
            >
              <ZoomOutIcon />
            </Button>
            <span className="tabular w-12 text-center text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("viewer.zoomIn")}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP))}
            >
              <ZoomInIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("viewer.fit")}
              onClick={() => {
                setZoom(1)
                setRotation(0)
              }}
            >
              <MaximizeIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("viewer.rotate")}
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCwIcon />
            </Button>
            {blob ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={f.t("viewer.saveOriginal")}
                onClick={() => saveBlob(blob, att.name)}
              >
                <DownloadIcon />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("common.close")}
              onClick={onClose}
            >
              <XIcon />
            </Button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-muted p-4"
        >
          {status.kind === "loading" ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {f.t("viewer.loading")}
            </span>
          ) : status.kind === "missing" ? (
            <div className="text-center">
              <p className="font-medium">{f.t("receipt.missing")}</p>
              {status.path ? (
                <p className="mt-1 text-xs break-all text-muted-foreground">
                  {status.path}
                </p>
              ) : null}
            </div>
          ) : status.kind === "error" ? (
            <div className="max-w-sm text-center">
              <p className="text-sm">{f.t("viewer.noPreview")}</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="max-w-none" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
