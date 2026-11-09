"use client"

import { PlusIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { INVOICE_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The title and sub-page tabs shared by the invoice pages (§8.27). It is the
 * invoices layout, so switching tabs keeps the header in place.
 */
export function InvoiceShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const openDialog = useBookStore((s) => s.openDialog)
  const path = usePathname().replace(/\/$/, "")
  const customers = path === INVOICE_ROUTES.customers

  return (
    <>
      <PageHeader
        title={t("invoice.title")}
        subtitle={t("invoice.subtitle")}
        actions={
          customers ? (
            <Button
              onClick={() => openDialog({ kind: "customer", customerId: null })}
            >
              <PlusIcon data-icon="inline-start" />
              {t("invoice.newCustomer")}
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
      <SubPageTabs
        label={t("invoice.sections")}
        tabs={[
          { href: INVOICE_ROUTES.list, label: t("invoice.tabInvoices") },
          { href: INVOICE_ROUTES.aging, label: t("invoice.tabAging") },
          { href: INVOICE_ROUTES.customers, label: t("invoice.tabCustomers") },
        ]}
      />
      {children}
    </>
  )
}
