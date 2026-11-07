"use client"

import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { Trash2Icon } from "lucide-react"

import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { categoryLabel } from "@/lib/domain/accounts"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import type { RecurringEntry } from "@/lib/domain/recurring"
import { indexCategories } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/**
 * A template's amount, committed on leaving the field. A value that makes no
 * sense puts the old one back.
 */
export function RecurringAmountInput({
  template: r,
}: {
  template: RecurringEntry
}) {
  const f = useFormatters()
  const upsertRecurring = useBookStore((s) => s.upsertRecurring)
  return (
    <Input
      key={r.amount}
      aria-label={`${f.t("recurring.amount")}: ${r.description}`}
      inputMode="decimal"
      className="tabular ml-auto w-28 text-right"
      defaultValue={formatMoneyPlain(r.amount)}
      onBlur={(event) => {
        const amount = parseAmount(event.target.value)
        if (amount != null && amount !== 0 && amount !== r.amount) {
          upsertRecurring({ ...r, amount })
        }
        event.target.value = formatMoneyPlain(
          amount != null && amount !== 0 ? amount : r.amount
        )
      }}
    />
  )
}

/**
 * The monthly templates (§8.5). One is made from the entry dialog; here its
 * amount and day can change, for when the rent goes up. Each input commits on
 * leaving it, and a value that makes no sense puts the old one back.
 */
export function RecurringSettings() {
  const f = useFormatters()
  const recurring = useBookStore((s) => s.recurring)
  const cats = useBookStore((s) => s.cats)
  const upsertRecurring = useBookStore((s) => s.upsertRecurring)
  const removeRecurring = useBookStore((s) => s.removeRecurring)
  const catMap = indexCategories(cats)

  const remove = (r: RecurringEntry) => {
    removeRecurring(r.id)
    const id = toast.add({
      title: f.t("recurring.deleted"),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          upsertRecurring(r)
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("recurring.settingsTitle")}
      description={f.t("recurring.settingsHint")}
    >
      {recurring.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("recurring.empty")}</EmptyDescription>
          <EmptyContent>
            <NewEntryButton />
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("recurring.description")}</TableHead>
              <TableHead>{f.t("recurring.category")}</TableHead>
              <TableHead className="text-right">
                {f.t("recurring.amount")}
              </TableHead>
              <TableHead className="text-right">
                {f.t("recurring.day")}
              </TableHead>
              <TableHead>{f.t("recurring.from")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurring.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.description}</TableCell>
                <TableCell className="text-muted-foreground">
                  {categoryLabel(catMap.get(r.catId), f.lang)}
                </TableCell>
                <TableCell className="text-right">
                  <RecurringAmountInput template={r} />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    key={r.day}
                    aria-label={`${f.t("recurring.day")}: ${r.description}`}
                    inputMode="numeric"
                    className="tabular ml-auto w-16 text-right"
                    defaultValue={r.day}
                    onBlur={(event) => {
                      const day = Number(event.target.value)
                      if (Number.isInteger(day) && day >= 1 && day <= 31) {
                        if (day !== r.day) upsertRecurring({ ...r, day })
                      } else {
                        event.target.value = String(r.day)
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                  {f.month(Number(r.from.slice(5, 7)) - 1, true)}{" "}
                  {r.from.slice(0, 4)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={f.t("recurring.remove", { x: r.description })}
                    onClick={() => remove(r)}
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
