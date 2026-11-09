"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  DownloadIcon,
  FileDownIcon,
  LayersIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

import { CommitInput } from "@/components/inventory/commit-input"
import { LayersDialog } from "@/components/inventory/layers-dialog"
import { OptionSelect } from "@/components/common/option-select"
import {
  SettingCard,
  SettingGrid,
  SettingValue,
} from "@/components/common/setting-card"
import { Surface } from "@/components/common/surface"
import { TablePagination } from "@/components/common/table-pagination"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { useCommandCtx } from "@/hooks/use-commands"
import { saveBlob } from "@/lib/browser/download"
import { downloadReport } from "@/lib/commands/memo-commands"
import { calcEntry } from "@/lib/domain/calc"
import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import { uid } from "@/lib/domain/id"
import { incomeStatement } from "@/lib/domain/income-statement"
import { taxBasisEntries } from "@/lib/domain/open-items"
import {
  carryOver,
  goodsMargin,
  inventoryTotals,
  itemValue,
  stockProblems,
  type CostMethod,
  type StockItem,
  type StockKind,
  type StockProblem,
} from "@/lib/domain/inventory"
import {
  formatQuantity,
  parseQuantity,
  parseStockCsv,
  serializeStockCsv,
} from "@/lib/domain/inventory-csv"
import { stocktakeReport } from "@/lib/domain/inventory-report"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"
import { indexCategories } from "@/lib/domain/types"
import type { MessageKey } from "@/lib/i18n/messages"
import { confirm } from "@/lib/ui/confirm"
import { useBookStore, type PageSize } from "@/stores/book-store"

const PROBLEM_KEYS: Record<StockProblem, MessageKey> = {
  "no-name": "inventory.problemNoName",
  "no-cost": "inventory.problemNoCost",
  "lower-without-reason": "inventory.problemLowerReason",
}

function blankRow(): StockItem {
  return {
    id: uid(),
    name: "",
    sku: "",
    unit: "kpl",
    kind: "goods",
    quantityMilli: 0,
    unitCents: 0,
    layers: [],
    lowerUnitCents: null,
    lowerReason: "",
  }
}

/**
 * The stocktake of the selected year (§8.28): the rows counted on 31.12., what
 * each is worth under the book's cost method and the totals Form 5 asks for on
 * 708 and 709.
 */
