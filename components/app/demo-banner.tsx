"use client"

import { FlaskConicalIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useCommandCtx } from "@/hooks/use-commands"
import { startNewBook } from "@/lib/commands/book-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * Says that the open book is the demo (§8.32), on every page, and offers the
 * way to a real one. It cannot be hidden: the figures are invented, and
 * nothing should be mistaken for the user's own.
 */
export function DemoBanner() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const demo = useBookStore((s) => s.demo && s.open)
  if (!demo) return null
  return (
    <div
      role="status"
      className="print-hidden flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted px-4 py-2 text-sm lg:px-6"
    >
      <FlaskConicalIcon className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">{f.t("app.demoTitle")}</span>
      <span className="text-muted-foreground">{f.t("app.demoHint")}</span>
      <span className="ml-auto">
        <Button size="sm" onClick={() => void startNewBook(ctx)}>
          {f.t("app.demoStart")}
        </Button>
      </span>
    </div>
  )
}
