"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"

import { OptionSelect } from "@/components/common/option-select"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import type { PageSize } from "@/stores/book-store"

const SIZES: PageSize[] = [10, 25, 50, 100]
const SIZE_OPTIONS = SIZES.map((s) => ({ value: String(s), label: String(s) }))

/**
 * The row count, "Rivejä sivulla", "Sivu 1 / 2" and « ‹ › » (§8.4).
 *
 * It is the strip at the foot of a table's surface, so it owns that strip: the
 * padding and the rule that separates it from the last row. The table body
 * drops its own last border, which would otherwise land on the surface's
 * bottom edge in the tables that end there.
 */
export function TablePagination({
  page,
  pages,
  size,
  count,
  onPageChange,
  onSizeChange,
}: {
  page: number
  pages: number
  size: PageSize
  /** How many rows the filters left, e.g. "16 kirjausta". */
  count?: string
  onPageChange: (page: number) => void
  onSizeChange: (size: PageSize) => void
}) {
  const t = useT()
  const first = page <= 1
  const last = page >= pages

  return (
    /* The count holds the left-hand end and the two control groups the right,
       so the strip reads as "what you are looking at" / "how to move". */
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-3 border-t px-4 py-3">
      {count ? (
        <span className="mr-auto text-sm text-muted-foreground">{count}</span>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("table.rowsPerPage")}
        </span>
        <OptionSelect
          options={SIZE_OPTIONS}
          value={String(size)}
          onChange={(value) => onSizeChange(Number(value) as PageSize)}
          label={t("table.rowsPerPage")}
          size="sm"
          className="w-[4.5rem]"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="tabular text-sm text-muted-foreground">
          {t("table.pageOf", { p: page, n: pages })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={first}
            aria-label={t("table.firstPage")}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={first}
            aria-label={t("table.prevPage")}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={last}
            aria-label={t("table.nextPage")}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={last}
            aria-label={t("table.lastPage")}
            onClick={() => onPageChange(pages)}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
