// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppSidebar } from "@/components/app/app-sidebar"
import { LangProvider } from "@/components/lang-provider"
import { CategorySettings } from "@/components/settings/category-settings"
import { GeneralSettings } from "@/components/settings/general-settings"
import { SettingsShell } from "@/components/settings/settings-shell"
import { SidebarProvider } from "@/components/ui/sidebar"
import { defaultCategories } from "@/lib/domain/accounts"
import { useBookStore } from "@/stores/book-store"

const path = vi.hoisted(() => ({ current: "/app/settings/" }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => path.current,
}))

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

    expect(screen.getByRole("link", { name: "Yleiset" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "Luokat" })).not.toHaveAttribute(
      "aria-current"
    )
    expect(screen.getByText("ALV-ilmoitusjakso")).toBeVisible()
    expect(screen.getByRole("button", { name: "Tyhjennä" })).toBeVisible()
    expect(screen.queryByText("Lisää oma luokka")).toBeNull()
  })

  it("keeps the categories on their own page", () => {
    path.current = "/app/settings/categories/"
    mount(
      <SettingsShell>
        <CategorySettings />
      </SettingsShell>
    )

    expect(screen.getByRole("link", { name: "Luokat" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByText("Lisää oma luokka")).toBeVisible()
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
      "page"
    )
  })
})
