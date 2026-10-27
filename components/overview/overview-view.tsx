"use client"

import * as React from "react"
import { CheckIcon, PencilIcon, PlusIcon, RotateCcwIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import { OverviewBoard } from "@/components/overview/overview-board"
import { OverviewDataProvider } from "@/components/overview/overview-data"
import { DEFAULT_LAYOUT } from "@/lib/domain/overview-layout"
import { useBookStore } from "@/stores/book-store"

/**
 * The app's front page (§8.12): how the year is going, what VAT is due and
 * when, and what is left to do. Every widget is a summary that links into a
 * view; nothing here edits a figure.
 */
export function OverviewView() {
  const f = useFormatters()
  const year = useBookStore((s) => s.year)
  const hasEntries = useBookStore((s) => s.entries.length > 0)
  const openDialog = useBookStore((s) => s.openDialog)
  const setLayout = useBookStore((s) => s.setOverviewLayout)
  const [editing, setEditing] = React.useState(false)

  const newEntry = () => openDialog({ kind: "entry", mode: "new" })

  const actions = editing ? (
    <>
      <Button
        variant="ghost"
        onClick={() => setLayout(DEFAULT_LAYOUT.map((w) => ({ ...w })))}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {f.t("overview.reset")}
      </Button>
      <Button onClick={() => setEditing(false)}>
        <CheckIcon data-icon="inline-start" />
        {f.t("overview.done")}
      </Button>
    </>
  ) : (
    <>
      {hasEntries ? (
        <Button variant="ghost" onClick={() => setEditing(true)}>
          <PencilIcon data-icon="inline-start" />
          {f.t("overview.edit")}
        </Button>
      ) : null}
      <Button onClick={newEntry}>
        <PlusIcon data-icon="inline-start" />
        {f.t("overview.newEntry")}
      </Button>
    </>
  )

  return (
    <>
      <PageHeader
        title={f.t("nav.overview")}
        subtitle={f.t("overview.subtitle", { y: year })}
        actions={<div className="flex flex-wrap gap-2">{actions}</div>}
      />
      {hasEntries ? (
        <OverviewDataProvider>
          <OverviewBoard editing={editing} />
        </OverviewDataProvider>
      ) : (
        <EmptyOverview onNewEntry={newEntry} />
      )}
    </>
  )
}

function EmptyOverview({ onNewEntry }: { onNewEntry: () => void }) {
  const f = useFormatters()
  const steps = [
    ["overview.step1Title", "overview.step1Body"],
    ["overview.step2Title", "overview.step2Body"],
    ["overview.step3Title", "overview.step3Body"],
  ] as const

  return (
    <Surface className="grid gap-8 p-6 min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] min-[900px]:items-center min-[900px]:p-8">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {f.t("overview.emptyTitle")}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {f.t("overview.emptyBody")}
        </p>
        <Button className="mt-5" onClick={onNewEntry}>
          <PlusIcon data-icon="inline-start" />
          {f.t("overview.newEntry")}
        </Button>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map(([title, body], i) => (
          <li
            key={title}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3"
          >
            <span className="tabular grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{f.t(title)}</p>
              <p className="text-sm text-muted-foreground">{f.t(body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Surface>
  )
}
