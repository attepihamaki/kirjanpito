import type { AppT } from "@/lib/i18n/messages"

/**
 * What a command needs beyond the store: translated strings, and a way to
 * navigate. Keeping these explicit is what lets commands live outside React.
 */
export interface Ctx {
  t: AppT
  navigate: (href: string) => void
}
