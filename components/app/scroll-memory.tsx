"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { useBookStore } from "@/stores/book-store"

/*
 * Window scroll position per route, for the life of the tab. A route that was
 * left is put back where it was when it is visited again; one never seen
 * starts at the top.
 */
const positions = new Map<string, number>()

/**
 * Keeps the page where the user left it. Two moments matter:
 * - a dialog closing, which must not move the page behind it;
 * - a route change, which returns to the position the new route last had.
 */
export function ScrollMemory() {
  const path = usePathname()
  const dialogOpen = useBookStore((s) => s.dialog.kind !== "none")
  const current = React.useRef(0)
  const atOpen = React.useRef<number | null>(null)

  React.useEffect(() => {
    const onScroll = () => {
      current.current = window.scrollY
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useLayoutEffect(() => {
    const saved = positions.get(path) ?? 0
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, saved)
      current.current = saved
    })
    return () => {
      cancelAnimationFrame(frame)
      positions.set(path, current.current)
    }
  }, [path])

  React.useEffect(() => {
    if (dialogOpen) {
      atOpen.current = current.current
      return
    }
    const y = atOpen.current
    atOpen.current = null
    if (y !== null && Math.abs(window.scrollY - y) > 1) {
      window.scrollTo(0, y)
    }
  }, [dialogOpen])

  return null
}
