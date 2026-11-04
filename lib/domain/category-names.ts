import {
  DEFAULT_EN_NAMES,
  FORMER_NAMES,
  LINE_BY_KEY,
} from "@/lib/domain/accounts"
import type { Category } from "@/lib/domain/types"

/**
 * Whether a name is already taken on the account `line` sits on. The CSV finds
 * a row's category by account, side and name (§7.1), so two categories sharing
 * these would merge when the file is next opened.
 */
export function categoryNameTaken(
  cats: readonly Category[],
  name: string,
  line: string,
  exceptId?: string
): boolean {
  const own = LINE_BY_KEY.get(line)
  const needle = name.trim().toLowerCase()
  return cats.some((c) => {
    if (c.id === exceptId) return false
    const other = LINE_BY_KEY.get(c.line)
    if (other?.account !== own?.account || other?.side !== own?.side) {
      return false
    }
    const names = c.custom
      ? [c.name]
      : [c.name, DEFAULT_EN_NAMES[c.id], ...(FORMER_NAMES[c.id] ?? [])]
    return names.some((n) => n?.toLowerCase() === needle)
  })
}
