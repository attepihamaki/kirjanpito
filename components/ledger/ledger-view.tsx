"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import {
  SearchInput,
  TypeFilterSelect,
} from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { BankImportButton } from "@/components/bank/bank-import-button"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { PageHeader } from "@/components/common/page-header"
import { PrintButton } from "@/components/common/print-button"
import { Surface } from "@/components/common/surface"
import { TablePagination } from "@/components/common/table-pagination"
import { BulkBar } from "@/components/ledger/bulk-bar"
import { LedgerTable } from "@/components/ledger/ledger-table"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { MonthChips } from "@/components/ledger/month-chips"
import { RecurringNotice } from "@/components/ledger/recurring-dialog"
import { TotalsCards } from "@/components/ledger/totals-cards"
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
import { todayIso } from "@/lib/domain/dates"
import {
  ENTRY_CHECKS,
  flaggedEntryIds,
  type EntryCheck,
} from "@/lib/domain/entry-checks"
import { indexCategories } from "@/lib/domain/types"
import { ledgerTotals } from "@/lib/domain/vat"
import {
  entriesInPeriod,
  filterAndSortEntries,
  paginate,
  searchHitsElsewhere,
  usedCategoryIds,
} from "@/stores/selectors"
import { paidDate } from "@/lib/domain/open-items"
import { useBookStore, type CheckFilter } from "@/stores/book-store"

const CHECK_LABEL = {
  noReceipt: "ledger.withoutReceipt",
  rateMismatch: "ledger.rateMismatch",
  futureDate: "ledger.futureDate",
  zeroVatSale: "ledger.zeroVatSale",
  largeAmount: "ledger.largeAmount",
  duplicate: "ledger.duplicate",
  vatNotDeductible: "ledger.vatNotDeductible",
  privateUseNoVat: "ledger.privateUseNoVat",
  lateCash: "ledger.lateCash",
} as const satisfies Record<EntryCheck, string>

const NO_IDS: ReadonlySet<string> = new Set()

