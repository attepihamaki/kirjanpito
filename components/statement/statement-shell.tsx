"use client"

import { PrinterIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import { STATEMENT_ROUTES } from "@/lib/site"

/**
 * The title, the print button and the sub-page tabs shared by the income
 * statement and its Form 5 view (§8.8). Both pages print as a bare sheet, so
 * all of this is hidden on paper.
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
            { href: STATEMENT_ROUTES.form5, label: t("statement.form5Tab") },
          ]}
        />
      </div>
      {children}
    </>
  )
}
