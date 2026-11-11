"use client"

import { PlusIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { INVOICE_ROUTES } from "@/lib/site"
import { INVOICE_GROUPS } from "@/lib/ui/sub-pages"
import { useBookStore } from "@/stores/book-store"

/**
 * The title and sub-page tabs shared by the invoice pages (§8.27). It is the
 * invoices layout, so switching tabs keeps the header in place.
 */
export function InvoiceShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const openDialog = useBookStore((s) => s.openDialog)
  const path = usePathname().replace(/\/$/, "")
  const parties = path === INVOICE_ROUTES.parties
  const quotes = path === INVOICE_ROUTES.quotes

  return (
    <>
      <PageHeader
        title={t("invoice.title")}
        subtitle={t("invoice.subtitle")}
        actions={
          parties ? (
            <Button
              onClick={() =>
                openDialog({ kind: "customer", customerId: null, role: "both" })
              }
            >
              <PlusIcon data-icon="inline-start" />
              {t("party.new")}
            </Button>
          ) : quotes ? (
            <Button
              onClick={() => openDialog({ kind: "quote", quoteId: null })}
            >
              <PlusIcon data-icon="inline-start" />
              {t("quote.new")}
            </Button>
          ) : (
            <Button
              onClick={() => openDialog({ kind: "invoice", invoiceId: null })}
            >
              <PlusIcon data-icon="inline-start" />
              {t("invoice.new")}
            </Button>
          )
        }
      />
      <SubPageTabs label={t("invoice.sections")} groups={INVOICE_GROUPS} />
      {children}
    </>
  )
}
