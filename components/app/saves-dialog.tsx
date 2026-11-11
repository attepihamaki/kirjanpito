"use client"

import * as React from "react"
import { Trash2Icon } from "lucide-react"

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
import { Empty, EmptyDescription } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommandCtx } from "@/hooks/use-commands"
import { loadSnapshotIndex } from "@/lib/browser/snapshot-store"
import {
  forgetEarlierSave,
  restoreEarlierSave,
} from "@/lib/commands/snapshot-commands"
import { todayIso } from "@/lib/domain/dates"
import {
  sortSnapshots,
  SNAPSHOT_KEEP_DAYS,
  SNAPSHOT_KEEP_RECENT,
  type SnapshotMeta,
} from "@/lib/domain/save-snapshots"
import { clock } from "@/lib/i18n/clock"
import { useBookStore } from "@/stores/book-store"
import { useSnapshotStore } from "@/stores/snapshot-store"

const REASON_LABEL = {
  open: "snapshots.reasonOpen",
  save: "snapshots.reasonSave",
  autosave: "snapshots.reasonAutosave",
  restore: "snapshots.reasonRestore",
} as const

/**
 * "Aiemmat tallennukset" (§8.36): the books this browser kept when a file was
 * opened or written, newest first, each one restorable or removable.
 */
export function SavesDialog() {
  const open = useBookStore((s) => s.dialog.kind === "saves")
  if (!open) return null
  return <SavesList />
}

function SavesList() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const closeDialog = useBookStore((s) => s.closeDialog)
  const loaded = useSnapshotStore((s) => s.loaded)
  const metas = useSnapshotStore((s) => s.metas)
  const [busy, setBusy] = React.useState(false)
  const sorted = React.useMemo(() => sortSnapshots(metas), [metas])

  React.useEffect(() => {
    void loadSnapshotIndex()
  }, [])

  const when = (meta: SnapshotMeta) => {
    const at = new Date(meta.at)
    return `${f.date(todayIso(at))} ${clock(f, at)}`
  }

  const restore = async (meta: SnapshotMeta) => {
    setBusy(true)
    try {
      if (await restoreEarlierSave(ctx, meta, when(meta))) closeDialog()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && closeDialog()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{f.t("snapshots.title")}</DialogTitle>
          <DialogDescription>
            {f.t("snapshots.hint", {
              n: SNAPSHOT_KEEP_RECENT,
              d: SNAPSHOT_KEEP_DAYS,
            })}
          </DialogDescription>
        </DialogHeader>

        {!loaded ? null : sorted.length === 0 ? (
          <Empty>
            <EmptyDescription>{f.t("snapshots.empty")}</EmptyDescription>
          </Empty>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{f.t("snapshots.colWhen")}</TableHead>
                  <TableHead>{f.t("snapshots.colWhat")}</TableHead>
                  <TableHead>{f.t("snapshots.colBook")}</TableHead>
                  <TableHead className="text-right">
                    {f.t("snapshots.colEntries")}
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((meta) => (
                  <TableRow key={meta.id}>
                    <TableCell className="tabular whitespace-nowrap">
                      {when(meta)}
                    </TableCell>
                    <TableCell>{f.t(REASON_LABEL[meta.reason])}</TableCell>
                    <TableCell className="max-w-56">
                      <span
                        className="block truncate"
                        title={meta.fileName ?? ""}
                      >
                        {meta.businessName ||
                          meta.fileName ||
                          f.t("file.untitled")}
                      </span>
                      {meta.businessName && meta.fileName ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {meta.fileName}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {meta.entries}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void restore(meta)}
                      >
                        {f.t("snapshots.restore")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        aria-label={f.t("snapshots.delete", { d: when(meta) })}
                        onClick={() => void forgetEarlierSave(ctx, meta)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            {f.t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
