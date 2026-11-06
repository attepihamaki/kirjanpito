"use client"

import { ExternalLinkIcon } from "lucide-react"

import { InfoPopover } from "@/components/common/info-popover"
import { useFormatters } from "@/components/lang-provider"
import type { HelpTopic } from "@/lib/domain/field-help"

/**
 * An info icon that explains a figure and links to the vero.fi page the
 * explanation comes from. Renders nothing for a figure with no topic, so a
 * caller can pass a lookup's result straight in. Hidden on paper.
 */
export function HelpHint({ topic }: { topic: HelpTopic | null | undefined }) {
  const f = useFormatters()
  if (!topic) return null

  return (
    <span className="print-hidden inline-flex shrink-0">
      <InfoPopover label={f.t("common.helpLabel")}>
        <div className="flex flex-col gap-2">
          <p>{topic.text[f.lang]}</p>
          {topic.source ? (
            <a
              href={topic.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary hover:underline"
            >
              <span>
                {f.t("common.helpSource")}: {topic.source.title[f.lang]}
              </span>
              <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
            </a>
          ) : null}
        </div>
      </InfoPopover>
    </span>
  )
}
