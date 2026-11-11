"use client"

import * as React from "react"
import { ListFilterIcon, PlusIcon, XIcon } from "lucide-react"

import {
  SearchInput,
  TypeFilterSelect,
} from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { BankImportButton } from "@/components/bank/bank-import-button"
import { BankSyncButton } from "@/components/bank/bank-sync-button"
import { NewEntryButton } from "@/components/common/new-entry-button"
import { PageHeader } from "@/components/common/page-header"
import { PrintButton } from "@/components/common/print-button"
import { Surface } from "@/components/common/surface"
import { TablePagination } from "@/components/common/table-pagination"
import { BulkBar } from "@/components/ledger/bulk-bar"
import { ColumnsMenu } from "@/components/ledger/columns-menu"
import { LedgerList } from "@/components/ledger/ledger-list"
import { LedgerTable } from "@/components/ledger/ledger-table"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { MonthChips } from "@/components/ledger/month-chips"
import { RecurringNotice } from "@/components/ledger/recurring-dialog"
import { TotalsCards } from "@/components/ledger/totals-cards"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/use-mobile"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useFormatters } from "@/components/lang-provider"
import { useVatBasisEntries } from "@/hooks/use-tax-basis"
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
  receiptOnlyHits,
  searchHitsElsewhere,
  usedCategoryIds,
} from "@/stores/selectors"
import { paidDate } from "@/lib/domain/open-items"
import { allTags, tagKey } from "@/lib/domain/tags"
import { useBookStore, type CheckFilter } from "@/stores/book-store"
import { useReceiptHashStore } from "@/stores/receipt-hash-store"
import { useReceiptTextStore } from "@/stores/receipt-text-store"

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
  smallAsset: "ledger.smallAsset",
  largeExpense: "ledger.largeExpense",
} as const satisfies Record<EntryCheck, string>

const NO_IDS: ReadonlySet<string> = new Set()

