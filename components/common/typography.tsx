import { cn } from "@/lib/utils"

/**
 * The type scale of the two full-width documents outside the app shell: the
 * landing page (§8.3) and the 404.
 *
 * Leading and tracking are the same at both sizes, so the only thing that
 * varies is how large the headline gets — `size="md"` is the quieter one, for
 * a page that is a dead end rather than the site's front door.
 */
export function DisplayHeading({
  size = "lg",
  className,
  children,
}: {
  size?: "lg" | "md"
  className?: string
  children: React.ReactNode
}) {
  return (
    <h1
      className={cn(
        "font-heading leading-[1.05] font-semibold tracking-[-0.035em] text-balance",
        size === "lg"
          ? "text-[clamp(2.25rem,5.4vw,3.75rem)]"
          : "text-[clamp(2rem,4.5vw,3rem)]",
        className
      )}
    >
      {children}
    </h1>
  )
}

/** The paragraph under a `DisplayHeading`. */
export function Lead({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        "max-w-prose text-lg text-pretty text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  )
}

/** The heading of a section within those documents. */
export function SectionHeading({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <h2
      className={cn(
        "font-heading text-2xl font-semibold tracking-tight",
        className
      )}
    >
      {children}
    </h2>
  )
}
