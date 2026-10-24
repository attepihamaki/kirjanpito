import type { Lang } from "@/lib/domain/types"
import type { SkipCode } from "@/lib/domain/csv"
import { APP_DICT } from "@/lib/i18n/dict/app"
import { LANDING_DICT } from "@/lib/i18n/dict/landing"
import { createT, translate, type Params, type T } from "@/lib/i18n/t"

export const MESSAGES = { ...LANDING_DICT, ...APP_DICT }

export type MessageKey = keyof typeof MESSAGES

export type AppT = T<typeof MESSAGES>

export function t(key: MessageKey, lang: Lang, params?: Params): string {
  return translate(MESSAGES, key, lang, params)
}

export function createAppT(lang: Lang): AppT {
  return createT(MESSAGES, lang)
}

/**
 * Message keys for the machine-readable codes the domain layer emits. These
 * maps are what keeps `lib/domain` free of user-facing text while still
 * guaranteeing every code can be shown to the user — a test walks them.
 */
export const SKIP_CODE_KEYS: Readonly<Record<SkipCode, MessageKey>> = {
  "bad-date": "l_date",
  "bad-type": "l_type",
  "bad-amount": "l_sum",
}

export const WARNING_CODE_KEYS = {
  "unknown-account": "unknownRow",
  "new-category": "newCatRow",
} as const satisfies Readonly<Record<string, MessageKey>>

export const ANOMALY_CODE_KEYS = {
  "vat-on-exempt-sale": "vatOnExemptSale",
} as const satisfies Readonly<Record<string, MessageKey>>
