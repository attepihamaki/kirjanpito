"use client"

import * as React from "react"
import {
  CircleCheckIcon,
  CopyIcon,
  PaperclipIcon,
  PencilIcon,
  SplitIcon,
  Trash2Icon,
} from "lucide-react"

import { Money, ZeroDash } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { Pill } from "@/components/common/pill"
import { SortableHeader } from "@/components/common/sortable-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { deleteEntry } from "@/lib/commands/book-commands"
import {
  markEntryPaid,
  recategorizeEntries,
  renameEntry,
} from "@/lib/commands/bulk-commands"
import { calcEntry, isShare } from "@/lib/domain/calc"
import { formatDayMonth, yearOf } from "@/lib/domain/dates"
import { viewHelp } from "@/lib/domain/field-help"
import type { OptionalLedgerColumn } from "@/lib/domain/ledger-columns"
import { entryLock } from "@/lib/domain/period-lock"
import { reversalLabel } from "@/lib/domain/reversal"
import { canSplitLine } from "@/lib/domain/split"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore, type LedgerSortKey } from "@/stores/book-store"
import {
  categoriesToMoveTo,
  compareCategories,
  selectionRange,
} from "@/stores/selectors"

/**
 * The ledger table (§8.4).
 *
 * Hand-composed rather than driven by TanStack Table: sorting, filtering and
 * pagination all live in the store (they have to, because the toolbar, the
 * month chips and the totals cards read the same state), which would leave
 * the table adapter owning nothing.
 *
 * It renders the table alone. The surface around it and the pagination under
 * it are composed by the view that owns the paging state, the way the
 * categories table sits inside its panel.
 */