export function LedgerView() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const changeLog = useBookStore((s) => s.changeLog)
  const receiptHashes = useReceiptHashStore((s) => s.hashes)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const month = useBookStore((s) => s.month)
  const query = useBookStore((s) => s.ledgerQuery)
  const receiptText = useReceiptTextStore((s) => s.texts)
  const typeFilter = useBookStore((s) => s.ledgerType)
  const catFilter = useBookStore((s) => s.ledgerCat)
  const tagFilter = useBookStore((s) => s.ledgerTag)
  const checkFilter = useBookStore((s) => s.ledgerCheck)
  const sort = useBookStore((s) => s.ledgerSort)
  const page = useBookStore((s) => s.ledgerPage)
  const size = useBookStore((s) => s.ledgerSize)

  const setQuery = useBookStore((s) => s.setLedgerQuery)
  const setType = useBookStore((s) => s.setLedgerType)
  const setCat = useBookStore((s) => s.setLedgerCat)
  const setTag = useBookStore((s) => s.setLedgerTag)
  const setCheck = useBookStore((s) => s.setLedgerCheck)
  const setPage = useBookStore((s) => s.setLedgerPage)
  const setSize = useBookStore((s) => s.setLedgerSize)
  const clearFilters = useBookStore((s) => s.clearLedgerFilters)
  const setYear = useBookStore((s) => s.setYear)
  const setMonth = useBookStore((s) => s.setMonth)
  const openDialog = useBookStore((s) => s.openDialog)
  const readOnly = useBookStore((s) => s.archiveYear !== null)

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
              changeLog,
              receiptHashes
            ),
    [checkFilter, entries, year, catMap, changeLog, receiptHashes]
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
          tag: tagFilter,
          flagged,
          sort,
          receiptText,
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
      tagFilter,
      flagged,
      sort,
      receiptText,
      f.lang,
      f.collator,
    ]
  )

  const receiptHits = React.useMemo(
    () => receiptOnlyHits(filtered, catMap, query, f.lang, receiptText),
    [filtered, catMap, query, receiptText, f.lang]
  )

  const hitsElsewhere = React.useMemo(
    () =>
      searchHitsElsewhere(
        entries,
        catMap,
        query,
        year,
        month,
        f.lang,
        receiptText
      ),
    [entries, catMap, query, year, month, f.lang, receiptText]
  )

  /** Open a year on the search, with nothing else narrowing what it finds. */
  const showHits = (hitYear: number) => {
    clearFilters()
    setQuery(query)
    setYear(hitYear)
    setMonth(0)
  }

  const vatEntries = useVatBasisEntries()
  const totals = React.useMemo(
    () =>
      ledgerTotals(
        periodEntries,
        catMap,
        entriesInPeriod(vatEntries, year, month)
      ),
    [periodEntries, catMap, vatEntries, year, month]
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

  // Only tags used in this period, like the categories.
  const usedTags = React.useMemo(() => allTags(periodEntries), [periodEntries])

  React.useEffect(() => {
    if (
      tagFilter !== "all" &&
      !usedTags.some((t) => tagKey(t) === tagKey(tagFilter))
    ) {
      setTag("all")
    }
  }, [tagFilter, usedTags, setTag])

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
    tagFilter,
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
    tagFilter !== "all" ||
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

  /*
   * The selects of the toolbar (§8.4). On a phone they sit in a sheet behind
   * "Suodata", so the first entry is not pushed a screen down.
   */
  const phone = useIsPhone()
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const activeFilters = [typeFilter, catFilter, tagFilter, checkFilter].filter(
    (v) => v !== "all"
  ).length
  const filters = (
    <>
      <TypeFilterSelect value={typeFilter} onChange={setType} />

      <OptionSelect
        options={catFilterOptions}
        value={catFilter}
        onChange={setCat}
        label={f.t("ledger.colCategory")}
        className="w-[13rem]"
      />

      {usedTags.length ? (
        <OptionSelect
          options={[
            { value: "all", label: f.t("ledger.allTags") },
            ...usedTags.map((t) => ({ value: t, label: t })),
          ]}
          value={tagFilter}
          onChange={setTag}
          label={f.t("ledger.tagFilter")}
          className="w-[11rem]"
        />
      ) : null}

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
    </>
  )

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
            <BankSyncButton />
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
            <BankSyncButton />
            <NewEntryButton className="max-sm:hidden" />
          </>
        }
      />
      <div className="print-hidden">
        <LedgerTabs />
      </div>
      {/* On a phone "Uusi tosite" floats over the list, within reach of a thumb. */}
      <Button
        size="icon"
        className="print-hidden fixed right-4 bottom-4 z-40 size-14 rounded-2xl shadow-lg sm:hidden [&_svg:not([class*='size-'])]:size-6"
        aria-label={f.t("ledger.newEntry")}
        disabled={readOnly}
        onClick={() => openDialog({ kind: "entry", mode: "new" })}
      >
        <PlusIcon />
      </Button>

      <div className="flex flex-col gap-4 max-sm:pb-20">
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
                className="max-sm:w-auto max-sm:min-w-0 max-sm:flex-1"
              />

              {phone ? (
                <Button
                  variant="outline"
                  aria-haspopup="dialog"
                  onClick={() => setFiltersOpen(true)}
                >
                  <ListFilterIcon data-icon="inline-start" />
                  {f.t("ledger.filter")}
                  {activeFilters ? (
                    <span className="tabular rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                      {activeFilters}
                    </span>
                  ) : null}
                </Button>
              ) : (
                <>
                  {filters}
                  <ColumnsMenu />
                </>
              )}

              {hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <XIcon data-icon="inline-start" />
                  {f.t("ledger.clearFilters")}
                </Button>
              ) : null}
            </div>

            {phone ? (
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetContent side="bottom" className="rounded-t-xl">
                  <SheetHeader>
                    <SheetTitle>{f.t("ledger.filter")}</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 px-4 [&_[data-slot=select-trigger]]:w-full">
                    {filters}
                  </div>
                  <SheetFooter className="flex-row">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={!hasFilters}
                      onClick={clearFilters}
                    >
                      {f.t("ledger.clearFilters")}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setFiltersOpen(false)}
                    >
                      {f.t("ledger.filterShow", { n: view.total })}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ) : null}

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
                  {phone && !printAll ? (
                    <LedgerList rows={view.rows} />
                  ) : (
                    <LedgerTable
                      rows={printAll ? filtered : view.rows}
                      receiptHits={receiptHits}
                      selected={picked}
                      onSelect={select}
                    />
                  )}
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
