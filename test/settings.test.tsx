// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppSidebar } from "@/components/app/app-sidebar"
import { LangProvider } from "@/components/lang-provider"
import { CategoryDialogs } from "@/components/settings/category-dialogs"
import { CategorySettings } from "@/components/settings/category-settings"
import { GeneralSettings } from "@/components/settings/general-settings"
import { SettingsShell } from "@/components/settings/settings-shell"
import { SidebarProvider } from "@/components/ui/sidebar"
import { toast, ToastProvider } from "@/components/ui/toast"
import { deleteCategory } from "@/lib/commands/category-commands"
import type { Ctx } from "@/lib/commands/ctx"
import { defaultCategories } from "@/lib/domain/accounts"
import type { RecurringEntry } from "@/lib/domain/recurring"
import type { Category, Entry } from "@/lib/domain/types"
import { createFormatters } from "@/lib/i18n/create-formatters"
import { useBookStore } from "@/stores/book-store"

const path = vi.hoisted(() => ({ current: "/app/settings/" }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => path.current,
}))

const ctx: Ctx = { t: createFormatters("fi").t, navigate: vi.fn() }

function mount(ui: React.ReactElement) {
  return render(
    <LangProvider lang="fi">
      <SidebarProvider>{ui}</SidebarProvider>
    </LangProvider>
  )
}

