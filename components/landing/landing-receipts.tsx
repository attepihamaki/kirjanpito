"use client"

import { useFormatters } from "@/components/lang-provider"
import { cn } from "@/lib/utils"

/**
 * The hero's two overlapping paper receipts (§8.3) — the design's one bold
 * element. The figures are illustrative, not computed from any bookkeeping;
 * they just have to look like a plausible October.
 */
export function LandingReceipts() {
  const f = useFormatters()

  return (
    <div
      aria-hidden="true"
      className="relative hidden min-h-[22rem] items-center justify-center rounded-xl bg-accent/40 p-6 sm:flex"
    >
      {/* Expense receipt: hidden on small screens, per §8.3. */}
      <Receipt className="absolute left-6 hidden -rotate-6 md:block">
        <Head
          label={f.t("r_kulu")}
          date={f.date("2026-10-10")}
          tone="expense"
        />
        <p className="mt-3 text-sm font-medium">Osto – K-Rauta – tarvikkeet</p>
        <p className="text-xs text-paper-foreground/70">333</p>
        <Rule />
        <Row label={f.t("r_net")} value={f.money(7968)} />
        <Row label={`${f.t("c_vat")} ${f.rate(25.5)}`} value={f.money(2032)} />
        <Rule />
        <Total label={f.t("r_total")} value={f.money(10000)} />
      </Receipt>

      {/* VAT receipt */}
      <Receipt className="relative z-10 rotate-3 md:translate-x-10">
        <p className="font-heading text-[0.7rem] font-semibold tracking-wide text-paper-foreground/70">
          {f.t("v_alv").toUpperCase()}
        </p>
        <p className="text-xs text-paper-foreground/70">{f.month(9)} 2026</p>
        <Rule />
        <Row label={f.t("lp_salesTax")} value={f.money(63750)} />
        <Row label={f.t("lp_buyTax")} value={`−${f.money(2032)}`} />
        <Rule />
        <Total label={f.t("lp_due")} value={f.money(61718)} />
        <p className="mt-3 text-center">
          <span className="rounded-sm bg-income-subtle px-1.5 py-0.5 text-[0.65rem] text-income">
            {f.t("r_salesTax")}
          </span>
        </p>
      </Receipt>
    </div>
  )
}

function Receipt({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("w-56", className)}>
      <div className="rounded-t-md border border-b-0 border-paper-edge bg-paper px-4 pt-4 pb-5 text-paper-foreground shadow-md">
        {children}
      </div>
      <div className="h-2.5 w-full bg-paper [mask-image:radial-gradient(circle_at_5px_0,transparent_0,transparent_4px,black_4.5px)] [mask-size:10px_10px] [mask-repeat:repeat-x]" />
    </div>
  )
}

function Head({
  label,
  date,
  tone,
}: {
  label: string
  date: string
  tone: "income" | "expense"
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 font-heading text-[0.65rem] font-semibold tracking-wide",
          tone === "income"
            ? "bg-income-subtle text-income"
            : "bg-expense-subtle text-expense"
        )}
      >
        {label}
      </span>
      <span className="tabular text-xs text-paper-foreground/70">{date}</span>
    </div>
  )
}

function Rule() {
  return <div className="my-3 border-t border-dashed border-paper-edge" />
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-paper-foreground/70">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="tabular text-lg font-semibold">{value}</span>
    </div>
  )
}
