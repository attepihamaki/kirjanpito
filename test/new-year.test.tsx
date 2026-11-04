// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { NewYearDialog } from "@/components/new-year/new-year-dialog"
import { EMPTY_YEAR_END } from "@/lib/domain/form5-balance"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

const entry = (over: Partial<Entry>): Entry => ({
  id: "a",
  date: "2026-06-01",
  description: "Myynti",
  type: "income",
  catId: "301",
  amount: 500_000,
  vatRate: 0,
  amountMode: "net",
  ...over,
})

function renderDialog() {
  return render(
    <LangProvider lang="fi">
      <NewYearDialog />
    </LangProvider>
  )
}

describe("the new year dialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2027, 0, 5))
    useBookStore.setState({
      year: 2027,
      dirty: false,
      entries: [entry({})],
      form5Filed: {},
      yearEnd: { "2026": { ...EMPTY_YEAR_END, goods: 120_000, cash: 3_500 } },
      recurring: [
        {
          id: "r1",
          description: "Vuokra",
          type: "expense",
          catId: "343",
          amount: 45_000,
          vatRate: 25.5,
          amountMode: "gross",
          day: 20,
          from: "2026-02",
        },
      ],
      dialog: { kind: "new-year", year: 2027 },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    useBookStore.setState({ dialog: { kind: "none" } })
  })

  it("shows the previous year's result first", () => {
    renderDialog()
    expect(screen.getByText("Vuoden 2026 tulos")).toBeTruthy()
    expect(screen.getAllByText(/5\s000,00\s€/).length).toBeGreaterThan(0)
  })

  it("copies last year's figures into the new year and marks the book dirty", () => {
    renderDialog()
    fireEvent.click(screen.getByRole("button", { name: /Luvut/ }))
    fireEvent.click(
      screen.getByRole("button", { name: "Kopioi vuoden 2026 luvut" })
    )
    const copied = useBookStore.getState().yearEnd["2027"]
    expect(copied?.goods).toBe(120_000)
    expect(copied?.cash).toBe(3_500)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  it("refuses to copy into a locked year", () => {
    useBookStore.setState({ form5Filed: { "2027": "2028-03-01" } })
    renderDialog()
    fireEvent.click(screen.getByRole("button", { name: /Luvut/ }))
    const button = screen.getByRole("button", {
      name: "Kopioi vuoden 2026 luvut",
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("edits a template's amount in the last step", () => {
    renderDialog()
    fireEvent.click(screen.getByRole("button", { name: /Toistuvat/ }))
    const input = screen.getByRole("textbox", { name: /Summa: Vuokra/ })
    fireEvent.change(input, { target: { value: "480" } })
    fireEvent.blur(input)
    expect(useBookStore.getState().recurring[0].amount).toBe(48_000)
  })
})
