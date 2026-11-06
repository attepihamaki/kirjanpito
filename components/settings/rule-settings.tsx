"use client"

import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react"

import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
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
import { categoryLabel, LINE_BY_KEY } from "@/lib/domain/accounts"
import {
  foldText,
  MIN_RULE_TEXT,
  type CategoryRule,
} from "@/lib/domain/category-rules"
import { todayIso } from "@/lib/domain/dates"
import { indexCategories } from "@/lib/domain/types"
import { validRates } from "@/lib/domain/vat-rates"
import { uid } from "@/lib/domain/id"
import { useBookStore } from "@/stores/book-store"

/** The option that leaves the rate to the category. */
const CATEGORY_DEFAULT = "default"

/**
 * The rules for picking a category (§8.17). The first rule whose text appears
 * in a bank row or an invoice wins, so the order is the user's to set.
 */
export function RuleSettings() {
  const f = useFormatters()
  const rules = useBookStore((s) => s.categoryRules)
  const cats = useBookStore((s) => s.cats)
  const upsert = useBookStore((s) => s.upsertCategoryRule)
  const remove = useBookStore((s) => s.removeCategoryRule)
  const move = useBookStore((s) => s.moveCategoryRule)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const [contains, setContains] = React.useState("")
  const [catId, setCatId] = React.useState("")
  const [rate, setRate] = React.useState(CATEGORY_DEFAULT)
  const [error, setError] = React.useState<string | null>(null)

  /* Enabled categories, income before expenses, as the entry dialog lists them. */
  const catOptions = (current?: string) =>
    cats
      .filter((c) => c.enabled || c.id === current)
      .map((c) => ({
        value: c.id,
        label: `${
          LINE_BY_KEY.get(c.line)?.side === "income"
            ? f.t("common.income")
            : f.t("common.expense")
        }: ${categoryLabel(c, f.lang)}`,
      }))

  const valid = validRates(todayIso())
  const rateOptions = (current: number | null) => [
    { value: CATEGORY_DEFAULT, label: f.t("settings.rulesRateDefault") },
    ...(current != null && !valid.includes(current)
      ? [...valid, current]
      : valid
    ).map((r) => ({ value: String(r), label: f.rate(r) })),
  ]
  const toRate = (value: string) =>
    value === CATEGORY_DEFAULT ? null : Number(value)

  const add = () => {
    if (foldText(contains).length < MIN_RULE_TEXT) {
      setError(f.t("settings.rulesTextError", { n: MIN_RULE_TEXT }))
      return
    }
    if (!catId) {
      setError(f.t("settings.rulesCategoryError"))
      return
    }
    upsert({
      id: `rule-${uid()}`,
      contains: contains.trim(),
      catId,
      vatRate: toRate(rate),
    })
    setContains("")
    setError(null)
  }

  const removeRule = (rule: CategoryRule) => {
    remove(rule.id)
    const id = toast.add({
      title: f.t("settings.rulesDeleted"),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          upsert(rule)
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("settings.rulesTitle")}
      description={f.t("settings.rulesHint")}
    >
      <form
        className="flex flex-wrap items-start gap-2 border-b p-4"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <Input
          aria-label={f.t("settings.rulesContains")}
          aria-invalid={
            error != null && foldText(contains).length < MIN_RULE_TEXT
          }
          placeholder={f.t("settings.rulesPlaceholder")}
          className="w-56"
          value={contains}
          onChange={(event) => {
            setContains(event.target.value)
            setError(null)
          }}
        />
        <OptionSelect
          options={catOptions()}
          value={catId}
          onChange={(next) => {
            setCatId(next)
            setError(null)
          }}
          placeholder={f.t("settings.rulesCategory")}
          label={f.t("settings.rulesCategory")}
          invalid={error != null && !catId}
          className="w-72"
        />
        <OptionSelect
          options={rateOptions(null)}
          value={rate}
          onChange={setRate}
          label={f.t("settings.defaultVat")}
          className="w-44"
        />
        <Button type="submit">{f.t("settings.rulesAdd")}</Button>
        {error ? <FieldError className="basis-full">{error}</FieldError> : null}
      </form>

      {rules.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {f.t("settings.rulesEmpty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("settings.rulesContains")}</TableHead>
              <TableHead>{f.t("settings.rulesCategory")}</TableHead>
              <TableHead>{f.t("settings.defaultVat")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, i) => {
              const cat = catMap.get(rule.catId)
              const usable = !!cat?.enabled
              return (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Input
                      key={rule.contains}
                      aria-label={f.t("settings.rulesContains")}
                      className="w-56"
                      defaultValue={rule.contains}
                      onBlur={(event) => {
                        const next = event.target.value.trim()
                        if (foldText(next).length < MIN_RULE_TEXT) {
                          event.target.value = rule.contains
                        } else if (next !== rule.contains) {
                          upsert({ ...rule, contains: next })
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <OptionSelect
                      options={catOptions(rule.catId)}
                      value={rule.catId}
                      onChange={(next) => upsert({ ...rule, catId: next })}
                      label={f.t("settings.rulesCategory")}
                      className="w-72"
                    />
                    {usable ? null : (
                      <p className="mt-1 text-xs text-warning">
                        {f.t("settings.rulesUnusable")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <OptionSelect
                      options={rateOptions(rule.vatRate)}
                      value={
                        rule.vatRate == null
                          ? CATEGORY_DEFAULT
                          : String(rule.vatRate)
                      }
                      onChange={(next) =>
                        upsert({ ...rule, vatRate: toRate(next) })
                      }
                      label={f.t("settings.defaultVat")}
                      className="w-44"
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === 0}
                      aria-label={f.t("settings.rulesUp", { x: rule.contains })}
                      onClick={() => move(rule.id, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === rules.length - 1}
                      aria-label={f.t("settings.rulesDown", {
                        x: rule.contains,
                      })}
                      onClick={() => move(rule.id, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("recurring.remove", { x: rule.contains })}
                      onClick={() => removeRule(rule)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
