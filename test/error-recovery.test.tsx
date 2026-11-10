// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ErrorRecovery } from "@/components/app/error-recovery"
import { LangProvider } from "@/components/lang-provider"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/overview",
}))

beforeEach(() => {
  useBookStore.setState(useBookStore.getInitialState())
})

function mount(reset = vi.fn()) {
  render(
    <LangProvider lang="fi">
      <ErrorRecovery error={new Error("kaboom")} reset={reset} />
    </LangProvider>
  )
  return reset
}

describe("ErrorRecovery", () => {
  it("says the work is safe, warns of unsaved changes and focuses the heading", () => {
    useBookStore.setState({ open: true, dirty: true })
    vi.spyOn(console, "error").mockImplementation(() => {})
    mount()
    const heading = screen.getByRole("heading", { name: "Jokin meni vikaan" })
    expect(heading).toHaveFocus()
    expect(
      screen.getByText(/Kirjanpitosi on silti tallessa/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/joita ei ole vielä tallennettu/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Lataa kopio kirjanpidosta" })
    ).toBeInTheDocument()
    expect(screen.getByText("kaboom")).toBeInTheDocument()
  })

  it("names the file every change is in, and tries again on request", async () => {
    useBookStore.setState({ open: true, dirty: false, fileName: "kirjat.zip" })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const reset = mount()
    expect(
      screen.getByText("Kaikki muutokset on tallennettu tiedostoon kirjat.zip.")
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Yritä uudelleen" })
    )
    expect(reset).toHaveBeenCalledOnce()
  })

  it("offers no download with no bookkeeping open", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mount()
    expect(screen.getByText(/mitään ei ole vaarassa/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Lataa kopio kirjanpidosta" })
    ).toBeNull()
  })
})
