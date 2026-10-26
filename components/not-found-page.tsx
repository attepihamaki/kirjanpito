"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { SiteFooter, SiteHeader } from "@/components/common/site-chrome"
import {
  AppLangProvider,
  LangHtmlAttr,
  useFormatters,
} from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { APP_ROUTES, LANDING } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The 404 page.
 *
 * Static export emits a single `out/404.html`, which serves every unmatched
 * URL. It follows the stored preference like the rest of the site: Finnish in
 * the prerendered HTML (the store's default, so the first client render still
 * matches byte for byte) and the stored preference once the store has
 * rehydrated.
 */
export function NotFoundPage() {
  return (
    <AppLangProvider>
      <LangHtmlAttr />
      <NotFoundBody />
    </AppLangProvider>
  )
}

function NotFoundBody() {
  const f = useFormatters()
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader home={LANDING}>
        <ThemeToggle />
        <LangToggle />
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10">
        <div className="flex w-full flex-col">
          <p className="tabular font-heading text-sm font-semibold tracking-wide text-muted-foreground">
            {f.t("notFound.badge")} 404
          </p>
          <h1 className="mt-2 font-heading text-[clamp(2rem,4.5vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
            {f.t("notFound.title")}
          </h1>
          <p className="mt-5 max-w-prose text-lg text-pretty text-muted-foreground">
            {f.t("notFound.lead")}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button size="lg" render={<Link href={LANDING} />}>
              <ArrowLeftIcon data-icon="inline-start" />
              {f.t("notFound.home")}
            </Button>
            {hydrated && open ? (
              <Button
                size="lg"
                variant="outline"
                render={<Link href={APP_ROUTES.ledger} />}
              >
                {f.t("landing.continue")}
              </Button>
            ) : null}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
