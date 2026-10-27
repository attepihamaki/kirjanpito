// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { OverviewView } from "@/components/overview/overview-view"
import { defaultCategories } from "@/lib/domain/accounts"
import { createIdFactory } from "@/lib/domain/id"
import { sampleEntries } from "@/lib/domain/test-helpers/sample-book"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/overview",
}))

/** Testing Library normalises whitespace in the element text, not in the matcher. */
const flat = (s: string | null) => (s ?? "").replace(/[\u00a0\u202f]/g, " ")

/* January to August marked as filed, as on the morning of 31 October 2026. */
const FILED = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [
    `2026-0${i + 1}`,
    `2026-${String(i + 3).padStart(2, "0")}-10`,
  ])
)

function load(
  overrides: Partial<ReturnType<typeof useBookStore.getState>> = {}
) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: sampleEntries(createIdFactory("o")),
    cats: defaultCategories(),
    year: 2026,
    dirty: false,
    vatPeriod: "month",
    vatFiled: FILED,
    ...overrides,
  })
}

function mount() {
  return render(
    <LangProvider lang="fi">
      <OverviewView />
    </LangProvider>
  )
}

/** The widget whose heading or first line reads `text`. */
function widget(text: RegExp) {
  const el = screen.getAllByText(text)[0].closest("section")
  if (!el) throw new Error(`no widget for ${text}`)
  return el
}

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 9, 31, 9, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("overview", () => {
  it("shows the §10 result for the year", () => {
    load()
    mount()
    const result = widget(/358 Elinkeinotoiminnan tulos/)
    expect(flat(result.textContent)).toContain("10 642,53 €")
  })

  it("counts down to the next return that is not yet filed", () => {
    load()
    mount()
    const vat = widget(/Seuraava ALV-ilmoitus · Syyskuu 2026/)
    const text = flat(vat.textContent)
    // September: no sales, 24,18 € of purchase VAT to get back.
    expect(text).toContain("24,18 €")
    expect(text).toContain("12 päivää")
    expect(text).toContain("12.11.2026")
    // October after it, due on the Monday after the 12th.
    expect(text).toContain("362,18 €")
    expect(text).toContain("14.12.2026")
  })

  it("marks a return as filed, moves on, and lets it be undone", async () => {
    load()
    mount()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(
      screen.getByRole("button", { name: "Merkitse ilmoitetuksi" })
    )

    const state = useBookStore.getState()
    expect(state.vatFiled["2026-09"]).toBe("2026-10-31")
    expect(state.dirty).toBe(true)
    expect(
      screen.getByText(/Seuraava ALV-ilmoitus · Lokakuu 2026/)
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Peru" }))
    expect(useBookStore.getState().vatFiled["2026-09"]).toBeUndefined()
  })

  it("lists an overdue return and the entries without a receipt", () => {
    load({ vatFiled: {} })
    mount()
    const checks = widget(/Tarkistettavaa/)
    const text = flat(checks.textContent)
    expect(text).toContain("Tammikuu 2026: ALV-ilmoitus myöhässä")
    expect(text).toContain("16 kirjausta ilman tositetta")
    expect(text).toContain("Ei kirjauksia: heinä, elo")
  })

  it("hides a widget in edit mode and keeps it in the layout", async () => {
    load()
    mount()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole("button", { name: "Muokkaa näkymää" }))

    const toolbar = screen.getByRole("toolbar", { name: "Myynti" })
    await user.click(within(toolbar).getByRole("button", { name: "Piilota" }))

    const state = useBookStore.getState()
    expect(state.overviewLayout.find((w) => w.id === "sales")?.hidden).toBe(
      true
    )
    expect(state.dirty).toBe(true)
    expect(
      screen.getByRole("button", { name: "Näytä Myynti" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Palauta oletus" }))
    expect(useBookStore.getState().overviewLayout.every((w) => !w.hidden)).toBe(
      true
    )
  })

  it("moves a widget with the arrow buttons", async () => {
    load()
    mount()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole("button", { name: "Muokkaa näkymää" }))

    const toolbar = screen.getByRole("toolbar", {
      name: "Seuraava ALV-ilmoitus",
    })
    await user.click(
      within(toolbar).getByRole("button", { name: "Siirrä aiemmaksi" })
    )

    const ids = useBookStore.getState().overviewLayout.map((w) => w.id)
    expect(ids.slice(0, 2)).toEqual(["vat", "result"])
  })

  it("greets an empty bookkeeping", () => {
    load({ entries: [] })
    mount()
    expect(screen.getByText("Ei vielä kirjauksia")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Muokkaa näkymää" })).toBeNull()
  })
})