export function LedgerTable({
  rows,
  receiptHits,
  selected,
  onSelect,
}: {
  rows: readonly Entry[]
  /** Rows the search found only through a receipt's text (§8.4). */
  receiptHits: ReadonlySet<string>
  /** Ids of the rows picked for a bulk action (§8.4). */
  selected: ReadonlySet<string>
  /** Add the ids to the selection, or take them out. */
  onSelect: (ids: readonly string[], on: boolean) => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const sort = useBookStore((s) => s.ledgerSort)
  const toggleSort = useBookStore((s) => s.toggleLedgerSort)
  const openDialog = useBookStore((s) => s.openDialog)
  const allEntries = useBookStore((s) => s.entries)
  const hiddenList = useBookStore((s) => s.ledgerHidden)
  const hidden = React.useMemo(() => new Set(hiddenList), [hiddenList])
  const splitVouchers = React.useMemo(
    () => splitVoucherLabels(allEntries),
    [allEntries]
  )
  const reversals = React.useMemo(
    () => reversalLabels(allEntries),
    [allEntries]
  )

  /*
   * The row last ticked or unticked by hand (§8.4). Shift with a click then
   * gives every row on the page between the two the same state.
   */
  const anchor = React.useRef<string | null>(null)
  const pick = (id: string, on: boolean, shift: boolean) => {
    const range =
      shift && anchor.current
        ? selectionRange(
            rows.map((r) => r.id),
            anchor.current,
            id
          )
        : null
    onSelect(range ?? [id], on)
    anchor.current = id
  }

  const header = (
    key: LedgerSortKey,
    label: string,
    align: "left" | "right" = "left",
    className?: string,
    helpId?: string
  ) => (
    <SortableHeader
      help={helpId ? viewHelp(helpId) : null}
      label={label}
      columnKey={key}
      active={sort?.key === key}
      dir={sort?.dir ?? 1}
      onToggle={toggleSort}
      align={align}
      className={className}
    />
  )

  return (
    /* Roomier than the default cells, which read as cramped in a ledger you
       scan down a single column of. */
    <Table density="comfortable">
      <TableHeader>
        <TableRow>
          {/* Bulk actions are a desk job; on a phone a row opens on tap. */}
          <TableHead className="hidden w-px min-[560px]:table-cell print:hidden">
            <Checkbox
              checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
              aria-label={f.t("ledger.selectPage")}
              onCheckedChange={(checked) =>
                onSelect(
                  rows.map((r) => r.id),
                  checked === true
                )
              }
            />
          </TableHead>
          {hidden.has("voucher")
            ? null
            : header(
                "voucher",
                f.t("ledger.colVoucher"),
                "right",
                "hidden w-px min-[560px]:table-cell print:table-cell"
              )}
          {header("date", f.t("ledger.colDay"))}
          {header(
            "description",
            f.t(
              hidden.has("category")
                ? "ledger.colDescription"
                : "ledger.colDescriptionCategory"
            ),
            "left",
            undefined,
            hidden.has("category") ? undefined : "ledger.category"
          )}
          {hidden.has("net")
            ? null
            : header(
                "net",
                f.t("ledger.colNet"),
                "right",
                "hidden min-[560px]:table-cell print:table-cell"
              )}
          {hidden.has("vat")
            ? null
            : header(
                "vat",
                f.t("ledger.colVat"),
                "right",
                "hidden min-[560px]:table-cell print:table-cell",
                "ledger.vat"
              )}
          {header("gross", f.t("ledger.colGross"), "right")}
          <TableHead className="hidden w-px min-[560px]:table-cell print:hidden">
            <span className="sr-only">{f.t("common.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((entry) => (
          <LedgerRow
            key={entry.id}
            entry={entry}
            hidden={hidden}
            splitWith={splitVouchers.get(entry.id)}
            reverses={reversals.reverses.get(entry.id)}
            reversedBy={reversals.reversedBy.get(entry.id)}
            inReceipt={receiptHits.has(entry.id)}
            onRename={(text) => renameEntry(ctx, entry, text)}
            onRecategorize={(catId) =>
              void recategorizeEntries(ctx, [entry], catId)
            }
            selected={selected.has(entry.id)}
            onSelect={(on, shift) => pick(entry.id, on, shift)}
            onEdit={() =>
              openDialog({ kind: "entry", mode: "edit", entryId: entry.id })
            }
            onCopy={() =>
              openDialog({ kind: "entry", mode: "copy", entryId: entry.id })
            }
            onSplit={() => openDialog({ kind: "split", entryId: entry.id })}
            onMarkPaid={() => void markEntryPaid(ctx, entry)}
            onDelete={() => void deleteEntry(ctx, entry)}
            onViewReceipt={(index) =>
              openDialog({ kind: "viewer", entryId: entry.id, index })
            }
          />
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * The voucher numbers of each part of a split receipt, by entry id, for the
 * pill (§8.4). Only a group of two or more has one, and it counts parts on
 * every page and in every month, not just the rows on screen.
 */
function splitVoucherLabels(entries: readonly Entry[]): Map<string, string> {
  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    if (e.split === undefined) continue
    const parts = groups.get(e.split)
    if (parts) parts.push(e)
    else groups.set(e.split, [e])
  }
  const out = new Map<string, string>()
  for (const parts of groups.values()) {
    if (parts.length < 2) continue
    const label = parts
      .map((e) => e.voucher)
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b)
      .join(", ")
    for (const e of parts) out.set(e.id, label)
  }
  return out
}

/**
 * What each end of a reversal shows in the pill (§8.4): for a reversing entry
 * the voucher it reverses, for a reversed one the vouchers that reverse it.
 * Looked up over the whole book, since the other end may be on another page,
 * in another month or in another year.
 */
function reversalLabels(entries: readonly Entry[]): {
  reverses: Map<string, string>
  reversedBy: Map<string, string>
} {
  const reverses = new Map<string, string>()
  const reversedBy = new Map<string, string[]>()
  const byId = new Map(entries.map((e) => [e.id, e]))
  for (const e of entries) {
    const target = e.reverses === undefined ? undefined : byId.get(e.reverses)
    if (!target) continue
    const year = yearOf(e.date)
    reverses.set(e.id, reversalLabel(target, year) || "–")
    const list = reversedBy.get(target.id)
    const label = reversalLabel(e, yearOf(target.date)) || "–"
    if (list) list.push(label)
    else reversedBy.set(target.id, [label])
  }
  return {
    reverses,
    reversedBy: new Map(
      [...reversedBy].map(([id, labels]) => [id, labels.join(", ")])
    ),
  }
}

function LedgerRow({
  entry,
  hidden,
  splitWith,
  reverses,
  reversedBy,
  inReceipt,
  onRename,
  onRecategorize,
  selected,
  onSelect,
  onEdit,
  onCopy,
  onSplit,
  onMarkPaid,
  onDelete,
  onViewReceipt,
}: {
  entry: Entry
  /** Optional columns the user has hidden (§8.4). */
  hidden: ReadonlySet<OptionalLedgerColumn>
  /** The voucher numbers of the whole split this entry is part of, if any. */
  splitWith: string | undefined
  /** The voucher this entry reverses, if any. */
  reverses: string | undefined
  /** The vouchers that reverse this entry, if any. */
  reversedBy: string | undefined
  /** The search matched the text of a receipt and nothing else on the row. */
  inReceipt: boolean
  /** Commit new description text typed in the row. */
  onRename: (text: string) => void
  onRecategorize: (catId: string) => void
  selected: boolean
  /** `shift` is held when the box is ticked with Shift down, for a range. */
  onSelect: (on: boolean, shift: boolean) => void
  onEdit: () => void
  onCopy: () => void
  onSplit: () => void
  onMarkPaid: () => void
  onDelete: () => void
  onViewReceipt: (index: number) => void
}) {
  const f = useFormatters()
  // Whether Shift was down on the press that is about to tick the box.
  const shift = React.useRef(false)
  const { net, vat, gross } = calcEntry(entry)
  const income = entry.type === "income"
  const attachments = entry.atts ?? []
  const allCats = useBookStore((s) => s.cats)
  const vatFiled = useBookStore((s) => s.vatFiled)
  const yearsArchived = useBookStore((s) => s.yearsArchived)
  const form5Filed = useBookStore((s) => s.form5Filed)
  const traderType = useBookStore((s) => s.traderType)
  const invoices = useBookStore((s) => s.invoices)
  const vatCash = useBookStore((s) => s.vatCash)
  const catMap = React.useMemo(() => indexCategories(allCats), [allCats])
  /*
   * The menu hides what a locked voucher refuses (§8.11). Marking paid stays,
   * since the payment date is the one field a lock leaves open.
   */
  const locked =
    entryLock(
      entry,
      { vatFiled, yearsArchived, form5Filed, traderType, invoices, vatCash },
      catMap
    ) !== null
  const canSplit =
    !locked && canSplitLine(entry.catId, catMap, entry.euPurchase)
  /*
   * The categories a row can move to are the bulk bar's (§8.4), plus its own
   * even if disabled.
   */
  const categoryOptions = React.useMemo(() => {
    const list = categoriesToMoveTo(allCats, entry.type, !!entry.euPurchase)
    const own = allCats.find((c) => c.id === entry.catId)
    if (own && !list.includes(own)) list.push(own)
    return list
      .sort((x, y) =>
        compareCategories(x, y, (p, q) =>
          f.collator.compare(f.catName(p), f.catName(q))
        )
      )
      .map((c) => ({ value: c.id, label: f.catLabel(c) }))
  }, [allCats, entry.type, entry.euPurchase, entry.catId, f])
  const [editingDescription, setEditingDescription] = React.useState(false)
  // Escape blurs the field to leave it, and the blur must not save.
  const cancelled = React.useRef(false)

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <TableRow
            tabIndex={0}
            onClick={onEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget === e.target) {
                e.preventDefault()
                onEdit()
              }
            }}
            className="focus-ring cursor-pointer"
            data-state={selected ? "selected" : undefined}
          />
        }
      >
        {/* Its own cell, so a click on the box does not open the entry. */}
        <TableCell
          className="hidden min-[560px]:table-cell print:hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => {
            shift.current = e.shiftKey
            // A Shift-press would otherwise select the text of every row it spans.
            if (e.shiftKey) e.preventDefault()
          }}
          onKeyDownCapture={(e) => (shift.current = e.shiftKey)}
        >
          <Checkbox
            checked={selected}
            aria-label={f.t("ledger.selectRow", {
              x: entry.description || f.t("ledger.noDescription"),
            })}
            onCheckedChange={(checked) => {
              onSelect(checked === true, shift.current)
              shift.current = false
            }}
          />
        </TableCell>

        {hidden.has("voucher") ? null : (
          <TableCell className="tabular hidden text-right text-muted-foreground min-[560px]:table-cell print:table-cell">
            {entry.voucher}
          </TableCell>
        )}

        {/* The year is the page's, so the day and month say it all. */}
        <TableCell className="tabular whitespace-nowrap">
          <time dateTime={entry.date} title={f.date(entry.date)}>
            {formatDayMonth(entry.date, f.lang)}
          </time>
        </TableCell>

        <TableCell className="group/desc max-w-[30rem]">
          {editingDescription ? (
            <Input
              autoFocus
              defaultValue={entry.description}
              aria-label={f.t("ledger.colDescription")}
              className="h-8"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") {
                  cancelled.current = true
                  e.currentTarget.blur()
                }
              }}
              onBlur={(e) => {
                setEditingDescription(false)
                if (cancelled.current) cancelled.current = false
                else onRename(e.currentTarget.value)
              }}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              {/*
               * Income is the exception in a ledger of costs, so it alone is
               * marked; the signed amounts tell the rest (§8.4).
               */}
              {income && !hidden.has("type") ? (
                <Pill tone="income" size="sm" className="shrink-0 font-medium">
                  {f.t("common.income")}
                </Pill>
              ) : null}
              <span
                className={cn(
                  "truncate",
                  !entry.description && "text-muted-foreground"
                )}
              >
                {entry.description || f.t("ledger.noDescription")}
                {entry.paidOn === null ? (
                  <Pill size="sm" className="ml-2">
                    {f.t("ledger.openPill")}
                  </Pill>
                ) : null}
                {splitWith ? (
                  <Pill size="sm" className="ml-2">
                    {f.t("ledger.splitPill", { v: splitWith })}
                  </Pill>
                ) : null}
                {reverses ? (
                  <Pill size="sm" className="ml-2">
                    {f.t("ledger.reversesPill", { v: reverses })}
                  </Pill>
                ) : null}
                {reversedBy ? (
                  <Pill size="sm" className="ml-2">
                    {f.t("ledger.reversedByPill", { v: reversedBy })}
                  </Pill>
                ) : null}
                {entry.euPurchase ? (
                  <Pill size="sm" className="ml-2">
                    {f.t(
                      entry.euPurchase === "import"
                        ? "ledger.importPill"
                        : entry.euPurchase === "reverse"
                          ? "ledger.reversePill"
                          : "ledger.euPill"
                    )}
                  </Pill>
                ) : null}
                {inReceipt ? (
                  <Pill size="sm" className="ml-2">
                    {f.t("ledger.inReceiptPill")}
                  </Pill>
                ) : null}
                {isShare(entry.share) ? (
                  <Pill size="sm" className="ml-2">
                    {f.t("ledger.sharePill", { p: `${entry.share} %` })}
                  </Pill>
                ) : null}
                {(entry.tags ?? []).map((tag) => (
                  <Pill key={tag} size="sm" className="ml-2">
                    #{tag}
                  </Pill>
                ))}
              </span>
              {attachments.length ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="print:hidden"
                  aria-label={f.t("receipt.count", { n: attachments.length })}
                  title={f.t("receipt.count", { n: attachments.length })}
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewReceipt(0)
                  }}
                >
                  <PaperclipIcon />
                  {attachments.length > 1 ? (
                    <span className="tabular text-[0.65rem]">
                      {attachments.length}
                    </span>
                  ) : null}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover/desc:opacity-100 focus-visible:opacity-100 print:hidden"
                aria-label={f.t("ledger.editDescription")}
                title={f.t("ledger.editDescription")}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingDescription(true)
                }}
              >
                <PencilIcon />
              </Button>
            </div>
          )}
          {/*
           * The category under the description, as text that opens the list
           * of categories (§8.4). Its own box for clicks, so picking one does
           * not open the entry.
           */}
          {hidden.has("category") ? null : (
            <div
              className="mt-0.5 flex min-w-0 items-center gap-2 text-xs"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <OptionSelect
                options={categoryOptions}
                value={entry.catId}
                label={f.t("ledger.colCategory")}
                className="h-auto! w-auto min-w-0 justify-start rounded-sm border-transparent bg-transparent! p-0 text-left text-xs whitespace-normal text-muted-foreground hover:text-foreground hover:underline *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:block print:text-foreground [&>svg]:hidden"
                onChange={onRecategorize}
              />
              {attachments.length === 0 ? (
                <Pill size="sm" tone="warning" className="shrink-0">
                  {f.t("ledger.noReceiptPill")}
                </Pill>
              ) : null}
            </div>
          )}
        </TableCell>

        {hidden.has("net") ? null : (
          <TableCell className="hidden text-right min-[560px]:table-cell print:table-cell">
            <Money cents={net} signed={!income} />
          </TableCell>
        )}

        {hidden.has("vat") ? null : (
          <TableCell className="hidden text-right min-[560px]:table-cell print:table-cell">
            {/* The rate shows on hover and on paper, so the column stays one figure wide. */}
            {entry.vatRate ? (
              <span title={f.rate(entry.vatRate)}>
                <Money cents={vat} signed={!income} />
                <span className="sr-only print:not-sr-only print:ml-1 print:text-[0.7rem]">
                  {f.rate(entry.vatRate)}
                </span>
              </span>
            ) : (
              <ZeroDash />
            )}
          </TableCell>
        )}

        <TableCell className="text-right font-medium">
          <Money cents={gross} signed={!income} />
        </TableCell>

        <TableCell className="hidden min-[560px]:table-cell print:hidden">
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("entry.editTitle")}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <PencilIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("ledger.copyAsNew")}
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
            >
              <CopyIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={f.t("ledger.deleteEntry")}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2Icon />
            </Button>
          </div>
        </TableCell>
      </ContextMenuTrigger>
      {/* The popup is portalled, but React still bubbles its events to the row. */}
      <ContextMenuContent
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ContextMenuItem onClick={onEdit}>
          <PencilIcon />
          {f.t("entry.editTitle")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy}>
          <CopyIcon />
          {f.t("entry.copyAction")}
        </ContextMenuItem>
        {canSplit ? (
          <ContextMenuItem onClick={onSplit}>
            <SplitIcon />
            {f.t("entry.splitAction")}
          </ContextMenuItem>
        ) : null}
        {entry.paidOn === null ? (
          <ContextMenuItem onClick={onMarkPaid}>
            <CircleCheckIcon />
            {f.t("ledger.markPaid")}
          </ContextMenuItem>
        ) : null}
        {locked ? null : (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              {f.t("entry.deleteAction")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
