"use client"

import Link from "next/link"
import { InboxIcon } from "lucide-react"

import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { LEDGER_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The top bar's shortcut to the inbox (§8.31), with the number of receipts
 * waiting to be booked. Without a count it is only the icon.
 */
export function InboxLink() {
  const t = useT()
  const waiting = useBookStore((s) => s.inbox.length)
  const label = waiting
    ? t("inbox.linkWaiting", { n: waiting })
    : t("inbox.tab")

  return (
    <Button
      variant="ghost"
      size="icon"
      nativeButton={false}
      render={<Link href={LEDGER_ROUTES.inbox} />}
      aria-label={label}
      title={label}
    >
      <span className="relative flex">
        <InboxIcon />
        {waiting ? (
          <span
            aria-hidden
            className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium text-primary-foreground tabular-nums"
          >
            {waiting > 99 ? "99+" : waiting}
          </span>
        ) : null}
      </span>
    </Button>
  )
}
