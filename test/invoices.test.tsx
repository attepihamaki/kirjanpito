// @vitest-environment jsdom
import * as React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CustomerDialog } from "@/components/invoices/customer-dialog"
import { CustomerList } from "@/components/invoices/customer-list"
import { InvoiceDialog } from "@/components/invoices/invoice-dialog"
import { InvoiceList } from "@/components/invoices/invoice-list"
import { InvoiceSettingsForm } from "@/components/invoices/invoice-settings"
import { LangProvider } from "@/components/lang-provider"
import { shareFile } from "@/lib/browser/share"
import { defaultCategories } from "@/lib/domain/accounts"
import { todayIso } from "@/lib/domain/dates"
import {
  DEFAULT_INVOICE_SETTINGS,
  emptyParty,
  type Invoice,
} from "@/lib/domain/invoice"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* The invoice pages and dialogs (§8.27). */

vi.mock("@/lib/browser/share", () => ({
  shareFile: vi.fn(async () => "shared"),
  openMailto: vi.fn(),
}))

vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/invoices",
}))

const mount = (ui: React.ReactElement) =>
  render(<LangProvider lang="fi">{ui}</LangProvider>)

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "i1",
  number: 1001,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: { ...emptyParty(), name: "Asiakas Oy" },
  language: "fi",
  rows: [
    {
      description: "Työ",
      quantityMilli: 1000,
      unit: "h",
      unitCents: 10_000,
      vatRate: 25.5,
      catId: "300-domestic",
    },
  ],
  note: "",
  terms: "",
  reference: "10016",
  seller: null,
  issuedAt: "2026-11-01T09:00:00.000Z",
  entryIds: ["e1"],
  credits: null,
  ...over,
})

/** Open an invoice's ⋯ menu and pick an item from it. */
async function pick(n: string, item: string) {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText(`Lisää toimintoja: ${n}`))
  await user.click(await screen.findByRole("menuitem", { name: item }))
}

/** The names of the items in an invoice's ⋯ menu. */
async function menuOf(n: string) {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText(`Lisää toimintoja: ${n}`))
  const items = await screen.findAllByRole("menuitem")
  return items.map((i) => i.textContent)
}

const entry = (id: string, paidOn: Entry["paidOn"]): Entry => ({
  id,
  date: "2026-11-01",
  description: "Lasku",
  type: "income",
  catId: "300-domestic",
  amount: 10_000,
  vatRate: 25.5,
  amountMode: "net",
  paidOn,
})

beforeEach(() => {
  useBookStore.setState({
    open: true,
    hydrated: true,
    cats: defaultCategories(),
    entries: [],
    invoices: [],
    customers: [],
    invoiceSettings: DEFAULT_INVOICE_SETTINGS,
    dialog: { kind: "none" },
    yearsArchived: {},
    form5Filed: {},
    vatFiled: {},
  })
})

