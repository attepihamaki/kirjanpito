import type { Metadata } from "next"

import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "Kirjanpito – toiminimen yhdenkertainen kirjanpito selaimessa",
  description:
    "Kirjaa toiminimen tulot ja kulut kuukausittain. Kirjanpito laskee arvonlisäveron ja tuloslaskelman valmiiksi veroilmoitusta varten. Ei tiliä eikä tietokantaa – tiedot pysyvät omalla koneellasi CSV-tiedostossa.",
  alternates: {
    canonical: "/",
    languages: { fi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    locale: "fi_FI",
    url: "/",
    siteName: "Kirjanpito",
    title: "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon",
    description:
      "Yhdenkertainen kirjanpito toiminimelle. Arvonlisävero ja tuloslaskelma valmiina OmaVeroa varten, ilman tiliä ja ilman tietokantaa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon",
    description:
      "Yhdenkertainen kirjanpito toiminimelle. Arvonlisävero ja tuloslaskelma valmiina OmaVeroa varten.",
  },
}

export default function Page() {
  return <LandingPage lang="fi" />
}
