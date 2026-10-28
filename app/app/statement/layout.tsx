import { StatementShell } from "@/components/statement/statement-shell"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <StatementShell>{children}</StatementShell>
}
