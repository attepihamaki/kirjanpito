"use client"

import { useFormatters } from "@/components/lang-provider"
import { calcEntry } from "@/lib/domain/calc"
import type { AmountMode, Category, EntryType } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

/**
 * The live paper receipt (§8.5) — the one bold element in the design (§11).
 * A perforated bottom edge, warm paper tone, everything else quiet.
 */
export function ReceiptPreview({
  pvm,
  selite,
  tyyppi,
  cat,
  summa,
  alv,
  syotto,
}: {
  pvm: string
  selite: string
  tyyppi: EntryType
  cat: Category | undefined
  summa: number
  alv: number
  syotto: AmountMode
}) {
  const f = useFormatters()
  const { net, vat, gross } = calcEntry({ summa, alv, syotto })
  const income = tyyppi === "tulo"

  const badge = !alv
    ? f.t("r_noVat")
    : income
      ? f.t("r_salesTax")
      : f.t("r_deduct")

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-t-md bg-paper px-4 pt-4 pb-5 text-paper-foreground",
          "border border-b-0 border-paper-edge shadow-sm"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5 font-heading text-[0.65rem] font-semibold tracking-wide",
              income
                ? "bg-income-subtle text-income"
                : "bg-expense-subtle text-expense"
            )}
          >
            {income ? f.t("r_tulo") : f.t("r_kulu")}
          </span>
          <span className="tabular text-xs text-paper-foreground/70">
            {pvm ? f.date(pvm) : "—"}
          </span>
        </div>

        <p className="mt-3 text-sm font-medium break-words">
          {selite.trim() || (
            <span className="text-paper-foreground/50">{f.t("noDesc")}</span>
          )}
        </p>
        <p className="text-xs text-paper-foreground/70">
          {cat ? f.catLabel(cat) : f.t("unknownCat")}
        </p>

        <div className="mt-4 flex flex-col gap-1 border-t border-dashed border-paper-edge pt-3 text-sm">
          <Line label={f.t("r_net")} value={f.money(net)} />
          <Line
            label={`${f.t("c_vat")} ${alv ? f.rate(alv) : ""}`.trim()}
            value={f.money(vat)}
          />
          <div className="mt-1 flex items-baseline justify-between border-t border-paper-edge pt-2">
            <span className="font-medium">{f.t("r_total")}</span>
            <span className="tabular text-lg font-semibold">
              {f.money(gross)}
            </span>
          </div>
        </div>

        <p className="mt-3 text-center text-[0.7rem] text-paper-foreground/60">
          {badge}
        </p>
      </div>

      {/* Perforated tear-off edge. */}
      <div
        aria-hidden="true"
        className="h-2.5 w-full bg-paper [mask-image:radial-gradient(circle_at_5px_0,transparent_0,transparent_4px,black_4.5px)] [mask-size:10px_10px] [mask-repeat:repeat-x]"
      />
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-paper-foreground/70">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  )
}
