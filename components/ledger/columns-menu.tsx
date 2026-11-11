"use client"

import { Columns3Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFormatters } from "@/components/lang-provider"
import {
  OPTIONAL_LEDGER_COLUMNS,
  type OptionalLedgerColumn,
} from "@/lib/domain/ledger-columns"
import type { MessageKey } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

const LABEL: Record<OptionalLedgerColumn, MessageKey> = {
  voucher: "ledger.colVoucher",
  type: "ledger.colIncomeMark",
  category: "ledger.colCategory",
  net: "ledger.colNet",
  vat: "ledger.colVat",
}

/** Chooses which optional ledger columns are shown (§8.4). */
export function ColumnsMenu() {
  const f = useFormatters()
  const hidden = useBookStore((s) => s.ledgerHidden)
  const setColumn = useBookStore((s) => s.setLedgerColumn)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <Columns3Icon data-icon="inline-start" />
            {f.t("ledger.columns")}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{f.t("ledger.columns")}</DropdownMenuLabel>
          {OPTIONAL_LEDGER_COLUMNS.map((column) => (
            <DropdownMenuCheckboxItem
              key={column}
              checked={!hidden.includes(column)}
              onCheckedChange={(shown) => setColumn(column, shown)}
            >
              {f.t(LABEL[column])}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
