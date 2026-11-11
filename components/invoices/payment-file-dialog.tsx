"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"

import { DateInput } from "@/components/common/date-input"
import { OptionSelect } from "@/components/common/option-select"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCommandCtx } from "@/hooks/use-commands"
import { saveBlob } from "@/lib/browser/download"
import { payBills } from "@/lib/commands/bulk-commands"
import { todayIso } from "@/lib/domain/dates"
import { formatIban, parseIban } from "@/lib/domain/iban"
import type { Payable } from "@/lib/domain/payables"
import {
  batchTotal,
  executionDateFor,
  finnishBic,
  isBic,
  localDateTime,
  PAYMENT_FILE_VERSIONS,
  paymentFileXml,
  paymentMessageId,
  paymentOrderFor,
  type PaymentFileVersion,
  type PaymentOrder,
  type PaymentSkip,
} from "@/lib/domain/payment-file"
import { useBookStore } from "@/stores/book-store"

/**
 * Make a SEPA payment file of the chosen bills (§8.30): the payer's account
 * and bank, the day each bill is paid, and whether to mark them paid in the
 * book now. Bills that cannot be paid by transfer are named and left out.
 */
export function PaymentFileDialog({
  bills,
  onClose,
}: {
  bills: readonly Payable[]
  onClose: () => void
}) {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const parties = useBookStore((s) => s.customers)
  const ownIban = useBookStore((s) => s.invoiceSettings.iban)
  const businessName = useBookStore((s) => s.businessName)

  const today = todayIso()
  const [name, setName] = React.useState(businessName ?? "")
  const [iban, setIban] = React.useState(ownIban ? formatIban(ownIban) : "")
  const [bic, setBic] = React.useState(() => finnishBic(ownIban))
  // A BIC the user typed is kept when the account changes.
  const bicTyped = React.useRef(false)
  const [sameDay, setSameDay] = React.useState(false)
  const [on, setOn] = React.useState(today)
  const [badDate, setBadDate] = React.useState(false)
  const [version, setVersion] = React.useState<PaymentFileVersion>("03")
  const [markPaid, setMarkPaid] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const { orders, skipped } = React.useMemo(() => {
    const orders: { bill: Payable; order: PaymentOrder }[] = []
    const skipped: { bill: Payable; why: PaymentSkip }[] = []
    for (const bill of bills) {
      const date = sameDay ? on : executionDateFor(bill, today)
      const order = paymentOrderFor(bill, date, parties)
      if (typeof order === "string") skipped.push({ bill, why: order })
      else orders.push({ bill, order })
    }
    return { orders, skipped }
  }, [bills, sameDay, on, today, parties])

  const debtorIban = parseIban(iban)
  const bicValue = bic.trim().toUpperCase()
  const errors = {
    name: !name.trim(),
    // An empty field is not marked wrong; the download waits for it anyway.
    iban: !debtorIban && iban.trim() !== "",
    bic: bicValue !== "" && !isBic(bicValue),
    date: sameDay && (badDate || !on || on < today),
  }
  const blocked =
    orders.length === 0 ||
    !debtorIban ||
    Object.values(errors).some(Boolean) ||
    busy

  const download = async () => {
    if (blocked || !debtorIban) return
    setBusy(true)
    try {
      const now = new Date()
      const xml = paymentFileXml(
        {
          messageId: paymentMessageId(now),
          createdAt: localDateTime(now),
          debtorName: name,
          debtorIban,
          debtorBic: bicValue,
          orders: orders.map((o) => o.order),
        },
        version
      )
      saveBlob(
        new Blob([xml], { type: "application/xml" }),
        `${f.t("payables.fileFileName")}-${today}.xml`
      )
      if (markPaid) {
        await payBills(
          ctx,
          orders.map((o) => ({
            parts: o.bill.entries,
            on: o.order.executionDate,
          }))
        )
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const skipText: Record<PaymentSkip, string> = {
    noIban: f.t("payables.fileSkipNoIban"),
    notOwed: f.t("payables.fileSkipNotOwed"),
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{f.t("payables.fileTitle")}</DialogTitle>
          <DialogDescription>
            {f.t("payables.fileDescription")}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={errors.name}>
            <FieldLabel htmlFor="pay-name">
              {f.t("payables.filePayer")}
            </FieldLabel>
            <Input
              id="pay-name"
              value={name}
              aria-invalid={errors.name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="grid gap-5 min-[480px]:grid-cols-[1fr_9rem]">
            <Field data-invalid={errors.iban}>
              <FieldLabel htmlFor="pay-iban">
                {f.t("payables.fileAccount")}
              </FieldLabel>
              <Input
                id="pay-iban"
                value={iban}
                aria-invalid={errors.iban}
                className="font-mono"
                onChange={(e) => {
                  setIban(e.target.value)
                  if (!bicTyped.current) setBic(finnishBic(e.target.value))
                }}
              />
              {errors.iban ? (
                <FieldError>{f.t("payables.fileBadIban")}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={errors.bic}>
              <FieldLabel htmlFor="pay-bic">BIC</FieldLabel>
              <Input
                id="pay-bic"
                value={bic}
                aria-invalid={errors.bic}
                className="font-mono uppercase"
                onChange={(e) => {
                  bicTyped.current = true
                  setBic(e.target.value)
                }}
              />
            </Field>
          </div>

          <Field orientation="horizontal">
            <Checkbox
              id="pay-same-day"
              checked={sameDay}
              onCheckedChange={(checked) => setSameDay(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="pay-same-day" className="font-normal">
                {f.t("payables.fileSameDay")}
              </FieldLabel>
              <FieldDescription>
                {f.t(
                  sameDay ? "payables.fileSameDayOn" : "payables.fileOnDueDate"
                )}
              </FieldDescription>
            </div>
          </Field>
          {sameDay ? (
            <Field data-invalid={errors.date}>
              <FieldLabel>{f.t("payables.filePayDay")}</FieldLabel>
              <DateInput
                value={on}
                onValueChange={setOn}
                onBadChange={setBadDate}
              />
            </Field>
          ) : null}

          <Field>
            <FieldLabel>{f.t("payables.fileVersion")}</FieldLabel>
            <OptionSelect
              options={PAYMENT_FILE_VERSIONS.map((v) => ({
                value: v,
                label: f.t(
                  v === "09"
                    ? "payables.fileVersion09"
                    : "payables.fileVersion03"
                ),
              }))}
              value={version}
              onChange={(v) => setVersion(v as PaymentFileVersion)}
              label={f.t("payables.fileVersion")}
            />
            <FieldDescription>
              {f.t("payables.fileVersionHint")}
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="pay-mark"
              checked={markPaid}
              onCheckedChange={(checked) => setMarkPaid(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="pay-mark" className="font-normal">
                {f.t("payables.fileMarkPaid")}
              </FieldLabel>
              <FieldDescription>
                {f.t("payables.fileMarkPaidHint")}
              </FieldDescription>
            </div>
          </Field>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {f.t("payables.fileSummary", {
                n: orders.length,
                a: f.money(batchTotal(orders.map((o) => o.order))),
              })}
            </p>
            {skipped.length ? (
              <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
                {skipped.map(({ bill, why }) => (
                  <li key={bill.lead.id}>
                    {f.t("payables.fileSkipped", {
                      d: bill.lead.description || "–",
                      r: skipText[why],
                    })}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {f.t("common.cancel")}
          </Button>
          <Button disabled={blocked} onClick={download}>
            <DownloadIcon data-icon="inline-start" />
            {f.t("payables.fileDownload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
