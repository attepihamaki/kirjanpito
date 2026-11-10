"use client"

import * as React from "react"

import { useCommandCtx } from "@/hooks/use-commands"
import { useToday } from "@/hooks/use-today"
import { makeRecurringDrafts } from "@/lib/commands/invoice-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * Turn the recurring invoices that have come due into drafts (§8.27): when
 * the book opens, at midnight in a tab left open, and when a template is
 * added or changed so that it is due already.
 */
export function useRecurringInvoices(): void {
  const ctx = useCommandCtx()
  const today = useToday()
  const recurring = useBookStore((s) => s.invoiceSettings.recurring)
  const epoch = useBookStore((s) => s.bookEpoch)

  React.useEffect(() => {
    makeRecurringDrafts(ctx, today)
  }, [ctx, today, recurring, epoch])
}
