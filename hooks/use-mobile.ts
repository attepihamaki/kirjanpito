import * as React from "react"

/**
 * CLAUDE.md §11's layout breakpoint: below it the sidebar becomes a sheet
 * opened from the top bar. `components/ui/sidebar.tsx` spells the same number
 * as `min-[900px]:`, so the JS and the CSS flip on the same pixel.
 */
const MOBILE_BREAKPOINT = 900

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
