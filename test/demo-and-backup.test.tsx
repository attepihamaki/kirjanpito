// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BackupBanner } from "@/components/app/backup-banner"
import { DemoBanner } from "@/components/app/demo-banner"
import { VatReminderBanner } from "@/components/app/vat-reminder-banner"
import { LangProvider } from "@/components/lang-provider"
import { useDirtySince } from "@/hooks/use-dirty-since"
import { startDemoBook } from "@/lib/commands/book-commands"
import { addDays, todayIso } from "@/lib/domain/dates"
import { createAppT } from "@/lib/i18n/messages"
import { useBookStore } from "@/stores/book-store"

/* The demo book (§8.32) and the backup reminder (§8.33). */

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))

const DAY = 24 * 60 * 60 * 1000
const ctx = { t: createAppT("fi"), navigate: vi.fn() }

function Probe() {
  useDirtySince()
  return (
    <>
      <DemoBanner />
      <BackupBanner />
      <VatReminderBanner />
    </>
  )
}

function mount() {
  return render(
    <LangProvider lang="fi">
      <Probe />
    </LangProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  useBookStore.setState(useBookStore.getInitialState(), true)
})

describe("the demo book", () => {
  it("opens with invented entries, no file and autosave off", async () => {
    useBookStore.setState({ autosave: true })
    await startDemoBook(ctx)
    const s = useBookStore.getState()
    expect(s.demo).toBe(true)
    expect(s.open).toBe(true)
    expect(s.entries.length).toBeGreaterThan(0)
    expect(s.customers.length).toBeGreaterThan(0)
    expect(s.businessName).toBe("Esimerkki Tmi")
    expect(s.fileName).toBeNull()
    expect(s.autosave).toBe(false)
    expect(s.dirty).toBe(false)
    expect(ctx.navigate).toHaveBeenCalledWith("/app/overview")
    // Every return already due is filed on its due date.
    for (const [key, on] of Object.entries(s.vatFiled)) {
      expect(on < todayIso(), key).toBe(true)
    }
    expect(Object.keys(s.vatFiled).length).toBeGreaterThan(0)
  })

  it("says it is the demo, and no VAT return is due on it", async () => {
    await startDemoBook(ctx)
    mount()
    expect(screen.getByText("Esimerkkikirjanpito")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Aloita oma kirjanpito" })
    ).toBeTruthy()
    expect(screen.queryByText(/ALV-ilmoitus/)).toBeNull()
  })

  it("is over once another bookkeeping takes over", async () => {
    await startDemoBook(ctx)
    useBookStore.getState().newBook(2026, "fi")
    expect(useBookStore.getState().demo).toBe(false)
  })
})

describe("the backup reminder", () => {
  function openBook(over: object) {
    useBookStore.getState().newBook(2026, "fi")
    useBookStore.setState(over)
  }

  it("starts counting when the book goes unsaved and stops on save", () => {
    openBook({ dirty: false })
    mount()
    expect(useBookStore.getState().dirtySince).toBeNull()
    act(() => useBookStore.setState({ dirty: true }))
    expect(useBookStore.getState().dirtySince).toBeTypeOf("number")
    act(() => useBookStore.setState({ dirty: false }))
    expect(useBookStore.getState().dirtySince).toBeNull()
  })

  it("asks to save work two days unsaved with no file at all", () => {
    openBook({ dirty: true, dirtySince: Date.now() - 3 * DAY })
    mount()
    expect(
      screen.getByText(/ollut vain tässä selaimessa 3 päivää/)
    ).toBeTruthy()
  })

  it("waits a week when there is a file on disk", () => {
    openBook({
      dirty: true,
      dirtySince: Date.now() - 3 * DAY,
      fileName: "kirjanpito.zip",
    })
    const { unmount } = mount()
    expect(screen.queryByText(/ei ole tallennettu/)).toBeNull()
    unmount()
    useBookStore.setState({ dirtySince: Date.now() - 8 * DAY })
    mount()
    expect(screen.getByText(/tiedostoon 8 päivään/)).toBeTruthy()
  })

  it("hides until tomorrow", () => {
    openBook({ dirty: true, dirtySince: Date.now() - 3 * DAY })
    mount()
    fireEvent.click(screen.getByRole("button", { name: "Muistuta huomenna" }))
    expect(useBookStore.getState().backupSnoozed).toBe(addDays(todayIso(), 1))
    expect(screen.queryByText(/vain tässä selaimessa/)).toBeNull()
  })

  it("never shows on the demo book", async () => {
    await startDemoBook(ctx)
    useBookStore.setState({ dirty: true, dirtySince: Date.now() - 30 * DAY })
    mount()
    expect(screen.queryByText(/vain tässä selaimessa/)).toBeNull()
  })
})
