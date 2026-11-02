import { VatShell } from "@/components/vat/vat-shell"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <VatShell>{children}</VatShell>
}
