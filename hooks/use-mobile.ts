import * as React from "react"

/**
 * CLAUDE.md §11's layout breakpoint: below it the sidebar becomes a sheet
 * opened from the top bar. shadcn ships this hook at 768 px and hard-codes the
 * matching `md:` in `components/ui/sidebar.tsx`; both were moved to 900 so the
 * JS and the CSS flip on the same pixel.
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