describe("settings sub-pages", () => {
  beforeEach(() => {
    useBookStore.setState({
      open: true,
      hydrated: true,
      entries: [],
      cats: defaultCategories(),
      year: 2026,
    })
  })

  it("opens on the general page, with the filing and saving settings", () => {
    path.current = "/app/settings/"
    mount(
      <SettingsShell>
        <GeneralSettings />
      </SettingsShell>
    )

    // The sidebar lists the pages, so the view draws no tabs of its own.
    expect(screen.queryByRole("navigation", { name: "Asetukset" })).toBeNull()
    expect(
      screen.getByRole("heading", { level: 1, name: "Asetukset" })
    ).toBeVisible()
    expect(screen.getByText("ALV-ilmoitusjakso")).toBeVisible()
    expect(screen.getByText("Kirjanpidon aloitus")).toBeVisible()
    expect(screen.getByRole("button", { name: /^Aloita vuosi/ })).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Lisää toimintoja" })
    ).toBeVisible()
    expect(screen.queryByText("Lisää oma luokka")).toBeNull()
  })

  it("keeps the categories on their own page", () => {
    path.current = "/app/settings/categories/"
    mount(
      <SettingsShell>
        <CategorySettings />
      </SettingsShell>
    )

    // A page inside the section is titled by its own name, under the section's.
    expect(
      screen.getByRole("heading", { level: 1, name: "Luokat" })
    ).toBeVisible()
    expect(screen.getByText("Asetukset")).toBeVisible()
    expect(screen.getByRole("button", { name: "Lisää luokka" })).toBeVisible()
    expect(screen.queryByText("Lisää oma luokka")).toBeNull()
    expect(
      screen.getByRole("button", { name: "Palauta oletusluokat" })
    ).toBeVisible()
    expect(screen.queryByText("ALV-ilmoitusjakso")).toBeNull()
  })

  it("keeps Asetukset lit in the sidebar on a sub-page", () => {
    path.current = "/app/settings/categories/"
    mount(<AppSidebar />)

    expect(screen.getByRole("link", { name: "Asetukset" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(screen.getByRole("link", { name: "Luokat" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })
})

describe("editing and deleting a custom category", () => {
  const custom: Category = {
    id: "c-tools",
    line: "333",
    name: "Työkalut",
    vatRate: 25.5,
    enabled: true,
    custom: true,
  }
  const voucher: Entry = {
    id: "e1",
    voucher: 1,
    date: "2026-03-10",
    description: "Pora",
    type: "expense",
    catId: custom.id,
    amount: 10000,
    vatRate: 14,
    amountMode: "gross",
  }

  function setup(entries: Entry[] = [], catQuery = "Työkalut") {
    path.current = "/app/settings/categories/"
    useBookStore.setState({
      cats: [...defaultCategories(), custom],
      entries,
      recurring: [],
      vatFiled: {},
      form5Filed: {},
      yearsArchived: {},
      dialog: { kind: "none" },
      catQuery,
    })
    return mount(
      <ToastProvider>
        <CategorySettings />
        <CategoryDialogs />
      </ToastProvider>
    )
  }

  const stored = () =>
    useBookStore.getState().cats.find((c) => c.id === custom.id)

  const undoOf = (spy: { mock: { calls: unknown[][] } }) => {
    const call = spy.mock.calls.at(-1)?.[0] as {
      actionProps: { onClick: () => void }
    }
    return call.actionProps.onClick
  }

  it("offers neither action on a default category", () => {
    setup([], "Vuokrat")
    expect(screen.queryByRole("button", { name: /Muokkaa luokkaa/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Poista luokka/ })).toBeNull()
  })

  it("offers only the rates in force today when adding", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-04"), toFake: ["Date"] })
    const user = userEvent.setup()
    setup()
    act(() => useBookStore.getState().openDialog({ kind: "category-add" }))
    await user.click(
      (await screen.findAllByRole("combobox", { name: "Oletus ALV %" })).at(-1)!
    )
    const rates = (await screen.findAllByRole("option")).map((o) =>
      o.textContent?.replace(/\s/g, " ")
    )
    vi.useRealTimers()
    expect(rates).toEqual(["25,5 %", "13,5 %", "10 %", "0 %"])
  })

  it("adds a category from the dialog the header button opens", async () => {
    path.current = "/app/settings/categories/"
    useBookStore.setState({ dialog: { kind: "none" } })
    const user = userEvent.setup()
    mount(
      <ToastProvider>
        <SettingsShell>
          <CategorySettings />
        </SettingsShell>
        <CategoryDialogs />
      </ToastProvider>
    )
    await user.click(screen.getByRole("button", { name: "Lisää luokka" }))
    expect(useBookStore.getState().dialog.kind).toBe("category-add")

    await user.type(document.getElementById("cat-name")!, "Ohjelmistot")
    await user.click(screen.getByRole("button", { name: "Tallenna" }))

    const added = useBookStore
      .getState()
      .cats.find((c) => c.name === "Ohjelmistot")
    expect(added).toMatchObject({ custom: true, enabled: true })
    expect(useBookStore.getState().dirty).toBe(true)
    expect(useBookStore.getState().dialog.kind).toBe("none")
  })

  it("sets the VAT return row of a new sales category", async () => {
    const user = userEvent.setup()
    setup()
    act(() => useBookStore.getState().openDialog({ kind: "category-add" }))
    await user.click(await screen.findByRole("button", { name: "Tulo" }))
    await user.type(document.getElementById("cat-name")!, "Konsultointi EU")
    await user.click(
      (
        await screen.findAllByRole("combobox", { name: "ALV-ilmoituksen rivi" })
      ).at(-1)!
    )
    await user.click(
      await screen.findByRole("option", {
        name: "Myynti EU:hun, palvelut",
      })
    )
    await user.click(screen.getByRole("button", { name: "Tallenna" }))

    expect(
      useBookStore.getState().cats.find((c) => c.name === "Konsultointi EU")
    ).toMatchObject({ line: "300", kind: "euServices" })
  })

  it("keeps the add dialog open on an empty name", async () => {
    const user = userEvent.setup()
    setup()
    act(() => useBookStore.getState().openDialog({ kind: "category-add" }))
    await user.click(await screen.findByRole("button", { name: "Tallenna" }))

    expect(useBookStore.getState().dialog.kind).toBe("category-add")
    expect(document.getElementById("cat-name")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("keeps an older rate on the list when editing", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-04"), toFake: ["Date"] })
    const user = userEvent.setup()
    setup()
    act(() =>
      useBookStore.getState().upsertCategory({ ...custom, vatRate: 24 })
    )
    await user.click(
      screen.getByRole("button", { name: "Muokkaa luokkaa Työkalut" })
    )
    const select = screen
      .getAllByRole("combobox", { name: "Oletus ALV %" })
      .at(-1)!
    await user.click(select)
    const rates = (await screen.findAllByRole("option")).map((o) =>
      o.textContent?.replace(/\s/g, " ")
    )
    vi.useRealTimers()
    expect(rates).toContain("24 %")
    expect(rates).not.toContain("14 %")
  })

  it("changes a default rate from the table's select", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(
      screen.getByRole("combobox", { name: "Oletus ALV % – Työkalut" })
    )
    await user.click(await screen.findByRole("option", { name: /^13,5/ }))

    expect(stored()?.vatRate).toBe(13.5)
    expect(useBookStore.getState().dirty).toBe(true)
  })

  it("renames a category", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(
      screen.getByRole("button", { name: "Muokkaa luokkaa Työkalut" })
    )
    const name = document.getElementById("cat-name") as HTMLInputElement
    await user.clear(name)
    await user.type(name, "Koneet")
    await user.click(screen.getByRole("button", { name: "Tallenna" }))

    expect(stored()?.name).toBe("Koneet")
    expect(useBookStore.getState().dirty).toBe(true)
    expect(useBookStore.getState().dialog.kind).toBe("none")
  })

  it("refuses a name the account already has", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(
      screen.getByRole("button", { name: "Muokkaa luokkaa Työkalut" })
    )
    const name = document.getElementById("cat-name") as HTMLInputElement
    await user.clear(name)
    await user.type(name, "ostot ja varastojen muutokset")
    await user.click(screen.getByRole("button", { name: "Tallenna" }))

    expect(screen.getByText(/Tilillä 333 on jo/)).toBeVisible()
    expect(stored()?.name).toBe("Työkalut")
  })

  it("fixes the line once a voucher uses the category", async () => {
    const user = userEvent.setup()
    setup([voucher])
    await user.click(
      screen.getByRole("button", { name: "Muokkaa luokkaa Työkalut" })
    )
    expect(screen.getByText(/riviä ei voi vaihtaa/)).toBeVisible()
  })

  it("deletes an unused category at once, and undoes it", async () => {
    const spy = vi.spyOn(toast, "add")
    const user = userEvent.setup()
    setup()
    await user.click(
      screen.getByRole("button", { name: "Poista luokka Työkalut" })
    )
    await waitFor(() => expect(stored()).toBeUndefined())

    act(() => undoOf(spy)())
    expect(stored()).toEqual(custom)
  })

  it("asks where the vouchers go before deleting a used category", async () => {
    const user = userEvent.setup()
    setup([voucher])
    await user.click(
      screen.getByRole("button", { name: "Poista luokka Työkalut" })
    )
    expect(useBookStore.getState().dialog.kind).toBe("category-delete")
    expect(stored()).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Siirrä ja poista" })
    ).toBeDisabled()
  })

  it("refuses to delete a category with a locked voucher", async () => {
    const user = userEvent.setup()
    setup([voucher])
    act(() => useBookStore.setState({ form5Filed: { "2026": "2027-03-20" } }))
    await user.click(
      screen.getByRole("button", { name: "Poista luokka Työkalut" })
    )
    expect(stored()).toBeDefined()
    expect(useBookStore.getState().dialog.kind).toBe("none")
  })

  it("moves vouchers and templates to the target, and undoes the move", async () => {
    const template: RecurringEntry = {
      id: "r1",
      description: "Vuokra",
      type: "expense",
      catId: custom.id,
      amount: 1000,
      vatRate: 25.5,
      amountMode: "gross",
      day: 1,
      from: "2026-01",
    }
    const spy = vi.spyOn(toast, "add")
    setup([voucher])
    act(() =>
      useBookStore.setState({ recurring: [template], ledgerCat: custom.id })
    )
    const target = defaultCategories().find((c) => c.id === "334")!

    let done = false
    await act(async () => {
      done = await deleteCategory(ctx, custom, {
        cat: target,
        label: target.name,
      })
    })

    expect(done).toBe(true)
    let state = useBookStore.getState()
    expect(stored()).toBeUndefined()
    expect(state.ledgerCat).toBe("all")
    expect(state.entries[0].catId).toBe("334")
    // The rate belongs to the voucher, not to the category (§4).
    expect(state.entries[0].vatRate).toBe(14)
    expect(state.recurring[0].catId).toBe("334")

    act(() => undoOf(spy)())
    state = useBookStore.getState()
    expect(stored()).toEqual(custom)
    expect(state.entries[0].catId).toBe(custom.id)
    expect(state.recurring[0].catId).toBe(custom.id)
  })
})
