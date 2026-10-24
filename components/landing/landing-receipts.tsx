"use client"

import { ReceiptPaper } from "@/components/common/receipt-paper"
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
      className="relative hidden min-h-[26rem] rounded-xl bg-accent p-6 sm:block dark:bg-accent/60"
    >
      {/* Expense receipt: hidden on small screens, per §8.3. */}
      <Receipt className="absolute top-6 left-6 hidden -rotate-6 lg:block">
        <Head
          label={f.t("r_expense")}
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
      <Receipt className="absolute right-6 bottom-6 z-10 rotate-3 max-lg:top-1/2 max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:-translate-y-1/2">
        <p className="font-heading text-[0.7rem] font-semibold tracking-wide text-paper-foreground/70">
          {f.t("v_vat").toUpperCase()}
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
    <ReceiptPaper className={cn("w-52 drop-shadow-lg", className)}>
      {children}
    </ReceiptPaper>
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
