"use client"

import * as React from "react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { AmountInput } from "@/components/common/amount-input"
import { Money } from "@/components/common/money"
import { OptionSelect } from "@/components/common/option-select"
import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { evalAmount } from "@/lib/domain/amount-expr"
import { todayIso } from "@/lib/domain/dates"
import { uid } from "@/lib/domain/id"
import type { Product } from "@/lib/domain/invoice"
import { isInvoiceCategory } from "@/lib/domain/invoice-calc"
import { formatMoneyPlain } from "@/lib/domain/money"
import { rateOnDate, validRates } from "@/lib/domain/vat-rates"
import { useBookStore } from "@/stores/book-store"

/** The default category and rate of a new product, as for a new invoice row. */
const DEFAULT_CAT = "300-domestic"
const DEFAULT_RATE = 25.5

/** Store the register, keeping the rest of the invoice settings as they are. */
function setProducts(products: Product[]) {
  const s = useBookStore.getState()
  s.setInvoiceSettings({ ...s.invoiceSettings, products })
}

/**
 * The product and service register (§8.27), at Laskut → Tuotteet. A product
 * fills an invoice row in one pick; the row can still be changed on the
 * invoice. Removing a product leaves the invoices that used it as they are.
 */
export function ProductList() {
  const f = useFormatters()
  const products = useBookStore((s) => s.invoiceSettings.products)
  const cats = useBookStore((s) => s.cats)
  const [editing, setEditing] = React.useState<Product | null>(null)
  const [adding, setAdding] = React.useState(false)
  const sorted = [...products].sort((a, b) =>
    f.collator.compare(a.name, b.name)
  )

  const remove = (product: Product) => {
    setProducts(products.filter((p) => p.id !== product.id))
    const id = toast.add({
      title: f.t("product.deleted", { x: product.name }),
      actionProps: {
        children: f.t("common.undo"),
        onClick: () => {
          toast.close(id)
          const now = useBookStore.getState().invoiceSettings.products
          setProducts([...now, product])
        },
      },
    })
  }

  return (
    <Panel
      title={f.t("product.title")}
      description={f.t("product.hint")}
      actions={
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          {f.t("product.new")}
        </Button>
      }
    >
      {sorted.length === 0 ? (
        <Empty>
          <EmptyDescription>{f.t("product.empty")}</EmptyDescription>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{f.t("product.name")}</TableHead>
              <TableHead className="text-right">
                {f.t("product.price")}
              </TableHead>
              <TableHead>{f.t("invoice.rowUnit")}</TableHead>
              <TableHead>{f.t("invoice.rowVat")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {f.t("invoice.rowCategory")}
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => {
              const cat = cats.find((c) => c.id === p.catId)
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">
                    <Money cents={p.unitCents} />
                  </TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell className="tabular">
                    {f.rate(rateOnDate(p.vatRate, todayIso()))}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {cat ? f.catLabel(cat) : "–"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("product.edit", { x: p.name })}
                      onClick={() => setEditing(p)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={f.t("product.delete", { x: p.name })}
                      onClick={() => remove(p)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {editing || adding ? (
        <ProductDialog
          product={editing}
          onClose={() => {
            setEditing(null)
            setAdding(false)
          }}
        />
      ) : null}
    </Panel>
  )
}

/** Add a product, or change one. */
function ProductDialog({
  product,
  onClose,
}: {
  product: Product | null
  onClose: () => void
}) {
  const f = useFormatters()
  const cats = useBookStore((s) => s.cats)
  const today = todayIso()
  const [name, setName] = React.useState(product?.name ?? "")
  const [unit, setUnit] = React.useState(product?.unit ?? "")
  const [price, setPrice] = React.useState(
    product ? formatMoneyPlain(product.unitCents) : ""
  )
  const [vatRate, setVatRate] = React.useState(
    rateOnDate(product?.vatRate ?? DEFAULT_RATE, today)
  )
  const incomeCats = cats.filter(isInvoiceCategory)
  const [catId, setCatId] = React.useState(
    product?.catId ??
      (incomeCats.some((c) => c.id === DEFAULT_CAT)
        ? DEFAULT_CAT
        : (incomeCats[0]?.id ?? ""))
  )
  const [showErrors, setShowErrors] = React.useState(false)
  const ids = { name: React.useId(), unit: React.useId(), price: React.useId() }

  const cents = evalAmount(price)
  const nameBad = name.trim() === ""
  const priceBad = cents == null || cents < 0
  const rates = validRates(today)

  const save = () => {
    if (nameBad || cents == null || cents < 0 || catId === "") {
      setShowErrors(true)
      return
    }
    const next: Product = {
      id: product?.id ?? uid(),
      name: name.trim(),
      unit: unit.trim(),
      unitCents: cents,
      vatRate,
      catId,
    }
    const all = useBookStore.getState().invoiceSettings.products
    setProducts(
      product ? all.map((p) => (p.id === next.id ? next : p)) : [...all, next]
    )
    toast.add({ title: f.t("product.saved", { x: next.name }) })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f.t(product ? "product.editTitle" : "product.newTitle")}
          </DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={ids.name}>{f.t("product.name")}</FieldLabel>
          <Input
            id={ids.name}
            value={name}
            aria-invalid={(showErrors && nameBad) || undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {showErrors && nameBad ? (
            <FieldError>{f.t("product.needsName")}</FieldError>
          ) : null}
        </Field>
        <div className="flex flex-wrap gap-3">
          <Field className="w-32">
            <FieldLabel htmlFor={ids.price}>{f.t("product.price")}</FieldLabel>
            <AmountInput
              id={ids.price}
              className="text-right"
              value={price}
              aria-invalid={(showErrors && priceBad) || undefined}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field className="w-24">
            <FieldLabel htmlFor={ids.unit}>{f.t("invoice.rowUnit")}</FieldLabel>
            <Input
              id={ids.unit}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </Field>
          <Field className="w-28">
            <FieldLabel>{f.t("invoice.rowVat")}</FieldLabel>
            <OptionSelect
              label={f.t("invoice.rowVat")}
              value={String(vatRate)}
              onChange={(v) => setVatRate(Number(v))}
              options={(rates.includes(vatRate)
                ? rates
                : [...rates, vatRate]
              ).map((r) => ({ value: String(r), label: f.rate(r) }))}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>{f.t("invoice.rowCategory")}</FieldLabel>
          <OptionSelect
            label={f.t("invoice.rowCategory")}
            value={catId}
            onChange={setCatId}
            options={(incomeCats.some((c) => c.id === catId)
              ? incomeCats
              : [...incomeCats, ...cats.filter((c) => c.id === catId)]
            ).map((c) => ({ value: c.id, label: f.catLabel(c) }))}
          />
        </Field>
        {showErrors && priceBad ? (
          <FieldError>{f.t("product.badPrice")}</FieldError>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button onClick={save}>{f.t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
