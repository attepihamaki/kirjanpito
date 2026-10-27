import { cn } from "@/lib/utils"

/**
 * The card surface (§11): a --card panel over the page's --background. Every
 * bordered box in the app is one of these — the panels, the ledger table, the
 * totals cards, the VAT banner, the landing cards, the import overlay's box.
 *
 * It exists so the surface is declared once. A bordered box with no fill
 * would vanish into the page, and a second hand-written copy of these three
 * classes is how a view ends up a shade off every other one.
 *
 * `radius="xl"` is for the larger boxes that stand alone rather than sit in a
 * column of panels: the landing's closing call to action and the import
 * overlay. `tone="destructive"` draws the border in the destructive colour,
 * for a section whose action cannot be undone.
 */
export function Surface({
  as: Tag = "div",
  radius = "lg",
  tone = "default",
  className,
  ...props
}: {
  as?: "div" | "section" | "article"
  radius?: "lg" | "xl"
  tone?: "default" | "destructive"
} & React.ComponentProps<"div">) {
  return (
    <Tag
      className={cn(
        "border bg-card shadow-xs",
        radius === "xl" ? "rounded-xl" : "rounded-lg",
        tone === "destructive" && "border-destructive/40",
        className
      )}
      {...props}
    />
  )
}
