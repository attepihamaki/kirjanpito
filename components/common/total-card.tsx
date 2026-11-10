import { Panel } from "@/components/common/panel"

/** A bare panel with a small label over one large figure: the totals cards above a table. */
export function TotalCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Panel bodyClassName="flex flex-col gap-0.5 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium">{children}</span>
    </Panel>
  )
}
