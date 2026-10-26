import Link from "next/link"
import type { VariantProps } from "class-variance-authority"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A link that looks like a button.
 *
 * `Button` enforces button semantics, so a link must not be rendered through
 * its `render` prop: an `<a href>` is a link, and `Button` would give it
 * `role="button"`, which is what a screen reader then announces. Only the
 * classes are shared, which is all that is wanted here.
 */
export function ButtonLink({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
