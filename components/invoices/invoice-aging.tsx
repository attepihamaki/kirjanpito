"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { Panel } from "@/components/common/panel"
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
import { todayIso } from "@/lib/domain/dates"
import {
  AGING_BUCKETS,
  agingReport,
  type AgingBucket,
} from "@/lib/domain/invoice-aging"
import { useBookStore } from "@/stores/book-store"

/**
 * What customers still owe, by customer and by how late it is (§8.27). A
 * customer's row opens to its invoices, each of which opens the invoice.
 */
export function InvoiceAging() {
  const f = useFormatters()
  const invoices = useBookStore((s) => s.invoices)
  const entries = useBookStore((s) => s.entries)
  const openDialog = useBookStore((s) => s.openDialog)
  const [opened, setOpened] = React.useState<ReadonlySet<string>>(new Set())

  const report = React.useMemo(
    () => agingReport(invoices, entries, todayIso()),
    [invoices, entries]
  )

  const heading: Record<AgingBucket, string> = {
    notDue: f.t("invoice.agingNotDue"),
    late14: f.t("invoice.agingLate14"),
    late30: f.t("invoice.agingLate30"),
    late60: f.t("invoice.agingLate60"),
    later: f.t("invoice.agingLater"),
  }

  const toggle = (key: string) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })

  return (
    <Panel>
      {report.customers.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("invoice.agingEmpty")}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("invoice.colCustomer")}</TableHead>
              {AGING_BUCKETS.map((b) => (
                <TableHead key={b} className="text-right">
                  {heading[b]}
                </TableHead>
              ))}
              <TableHead className="text-right">
                {f.t("invoice.agingTotal")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.customers.map((customer) => {
              const open = opened.has(customer.key)
              return (
                <React.Fragment key={customer.key}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={open}
                        onClick={() => toggle(customer.key)}
                      >
                        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        {customer.name || "–"}
                      </Button>
                    </TableCell>
                    {AGING_BUCKETS.map((b) => (
                      <TableCell key={b} className="text-right">
                        {customer.buckets[b] === 0 ? (
                          <span className="text-muted-foreground">–</span>
                        ) : (
                          <Money cents={customer.buckets[b]} />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">
                      <Money cents={customer.total} />
                    </TableCell>
                  </TableRow>
                  {open
                    ? customer.items.map((item) => (
                        <TableRow key={item.invoice.id} className="bg-muted/30">
                          <TableCell className="pl-10">
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() =>
                                openDialog({
                                  kind: "invoice",
                                  invoiceId: item.invoice.id,
                                })
                              }
                            >
                              {f.t("invoice.agingItem", {
                                n: item.invoice.number ?? 0,
                                d: f.date(item.invoice.dueDate),
                              })}
                            </Button>
                          </TableCell>
                          {AGING_BUCKETS.map((b) => (
                            <TableCell key={b} className="text-right">
                              {item.bucket === b ? (
                                <Money cents={item.open} />
                              ) : null}
                            </TableCell>
                          ))}
                          <TableCell />
                        </TableRow>
                      ))
                    : null}
                </React.Fragment>
              )
            })}
            <TableRow className="font-medium">
              <TableCell>{f.t("invoice.agingTotal")}</TableCell>
              {AGING_BUCKETS.map((b) => (
                <TableCell key={b} className="text-right">
                  {report.buckets[b] === 0 ? (
                    <span className="text-muted-foreground">–</span>
                  ) : (
                    <Money cents={report.buckets[b]} />
                  )}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <Money cents={report.total} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
