"use client"

import * as React from "react"
import { BellIcon } from "lucide-react"

import { MessagesDialog } from "@/components/app/messages-dialog"
import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useBillsDue } from "@/hooks/use-bills-due"
import { cn } from "@/lib/utils"
import {
  markToastsSeen,
  useToastHistory,
  useUnreadToastCount,
} from "@/stores/toast-history"

/**
 * The top bar's bell (§8.2): the messages of this session, with a dot while
 * any arrived since the dialog last showed them. Messages that come in while
 * it is open are read as they appear. A bill past its due date or due today
 * (§8.30) keeps the dot on, in the expense tone, until it is paid.
 */
export function MessagesButton() {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const unread = useUnreadToastCount()
  const records = useToastHistory()
  const { overdue, dueToday } = useBillsDue()
  const bills = overdue.count + dueToday.count

  React.useEffect(() => {
    if (open) markToastsSeen()
  }, [open, records])

  const label = unread
    ? t("file.messagesUnread", { n: unread })
    : bills
      ? t("file.messagesBills", { n: bills })
      : t("file.messages")

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <span className="relative flex">
          <BellIcon />
          {unread || bills ? (
            <span
              aria-hidden
              className={cn(
                "absolute -top-1 -right-1 size-2 rounded-full",
                bills ? "bg-expense" : "bg-primary"
              )}
            />
          ) : null}
        </span>
      </Button>
      <MessagesDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
