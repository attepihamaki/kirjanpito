import type { Metadata } from "next"

import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "Bookkeeping – single-entry books for Finnish sole traders",
  description:
    "Record your sole trader income and expenses month by month. The app works out your VAT return and income statement for the Finnish tax return. No account, no database — your data stays on your own computer in a CSV file.",
  alternates: {
    canonical: "/en",
    languages: { fi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/en",
    siteName: "Kirjanpito",
    title: "Sole trader bookkeeping that fits in a single file",
    description:
      "Single-entry bookkeeping for Finnish sole traders. VAT and income statement ready for OmaVero, with no account and no database.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sole trader bookkeeping that fits in a single file",
    description:
      "Single-entry bookkeeping for Finnish sole traders. VAT and income statement ready for OmaVero.",
  },
}

export default function Page() {
  return <LandingPage lang="en" />
}
