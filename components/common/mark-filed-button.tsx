"use client"

import { CheckIcon } from "lucide-react"

import { InfoPopover } from "@/components/common/info-popover"
import { useT } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"

/**
 * "Merkitse ilmoitetuksi" for a VAT period (§8.7) or a Form 5 year (§8.8). With
 * `ongoing` it marks nothing and says why. It is `aria-disabled` rather than
 * `disabled`, because a disabled button takes no hover, tap or focus, and the
 * reason could then never be read.
 */
export function MarkFiledButton({
  ongoing,
  onMark,
}: {
  /** Why the period cannot be marked yet. */
  ongoing?: string
  onMark: () => void
}) {
  const t = useT()
  const content = (
    <>
      <CheckIcon data-icon="inline-start" />
      {t("vat.markFiled")}
    </>
  )

  if (ongoing) {
    return (
      <InfoPopover
        label={t("vat.markFiled")}
        trigger={
          <Button
            variant="outline"
            size="sm"
            aria-disabled
            className="cursor-not-allowed opacity-50"
          >
            {content}
          </Button>
        }
      >
        {ongoing}
      </InfoPopover>
    )
  }
  return (
    <Button variant="outline" size="sm" onClick={onMark}>
      {content}
    </Button>
  )
}
