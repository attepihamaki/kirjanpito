// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LandingPage } from "@/components/landing/landing-page"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}))

describe("landing page", () => {
  beforeEach(() => {
    useBookStore.setState({ hydrated: false, open: false })
    useLangStore.setState({ hydrated: false, lang: "fi" })
  })

  /**
   * The landing page is the one indexed document and has no English URL: it
   * is prerendered in Finnish — the store's default, so the first client
   * render matches — and follows the stored preference after rehydration.
   */
  it("renders Finnish before rehydration and the stored language after", () => {
    const { rerender } = render(<LandingPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon."
    )

    useLangStore.setState({ hydrated: true, lang: "en" })
    rerender(<LandingPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Sole trader bookkeeping that fits in a single file."
    )
  })

  it("switches language in place rather than linking to another URL", async () => {
    const user = userEvent.setup()
    useBookStore.setState({ hydrated: true })
    render(<LandingPage />)

    await user.click(screen.getByRole("button", { name: "Kieli" }))
    const en = await screen.findByRole("menuitemradio", { name: "English" })
    expect(en).not.toHaveAttribute("href")
    await user.click(en)

    expect(useLangStore.getState().lang).toBe("en")
  })
})
