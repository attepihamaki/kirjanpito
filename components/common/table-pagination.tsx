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

/** "Rivejä sivulla", "Sivu 1 / 2" and « ‹ › » (§8.4). */
export function TablePagination({
  page,
  pages,
  size,
  onPageChange,
  onSizeChange,
}: {
  page: number
  pages: number
  size: PageSize
  onPageChange: (page: number) => void
  onSizeChange: (size: PageSize) => void
}) {
  const t = useT()
  const first = page <= 1
  const last = page >= pages

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("rowsPerPage")}
        </span>
        <OptionSelect
          options={SIZE_OPTIONS}
          value={String(size)}
          onChange={(value) => onSizeChange(Number(value) as PageSize)}
          label={t("rowsPerPage")}
          size="sm"
          className="w-[4.5rem]"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="tabular text-sm text-muted-foreground">
          {t("pageOf", { p: page, n: pages })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={first}
            aria-label={t("first")}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={first}
            aria-label={t("prev")}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={last}
            aria-label={t("next")}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={last}
            aria-label={t("last")}
            onClick={() => onPageChange(pages)}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