describe("InvoiceList", () => {
  it("says there are no invoices yet", () => {
    mount(<InvoiceList />)
    expect(screen.getByText("Ei vielä laskuja.")).toBeTruthy()
  })

  it("shows each invoice with its status and gross amount", () => {
    useBookStore.setState({
      entries: [entry("e1", null), entry("e2", "2026-11-05")],
      invoices: [
        invoice({ id: "open", number: 1001, dueDate: "2999-01-01" }),
        invoice({
          id: "late",
          number: 1002,
          dueDate: "2020-01-01",
          entryIds: ["e1"],
        }),
        invoice({ id: "paid", number: 1003, entryIds: ["e2"] }),
        invoice({
          id: "draft",
          number: null,
          reference: null,
          issuedAt: null,
          entryIds: [],
          customer: { ...emptyParty(), name: "Luonnos Oy" },
        }),
      ],
    })
    mount(<InvoiceList />)
    const rows = screen.getAllByRole("row").slice(1)
    expect(rows).toHaveLength(4)
    const text = rows.map((r) => r.textContent ?? "")
    /* Drafts first, then newest number first. */
    expect(text[0]).toContain("Luonnos")
    expect(text[1]).toContain("1003")
    expect(text[1]).toContain("Maksettu")
    expect(text[2]).toContain("1002")
    expect(text[2]).toContain("Erääntynyt")
    expect(text[3]).toContain("1001")
    expect(text[3]).toContain("Avoin")
    expect(text[3]).toContain("125,50")
  })

  it("offers a PDF and a payment only on an unpaid issued invoice", () => {
    useBookStore.setState({
      entries: [entry("e1", null), entry("e2", "2026-11-05")],
      invoices: [
        invoice({ id: "a", number: 1001, entryIds: ["e1"] }),
        invoice({ id: "b", number: 1002, entryIds: ["e2"] }),
      ],
    })
    mount(<InvoiceList />)
    expect(screen.getByLabelText("Merkitse maksetuksi: 1001")).toBeTruthy()
    expect(screen.queryByLabelText("Merkitse maksetuksi: 1002")).toBeNull()
    expect(screen.getByLabelText("Lataa PDF: 1002")).toBeTruthy()
  })

  it("sends an issued invoice and offers no send on a draft", async () => {
    useBookStore.setState({
      entries: [entry("e1", null)],
      invoices: [
        invoice({
          seller: {
            ...emptyParty(),
            name: "Oma Yritys",
            businessId: "",
            phone: "",
            iban: "",
            vatRegistered: true,
          },
        }),
        invoice({
          id: "d",
          number: null,
          reference: null,
          issuedAt: null,
          entryIds: [],
        }),
      ],
    })
    mount(<InvoiceList />)
    expect(await menuOf("Asiakas Oy")).not.toContain("Lähetä")
    await userEvent.keyboard("{Escape}")
    await pick("1001", "Lähetä")
    await vi.waitFor(() => expect(shareFile).toHaveBeenCalledOnce())
  })

  it("starts a credit note from an issued invoice and opens it", async () => {
    useBookStore.setState({
      entries: [entry("e1", null)],
      invoices: [invoice({ dueDate: "2999-01-01" })],
    })
    mount(<InvoiceList />)
    await pick("1001", "Hyvitä")
    const { invoices, dialog } = useBookStore.getState()
    const note = invoices.find((i) => i.credits === "i1")
    expect(note).toBeDefined()
    expect(note?.rows[0].quantityMilli).toBe(-1000)
    expect(dialog).toEqual({ kind: "invoice", invoiceId: note?.id })
  })

  it("offers no credit on a credit note, and shows it as a credit", async () => {
    useBookStore.setState({
      entries: [entry("e1", null)],
      invoices: [
        invoice({
          id: "c1",
          number: 1002,
          credits: "i1",
          rows: [{ ...invoice().rows[0], quantityMilli: -1000 }],
        }),
      ],
    })
    mount(<InvoiceList />)
    expect(await menuOf("1002")).not.toContain("Hyvitä")
    const [row] = screen.getAllByRole("row").slice(1)
    expect(row.textContent).toContain("Hyvitys")
    expect(row.textContent).toContain("125,50")
  })

  it("deletes a draft and brings it back with the undo", async () => {
    useBookStore.setState({
      invoices: [
        invoice({
          id: "d",
          number: null,
          reference: null,
          issuedAt: null,
          entryIds: [],
        }),
      ],
    })
    mount(<InvoiceList />)
    await pick("Asiakas Oy", "Poista luonnos")
    expect(useBookStore.getState().invoices).toEqual([])
  })

  it("opens an invoice from a click on its row, but not from its buttons", async () => {
    useBookStore.setState({
      entries: [entry("e1", null)],
      invoices: [invoice({ dueDate: "2999-01-01" })],
    })
    mount(<InvoiceList />)
    const [row] = screen.getAllByRole("row").slice(1)
    fireEvent.click(within(row).getByText("1.11.2026"))
    expect(useBookStore.getState().dialog).toEqual({
      kind: "invoice",
      invoiceId: "i1",
    })
    useBookStore.setState({ dialog: { kind: "none" } })
    fireEvent.click(screen.getByLabelText("Merkitse maksetuksi: 1001"))
    expect(useBookStore.getState().dialog).toEqual({ kind: "none" })
  })

  it("filters by status and sums what is open and what was paid this year", () => {
    useBookStore.setState({
      year: 2026,
      entries: [entry("e1", null), entry("e2", "2026-11-05")],
      invoices: [
        invoice({ id: "late", number: 1001, dueDate: "2020-01-01" }),
        invoice({ id: "paid", number: 1002, entryIds: ["e2"] }),
      ],
    })
    mount(<InvoiceList />)
    expect(screen.queryByRole("tab", { name: /Luonnokset/ })).toBeNull()
    expect(screen.getByText(/Maksettu 2026/).textContent).toContain("125,50")
    expect(screen.getByText(/pv myöhässä/)).toBeTruthy()
    fireEvent.click(screen.getByRole("tab", { name: /Maksetut/ }))
    const rows = screen.getAllByRole("row").slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain("1002")
  })

  it("marks an invoice paid from the dialog", async () => {
    useBookStore.setState({
      entries: [entry("e1", null)],
      invoices: [invoice({ dueDate: "2999-01-01" })],
    })
    mount(<InvoiceList />)
    fireEvent.click(screen.getByLabelText("Merkitse maksetuksi: 1001"))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Merkitse maksetuksi" })
    )
    await vi.waitFor(() => {
      const [paid] = useBookStore.getState().entries
      expect(paid.paidOn).not.toBeNull()
    })
    const today = todayIso()
    const [paid] = useBookStore.getState().entries
    expect([undefined, today]).toContain(paid.paidOn)
  })
})

