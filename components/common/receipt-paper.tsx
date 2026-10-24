import { cn } from "@/lib/utils"

/**
 * The paper receipt shape (§11) — the design's one bold element.
 *
 * The perforations are masked out of the paper itself rather than drawn as a
 * strip underneath it, so the torn edge *is* the bottom of the sheet. That
 * rules out a border: a mask clips the element's own border and box shadow, so
 * an outlined receipt loses its outline exactly along the tear, which reads as
 * a bug. The prototype's `.receipt` has no border for the same reason; the
 * paper is told apart from its surface by its warm tone and by the shadow,
 * which has to be a `drop-shadow` filter on the wrapper to follow the notches.
 */
export function ReceiptPaper({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("drop-shadow-sm", className)} {...props}>
      <div
        className={cn(
          "rounded-t-md bg-paper px-4 pt-4 pb-6 text-paper-foreground",
          "[mask-image:radial-gradient(circle_5px_at_50%_100%,transparent_98%,black)]",
          "[mask-size:12px_100%] [mask-repeat:repeat-x]"
        )}
      >
        {children}
      </div>
    </div>
  )
}
