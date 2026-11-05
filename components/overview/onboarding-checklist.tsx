"use client"

import { CheckIcon } from "lucide-react"
import * as React from "react"

import { ButtonLink } from "@/components/common/button-link"
import { Surface } from "@/components/common/surface"
import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { useSaveBook } from "@/hooks/use-save-book"
import {
  onboardingComplete,
  onboardingSteps,
  type OnboardingStepId,
} from "@/lib/domain/onboarding"
import type { MessageKey } from "@/lib/i18n/messages"
import { APP_ROUTES } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const TEXT: Record<
  OnboardingStepId,
  { title: MessageKey; example: MessageKey }
> = {
  business: {
    title: "overview.onboardBusinessTitle",
    example: "overview.onboardBusinessExample",
  },
  sale: {
    title: "overview.onboardSaleTitle",
    example: "overview.onboardSaleExample",
  },
  purchase: {
    title: "overview.onboardPurchaseTitle",
    example: "overview.onboardPurchaseExample",
  },
  receipt: {
    title: "overview.onboardReceiptTitle",
    example: "overview.onboardReceiptExample",
  },
  save: {
    title: "overview.onboardSaveTitle",
    example: "overview.onboardSaveExample",
  },
}

/**
 * The getting-started checklist (§8.15), shown on the overview of a book that
 * was started from "Aloita uusi kirjanpito" until the user hides it.
 *
 * Each step has an example of what to type and a button that opens the right
 * dialog with the type, category and VAT rate filled in. The description and
 * the amount stay empty: the examples are text, so a click can never book an
 * invoice that did not happen.
 */
export function OnboardingChecklist() {
  const f = useFormatters()
  const entries = useBookStore((s) => s.entries)
  const cats = useBookStore((s) => s.cats)
  const businessName = useBookStore((s) => s.businessName)
  const businessId = useBookStore((s) => s.businessId)
  const fileName = useBookStore((s) => s.fileName)
  const dirty = useBookStore((s) => s.dirty)
  const openDialog = useBookStore((s) => s.openDialog)
  const dismiss = useBookStore((s) => s.dismissOnboarding)
  const save = useSaveBook()

  const steps = onboardingSteps({
    entries,
    cats,
    businessName,
    businessId,
    fileName,
    dirty,
  })
  const doneCount = steps.filter((s) => s.done).length
  const complete = onboardingComplete(steps)

  function record(type: "income" | "expense", catId: string) {
    const cat = cats.find((c) => c.id === catId)
    openDialog({
      kind: "entry",
      mode: "new",
      prefill: { type, catId, vatRate: cat?.vatRate },
    })
  }

  function action(id: OnboardingStepId): React.ReactNode {
    const label = (key: MessageKey) => f.t(key)
    switch (id) {
      case "business":
        return (
          <ButtonLink variant="outline" size="sm" href={APP_ROUTES.settings}>
            {label("overview.onboardSettings")}
          </ButtonLink>
        )
      case "sale":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => record("income", "300-domestic")}
          >
            {label("overview.onboardRecord")}
          </Button>
        )
      case "purchase":
      case "receipt":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => record("expense", "333")}
          >
            {label("overview.onboardRecord")}
          </Button>
        )
      case "save":
        return (
          <Button variant="outline" size="sm" onClick={save}>
            {label("overview.onboardSave")}
          </Button>
        )
    }
  }

  return (
    <Surface as="section" className="mb-4 p-5" aria-labelledby="onboarding-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="onboarding-h"
            className="font-heading text-base font-semibold tracking-tight"
          >
            {f.t("overview.onboardTitle")}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {complete
              ? f.t("overview.onboardAllDone")
              : f.t("overview.onboardIntro")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular text-sm text-muted-foreground">
            {f.t("overview.onboardProgress", {
              done: doneCount,
              total: steps.length,
            })}
          </span>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            {f.t("overview.onboardDismiss")}
          </Button>
        </div>
      </div>

      <ol className="mt-4 flex flex-col divide-y">
        {steps.map((step) => (
          <li
            key={step.id}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1.75rem_minmax(0,1fr)_auto]"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 place-items-center rounded-full border",
                step.done
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "text-transparent"
              )}
            >
              <CheckIcon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.done && "text-muted-foreground line-through"
                )}
              >
                {f.t(TEXT[step.id].title)}
                {step.done ? (
                  <span className="sr-only">
                    {" "}
                    ({f.t("overview.onboardStepDone")})
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {f.t(TEXT[step.id].example)}
              </p>
            </div>
            {!step.done ? (
              <div className="col-start-2 sm:col-start-3">
                {action(step.id)}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </Surface>
  )
}
