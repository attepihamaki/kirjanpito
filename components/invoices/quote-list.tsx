"use client"

import * as React from "react"
import {
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { useCommandCtx } from "@/hooks/use-commands"
import { useToday } from "@/hooks/use-today"
import {
  deleteQuote,
  downloadQuotePdf,
  invoiceQuote,
  setQuoteOutcome,
} from "@/lib/commands/quote-commands"
import { invoiceTotals } from "@/lib/domain/invoice-calc"
import { quoteStatus, type QuoteStatus } from "@/lib/domain/quote"
import { useBookStore } from "@/stores/book-store"

const STATUS_TONE = {
  open: "neutral",
  expired: "expense",
  accepted: "income",
  declined: "neutral",
  invoiced: "income",
} as const satisfies Record<QuoteStatus, "neutral" | "income" | "expense">

/**
 * The quotes (§8.34), at Laskut → Tarjoukset, newest number first. A quote is
 * opened to edit, printed, marked accepted or declined, and made into an
 * invoice draft with the same rows.
 */
export function QuoteList() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const today = useToday()
  const quotes = useBookStore((s) => s.invoiceSettings.quotes)
  const invoices = useBookStore((s) => s.invoices)
  const openDialog = useBookStore((s) => s.openDialog)
  const sorted = React.useMemo(
    () => [...quotes].sort((a, b) => b.number - a.number),
    [quotes]
  )

  const label: Record<QuoteStatus, string> = {
    open: f.t("quote.statusOpen"),
    expired: f.t("quote.statusExpired"),
    accepted: f.t("quote.statusAccepted"),
    declined: f.t("quote.statusDeclined"),
    invoiced: f.t("quote.statusInvoiced"),
  }

  return (
    <Panel title={f.t("quote.title")} description={f.t("quote.listHint")}>
      {sorted.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("quote.empty")}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("invoice.colNumber")}</TableHead>
              <TableHead>{f.t("invoice.colCustomer")}</TableHead>
              <TableHead>{f.t("invoice.colDate")}</TableHead>
              <TableHead>{f.t("quote.colValid")}</TableHead>
              <TableHead className="text-right">
                {f.t("invoice.colAmount")}
              </TableHead>
              <TableHead>{f.t("invoice.colStatus")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((quote) => {
              const status = quoteStatus(quote, invoices, today)
              const name = `${quote.number}`
              const answered = status === "accepted" || status === "declined"
              return (
                <TableRow key={quote.id}>
                  <TableCell className="tabular font-medium">
                    {quote.number}
                  </TableCell>
                  <TableCell>
                    {quote.customer.name || "–"}
                    <div className="max-w-64 truncate text-xs text-muted-foreground">
                      {quote.rows.map((row) => row.description).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(quote.date)}
                  </TableCell>
                  <TableCell className="tabular whitespace-nowrap">
                    {f.date(quote.validUntil)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      cents={invoiceTotals(quote.rows, quote.discount).gross}
                    />
                  </TableCell>
                  <TableCell>
                    <Pill tone={STATUS_TONE[status]}>{label[status]}</Pill>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${f.t("quote.open")}: ${name}`}
                      title={f.t("quote.open")}
                      onClick={() =>
                        openDialog({ kind: "quote", quoteId: quote.id })
                      }
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${f.t("invoice.download")}: ${name}`}
                      title={f.t("invoice.download")}
                      onClick={() => void downloadQuotePdf(ctx, quote)}
                    >
                      <DownloadIcon />
                    </Button>
                    {status === "invoiced" ? null : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${f.t("quote.toInvoice")}: ${name}`}
                        title={f.t("quote.toInvoice")}
                        onClick={() => {
                          const id = invoiceQuote(quote.id)
                          if (!id) return
                          toast.add({
                            title: f.t("quote.invoiced", { n: quote.number }),
                          })
                          openDialog({ kind: "invoice", invoiceId: id })
                        }}
                      >
                        <FileTextIcon />
                      </Button>
                    )}
                    {status === "open" || status === "expired" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.t("quote.markAccepted")}: ${name}`}
                          title={f.t("quote.markAccepted")}
                          onClick={() => setQuoteOutcome(quote.id, "accepted")}
                        >
                          <CheckIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.t("quote.markDeclined")}: ${name}`}
                          title={f.t("quote.markDeclined")}
                          onClick={() => setQuoteOutcome(quote.id, "declined")}
                        >
                          <XIcon />
                        </Button>
                      </>
                    ) : null}
                    {answered ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${f.t("quote.clearOutcome")}: ${name}`}
                        title={f.t("quote.clearOutcome")}
                        onClick={() => setQuoteOutcome(quote.id, null)}
                      >
                        <Undo2Icon />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${f.t("quote.delete")}: ${name}`}
                      title={f.t("quote.delete")}
                      onClick={() => void deleteQuote(ctx, quote)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
