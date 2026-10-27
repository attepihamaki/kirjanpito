import type { ThemeChoice } from "@/lib/domain/settings-file"

/**
 * The theme next-themes has stored, for writing into `settings.json` (§7.6).
 * next-themes owns the `theme` key (§12); this only reads it.
 */
export function readStoredTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem("theme")
    return raw === "light" || raw === "dark" ? raw : "system"
  } catch {
    return "system"
  }
}
