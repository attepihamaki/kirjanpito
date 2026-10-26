"use client"

import { Overlay } from "@/components/common/overlay"
import { Surface } from "@/components/common/surface"
import { Spinner } from "@/components/ui/spinner"
import { useT } from "@/components/lang-provider"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"
import { useBookStore } from "@/stores/book-store"

/**
 * Shown while a file is being read (§7.1, §7.2).
 *
 * A file can be picked or dropped from either the landing page or the app,
 * and in the app the drop overlay disappears the instant the file lands — so
 * neither place can rely on a button spinner alone, least of all with the
 * sidebar collapsed to its rail. Both render this.
 *
 * Blocking, unlike the drop overlay: the import is about to replace the whole
 * bookkeeping, so there is nothing useful to click underneath it. It appears
 * only once the work has run past `BUSY_DELAY_MS`, which a plain CSV never
 * does.
 */
export function ImportOverlay() {
  const t = useT()
  const importing = useBookStore((s) => s.importing)
  const busy = useDelayedFlag(importing)

  if (!busy) return null

  return (
    <Overlay role="status" aria-live="polite">
      <Surface
        radius="xl"
        className="flex items-center gap-3 px-6 py-4 shadow-lg"
      >
        <Spinner className="size-5 text-muted-foreground" />
        <p className="font-heading text-lg font-medium">{t("io.opening")}</p>
      </Surface>
    </Overlay>
  )
}
