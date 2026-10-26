import { cn } from "@/lib/utils"

/**
 * The dashed "put a file here" affordance: the landing page's drop zone and
 * the entry dialog's add-receipt tile.
 *
 * It owns the dashed outline, the hover highlight, the focus ring and the
 * disabled state; the caller gives it its shape and contents, because one is
 * a 3:4 tile in a grid of thumbnails and the other a wide row of two lines.
 */
export function DropTile({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring border border-dashed text-left transition-colors",
        "hover:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}
