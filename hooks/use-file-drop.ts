"use client"

import * as React from "react"

export type DropKind = "book" | "media" | null

const MEDIA = /^(image\/|application\/pdf)/

export function isMediaFile(file: File): boolean {
  return (
    MEDIA.test(file.type) ||
    /\.(jpe?g|png|webp|gif|heic|heif|pdf)$/i.test(file.name)
  )
}

export function isBookFile(file: File): boolean {
  return /\.(csv|zip)$/i.test(file.name)
}

/**
 * Whole-window drag and drop (§8.2).
 *
 * The depth counter is reset on `drop` and on `dragend` as well as being
 * decremented on `dragleave`: a drag that ends outside the window never fires
 * a matching leave, and the prototype's overlay could get stuck because of it.
 */
export function useFileDrop({
  onDropFiles,
  disabled,
}: {
  onDropFiles: (files: File[]) => void
  disabled?: boolean
}) {
  const [dragging, setDragging] = React.useState(false)
  const depth = React.useRef(0)

  React.useEffect(() => {
    if (disabled) return

    const reset = () => {
      depth.current = 0
      setDragging(false)
    }

    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return
      depth.current += 1
      setDragging(true)
    }
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return
      e.preventDefault()
    }
    const onDragLeave = () => {
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return
      e.preventDefault()
      reset()
      const files = Array.from(e.dataTransfer.files ?? [])
      if (files.length) onDropFiles(files)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)
    window.addEventListener("dragend", reset)
    window.addEventListener("blur", reset)

    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("dragend", reset)
      window.removeEventListener("blur", reset)
    }
  }, [onDropFiles, disabled])

  return dragging
}
