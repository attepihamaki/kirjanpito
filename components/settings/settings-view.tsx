"use client"

import * as React from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import {
  EntryTypeToggle,
  SearchInput,
  TypeFilterToggle,
} from "@/components/common/filter-controls"
import { OptionSelect } from "@/components/common/option-select"
import { PageHeader } from "@/components/common/page-header"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { SortableHeader } from "@/components/common/sortable-header"
import { TablePagination } from "@/components/common/table-pagination"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { clearAllEntries, resetCategories } from "@/lib/commands/book-commands"
import { LINES, categoryName } from "@/lib/domain/accounts"
import { uid } from "@/lib/domain/id"
import { parseRate } from "@/lib/domain/money"
import type { Category, EntryType } from "@/lib/domain/types"
import {
  categoryAccount,
  categorySide,
  paginate,
  usedCategoryIds,
} from "@/stores/selectors"
import { useBookStore, type CatSortKey } from "@/stores/book-store"

export function SettingsView() {
  const f = useFormatters()

  return (
    <>
      <PageHeader
        title={f.t("nav.settings")}
        subtitle={f.t("settings.subtitle")}
      />
      <div className="flex flex-col gap-6">
        <AddCategoryForm />
        <CategoryTable />
        <DataActions />
      </div>
    </>
  )
}

