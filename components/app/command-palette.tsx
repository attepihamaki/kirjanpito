"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { Keys } from "@/components/common/keys"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useCanSaveToFile,
  useSaveBook,
  useShortcut,
} from "@/hooks/use-save-book"
import { downloadWorkbook } from "@/lib/commands/xlsx-commands"
import { calcEntry } from "@/lib/domain/calc"
import { yearOf } from "@/lib/domain/dates"
import { formatMoneyPlain } from "@/lib/domain/money"
import {
  fold,
  matchesWords,
  queryWords,
  searchItems,
  searchesReceipts,
  snippetAround,
} from "@/lib/domain/palette-search"
import type { MessageKey } from "@/lib/i18n/messages"
import {
  APP_ROUTES,
  INVOICE_ROUTES,
  LEDGER_ROUTES,
  SETTINGS_ROUTES,
  STATEMENT_ROUTES,
  VAT_ROUTES,
} from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"
import { usePaletteStore } from "@/stores/palette-store"
import { useReceiptTextStore } from "@/stores/receipt-text-store"

/** How many entries, invoices and parties a query lists at most. */
const RESULT_LIMIT = 8

type Group =
  "actions" | "pages" | "entries" | "receipts" | "invoices" | "parties"

const GROUP_TITLE: Record<Group, MessageKey> = {
  actions: "palette.actions",
  pages: "palette.pages",
  entries: "palette.entries",
  receipts: "palette.receipts",
  invoices: "palette.invoices",
  parties: "palette.parties",
}

interface Item {
  id: string
  group: Group
  label: string
  /** A second line: a date and amount, or the section a page is in. */
  hint?: string
  keys?: string
  /** What the query is matched against. */
  text: string
  run: () => void
}

/* Every page of the app, with the section it sits under, in the sidebar's order. */
const PAGES: readonly [string, MessageKey, MessageKey][] = [
  [APP_ROUTES.overview, "nav.overview", "nav.overview"],
  [LEDGER_ROUTES.entries, "ledger.entriesTab", "nav.ledger"],
  [LEDGER_ROUTES.inbox, "inbox.tab", "nav.ledger"],
  [LEDGER_ROUTES.reconcile, "reconcile.tab", "nav.ledger"],
  [LEDGER_ROUTES.journal, "ledger.journalTab", "nav.ledger"],
  [LEDGER_ROUTES.accounts, "ledger.accountsTab", "nav.ledger"],
  [LEDGER_ROUTES.chart, "ledger.chartTab", "nav.ledger"],
  [INVOICE_ROUTES.list, "invoice.tabInvoices", "nav.sales"],
  [INVOICE_ROUTES.quotes, "quote.tab", "nav.sales"],
  [INVOICE_ROUTES.recurring, "invoice.tabRecurring", "nav.sales"],
  [INVOICE_ROUTES.aging, "invoice.tabAging", "nav.sales"],
  [INVOICE_ROUTES.payables, "invoice.tabPayables", "nav.purchases"],
  [INVOICE_ROUTES.parties, "party.tab", "nav.sales"],
  [INVOICE_ROUTES.products, "invoice.tabProducts", "nav.sales"],
  [VAT_ROUTES.sheet, "vat.sheetTab", "nav.vat"],
  [VAT_ROUTES.ec, "vat.ecTab", "nav.vat"],
  [STATEMENT_ROUTES.sheet, "statement.sheetTab", "nav.statement"],
  [STATEMENT_ROUTES.balance, "balance.tab", "nav.statement"],
  [STATEMENT_ROUTES.inventory, "inventory.tab", "nav.statement"],
  [STATEMENT_ROUTES.assets, "assets.tab", "nav.statement"],
  [STATEMENT_ROUTES.deductions, "deductions.tab", "nav.statement"],
  [STATEMENT_ROUTES.losses, "losses.tab", "nav.statement"],
  [APP_ROUTES.summary, "nav.summary", "nav.summary"],
  [APP_ROUTES.calendar, "nav.calendar", "nav.calendar"],
  [SETTINGS_ROUTES.general, "settings.general", "nav.settings"],
  [SETTINGS_ROUTES.categories, "settings.categories", "nav.settings"],
  [SETTINGS_ROUTES.recurring, "recurring.tab", "nav.settings"],
  [SETTINGS_ROUTES.calendar, "settings.calendarTab", "nav.settings"],
  [SETTINGS_ROUTES.rules, "settings.rulesTab", "nav.settings"],
  [SETTINGS_ROUTES.invoicing, "invoice.settingsTab", "nav.settings"],
]

/**
 * The command palette (§8.35), on Ctrl/⌘+K: one field that finds an action, a
 * page, an entry, an invoice or a customer or supplier, picked with the arrow
 * keys and Enter. With nothing typed it lists the actions and the pages; the
 * book's own records appear once there is something to match. Entries whose
 * fields do not match but whose receipts' text does are listed apart, with
 * the piece of the receipt that matched.
 */
