"use client"

import * as React from "react"
import { PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { SortableHeader } from "@/components/common/sortable-header"
import { TablePagination } from "@/components/common/table-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { clearAllEntries, resetCategories } from "@/lib/commands/book-commands"
import { LINES, categoryName } from "@/lib/domain/accounts"
import { uid } from "@/lib/domain/id"
import { parseRate } from "@/lib/domain/money"
import type { Category, EntryType } from "@/lib/domain/types"
import { categoryAccount, categorySide, paginate } from "@/stores/selectors"
import {
  useBookStore,
  type CatSortKey,
  type TypeFilter,
} from "@/stores/book-store"

export function SettingsView() {
  const f = useFormatters()

  return (
    <>
      <PageHeader title={f.t("v_asetukset")} subtitle={f.t("setSub")} />
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

  const [side, setSide] = React.useState<EntryType>("kulu")
  const [lineChoice, setLine] = React.useState<string | null>(null)
  const [rate, setRate] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const lineOptions = React.useMemo(
    () => LINES.filter((l) => l.side === side),
    [side]
  )

  // Derived, not stored: switching side changes which lines are valid, and
  // resetting the choice in an effect would render once with a stale line.
  const line =
    lineChoice && lineOptions.some((l) => l.key === lineChoice)
      ? lineChoice
      : (lineOptions[0]?.key ?? "")

  const submit = () => {
    if (!name.trim()) {
      setError(f.t("nameReq"))
      return
    }
    const parsed = rate.trim() === "" ? 0 : parseRate(rate)
    if (parsed == null || parsed < 0 || parsed >= 100) {
      setError(f.t("vatInvalid"))
      return
    }
    const category: Category = {
      id: `c-${uid()}`,
      line,
      nimi: name.trim(),
      alv: parsed,
      ...(side === "tulo" ? { kind: "kotimaa" as const } : {}),
      on: true,
      custom: true,
    }
    upsertCategory(category)
    toast.add({ title: f.t("catAdded", { c: category.nimi }) })
    setName("")
    setRate("")
    setError(null)
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-4 font-medium">{f.t("addCat")}</h2>
      <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Field>
          <FieldLabel>{f.t("f_type")}</FieldLabel>
          <ToggleGroup
            aria-label={f.t("f_type")}
            value={[side]}
            onValueChange={(value) => {
              const next = value[0] as EntryType | undefined
              if (next) setSide(next)
            }}
          >
            <ToggleGroupItem value="kulu">{f.t("kulu")}</ToggleGroupItem>
            <ToggleGroupItem value="tulo">{f.t("tulo")}</ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel>{f.t("line")}</FieldLabel>
          <Select
            value={line}
            onValueChange={(value) => value && setLine(value)}
          >
            <SelectTrigger aria-label={f.t("line")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {lineOptions.map((l) => (
                  <SelectItem key={l.key} value={l.key}>
                    {l.tili} {f.lineName(l)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="cat-name">{f.t("name")}</FieldLabel>
          <Input
            id="cat-name"
            value={name}
            placeholder={f.t("namePh")}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="cat-rate">{f.t("defVat")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="cat-rate"
              inputMode="decimal"
              value={rate}
              placeholder="0"
              className="tabular"
              onChange={(e) => setRate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button onClick={submit}>
              <PlusIcon data-icon="inline-start" />
              {f.t("add")}
            </Button>
          </div>
        </Field>
      </FieldGroup>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
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

  const usedIds = React.useMemo(
    () => new Set(entries.map((e) => e.catId)),
    [entries]
  )

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = cats.filter((c) => {
      if (typeFilter !== "all" && categorySide(c) !== typeFilter) return false
      if (!needle) return true
      return categoryName(c, f.lang).toLowerCase().includes(needle)
    })

    const value = (c: Category): string | number => {
      switch (sort.key) {
        case "on":
          return c.on ? 0 : 1
        case "side":
          return categorySide(c) === "tulo" ? 0 : 1
        case "tili":
          return categoryAccount(c)
        case "alv":
          return c.alv
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
    <section className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <h2 className="mr-2 font-medium">{f.t("categories")}</h2>
        <div className="relative min-w-[12rem] flex-1">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={f.t("catSearch")}
            aria-label={f.t("catSearch")}
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
        <span className="text-sm text-muted-foreground">
          {f.t("nCats", { n: view.total })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {header("on", f.t("inUse"))}
              {header("side", f.t("f_type"))}
              {header("tili", f.t("account"))}
              {header("nimi", f.t("name"))}
              {header("alv", f.t("defVat"), "right")}
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map((cat) => {
              const income = categorySide(cat) === "tulo"
              const deletable = cat.custom && !usedIds.has(cat.id)
              return (
                <TableRow key={cat.id}>
                  <TableCell>
                    <Checkbox
                      checked={cat.on}
                      aria-label={f.t("isActive", { c: f.catName(cat) })}
                      onCheckedChange={(checked) =>
                        upsertCategory({ ...cat, on: checked === true })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {income ? f.t("tulo") : f.t("kulu")}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {categoryAccount(cat)}
                  </TableCell>
                  <TableCell>{f.catName(cat)}</TableCell>
                  <TableCell className="text-right">
                    <RateInput key={cat.alv} cat={cat} />
                  </TableCell>
                  <TableCell>
                    {deletable ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={f.t("delCat")}
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
      </div>

      <div className="px-4 pb-3">
        <TablePagination
          page={view.page}
          pages={view.pages}
          size={size}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </div>
    </section>
  )
}

/** Inline default-VAT editor: commits on change, reverts on bad input. */
function RateInput({ cat }: { cat: Category }) {
  // Keyed on the committed rate by the caller, so a change from elsewhere
  // remounts this with the right draft rather than syncing it in an effect.
  const f = useFormatters()
  const upsertCategory = useBookStore((s) => s.upsertCategory)
  const [draft, setDraft] = React.useState(String(cat.alv))

  const commit = () => {
    const parsed = parseRate(draft)
    if (parsed == null || parsed < 0 || parsed >= 100) {
      setDraft(String(cat.alv))
      toast.add({ title: f.t("vatInvalid") })
      return
    }
    if (parsed === cat.alv) return
    upsertCategory({ ...cat, alv: parsed })
    toast.add({
      title: f.t("vatUpdated", { c: f.catName(cat), r: f.rate(parsed) }),
    })
  }

  return (
    <Input
      value={draft}
      aria-label={`${f.t("defVat")} – ${f.catName(cat)}`}
      className="tabular ml-auto h-7 w-20 text-right"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") setDraft(String(cat.alv))
      }}
    />
  )
}

function DataActions() {
  const f = useFormatters()
  const ctx = useCommandCtx()

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-1 font-medium">{f.t("data")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{f.t("clearHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => resetCategories(ctx)}>
          {f.t("resetCats")}
        </Button>
        <Button variant="destructive" onClick={() => void clearAllEntries(ctx)}>
          {f.t("clearAll")}
        </Button>
      </div>
    </section>
  )
}
