// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NotFoundPage } from "@/components/not-found-page"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/kirjanpito",
}))

describe("404 page", () => {
  beforeEach(() => {
    useBookStore.setState({ hydrated: false, open: false, lang: "fi" })
  })

  it("renders in the stored language", () => {
    const { rerender } = render(<NotFoundPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tätä sivua ei löytynyt."
    )

    useBookStore.setState({ lang: "en" })
    rerender(<NotFoundPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This page could not be found."
    )
  })

  it("sends the visitor home in their own language", () => {
    const { rerender } = render(<NotFoundPage />)
    expect(
      screen.getByRole("link", { name: /Takaisin etusivulle/ })
    ).toHaveAttribute("href", "/")

    useBookStore.setState({ lang: "en" })
    rerender(<NotFoundPage />)
    expect(
      screen.getByRole("link", { name: /Back to the home page/ })
    ).toHaveAttribute("href", "/en")
  })

  it("offers the ledger only once a bookkeeping is known to be open", () => {
    const { rerender } = render(<NotFoundPage />)
    expect(screen.queryByRole("link", { name: "Jatka kirjanpitoa" })).toBeNull()

    useBookStore.setState({ hydrated: true, open: true })
    rerender(<NotFoundPage />)
    expect(
      screen.getByRole("link", { name: "Jatka kirjanpitoa" })
    ).toHaveAttribute("href", "/app/ledger")
  })
})