export function InventoryView() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const year = useBookStore((s) => s.year)
  const inventory = useBookStore((s) => s.inventory)
  const setInventory = useBookStore((s) => s.setInventory)
  const exportLang = useBookStore((s) => s.exportLang)
  const businessName = useBookStore((s) => s.businessName)
  const businessId = useBookStore((s) => s.businessId)
  const locked = !!useBookStore((s) => s.form5Filed[String(year)])
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const traderType = useBookStore((s) => s.traderType)
  const yearEnds = useBookStore((s) => s.yearEnd)

  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState<PageSize>(50)
  const [layersOf, setLayersOf] = React.useState<string | null>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const key = String(year)
  const rows = React.useMemo(
    () => inventory.years[key] ?? [],
    [inventory.years, key]
  )
  const method = inventory.method
  const totals = React.useMemo(
    () => inventoryTotals(rows, method),
    [rows, method]
  )

  const margin = React.useMemo(() => {
    const catMap = indexCategories(cats)
    const statement = incomeStatement(
      taxBasisEntries(entries, traderType),
      catMap,
      year
    )
    const description = f.t("balance.inventoryEntry", { y: year })
    /* The booked stock change is on line 333 too, so it is taken out of the purchases. */
    const bookedEntries = entries.filter(
      (e) =>
        e.catId === "333" &&
        e.description === description &&
        e.date.startsWith(`${year}-`)
    )
    const booked = bookedEntries.reduce((sum, e) => sum + calcEntry(e).net, 0)
    const line333 = statement.lines.find((l) => l.line.key === "333")?.net ?? 0
    const stock = (y: number) => {
      const figures = yearEnds[y] ?? EMPTY_YEAR_END
      return figures.goods + figures.otherCurrent
    }
    return goodsMargin({
      sales: statement.revenueTotal,
      purchases: line333 - booked,
      opening: stock(year - 1),
      closing: stock(year),
    })
  }, [entries, cats, traderType, year, yearEnds, f])
  const showMargin =
    margin.purchases !== 0 || margin.opening !== 0 || margin.closing !== 0

  const setRows = (next: StockItem[]) =>
    setInventory({ ...inventory, years: { ...inventory.years, [key]: next } })
  const update = (id: string, patch: Partial<StockItem>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const needle = query.trim().toLowerCase()
  const shown = needle
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.sku.toLowerCase().includes(needle)
      )
    : rows
  const pages = Math.max(1, Math.ceil(shown.length / size))
  const current = Math.min(page, pages)
  const visible = shown.slice((current - 1) * size, current * size)
  const layersItem = rows.find((r) => r.id === layersOf) ?? null

  const previous = inventory.years[String(year - 1)] ?? []
  const canCarry =
    rows.length === 0 && previous.some((r) => r.quantityMilli > 0)

  const importFile = async (file: File) => {
    const result = parseStockCsv(await file.text())
    if (!result.ok) {
      toast.add({
        title: f.t(
          result.reason === "empty"
            ? "inventory.importEmpty"
            : "inventory.importColumns"
        ),
      })
      return
    }
    setRows([
      ...result.rows.map((r) => ({ ...r, id: uid(), layers: [] })),
      ...rows,
    ])
    setPage(1)
    toast.add({
      title: f.t("inventory.importDone", { n: result.rows.length }),
      ...(result.skipped > 0
        ? { description: f.t("inventory.importSkipped", { n: result.skipped }) }
        : {}),
    })
  }

  const exportFile = () =>
    saveBlob(
      new Blob([serializeStockCsv(rows, exportLang)], {
        type: "text/csv;charset=utf-8",
      }),
      `${exportLang === "fi" ? "varasto" : "inventory"}-${year}.csv`
    )

  const clear = async () => {
    const ok = await confirm({
      title: f.t("inventory.clearTitle", { y: year }),
      message: f.t("inventory.clearMessage", { n: rows.length, y: year }),
      confirmLabel: f.t("inventory.clear"),
      cancelLabel: f.t("common.cancel"),
    })
    if (ok) setRows([])
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        {f.t("inventory.intro")}
      </p>

      <SettingGrid>
        <SettingCard
          label={f.t("inventory.method")}
          info={f.t("inventory.methodHelp")}
        >
          <OptionSelect
            label={f.t("inventory.method")}
            value={method}
            disabled={locked}
            options={[
              { value: "average", label: f.t("inventory.methodAverage") },
              { value: "fifo", label: f.t("inventory.methodFifo") },
            ]}
            onChange={(value) =>
              setInventory({ ...inventory, method: value as CostMethod })
            }
          />
        </SettingCard>
        <SettingCard label={f.t("inventory.statValue")}>
          <SettingValue
            value={f.money(totals.value)}
            note={f.date(`${year}-12-31`)}
            lead={
              locked ? <LockIcon className="size-4" aria-hidden /> : undefined
            }
          />
        </SettingCard>
        <SettingCard label={f.t("inventory.statRows")}>
          <SettingValue value={String(totals.rows)} />
        </SettingCard>
        <SettingCard label={f.t("inventory.statCost")}>
          <SettingValue value={f.money(totals.cost)} />
        </SettingCard>
        <SettingCard label={f.t("inventory.statWriteDown")}>
          <SettingValue value={f.money(totals.writeDown)} />
        </SettingCard>
        <SettingCard
          label={f.t("inventory.statGoods")}
          info={f.t("inventory.statHint")}
        >
          <SettingValue value={f.money(totals.goods)} />
        </SettingCard>
        <SettingCard
          label={f.t("inventory.statMaterials")}
          info={f.t("inventory.statHint")}
        >
          <SettingValue value={f.money(totals.materials)} />
        </SettingCard>
      </SettingGrid>

      {showMargin ? (
        <SettingGrid>
          <SettingCard label={f.t("inventory.marginSales")}>
            <SettingValue value={f.money(margin.sales)} />
          </SettingCard>
          <SettingCard label={f.t("inventory.marginPurchases")}>
            <SettingValue value={f.money(margin.purchases)} />
          </SettingCard>
          <SettingCard
            label={f.t("inventory.marginCogs")}
            info={f.t("inventory.marginCogsHint", {
              o: f.money(margin.opening),
              p: f.money(margin.purchases),
              c: f.money(margin.closing),
            })}
          >
            <SettingValue value={f.money(margin.cogs)} />
          </SettingCard>
          <SettingCard
            label={f.t("inventory.marginGross")}
            info={f.t("inventory.marginGrossHint")}
          >
            <SettingValue value={f.money(margin.gross)} />
          </SettingCard>
          <SettingCard label={f.t("inventory.marginPercent")}>
            <SettingValue
              value={
                margin.percent === null
                  ? "-"
                  : `${String(margin.percent).replace(".", f.lang === "fi" ? "," : ".")} %`
              }
            />
          </SettingCard>
          <SettingCard
            label={f.t("inventory.marginDays")}
            info={f.t("inventory.marginDaysHint")}
          >
            <SettingValue
              value={margin.stockDays === null ? "-" : String(margin.stockDays)}
            />
          </SettingCard>
        </SettingGrid>
      ) : null}

      {locked ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LockIcon className="size-4" aria-hidden />
          {f.t("inventory.locked")}
        </p>
      ) : null}

      <div className="print-hidden flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          aria-label={f.t("inventory.search")}
          placeholder={f.t("inventory.search")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          {canCarry ? (
            <Button
              variant="outline"
              disabled={locked}
              onClick={() => {
                const next = carryOver(previous, method, uid)
                setRows(next)
                toast.add({
                  title: f.t("inventory.carried", {
                    n: next.length,
                    y: year - 1,
                  }),
                })
              }}
            >
              {f.t("inventory.startFromLast", { y: year - 1 })}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={locked}
            onClick={() => fileInput.current?.click()}
          >
            <UploadIcon data-icon="inline-start" />
            {f.t("inventory.import")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void importFile(file)
            }}
          />
          <Button
            variant="outline"
            disabled={rows.length === 0}
            onClick={exportFile}
          >
            <DownloadIcon data-icon="inline-start" />
            {f.t("inventory.export")}
          </Button>
          <Button
            variant="outline"
            disabled={totals.rows === 0}
            onClick={() =>
              void downloadReport(
                ctx,
                stocktakeReport(f, {
                  year,
                  items: rows,
                  method,
                  businessName: businessName ?? "",
                  businessId: businessId ?? "",
                })
              )
            }
          >
            <FileDownIcon data-icon="inline-start" />
            {f.t("inventory.pdf")}
          </Button>
          <Button
            variant="outline"
            disabled={rows.length === 0 || locked}
            onClick={() => void clear()}
          >
            <Trash2Icon data-icon="inline-start" />
            {f.t("inventory.clear")}
          </Button>
          <Button
            disabled={locked}
            onClick={() => {
              setRows([blankRow(), ...rows])
              setQuery("")
              setPage(1)
            }}
          >
            <PlusIcon data-icon="inline-start" />
            {f.t("inventory.add")}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Surface className="flex flex-col gap-1 p-8 text-center">
          <p className="font-medium">{f.t("inventory.empty", { y: year })}</p>
          <p className="text-sm text-muted-foreground">
            {f.t("inventory.emptyHint")}
          </p>
        </Surface>
      ) : (
        <Surface className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">
                    {f.t("inventory.colName")}
                  </TableHead>
                  <TableHead className="min-w-24">
                    {f.t("inventory.colSku")}
                  </TableHead>
                  <TableHead className="w-20">
                    {f.t("inventory.colUnit")}
                  </TableHead>
                  <TableHead className="w-36">
                    {f.t("inventory.colKind")}
                  </TableHead>
                  <TableHead className="w-28 text-right">
                    {f.t("inventory.colQuantity")}
                  </TableHead>
                  <TableHead className="w-28 text-right">
                    {f.t("inventory.colUnitCost")}
                  </TableHead>
                  <TableHead className="w-28 text-right">
                    {f.t("inventory.colLower")}
                  </TableHead>
                  <TableHead className="min-w-36">
                    {f.t("inventory.colReason")}
                  </TableHead>
                  <TableHead className="w-32 text-right">
                    {f.t("inventory.colValue")}
                  </TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {f.t("inventory.noMatch")}
                    </TableCell>
                  </TableRow>
                ) : null}
                {visible.map((item) => (
                  <StockRow
                    key={item.id}
                    item={item}
                    method={method}
                    disabled={locked}
                    onChange={(patch) => update(item.id, patch)}
                    onLayers={() => setLayersOf(item.id)}
                    onRemove={() =>
                      setRows(rows.filter((r) => r.id !== item.id))
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={current}
            pages={pages}
            size={size}
            onPageChange={setPage}
            onSizeChange={(next) => {
              setSize(next)
              setPage(1)
            }}
          />
        </Surface>
      )}

      {layersItem ? (
        <LayersDialog
          item={layersItem}
          disabled={locked}
          onChange={(layers) => update(layersItem.id, { layers })}
          onClose={() => setLayersOf(null)}
        />
      ) : null}
    </div>
  )
}

