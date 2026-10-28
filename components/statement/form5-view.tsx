"use client"

import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CornerDownRightIcon,
  ExternalLinkIcon,
} from "lucide-react"

import { Money } from "@/components/common/money"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { useFormatters } from "@/components/lang-provider"
import {
  form5Sections,
  type Form5Row,
  type Form5Section,
} from "@/lib/domain/form5"
import { incomeStatement } from "@/lib/domain/income-statement"
import { formatAmountForCsv } from "@/lib/domain/money"
import { indexCategories } from "@/lib/domain/types"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

type FieldRow = Extract<Form5Row, { kind: "field" }>
type Show = "fill" | "all"

const OMAVERO_URL = "https://www.vero.fi/omavero/"

/**
 * The year's figures as Form 5's fields (§8.8), in the form's order and with
 * its labels, so each one can be copied into OmaVero by its code. The sheet
 * groups the same figures by heading instead; the codes are what match.
 *
 * It opens on "Täytettävät": the fields with an amount, as a checklist that
 * tracks what has been copied, then the totals to check against. "Kaikki
 * kohdat" shows the whole form, for finding a field by its place on it.
 */
export function Form5View() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const year = useBookStore((s) => s.year)
  const [show, setShow] = React.useState<Show>("fill")
  const [copied, setCopied] = React.useState<ReadonlySet<number>>(new Set())

  const sections = React.useMemo(
    () => form5Sections(incomeStatement(entries, indexCategories(cats), year)),
    [entries, cats, year]
  )
  const { inputs, totals, fieldCount } = React.useMemo(
    () => summarise(sections),
    [sections]
  )
  const copiedCount = inputs.filter(({ row }) => copied.has(row.code)).length

  async function copy(row: FieldRow) {
    try {
      await navigator.clipboard.writeText(formatAmountForCsv(row.value))
      setCopied((prev) => new Set(prev).add(row.code))
    } catch {
      toast.add({ title: f.t("statement.copyFailed") })
    }
  }

  return (
    /*
     * The statement's --sheet surface (§11), so the two tabs read as two views
     * of one document: warm paper in light, the card tone in dark.
     */
    <div className="print-sheet mx-auto flex max-w-2xl flex-col gap-6 rounded-xl border border-sheet-edge bg-sheet p-4 shadow-sm sm:p-7">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {f.t("statement.form5Kicker", { y: String(year) })}
          </span>
          <a
            href={OMAVERO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="print-hidden focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline"
          >
            {f.t("statement.form5OpenOmaVero")}
            <ExternalLinkIcon aria-hidden className="size-3.5" />
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-[1.625rem] leading-tight font-semibold tracking-[-0.01em]">
            {f.t("statement.form5Title")}
          </h2>
          <p className="print-hidden text-muted-foreground">
            {f.t("statement.form5Intro")}
          </p>
        </div>
        <ToggleGroup
          aria-label={f.t("statement.form5Show")}
          className="print-hidden grid w-full grid-cols-2 rounded-lg bg-muted p-1"
          value={[show]}
          onValueChange={(next) => {
            const picked = next[0] as Show | undefined
            if (picked) setShow(picked)
          }}
        >
          <ToggleGroupItem
            value="fill"
            className="gap-2 hover:bg-card/60 aria-pressed:bg-card aria-pressed:shadow-xs"
          >
            {f.t("statement.form5Filled")}
            <CountBadge active={show === "fill"}>{inputs.length}</CountBadge>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="all"
            className="gap-2 hover:bg-card/60 aria-pressed:bg-card aria-pressed:shadow-xs"
          >
            {f.t("statement.form5All")}
            <CountBadge active={show === "all"}>{fieldCount}</CountBadge>
          </ToggleGroupItem>
        </ToggleGroup>
      </header>

      {show === "fill" ? (
        <div className="flex flex-col gap-7">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <StepHeading step={1} filled>
                {f.t("statement.form5StepInput")}
              </StepHeading>
              {inputs.length ? (
                <span className="tabular text-sm text-muted-foreground">
                  {f.t("statement.form5Progress", {
                    n: String(copiedCount),
                    m: String(inputs.length),
                  })}
                </span>
              ) : null}
            </div>
            {inputs.length ? (
              <>
                <div
                  aria-hidden
                  className="print-hidden h-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{
                      width: `${Math.round((copiedCount / inputs.length) * 100)}%`,
                    }}
                  />
                </div>
                <ul className="flex flex-col gap-2">
                  {inputs.map(({ row, section }) => (
                    <li
                      key={row.code}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-sheet-edge py-1 pr-1 pl-3 sm:gap-x-3.5"
                    >
                      <CodeChip tone="solid">{row.code}</CodeChip>
                      <div className="flex min-w-36 flex-1 flex-col gap-0.5 py-1">
                        <span className="leading-snug font-medium">
                          {row.label[f.lang]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sectionName(section, f.lang)}
                        </span>
                      </div>
                      <CopyButton
                        row={row}
                        copied={copied.has(row.code)}
                        onCopy={() => void copy(row)}
                      />
                    </li>
                  ))}
                </ul>
                {copiedCount === inputs.length ? (
                  <output className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckIcon aria-hidden className="size-4" />
                    {f.t("statement.form5AllDone")}
                  </output>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {f.t("statement.form5Nothing")}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <StepHeading step={2}>
                {f.t("statement.form5StepCheck")}
              </StepHeading>
              <p className="ml-[2.125rem] text-sm text-muted-foreground">
                {f.t("statement.form5CheckHint")}
              </p>
            </div>
            <ul className="overflow-hidden rounded-lg border border-sheet-edge">
              {totals.map((row) => (
                <li
                  key={row.code}
                  className="flex min-h-12 items-center gap-3 border-b border-sheet-edge px-3 py-1 last:border-b-0 sm:gap-3.5 sm:px-4"
                >
                  <CodeChip tone="outline">{row.code}</CodeChip>
                  <span className="min-w-0 flex-1 text-sm leading-snug">
                    {row.label[f.lang]}
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    <Money cents={row.value} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sections.map((section) => (
            <AllFieldsSection
              key={section.title.fi}
              section={section}
              copied={copied}
              onCopy={(row) => void copy(row)}
            />
          ))}
        </div>
      )}

      <details className="group border-t border-sheet-edge pt-1">
        <summary className="print-hidden focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {f.t("statement.form5NotIncluded")}
          <ChevronDownIcon
            aria-hidden
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-2.5 pt-1 pb-2 text-sm text-muted-foreground">
          <p>{f.t("statement.form5Assumed")}</p>
          <p>{f.t("statement.form5Missing")}</p>
        </div>
      </details>

      <p className="text-xs text-muted-foreground">{f.t("landing.footer")}</p>
    </div>
  )
}

/**
 * The fields to type in (every field with an amount, totals aside), the
 * totals to check them against, and how many fields the form has in all. The
 * result is whichever of 358 and 359 applies; the other stays out.
 */
function summarise(sections: readonly Form5Section[]) {
  const inputs: { row: FieldRow; section: Form5Section }[] = []
  const totals: FieldRow[] = []
  const fields = sections.flatMap((section) =>
    section.rows.flatMap((row) =>
      row.kind === "field" ? [{ row, section }] : []
    )
  )
  const loss = fields.some(({ row }) => row.code === 359 && row.value !== 0)
  for (const { row, section } of fields) {
    if (row.total) {
      const result = row.code === 358 || row.code === 359
      if (!result || row.code === (loss ? 359 : 358)) totals.push(row)
    } else if (row.value !== 0) {
      inputs.push({ row, section })
    }
  }
  return { inputs, totals, fieldCount: fields.length }
}

function sectionName(section: Form5Section, lang: "fi" | "en") {
  return section.number
    ? `${section.number} ${section.title[lang]}`
    : section.title[lang]
}

function AllFieldsSection({
  section,
  copied,
  onCopy,
}: {
  section: Form5Section
  copied: ReadonlySet<number>
  onCopy: (row: FieldRow) => void
}) {
  const f = useFormatters()
  const sum = section.rows.find(
    (r): r is FieldRow => r.kind === "field" && r.total && r.value !== 0
  )

  return (
    <section className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 border-b-[1.5px] border-foreground pt-4 pb-2.5">
        <h3 className="flex gap-2.5 font-heading text-[0.95rem] font-semibold">
          {section.number ? (
            <span className="tabular font-medium text-muted-foreground">
              {section.number}
            </span>
          ) : null}
          {section.title[f.lang]}
        </h3>
        {sum && section.rows.some((r) => r.kind === "field" && !r.total) ? (
          <span className="shrink-0 text-sm text-muted-foreground">
            <Money cents={sum.value} />
          </span>
        ) : null}
      </div>
      {section.rows.map((row) =>
        row.kind === "group" ? (
          <div
            key={row.label.fi}
            className="pt-4 pb-1.5 text-xs font-semibold text-muted-foreground"
          >
            {row.label[f.lang]}
          </div>
        ) : row.total ? (
          <div
            key={row.code}
            className="mt-1.5 flex min-h-12 items-center gap-3 rounded-lg bg-muted/60 px-3"
          >
            <CodeChip tone="outline">{row.code}</CodeChip>
            <span className="min-w-0 flex-1 text-sm leading-snug font-semibold">
              {row.label[f.lang]}
            </span>
            <span className="font-bold whitespace-nowrap">
              {row.value ? <Money cents={row.value} /> : "–"}
            </span>
          </div>
        ) : (
          <div
            key={row.code}
            className={cn(
              "flex items-center gap-3 border-b border-sheet-edge",
              row.value ? "min-h-14" : "min-h-11"
            )}
          >
            <CodeChip tone={row.value ? "solid" : "faint"}>{row.code}</CodeChip>
            <span
              className={cn(
                "flex min-w-0 flex-1 gap-1.5 leading-snug",
                row.value ? "font-medium" : "text-sm text-muted-foreground"
              )}
            >
              {row.portion ? (
                <CornerDownRightIcon
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
              {row.label[f.lang]}
            </span>
            {row.value ? (
              <CopyButton
                row={row}
                copied={copied.has(row.code)}
                onCopy={() => onCopy(row)}
              />
            ) : (
              <span className="w-16 pr-1 text-right text-muted-foreground">
                <span aria-hidden>–</span>
                <span className="sr-only">
                  {f.t("statement.form5NoAmount")}
                </span>
              </span>
            )}
          </div>
        )
      )}
    </section>
  )
}

/** The field's code, in the box the paper form prints it in. */
function CodeChip({
  tone,
  children,
}: {
  tone: "solid" | "outline" | "faint"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "tabular inline-flex w-11 shrink-0 items-center justify-center rounded-md border py-0.5 text-xs font-medium",
        tone === "solid" && "border-foreground bg-foreground text-background",
        tone === "outline" && "border-foreground/25",
        tone === "faint" &&
          "border-sheet-edge font-normal text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

/** The amount is the button: a click puts it on the clipboard as 1234,56. */
function CopyButton({
  row,
  copied,
  onCopy,
}: {
  row: FieldRow
  copied: boolean
  onCopy: () => void
}) {
  const f = useFormatters()
  const plain = formatAmountForCsv(row.value)

  return (
    <button
      type="button"
      onClick={onCopy}
      title={plain}
      aria-label={f.t(copied ? "statement.copied" : "statement.copyField", {
        code: String(row.code),
        v: plain,
      })}
      className={cn(
        "focus-ring ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-2.5 font-semibold whitespace-nowrap transition-colors sm:px-3.5",
        copied
          ? "bg-primary/10 text-primary"
          : "bg-muted text-foreground hover:bg-muted/70"
      )}
    >
      <Money cents={row.value} />
      <span className="print-hidden inline-flex">
        {copied ? (
          <CheckIcon aria-hidden className="size-4" />
        ) : (
          <CopyIcon aria-hidden className="size-4" />
        )}
      </span>
    </button>
  )
}

function StepHeading({
  step,
  filled,
  children,
}: {
  step: number
  filled?: boolean
  children: React.ReactNode
}) {
  return (
    <h3 className="flex items-center gap-2.5 font-heading font-semibold">
      <span
        aria-hidden
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-xs",
          filled
            ? "bg-foreground text-background"
            : "border-[1.5px] border-foreground"
        )}
      >
        {step}
      </span>
      {children}
    </h3>
  )
}

function CountBadge({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "tabular rounded-full px-2 py-px text-xs font-semibold",
        active ? "bg-foreground text-background" : "bg-foreground/10"
      )}
    >
      {children}
    </span>
  )
}
