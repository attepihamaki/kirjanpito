"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { Money } from "@/components/common/money"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { StatementInfo } from "@/lib/domain/bank-csv"
import type { Reconciliation } from "@/lib/domain/bank-reconcile"
import { useBookStore } from "@/stores/book-store"

/**
 * The statement set against the book (§8.16), under the review list. It reads
 * the book as it will be once the rows planned for booking are booked, so it
 * changes as the user picks actions. Closed to start with: the review list is
 * the dialog's work, and this is the check after it.
 */
export function BankReconcile({
  result,
  statement,
}: {
  /** The statement set against the book as it will be once booked. */
  result: Reconciliation | null
  statement: StatementInfo | undefined
}) {
  const f = useFormatters()
  const bankBalance = useBookStore((s) => s.bankBalance)
  const setBankBalance = useBookStore((s) => s.setBankBalance)
  const [open, setOpen] = React.useState(false)

  if (!result) return null

  const agrees = result.difference === 0 && !result.statementGap
  const closing = statement?.closing
  const closingTaken =
    !!closing &&
    bankBalance?.amount === closing.amount &&
    bankBalance.date === closing.date

  const line = (label: string, cents: number, strong = false) => (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-medium" : undefined}>
        <Money cents={cents} />
      </dd>
    </div>
  )

  return (
    <section className="rounded-md border text-sm">
      <Button
        variant="ghost"
        className="w-full justify-start rounded-md"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {f.t("bank.reconcileTitle")}
        <span
          className={
            agrees
              ? "ml-auto font-normal text-income"
              : "ml-auto font-normal text-expense"
          }
        >
          {agrees
            ? f.t("bank.reconcileAgrees")
            : f.t("bank.reconcileDiffers", { n: f.money(result.difference) })}
        </span>
      </Button>

      {open ? (
        <div className="flex flex-col gap-4 border-t px-4 py-3">
          <p className="text-muted-foreground">
            {f.t("bank.reconcileHint", {
              from: f.date(result.from),
              to: f.date(result.to),
            })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="flex flex-col gap-1">
              {statement?.opening
                ? line(
                    f.t("bank.reconcileOpening", {
                      d: f.date(statement.opening.date),
                    }),
                    statement.opening.amount
                  )
                : null}
              {line(f.t("bank.reconcileRows"), result.statementMovement, true)}
              {closing
                ? line(
                    f.t("bank.reconcileClosing", { d: f.date(closing.date) }),
                    closing.amount
                  )
                : null}
            </dl>
            <dl className="flex flex-col gap-1">
              {line(f.t("bank.reconcileBook"), result.bookMovement, true)}
              {line(f.t("bank.reconcileDifference"), result.difference, true)}
            </dl>
          </div>

          {result.statementGap ? (
            <p className="text-expense">
              {f.t("bank.reconcileGap", { n: f.money(result.statementGap) })}
            </p>
          ) : null}

          {result.rowsNotInBook.length > 0 ? (
            <p>
              {f.t("bank.reconcileRowsMissing", {
                n: result.rowsNotInBook.length,
              })}
            </p>
          ) : null}

          {result.paymentsNotOnStatement.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p>{f.t("bank.reconcileEntriesMissing")}</p>
              <ul className="flex flex-col gap-0.5">
                {result.paymentsNotOnStatement.map((p) => (
                  <li
                    key={p.entries[0].id}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="truncate">
                      {f.t("bank.reconcileEntry", {
                        v: p.entries[0].voucher ?? "–",
                        d: f.date(p.date),
                        s: p.entries[0].description || "–",
                      })}
                    </span>
                    <Money cents={p.amount} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {closing && !closingTaken ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                setBankBalance({ amount: closing.amount, date: closing.date })
                toast.add({ title: f.t("bank.reconcileBalanceSet") })
              }}
            >
              {f.t("bank.reconcileUseClosing", { n: f.money(closing.amount) })}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
