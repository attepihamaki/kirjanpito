"use client"

import * as React from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

import {
  SearchInput,
  TypeFilterSelect,
} from "@/components/common/filter-controls"
import { DefaultVatSelect } from "@/components/settings/category-dialogs"
import { Panel } from "@/components/common/panel"
import { Pill } from "@/components/common/pill"
import { SortableHeader } from "@/components/common/sortable-header"
import { TablePagination } from "@/components/common/table-pagination"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { resetCategories } from "@/lib/commands/book-commands"
import { startDeleteCategory } from "@/lib/commands/category-commands"
import { categoryName } from "@/lib/domain/accounts"
import type { Category } from "@/lib/domain/types"
import {
  categoryAccount,
  compareCategories,
  categorySide,
  paginate,
} from "@/stores/selectors"
import {
  CAT_SORT_DEFAULT,
  useBookStore,
  type CatSortKey,
} from "@/stores/book-store"

/** The categories settings page (§8.10): add, edit, delete and restore categories. */
export function CategorySettings() {
  return (
    <div className="flex flex-col gap-6">
      <CategoryTable />
      <ResetCategories />
    </div>
  )
}

function CategoryTable() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const cats = useBookStore((s) => s.cats)
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
  const openDialog = useBookStore((s) => s.openDialog)

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = cats.filter((c) => {
      if (typeFilter !== "all" && categorySide(c) !== typeFilter) return false
      if (!needle) return true
      return categoryName(c, f.lang).toLowerCase().includes(needle)
    })

    // No column chosen: the table falls back to its own order (§8.4).
    const { key, dir } = sort ?? CAT_SORT_DEFAULT

    const value = (c: Category): string | number => {
      switch (key) {
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
      const names = (x: Category, y: Category) =>
        f.collator.compare(categoryName(x, f.lang), categoryName(y, f.lang))
      return (
        (key === "account"
          ? compareCategories(a, b, names)
          : cmp || names(a, b)) * dir
      )
    })
  }, [cats, query, typeFilter, sort, f.lang, f.collator])

  const view = paginate(rows, page, size)

  const header = (key: CatSortKey, label: string, align?: "right") => (
    <SortableHeader
      label={label}
      columnKey={key}
      active={sort?.key === key}
      dir={sort?.dir ?? 1}
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
          <TypeFilterSelect value={typeFilter} onChange={setType} />
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
                  <RateSelect cat={cat} />
                </TableCell>
                <TableCell>
                  {/*
                   * A default keeps its name and line from the chart of accounts
                   * (§7.6), so unticking it is how it leaves the dropdowns.
                   */}
                  {cat.custom ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={f.t("settings.editCategory", {
                          c: f.catName(cat),
                        })}
                        onClick={() =>
                          openDialog({ kind: "category-edit", id: cat.id })
                        }
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={f.t("settings.deleteCategory", {
                          c: f.catName(cat),
                        })}
                        onClick={() => startDeleteCategory(ctx, cat)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <TablePagination
        page={view.page}
        pages={view.pages}
        size={size}
        count={f.t("settings.categoryCount", { n: view.total })}
        onPageChange={setPage}
        onSizeChange={setSize}
      />
    </Panel>
  )
}

/** A row's default VAT. A rate only applies to vouchers added from now on (§4). */
function RateSelect({ cat }: { cat: Category }) {
  const f = useFormatters()
  const upsertCategory = useBookStore((s) => s.upsertCategory)

  return (
    <DefaultVatSelect
      value={cat.vatRate}
      label={`${f.t("settings.defaultVat")} – ${f.catName(cat)}`}
      size="sm"
      className="tabular ml-auto w-24"
      onChange={(rate) => {
        if (rate === cat.vatRate) return
        upsertCategory({ ...cat, vatRate: rate })
        toast.add({
          title: f.t("settings.vatUpdated", {
            c: f.catName(cat),
            r: f.rate(rate),
          }),
        })
      }}
    />
  )
}

/**
 * Restoring the defaults is reversible and keeps the custom categories in
 * use, so it is an outline button beside the table it changes.
 */
function ResetCategories() {
  const f = useFormatters()
  const ctx = useCommandCtx()

  return (
    <Panel
      title={f.t("settings.defaultCategories")}
      description={f.t("settings.resetHint")}
      footer={
        <Button variant="outline" onClick={() => resetCategories(ctx)}>
          {f.t("settings.resetCategories")}
        </Button>
      }
    />
  )
}
