// @vitest-environment jsdom
import * as React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/app/app-shell"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AppTopbar } from "@/components/app/app-topbar"
import { LangProvider } from "@/components/lang-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/vat",
}))

function mount(ui: React.ReactElement) {
  const setSidebarOpen = useBookStore.getState().setSidebarOpen
  return render(
    <LangProvider lang="fi">
      <SidebarProvider
        open={useBookStore.getState().sidebarOpen}
        onOpenChange={setSidebarOpen}
      >
        {ui}
      </SidebarProvider>
    </LangProvider>
  )
}

const noop = () => {}

describe("app chrome", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: true,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      year: 2026,
      dirty: true,
      fileName: "kirjanpito_2026-10-24.zip",
      sidebarOpen: true,
    })
  })

  /**
   * §8.2: only what is the same on every view lives in the top bar. The year
   * and the file are in the sidebar, next to each other.
   */
  it("keeps the top bar to the sidebar toggle and the two preferences", () => {
    mount(<AppTopbar />)

    const bar = screen.getByRole("banner")
    expect(within(bar).getByRole("button", { name: "Kieli" })).toBeVisible()
    expect(
      within(bar).getByRole("button", { name: "Tumma teema" })
    ).toBeVisible()
    expect(within(bar).queryByRole("combobox")).toBeNull()
    expect(within(bar).queryByRole("button", { name: "Vie" })).toBeNull()
  })

  it("puts the year and the file box above the navigation in the sidebar", () => {
    mount(<AppSidebar onOpenFile={noop} onExport={noop} />)

    expect(
      screen.getByRole("combobox", { name: "Tilikausi" })
    ).toHaveTextContent("2026")
    // Shown with the extension the file really had (§7.3).
    expect(screen.getByText("kirjanpito_2026-10-24.zip")).toBeVisible()
    expect(
      screen.getByRole("status", { name: "Muutoksia, joita ei ole viety" })
    ).toBeInTheDocument()

    const buttons = screen
      .getAllByRole("button")
      .map((el) => el.textContent?.trim())
    expect(buttons.slice(0, 3)).toEqual(["Sulje", "Tuo", "Vie"])

    // The box sits above the navigation.
    const vie = screen.getByRole("button", { name: "Vie" })
    const firstNavLink = screen.getByRole("link", { name: "Kirjanpito" })
    expect(
      vie.compareDocumentPosition(firstNavLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("fires the file actions from the sidebar", async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    const onExport = vi.fn()
    mount(<AppSidebar onOpenFile={onOpenFile} onExport={onExport} />)

    await user.click(screen.getByRole("button", { name: "Tuo" }))
    await user.click(screen.getByRole("button", { name: "Vie" }))

    expect(onOpenFile).toHaveBeenCalledOnce()
    expect(onExport).toHaveBeenCalledOnce()
  })

  /**
   * Collapsed, the box and the year have nowhere to go, so an icon menu
   * stands in. The two renders must offer the same three actions.
   */
  it("keeps every file action reachable from the collapsed rail", async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    const onExport = vi.fn()
    mount(<AppSidebar onOpenFile={onOpenFile} onExport={onExport} />)

    await user.click(screen.getByRole("button", { name: "Avaa tiedosto" }))
    await user.click(screen.getByRole("button", { name: "Vie tiedosto" }))
    expect(screen.getByRole("button", { name: "Sulje tiedosto" })).toBeTruthy()

    expect(onOpenFile).toHaveBeenCalledOnce()
    expect(onExport).toHaveBeenCalledOnce()
  })

  it("collapses the sidebar from the top bar and remembers it", async () => {
    const user = userEvent.setup()
    mount(
      <>
        <AppSidebar onOpenFile={noop} onExport={noop} />
        <AppTopbar />
      </>
    )

    await user.click(
      screen.getByRole("button", { name: "Näytä tai piilota valikko" })
    )
    expect(useBookStore.getState().sidebarOpen).toBe(false)
  })

  /** A smoke test over the whole assembled shell, providers included. */
  it("renders the shell with the top bar above the page content", () => {
    render(
      <AppShell>
        <p>Sivun sisältö</p>
      </AppShell>
    )

    expect(screen.getByRole("banner")).toBeInTheDocument()
    expect(screen.getByText("Sivun sisältö")).toBeVisible()
    expect(screen.getByRole("link", { name: "ALV-laskelma" })).toBeVisible()
  })

  it("marks the current view in the sidebar navigation", () => {
    mount(<AppSidebar onOpenFile={noop} onExport={noop} />)

    expect(screen.getByRole("link", { name: "ALV-laskelma" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(
      screen.getByRole("link", { name: "Kirjanpito" })
    ).not.toHaveAttribute("aria-current")
  })
})
