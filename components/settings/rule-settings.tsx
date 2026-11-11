"use client"

import * as React from "react"
import { Empty, EmptyDescription } from "@/components/ui/empty"
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
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import {
  MIN_RULE_TEXT,
  normalizeRuleValue,
  RULE_FIELDS,
  type CategoryRule,
  type RuleField,
} from "@/lib/domain/category-rules"
import { formatIban } from "@/lib/domain/iban"
import { todayIso } from "@/lib/domain/dates"
import { indexCategories } from "@/lib/domain/types"
import { validRates } from "@/lib/domain/vat-rates"
import { uid } from "@/lib/domain/id"
import { useBookStore } from "@/stores/book-store"

/** The option that leaves the rate to the category. */
const CATEGORY_DEFAULT = "default"

const FIELD_LABEL = {
  text: "settings.rulesFieldText",
  iban: "settings.rulesFieldIban",
  reference: "settings.rulesFieldReference",
} as const

const FIELD_PLACEHOLDER = {
  text: "settings.rulesPlaceholder",
  iban: "settings.rulesPlaceholderIban",
  reference: "settings.rulesPlaceholderReference",
} as const

const FIELD_ERROR = {
  text: "settings.rulesTextError",
  iban: "settings.rulesIbanError",
  reference: "settings.rulesTextError",
} as const

/** The rule's value as the user reads it: an IBAN in groups of four. */
const shown = (rule: CategoryRule) =>
  rule.field === "iban" ? formatIban(rule.contains) : rule.contains

/**
 * The rules for picking a category (§8.17). The first rule that fits a bank
 * row or an invoice, by its text, the other party's IBAN or the reference,
 * wins, so the order is the user's to set.
 */
export function RuleSettings() {
  const f = useFormatters()
  const rules = useBookStore((s) => s.categoryRules)
  const cats = useBookStore((s) => s.cats)
  const upsert = useBookStore((s) => s.upsertCategoryRule)
  const remove = useBookStore((s) => s.removeCategoryRule)
  const move = useBookStore((s) => s.moveCategoryRule)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])

  const [field, setField] = React.useState<RuleField>("text")
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
        }: ${f.catLabel(c)}`,
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

  const fieldOptions = RULE_FIELDS.map((value) => ({
    value,
    label: f.t(FIELD_LABEL[value]),
  }))
  const containsInvalid = normalizeRuleValue(field, contains) == null

  const add = () => {
    const value = normalizeRuleValue(field, contains)
    if (!value) {
      setError(f.t(FIELD_ERROR[field], { n: MIN_RULE_TEXT }))
      return
    }
    if (!catId) {
      setError(f.t("settings.rulesCategoryError"))
      return
    }
    upsert({
      id: `rule-${uid()}`,
      contains: value,
      ...(field === "text" ? {} : { field }),
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
        <OptionSelect
          options={fieldOptions}
          value={field}
          onChange={(next) => {
            setField(next as RuleField)
            setError(null)
          }}
          label={f.t("settings.rulesField")}
          className="w-44"
        />
        <Input
          aria-label={f.t("settings.rulesContains")}
          aria-invalid={error != null && containsInvalid}
          placeholder={f.t(FIELD_PLACEHOLDER[field])}
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
        <Empty>
          <EmptyDescription>{f.t("settings.rulesEmpty")}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("settings.rulesField")}</TableHead>
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
              const ruleField = rule.field ?? "text"
              return (
                <TableRow key={rule.id}>
                  <TableCell>
                    <OptionSelect
                      options={fieldOptions}
                      value={ruleField}
                      onChange={(next) => {
                        const kind = next as RuleField
                        const value = normalizeRuleValue(kind, rule.contains)
                        /* A value that does not fit the new field keeps the rule as it was. */
                        if (!value) {
                          toast.add({
                            title: f.t(FIELD_ERROR[kind], { n: MIN_RULE_TEXT }),
                          })
                          return
                        }
                        upsert({
                          id: rule.id,
                          contains: value,
                          ...(kind === "text" ? {} : { field: kind }),
                          catId: rule.catId,
                          vatRate: rule.vatRate,
                        })
                      }}
                      label={f.t("settings.rulesField")}
                      className="w-44"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`${ruleField}:${rule.contains}`}
                      aria-label={f.t("settings.rulesContains")}
                      className="w-56"
                      defaultValue={shown(rule)}
                      onBlur={(event) => {
                        const next = normalizeRuleValue(
                          ruleField,
                          event.target.value
                        )
                        if (!next) {
                          event.target.value = shown(rule)
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
                      aria-label={f.t("settings.rulesUp", { x: shown(rule) })}
                      onClick={() => move(rule.id, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === rules.length - 1}
                      aria-label={f.t("settings.rulesDown", {
                        x: shown(rule),
                      })}
                      onClick={() => move(rule.id, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("recurring.remove", { x: shown(rule) })}
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
