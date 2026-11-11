"use client"

import * as React from "react"
import { EyeIcon, ImageIcon, TrashIcon } from "lucide-react"

import { Panel } from "@/components/common/panel"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCommandCtx } from "@/hooks/use-commands"
import { readLogo } from "@/lib/browser/invoice-logo"
import { previewInvoiceLook } from "@/lib/commands/look-commands"
import { FOOTER_MAX, type InvoiceSettings } from "@/lib/domain/invoice"
import { useBookStore } from "@/stores/book-store"

/** What the colour field shows while no accent is set: the PDF's own ink. */
const PLAIN_INK = "#1a1a1a"

/**
 * How invoices, quotes, reminders and statements look (§8.27): a logo, an
 * accent colour for the heading and the rules, and a footer on every page.
 * Each is stored as soon as it is picked or the footer loses focus.
 */
export function InvoiceLookForm() {
  const f = useFormatters()
  const ctx = useCommandCtx()
  const settings = useBookStore((s) => s.invoiceSettings)
  const setSettings = useBookStore((s) => s.setInvoiceSettings)
  const [footer, setFooter] = React.useState(settings.footer ?? "")
  const [logoBad, setLogoBad] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const ids = {
    logo: React.useId(),
    accent: React.useId(),
    footer: React.useId(),
  }

  /** The settings with `patch` applied, a field set to undefined removed. */
  const save = (patch: Partial<InvoiceSettings>) => {
    const next: InvoiceSettings = { ...useBookStore.getState().invoiceSettings }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete next[key as keyof InvoiceSettings]
      else Object.assign(next, { [key]: value })
    }
    setSettings(next)
  }

  const pickLogo = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    const logo = await readLogo(file)
    setBusy(false)
    setLogoBad(logo === null)
    if (logo) save({ logo })
  }

  const preview = async () => {
    setBusy(true)
    try {
      await previewInvoiceLook(ctx)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={f.t("invoice.lookTitle")}
      description={f.t("invoice.lookHint")}
      bodyClassName="p-4"
      actions={
        <Button variant="outline" size="sm" disabled={busy} onClick={preview}>
          <EyeIcon data-icon="inline-start" />
          {f.t("invoice.lookPreview")}
        </Button>
      }
    >
      <FieldGroup className="max-w-xl">
        <Field data-invalid={logoBad || undefined}>
          <FieldLabel htmlFor={ids.logo}>{f.t("invoice.lookLogo")}</FieldLabel>
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:${settings.logo.type};base64,${settings.logo.data}`}
              alt={f.t("invoice.lookLogoAlt")}
              className="h-12 w-auto max-w-40 self-start rounded-sm border object-contain p-1"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon data-icon="inline-start" />
              {f.t(
                settings.logo
                  ? "invoice.lookLogoChange"
                  : "invoice.lookLogoPick"
              )}
            </Button>
            {settings.logo ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogoBad(false)
                  save({ logo: undefined })
                }}
              >
                <TrashIcon data-icon="inline-start" />
                {f.t("invoice.lookLogoRemove")}
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            id={ids.logo}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void pickLogo(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <FieldError>
            {logoBad ? f.t("invoice.lookLogoBad") : undefined}
          </FieldError>
          <FieldDescription>{f.t("invoice.lookLogoHint")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={ids.accent}>
            {f.t("invoice.lookAccent")}
          </FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={ids.accent}
              type="color"
              className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
              value={settings.accent ?? PLAIN_INK}
              onChange={(e) => save({ accent: e.target.value.toLowerCase() })}
            />
            <span className="tabular text-sm text-muted-foreground">
              {settings.accent ?? f.t("invoice.lookAccentNone")}
            </span>
            {settings.accent ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save({ accent: undefined })}
              >
                {f.t("invoice.lookAccentReset")}
              </Button>
            ) : null}
          </div>
          <FieldDescription>{f.t("invoice.lookAccentHint")}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={ids.footer}>
            {f.t("invoice.lookFooter")}
          </FieldLabel>
          <Input
            id={ids.footer}
            maxLength={FOOTER_MAX}
            placeholder={f.t("invoice.lookFooterPlaceholder")}
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            onBlur={() => {
              const text = footer.trim()
              setFooter(text)
              if (text !== (settings.footer ?? ""))
                save({ footer: text || undefined })
            }}
          />
          <FieldDescription>{f.t("invoice.lookFooterHint")}</FieldDescription>
        </Field>
      </FieldGroup>
    </Panel>
  )
}
