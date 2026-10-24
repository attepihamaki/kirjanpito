import type { Metadata } from "next"

import { AppShell } from "@/components/app/app-shell"

/**
 * The bookkeeping app. Entirely client-side, and never indexed: it renders
 * nothing but a skeleton until the browser's own data has loaded, so there is
 * nothing for a crawler to see.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
