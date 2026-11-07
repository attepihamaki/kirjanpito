import * as React from "react"

import {
  BOOK_LIMIT_TEXT,
  vatPeriodLimitText,
  vatThresholdText,
  type BookLimitRuleId,
} from "@/components/common/limit-text"
import { useFormatters } from "@/components/lang-provider"
import {
  useDescribeYearEnd,
  type DescribedFinding,
} from "@/components/statement/use-describe-year-end"
import { useToday } from "@/hooks/use-today"
import type { BookFinding } from "@/lib/domain/book-check"
import { yearOf } from "@/lib/domain/dates"
import type {
  VatPeriodOverLimit,
  VatThreshold,
} from "@/lib/domain/vat-threshold"

/**
 * The words and the way in for any finding of the book check (§8.23), shared
 * by the check dialog and the tax return pack (§8.8).
 */
export function useDescribeFinding() {
  const f = useFormatters()
  const today = useToday()
  const describeYearEnd = useDescribeYearEnd()

  return React.useCallback(
    (b: BookFinding): DescribedFinding => {
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
            title: f.t("check.form5", {
              codes: b.finding.data.codes.join(", "),
            }),
            sub: f.t("check.form5Sub", { source: b.finding.source }),
          }
      }
    },
    [f, today, describeYearEnd]
  )
}
