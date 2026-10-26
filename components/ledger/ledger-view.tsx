"use client"

import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"

import {
  SearchInput,
  TypeFilterToggle,
} from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { PageHeader } from "@/components/common/page-header"
import { TablePagination } from "@/components/common/table-pagination"
import { LedgerTable } from "@/components/ledger/ledger-table"
import { MonthChips } from "@/components/ledger/month-chips"
import { TotalsStrip } from "@/components/ledger/totals-strip"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useFormatters } from "@/components/lang-provider"
import { categoryName } from "@/lib/domain/accounts"
import { indexCategories } from "@/lib/domain/types"
import { ledgerTotals } from "@/lib/domain/vat"
import {
  entriesInPeriod,
  filterAndSortEntries,
  paginate,
  usedCategoryIds,
} from "@/stores/selectors"
import { useBookStore } from "@/stores/book-store"

export function LedgerView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const month = useBookStore((s) => s.month)
  const query = useBookStore((s) => s.ledgerQuery)
  const typeFilter = useBookStore((s) => s.ledgerType)
  const catFilter = useBookStore((s) => s.ledgerCat)
  const sort = useBookStore((s) => s.ledgerSort)
  const page = useBookStore((s) => s.ledgerPage)
  const size = useBookStore((s) => s.ledgerSize)

  const setQuery = useBookStore((s) => s.setLedgerQuery)
  const setType = useBookStore((s) => s.setLedgerType)
  const setCat = useBookStore((s) => s.setLedgerCat)
  const setPage = useBookStore((s) => s.setLedgerPage)
  const setSize = useBookStore((s) => s.setLedgerSize)
  const clearFilters = useBookStore((s) => s.clearLedgerFilters)
  const openDialog = useBookStore((s) => s.openDialog)

  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  // The period slice drives the totals strip and the category filter's
  // options; the filtered list drives the table and the count.
  const periodEntries = React.useMemo(
    () => entriesInPeriod(entries, year, month),
    [entries, year, month]
  )

  const filtered = React.useMemo(
    () =>
      filterAndSortEntries(
        periodEntries,
        catMap,
        { query, type: typeFilter, catId: catFilter, sort },
        f.lang,
        f.collator
      ),
    [
      periodEntries,
      catMap,
      query,
      typeFilter,
      catFilter,
      sort,
      f.lang,
      f.collator,
    ]
  )

  const totals = React.useMemo(
    () => ledgerTotals(periodEntries, catMap),
    [periodEntries, catMap]
  )

  // Only categories actually used in this period (§8.4).
  const usedCats = React.useMemo(() => {
    const ids = usedCategoryIds(periodEntries)
    return cats
      .filter((c) => ids.has(c.id))
      .sort((a, b) =>
        f.collator.compare(categoryName(a, f.lang), categoryName(b, f.lang))
      )
  }, [periodEntries, cats, f.collator, f.lang])

  // A filter whose category vanished when the month changed would silently
  // hide everything.
  React.useEffect(() => {
    if (catFilter !== "all" && !usedCats.some((c) => c.id === catFilter)) {
      setCat("all")
    }
  }, [catFilter, usedCats, setCat])

  const catFilterOptions = React.useMemo(
    () => [
      { value: "all", label: f.t("ledger.allCategories") },
      ...usedCats.map((c) => ({ value: c.id, label: f.catName(c) })),
    ],
    [usedCats, f]
  )

  const view = paginate(filtered, page, size)
  const hasFilters =
    query.trim() !== "" || typeFilter !== "all" || catFilter !== "all"
  const periodLabel =
    month === 0
      ? `${f.t("ledger.wholeYear")} ${year}`
      : `${f.month(month - 1)} ${year}`

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title={f.t("nav.ledger")} subtitle={periodLabel} />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{f.t("ledger.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{f.t("ledger.emptyBody")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => openDialog({ kind: "entry", mode: "new" })}>
              <PlusIcon data-icon="inline-start" />
              {f.t("ledger.newEntry")}
            </Button>
          </EmptyContent>
        </Empty>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={f.t("nav.ledger")}
        subtitle={periodLabel}
        actions={
          <Button onClick={() => openDialog({ kind: "entry", mode: "new" })}>
            <PlusIcon data-icon="inline-start" />
            {f.t("ledger.newEntry")}
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <MonthChips />
        <TotalsStrip totals={totals} />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={f.t("ledger.search")}
            className="min-w-[14rem]"
          />

          <TypeFilterToggle value={typeFilter} onChange={setType} />

          <OptionSelect
            options={catFilterOptions}
            value={catFilter}
            onChange={setCat}
            label={f.t("ledger.colCategory")}
            className="w-[13rem]"
          />

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon data-icon="inline-start" />
              {f.t("ledger.clearFilters")}
            </Button>
          ) : null}

          <span className="ml-auto text-sm text-muted-foreground">
            {f.t("ledger.entryCount", { n: view.total })}
          </span>
        </div>

        {view.total === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{f.t("ledger.noMatch")}</EmptyTitle>
            </EmptyHeader>
            {hasFilters ? (
              <EmptyContent>
                <Button variant="outline" onClick={clearFilters}>
                  {f.t("ledger.clearFilters")}
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <>
            <LedgerTable rows={view.rows} cats={catMap} />
            {view.total > 10 || view.pages > 1 ? (
              <TablePagination
                page={view.page}
                pages={view.pages}
                size={size}
                onPageChange={setPage}
                onSizeChange={setSize}
              />
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
