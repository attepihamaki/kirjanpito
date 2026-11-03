// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { VatView } from "@/components/vat/vat-view"
import { defaultCategories } from "@/lib/domain/accounts"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const subscription: Entry = {
  id: "a",
  voucher: 1,
  date: "2026-03-10",
  description: "Pilvipalvelu",
  type: "expense",
  catId: "344-other",
  amount: 10_000,
  vatRate: 25.5,
  amountMode: "net",
  euPurchase: "services",
}

beforeEach(() => {
  useBookStore.setState({
    entries: [subscription],
    cats: defaultCategories(),
    year: 2026,
    month: 0,
    vatPeriod: "year",
    vatFiled: {},
    dialog: { kind: "none" },
  })
})

describe("an EU purchase in the entry dialog", () => {
  const mount = () => {
    useBookStore.setState({
      dialog: { kind: "entry", mode: "edit", entryId: "a" },
    })
    render(
      <LangProvider lang="fi">
        <EntryDialog registerDropTarget={() => {}} />
      </LangProvider>
    )
  }

  it("names the tax and hides the choice of gross or net", () => {
    mount()

    expect(
      screen.getByText(/Vero 25,50.*menee ALV-ilmoitukselle/)
    ).toBeVisible()
    expect(
      screen.getByText(/Vero 25,50.*ilmoitetaan itse ALV-ilmoituksella/)
    ).toBeVisible()
    expect(screen.queryByText("Summa on")).not.toBeInTheDocument()
  })

  it("keeps the mark when saved", async () => {
    mount()

    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }))

    await waitFor(() =>
      expect(useBookStore.getState().dialog.kind).toBe("none")
    )
    const [saved] = useBookStore.getState().entries
    expect(saved.euPurchase).toBe("services")
    expect(saved.amountMode).toBe("net")
  })
})

describe("an EU purchase in the VAT view", () => {
  it("lists the purchase and its tax without changing the tax payable", () => {
    render(
      <LangProvider lang="fi">
        <VatView />
      </LangProvider>
    )

    expect(screen.getByText("Ostot muista EU-maista")).toBeVisible()
    expect(screen.getByText("Vero palveluostoista")).toBeVisible()
    expect(
      screen.getByText(
        /Myynnin ja EU-ostojen vero 25,50.*vähennettävä vero 25,50/
      )
    ).toBeVisible()
  })

  it("has no EU panel without EU purchases", () => {
    useBookStore.setState({
      entries: [{ ...subscription, euPurchase: undefined }],
    })
    render(
      <LangProvider lang="fi">
        <VatView />
      </LangProvider>
    )

    expect(screen.queryByText("Ostot muista EU-maista")).not.toBeInTheDocument()
  })
})
