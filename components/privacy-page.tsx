"use client"

import { ArrowLeftIcon } from "lucide-react"

import { LangToggle } from "@/components/app/lang-toggle"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ButtonLink } from "@/components/common/button-link"
import { SiteFooter, SiteHeader } from "@/components/common/site-chrome"
import {
  DisplayHeading,
  Lead,
  SectionHeading,
} from "@/components/common/typography"
import { LangRoot, useFormatters } from "@/components/lang-provider"
import type { MessageKey } from "@/lib/i18n/messages"
import { LANDING } from "@/lib/site"

/**
 * The privacy statement (§8.3): what is stored where, and that nothing leaves
 * the browser. A static document like the landing page, in the stored language.
 */
export function PrivacyPage() {
  return (
    <LangRoot>
      <PrivacyBody />
    </LangRoot>
  )
}

/** A heading and the paragraphs under it. */
const SECTIONS: readonly {
  title: MessageKey
  paragraphs: readonly MessageKey[]
}[] = [
  {
    title: "privacy.whoTitle",
    paragraphs: ["privacy.who1", "privacy.who2", "privacy.who3"],
  },
  {
    title: "privacy.netTitle",
    paragraphs: ["privacy.net1", "privacy.net2"],
  },
  {
    title: "privacy.secTitle",
    paragraphs: ["privacy.enc1", "privacy.enc2", "privacy.seal"],
  },
  {
    title: "privacy.clearTitle",
    paragraphs: ["privacy.clear1", "privacy.clear2"],
  },
]

/** The places data lives, each a term and what it holds. */
const PLACES: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: "privacy.lsTitle", body: "privacy.ls" },
  { title: "privacy.idbTitle", body: "privacy.idb" },
  { title: "privacy.fileTitle", body: "privacy.file" },
  { title: "privacy.noneTitle", body: "privacy.none" },
]

function PrivacyBody() {
  const f = useFormatters()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader home={LANDING}>
        <ThemeToggle />
        <LangToggle />
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <p className="tabular font-heading text-sm font-semibold tracking-wide text-muted-foreground">
          {f.t("privacy.badge")}
        </p>
        <DisplayHeading size="md" className="mt-2">
          {f.t("privacy.title")}
        </DisplayHeading>
        <Lead className="mt-5">{f.t("privacy.lead")}</Lead>

        <div className="mt-10 flex max-w-prose flex-col gap-10">
          <section className="flex flex-col gap-3">
            <SectionHeading>{f.t(SECTIONS[0].title)}</SectionHeading>
            {SECTIONS[0].paragraphs.map((key) => (
              <p key={key} className="text-muted-foreground">
                {f.t(key)}
              </p>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading>{f.t("privacy.storeTitle")}</SectionHeading>
            <p className="text-muted-foreground">{f.t("privacy.storeLead")}</p>
            <dl className="mt-1 flex flex-col gap-4">
              {PLACES.map(({ title, body }) => (
                <div key={title}>
                  <dt className="font-heading font-semibold">{f.t(title)}</dt>
                  <dd className="mt-1 text-muted-foreground">{f.t(body)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {SECTIONS.slice(1).map(({ title, paragraphs }) => (
            <section key={title} className="flex flex-col gap-3">
              <SectionHeading>{f.t(title)}</SectionHeading>
              {paragraphs.map((key) => (
                <p key={key} className="text-muted-foreground">
                  {f.t(key)}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10">
          <ButtonLink size="lg" href={LANDING}>
            <ArrowLeftIcon data-icon="inline-start" />
            {f.t("privacy.back")}
          </ButtonLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
