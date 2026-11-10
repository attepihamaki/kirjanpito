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
import { storeReport } from "@/lib/commands/memo-commands"
import { LINE_BY_KEY } from "@/lib/domain/accounts"
import {
  mappingComplete,
  parseBankCsv,
  type BankField,
  type BankMapping,
  type BankParseResult,
  type BankRow,
} from "@/lib/domain/bank-csv"
import {
  proposeForRows,
  rowFingerprints,
  withInvoiceEntries,
  type BankProposal,
} from "@/lib/domain/bank-match"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import { unsettledDues } from "@/lib/domain/vat-settlement"
import { vatReturnReport } from "@/lib/domain/year-reports"
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
    case "seen":
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
  const invoices = useBookStore((s) => s.invoices)
  const cats = useBookStore((s) => s.cats)
  const closeDialog = useBookStore((s) => s.closeDialog)
  const categoryRules = useBookStore((s) => s.categoryRules)
  const bankSeen = useBookStore((s) => s.bankSeen)
  const catMap = React.useMemo(() => indexCategories(cats), [cats])
  const byId = React.useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries]
  )

  // Decided once, so ticking a row never reshuffles the proposals.
  const [proposals] = React.useState(() =>
    proposeForRows(result.rows, {
      entries,
      invoices,
      parties: useBookStore.getState().customers,
      cats: catMap,
      rules: categoryRules,
      seen: new Set(bankSeen),
      dues: unsettledDues(
        entries,
        catMap,
        useBookStore.getState().vatPeriod,
        todayIso()
      ),
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
      .map((c) => ({ value: c.id, label: f.catLabel(c) }))

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
    /* Rows the reference proved to pay an invoice, whose other entries are paid with it. */
    const byReference: { entryId: string; on: string }[] = []
    const added: Entry[] = []
    /* Rows that pay an invoice in part, recorded as that amount and no more (§8.27). */
    const partial: { invoiceId: string; amount: number; on: string }[] = []
    plans.forEach((plan, i) => {
      const row: BankRow = result.rows[i]
      if (plan.action === "match") {
        const proposal = proposals[i]
        if (
          proposal.kind === "match" &&
          proposal.partial &&
          proposal.entryId === plan.entryId
        ) {
          partial.push({
            invoiceId: proposal.partial.invoiceId,
            amount: row.amount,
            on: row.date,
          })
          return
        }
        const payment = { entryId: plan.entryId, on: row.date }
        paid.push(payment)
        if (
          proposal.kind === "match" &&
          proposal.confidence === "reference" &&
          proposal.entryId === plan.entryId
        )
          byReference.push(payment)
      } else if (plan.action === "new") {
        const draft = proposals[i].kind === "new" ? proposals[i].draft : null
        const cat = catMap.get(plan.catId)
        if (!cat) return
        const vatRate =
          draft && draft.catId === plan.catId && draft.vatRate != null
            ? draft.vatRate
            : rateOnDate(cat.vatRate, row.date)
        const settles =
          draft && draft.catId === plan.catId ? draft.settles : undefined
        added.push({
          id: `e-${uid()}`,
          date: row.date,
          description: plan.description.trim() || row.counterparty,
          type: row.amount >= 0 ? "income" : "expense",
          catId: plan.catId,
          amount: Math.abs(row.amount),
          vatRate,
          amountMode: "gross",
          ...(settles ? { settles } : {}),
          ...(draft?.party ? { party: draft.party } : {}),
        })
      }
    })
    setBusy(true)
    /*
     * A row booked as the payment or refund of a VAT return carries that
     * return as its receipt, as the return dialog's button does (§6.6).
     */
    const held: string[] = []
    const state = useBookStore.getState()
    for (const [i, entry] of added.entries()) {
      const period = entry.settles ? periodFromKey(entry.settles) : null
      if (!period) continue
      const att = await storeReport(
        ctx,
        vatReturnReport(
          f,
          {
            entries: state.entries,
            cats: state.cats,
            businessName: state.businessName ?? "",
            businessId: state.businessId ?? "",
            vatFiled: state.vatFiled,
            vatFiledFigures: state.vatFiledFigures,
          },
          period
        )
      )
      if (att) {
        added[i] = { ...entry, atts: [att] }
        if (att.id) held.push(att.id)
      }
    }
    const done = await bookBankRows(ctx, {
      paid: [
        ...paid,
        ...withInvoiceEntries(byReference, invoices, entries).slice(
          byReference.length
        ),
      ],
      added,
      partial,
      seen: rowFingerprints(result.rows),
    })
    if (held.length) {
      const store = useBookStore.getState()
      store.setDraftAttachmentIds(
        store.draftAttachmentIds.filter((d) => !held.includes(d))
      )
    }
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
                    ) : null}{" "}
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
      if (p.partial) return f.t("bank.statusPartial")
      return p.confidence === "reference"
        ? f.t("bank.statusReference")
        : p.confidence === "likely"
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
    case "seen":
      return f.t("bank.statusSeen")
    case "new":
      if (!p.draft.catId) return f.t("bank.statusNoCategory")
      return p.draft.guessed
        ? f.t("bank.statusGuessed")
        : f.t("bank.statusSuggested")
  }
}
