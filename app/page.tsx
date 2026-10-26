import type { Metadata } from "next"

import { LandingPage } from "@/components/landing/landing-page"
import { OG_ALT, OG_PATH, OG_SIZE } from "@/components/landing/og-image"

/*
 * The card is declared here rather than left to a file convention; see the
 * note in app/og/[file]/route.tsx for why. A page's `openGraph` replaces the
 * layout's wholesale, so the images belong alongside the rest of it.
 */
const ogImage = {
  url: OG_PATH,
  ...OG_SIZE,
  type: "image/png",
  alt: OG_ALT,
}

export const metadata: Metadata = {
  title: "Kirjanpito – toiminimen yhdenkertainen kirjanpito selaimessa",
  description:
    "Kirjaa toiminimen tulot ja kulut kuukausittain. Kirjanpito laskee arvonlisäveron ja tuloslaskelman valmiiksi veroilmoitusta varten. Ei tiliä eikä tietokantaa – tiedot pysyvät omalla koneellasi CSV-tiedostossa.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fi_FI",
    url: "/",
    siteName: "Kirjanpito",
    title: "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon",
    description:
      "Yhdenkertainen kirjanpito toiminimelle. Arvonlisävero ja tuloslaskelma valmiina OmaVeroa varten, ilman tiliä ja ilman tietokantaa.",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon",
    description:
      "Yhdenkertainen kirjanpito toiminimelle. Arvonlisävero ja tuloslaskelma valmiina OmaVeroa varten.",
    images: [ogImage],
  },
}

export default function Page() {
  return <LandingPage />
}
