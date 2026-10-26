"use client"

import * as React from "react"
import { PlusIcon, UploadIcon } from "lucide-react"

import { ImportOverlay } from "@/components/app/import-overlay"
import { LandingReceipts } from "@/components/landing/landing-receipts"
import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { BusyButton } from "@/components/common/busy-button"
import { ButtonLink } from "@/components/common/button-link"
import { DropTile } from "@/components/common/drop-tile"
import { SiteFooter, SiteHeader } from "@/components/common/site-chrome"
import { Pill } from "@/components/common/pill"
import { Surface } from "@/components/common/surface"
import {
  DisplayHeading,
  Lead,
  SectionHeading,
} from "@/components/common/typography"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { LangRoot, useFormatters } from "@/components/lang-provider"
import { useCommandCtx } from "@/hooks/use-commands"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"
/*
 * From csv-header, not csv: that module pulls in papaparse, which has no
 * business in the landing page bundle. csv-header has no dependencies.
 */
import { CSV_HEADER_LINE } from "@/lib/domain/csv-header"
import { MINUS } from "@/lib/domain/money"
import { startNewBook } from "@/lib/commands/book-commands"
import { APP_ROUTES, LANDING, LANDING_FAQ_ID } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"
import { cn } from "@/lib/utils"

/**
 * The landing page (§8.3). The one indexed document, and the only page that
 * renders real content before the store has rehydrated.
 *
 * Language follows the stored preference, as it does in the app: Finnish is
 * the store's default, so the prerendered HTML and the first client render
 * match byte for byte, and a visitor who has chosen English sees the page
 * switch once rehydration lands. Only Finnish is indexed, so a crawler always
 * receives the Finnish document — there is no alternate URL to redirect to.
 */
export function LandingPage() {
  return (
    <LangRoot>
      <LandingBody />
    </LangRoot>
  )
}

