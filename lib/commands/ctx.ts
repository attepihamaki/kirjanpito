import type { ThemeChoice } from "@/lib/domain/settings-file"
import type { AppT } from "@/lib/i18n/messages"

/**
 * What a command needs beyond the store: translated strings, and a way to
 * navigate. Keeping these explicit is what lets commands live outside React.
 */
export interface Ctx {
  t: AppT
  navigate: (href: string) => void
  /**
   * Switch the theme, which next-themes owns and only React can reach.
   * Optional, so a command run outside the app simply skips it.
   */
  setTheme?: (theme: ThemeChoice) => void
}
