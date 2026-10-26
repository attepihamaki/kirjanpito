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
   * §8.2: the top bar holds what is the same on every view — the sidebar
   * toggle, the two preferences, and the file. The file is an icon button
   * like the rest, so the name and the status live in its accessible name
   * rather than in visible text.
   */
  it("names the open file and its status on the top bar button", () => {
    mount(<AppTopbar onOpenFile={noop} onExport={noop} />)

    const bar = screen.getByRole("banner")
    // Named with the extension the file really had (§7.3).
    const file = within(bar).getByRole("button", {
      name: "kirjanpito_2026-10-24.zip, Tallentamattomia muutoksia",
    })
    expect(file).toBeVisible()
    expect(file).toHaveTextContent("")
    expect(within(bar).getByRole("button", { name: "Kieli" })).toBeVisible()
    expect(
      within(bar).getByRole("button", { name: "Tumma teema" })
    ).toBeVisible()
    // The year is in the popover, not loose on the bar.
    expect(within(bar).queryByRole("combobox")).toBeNull()
  })

  it("offers the year and the file actions in the popover", async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()
    const onExport = vi.fn()
    mount(<AppTopbar onOpenFile={onOpenFile} onExport={onExport} />)

    const openMenu = () =>
      user.click(screen.getByRole("button", { name: /kirjanpito_2026/ }))

    await openMenu()
    expect(
      screen.getByRole("combobox", { name: "Tilikausi" })
    ).toHaveTextContent("2026")
    expect(
      screen.getByRole("status", { name: "Tallentamattomia muutoksia" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sulje tiedosto" })).toBeVisible()

    // Acting closes the popover, so each action needs it opened again.
    await user.click(screen.getByRole("button", { name: /Avaa tiedosto/ }))
    await openMenu()
    await user.click(screen.getByRole("button", { name: /Lataa tiedosto/ }))

    expect(onOpenFile).toHaveBeenCalledOnce()
    expect(onExport).toHaveBeenCalledOnce()
  })

  /**
   * §8.2: the rows spell out their shortcuts. jsdom is not a Mac, so these
   * are the Ctrl forms; "save as" is what makes Ctrl+Shift+S the download.
   */
  it("names each row's shortcut", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("showOpenFilePicker", vi.fn())
    vi.stubGlobal("showSaveFilePicker", vi.fn())
    try {
      mount(<AppTopbar onOpenFile={noop} onExport={noop} />)
      await user.click(screen.getByRole("button", { name: /kirjanpito_2026/ }))

      /*
       * The key cap is `aria-hidden`, so the row's name is still its label
       * alone and the combination travels in `aria-keyshortcuts`.
       */
      const row = (name: string) => screen.getByRole("button", { name })
      expect(row("Avaa tiedosto")).toHaveTextContent("Ctrl+O")
      expect(row("Avaa tiedosto")).toHaveAttribute(
        "aria-keyshortcuts",
        "Control+O"
      )
      expect(row("Tallenna")).toHaveTextContent("Ctrl+S")
      expect(row("Lataa tiedosto")).toHaveTextContent("Ctrl+Shift+S")
      expect(row("Lataa tiedosto")).toHaveAttribute(
        "aria-keyshortcuts",
        "Control+Shift+S"
      )
      // Ctrl+W cannot be intercepted, so closing deliberately has none.
      expect(row("Sulje tiedosto")).not.toHaveAttribute("aria-keyshortcuts")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  /**
   * §7.5: writing back to the file is a File System Access API feature, and
   * jsdom has no pickers — so this is also the Firefox / Safari / phone case,
   * where the row must be absent rather than present and dead.
   */
  it("hides the save row when the browser cannot write to a file", async () => {
    const user = userEvent.setup()
    mount(<AppTopbar onOpenFile={noop} onExport={noop} />)

    await user.click(screen.getByRole("button", { name: /kirjanpito_2026/ }))
    expect(screen.queryByRole("button", { name: /Tallenna/ })).toBeNull()
    // The download is still there, and still called the same thing.
    expect(screen.getByRole("button", { name: /Lataa tiedosto/ })).toBeVisible()
  })

  it("shows the save row where the file pickers exist", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("showOpenFilePicker", vi.fn())
    vi.stubGlobal("showSaveFilePicker", vi.fn())
    try {
      mount(<AppTopbar onOpenFile={noop} onExport={noop} />)

      await user.click(screen.getByRole("button", { name: /kirjanpito_2026/ }))
      expect(screen.getByRole("button", { name: /Tallenna/ })).toBeVisible()
      expect(
        screen.getByRole("button", { name: /Lataa tiedosto/ })
      ).toBeVisible()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("keeps the sidebar to the brand and the navigation", () => {
    mount(<AppSidebar />)

    expect(screen.getByRole("link", { name: "Kirjanpito" })).toBeVisible()
    expect(screen.queryByRole("combobox")).toBeNull()
    expect(screen.queryByText("kirjanpito_2026-10-24.zip")).toBeNull()
  })

  it("collapses the sidebar from the top bar and remembers it", async () => {
    const user = userEvent.setup()
    mount(
      <>
        <AppSidebar />
        <AppTopbar onOpenFile={noop} onExport={noop} />
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
    mount(<AppSidebar />)

    expect(screen.getByRole("link", { name: "ALV-laskelma" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(
      screen.getByRole("link", { name: "Kirjanpito" })
    ).not.toHaveAttribute("aria-current")
  })
})
