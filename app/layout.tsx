import type { Metadata } from "next"

import "@/app/globals.css"
import { HtmlShell } from "@/components/html-shell"
import { StoreHydrator } from "@/components/store-hydrator"
import { INDEXABLE, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /*
   * Inherited by every document, the landing included. While INDEXABLE is
   * off this is the whole of "SEO off"; app/app/layout sets its own noindex
   * regardless, because the app is never indexable.
   */
  robots: INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  title: {
    default: "Kirjanpito – toiminimen yhdenkertainen kirjanpito",
    template: "%s – Kirjanpito",
  },
  description:
    "Selaimessa toimiva yhdenkertainen kirjanpito toiminimelle. Laskee arvonlisäveron ja tuloslaskelman veroilmoitusta varten. Ei tiliä, ei tietokantaa – tiedot pysyvät omalla koneellasi.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <HtmlShell>
      <StoreHydrator />
      {children}
    </HtmlShell>
  )
}
