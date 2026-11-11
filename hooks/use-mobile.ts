import * as React from "react"

/**
 * CLAUDE.md §11's layout breakpoint: below it the sidebar becomes a sheet
 * opened from the top bar. `components/ui/sidebar.tsx` spells the same number
 * as `min-[900px]:`, so the JS and the CSS flip on the same pixel.
 */
const MOBILE_BREAKPOINT = 900

/** Tailwind's `sm`: below it a view is on a phone held upright (§8.4). */
const PHONE_BREAKPOINT = 640

function useBelow(width: number) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(`(max-width: ${width - 1}px)`)
      mql.addEventListener("change", onStoreChange)
      return () => mql.removeEventListener("change", onStoreChange)
    },
    [width]
  )
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < width,
    () => false
  )
}

export function useIsMobile() {
  return useBelow(MOBILE_BREAKPOINT)
}

/** Whether the window is narrower than Tailwind's `sm`. */
export function useIsPhone() {
  return useBelow(PHONE_BREAKPOINT)
}
