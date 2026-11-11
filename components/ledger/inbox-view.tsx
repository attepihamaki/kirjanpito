"use client"

import * as React from "react"
import { CameraIcon, InboxIcon, Trash2Icon, UploadIcon } from "lucide-react"

import { BusyIcon } from "@/components/common/busy-button"
import { SearchInput } from "@/components/common/filter-controls"
import { Money } from "@/components/common/money"
import { Pill } from "@/components/common/pill"
import { PageHeader } from "@/components/common/page-header"
import { useSectionHeading } from "@/components/common/sub-page-tabs"
import { Panel } from "@/components/common/panel"
import { Thumb } from "@/components/entry/attachment-grid"
import { useFormatters } from "@/components/lang-provider"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  addToInbox,
  attachInboxItem,
  bookInboxBill,
  bookInboxItem,
  deleteInboxItem,
} from "@/lib/commands/inbox-commands"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { isBill, type InboxItem } from "@/lib/domain/inbox"
import { indexCategories, type Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/** The types the pickers offer; the commands check every file again (§7.4). */
const RECEIPT_ACCEPT = "image/*,application/pdf,.pdf,.heic,.heif"

/**
 * Whether the device's main pointer is a finger, where a camera button means
 * something. A desktop browser ignores `capture` and would only open a picker.
 */
function useTouchDevice(): boolean {
  return React.useSyncExternalStore(subscribeNever, coarsePointer, notTouch)
}

const subscribeNever = () => () => {}
const coarsePointer = () =>
  window.matchMedia?.("(pointer: coarse)").matches ?? false
const notTouch = () => false

/**
 * The receipt inbox (§8.31): receipts dropped, picked or photographed now,
 * booked later. "Kirjaa" opens the entry dialog with the receipt attached,
 * and a PDF's text fills the form as it does for any receipt. A bill becomes
 * an open one to pay, and "Liitä tositteeseen" adds the file to a voucher
 * already in the book.
 */
export function InboxView() {
  const f = useFormatters()
  const heading = useSectionHeading("ledger")
  const ctx = useCommandCtx()
  const inbox = useBookStore((s) => s.inbox)
  const readOnly = useBookStore((s) => s.archiveYear !== null)
  const touch = useTouchDevice()
  const pickRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [attaching, setAttaching] = React.useState<InboxItem | null>(null)

  const add = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    try {
      await addToInbox(ctx, files)
    } finally {
      setBusy(false)
    }
  }

  const onPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    void add(files)
  }

  return (
    <>
      <PageHeader
        {...heading}
        subtitle={
          inbox.length
            ? f.t("inbox.waiting", { n: inbox.length })
            : f.t("inbox.subtitle")
        }
        actions={
          readOnly ? null : (
            <>
              {touch ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => cameraRef.current?.click()}
                >
                  <CameraIcon data-icon="inline-start" />
                  {f.t("inbox.camera")}
                </Button>
              ) : null}
              <Button disabled={busy} onClick={() => pickRef.current?.click()}>
                <BusyIcon busy={busy} icon={UploadIcon} inline />
                {f.t("inbox.add")}
              </Button>
            </>
          )
        }
      />
      <LedgerTabs />

      <input
        ref={pickRef}
        type="file"
        multiple
        accept={RECEIPT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onPicked}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onPicked}
      />

      {inbox.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>{f.t("inbox.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{f.t("inbox.emptyHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul
          aria-label={f.t("inbox.listLabel", { n: inbox.length })}
          className="grid gap-3 lg:grid-cols-2"
        >
          {inbox.map((item) => (
            <li key={item.id}>
              <InboxCard
                item={item}
                readOnly={readOnly}
                onBook={() => void bookInboxItem(ctx, item)}
                onBookBill={() => void bookInboxBill(ctx, item)}
                onAttach={() => setAttaching(item)}
                onDelete={() => void deleteInboxItem(ctx, item)}
              />
            </li>
          ))}
        </ul>
      )}
      {readOnly ? null : (
        <p className="mt-4 text-sm text-muted-foreground">
          {f.t("inbox.dropAnywhere")}
        </p>
      )}
      {attaching ? (
        <AttachDialog item={attaching} onClose={() => setAttaching(null)} />
      ) : null}
    </>
  )
}

