"use client"

import * as React from "react"
import { CameraIcon, InboxIcon, Trash2Icon, UploadIcon } from "lucide-react"

import { BusyIcon } from "@/components/common/busy-button"
import { DropTile } from "@/components/common/drop-tile"
import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { Thumb } from "@/components/entry/attachment-grid"
import { useFormatters } from "@/components/lang-provider"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { Button } from "@/components/ui/button"
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
  bookInboxItem,
  deleteInboxItem,
} from "@/lib/commands/inbox-commands"
import type { InboxItem } from "@/lib/domain/inbox"
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
 * and a PDF's text fills the form as it does for any receipt.
 */
export function InboxView() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const inbox = useBookStore((s) => s.inbox)
  const readOnly = useBookStore((s) => s.archiveYear !== null)
  const touch = useTouchDevice()
  const pickRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

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
        title={f.t("nav.ledger")}
        subtitle={f.t("inbox.subtitle")}
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

      {readOnly ? null : (
        <DropTile
          disabled={busy}
          onClick={() => pickRef.current?.click()}
          className="mb-6 flex w-full items-center gap-3 rounded-lg px-4 py-4"
        >
          <InboxIcon aria-hidden className="size-5 text-muted-foreground" />
          <span>
            <span className="block text-sm font-medium">
              {f.t("inbox.dropTitle")}
            </span>
            <span className="block text-sm text-muted-foreground">
              {f.t("inbox.dropHint")}
            </span>
          </span>
        </DropTile>
      )}

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
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {inbox.map((item) => (
            <li key={item.id}>
              <InboxCard
                item={item}
                readOnly={readOnly}
                onBook={() => void bookInboxItem(ctx, item)}
                onDelete={() => void deleteInboxItem(ctx, item)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function InboxCard({
  item,
  readOnly,
  onBook,
  onDelete,
}: {
  item: InboxItem
  readOnly: boolean
  onBook: () => void
  onDelete: () => void
}) {
  const f = useFormatters()
  const guess = item.guess
  const read = [
    guess?.date ? f.date(guess.date) : null,
    guess?.amount != null ? f.money(guess.amount) : null,
    guess?.vendor ?? null,
  ].filter((part): part is string => part !== null)

  return (
    <Panel bodyClassName="flex gap-3 p-3">
      <div className="w-20 shrink-0">
        <Thumb att={item} onOpen={readOnly ? () => {} : onBook} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.added
            ? f.t("inbox.addedOn", { d: f.date(item.added) })
            : f.t("inbox.addedUnknown")}
        </p>
        <p className="tabular text-sm">
          {read.length ? read.join(" · ") : f.t("inbox.nothingRead")}
        </p>
        {readOnly ? null : (
          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button size="sm" onClick={onBook}>
              {f.t("inbox.book")}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={f.t("inbox.deleteNamed", { x: item.name })}
              onClick={onDelete}
            >
              <Trash2Icon />
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}
