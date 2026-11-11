"use client"

import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty"
import { AmountInput } from "@/components/common/amount-input"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { Trash2Icon } from "lucide-react"

import { OptionSelect } from "@/components/common/option-select"
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
import { formatMoneyPlain } from "@/lib/domain/money"
import { evalAmount } from "@/lib/domain/amount-expr"
import {
  ENTRY_EVERY,
  everyOf,
  withEvery,
  type RecurringEntry,
} from "@/lib/domain/recurring"
import { everyLabel } from "@/lib/i18n/every-label"
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
    <AmountInput
      key={r.amount}
      aria-label={`${f.t("recurring.amount")}: ${r.description}`}
      className="ml-auto w-28"
      defaultValue={formatMoneyPlain(r.amount)}
      onBlur={(event) => {
        const amount = evalAmount(event.target.value)
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
 * The recurring templates (§8.5). One is made from the entry dialog; here its
 * amount, day and interval can change, for when the rent goes up. Each input commits on
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
              <TableHead>{f.t("recurring.every")}</TableHead>
              <TableHead>{f.t("recurring.from")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurring.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.description}</TableCell>
                <TableCell className="text-muted-foreground">
                  {f.catLabel(catMap.get(r.catId))}
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
                <TableCell>
                  <OptionSelect
                    size="sm"
                    className="w-36"
                    label={`${f.t("recurring.every")}: ${r.description}`}
                    value={String(everyOf(r))}
                    onChange={(v) => upsertRecurring(withEvery(r, Number(v)))}
                    options={ENTRY_EVERY.map((n) => ({
                      value: String(n),
                      label: everyLabel(f, n),
                    }))}
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
