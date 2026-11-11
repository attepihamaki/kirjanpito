export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  /** The section's name, over the title of a page inside it (§8.2). */
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-0.5 text-sm text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-[1.625rem] leading-tight font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="print-hidden flex gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
