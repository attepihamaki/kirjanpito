"use client"

import { PrinterIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import { STATEMENT_ROUTES } from "@/lib/site"

/**
 * The title, the print button and the sub-page tabs shared by the income
 * statement's views (§8.8). All of them print without it: this is hidden on
 * paper.
 */
export function StatementShell({ children }: { children: React.ReactNode }) {
  const t = useT()

  return (
    <>
      <div className="print-hidden">
        <PageHeader
          title={t("nav.statement")}
          subtitle={t("statement.subtitle")}
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon data-icon="inline-start" />
              {t("statement.print")}
            </Button>
          }
        />
        <SubPageTabs
          label={t("statement.sections")}
          tabs={[
            { href: STATEMENT_ROUTES.sheet, label: t("statement.sheetTab") },
            { href: STATEMENT_ROUTES.balance, label: t("balance.tab") },
            {
              href: STATEMENT_ROUTES.inventory,
              label: t("inventory.tab"),
            },
            { href: STATEMENT_ROUTES.assets, label: t("assets.tab") },
            { href: STATEMENT_ROUTES.deductions, label: t("deductions.tab") },
          ]}
        />
      </div>
      {children}
    </>
  )
}