export function CommandPalette({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}) {
  const f = useFormatters()
  const router = useRouter()
  const layer = usePaletteStore((s) => s.layer)
  const setLayer = usePaletteStore((s) => s.setLayer)
  const entries = useBookStore((s) => s.entries)
  const invoices = useBookStore((s) => s.invoices)
  const customers = useBookStore((s) => s.customers)
  const receiptText = useReceiptTextStore((s) => s.texts)
  /* Folded once per index change, not per keystroke: a receipt runs to 100 000 characters. */
  const foldedText = React.useMemo(
    () => new Map([...receiptText].map(([id, text]) => [id, fold(text)])),
    [receiptText]
  )
  const canSave = useCanSaveToFile()
  const save = useSaveBook()
  const shortcut = useShortcut()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLUListElement>(null)
  const open = layer === "commands"

  /*
   * The query is cleared when the palette opens, not when it closes, so the
   * list does not change under the closing animation.
   */
  const close = React.useCallback(() => setLayer("none"), [setLayer])
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery("")
      setActive(0)
    }
  }

  const items = React.useMemo<Item[]>(() => {
    const words = queryWords(query)
    const openDialog = useBookStore.getState().openDialog
    const dialog = (state: Parameters<typeof openDialog>[0]) => () =>
      openDialog(state)
    const action = (
      id: string,
      label: MessageKey,
      run: () => void,
      keys?: string
    ): Item => ({
      id: `action-${id}`,
      group: "actions",
      label: f.t(label),
      keys,
      text: f.t(label),
      run,
    })
    const actions: Item[] = [
      action(
        "entry",
        "palette.newEntry",
        dialog({ kind: "entry", mode: "new" }),
        "N"
      ),
      action("invoice", "palette.newInvoice", () => {
        router.push(INVOICE_ROUTES.list)
        openDialog({ kind: "invoice", invoiceId: null })
      }),
      action("open", "palette.openFile", onOpenFile, shortcut("O").label),
      ...(canSave
        ? [action("save", "palette.save", save, shortcut("S").label)]
        : []),
      action("export", "palette.export", onExport, shortcut("S", true).label),
      action("check", "palette.checkBook", dialog({ kind: "check-book" })),
      action("saves", "palette.saves", dialog({ kind: "saves" })),
      action("audit", "file.audit", dialog({ kind: "audit-package" })),
      {
        ...action("xlsx", "file.xlsx", () => void downloadWorkbook(ctx)),
        label: f.t("file.xlsx", { y: year }),
        text: f.t("file.xlsx", { y: year }),
      },
      action("year-end", "palette.yearEnd", dialog({ kind: "year-end" })),
      action(
        "shortcuts",
        "palette.shortcuts",
        () => setLayer("shortcuts"),
        "?"
      ),
    ]
    const pages: Item[] = PAGES.map(([href, label, section]) => ({
      id: `page-${href}`,
      group: "pages",
      label: f.t(label),
      hint: label === section ? undefined : f.t(section),
      text: `${f.t(label)} ${f.t(section)}`,
      run: () => router.push(href),
    }))
    const shown = (list: Item[]) =>
      words.length === 0
        ? list
        : list.filter((i) => matchesWords(words, i.text))

    const openEntry = (entryId: string, date: string) => {
      const s = useBookStore.getState()
      const y = yearOf(date)
      if (s.year !== y) s.setYear(y)
      router.push(LEDGER_ROUTES.entries)
      s.openDialog({ kind: "entry", mode: "edit", entryId })
    }
    const newestFirst = [...entries].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.voucher ?? 0) - (a.voucher ?? 0)
    )
    const entryItems = searchItems(
      newestFirst,
      words,
      (e) =>
        `${e.description} ${e.voucher ?? ""} ${e.date} ${f.date(e.date)} ${formatMoneyPlain(calcEntry(e).gross)} ${e.note ?? ""}`,
      RESULT_LIMIT
    ).map<Item>((e) => ({
      id: `entry-${e.id}`,
      group: "entries",
      label: e.description || f.t("palette.noDescription"),
      hint: `${e.voucher ?? "–"} · ${f.date(e.date)} · ${f.money(calcEntry(e).gross)}`,
      text: "",
      run: () => openEntry(e.id, e.date),
    }))
    const found = new Set(entryItems.map((i) => i.id))
    const receiptItems = !searchesReceipts(words)
      ? []
      : searchItems(
          newestFirst.filter(
            (e) => e.atts?.length && !found.has(`entry-${e.id}`)
          ),
          words,
          (e) =>
            (e.atts ?? [])
              .map((a) => (a.id === null ? "" : (foldedText.get(a.id) ?? "")))
              .join(" "),
          RESULT_LIMIT
        ).map<Item>((e) => {
          const text = (e.atts ?? [])
            .map((a) => (a.id === null ? "" : (receiptText.get(a.id) ?? "")))
            .find((t) => words.some((w) => fold(t).includes(w)))
          return {
            id: `receipt-${e.id}`,
            group: "receipts",
            label: e.description || f.t("palette.noDescription"),
            hint: `${e.voucher ?? "–"} · ${f.date(e.date)} · ${snippetAround(text ?? "", words)}`,
            text: "",
            run: () => openEntry(e.id, e.date),
          }
        })
    const invoiceItems = searchItems(
      [...invoices].sort(
        (a, b) => (b.number ?? Infinity) - (a.number ?? Infinity)
      ),
      words,
      (i) =>
        `${f.t(i.number === null ? "palette.draft" : "palette.invoice", { n: i.number ?? 0, c: i.customer.name })} ${i.reference ?? ""}`,
      RESULT_LIMIT
    ).map<Item>((i) => ({
      id: `invoice-${i.id}`,
      group: "invoices",
      label:
        i.number === null
          ? f.t("palette.draft", { c: i.customer.name || "–" })
          : f.t("palette.invoice", { n: i.number, c: i.customer.name }),
      hint: f.date(i.date),
      text: "",
      run: () => {
        router.push(INVOICE_ROUTES.list)
        openDialog({ kind: "invoice", invoiceId: i.id })
      },
    }))
    const partyItems = searchItems(
      customers,
      words,
      (c) => `${c.name} ${c.vatId} ${c.city}`,
      RESULT_LIMIT
    ).map<Item>((c) => ({
      id: `party-${c.id}`,
      group: "parties",
      label: c.name,
      hint: c.city || undefined,
      text: "",
      run: () => {
        router.push(INVOICE_ROUTES.parties)
        openDialog({ kind: "party", partyId: c.id })
      },
    }))
    return [
      ...shown(actions),
      ...shown(pages),
      ...entryItems,
      ...receiptItems,
      ...invoiceItems,
      ...partyItems,
    ]
  }, [
    query,
    f,
    router,
    onOpenFile,
    onExport,
    canSave,
    save,
    shortcut,
    setLayer,
    ctx,
    year,
    entries,
    invoices,
    customers,
    receiptText,
    foldedText,
  ])

  const current = Math.min(active, Math.max(0, items.length - 1))

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [current])

  const run = (item: Item | undefined) => {
    if (!item) return
    close()
    item.run()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const last = items.length - 1
    const move: Record<string, number> = {
      ArrowDown: current >= last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    }
    if (event.key in move) {
      event.preventDefault()
      setActive(Math.max(0, move[event.key]))
    } else if (event.key === "Enter") {
      event.preventDefault()
      run(items[current])
    }
  }

  const groups = (Object.keys(GROUP_TITLE) as Group[]).filter((g) =>
    items.some((i) => i.group === g)
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{f.t("palette.title")}</DialogTitle>
          <DialogDescription>{f.t("palette.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-4">
          <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={
              items[current] ? `palette-${current}` : undefined
            }
            aria-label={f.t("palette.title")}
            placeholder={f.t("palette.placeholder")}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        <ul
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label={f.t("palette.title")}
          className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5"
        >
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {f.t("palette.none")}
            </li>
          ) : (
            groups.map((g) => (
              <li key={g} role="presentation">
                <p
                  aria-hidden
                  className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                >
                  {f.t(GROUP_TITLE[g])}
                </p>
                <ul role="group" aria-label={f.t(GROUP_TITLE[g])}>
                  {items.map((item, index) =>
                    item.group === g ? (
                      <li
                        key={item.id}
                        id={`palette-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={index === current}
                        className={cn(
                          "flex cursor-default items-center gap-3 rounded-md px-2.5 py-2 text-sm",
                          index === current && "bg-muted"
                        )}
                        onMouseMove={() =>
                          index !== current && setActive(index)
                        }
                        onClick={() => run(item)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.label}</span>
                          {item.hint ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.hint}
                            </span>
                          ) : null}
                        </span>
                        {item.keys ? <Keys>{item.keys}</Keys> : null}
                      </li>
                    ) : null
                  )}
                </ul>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

/** The keyboard shortcuts the app has (§8.35), opened with `?` or from the palette. */
export function ShortcutSheet() {
  const f = useFormatters()
  const layer = usePaletteStore((s) => s.layer)
  const setLayer = usePaletteStore((s) => s.setLayer)
  const shortcut = useShortcut()

  const rows: [string, MessageKey][] = [
    [shortcut("K").label, "palette.keyPalette"],
    ["N", "palette.keyNewEntry"],
    ["?", "palette.keyShortcuts"],
    [shortcut("O").label, "palette.keyOpen"],
    [shortcut("S").label, "palette.keySave"],
    [shortcut("S", true).label, "palette.keyExport"],
    [shortcut("Z").label, "palette.keyUndo"],
    [shortcut("Z", true).label, "palette.keyRedo"],
    [shortcut("B").label, "palette.keySidebar"],
    [shortcut("Enter").label, "palette.keySubmit"],
    ["Esc", "palette.keyClose"],
  ]

  return (
    <Dialog
      open={layer === "shortcuts"}
      onOpenChange={(next) => !next && setLayer("none")}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.t("palette.shortcutsTitle")}</DialogTitle>
          <DialogDescription>
            {f.t("palette.shortcutsDescription")}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2.5 text-sm">
          {rows.map(([keys, label]) => (
            <React.Fragment key={label}>
              <dt>{f.t(label)}</dt>
              <dd className="text-right">
                <Keys className="bg-muted">{keys}</Keys>
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
