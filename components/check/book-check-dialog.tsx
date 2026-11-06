"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { CheckRow } from "@/components/common/check-row"
import {
  BOOK_LIMIT_TEXT,
  vatPeriodLimitText,
  vatThresholdText,
  type BookLimitRuleId,
} from "@/components/common/limit-text"
import { useFormatters } from "@/components/lang-provider"
import { useDescribeYearEnd } from "@/components/statement/use-describe-year-end"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToday } from "@/hooks/use-today"
import { bookCheck, type BookFinding } from "@/lib/domain/book-check"
import { yearOf } from "@/lib/domain/dates"
import { indexCategories } from "@/lib/domain/types"
import type {
  VatPeriodOverLimit,
  VatThreshold,
} from "@/lib/domain/vat-threshold"
import { useBookStore } from "@/stores/book-store"

/**
 * "Check my book" (§8.23): every rule over the whole book, grouped by year. It
 * holds no state of its own. The list is worked out when the dialog opens and
 * follows the book while it is open.
 */
export function BookCheckDialog() {
  const open = useBookStore((s) => s.dialog.kind === "check-book")
  if (!open) return null
  return <BookCheckForm />
}

function BookCheckForm() {
  const f = useFormatters()
  const today = useToday()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const describeYearEnd = useDescribeYearEnd()

  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const dirty = useBookStore((s) => s.dirty)
  const traderType = useBookStore((s) => s.traderType)
  const vatPeriod = useBookStore((s) => s.vatPeriod)
  const bookStart = useBookStore((s) => s.bookStart)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const changeLog = useBookStore((s) => s.changeLog)
  const assetOpening = useBookStore((s) => s.assetOpening)
  const loanOpening = useBookStore((s) => s.loanOpening)
  const yearEnd = useBookStore((s) => s.yearEnd)

  const findings = React.useMemo(
    () =>
      bookCheck({
        entries,
        cats: indexCategories(cats),
        today,
        dirty,
        traderType,
        vatPeriod,
        bookStart,
        vatFiled,
        changeLog,
        assetOpening,
        loanOpening,
        yearEnd,
      }),
    [
      entries,
      cats,
      today,
      dirty,
      traderType,
      vatPeriod,
      bookStart,
      vatFiled,
      changeLog,
      assetOpening,
      loanOpening,
      yearEnd,
    ]
  )

  const count = (severity: BookFinding["finding"]["severity"]) =>
    findings.filter((b) => b.finding.severity === severity).length

  /* The findings arrive grouped, so a group is a run of equal years. */
  const groups = React.useMemo(() => {
    const out: { year: number | null; items: BookFinding[] }[] = []
    for (const b of findings) {
      const last = out.at(-1)
      if (last && last.year === b.year) last.items.push(b)
      else out.push({ year: b.year, items: [b] })
    }
    return out
  }, [findings])

  function describe(b: BookFinding) {
    switch (b.set) {
      case "yearEnd":
        return describeYearEnd(b.finding, b.year ?? yearOf(today))
      case "bookLimits": {
        const text = BOOK_LIMIT_TEXT[b.finding.ruleId as BookLimitRuleId]
        return {
          title: f.t(text.title, { y: b.finding.data.year }),
          sub: f.t(text.sub),
        }
      }
      case "vatLimits":
        return b.finding.ruleId === "vatPeriodLimit"
          ? vatPeriodLimitText(f, b.finding.data as VatPeriodOverLimit)
          : vatThresholdText(f, b.finding.data as VatThreshold)
      case "form5":
        return {
          title: f.t("check.form5", { codes: b.finding.data.codes.join(", ") }),
          sub: f.t("check.form5Sub", { source: b.finding.source }),
        }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{f.t("check.title")}</DialogTitle>
          <DialogDescription>{f.t("check.intro")}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {findings.length ? (
            <>
              <p className="text-sm font-medium">
                {f.t("check.summary", {
                  b: count("blocker"),
                  w: count("warn"),
                  i: count("info"),
                })}
              </p>
              {groups.map((g) => (
                <section
                  key={g.year ?? "book"}
                  className="flex flex-col gap-2"
                  aria-label={
                    g.year === null
                      ? f.t("check.book")
                      : f.t("check.year", { y: g.year })
                  }
                >
                  <h3 className="font-heading text-sm font-semibold">
                    {g.year === null
                      ? f.t("check.book")
                      : f.t("check.year", { y: g.year })}
                  </h3>
                  <ul className="divide-y rounded-lg border">
                    {g.items.map((b, i) => {
                      const d = describe(b)
                      return (
                        <CheckRow
                          key={`${b.set}-${b.finding.ruleId}-${i}`}
                          severity={b.finding.severity}
                          title={d.title}
                          sub={d.sub}
                          action={"action" in d ? d.action : undefined}
                        />
                      )
                    })}
                  </ul>
                </section>
              ))}
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-income">
              <CheckIcon aria-hidden className="size-4" />
              {f.t("check.allClear")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={closeDialog}>{f.t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