export function LedgerView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const changeLog = useBookStore((s) => s.changeLog)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const month = useBookStore((s) => s.month)
  const query = useBookStore((s) => s.ledgerQuery)
  const typeFilter = useBookStore((s) => s.ledgerType)
  const catFilter = useBookStore((s) => s.ledgerCat)
  const checkFilter = useBookStore((s) => s.ledgerCheck)
  const sort = useBookStore((s) => s.ledgerSort)
  const page = useBookStore((s) => s.ledgerPage)
  const size = useBookStore((s) => s.ledgerSize)

  const setQuery = useBookStore((s) => s.setLedgerQuery)
  const setType = useBookStore((s) => s.setLedgerType)
  const setCat = useBookStore((s) => s.setLedgerCat)
  const setCheck = useBookStore((s) => s.setLedgerCheck)
  const setPage = useBookStore((s) => s.setLedgerPage)
  const setSize = useBookStore((s) => s.setLedgerSize)
  const clearFilters = useBookStore((s) => s.clearLedgerFilters)
  const setYear = useBookStore((s) => s.setYear)
  const setMonth = useBookStore((s) => s.setMonth)

  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  /*
   * The period slice drives the totals cards and the category filter's
   * options; the filtered list drives the table and the count.
   */
  const periodEntries = React.useMemo(
    () => entriesInPeriod(entries, year, month),
    [entries, year, month]
  )

  /*
   * Checked against the whole year, not the month on screen: a large amount
   * stands out against the year's entries, not against a handful (§8.4).
   */
  const flagged = React.useMemo(
    () =>
      checkFilter === "all"
        ? null
        : checkFilter === "open"
          ? new Set(
              entriesInPeriod(entries, year, 0)
                .filter((e) => paidDate(e) === null)
                .map((e) => e.id)
            )
          : flaggedEntryIds(
              checkFilter,
              entriesInPeriod(entries, year, 0),
              catMap,
              todayIso(),
              changeLog
            ),
    [checkFilter, entries, year, catMap, changeLog]
  )

  const filtered = React.useMemo(
    () =>
      filterAndSortEntries(
        periodEntries,
        catMap,
        {
          query,
          type: typeFilter,
          catId: catFilter,
          flagged,
          sort,
        },
        f.lang,
        f.collator
      ),
    [
      periodEntries,
      catMap,
      query,
      typeFilter,
      catFilter,
      flagged,
      sort,
      f.lang,
      f.collator,
    ]
  )

  const hitsElsewhere = React.useMemo(
    () => searchHitsElsewhere(entries, catMap, query, year, month, f.lang),
    [entries, catMap, query, year, month, f.lang]
  )

  /** Open a year on the search, with nothing else narrowing what it finds. */
  const showHits = (hitYear: number) => {
    clearFilters()
    setQuery(query)
    setYear(hitYear)
    setMonth(0)
  }

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

  /*
   * A filter whose category vanished when the month changed would silently
   * hide everything.
   */
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

  /*
   * The rows picked for a bulk action (§8.4). The selection belongs to the
   * period and filters it was made under, so changing either starts over and
   * the bar never acts on rows that are no longer listed.
   */
  const selectionKey = JSON.stringify([
    year,
    month,
    query,
    typeFilter,
    catFilter,
    checkFilter,
  ])
  const [pick, setPick] = React.useState<{
    key: string
    ids: ReadonlySet<string>
  }>({ key: "", ids: NO_IDS })
  const picked = pick.key === selectionKey ? pick.ids : NO_IDS
  const selectedEntries = React.useMemo(
    () => filtered.filter((e) => picked.has(e.id)),
    [filtered, picked]
  )
  const select = React.useCallback(
    (ids: readonly string[], on: boolean) => {
      setPick((prev) => {
        const next = new Set(prev.key === selectionKey ? prev.ids : NO_IDS)
        for (const id of ids) {
          if (on) next.add(id)
          else next.delete(id)
        }
        return { key: selectionKey, ids: next }
      })
    },
    [selectionKey]
  )
  const clearPicked = React.useCallback(
    () => setPick({ key: selectionKey, ids: NO_IDS }),
    [selectionKey]
  )

  /*
   * Paper gets every filtered row, not the page on screen. The flag renders
   * them all, and the effect prints once they are in the DOM.
   */
  const [printAll, setPrintAll] = React.useState(false)
  React.useEffect(() => {
    if (!printAll) return
    const done = () => setPrintAll(false)
    window.addEventListener("afterprint", done, { once: true })
    window.print()
    return () => window.removeEventListener("afterprint", done)
  }, [printAll])

  const view = paginate(filtered, page, size)
  const hasFilters =
    query.trim() !== "" ||
    typeFilter !== "all" ||
    catFilter !== "all" ||
    checkFilter !== "all"

  /*
   * A month with nothing in it has nothing to search or filter, so the
   * toolbar goes with the table: a row of controls that cannot change the
   * result reads as if the filters were what emptied the page.
   */
  const periodEmpty = periodEntries.length === 0
  const periodLabel =
    month === 0
      ? `${f.t("ledger.wholeYear")} ${year}`
      : `${f.month(month - 1)} ${year}`

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title={f.t("nav.ledger")} subtitle={periodLabel} />
        <LedgerTabs />
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{f.t("ledger.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{f.t("ledger.emptyBody")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewEntryButton />
            <BankImportButton />
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
          <>
            <PrintButton onPrint={() => setPrintAll(true)} />
            <BankImportButton />
            <NewEntryButton />
          </>
        }
      />
      <div className="print-hidden">
        <LedgerTabs />
      </div>

      <div className="flex flex-col gap-4">
        <div className="print-hidden flex flex-col gap-4 empty:hidden">
          <MonthChips />
          <RecurringNotice />
        </div>
        <TotalsCards totals={totals} />

        {periodEmpty ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {f.t("ledger.noEntriesFor", { p: periodLabel })}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="print-hidden flex flex-wrap items-center gap-2">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={f.t("ledger.search")}
              />

              <TypeFilterSelect value={typeFilter} onChange={setType} />

              <OptionSelect
                options={catFilterOptions}
                value={catFilter}
                onChange={setCat}
                label={f.t("ledger.colCategory")}
                className="w-[13rem]"
              />

              <OptionSelect
                options={[
                  { value: "all", label: f.t("ledger.checkAll") },
                  { value: "open", label: f.t("ledger.openItems") },
                  ...ENTRY_CHECKS.map((check) => ({
                    value: check,
                    label: f.t(CHECK_LABEL[check]),
                  })),
                ]}
                value={checkFilter}
                onChange={(value) => setCheck(value as CheckFilter)}
                label={f.t("ledger.checkFilter")}
                className="w-[14rem]"
              />

              {hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <XIcon data-icon="inline-start" />
                  {f.t("ledger.clearFilters")}
                </Button>
              ) : null}
            </div>

            {hitsElsewhere.length > 0 ? (
              <div className="print-hidden flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{f.t("ledger.hitsElsewhere")}</span>
                {hitsElsewhere.map((hit) => (
                  <Button
                    key={hit.year}
                    variant="outline"
                    size="sm"
                    className="tabular"
                    aria-label={f.t("ledger.hitsInYear", {
                      n: hit.count,
                      y: hit.year,
                    })}
                    onClick={() => showHits(hit.year)}
                  >
                    {hit.year} ({hit.count})
                  </Button>
                ))}
              </div>
            ) : null}

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
              // `overflow-hidden` so the table's square corners stay inside the card's.
              <>
                {selectedEntries.length > 0 ? (
                  <div className="print-hidden">
                    <BulkBar selected={selectedEntries} onDone={clearPicked} />
                  </div>
                ) : null}
                <Surface className="overflow-hidden">
                  <LedgerTable
                    rows={printAll ? filtered : view.rows}
                    selected={picked}
                    onSelect={select}
                  />
                  {/* Always shown, as in the categories table: the rows-per-page
                    control is how the page length is set, so it cannot appear
                    only once the list has outgrown the current length. */}
                  <div className="print-hidden">
                    <TablePagination
                      page={view.page}
                      pages={view.pages}
                      size={size}
                      count={f.t("ledger.entryCount", { n: view.total })}
                      onPageChange={setPage}
                      onSizeChange={setSize}
                    />
                  </div>
                </Surface>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
