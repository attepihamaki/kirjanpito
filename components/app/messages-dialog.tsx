"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ButtonLink } from "@/components/common/button-link"
import { Button } from "@/components/ui/button"
import { useBillsDue } from "@/hooks/use-bills-due"
import { INVOICE_ROUTES } from "@/lib/site"
import { useFormatters } from "@/components/lang-provider"
import { clearToastHistory, useToastHistory } from "@/stores/toast-history"

/**
 * The toasts raised this session, newest first, so a message that timed out
 * unread can be read again. Opened from the top bar's bell. Above them, the
 * bills past their due date or due today (§8.30), with the way to the list.
 */
export function MessagesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const f = useFormatters()
  const records = useToastHistory()
  const { overdue, dueToday } = useBillsDue()
  const locale = f.lang === "fi" ? "fi-FI" : "en-GB"
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{f.t("file.messagesTitle")}</DialogTitle>
          <DialogDescription>
            {f.t("file.messagesDescription")}
          </DialogDescription>
        </DialogHeader>

        {overdue.count || dueToday.count ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm">
            <div className="flex min-w-0 flex-1 flex-col">
              {overdue.count ? (
                <span className="text-expense">
                  {f.t("file.billsOverdue", {
                    n: overdue.count,
                    s: f.money(overdue.total),
                  })}
                </span>
              ) : null}
              {dueToday.count ? (
                <span>
                  {f.t("file.billsToday", {
                    n: dueToday.count,
                    s: f.money(dueToday.total),
                  })}
                </span>
              ) : null}
            </div>
            <ButtonLink
              variant="outline"
              size="sm"
              href={INVOICE_ROUTES.payables}
              onClick={() => onOpenChange(false)}
            >
              {f.t("file.billsOpen")}
            </ButtonLink>
          </div>
        ) : null}

        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {f.t("file.messagesEmpty")}
          </p>
        ) : (
          <>
            <ul className="flex max-h-80 flex-col divide-y overflow-y-auto">
              {records.map((r) => (
                <li key={r.id} className="flex flex-col gap-0.5 py-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {time.format(r.at)}
                  </span>
                  <span className="text-sm">{r.title}</span>
                  {r.description ? (
                    <span className="text-sm text-muted-foreground">
                      {r.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearToastHistory}>
                {f.t("file.messagesClear")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
