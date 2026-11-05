import { lineOf, offStatement } from "@/lib/domain/accounts"
import { indexCategories, type Category, type Entry } from "@/lib/domain/types"

/** The steps of the getting-started checklist, in the order they are shown. */
export const ONBOARDING_STEPS = [
  "business",
  "sale",
  "purchase",
  "receipt",
  "save",
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]

export interface OnboardingStep {
  id: OnboardingStepId
  done: boolean
}

/** What the checklist reads from the book. */
export interface OnboardingBook {
  entries: readonly Entry[]
  cats: readonly Category[]
  businessName: string | null
  businessId: string | null
  fileName: string | null
  dirty: boolean
}

/**
 * Which steps are done, read from the book rather than ticked by hand, so a
 * step is done the moment its work is, however the user got there.
 *
 * - `business`: a name or a business ID is set.
 * - `sale` and `purchase`: an entry that counts as income or as a cost. The
 *   owner's transfers, loans, VAT payments and fixed assets sit off the
 *   statement (§5), so they do not tick these.
 * - `receipt`: some entry has a file that is actually available.
 * - `save`: the book has a file name and no unsaved changes.
 */
export function onboardingSteps(book: OnboardingBook): OnboardingStep[] {
  const cats = indexCategories(book.cats)
  const counts = (e: Entry) => {
    const cat = cats.get(e.catId)
    return !!cat && !offStatement(lineOf(cat))
  }
  const done: Record<OnboardingStepId, boolean> = {
    business: !!(book.businessName || book.businessId),
    sale: book.entries.some((e) => e.type === "income" && counts(e)),
    purchase: book.entries.some((e) => e.type === "expense" && counts(e)),
    receipt: book.entries.some((e) =>
      e.atts?.some((a) => a.id !== null && !a.missing)
    ),
    save: book.fileName !== null && !book.dirty,
  }
  return ONBOARDING_STEPS.map((id) => ({ id, done: done[id] }))
}

/** Every step is done. */
export function onboardingComplete(steps: readonly OnboardingStep[]): boolean {
  return steps.every((s) => s.done)
}
