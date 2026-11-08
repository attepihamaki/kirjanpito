import { InvoiceShell } from "@/components/invoices/invoice-shell"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InvoiceShell>{children}</InvoiceShell>
}
