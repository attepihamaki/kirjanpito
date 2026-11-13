"use client"

import * as React from "react"

import { BankReconcile } from "@/components/bank/bank-reconcile"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommandCtx } from "@/hooks/use-commands"
import { bookBankRows, keepStatement } from "@/lib/commands/bank-commands"
import { storeReport } from "@/lib/commands/memo-commands"
import { LINE_BY_KEY, categoryShare } from "@/lib/domain/accounts"
import { parseBankStatement } from "@/lib/domain/bank-camt"
import {
  headerSignature,
  mappingComplete,
  MAX_MAPPING_NAME,
  type BankField,
  type BankMapping,
  type BankParseResult,
  type BankRow,
} from "@/lib/domain/bank-csv"
import { reconcile } from "@/lib/domain/bank-reconcile"
import { statementDraft } from "@/lib/domain/bank-statements"
import {
  proposeForRows,
  rowFingerprints,
  withInvoiceEntries,
  type BankProposal,
} from "@/lib/domain/bank-match"
import { findCategoryRule, ruleForBankRow } from "@/lib/domain/category-rules"
import { todayIso } from "@/lib/domain/dates"
import { formatIban } from "@/lib/domain/iban"
import { uid } from "@/lib/domain/id"
import { periodFromKey } from "@/lib/domain/vat-deadline"
import { unsettledDues } from "@/lib/domain/vat-settlement"
import { vatReturnReport } from "@/lib/domain/year-reports"
import { rateOnDate } from "@/lib/domain/vat-rates"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"
import { announce } from "@/lib/browser/announce"
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
    | "bank.fieldIban"
}[] = [
  { field: "date", label: "bank.fieldDate" },
  { field: "amount", label: "bank.fieldAmount" },
  { field: "debit", label: "bank.fieldDebit" },
  { field: "credit", label: "bank.fieldCredit" },
  { field: "counterparty", label: "bank.fieldCounterparty" },
  { field: "message", label: "bank.fieldMessage" },
  { field: "reference", label: "bank.fieldReference" },
  { field: "iban", label: "bank.fieldIban" },
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
  const saved = useBookStore((s) => s.bankMappings)
  const saveMapping = useBookStore((s) => s.saveBankMapping)
  const [mapping, setMapping] = React.useState<BankMapping | undefined>()
  /* The layout the review was read with, kept while the user changes it. */
  const [editing, setEditing] = React.useState<BankMapping | null>(null)
  /* Set once the user mapped the columns here: the name they kept it under, if any. */
  const [manual, setManual] = React.useState<{ name: string | null } | null>(
    null
  )
  /* Read once with the saved layouts, so saving one here does not re-read the file. */
  const [savedAtOpen] = React.useState(saved)
  const result = React.useMemo(
    () => parseBankStatement(text, mapping, savedAtOpen),
    [text, mapping, savedAtOpen]
  )
  const own = result.ok ? result.saved : undefined
  const mapStep = !result.ok && result.reason === "needs-mapping"

  const apply = (next: BankMapping, keep: { name: string } | null) => {
    if (keep) {
      const signature = headerSignature(result.headers)
      const before = saved.find((m) => m.signature === signature)
      saveMapping({
        id: before?.id ?? `bankmap-${uid()}`,
        name: keep.name,
        signature,
        mapping: next,
      })
      toast.add({ title: f.t("bank.mappingSaved", { x: keep.name }) })
    }
    setMapping(next)
    setManual({ name: keep?.name ?? null })
    setEditing(null)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{f.t("bank.title")}</DialogTitle>
          <DialogDescription>
            {editing
              ? f.t("bank.remapHint")
              : result.ok
                ? f.t("bank.fileHint", {
                    file: fileName,
                    n: result.rows.length,
                  })
                : result.reason === "empty"
                  ? f.t("bank.fileEmpty")
                  : f.t("bank.mapHint")}
          </DialogDescription>
        </DialogHeader>

        {editing || mapStep ? (
          <MappingStep
            headers={result.headers}
            initial={editing ?? (result.ok ? result.mapping : result.suggested)}
            name={own?.name ?? fileStem(fileName)}
            onApply={apply}
            onBack={editing ? () => setEditing(null) : undefined}
          />
        ) : result.ok ? (
          <>
            {result.headers.length > 0 ? (
              <LayoutLine
                result={result}
                manual={manual}
                onChange={() => setEditing(result.mapping)}
              />
            ) : null}
            <Review
              key={JSON.stringify(result.mapping)}
              result={result}
              fileName={fileName}
            />
          </>
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

/** A layout's default name: the file's name without its extension or digits. */
function fileStem(fileName: string): string {
  const stem = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[\d_-]+/g, " ")
    .trim()
  return stem.slice(0, MAX_MAPPING_NAME)
}

/**
 * Which layout the file was read with, and "Vaihda sarakkeet" to map it by
 * hand, where a saved layout can be kept for the next file (§8.16).
 */
function LayoutLine({
  result,
  manual,
  onChange,
}: {
  result: Extract<BankParseResult, { ok: true }>
  manual: { name: string | null } | null
  onChange: () => void
}) {
  const f = useFormatters()
  const saved = manual ? manual.name : result.saved?.name
  const label = saved
    ? f.t("bank.layoutSaved", { x: saved })
    : manual
      ? f.t("bank.layoutManual")
      : result.preset === "op"
        ? f.t("bank.layoutOp")
        : f.t("bank.layoutGuessed")
  return (
    <p className="-mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
      {label}
      <Button
        variant="link"
        size="sm"
        className="h-auto px-0"
        onClick={onChange}
      >
        {f.t("bank.changeColumns")}
      </Button>
    </p>
  )
}

function MappingStep({
  headers,
  initial,
  name: initialName,
  onApply,
  onBack,
}: {
  headers: readonly string[]
  initial: BankMapping
  /** The name a kept layout starts with. */
  name: string
  onApply: (mapping: BankMapping, keep: { name: string } | null) => void
  /** Back to the review without changing anything, when there is one. */
  onBack?: () => void
}) {
  const f = useFormatters()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const readOnly = useBookStore((s) => s.archiveYear !== null)
  const [draft, setDraft] = React.useState<BankMapping>(initial)
  const [keep, setKeep] = React.useState(!readOnly)
  const [name, setName] = React.useState(initialName)
  const keptName = name.trim().slice(0, MAX_MAPPING_NAME)

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
      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={keep}
              onCheckedChange={(v) => setKeep(v === true)}
            />
            {f.t("bank.keepMapping")}
          </label>
          {keep ? (
            <Input
              value={name}
              maxLength={MAX_MAPPING_NAME}
              aria-label={f.t("bank.mappingName")}
              placeholder={f.t("bank.mappingName")}
              aria-invalid={!keptName}
              className="w-56"
              onChange={(e) => setName(e.target.value)}
            />
          ) : null}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onBack ?? closeDialog}>
          {onBack ? f.t("bank.backToReview") : f.t("common.cancel")}
        </Button>
        <Button
          disabled={!mappingComplete(draft) || (keep && !keptName)}
          onClick={() => onApply(draft, keep ? { name: keptName } : null)}
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
  fileName,
}: {
  result: Extract<BankParseResult, { ok: true }>
  fileName: string
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
        todayIso(),
        useBookStore.getState().vatCash
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
  const planned = React.useMemo(
    () =>
      new Set(
        plans.flatMap((p, i) =>
          p.action === "match" || p.action === "new" ? [i] : []
        )
      ),
    [plans]
  )
  const paidCount = plans.filter((p) => p.action === "match").length
  const newCount = plans.filter((p) => p.action === "new").length
  const reconciliation = React.useMemo(
    () => reconcile(result.rows, result.statement, entries, catMap, planned),
    [result, entries, catMap, planned]
  )
  /* The statement's record for the reconciliation page (§8.38). */
  const draft = () =>
    reconciliation
      ? statementDraft({
          id: `stmt-${uid()}`,
          from: reconciliation.from,
          to: reconciliation.to,
          rows: result.rows.length,
          movement: reconciliation.statementMovement,
          statement: result.statement,
          fileName,
          today: todayIso(),
        })
      : undefined

  /* What the statement held, said once when the review opens (§11). */
  React.useEffect(() => {
    announce(
      f.t("bank.readAnnounce", {
        n: result.rows.length,
        paid: paidCount,
        added: newCount,
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on opening
  }, [])

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
          // The category's default business share, as the entry dialog gives it (§6.12).
          ...(row.amount < 0 ? categoryShare(cat) : {}),
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
            vatCash: state.vatCash,
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
      statement: draft(),
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
                      <>
                        <OptionSelect
                          options={categoryOptions(type, plan.catId)}
                          value={plan.catId}
                          placeholder={f.t("bank.pickCategory")}
                          label={f.t("bank.colCategory")}
                          invalid={!plan.catId}
                          onChange={(v) => patch(i, { catId: v })}
                        />
                        <MakeRule row={row} catId={plan.catId} type={type} />
                      </>
                    ) : null}{" "}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <BankReconcile result={reconciliation} statement={result.statement} />

      <DialogFooter className="items-center">
        {/* Mounted while empty, so a hint that appears is read out (§11). */}
        <p
          role="status"
          className="mr-auto text-sm text-muted-foreground empty:hidden"
        >
          {hint}
        </p>
        <Button variant="outline" onClick={closeDialog}>
          {f.t("common.cancel")}
        </Button>
        {paidCount + newCount === 0 && reconciliation ? (
          /* Nothing to book: the statement can still go on the reconciliation page. */
          <Button
            disabled={busy || claimedTwice}
            onClick={() => {
              const statement = draft()
              if (statement) keepStatement(ctx, statement)
              closeDialog()
            }}
          >
            {f.t("bank.keepStatement")}
          </Button>
        ) : (
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
        )}
      </DialogFooter>
    </>
  )
}

/**
 * "Tee sääntö" under a new row's category (§8.17): a rule from the row's
 * account or name, so the next statement picks the category by itself. It is
 * offered only while no rule already sends the row to that category.
 */
function MakeRule({
  row,
  catId,
  type,
}: {
  row: BankRow
  catId: string
  type: "income" | "expense"
}) {
  const f = useFormatters()
  const rules = useBookStore((s) => s.categoryRules)
  const cats = useBookStore((s) => s.cats)
  const upsert = useBookStore((s) => s.upsertCategoryRule)
  const remove = useBookStore((s) => s.removeCategoryRule)
  if (!catId) return null
  const draft = ruleForBankRow(row, catId)
  if (!draft) return null
  const hit = findCategoryRule(
    rules,
    {
      text: [row.counterparty, row.message].join(" "),
      iban: row.iban,
      reference: row.reference,
    },
    indexCategories(cats),
    type
  )
  if (hit?.catId === catId) return null
  const what =
    draft.field === "iban" ? formatIban(draft.contains) : draft.contains
  return (
    <Button
      variant="link"
      size="sm"
      className="mt-1 h-auto px-0 text-xs"
      onClick={() => {
        const rule = { id: `rule-${uid()}`, ...draft }
        upsert(rule)
        const id = toast.add({
          title: f.t("bank.ruleMade", { x: what }),
          actionProps: {
            children: f.t("common.undo"),
            onClick: () => {
              toast.close(id)
              remove(rule.id)
            },
          },
        })
      }}
    >
      {draft.field === "iban"
        ? f.t("bank.makeRuleIban", { x: what })
        : f.t("bank.makeRuleText", { x: what })}
    </Button>
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
