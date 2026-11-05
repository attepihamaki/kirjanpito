"use client"

import * as React from "react"

import { Money } from "@/components/common/money"
import { OptionSelect, type Option } from "@/components/common/option-select"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommandCtx } from "@/hooks/use-commands"
import { bookBankRows } from "@/lib/commands/bank-commands"
import { LINE_BY_KEY, categoryLabel } from "@/lib/domain/accounts"
import {
  mappingComplete,
  parseBankCsv,
  type BankField,
  type BankMapping,
  type BankParseResult,
  type BankRow,
} from "@/lib/domain/bank-csv"
import { proposeForRows, type BankProposal } from "@/lib/domain/bank-match"
import { uid } from "@/lib/domain/id"
import { rateOnDate } from "@/lib/domain/vat-rates"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/** Review a bank statement and book it (§8.16). */
export function BankImportDialog() {
  const dialog = useBookStore((s) => s.dialog)
  if (dialog.kind !== "bank-import") return null
  return <BankImportForm text={dialog.text} fileName={dialog.fileName} />
}

const NONE = "-"

const MAPPING_FIELDS: readonly {
  field: BankField
  label:
    | "bank.fieldDate"
    | "bank.fieldAmount"
    | "bank.fieldDebit"
    | "bank.fieldCredit"
    | "bank.fieldCounterparty"
    | "bank.fieldMessage"
    | "bank.fieldReference"
}[] = [
  { field: "date", label: "bank.fieldDate" },
  { field: "amount", label: "bank.fieldAmount" },
  { field: "debit", label: "bank.fieldDebit" },
  { field: "credit", label: "bank.fieldCredit" },
  { field: "counterparty", label: "bank.fieldCounterparty" },
  { field: "message", label: "bank.fieldMessage" },
  { field: "reference", label: "bank.fieldReference" },
]

