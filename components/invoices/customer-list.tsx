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
import { isCustomer, type Customer } from "@/lib/domain/invoice"
import { useBookStore } from "@/stores/book-store"

const ROLE_TEXT = {
  customer: "party.roleCustomer",
  supplier: "party.roleSupplier",
  both: "party.roleBoth",
} as const

/**
 * The counterparty register (§8.29). Asetukset, Osapuolet lists every party
 * with its role; Laskut, Asiakkaat lists only those that can be invoiced
 * (§8.27). A name opens the party's own view.
 */
export function CustomerList({
  scope = "customers",
}: {
  scope?: "customers" | "all"
}) {
  const f = useFormatters()
  const customers = useBookStore((s) => s.customers)
  const setCustomers = useBookStore((s) => s.setCustomers)
  const openDialog = useBookStore((s) => s.openDialog)
  const all = scope === "all"
  const sorted = customers
    .filter((c) => all || isCustomer(c))
    .sort((a, b) => f.collator.compare(a.name, b.name))

  const remove = (customer: Customer) => {
    setCustomers(customers.filter((c) => c.id !== customer.id))
    const id = toast.add({
      title: f.t(all ? "party.deleted" : "invoice.customerDeleted"),
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
      title={f.t(all ? "party.title" : "invoice.customersTitle")}
      description={f.t(all ? "party.hint" : "invoice.customersHint")}
    >
      {sorted.length === 0 ? (
        <Empty>
          <EmptyDescription>
            {f.t(all ? "party.empty" : "invoice.customersEmpty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("invoice.customerName")}</TableHead>
              {all ? <TableHead>{f.t("party.role")}</TableHead> : null}
              <TableHead>{f.t("invoice.customerCity")}</TableHead>
              <TableHead>{f.t("invoice.customerVatId")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {f.t("invoice.customerEmail")}
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 font-medium"
                    aria-label={f.t("party.open", { x: c.name })}
                    onClick={() => openDialog({ kind: "party", partyId: c.id })}
                  >
                    {c.name}
                  </Button>
                </TableCell>
                {all ? <TableCell>{f.t(ROLE_TEXT[c.role])}</TableCell> : null}
                <TableCell>{c.city}</TableCell>
                <TableCell className="tabular">{c.vatId}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {c.email}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${f.t(all ? "party.edit" : "invoice.editCustomer")}: ${c.name}`}
                    onClick={() =>
                      openDialog({ kind: "customer", customerId: c.id })
                    }
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={f.t(
                      all ? "party.delete" : "invoice.deleteCustomer",
                      { x: c.name }
                    )}
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