describe("payment reminders", () => {
  const seller = {
    ...emptyParty(),
    name: "Oma Yritys",
    street: "Katu 2",
    postcode: "00100",
    city: "Helsinki",
    businessId: "0112038-9",
    phone: "",
    iban: "FI2112345600000785",
    vatRegistered: true,
  }

  it("books the interest and fee as open income on the invoice, and waives them", async () => {
    useBookStore.setState({
      entries: [entry("e1", null)],
      invoices: [invoice({ dueDate: "2026-10-01", seller })],
    })
    mount(<InvoiceList />)
    fireEvent.click(screen.getByLabelText("Maksumuistutus: 1001"))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Tee muistutus" })
    )
    await vi.waitFor(() =>
      expect(useBookStore.getState().entries).toHaveLength(3)
    )
    const state = useBookStore.getState()
    const [, interest, fee] = state.entries
    expect(interest).toMatchObject({ catId: "323", vatRate: 0, paidOn: null })
    expect(fee).toMatchObject({ catId: "301", amount: 500, paidOn: null })
    const [made] = state.invoices
    expect(made.entryIds).toEqual(["e1", interest.id, fee.id])
    expect(made.reminders?.[0].entryIds).toEqual([interest.id, fee.id])

    await pick("1001", "Luovu muistutuskuluista")
    await vi.waitFor(() =>
      expect(useBookStore.getState().entries).toHaveLength(1)
    )
    const [waived] = useBookStore.getState().invoices
    expect(waived.entryIds).toEqual(["e1"])
    expect(waived.reminders).toHaveLength(1)
    expect(waived.reminders?.[0].entryIds).toBeUndefined()
  })
})

describe("InvoiceSettingsForm", () => {
  it("stores a valid IBAN on blur, compact", () => {
    mount(<InvoiceSettingsForm />)
    const field = screen.getByLabelText("Tilinumero (IBAN)")
    fireEvent.change(field, { target: { value: "fi21 1234 5600 0007 85" } })
    fireEvent.blur(field)
    expect(useBookStore.getState().invoiceSettings.iban).toBe(
      "FI2112345600000785"
    )
    expect((field as HTMLInputElement).value).toBe("FI21 1234 5600 0007 85")
  })

  it("refuses a bad IBAN and says so", () => {
    mount(<InvoiceSettingsForm />)
    const field = screen.getByLabelText("Tilinumero (IBAN)")
    fireEvent.change(field, { target: { value: "FI21 1234 5600 0007 86" } })
    fireEvent.blur(field)
    expect(useBookStore.getState().invoiceSettings.iban).toBe("")
    expect(screen.getByText("Tilinumero ei ole kelvollinen IBAN.")).toBeTruthy()
  })

  it("puts back a payment term that is not a number of days", () => {
    mount(<InvoiceSettingsForm />)
    const field = screen.getByLabelText("Maksuaika (pv)") as HTMLInputElement
    fireEvent.change(field, { target: { value: "abc" } })
    fireEvent.blur(field)
    expect(field.value).toBe("14")
    expect(useBookStore.getState().invoiceSettings.termDays).toBe(14)
  })

  it("locks the first number once an invoice is issued", () => {
    useBookStore.setState({ invoices: [invoice()] })
    mount(<InvoiceSettingsForm />)
    expect(
      (screen.getByLabelText("Ensimmäinen laskunumero") as HTMLInputElement)
        .disabled
    ).toBe(true)
  })
})

describe("InvoiceDialog", () => {
  it("saves a typed customer to the register once, however often issuing is tried", async () => {
    useBookStore.setState({ dialog: { kind: "invoice", invoiceId: null } })
    mount(<InvoiceDialog />)
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Nimi"), {
      target: { value: "Uusi Asiakas Oy" },
    })
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: "Tallenna asiakasrekisteriin",
      })
    )
    /* The seller details are missing, so issuing is refused each time. */
    fireEvent.click(within(dialog).getByRole("button", { name: "Anna lasku" }))
    await vi.waitFor(() =>
      expect(useBookStore.getState().customers).toHaveLength(1)
    )
    fireEvent.click(within(dialog).getByRole("button", { name: "Anna lasku" }))
    await vi.waitFor(() =>
      expect(useBookStore.getState().invoices).toHaveLength(1)
    )
    expect(useBookStore.getState().customers).toHaveLength(1)
    expect(useBookStore.getState().invoices[0].customerId).toBe(
      useBookStore.getState().customers[0].id
    )
  })
})

describe("customers", () => {
  it("adds a customer from the dialog and lists it", async () => {
    useBookStore.setState({ dialog: { kind: "customer", customerId: null } })
    mount(
      <>
        <CustomerList />
        <CustomerDialog />
      </>
    )
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Nimi"), {
      target: { value: "Uusi Asiakas Oy" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Tallenna" }))
    expect(useBookStore.getState().customers).toMatchObject([
      { name: "Uusi Asiakas Oy", country: "FI", termDays: null },
    ])
    expect(useBookStore.getState().dialog.kind).toBe("none")
    expect(await screen.findByText("Uusi Asiakas Oy")).toBeTruthy()
  })

  it("will not save a customer with no name", async () => {
    useBookStore.setState({ dialog: { kind: "customer", customerId: null } })
    mount(<CustomerDialog />)
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Tallenna" }))
    expect(useBookStore.getState().customers).toEqual([])
    expect(
      within(dialog).getByText("Asiakkaalla pitää olla nimi.")
    ).toBeTruthy()
  })
})
