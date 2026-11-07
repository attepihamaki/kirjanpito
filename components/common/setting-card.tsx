"use client"

import * as React from "react"

import { HelpHint } from "@/components/common/help-hint"
import { InfoPopover } from "@/components/common/info-popover"
import { Surface } from "@/components/common/surface"
import { useT } from "@/components/lang-provider"
import type { HelpTopic } from "@/lib/domain/field-help"
import { cn } from "@/lib/utils"

/**
 * A bordered grid of `SettingCard`s: three across from 1100 px, one below.
 * The rules between cards are borders on the cards themselves. A last row that
 * is not full is padded with empty cells that carry the same rules, so the
 * cards above them keep their bottom edge.
 */
export function SettingGrid({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const count = React.Children.toArray(children).length
  const fillers = (3 - (count % 3)) % 3
  return (
    <Surface
      className={cn(
        "grid grid-cols-1 overflow-hidden min-[1100px]:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
      {Array.from({ length: fillers }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={cn(
            "hidden min-[1100px]:block min-[1100px]:border-t",
            i < fillers - 1 && "min-[1100px]:border-r"
          )}
        />
      ))}
    </Surface>
  )
}

/**
 * One setting as a summary: its name, the value it holds now and a line that
 * says what the value means. A setting with an `editor` gets a "Muuta" button
 * that swaps the summary for the editor in place, and "Valmis" swaps it back.
 * A setting that acts rather than edits passes `action` instead.
 *
 * Cards in a row are as tall as the tallest, and the summary is two lines
 * whatever the setting, so rows stay level without any card being padded.
 */
export function SettingCard({
  label,
  editor,
  action,
  info,
  help,
  children,
}: {
  label: string
  /** The controls shown while editing. Without it the card has no edit button. */
  editor?: React.ReactNode
  /** A button of the card's own, in place of the edit toggle. */
  action?: React.ReactNode
  /** A longer explanation, shown in a popover beside the label. */
  info?: React.ReactNode
  /** A tax term explained with its source, like the help on the tax forms. */
  help?: HelpTopic | null
  /** The summary: usually a `SettingValue`. */
  children: React.ReactNode
}) {
  const t = useT()
  const [editing, setEditing] = React.useState(false)
  const verb = editing ? t("settings.done") : t("settings.change")

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 border-t p-4 first:border-t-0",
        "min-[1100px]:[&:not(:nth-child(3n))]:border-r min-[1100px]:[&:nth-child(-n+3)]:border-t-0",
        editing && "bg-muted/40"
      )}
    >
      <div className="flex min-h-7 items-center justify-between gap-2 text-sm text-muted-foreground">
        <h2 className="flex min-w-0 items-center gap-1 font-normal">
          {label}
          {info ? (
            <span className="print-hidden inline-flex shrink-0">
              <InfoPopover label={`${t("common.helpLabel")}: ${label}`}>
                {info}
              </InfoPopover>
            </span>
          ) : null}
          <HelpHint topic={help} />
        </h2>
        {editor ? (
          <button
            type="button"
            aria-expanded={editing}
            aria-label={`${verb}: ${label}`}
            className="rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => setEditing((on) => !on)}
          >
            {verb}
          </button>
        ) : (
          action
        )}
      </div>
      {editing && editor ? editor : children}
    </div>
  )
}

/**
 * The summary of a `SettingCard`: the value large, and under it one line of
 * context. `tone="ok"` is for a value that means all is well, and a `lead`
 * (a dot or a check) goes before it.
 */
export function SettingValue({
  value,
  note,
  lead,
  tone = "default",
  muted,
  lang,
}: {
  value: React.ReactNode
  note?: React.ReactNode
  lead?: React.ReactNode
  tone?: "default" | "ok"
  /** The value is a placeholder, like "Ei asetettu". */
  muted?: boolean
  lang?: string
}) {
  return (
    <>
      <p
        lang={lang}
        className={cn(
          "flex items-center gap-2 text-base font-medium",
          tone === "ok" && "text-primary",
          muted && "font-normal text-muted-foreground"
        )}
      >
        {lead}
        <span className="min-w-0 truncate">{value}</span>
      </p>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
    </>
  )
}

/** A sentence under an editor's controls, saying what the setting does. */
export function SettingHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
