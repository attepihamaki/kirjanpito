// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EntryDialog } from "@/components/entry/entry-dialog"
import { LangProvider } from "@/components/lang-provider"
import { ToastProvider } from "@/components/ui/toast"
import { defaultCategories } from "@/lib/domain/accounts"
import { virtualBarcode } from "@/lib/domain/invoice-barcode"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* How a bill received is paid, typed or read from its virtual barcode (§8.30). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const bill: Entry = {
  id: "b1",
  voucher: 1,
  date: "2026-11-02",
  description: "Sähkölasku",
  type: "expense",
  catId: "333",
  amount: 12_400,
  vatRate: 25.5,
  amountMode: "gross",
  paidOn: null,
}

function mount(entry: Entry = bill) {
  useBookStore.setState({
    open: true,
    hydrated: true,
    entries: [entry],
    cats: defaultCategories(),
    customers: [],
    year: 2026,
    month: 0,
    vatFiled: {},
    form5Filed: {},
    yearsArchived: {},
    invoices: [],
    changeLog: [],
    dialog: { kind: "entry", mode: "edit", entryId: entry.id },
  })
  render(
    <LangProvider lang="fi">
      <ToastProvider>
        <EntryDialog registerDropTarget={() => {}} />
      </ToastProvider>
    </LangProvider>
  )
}

describe("payment details of a bill", () => {
  beforeEach(() => {
    useBookStore.setState({ dialog: { kind: "none" } })
  })

  it("fills the account, the reference and the due date from a pasted barcode", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("tab", { name: /^Maksu/ }))
    const code = virtualBarcode({
      iban: "FI2112345600000785",
      cents: 12_400,
      reference: "1232",
      dueDate: "2026-11-20",
    })!
    await user.click(screen.getByLabelText("Virtuaaliviivakoodi"))
    await user.paste(code)

    expect(screen.getByLabelText("Saajan tilinumero (IBAN)")).toHaveValue(
      "FI21 1234 5600 0007 85"
    )
    expect(screen.getByLabelText("Viite")).toHaveValue("1232")

    await user.click(screen.getByRole("button", { name: /^Tallenna$/ }))
    expect(useBookStore.getState().entries[0]).toMatchObject({
      iban: "FI2112345600000785",
      reference: "1232",
      due: "2026-11-20",
    })
  })

  it("refuses an IBAN whose check digits fail", async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole("tab", { name: /^Maksu/ }))
    await user.type(
      screen.getByLabelText("Saajan tilinumero (IBAN)"),
      "FI2112345600000786"
    )
    await user.click(screen.getByRole("button", { name: /^Tallenna$/ }))
    expect(screen.getByText(/ei ole kelvollinen IBAN/)).toBeInTheDocument()
    expect(useBookStore.getState().entries[0].iban).toBeUndefined()
  })
})
