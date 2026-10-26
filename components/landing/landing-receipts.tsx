"use client"

import {
  ReceiptHead,
  ReceiptPaper,
  ReceiptRow,
  ReceiptRule,
  ReceiptTotal,
} from "@/components/common/receipt-paper"
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
    /*
     * The panel is the prototype's soft accent block (`.lp-visual::before`,
     * --accent-soft): a tint of --primary rather than --accent, because
     * --accent is the neutral hover grey. Tinting gives both themes what the
     * prototype spells out as two hex values, with no `dark:` override.
     */
    <div
      aria-hidden="true"
      className="relative hidden min-h-[26rem] rounded-xl bg-primary/10 p-6 sm:block"
    >
      {/* Expense receipt: hidden on small screens, per §8.3. */}
      <Receipt className="absolute top-6 left-6 hidden -rotate-6 lg:block">
        <ReceiptHead
          label={f.t("receipt.expense")}
          date={f.date("2026-10-10")}
          tone="expense"
        />
        <p className="mt-3 text-sm font-medium">Osto – K-Rauta – tarvikkeet</p>
        <p className="text-xs text-paper-foreground/70">333</p>
        <ReceiptRule />
        <ReceiptRow label={f.t("receipt.net")} value={f.money(7968)} />
        <ReceiptRow
          label={`${f.t("ledger.colVat")} ${f.rate(25.5)}`}
          value={f.money(2032)}
        />
        <ReceiptRule />
        <ReceiptTotal label={f.t("receipt.total")} value={f.money(10000)} />
      </Receipt>

      {/* VAT receipt */}
      <Receipt className="absolute right-6 bottom-6 z-10 rotate-3 max-lg:top-1/2 max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:-translate-y-1/2">
        <p className="font-heading text-[0.7rem] font-semibold tracking-wide text-paper-foreground/70">
          {f.t("nav.vat").toUpperCase()}
        </p>
        <p className="text-xs text-paper-foreground/70">{f.month(9)} 2026</p>
        <ReceiptRule />
        <ReceiptRow label={f.t("landing.salesTax")} value={f.money(63750)} />
        <ReceiptRow label={f.t("landing.buyTax")} value={`−${f.money(2032)}`} />
        <ReceiptRule />
        <ReceiptTotal label={f.t("landing.due")} value={f.money(61718)} />
        <p className="mt-3 text-center">
          <span className="rounded-sm bg-income-subtle px-1.5 py-0.5 text-[0.65rem] text-income">
            {f.t("receipt.salesBadge")}
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
