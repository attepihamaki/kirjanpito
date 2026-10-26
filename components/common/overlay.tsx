import { cn } from "@/lib/utils"

/**
 * A full-screen scrim: the drag-and-drop hint (§8.2) and the import progress
 * overlay (§7.2).
 *
 * `blocking` is the difference between them. The import overlay takes the
 * pointer, because the bookkeeping is about to be replaced and there is
 * nothing useful to click underneath it; the drop hint must not, or the drop
 * would land on the scrim instead of the page.
 */
export function Overlay({
  blocking = true,
  className,
  ...props
}: { blocking?: boolean } & React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        !blocking && "pointer-events-none",
        className
      )}
      {...props}
    />
  )
}
