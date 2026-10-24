"use client"

import Link from "next/link"

import { BrandMark } from "@/components/common/brand-mark"
import { useT } from "@/components/lang-provider"

/**
 * The header and footer of the two full-width documents outside the app
 * shell: the landing pages (§8.3) and the 404. Both had their own identical
 * copy of each.
 */

export function SiteHeader({
  home,
  children,
}: {
  /** Where the brand links to — the landing page in the current language. */
  home: string
  /** The controls on the right: language, theme, and any call to action. */
  children: React.ReactNode
}) {
  const t = useT()

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
      <Link href={home} className="flex items-center gap-2.5">
        <BrandMark />
        <span className="font-heading font-semibold">{t("appName")}</span>
      </Link>
      <div className="flex items-center gap-1">{children}</div>
    </header>
  )
}

export function SiteFooter() {
  const t = useT()

  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
        <span>{t("appName")}</span>
        <span>{t("lp_foot")}</span>
      </div>
    </footer>
  )
}
