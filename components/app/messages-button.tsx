"use client"

import * as React from "react"
import { BellIcon } from "lucide-react"

import { MessagesDialog } from "@/components/app/messages-dialog"
import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  markToastsSeen,
  useToastHistory,
  useUnreadToastCount,
} from "@/stores/toast-history"

/**
 * The top bar's bell (§8.2): the messages of this session, with a dot while
 * any arrived since the dialog last showed them. Messages that come in while
 * it is open are read as they appear.
 */
export function MessagesButton() {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const unread = useUnreadToastCount()
  const records = useToastHistory()

  React.useEffect(() => {
    if (open) markToastsSeen()
  }, [open, records])

  const label = unread
    ? t("file.messagesUnread", { n: unread })
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
          {unread ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 size-2 rounded-full bg-primary"
            />
          ) : null}
        </span>
      </Button>
      <MessagesDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