function LandingBody() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const inputRef = React.useRef<HTMLInputElement>(null)

  /*
   * §7.5: the picker hands back a handle the bookkeeping can later be saved
   * to, which the hidden input below cannot. Both load io-commands lazily, so
   * jszip and papaparse stay out of this bundle (§11b).
   */
  const pickFile = async () => {
    const io = await import("@/lib/commands/io-commands")
    if (!(await io.pickAndOpenFile(ctx))) inputRef.current?.click()
  }

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

      <SiteHeader home={LANDING}>
        <ThemeToggle />
        <LangToggle />
        <OpenOrContinue onPick={() => void pickFile()} compact />
      </SiteHeader>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div className="flex flex-col justify-center">
            <DisplayHeading>{f.t("landing.title")}</DisplayHeading>
            <Lead className="mt-5">{f.t("landing.lead")}</Lead>
            <HeroCta onPick={() => void pickFile()} />
          </div>
          <LandingReceipts />
        </section>

        {/* Four steps */}
        <Section title={f.t("landing.howTitle")}>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as const).map((i) => (
              <li key={i} className="flex flex-col gap-2">
                <span className="tabular flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i}
                </span>
                <h3 className="font-medium">
                  {f.t(`landing.step${i}Title` as const)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {f.t(`landing.step${i}` as const)}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        {/* What it works out */}
        <Section title={f.t("landing.featTitle")}>
          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              title={f.t("landing.feat1Title")}
              body={f.t("landing.feat1")}
            >
              <div className="flex flex-wrap gap-1.5">
                {[25.5, 13.5, 10, 0].map((rate) => (
                  <Pill key={rate} className="tabular">
                    {f.rate(rate)}
                  </Pill>
                ))}
                <Pill>EU</Pill>
                <Pill>{f.t("summary.reverseCharge")}</Pill>
              </div>
            </FeatureCard>

            <FeatureCard
              title={f.t("landing.feat2Title")}
              body={f.t("landing.feat2")}
            >
              <dl className="flex flex-col gap-1 text-xs">
                <MiniRow label="300" value={f.money(1250000)} />
                <MiniRow label="333" value={`${MINUS}${f.money(22821)}`} />
                <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                  <dt>358</dt>
                  <dd className="tabular">{f.money(1227179)}</dd>
                </div>
              </dl>
            </FeatureCard>

            <FeatureCard
              title={f.t("landing.feat3Title")}
              body={f.t("landing.feat3")}
            >
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
        <Section title={f.t("landing.privacyTitle")}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>{f.t("landing.privacy1")}</p>
              <p>{f.t("landing.privacy2")}</p>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-sheet-edge bg-sheet p-3 text-[0.7rem] leading-relaxed">
              <code>
                <b>{CSV_HEADER_LINE}</b>
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

        {/* FAQ. The id is what the app's sidebar links back to. */}
        <Section id={LANDING_FAQ_ID} title={f.t("landing.faqTitle")}>
          <Accordion className="max-w-3xl">
            {([1, 2, 3, 4] as const).map((i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger>
                  {f.t(`landing.q${i}` as const)}
                </AccordionTrigger>
                <AccordionContent>
                  {f.t(`landing.a${i}` as const)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16">
          <Surface radius="xl" className="px-6 py-10 text-center">
            <SectionHeading>{f.t("landing.endTitle")}</SectionHeading>
            <HeroCta
              onPick={() => void pickFile()}
              className="justify-center"
            />
          </Surface>
        </section>
      </main>

      <SiteFooter />
      <ImportOverlay />
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
  const ctx = useCommandCtx()
  const hydrated = useBookStore((s) => s.hydrated)
  const open = useBookStore((s) => s.open)
  const entries = useBookStore((s) => s.entries)
  const fileName = useBookStore((s) => s.fileName)
  const dirty = useBookStore((s) => s.dirty)
  const busy = useDelayedFlag(useBookStore((s) => s.importing))

  const openState = hydrated && open

  return (
    <div className={cn("mt-7 flex flex-col gap-3", className)}>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {openState ? (
          <ButtonLink size="lg" href={APP_ROUTES.ledger}>
            {f.t("landing.continue")}
          </ButtonLink>
        ) : (
          <Button size="lg" onClick={() => void startNewBook(ctx)}>
            <PlusIcon data-icon="inline-start" />
            {f.t("landing.start")}
          </Button>
        )}
        <BusyButton
          icon={UploadIcon}
          busy={busy}
          busyLabel={f.t("io.opening")}
          size="lg"
          variant="outline"
          onClick={onPick}
        >
          {f.t("landing.open")}
        </BusyButton>
      </div>

      {openState ? (
        <p className="text-sm text-muted-foreground">
          {fileName ?? f.t("file.untitled")},{" "}
          {f.t("ledger.entryCount", { n: entries.length })}
          {dirty && entries.length ? `. ${f.t("file.dirty")}.` : ""}
        </p>
      ) : (
        <DropTile
          disabled={busy}
          onClick={onPick}
          className="flex items-center gap-3 rounded-lg px-4 py-3"
        >
          <UploadIcon className="size-5 shrink-0 text-muted-foreground" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{f.t("landing.drop")}</span>
            <span className="text-xs text-muted-foreground">
              {f.t("landing.dropSub")}
            </span>
          </span>
        </DropTile>
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
  const busy = useDelayedFlag(useBookStore((s) => s.importing))

  if (hydrated && open) {
    return (
      <ButtonLink size="sm" href={APP_ROUTES.ledger}>
        {f.t("landing.toApp")}
      </ButtonLink>
    )
  }
  return (
    <BusyButton
      icon={UploadIcon}
      busy={busy}
      size="sm"
      variant="outline"
      onClick={onPick}
    >
      {compact ? f.t("file.openShort") : f.t("file.open")}
    </BusyButton>
  )
}

function Section({
  id,
  title,
  children,
}: {
  /** Set only on sections something links to by anchor. */
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <SectionHeading className="mb-6">{title}</SectionHeading>
      {children}
    </section>
  )
}

/*
 * A `Surface` rather than a `Panel`: the title belongs to the card's flow
 * above an illustration, not on a ruled heading strip, and it is an h3 under
 * the section's own heading.
 */
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
    <Surface as="article" className="flex flex-col gap-3 p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="mt-auto rounded-md bg-muted/40 p-3">{children}</div>
    </Surface>
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
