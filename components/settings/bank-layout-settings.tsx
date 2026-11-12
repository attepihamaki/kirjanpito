"use client"

import { Trash2Icon } from "lucide-react"

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
import type { BankField, SavedBankMapping } from "@/lib/domain/bank-csv"
import { useBookStore } from "@/stores/book-store"

/** The columns a layout reads, in the order the mapping step shows them. */
const SHOWN: readonly BankField[] = [
  "date",
  "amount",
  "debit",
  "credit",
  "counterparty",
  "message",
  "reference",
  "iban",
]

/**
 * The bank statement layouts the user kept in the import's mapping step
 * (§8.16). They are made there; here they can only be deleted, after which
 * the next file of that layout asks for its columns again.
 */
export function BankLayoutSettings() {
  const f = useFormatters()
  const layouts = useBookStore((s) => s.bankMappings)
  const save = useBookStore((s) => s.saveBankMapping)
  const remove = useBookStore((s) => s.removeBankMapping)
  const readOnly = useBookStore((s) => s.archiveYear !== null)

  const removeLayout = (layout: SavedBankMapping) => {
    remove(layout.id)
    const id = toast.add({
      title: f.t("settings.bankLayoutDeleted", { x: layout.name }),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          save(layout)
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("settings.bankLayoutsTitle")}
      description={f.t("settings.bankLayoutsHint")}
    >
      {layouts.length === 0 ? (
        <Empty>
          <EmptyDescription>
            {f.t("settings.bankLayoutsEmpty")}
          </EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("settings.bankLayoutName")}</TableHead>
              <TableHead>{f.t("settings.bankLayoutColumns")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {layouts.map((layout) => (
              <TableRow key={layout.id}>
                <TableCell className="font-medium">{layout.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {SHOWN.flatMap((field) =>
                    layout.mapping[field] ? [layout.mapping[field]] : []
                  ).join(", ")}
                </TableCell>
                <TableCell className="w-0 text-right">
                  {readOnly ? null : (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={f.t("settings.bankLayoutDelete", {
                        x: layout.name,
                      })}
                      onClick={() => removeLayout(layout)}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