function AddCategoryForm() {
  const f = useFormatters()
  const upsertCategory = useBookStore((s) => s.upsertCategory)
  const name = useBookStore((s) => s.catFormName)
  const setName = useBookStore((s) => s.setCatFormName)

  const [side, setSide] = React.useState<EntryType>("expense")
  const [lineChoice, setLine] = React.useState<string | null>(null)
  const [rate, setRate] = React.useState("")
  /*
   * The message and the field it is about, so the error line and the
   * `aria-invalid` on the offending input always agree (§8.10).
   */
  const [error, setError] = React.useState<{
    field: "name" | "rate"
    message: string
  } | null>(null)

  const invalid = (field: "name" | "rate") =>
    error?.field === field ? true : undefined

  const lineOptions = React.useMemo(
    () => LINES.filter((l) => l.side === side),
    [side]
  )

  /*
   * Derived, not stored: switching side changes which lines are valid, and
   * resetting the choice in an effect would render once with a stale line.
   */
  const line =
    lineChoice && lineOptions.some((l) => l.key === lineChoice)
      ? lineChoice
      : (lineOptions[0]?.key ?? "")

  const submit = () => {
    if (!name.trim()) {
      setError({ field: "name", message: f.t("settings.nameRequired") })
      return
    }
    const parsed = rate.trim() === "" ? 0 : parseRate(rate)
    if (parsed == null || parsed < 0 || parsed >= 100) {
      setError({ field: "rate", message: f.t("settings.vatInvalid") })
      return
    }
    const category: Category = {
      id: `c-${uid()}`,
      line,
      name: name.trim(),
      vatRate: parsed,
      ...(side === "income" ? { kind: "domestic" as const } : {}),
      enabled: true,
      custom: true,
    }
    upsertCategory(category)
    toast.add({ title: f.t("settings.categoryAdded", { c: category.name }) })
    setName("")
    setRate("")
    setError(null)
  }

  return (
    <Panel
      title={f.t("settings.addCategory")}
      bodyClassName="p-4"
      // The submit sits on the footer strip, not in the grid (§8.10).
      footer={
        <Button onClick={submit}>
          <PlusIcon data-icon="inline-start" />
          {f.t("common.add")}
        </Button>
      }
    >
      <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Field>
          <FieldLabel>{f.t("common.type")}</FieldLabel>
          <EntryTypeToggle value={side} onChange={setSide} />
        </Field>

        <Field>
          <FieldLabel>{f.t("settings.line")}</FieldLabel>
          <OptionSelect
            options={lineOptions.map((l) => ({
              value: l.key,
              label: `${l.account} ${f.lineName(l)}`,
            }))}
            value={line}
            onChange={setLine}
            label={f.t("settings.line")}
          />
        </Field>

        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="cat-name">{f.t("common.name")}</FieldLabel>
          <Input
            id="cat-name"
            value={name}
            placeholder={f.t("settings.namePlaceholder")}
            aria-invalid={invalid("name")}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>

        <Field data-invalid={invalid("rate")}>
          <FieldLabel htmlFor="cat-rate">
            {f.t("settings.defaultVat")}
          </FieldLabel>
          <Input
            id="cat-rate"
            inputMode="decimal"
            value={rate}
            placeholder="0"
            className="tabular"
            aria-invalid={invalid("rate")}
            onChange={(e) => {
              setRate(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>
      </FieldGroup>

      <FieldError className="mt-3">{error?.message}</FieldError>
    </Panel>
  )
}

function CategoryTable() {
  const f = useFormatters()
  const cats = useBookStore((s) => s.cats)
  const entries = useBookStore((s) => s.entries)
  const query = useBookStore((s) => s.catQuery)
  const typeFilter = useBookStore((s) => s.catType)
  const sort = useBookStore((s) => s.catSort)
  const page = useBookStore((s) => s.catPage)
  const size = useBookStore((s) => s.ctSize)
  const setQuery = useBookStore((s) => s.setCatQuery)
  const setType = useBookStore((s) => s.setCatType)
  const toggleSort = useBookStore((s) => s.toggleCatSort)
  const setPage = useBookStore((s) => s.setCatPage)
  const setSize = useBookStore((s) => s.setCatSize)
  const upsertCategory = useBookStore((s) => s.upsertCategory)
  const removeCategory = useBookStore((s) => s.removeCategory)

  const usedIds = React.useMemo(() => usedCategoryIds(entries), [entries])

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = cats.filter((c) => {
      if (typeFilter !== "all" && categorySide(c) !== typeFilter) return false
      if (!needle) return true
      return categoryName(c, f.lang).toLowerCase().includes(needle)
    })

    const value = (c: Category): string | number => {
      switch (sort.key) {
        case "enabled":
          return c.enabled ? 0 : 1
        case "side":
          return categorySide(c) === "income" ? 0 : 1
        case "account":
          return categoryAccount(c)
        case "vatRate":
          return c.vatRate
        default:
          return categoryName(c, f.lang)
      }
    }

    return filtered.sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : f.collator.compare(String(av), String(bv))
      return (
        (cmp ||
          f.collator.compare(
            categoryName(a, f.lang),
            categoryName(b, f.lang)
          )) * sort.dir
      )
    })
  }, [cats, query, typeFilter, sort, f.lang, f.collator])

  const view = paginate(rows, page, size)

  const header = (key: CatSortKey, label: string, align?: "right") => (
    <SortableHeader
      label={label}
      columnKey={key}
      active={sort.key === key}
      dir={sort.dir}
      onToggle={toggleSort}
      align={align}
    />
  )

  return (
    <Panel
      title={f.t("settings.categories")}
      actions={
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={f.t("settings.searchCategories")}
          />
          <TypeFilterToggle value={typeFilter} onChange={setType} />
          <span className="text-sm text-muted-foreground">
            {f.t("settings.categoryCount", { n: view.total })}
          </span>
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            {header("enabled", f.t("settings.inUse"))}
            {header("side", f.t("common.type"))}
            {header("account", f.t("common.account"))}
            {header("name", f.t("common.name"))}
            {header("vatRate", f.t("settings.defaultVat"), "right")}
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((cat) => {
            const income = categorySide(cat) === "income"
            const deletable = cat.custom && !usedIds.has(cat.id)
            return (
              <TableRow key={cat.id}>
                <TableCell>
                  <Checkbox
                    checked={cat.enabled}
                    aria-label={f.t("settings.isActive", {
                      c: f.catName(cat),
                    })}
                    onCheckedChange={(checked) =>
                      upsertCategory({ ...cat, enabled: checked === true })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Pill
                    tone={income ? "income" : "expense"}
                    className="font-medium"
                  >
                    {income ? f.t("common.income") : f.t("common.expense")}
                  </Pill>
                </TableCell>
                <TableCell className="tabular text-muted-foreground">
                  {categoryAccount(cat)}
                </TableCell>
                <TableCell>{f.catName(cat)}</TableCell>
                <TableCell className="text-right">
                  <RateInput key={cat.vatRate} cat={cat} />
                </TableCell>
                <TableCell>
                  {deletable ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("settings.deleteCategory")}
                      onClick={() => removeCategory(cat.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="px-4 py-3">
        <TablePagination
          page={view.page}
          pages={view.pages}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </div>
    </Panel>
  )
}

/** Inline default-VAT editor: commits on change, reverts on bad input. */
function RateInput({ cat }: { cat: Category }) {
  /*
   * Keyed on the committed rate by the caller, so a change from elsewhere
   * remounts this with the right draft rather than syncing it in an effect.
   */
  const f = useFormatters()
  const upsertCategory = useBookStore((s) => s.upsertCategory)
  // §9: a Finnish UI writes the rate with a comma. parseRate takes either.
  const asText = (rate: number) =>
    f.lang === "fi" ? String(rate).replace(".", ",") : String(rate)
  const [draft, setDraft] = React.useState(() => asText(cat.vatRate))

  const commit = () => {
    const parsed = parseRate(draft)
    if (parsed == null || parsed < 0 || parsed >= 100) {
      setDraft(asText(cat.vatRate))
      toast.add({ title: f.t("settings.vatInvalid") })
      return
    }
    if (parsed === cat.vatRate) return
    upsertCategory({ ...cat, vatRate: parsed })
    toast.add({
      title: f.t("settings.vatUpdated", {
        c: f.catName(cat),
        r: f.rate(parsed),
      }),
    })
  }

  return (
    <Input
      value={draft}
      aria-label={`${f.t("settings.defaultVat")} – ${f.catName(cat)}`}
      className="tabular ml-auto h-7 w-20 text-right"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") setDraft(asText(cat.vatRate))
      }}
    />
  )
}

/**
 * The two data actions, in two panels rather than one: restoring the default
 * categories is reversible and routine, while clearing the entries erases the
 * bookkeeping from this browser, so the second gets its own destructive panel
 * rather than equal weight beside the first.
 */
function DataActions() {
  const f = useFormatters()
  const ctx = useCommandCtx()

  return (
    <>
      <Panel
        title={f.t("settings.data")}
        description={f.t("settings.resetHint")}
        footer={
          <Button variant="outline" onClick={() => resetCategories(ctx)}>
            {f.t("settings.resetCategories")}
          </Button>
        }
      />

      <Panel
        variant="destructive"
        title={f.t("settings.clearEntries")}
        description={f.t("settings.clearHint")}
        footer={
          <Button
            variant="destructive"
            onClick={() => void clearAllEntries(ctx)}
          >
            <Trash2Icon data-icon="inline-start" />
            {f.t("confirm.clearConfirm")}
          </Button>
        }
      />
    </>
  )
}
