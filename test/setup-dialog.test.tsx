// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { SetupDialog } from "@/components/settings/setup-dialog"
import { startNewBook } from "@/lib/commands/book-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

/*
 * §8.3: a new bookkeeping asks for its settings instead of starting on silent
 * defaults. Everything it asks for also lives on Asetukset, so skipping it is
 * never a dead end.
 */

const ctx: Ctx = { t: createAppT("fi"), navigate: vi.fn() }

function open() {
  render(
    <LangProvider lang="fi">
      <SetupDialog />
    </LangProvider>
  )
}

describe("the new-bookkeeping setup dialog", () => {
  beforeEach(() => {
    useLangStore.setState({ lang: "fi" })
    useBookStore.setState({
      open: false,
      hydrated: true,
      dirty: false,
      entries: [],
      dialog: { kind: "none" },
      exportLang: "fi",
      vatPeriod: "month",
      bookStart: null,
      autosave: false,
    })
  })

  it("opens when a new bookkeeping is started", async () => {
    await startNewBook(ctx)
    expect(useBookStore.getState().dialog).toEqual({ kind: "setup" })
  })

  /* The book is born in the language the user is working in (§7.1). */
  it("starts from the UI language", async () => {
    useLangStore.setState({ lang: "en" })
    await startNewBook(ctx)
    expect(useBookStore.getState().exportLang).toBe("en")
  })

  it("applies what was chosen and leaves the book clean", () => {
    useBookStore.setState({ open: true, dialog: { kind: "setup" } })
    open()

    fireEvent.click(screen.getByRole("button", { name: "English" }))
    fireEvent.click(screen.getByRole("button", { name: "Neljännesvuosi" }))
    fireEvent.click(screen.getByRole("button", { name: "Aloita" }))

    const state = useBookStore.getState()
    expect(state.exportLang).toBe("en")
    expect(state.vatPeriod).toBe("quarter")
    expect(state.dialog).toEqual({ kind: "none" })
    /* Nothing has been typed into the book yet, so nothing is unsaved. */
    expect(state.dirty).toBe(false)
  })

  it("starts the getting-started checklist", async () => {
    await startNewBook(ctx)
    expect(useBookStore.getState().onboarding).toBe(true)
    useBookStore.getState().dismissOnboarding()
    expect(useBookStore.getState().onboarding).toBe(false)
  })

  it("stores the business details, with the ID normalised", () => {
    useBookStore.setState({ open: true, dialog: { kind: "setup" } })
    open()

    fireEvent.change(screen.getByLabelText("Yrityksen nimi"), {
      target: { value: " Oma Yritys Oy " },
    })
    fireEvent.change(screen.getByLabelText("Y-tunnus"), {
      target: { value: "01120389" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Aloita" }))

    const state = useBookStore.getState()
    expect(state.businessName).toBe("Oma Yritys Oy")
    expect(state.businessId).toBe("0112038-9")
  })

  it("stays open on an invalid business ID", () => {
    useBookStore.setState({ open: true, dialog: { kind: "setup" } })
    open()

    fireEvent.change(screen.getByLabelText("Y-tunnus"), {
      target: { value: "1234567-0" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Aloita" }))

    expect(useBookStore.getState().dialog).toEqual({ kind: "setup" })
    expect(screen.getByLabelText("Y-tunnus")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("keeps the defaults when it is skipped", () => {
    useBookStore.setState({ open: true, dialog: { kind: "setup" } })
    open()

    fireEvent.click(screen.getByRole("button", { name: "English" }))
    fireEvent.click(screen.getByRole("button", { name: "Ohita" }))

    const state = useBookStore.getState()
    expect(state.exportLang).toBe("fi")
    expect(state.dialog).toEqual({ kind: "none" })
    expect(state.dirty).toBe(false)
  })
})
