"use client"

import { PrinterIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import { STATEMENT_GROUPS } from "@/lib/ui/sub-pages"

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
          groups={STATEMENT_GROUPS}
        />
      </div>
      {children}
    </>
  )
}
