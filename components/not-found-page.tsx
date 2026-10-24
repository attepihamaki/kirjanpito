"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { BrandMark } from "@/components/common/brand-mark"
import {
  AppLangProvider,
  LangHtmlAttr,
  useFormatters,
} from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { APP_ROUTES, landingFor } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/**
 * The 404 page.
 *
 * Static export emits a single `out/404.html`, so unlike the two landing
 * pages this document cannot have its language baked into the route. It
 * behaves like the app instead: Finnish in the prerendered HTML (the store's
 * default, so the first client render still matches byte for byte) and the
 * stored preference once the store has rehydrated.
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
  const lang = useBookStore((s) => s.lang)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link href={landingFor(lang)} className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-heading font-semibold">{f.t("appName")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10">
        <div className="flex w-full flex-col">
          <p className="tabular font-heading text-sm font-semibold tracking-wide text-muted-foreground">
            {f.t("nf_badge")} 404
          </p>
          <h1 className="mt-2 font-heading text-[clamp(2rem,4.5vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
            {f.t("nf_title")}
          </h1>
          <p className="mt-5 max-w-prose text-lg text-pretty text-muted-foreground">
            {f.t("nf_lead")}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button size="lg" render={<Link href={landingFor(lang)} />}>
              <ArrowLeftIcon data-icon="inline-start" />
              {f.t("nf_home")}
            </Button>
            {hydrated && open ? (
              <Button
                size="lg"
                variant="outline"
                render={<Link href={APP_ROUTES.ledger} />}
              >
                {f.t("lp_continue")}
              </Button>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>{f.t("appName")}</span>
          <span>{f.t("lp_foot")}</span>
        </div>
      </footer>
    </div>
  )
}
