import type { Metadata } from "next"

import "@/app/globals.css"
import { HtmlShell } from "@/components/html-shell"
import { StoreHydrator } from "@/components/store-hydrator"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bookkeeping – single-entry books for Finnish sole traders",
    template: "%s – Bookkeeping",
  },
  description:
    "Single-entry bookkeeping for Finnish sole traders, running entirely in your browser. Works out your VAT return and income statement. No account, no database — your data stays on your own computer.",
}

export default function EnRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <HtmlShell lang="en">
      <StoreHydrator />
      {children}
    </HtmlShell>
  )
}
