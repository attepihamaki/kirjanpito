"use client"

import { ArrowLeftIcon } from "lucide-react"

import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ButtonLink } from "@/components/common/button-link"
import { SiteFooter, SiteHeader } from "@/components/common/site-chrome"
import { DisplayHeading, Lead } from "@/components/common/typography"
import { LangRoot, useFormatters } from "@/components/lang-provider"
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
    <LangRoot>
      <NotFoundBody />
    </LangRoot>
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
          <DisplayHeading size="md" className="mt-2">
            {f.t("notFound.title")}
          </DisplayHeading>
          <Lead className="mt-5">{f.t("notFound.lead")}</Lead>

          <div className="mt-7 flex flex-wrap gap-2">
            <ButtonLink size="lg" href={LANDING}>
              <ArrowLeftIcon data-icon="inline-start" />
              {f.t("notFound.home")}
            </ButtonLink>
            {hydrated && open ? (
              <ButtonLink
                size="lg"
                variant="outline"
                href={APP_ROUTES.overview}
              >
                {f.t("landing.continue")}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
