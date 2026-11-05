"use client"

import * as React from "react"

import {
  SettingCard,
  SettingHint,
  SettingValue,
} from "@/components/common/setting-card"
import { useFormatters } from "@/components/lang-provider"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { parseBusinessId } from "@/lib/domain/business-id"
import { useBookStore } from "@/stores/book-store"

/**
 * The business's own name and y-tunnus (§8.10). Both are stored when their
 * field loses focus, and the ID only if valid, so the store and the file never
 * hold a half-typed number. Emptying a field removes the value.
 */
export function BusinessSetting() {
  const f = useFormatters()
  const businessId = useBookStore((s) => s.businessId)
  const setBusinessId = useBookStore((s) => s.setBusinessId)
  const businessName = useBookStore((s) => s.businessName)
  const setBusinessName = useBookStore((s) => s.setBusinessName)

  const [idDraft, setIdDraft] = React.useState(businessId ?? "")
  const [nameDraft, setNameDraft] = React.useState(businessName ?? "")
  const [idInvalid, setIdInvalid] = React.useState(false)

  const nameId = React.useId()
  const idId = React.useId()

  function commitId() {
    const parsed = parseBusinessId(idDraft)
    if (idDraft.trim() && !parsed) {
      setIdInvalid(true)
      return
    }
    setIdDraft(parsed ?? "")
    if (parsed !== businessId) setBusinessId(parsed)
  }

  function commitName() {
    const trimmed = nameDraft.trim()
    const next = trimmed || null
    setNameDraft(trimmed)
    if (next !== businessName) setBusinessName(next)
  }

  return (
    <SettingCard
      label={f.t("settings.business")}
      editor={
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor={nameId}>
              {f.t("settings.businessName")}
            </FieldLabel>
            <Input
              id={nameId}
              autoComplete="organization"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={idId}>{f.t("common.businessId")}</FieldLabel>
            <Input
              id={idId}
              aria-invalid={idInvalid || undefined}
              className="tabular w-40"
              placeholder="1234567-1"
              autoComplete="off"
              value={idDraft}
              onChange={(e) => {
                setIdDraft(e.target.value)
                setIdInvalid(false)
              }}
              onBlur={commitId}
            />
            <FieldError>
              {idInvalid ? f.t("settings.businessIdInvalid") : undefined}
            </FieldError>
          </Field>
          <SettingHint>{f.t("settings.businessHint")}</SettingHint>
        </div>
      }
    >
      <SettingValue
        muted={!businessName}
        value={businessName ?? f.t("settings.notSet")}
        note={
          businessId
            ? f.t("settings.businessIdLine", { id: businessId })
            : f.t("common.businessId") + ": " + f.t("settings.notSet")
        }
      />
    </SettingCard>
  )
}
