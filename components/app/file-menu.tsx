"use client"

import * as React from "react"
import {
  BookBookmarkIcon,
  DownloadIcon,
  ListChecksIcon,
  SaveIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import {
  AutosaveNote,
  FileStatus,
  StorageNote,
  StatusDot,
  useFileStatusText,
} from "@/components/app/file-status"
import { YearSelect } from "@/components/app/year-select"
import { BusyButton, BusyIcon } from "@/components/common/busy-button"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Keys } from "@/components/common/keys"
import { useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"
import {
  useCanSaveToFile,
  useSaveBook,
  useShortcut,
} from "@/hooks/use-save-book"
import { closeBook } from "@/lib/commands/book-commands"
import { useBookStore } from "@/stores/book-store"

/**
 * The open file and everything that acts on it (§8.2), at the right-hand end
 * of the top bar: a button opening a popover with the
 * financial year, the save status and the file actions.
 *
 * The year lives here rather than beside the navigation because it is read out
 * of the file: the popover is the one place that answers "which bookkeeping,
 * which year, and is it saved".
 *
 * The trigger is an icon like the rest of the bar, with the file's name in its
 * accessible name and tooltip, and a dot while there are unsaved changes.
 */
export function FileMenu({
  onOpenFile,
  onExport,
}: {
  onOpenFile: () => void
  onExport: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const [open, setOpen] = React.useState(false)
  const fileName = useBookStore((s) => s.fileName)
  const importing = useBookStore((s) => s.importing)
  const saving = useBookStore((s) => s.saving)
  const dirty = useBookStore((s) => s.dirty)
  const openDialog = useBookStore((s) => s.openDialog)
  const busy = useDelayedFlag(importing)
  const savingNow = useDelayedFlag(saving)
  const status = useFileStatusText()
  const save = useSaveBook()
  /*
   * §7.5: Firefox, Safari and phones cannot write to a file at all, so the
   * save row is absent there rather than present and dead. Downloading is
   * how the work is kept on those browsers.
   */
  const canSave = useCanSaveToFile()
  const shortcut = useShortcut()
  const openKeys = shortcut("o")
  const saveKeys = shortcut("s")
  const downloadKeys = shortcut("s", true)
  const name = fileName ?? f.t("file.untitled")

  /*
   * Every action leaves the popover with nothing left to say: it hands over
   * to a dialog, a picker, or empties the bookkeeping.
   */
  const act = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* An icon button like the rest of the bar, so the file reads as app
          chrome rather than as the one loud control in it. Nothing here is
          visible text, so the name and the status are both in the accessible
          name; the comma is a list separator, the same in both languages. */}
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${name}, ${status}`}
            title={name}
          />
        }
      >
        {/* The dot rides the icon's top-right corner the way an unread badge
            does, and like one it appears only when there is something to say:
            it is the only always-visible sign of unsaved changes. A saved book
            shows no dot here, and the popup's status line says it is saved. */}
        <span className="relative flex">
          <BusyIcon busy={busy || savingNow} icon={BookBookmarkIcon} />
          {dirty ? <StatusDot className="absolute -top-1 -right-1" /> : null}
        </span>
      </PopoverTrigger>

      {/* The popup lays out its own sections, hence no padding or gap here. */}
      <PopoverContent align="end" className="w-72 gap-0 p-0">
        <div className="flex flex-col gap-1.5 px-3 py-2.5">
          <span className="truncate text-sm font-medium" title={name}>
            {name}
          </span>
          <FileStatus />
          <AutosaveNote />
          <StorageNote />
        </div>

        <Separator />

        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">
            {f.t("app.fiscalYear")}
          </span>
          <YearSelect className="ml-auto w-28" />
        </div>

        <Separator />

        {/* Full-width ghost rows with the icons on one line, so the actions
            read as a menu rather than as a form's buttons. None of them is
            highlighted: a filled row among four would read as the only real
            action, and the status dot above already says there is unsaved
            work. */}
        <div className="flex flex-col gap-1 p-1.5">
          <BusyButton
            icon={UploadIcon}
            busy={busy}
            busyLabel={f.t("io.opening")}
            variant="ghost"
            className="justify-start"
            aria-keyshortcuts={openKeys.aria}
            onClick={act(onOpenFile)}
          >
            <span className="flex-1 text-left">{f.t("file.open")}</span>
            <Keys>{openKeys.label}</Keys>
          </BusyButton>

          {canSave ? (
            <BusyButton
              icon={SaveIcon}
              busy={savingNow}
              busyLabel={f.t("io.saving")}
              variant="ghost"
              className="justify-start"
              disabled={busy}
              aria-keyshortcuts={saveKeys.aria}
              onClick={act(save)}
            >
              <span className="flex-1 text-left">{f.t("file.save")}</span>
              <Keys>{saveKeys.label}</Keys>
            </BusyButton>
          ) : null}

          <Button
            variant="ghost"
            className="justify-start"
            disabled={busy || savingNow}
            aria-keyshortcuts={downloadKeys.aria}
            onClick={act(onExport)}
          >
            <DownloadIcon data-icon="inline-start" />
            <span className="flex-1 text-left">{f.t("file.download")}</span>
            <Keys>{downloadKeys.label}</Keys>
          </Button>

          <Button
            variant="ghost"
            className="justify-start"
            onClick={act(() => openDialog({ kind: "check-book" }))}
          >
            <ListChecksIcon data-icon="inline-start" />
            {f.t("file.check")}
          </Button>

          <Button
            variant="ghost"
            className="justify-start"
            onClick={act(() => void closeBook(ctx))}
          >
            <XIcon data-icon="inline-start" />
            {f.t("file.close")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
