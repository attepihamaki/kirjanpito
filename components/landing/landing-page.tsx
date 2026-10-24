"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PlusIcon, UploadIcon } from "lucide-react"

import { LandingReceipts } from "@/components/landing/landing-receipts"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { BrandMark } from "@/components/common/brand-mark"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { LangProvider, useFormatters } from "@/components/lang-provider"
import type { Lang } from "@/lib/domain/types"

// Spelled out rather than imported from lib/domain/csv: that module pulls in
// papaparse, which has no business in the landing page bundle.
const CSV_COLUMNS = "pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;tosite"
import { startNewBook } from "@/lib/commands/book-commands"
import { APP_ROUTES, LANDING_ROUTES } from "@/lib/site"
import { BOOK_STORAGE_KEY, useBookStore } from "@/stores/book-store"
import { cn } from "@/lib/utils"

/**
 * The landing page (§8.3). Rendered twice — statically at `/` in Finnish and
 * at `/en` in English — from one component, with the language fixed by the
 * route rather than read from storage.
 */
export function LandingPage({ lang }: { lang: Lang }) {
  return (
    <LangProvider lang={lang}>
      <LandingBody lang={lang} />
    </LangProvider>
  )
}

function LandingBody({ lang }: { lang: Lang }) {
  const f = useFormatters()
  const router = useRouter()
  const hydrated = useBookStore((s) => s.hydrated)
  const setLang = useBookStore((s) => s.setLang)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // First visit only: adopt the language of the URL the visitor arrived at.
  // A returning user's stored preference is never silently overwritten, and
  // the page never redirects based on it — that would be cloaking-adjacent
  // and would break the back button.
  const seeded = React.useRef(false)
  React.useEffect(() => {
    if (!hydrated || seeded.current) return
    seeded.current = true
    try {
      if (!localStorage.getItem(BOOK_STORAGE_KEY)) setLang(lang)
    } catch {
      // No storage: the app falls back to its default language.
    }
  }, [hydrated, lang, setLang])

  const ctx = React.useMemo(
    () => ({ t: f.t, navigate: (href: string) => router.push(href) }),
    [f.t, router]
  )

  return (
    <div className="flex min-h-svh flex-col">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.zip,text/csv,application/zip"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          // Lazy: keeps jszip and papaparse out of the landing bundle.
          if (file) {
            void import("@/lib/commands/io-commands").then((m) =>
              m.openFile(ctx, file)
            )
          }
        }}
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link href={LANDING_ROUTES[lang]} className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-heading font-semibold">{f.t("appName")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LandingLangLinks lang={lang} />
          <ThemeToggle />
          <OpenOrContinue onPick={() => inputRef.current?.click()} compact />
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div className="flex flex-col justify-center">
            <h1 className="font-heading text-[clamp(2.25rem,5.4vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
              {f.t("lp_title")}
            </h1>
            <p className="mt-5 max-w-prose text-lg text-pretty text-muted-foreground">
              {f.t("lp_lead")}
            </p>
            <HeroCta onPick={() => inputRef.current?.click()} />
          </div>
          <LandingReceipts />
        </section>

        {/* Four steps */}
        <Section title={f.t("lp_howT")}>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as const).map((i) => (
              <li key={i} className="flex flex-col gap-2">
                <span className="tabular flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i}
                </span>
                <h3 className="font-medium">{f.t(`lp_s${i}t` as const)}</h3>
                <p className="text-sm text-muted-foreground">
                  {f.t(`lp_s${i}` as const)}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        {/* What it works out */}
        <Section title={f.t("lp_featT")}>
          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard title={f.t("lp_f1t")} body={f.t("lp_f1")}>
              <div className="flex flex-wrap gap-1.5">
                {[25.5, 13.5, 10, 0].map((rate) => (
                  <span
                    key={rate}
                    className="tabular rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {f.rate(rate)}
                  </span>
                ))}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  EU
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {f.t("s_rc")}
                </span>
              </div>
            </FeatureCard>

            <FeatureCard title={f.t("lp_f2t")} body={f.t("lp_f2")}>
              <dl className="flex flex-col gap-1 text-xs">
                <MiniRow label="300" value={f.money(1250000)} />
                <MiniRow label="333" value={`−${f.money(22821)}`} />
                <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                  <dt>358</dt>
                  <dd className="tabular">{f.money(1227179)}</dd>
                </div>
              </dl>
            </FeatureCard>

            <FeatureCard title={f.t("lp_f3t")} body={f.t("lp_f3")}>
              <svg
                viewBox="0 0 304 58"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="h-14 w-full"
              >
                {[40, 52, 30, 64, 45, 58, 20, 26, 48, 70, 55, 62].map(
                  (h, i) => (
                    <g key={i}>
                      <rect
                        x={i * 25 + 4}
                        y={56 - h * 0.75}
                        width={9}
                        height={h * 0.75}
                        rx={1.5}
                        fill="var(--income)"
                      />
                      <rect
                        x={i * 25 + 14}
                        y={56 - h * 0.3}
                        width={9}
                        height={h * 0.3}
                        rx={1.5}
                        fill="var(--expense)"
                      />
                    </g>
                  )
                )}
              </svg>
            </FeatureCard>
          </div>
        </Section>

        {/* Privacy */}
        <Section title={f.t("lp_privT")}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>{f.t("lp_priv1")}</p>
              <p>{f.t("lp_priv2")}</p>
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 text-[0.7rem] leading-relaxed">
              <code>
                <b>{CSV_COLUMNS}</b>
                {"\n"}
                2026-10-10;Osto – K-Rauta – tarvikkeet;kulu;333;Ostot ja
                varastojen muutokset;100,00;25,5;brutto;tositteet/2026/10/…jpg
                {"\n"}
                2026-10-28;Lasku 1005 – Mäkinen Rakennus Oy;tulo;300;Myynti –
                Suomi;1882,50;25,5;brutto;tositteet/2026/10/…pdf
                {"\n"}
                2026-10-30;Pankin palvelumaksut;kulu;349;Muut
                rahoituskulut;8,50;0;brutto;
              </code>
            </pre>
          </div>
        </Section>

        {/* FAQ */}
        <Section title={f.t("lp_faqT")}>
          <Accordion className="max-w-3xl">
            {([1, 2, 3, 4] as const).map((i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger>{f.t(`lp_q${i}` as const)}</AccordionTrigger>
                <AccordionContent>{f.t(`lp_a${i}` as const)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16">
          <div className="rounded-xl border bg-accent/40 px-6 py-10 text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {f.t("lp_endT")}
            </h2>
            <HeroCta
              onPick={() => inputRef.current?.click()}
              className="justify-center"
            />
          </div>
        </section>
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

/**
 * FI | EN as links, not a toggle: each landing page is its own indexed
 * document, so switching language is a navigation. It also records the
 * preference, so entering the app keeps the language the visitor chose.
 */
function LandingLangLinks({ lang }: { lang: Lang }) {
  const f = useFormatters()
  const setLang = useBookStore((s) => s.setLang)

  return (
    <div
      className="flex items-center rounded-full border p-0.5"
      role="group"
      aria-label={f.t("language")}
    >
      {(["fi", "en"] as const).map((code) => (
        <Link
          key={code}
          href={LANDING_ROUTES[code]}
          hrefLang={code}
          lang={code}
          aria-current={code === lang ? "true" : undefined}
          onClick={() => setLang(code)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            code === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {code.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}

/** Hydration-gated: the open/closed branch depends on stored state (§8.3). */
function HeroCta({
  onPick,
  className,
}: {
  onPick: () => void
  className?: string
}) {
  const f = useFormatters()
  const router = useRouter()
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)
  const entries = useBookStore((s) => s.entries)
  const fileName = useBookStore((s) => s.fileName)
  const dirty = useBookStore((s) => s.dirty)

  const ctx = React.useMemo(
    () => ({ t: f.t, navigate: (href: string) => router.push(href) }),
    [f.t, router]
  )

  const openState = hydrated && open

  return (
    <div className={cn("mt-7 flex flex-col gap-3", className)}>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {openState ? (
          <Button size="lg" render={<Link href={APP_ROUTES.ledger} />}>
            {f.t("lp_continue")}
          </Button>
        ) : (
          <Button size="lg" onClick={() => void startNewBook(ctx)}>
            <PlusIcon data-icon="inline-start" />
            {f.t("lp_start")}
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={onPick}>
          <UploadIcon data-icon="inline-start" />
          {f.t("lp_open")}
        </Button>
      </div>

      {openState ? (
        <p className="text-sm text-muted-foreground">
          {fileName ? `${fileName}.csv` : f.t("newBook")},{" "}
          {f.t("nEntries", { n: entries.length })}
          {dirty && entries.length ? `. ${f.t("dirty")}.` : ""}
        </p>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left transition-colors hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <UploadIcon className="size-5 shrink-0 text-muted-foreground" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{f.t("lp_drop")}</span>
            <span className="text-xs text-muted-foreground">
              {f.t("lp_dropSub")}
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

function OpenOrContinue({
  onPick,
  compact,
}: {
  onPick: () => void
  compact?: boolean
}) {
  const f = useFormatters()
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)

  if (hydrated && open) {
    return (
      <Button size="sm" render={<Link href={APP_ROUTES.ledger} />}>
        {f.t("lp_toApp")}
      </Button>
    )
  }
  return (
    <Button size="sm" variant="outline" onClick={onPick}>
      <UploadIcon data-icon="inline-start" />
      {compact ? f.t("importShort") : f.t("importCsv")}
    </Button>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h2 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function FeatureCard({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="mt-auto rounded-md bg-muted/40 p-3">{children}</div>
    </article>
  )
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  )
}
