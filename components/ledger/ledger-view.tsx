"use client"

import * as React from "react"
import { PlusIcon, SearchIcon, XIcon } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFormatters } from "@/components/lang-provider"
import { categoryName } from "@/lib/domain/accounts"
import { indexCategories } from "@/lib/domain/types"
import { ledgerTotals } from "@/lib/domain/vat"
import {
  entriesInPeriod,
  filterAndSortEntries,
  paginate,
} from "@/stores/selectors"
import { useBookStore, type TypeFilter } from "@/stores/book-store"

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
    const ids = new Set(periodEntries.map((e) => e.catId))
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

  // Base UI needs this to render the trigger's label rather than the id.
  const catFilterItems = React.useMemo(
    () => ({
      all: f.t("catAll"),
      ...Object.fromEntries(usedCats.map((c) => [c.id, f.catName(c)])),
    }),
    [usedCats, f]
  )

  const view = paginate(filtered, page, size)
  const hasFilters =
    query.trim() !== "" || typeFilter !== "all" || catFilter !== "all"
  const periodLabel =
    month === 0
      ? `${f.t("wholeYear")} ${year}`
      : `${f.month(month - 1)} ${year}`

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title={f.t("v_kirjanpito")} subtitle={periodLabel} />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{f.t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{f.t("emptyBody")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => openDialog({ kind: "entry", mode: "new" })}>
              <PlusIcon data-icon="inline-start" />
              {f.t("newEntry")}
            </Button>
          </EmptyContent>
        </Empty>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={f.t("v_kirjanpito")}
        subtitle={periodLabel}
        actions={
          <Button onClick={() => openDialog({ kind: "entry", mode: "new" })}>
            <PlusIcon data-icon="inline-start" />
            {f.t("newEntry")}
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <MonthChips />
        <TotalsStrip totals={totals} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={f.t("search")}
              aria-label={f.t("search")}
              className="pl-8"
            />
          </div>

          <ToggleGroup
            aria-label={f.t("typeFilter")}
            value={[typeFilter]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setType(next as TypeFilter)
            }}
          >
            <ToggleGroupItem value="all">{f.t("all")}</ToggleGroupItem>
            <ToggleGroupItem value="tulo">{f.t("tulot")}</ToggleGroupItem>
            <ToggleGroupItem value="kulu">{f.t("kulut")}</ToggleGroupItem>
          </ToggleGroup>

          <Select
            value={catFilter}
            onValueChange={(value) => setCat(value ?? "all")}
            items={catFilterItems}
          >
            <SelectTrigger className="w-[13rem]" aria-label={f.t("c_cat")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{f.t("catAll")}</SelectItem>
                {usedCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {f.catName(c)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon data-icon="inline-start" />
              {f.t("clearFilters")}
            </Button>
          ) : null}

          <span className="ml-auto text-sm text-muted-foreground">
            {f.t("nEntries", { n: view.total })}
          </span>
        </div>

        {view.total === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{f.t("noMatch")}</EmptyTitle>
            </EmptyHeader>
            {hasFilters ? (
              <EmptyContent>
                <Button variant="outline" onClick={clearFilters}>
                  {f.t("clearFilters")}
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
