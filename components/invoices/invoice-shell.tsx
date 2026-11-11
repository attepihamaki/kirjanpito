"use client"

import { PlusIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { PageHeader } from "@/components/common/page-header"
import { NewEntryButton } from "@/components/common/new-entry-button"
import {
  SectionTabs,
  useSectionHeading,
} from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { INVOICE_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The header shared by the invoice pages (§8.27) and the bills to pay
 * (§8.30), which are two sections of the sidebar under one layout: the
 * invoices the business sends, and the bills it receives.
 */
export function InvoiceShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const openDialog = useBookStore((s) => s.openDialog)
  const path = usePathname().replace(/\/$/, "")
  const parties = path === INVOICE_ROUTES.parties
  const quotes = path === INVOICE_ROUTES.quotes
  const payables = path === INVOICE_ROUTES.payables
  const heading = useSectionHeading(payables ? "purchases" : "sales")

  return (
    <>
      <PageHeader
        {...heading}
        subtitle={t(payables ? "payables.subtitle" : "invoice.subtitle")}
        actions={
          payables ? (
            <NewEntryButton />
          ) : parties ? (
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
      <SectionTabs section={payables ? "purchases" : "sales"} />
      {children}
    </>
  )
}
