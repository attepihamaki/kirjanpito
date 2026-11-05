// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { BulkBar } from "@/components/ledger/bulk-bar"
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
  catId: "344-eu-services",
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
      screen.getByText(/Vero 25,50.*ilmoitetaan itse ALV-ilmoituksella/)
    ).toBeVisible()
    expect(screen.queryByText("Verollisuus")).not.toBeInTheDocument()
  })

  it("hides the rate and names it behind the info icon", async () => {
    mount()

    expect(screen.queryByText("ALV %")).not.toBeInTheDocument()
    expect(screen.queryByText(/menee ALV-ilmoitukselle/)).toBeNull()

    fireEvent.click(screen.getByLabelText("Miksi veroa ei ole laskulla?"))

    expect(
      await screen.findByText(/Vero 25,50 € \(25,5 %\) menee ALV-ilmoitukselle/)
    ).toBeVisible()
  })

  it("has no info icon on any other category", () => {
    useBookStore.setState({
      entries: [{ ...subscription, catId: "344-other", euPurchase: undefined }],
    })
    mount()

    expect(screen.queryByLabelText("Miksi veroa ei ole laskulla?")).toBeNull()
  })

  it("keeps a saved rate of its own", async () => {
    useBookStore.setState({ entries: [{ ...subscription, vatRate: 13.5 }] })
    mount()
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }))

    await waitFor(() =>
      expect(useBookStore.getState().dialog.kind).toBe("none")
    )
    expect(useBookStore.getState().entries[0].vatRate).toBe(13.5)
  })

  it("shows the rate again on any other category", () => {
    useBookStore.setState({
      entries: [{ ...subscription, catId: "344-other", euPurchase: undefined }],
    })
    mount()

    expect(screen.getByText("ALV %")).toBeVisible()
  })

  it("has no choice of its own, since the category says it", () => {
    mount()

    expect(screen.queryByText("Osto muusta EU-maasta")).not.toBeInTheDocument()
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

describe("changing several entries' category", () => {
  const other: Entry = {
    ...subscription,
    id: "b",
    voucher: 2,
    catId: "344-other",
    amountMode: "gross",
    euPurchase: undefined,
  }
  const bar = (selected: Entry[]) =>
    render(
      <LangProvider lang="fi">
        <BulkBar selected={selected} onDone={() => {}} />
      </LangProvider>
    )

  it("says why a mix of EU purchases and other costs cannot share one", () => {
    bar([subscription, other])

    expect(
      screen.getByText(/kaikki ostoja, joiden veron ilmoitat itse, tai kaikki muita kuluja/)
    ).toBeVisible()
  })

  it("offers a selection of one kind a category", () => {
    bar([other])

    expect(screen.queryByText(/kaikki EU-ostoja/)).not.toBeInTheDocument()
    expect(screen.getAllByText("Vaihda luokka").length).toBeGreaterThan(0)
  })
})

describe("an EU purchase in the VAT view", () => {
  it("lists the purchase and its tax without changing the tax payable", () => {
    render(
      <LangProvider lang="fi">
        <VatView />
      </LangProvider>
    )

    expect(screen.getByText("Ostot, joiden veron ilmoitat itse")).toBeVisible()
    expect(screen.getByText("Vero palveluostoista")).toBeVisible()
    expect(
      screen.getByText(
        /Myynnin ja EU-ostojen vero 25,50.*vähennettävä vero 25,50/
      )
    ).toBeVisible()
  })

  it("has no EU panel without EU purchases", () => {
    useBookStore.setState({
      entries: [{ ...subscription, catId: "344-other", euPurchase: undefined }],
    })
    render(
      <LangProvider lang="fi">
        <VatView />
      </LangProvider>
    )

    expect(screen.queryByText("Ostot, joiden veron ilmoitat itse")).not.toBeInTheDocument()
  })
})
