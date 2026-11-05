import { describe, expect, it } from "vitest"

import { defaultCategories } from "@/lib/domain/accounts"
import {
  onboardingComplete,
  onboardingSteps,
  type OnboardingBook,
} from "@/lib/domain/onboarding"
import type { Entry } from "@/lib/domain/types"

function entry(over: Partial<Entry>): Entry {
  return {
    id: "e",
    date: "2026-11-05",
    description: "x",
    type: "income",
    catId: "300-domestic",
    amount: 1000,
    vatRate: 25.5,
    amountMode: "gross",
    ...over,
  }
}

const empty: OnboardingBook = {
  entries: [],
  cats: defaultCategories(),
  businessName: null,
  businessId: null,
  fileName: null,
  dirty: false,
}

const done = (book: OnboardingBook) =>
  Object.fromEntries(onboardingSteps(book).map((s) => [s.id, s.done]))

describe("onboardingSteps", () => {
  it("starts with nothing done", () => {
    expect(onboardingSteps(empty).every((s) => !s.done)).toBe(true)
    expect(onboardingComplete(onboardingSteps(empty))).toBe(false)
  })

  it("ticks the business step for a name or an ID alone", () => {
    expect(done({ ...empty, businessName: "Oma Yritys Oy" }).business).toBe(
      true
    )
    expect(done({ ...empty, businessId: "0112038-9" }).business).toBe(true)
  })

  it("ticks sale and purchase by side", () => {
    const sale = done({ ...empty, entries: [entry({})] })
    expect(sale.sale).toBe(true)
    expect(sale.purchase).toBe(false)
    const cost = done({
      ...empty,
      entries: [entry({ type: "expense", catId: "333" })],
    })
    expect(cost.purchase).toBe(true)
    expect(cost.sale).toBe(false)
  })

  it("does not count money that only moves", () => {
    const book = {
      ...empty,
      entries: [
        entry({ catId: "owner-investment", vatRate: 0 }),
        entry({ type: "expense", catId: "owner-withdrawal", vatRate: 0 }),
      ],
    }
    expect(done(book).sale).toBe(false)
    expect(done(book).purchase).toBe(false)
  })

  it("needs a receipt that is actually available", () => {
    const att = { id: "a", name: "a.pdf", type: "application/pdf", size: 1 }
    expect(done({ ...empty, entries: [entry({ atts: [att] })] }).receipt).toBe(
      true
    )
    const lost = { ...att, id: null, missing: true as const }
    expect(done({ ...empty, entries: [entry({ atts: [lost] })] }).receipt).toBe(
      false
    )
  })

  it("is saved only with a file name and no unsaved changes", () => {
    expect(done({ ...empty, fileName: "a.zip", dirty: true }).save).toBe(false)
    expect(done({ ...empty, fileName: null }).save).toBe(false)
    expect(done({ ...empty, fileName: "a.zip" }).save).toBe(true)
  })
})
