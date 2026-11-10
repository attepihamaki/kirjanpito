// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LandingPage } from "@/components/landing/landing-page"
import { openFile } from "@/lib/commands/io-commands"
import { useBookStore } from "@/stores/book-store"
import { useLangStore } from "@/stores/lang-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}))

vi.mock("@/lib/commands/io-commands", () => ({
  openFile: vi.fn(async () => {}),
  pickAndOpenFile: vi.fn(async () => true),
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

describe("the FAQ", () => {
  it("says who keeps the books when the business closes (KPL 2:10)", async () => {
    const user = userEvent.setup()
    useBookStore.setState({ hydrated: true, open: false })
    useLangStore.setState({ hydrated: true, lang: "fi" })
    render(<LandingPage />)

    await user.click(
      screen.getByRole("button", {
        name: "Mitä kirjanpidolle tapahtuu, jos lopetan toiminnan?",
      })
    )
    expect(await screen.findByText(/Y6-lomake YTJ:ssä/)).toBeInTheDocument()
  })
})

describe("the document title (§9)", () => {
  it("follows the language, and comes back", () => {
    document.title = "Kirjanpito"
    useBookStore.setState({ hydrated: true })
    useLangStore.setState({ hydrated: true, lang: "en" })
    render(<LandingPage />)
    expect(document.title).toBe(
      "Bookkeeping – single-entry bookkeeping for sole traders"
    )
    act(() => useLangStore.setState({ lang: "fi" }))
  })

  it("leaves the page's own Finnish title alone", () => {
    document.title = "Sivun oma otsikko"
    useLangStore.setState({ hydrated: true, lang: "fi" })
    render(<LandingPage />)
    expect(document.title).toBe("Sivun oma otsikko")
  })
})

describe("dropping a file on the landing page (§8.3)", () => {
  const drop = (file: File) =>
    fireEvent.drop(window, {
      dataTransfer: { types: ["Files"], files: [file], items: [] },
    })

  beforeEach(() => {
    vi.mocked(openFile).mockClear()
    useBookStore.setState({ hydrated: true, open: false })
    useLangStore.setState({ hydrated: true, lang: "fi" })
  })

  it("opens a CSV or ZIP", async () => {
    render(<LandingPage />)
    const file = new File(["x"], "kirjanpito.zip")
    drop(file)

    await waitFor(() => expect(openFile).toHaveBeenCalledOnce())
    expect(vi.mocked(openFile).mock.calls[0][1]).toBe(file)
  })

  it("shows where to drop while a file is dragged over", () => {
    render(<LandingPage />)
    fireEvent.dragEnter(window, { dataTransfer: { types: ["Files"] } })

    expect(
      screen.getByText("Avaa CSV- tai ZIP-tiedosto pudottamalla se tähän")
    ).toBeVisible()
  })

  it("does not try to open anything else", () => {
    render(<LandingPage />)
    drop(new File(["x"], "kuitti.jpg"))

    expect(openFile).not.toHaveBeenCalled()
  })
})