function InboxCard({
  item,
  readOnly,
  onBook,
  onBookBill,
  onAttach,
  onDelete,
}: {
  item: InboxItem
  readOnly: boolean
  onBook: () => void
  onBookBill: () => void
  onAttach: () => void
  onDelete: () => void
}) {
  const f = useFormatters()
  const guess = item.guess
  const bill = isBill(guess)
  /*
   * What was read, as labelled fields. A bill shows its due date in place of
   * the date it was made, since that is what decides when to act on it.
   */
  const fields = [
    { label: f.t("inbox.fieldVendor"), value: guess?.vendor ?? null },
    bill && guess?.dueDate
      ? { label: f.t("inbox.fieldDue"), value: f.date(guess.dueDate) }
      : {
          label: f.t("inbox.fieldDate"),
          value: guess?.date ? f.date(guess.date) : null,
        },
    {
      label: f.t("inbox.fieldAmount"),
      value: guess?.amount != null ? f.money(guess.amount) : null,
    },
  ].filter((x): x is { label: string; value: string } => x.value !== null)
  const added = item.added
    ? f.t("inbox.addedOn", { d: f.date(item.added) })
    : f.t("inbox.addedUnknown")

  return (
    <Panel bodyClassName="flex gap-4 p-4">
      <div className="w-20 shrink-0">
        <Thumb att={item} onOpen={readOnly ? () => {} : onBook} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={item.name}>
              {item.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {guess
                ? `${added} · ${f.t(bill ? "inbox.readBill" : "inbox.readText")}`
                : added}
            </p>
          </div>
          {readOnly ? null : (
            <Button
              size="icon-sm"
              variant="ghost"
              className="-mt-1 -mr-1 shrink-0"
              aria-label={f.t("inbox.deleteNamed", { x: item.name })}
              onClick={onDelete}
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
        {fields.length ? (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-x-4 gap-y-1">
            {fields.map((field) => (
              <div key={field.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="tabular truncate text-sm font-medium">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {f.t("inbox.nothingRead")}
          </p>
        )}
        {readOnly ? null : (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" onClick={bill ? onBookBill : onBook}>
              {f.t(bill ? "inbox.bookBill" : "inbox.book")}
            </Button>
            <Button size="sm" variant="outline" onClick={onAttach}>
              {f.t("inbox.attach")}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}

/**
 * Pick the voucher an inbox item belongs to (§8.31). The vouchers whose
 * amount matches what was read come first, then the rest of the selected
 * year, newest first. A search narrows both.
 */
function AttachDialog({
  item,
  onClose,
}: {
  item: InboxItem
  onClose: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const entries = useBookStore((s) => s.entries)
  const year = useBookStore((s) => s.year)
  const cats = useBookStore((s) => s.cats)
  const [query, setQuery] = React.useState("")
  const amount = item.guess?.amount ?? null

  const list = React.useMemo(() => {
    const catMap = indexCategories(cats)
    const q = query.trim().toLowerCase()
    const pool = entries
      .filter((e) => yearOf(e.date) === year)
      .filter((e) => {
        if (!q) return true
        const cat = catMap.get(e.catId)
        return [
          e.description,
          String(e.voucher ?? ""),
          cat ? f.catName(cat) : "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      })
    const matches = (e: Entry) =>
      amount !== null && Math.abs(calcEntry(e).gross) === amount
    return [...pool]
      .sort(
        (a, b) =>
          Number(matches(b)) - Number(matches(a)) ||
          b.date.localeCompare(a.date) ||
          (b.voucher ?? 0) - (a.voucher ?? 0)
      )
      .slice(0, 50)
      .map((e) => ({ entry: e, match: matches(e) }))
  }, [entries, year, cats, query, amount, f])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{f.t("inbox.attachTitle")}</DialogTitle>
          <DialogDescription>
            {f.t("inbox.attachDescription", { x: item.name })}
          </DialogDescription>
        </DialogHeader>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={f.t("ledger.search")}
          className="w-full"
        />
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {f.t("ledger.noMatch")}
          </p>
        ) : (
          <ul className="-mx-2 flex max-h-80 flex-col overflow-y-auto">
            {list.map(({ entry, match }) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    if (attachInboxItem(ctx, item, entry)) onClose()
                  }}
                >
                  <span className="tabular w-10 shrink-0 text-right text-muted-foreground">
                    {entry.voucher ?? "–"}
                  </span>
                  <span className="tabular w-20 shrink-0 text-muted-foreground">
                    {f.date(entry.date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {entry.description || f.t("ledger.noDescription")}
                    {match ? (
                      <Pill size="sm" tone="income" className="ml-2">
                        {f.t("inbox.sameAmount")}
                      </Pill>
                    ) : null}
                  </span>
                  <Money
                    cents={calcEntry(entry).gross}
                    signed={entry.type === "expense"}
                    className="shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
