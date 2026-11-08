"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { useForm5 } from "@/components/statement/use-form5"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { saveBlob } from "@/lib/browser/download"
import { form5File } from "@/lib/domain/form5-file"
import { useBookStore } from "@/stores/book-store"

const BLOCK_MESSAGE = {
  "no-business-id": "statement.fileBlockNoBusinessId",
  "bad-taxpayer-id": "statement.fileBlockBadId",
  "interest-rate": "statement.fileBlockInterestRate",
  checks: "statement.fileBlockChecks",
} as const

/**
 * The year's Form 5 as the file Ilmoitin.fi takes (§8.8). The taxpayer's ID is
 * typed here and kept only while the dialog is open, since a personal ID is
 * not something the book needs.
 */
export function Form5FileDownload() {
  const f = useFormatters()
  const { year, sections, balance } = useForm5()
  const businessId = useBookStore((s) => s.businessId)
  const phone = useBookStore((s) => s.businessPhone)
  /* The business ID from the settings is the default until something is typed. */
  const [typed, setTyped] = React.useState<string | null>(null)
  const taxpayerId = typed ?? businessId ?? ""

  const file = React.useMemo(
    () =>
      form5File({
        year,
        sections,
        balance,
        businessId,
        taxpayerId,
        phone,
        now: new Date(),
      }),
    [year, sections, balance, businessId, taxpayerId, phone]
  )
  const reason = file.ok
    ? null
    : f.t(BLOCK_MESSAGE[file.reason], {
        codes: file.codes?.join(", ") ?? "",
      })

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-medium">{f.t("statement.fileTitle")}</h3>
      <p className="text-sm text-muted-foreground">
        {f.t("statement.fileHint")}
      </p>
      <Field>
        <FieldLabel htmlFor="form5-file-id">
          {f.t("statement.fileId")}
        </FieldLabel>
        <Input
          id="form5-file-id"
          autoComplete="off"
          value={taxpayerId}
          onChange={(e) => setTyped(e.target.value)}
        />
        <FieldDescription>{f.t("statement.fileIdHelp")}</FieldDescription>
      </Field>
      {taxpayerId && reason ? (
        <p className="text-sm text-destructive">{reason}</p>
      ) : null}
      {file.ok && file.warnings.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm">
          <p>{f.t("statement.fileWarnings")}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {file.warnings.map((w) => (
              <li key={w.source}>
                {f.t("statement.fileWarning", {
                  source: w.source.replace("Form 5 spec 2026 ", ""),
                  codes: w.codes.join(", "),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <Button
          variant="outline"
          disabled={!file.ok}
          onClick={() => {
            if (!file.ok) return
            saveBlob(
              new Blob([file.text], { type: "text/plain;charset=utf-8" }),
              file.fileName
            )
          }}
        >
          <DownloadIcon data-icon="inline-start" />
          {f.t("statement.fileDownload")}
        </Button>
      </div>
    </section>
  )
}
