"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"

import { CommitInput } from "@/components/inventory/commit-input"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { todayIso } from "@/lib/domain/dates"
import type { StockItem, StockLayer } from "@/lib/domain/inventory"
import { formatQuantity, parseQuantity } from "@/lib/domain/inventory-csv"
import { formatMoneyPlain, parseAmount } from "@/lib/domain/money"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * The purchases a row's stock came from, oldest first (§6.13). The cost method
 * picks the units still in stock out of them.
 */
export function LayersDialog({
  item,
  disabled,
  onChange,
  onClose,
}: {
  item: StockItem
  disabled: boolean
  onChange: (layers: StockLayer[]) => void
  onClose: () => void
}) {
  const f = useFormatters()
  const { layers } = item

  const set = (index: number, patch: Partial<StockLayer>) =>
    onChange(
      layers
        .map((l, i) => (i === index ? { ...l, ...patch } : l))
        .sort((a, b) => a.date.localeCompare(b.date))
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {f.t("inventory.layersTitle", { name: item.name })}
          </DialogTitle>
          <DialogDescription>{f.t("inventory.layersHelp")}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
          {layers.map((layer, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2"
            >
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {f.t("inventory.layerDate")}
                <Input
                  type="date"
                  value={layer.date}
                  disabled={disabled}
                  onChange={(e) =>
                    ISO_DATE.test(e.target.value) &&
                    set(i, { date: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {f.t("inventory.layerQuantity")}
                <CommitInput
                  right
                  inputMode="decimal"
                  label={f.t("inventory.layerQuantity")}
                  disabled={disabled}
                  value={formatQuantity(layer.quantityMilli, f.lang)}
                  onCommit={(text) => {
                    const q = parseQuantity(text)
                    if (q === null) return false
                    set(i, { quantityMilli: q })
                    return true
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {f.t("inventory.layerCost")}
                <CommitInput
                  right
                  inputMode="decimal"
                  label={f.t("inventory.layerCost")}
                  disabled={disabled}
                  value={formatMoneyPlain(layer.unitCents)}
                  onCommit={(text) => {
                    const c = parseAmount(text)
                    if (c === null || c < 0) return false
                    set(i, { unitCents: c })
                    return true
                  }}
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={f.t("inventory.removeLayer")}
                onClick={() => onChange(layers.filter((_, j) => j !== i))}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() =>
              onChange(
                [
                  ...layers,
                  {
                    date: todayIso(),
                    quantityMilli: 1000,
                    unitCents: item.unitCents,
                  },
                ].sort((a, b) => a.date.localeCompare(b.date))
              )
            }
          >
            <PlusIcon data-icon="inline-start" />
            {f.t("inventory.addLayer")}
          </Button>
          <Button onClick={onClose}>{f.t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
