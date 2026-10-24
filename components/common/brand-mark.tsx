import { cn } from "@/lib/utils"

/** The "K" mark (§8.2). Language-neutral, so it is safe before hydration. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground",
        className
      )}
    >
      K
    </div>
  )
}
