// @vitest-environment jsdom
import * as React from "react"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppTopbar } from "@/components/app/app-topbar"
import { InboxDropBox } from "@/components/app/inbox-drop-box"
import { LangProvider } from "@/components/lang-provider"
import { LedgerTabs } from "@/components/ledger/ledger-tabs"
import { GeneralActions } from "@/components/settings/general-actions"
import { toast } from "@/components/ui/toast"
import { SidebarProvider } from "@/components/ui/sidebar"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"
import { clearToastHistory, markToastsSeen } from "@/stores/toast-history"

/*
 * The chrome around the views: the inbox's drop box at the foot of the
 * sidebar (§8.31), the top bar's bell and the book tools on Asetukset (§8.2,
 * §8.10), and tabs that group several pages behind one switch (§8.2).
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

describe("the inbox drop box", () => {
  it("adds dropped receipts to the inbox and marks the drop handled", async () => {
    mount(<InboxDropBox />)
    const box = screen.getByRole("group", {
      name: "Saapuneiden pudotuslaatikko",
    })
    const file = new File(["x"], "kuitti.jpg", { type: "image/jpeg" })
    const dataTransfer = { types: ["Files"], files: [file], dropEffect: "" }

    fireEvent.dragEnter(box, { dataTransfer })
    expect(box).toHaveAttribute("data-drop-over")
    const drop = fireEvent.drop(box, { dataTransfer })

    // `false` from fireEvent means `preventDefault` was called.
    expect(drop).toBe(false)
    expect(box).not.toHaveAttribute("data-drop-over")
    await waitFor(() => expect(useBookStore.getState().inbox).toHaveLength(1))
    expect(useBookStore.getState().inbox[0].name).toBe("kuitti.jpg")
  })

  it("links to the inbox with the number waiting", () => {
    useBookStore.setState({
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
    mount(<InboxDropBox />)
    const link = screen.getByRole("link", { name: /Saapuneet/ })
    expect(link).toHaveAttribute("href", "/app/ledger/inbox")
    expect(link.parentElement).toHaveTextContent("1")
  })

  it("takes no drop in an archived year", () => {
    useBookStore.setState({ archiveYear: 2024 })
    mount(<InboxDropBox />)
    expect(screen.queryByText("Pudota kuitit tähän")).toBeNull()
    const box = screen.getByRole("group", {
      name: "Saapuneiden pudotuslaatikko",
    })
    const dataTransfer = { types: ["Files"], files: [] }
    expect(fireEvent.drop(box, { dataTransfer })).toBe(true)
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

describe("grouped tabs", () => {
  it("lights the group and switches between its pages", () => {
    mount(<LedgerTabs />)
    const tabs = screen.getByRole("navigation", { name: "Kirjanpidon osiot" })
    expect(within(tabs).getAllByRole("link")).toHaveLength(3)
    expect(within(tabs).getByRole("link", { name: "Kirjat" })).toHaveAttribute(
      "aria-current",
      "true"
    )

    const books = screen.getByRole("navigation", { name: "Kirjat" })
    const journal = within(books).getByRole("link", { name: "Päiväkirja" })
    expect(journal).toHaveAttribute("aria-current", "page")
    expect(
      within(books).getByRole("link", { name: "Pääkirja" })
    ).toHaveAttribute("href", "/app/ledger/accounts")
    expect(
      within(books).getByRole("link", { name: "Tililuettelo" })
    ).toBeTruthy()
  })

  it("shows no switch for a tab of one page, and counts the inbox", () => {
    path.current = "/app/ledger"
    useBookStore.setState({
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
    expect(screen.getAllByRole("navigation")).toHaveLength(1)
    expect(screen.getByRole("link", { name: /^Saapuneet\s*1$/ })).toBeTruthy()
  })
})
