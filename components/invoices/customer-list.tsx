"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"

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
import { toast } from "@/components/ui/toast"
import type { Customer } from "@/lib/domain/invoice"
import { useBookStore } from "@/stores/book-store"

/** The customer register (§8.27). */
export function CustomerList() {
  const f = useFormatters()
  const customers = useBookStore((s) => s.customers)
  const setCustomers = useBookStore((s) => s.setCustomers)
  const openDialog = useBookStore((s) => s.openDialog)
  const sorted = [...customers].sort((a, b) =>
    f.collator.compare(a.name, b.name)
  )

  const remove = (customer: Customer) => {
    setCustomers(customers.filter((c) => c.id !== customer.id))
    const id = toast.add({
      title: f.t("invoice.customerDeleted"),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState()
          now.setCustomers([...now.customers, customer])
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("invoice.customersTitle")}
      description={f.t("invoice.customersHint")}
    >
      {sorted.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("invoice.customersEmpty")}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("invoice.customerName")}</TableHead>
              <TableHead>{f.t("invoice.customerCity")}</TableHead>
              <TableHead>{f.t("invoice.customerVatId")}</TableHead>
              <TableHead>{f.t("invoice.customerEmail")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.city}</TableCell>
                <TableCell className="tabular">{c.vatId}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${f.t("invoice.editCustomer")}: ${c.name}`}
                    onClick={() =>
                      openDialog({ kind: "customer", customerId: c.id })
                    }
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={f.t("invoice.deleteCustomer", { x: c.name })}
                    onClick={() => remove(c)}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