function BankImportForm({
  text,
  fileName,
}: {
  text: string
  fileName: string
}) {
  const f = useFormatters()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const [mapping, setMapping] = React.useState<BankMapping | undefined>()
  const result = React.useMemo(
    () => parseBankCsv(text, mapping),
    [text, mapping]
  )

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{f.t("bank.title")}</DialogTitle>
          <DialogDescription>
            {result.ok
              ? f.t("bank.fileHint", { file: fileName, n: result.rows.length })
              : result.reason === "empty"
                ? f.t("bank.fileEmpty")
                : f.t("bank.mapHint")}
          </DialogDescription>
        </DialogHeader>

        {result.ok ? (
          <Review result={result} />
        ) : result.reason === "needs-mapping" ? (
          <MappingStep
            headers={result.headers}
            initial={result.suggested}
            onApply={setMapping}
          />
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {f.t("common.cancel")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------
 * Mapping
 * ---------------------------------------------------------------------- */

function MappingStep({
  headers,
  initial,
  onApply,
}: {
  headers: readonly string[]
  initial: BankMapping
  onApply: (mapping: BankMapping) => void
}) {
  const f = useFormatters()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const [draft, setDraft] = React.useState<BankMapping>(initial)

  const options: Option[] = [
    { value: NONE, label: f.t("bank.noColumn") },
    ...headers.map((h) => ({ value: h, label: h })),
  ]
  const set = (field: BankField, value: string) =>
    setDraft((d) => {
      const next = { ...d }
      if (value === NONE) delete next[field]
      else next[field] = value
      return next
    })

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAPPING_FIELDS.map(({ field, label }) => (
          <label key={field} className="flex flex-col gap-1.5 text-sm">
            {f.t(label)}
            <OptionSelect
              options={options}
              value={draft[field] ?? NONE}
              onChange={(v) => set(field, v)}
              label={f.t(label)}
            />
          </label>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={closeDialog}>
          {f.t("common.cancel")}
        </Button>
        <Button
          disabled={!mappingComplete(draft)}
          onClick={() => onApply(draft)}
        >
          {f.t("bank.useMapping")}
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Review
 * ---------------------------------------------------------------------- */

/** What the user has decided for one row. */
interface Plan {
  action: "skip" | "new" | "match"
  entryId: string
  catId: string
  description: string
}

const SKIP = "skip"
const NEW = "new"
const MATCH = "match:"

function initialPlan(p: BankProposal): Plan {
  switch (p.kind) {
    case "match":
      return { action: "match", entryId: p.entryId, catId: "", description: "" }
    case "ambiguous":
    case "booked":
      return { action: "skip", entryId: "", catId: "", description: "" }
    case "new":
      return {
        action: "new",
        entryId: "",
        catId: p.draft.catId ?? "",
        description: p.draft.description,
      }
  }
}

function candidateIds(p: BankProposal): string[] {
  if (p.kind === "match") return [p.entryId]
  if (p.kind === "ambiguous") return p.entryIds
  return []
}

function Review({
  result,
}: {
  result: Extract<BankParseResult, { ok: true }>
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const categoryRules = useBookStore((s) => s.categoryRules)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )

  // Decided once, so ticking a row never reshuffles the proposals.
  const [proposals] = React.useState(() =>
    proposeForRows(result.rows, {
      entries,
      cats: catMap,
      rules: categoryRules,
    })
  )
  const [plans, setPlans] = React.useState<Plan[]>(() =>
    proposals.map(initialPlan)
  )
  const [busy, setBusy] = React.useState(false)

  const patch = (i: number, change: Partial<Plan>) =>
    setPlans((all) => all.map((p, j) => (j === i ? { ...p, ...change } : p)))

  const categoryOptions = (type: "income" | "expense", current: string) =>
    cats
      .filter(
        (c: Category) =>
          c.id === current ||
          (c.enabled && !c.euPurchase && LINE_BY_KEY.get(c.line)?.side === type)
      )
      .map((c) => ({ value: c.id, label: categoryLabel(c, f.lang) }))

  const missingCategory = plans.filter(
    (p) => p.action === "new" && !p.catId
  ).length
  const claims = new Map<string, number>()
  for (const p of plans) {
    if (p.action === "match")
      claims.set(p.entryId, (claims.get(p.entryId) ?? 0) + 1)
  }
  const claimedTwice = [...claims.values()].some((n) => n > 1)
  const paidCount = plans.filter((p) => p.action === "match").length
  const newCount = plans.filter((p) => p.action === "new").length

  const book = async () => {
    const paid: { entryId: string; on: string }[] = []
    const added: Entry[] = []
    plans.forEach((plan, i) => {
      const row: BankRow = result.rows[i]
      if (plan.action === "match") {
        paid.push({ entryId: plan.entryId, on: row.date })
      } else if (plan.action === "new") {
        const draft = proposals[i].kind === "new" ? proposals[i].draft : null
        const cat = catMap.get(plan.catId)
        if (!cat) return
        const vatRate =
          draft && draft.catId === plan.catId && draft.vatRate != null
            ? draft.vatRate
            : rateOnDate(cat.vatRate, row.date)
        added.push({
          id: `e-${uid()}`,
          date: row.date,
          description: plan.description.trim() || row.counterparty,
          type: row.amount >= 0 ? "income" : "expense",
          catId: plan.catId,
          amount: Math.abs(row.amount),
          vatRate,
          amountMode: "gross",
        })
      }
    })
    setBusy(true)
    const done = await bookBankRows(ctx, { paid, added })
    setBusy(false)
    if (done) closeDialog()
  }

  const hint = claimedTwice
    ? f.t("bank.claimedTwice")
    : missingCategory > 0
      ? f.t("bank.needCategory", { n: missingCategory })
      : result.skipped.length > 0
        ? f.t("bank.skippedRows", { n: result.skipped.length })
        : ""

  return (
    <>
      <div className="max-h-[60vh] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("bank.colDate")}</TableHead>
              <TableHead>{f.t("bank.colParty")}</TableHead>
              <TableHead className="text-right">
                {f.t("bank.colAmount")}
              </TableHead>
              <TableHead>{f.t("bank.colAction")}</TableHead>
              <TableHead>{f.t("bank.colCategory")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row, i) => {
              const proposal = proposals[i]
              const plan = plans[i]
              const type = row.amount >= 0 ? "income" : "expense"
              const actions: Option[] = [
                { value: SKIP, label: f.t("bank.actionSkip") },
                { value: NEW, label: f.t("bank.actionNew") },
                ...candidateIds(proposal).flatMap((id) => {
                  const e = byId.get(id)
                  return e
                    ? [
                        {
                          value: MATCH + id,
                          label: f.t("bank.actionPaid", {
                            v: `${e.voucher ?? ""} ${e.description}`.trim(),
                          }),
                        },
                      ]
                    : []
                }),
              ]
              const value =
                plan.action === "match" ? MATCH + plan.entryId : plan.action
              const note = noteFor(proposal, byId, f)
              return (
                <TableRow key={i}>
                  <TableCell className="align-top whitespace-nowrap">
                    {f.date(row.date)}
                  </TableCell>
                  <TableCell className="min-w-48 align-top">
                    {plan.action === "new" ? (
                      <Input
                        value={plan.description}
                        aria-label={f.t("bank.colParty")}
                        onChange={(e) =>
                          patch(i, { description: e.target.value })
                        }
                      />
                    ) : (
                      <span className="block max-w-72 truncate">
                        {row.counterparty}
                        {row.message ? ` – ${row.message}` : ""}
                      </span>
                    )}
                    {note ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {note}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Money cents={row.amount} tone={type} />
                  </TableCell>
                  <TableCell className="min-w-44 align-top">
                    <OptionSelect
                      options={actions}
                      value={value}
                      label={f.t("bank.colAction")}
                      onChange={(v) => {
                        if (v === SKIP)
                          patch(i, { action: "skip", entryId: "" })
                        else if (v === NEW)
                          patch(i, { action: "new", entryId: "" })
                        else
                          patch(i, {
                            action: "match",
                            entryId: v.slice(MATCH.length),
                          })
                      }}
                    />
                  </TableCell>
                  <TableCell className="min-w-48 align-top">
                    {plan.action === "new" ? (
                      <OptionSelect
                        options={categoryOptions(type, plan.catId)}
                        value={plan.catId}
                        placeholder={f.t("bank.pickCategory")}
                        label={f.t("bank.colCategory")}
                        invalid={!plan.catId}
                        onChange={(v) => patch(i, { catId: v })}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DialogFooter className="items-center">
        {hint ? (
          <p className="mr-auto text-sm text-muted-foreground">{hint}</p>
        ) : null}
        <Button variant="outline" onClick={closeDialog}>
          {f.t("common.cancel")}
        </Button>
        <Button
          disabled={
            busy ||
            claimedTwice ||
            missingCategory > 0 ||
            paidCount + newCount === 0
          }
          onClick={() => void book()}
        >
          {f.t("bank.confirm", { paid: paidCount, added: newCount })}
        </Button>
      </DialogFooter>
    </>
  )
}

function noteFor(
  p: BankProposal,
  byId: ReadonlyMap<string, Entry>,
  f: ReturnType<typeof useFormatters>
): string {
  switch (p.kind) {
    case "match":
      return p.confidence === "likely"
        ? f.t("bank.statusLikely")
        : f.t("bank.statusAmount")
    case "ambiguous":
      return f.t("bank.statusAmbiguous")
    case "booked": {
      const e = byId.get(p.entryId)
      return f.t("bank.statusBooked", {
        v: e ? `${e.voucher ?? ""} ${e.description}`.trim() : "",
      })
    }
    case "new":
      return p.draft.catId
        ? f.t("bank.statusSuggested")
        : f.t("bank.statusNoCategory")
  }
}
