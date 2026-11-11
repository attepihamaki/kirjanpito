"use client"

import { PrinterIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import {
  SectionTabs,
  useSectionHeading,
} from "@/components/common/sub-page-tabs"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"

/**
 * The title, the print button and the sub-page tabs shared by the income
 * statement's views (§8.8). All of them print without it: this is hidden on
 * paper.
 */
export function StatementShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const heading = useSectionHeading("statement")

  return (
    <>
      <div className="print-hidden">
        <PageHeader
          {...heading}
          subtitle={t("statement.subtitle")}
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon data-icon="inline-start" />
              {t("statement.print")}
            </Button>
          }
        />
        <SectionTabs section="statement" />
      </div>
      {children}
    </>
  )
}
