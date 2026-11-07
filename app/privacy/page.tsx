import type { Metadata } from "next"

import { PrivacyPage } from "@/components/privacy-page"

export const metadata: Metadata = {
  title: "Tietosuoja – Kirjanpito",
  description:
    "Mitä Kirjanpito tallentaa ja minne. Tiedot pysyvät selaimessa ja omassa tiedostossasi, eikä mitään lähetetä palvelimelle.",
  alternates: { canonical: "/privacy/" },
}

export default function Page() {
  return <PrivacyPage />
}
