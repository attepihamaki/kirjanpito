// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import {
  ENTRY_DRAFT_KEY,
  clearEntryDraft,
  readEntryDraft,
  restoreDraftForm,
  writeEntryDraft,
} from "@/lib/browser/entry-draft"

/* The half-typed new voucher (§8.5). */

beforeEach(() => window.localStorage.clear())

describe("entry draft storage", () => {
  it("gives the draft back to its own book only, until cleared", () => {
    writeEntryDraft(
      "a.zip",
      { description: "Neste" },
      new Date("2026-11-13T10:00:00Z")
    )
    expect(readEntryDraft("a.zip")).toEqual({
      book: "a.zip",
      savedAt: "2026-11-13T10:00:00.000Z",
      form: { description: "Neste" },
    })
    expect(readEntryDraft("b.zip")).toBeNull()
    clearEntryDraft()
    expect(readEntryDraft("a.zip")).toBeNull()
  })

  it("reads nothing from storage it cannot parse", () => {
    window.localStorage.setItem(ENTRY_DRAFT_KEY, "{not json")
    expect(readEntryDraft("a.zip")).toBeNull()
    window.localStorage.setItem(
      ENTRY_DRAFT_KEY,
      JSON.stringify({ book: "a.zip", savedAt: "x", form: [1] })
    )
    expect(readEntryDraft("a.zip")).toBeNull()
  })
})

describe("restoreDraftForm", () => {
  const fresh = {
    description: "",
    amount: "",
    vatRate: 25.5,
    repeat: false,
    tags: [] as string[],
    atts: [] as { id: string }[],
  }

  it("takes each field the draft holds in the same shape", () => {
    expect(
      restoreDraftForm(fresh, {
        description: "Neste",
        amount: "54,20",
        vatRate: 14,
        repeat: true,
        tags: ["auto"],
      })
    ).toEqual({
      description: "Neste",
      amount: "54,20",
      vatRate: 14,
      repeat: true,
      tags: ["auto"],
      atts: [],
    })
  })

  it("keeps the fresh value where the draft's does not fit, and skips what it is told to", () => {
    expect(
      restoreDraftForm(
        fresh,
        {
          description: 5,
          vatRate: Number.NaN,
          tags: [1],
          atts: [{ id: "a" }],
          gone: "x",
        },
        ["atts"]
      )
    ).toEqual(fresh)
  })
})