function StockRow({
  item,
  method,
  disabled,
  onChange,
  onLayers,
  onRemove,
}: {
  item: StockItem
  method: CostMethod
  disabled: boolean
  onChange: (patch: Partial<StockItem>) => void
  onLayers: () => void
  onRemove: () => void
}) {
  const f = useFormatters()
  const value = itemValue(item, method)
  const problems = stockProblems(item)
  const name = item.name || f.t("inventory.newRow")

  return (
    <TableRow>
      <TableCell>
        <CommitInput
          label={f.t("inventory.colName")}
          value={item.name}
          disabled={disabled}
          invalid={problems.includes("no-name")}
          onCommit={(text) => {
            onChange({ name: text.trim().slice(0, 200) })
            return true
          }}
        />
      </TableCell>
      <TableCell>
        <CommitInput
          label={f.t("inventory.colSku")}
          value={item.sku}
          disabled={disabled}
          onCommit={(text) => {
            onChange({ sku: text.trim().slice(0, 60) })
            return true
          }}
        />
      </TableCell>
      <TableCell>
        <CommitInput
          label={f.t("inventory.colUnit")}
          value={item.unit}
          disabled={disabled}
          onCommit={(text) => {
            onChange({ unit: text.trim().slice(0, 20) })
            return true
          }}
        />
      </TableCell>
      <TableCell>
        <OptionSelect
          label={f.t("inventory.colKind")}
          value={item.kind}
          disabled={disabled}
          options={[
            { value: "goods", label: f.t("inventory.kindGoods") },
            { value: "materials", label: f.t("inventory.kindMaterials") },
          ]}
          onChange={(kind) => onChange({ kind: kind as StockKind })}
        />
      </TableCell>
      <TableCell>
        <CommitInput
          right
          inputMode="decimal"
          label={f.t("inventory.colQuantity")}
          placeholder="0"
          value={
            item.quantityMilli === 0
              ? ""
              : formatQuantity(item.quantityMilli, f.lang)
          }
          disabled={disabled}
          onCommit={(text) => {
            const q = text.trim() === "" ? 0 : parseQuantity(text)
            if (q === null) return false
            onChange({ quantityMilli: q })
            return true
          }}
        />
      </TableCell>
      <TableCell>
        <CommitInput
          right
          inputMode="decimal"
          label={f.t("inventory.colUnitCost")}
          placeholder="0,00"
          value={item.unitCents === 0 ? "" : formatMoneyPlain(item.unitCents)}
          disabled={disabled}
          invalid={problems.includes("no-cost")}
          onCommit={(text) => {
            const c = text.trim() === "" ? 0 : parseAmount(text)
            if (c === null || c < 0) return false
            onChange({ unitCents: c })
            return true
          }}
        />
      </TableCell>
      <TableCell>
        <CommitInput
          right
          inputMode="decimal"
          label={f.t("inventory.colLower")}
          value={
            item.lowerUnitCents === null
              ? ""
              : formatMoneyPlain(item.lowerUnitCents)
          }
          disabled={disabled}
          onCommit={(text) => {
            if (text.trim() === "") {
              onChange({ lowerUnitCents: null, lowerReason: "" })
              return true
            }
            const c = parseAmount(text)
            if (c === null || c < 0) return false
            onChange({ lowerUnitCents: c })
            return true
          }}
        />
      </TableCell>
      <TableCell>
        <CommitInput
          label={f.t("inventory.colReason")}
          value={item.lowerReason}
          disabled={disabled || item.lowerUnitCents === null}
          invalid={problems.includes("lower-without-reason")}
          onCommit={(text) => {
            onChange({ lowerReason: text.trim().slice(0, 300) })
            return true
          }}
        />
      </TableCell>
      <TableCell className="tabular text-right">
        <div className="flex items-center justify-end gap-1.5">
          {problems.length > 0 ? (
            <span
              title={problems.map((p) => f.t(PROBLEM_KEYS[p])).join(" ")}
              className="text-destructive"
            >
              <AlertTriangleIcon className="size-4" aria-hidden />
              <span className="sr-only">
                {problems.map((p) => f.t(PROBLEM_KEYS[p])).join(" ")}
              </span>
            </span>
          ) : null}
          <span>{f.money(value.value)}</span>
        </div>
        {value.writeDown > 0 ? (
          <div className="text-xs text-muted-foreground">
            {f.money(-value.writeDown)}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={f.t("inventory.layers", { n: item.layers.length })}
            title={f.t("inventory.layers", { n: item.layers.length })}
            onClick={onLayers}
          >
            <LayersIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={f.t("inventory.removeRow", { name })}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
