import type { Metadata } from "next"

import "@/app/globals.css"
import { HtmlShell } from "@/components/html-shell"
import { StoreHydrator } from "@/components/store-hydrator"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kirjanpito – toiminimen yhdenkertainen kirjanpito",
    template: "%s – Kirjanpito",
  },
  description:
    "Selaimessa toimiva yhdenkertainen kirjanpito toiminimelle. Laskee arvonlisäveron ja tuloslaskelman veroilmoitusta varten. Ei tiliä, ei tietokantaa – tiedot pysyvät omalla koneellasi.",
}

export default function FiRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <HtmlShell lang="fi">
      <StoreHydrator />
      {children}
    </HtmlShell>
  )
}
