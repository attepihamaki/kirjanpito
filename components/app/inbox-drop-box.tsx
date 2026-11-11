"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { InboxIcon } from "lucide-react"

import { BusyIcon } from "@/components/common/busy-button"
import { DropTile } from "@/components/common/drop-tile"
import { useT } from "@/components/lang-provider"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCommandCtx } from "@/hooks/use-commands"
import { addToInbox } from "@/lib/commands/inbox-commands"
import { LEDGER_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

/** The types the picker offers; `addToInbox` checks every file again (§7.4). */
const RECEIPT_ACCEPT = "image/*,application/pdf,.pdf,.heic,.heif"

const hasFiles = (e: React.DragEvent) =>
  e.dataTransfer?.types?.includes("Files") ?? false

/**
 * The receipt inbox's drop box at the foot of the sidebar (§8.31), so a
 * receipt can be put aside from any view without leaving it.
 *
 * The whole footer is the drop target. A drop here is taken before the
 * window's own handler, which would otherwise start an entry around it
 * (§8.2): `preventDefault` on the drop is how `useFileDrop` knows it was
 * handled. Collapsed to icons, the dashed tile is hidden and the inbox row
 * alone takes the drop.
 */
export function InboxDropBox() {
  const t = useT()
  const ctx = useCommandCtx()
  const { isMobile, setOpenMobile } = useSidebar()
  const waiting = useBookStore((s) => s.inbox.length)
  const readOnly = useBookStore((s) => s.archiveYear !== null)
  const current = usePathname().replace(/\/$/, "")
  const active = current === LEDGER_ROUTES.inbox
  const pickRef = React.useRef<HTMLInputElement>(null)
  const depth = React.useRef(0)
  const [over, setOver] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const add = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    try {
      await addToInbox(ctx, files)
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    depth.current = 0
    setOver(false)
  }

  const dropProps = readOnly
    ? {}
    : {
        onDragEnter: (e: React.DragEvent) => {
          if (!hasFiles(e)) return
          depth.current += 1
          setOver(true)
        },
        onDragOver: (e: React.DragEvent) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = "copy"
        },
        onDragLeave: () => {
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setOver(false)
        },
        onDrop: (e: React.DragEvent) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          leave()
          // Anything not a receipt is refused by `addToInbox` with a toast.
          void add(Array.from(e.dataTransfer.files ?? []))
        },
      }

  const label = waiting ? t("inbox.tabCount", { n: waiting }) : t("inbox.tab")

  return (
    <SidebarFooter
      {...dropProps}
      data-drop-over={over || undefined}
      aria-label={t("inbox.boxLabel")}
      role="group"
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="md"
            isActive={active}
            tooltip={readOnly ? label : `${label} · ${t("inbox.boxHint")}`}
            className={cn(
              over && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            render={
              <Link
                href={LEDGER_ROUTES.inbox}
                aria-current={active ? "page" : undefined}
                onClick={() => isMobile && setOpenMobile(false)}
              />
            }
          >
            <span className="relative flex">
              <BusyIcon busy={busy} icon={InboxIcon} />
              {/* Collapsed, the count has nowhere to go but a dot. */}
              {waiting ? (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 hidden size-2 rounded-full bg-primary group-data-[collapsible=icon]:block"
                />
              ) : null}
            </span>
            <span>{t("inbox.tab")}</span>
          </SidebarMenuButton>
          {/* The `md` row is 36 px, which the badge's own offsets do not cover. */}
          {waiting ? (
            <SidebarMenuBadge className="top-2">{waiting}</SidebarMenuBadge>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>

      {readOnly ? null : (
        <>
          <DropTile
            disabled={busy}
            onClick={() => pickRef.current?.click()}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-3 text-center text-xs text-muted-foreground",
              "group-data-[collapsible=icon]:hidden",
              over && "border-primary bg-primary/5 text-foreground"
            )}
          >
            <span className="font-medium text-foreground">
              {t("inbox.boxTitle")}
            </span>
            <span>{t("inbox.boxHint")}</span>
          </DropTile>
          <input
            ref={pickRef}
            type="file"
            multiple
            accept={RECEIPT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ""
              void add(files)
            }}
          />
        </>
      )}
    </SidebarFooter>
  )
}
