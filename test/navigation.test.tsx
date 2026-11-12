// @vitest-environment jsdom
import * as React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppSidebar } from "@/components/app/app-sidebar"
import { AppTopbar } from "@/components/app/app-topbar"
import { LangProvider } from "@/components/lang-provider"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { GeneralActions } from "@/components/settings/general-actions"
import { toast } from "@/components/ui/toast"
import { SidebarProvider } from "@/components/ui/sidebar"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"
import { clearToastHistory, markToastsSeen } from "@/stores/toast-history"

/*
 * The chrome around the views: the top bar's bell and the book tools on Asetukset (§8.2,
 * §8.10), and the pages of a section, in the sidebar or as one row (§8.2).
 */

const path = vi.hoisted(() => ({ current: "/app/ledger/journal" }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => path.current,
}))

vi.mock("@/lib/browser/receipt-store", async (original) => {
  const actual = await original<typeof import("@/lib/browser/receipt-store")>()
  return { ...actual, putReceipt: vi.fn(async () => {}) }
})

function mount(ui: React.ReactElement) {
  return render(
    <LangProvider lang="fi">
      <SidebarProvider open onOpenChange={() => {}}>
        {ui}
      </SidebarProvider>
    </LangProvider>
  )
}

const noop = () => {}

beforeEach(() => {
  path.current = "/app/ledger/journal"
  useBookStore.setState(useBookStore.getInitialState())
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [],
    cats: defaultCategories(),
    year: 2026,
    inbox: [],
    dialog: { kind: "none" },
  })
})

describe("the top bar's bell", () => {
  it("shows unread messages and reads them when opened", async () => {
    const user = userEvent.setup()
    clearToastHistory()
    markToastsSeen()
    mount(<AppTopbar onOpenFile={noop} onExport={noop} />)
    const bar = screen.getByRole("banner")
    expect(within(bar).getByRole("button", { name: "Viestit" })).toBeVisible()

    React.act(() => {
      toast.add({ title: "Tiedosto tallennettu." })
    })
    const bell = await within(bar).findByRole("button", {
      name: "Viestit, 1 lukematon",
    })
    await user.click(bell)
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Tiedosto tallennettu."
    )
    // The open dialog hides the bar from the accessibility tree.
    expect(
      within(bar).getByRole("button", { name: "Viestit", hidden: true })
    ).toBeTruthy()
  })

  it("leaves the book tools out of the file menu", async () => {
    const user = userEvent.setup()
    mount(<AppTopbar onOpenFile={noop} onExport={noop} />)
    await user.click(screen.getByRole("button", { name: /Uusi kirjanpito/ }))
    expect(
      screen.queryByRole("button", { name: /Tarkastuspaketti/ })
    ).toBeNull()
    expect(screen.queryByRole("button", { name: /Excel/ })).toBeNull()
    expect(
      screen.queryByRole("button", { name: /Tarkista kirjanpito/ })
    ).toBeNull()
  })
})

describe("the settings menu", () => {
  it("offers the book check, the audit package and the spreadsheet", async () => {
    const user = userEvent.setup()
    mount(<GeneralActions />)
    await user.click(screen.getByRole("button", { name: "Lisää toimintoja" }))

    expect(
      await screen.findByRole("menuitem", { name: /Lataa vuosi 2026 Excel/ })
    ).toBeVisible()
    expect(
      screen.getByRole("menuitem", { name: /Tarkista kirjanpito/ })
    ).toBeVisible()
    await user.click(screen.getByRole("menuitem", { name: /Tarkastuspaketti/ }))
    expect(useBookStore.getState().dialog.kind).toBe("audit-package")
  })
})

describe("a section's pages", () => {
  it("are listed in the sidebar under the section that is open", () => {
    mount(<AppSidebar />)
    expect(screen.getByRole("link", { name: "Kirjanpito" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(screen.getByRole("link", { name: "Päiväkirja" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "Pääkirja" })).toHaveAttribute(
      "href",
      "/app/ledger/accounts"
    )
    expect(screen.getByRole("link", { name: "Tililuettelo" })).toBeTruthy()
    // The view itself draws no second row of the same links.
    mount(<LedgerTabs />)
    expect(screen.queryByRole("navigation", { name: "Kirjanpito" })).toBeNull()
  })

  it("become one row of links in the view while the sidebar is a rail", () => {
    useBookStore.setState({
      sidebarOpen: false,
      inbox: [
        {
          id: "a-1",
          name: "a.pdf",
          type: "application/pdf",
          size: 1,
          added: "2026-01-01",
        },
      ],
    })
    mount(<LedgerTabs />)
    const tabs = screen.getByRole("navigation", { name: "Kirjanpito" })
    expect(within(tabs).getAllByRole("link")).toHaveLength(6)
    expect(
      within(tabs).getByRole("link", { name: "Päiväkirja" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      within(tabs).getByRole("link", { name: /^Saapuneet\s*1$/ })
    ).toBeTruthy()
  })

  it("split invoices into the ones sent and the bills to pay", () => {
    path.current = "/app/invoices/payables"
    mount(<AppSidebar />)
    expect(screen.getByRole("link", { name: "Ostolaskut" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(
      screen.getByRole("link", { name: "Myyntilaskut" })
    ).not.toHaveAttribute("aria-current")
  })
})
