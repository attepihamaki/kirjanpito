// @vitest-environment jsdom
import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BankImportDialog } from "@/components/bank/bank-import-dialog"
import { LangProvider } from "@/components/lang-provider"
import { toast } from "@/components/ui/toast"
import { defaultCategories } from "@/lib/domain/accounts"
import { emptyParty, type Invoice } from "@/lib/domain/invoice"
import type { Entry } from "@/lib/domain/types"
import { useBookStore } from "@/stores/book-store"

/* A bank row pays a whole invoice only when its reference says so (§8.16, §8.27). */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/ledger",
}))
vi.mock("@/lib/ui/confirm", () => ({ confirm: vi.fn(async () => true) }))

/* 100,00 + 25,5 % is 125,50 and 50,00 + 14 % is 57,00; together 182,50. */
const sale = (id: string, amount: number, vatRate: number): Entry => ({
  id,
  date: "2026-11-01",
  description: "Lasku 1001 – Asiakas Oy",
  type: "income",
  catId: "300-domestic",
  amount,
  vatRate,
  amountMode: "net",
  paidOn: null,
})

const invoice: Invoice = {
  id: "i1",
  number: 1001,
  date: "2026-11-01",
  dueDate: "2026-11-15",
  supplyFrom: null,
  supplyTo: null,
  customerId: null,
  customer: emptyParty(),
  language: "fi",
  rows: [],
  note: "",
  terms: "",
  reference: "10016",
  seller: null,
  issuedAt: "2026-11-01T09:00:00.000Z",
  entryIds: ["a", "b"],
  credits: null,
}

const HEADER =
  "Kirjauspäivä;Määrä EUROA;Saaja/Maksaja;Viesti;Viite;Arkistointitunnus"

function open(row: string) {
  useBookStore.setState({
    dialog: {
      kind: "bank-import",
      text: [HEADER, row].join("\n"),
      fileName: "tiliote.csv",
    },
  })
  render(
    <LangProvider lang="fi">
      <BankImportDialog />
    </LangProvider>
  )
}

const paidOn = () => useBookStore.getState().entries.map((e) => e.paidOn)

beforeEach(() => {
  vi.spyOn(toast, "add").mockImplementation(() => "t1")
  useBookStore.setState({
    open: true,
    hydrated: true,
    cats: defaultCategories(),
    entries: [sale("a", 10_000, 25.5), sale("b", 5000, 14)],
    invoices: [invoice],
    yearsArchived: {},
    form5Filed: {},
    vatFiled: {},
    categoryRules: [],
  })
})

describe("bank import with invoices", () => {
  it("pays every entry of the invoice for a row that carries its reference", async () => {
    open("2026-11-10;182,50;Asiakas Oy;Lasku;10016;ABC1")
    fireEvent.click(await screen.findByRole("button", { name: /^Kirjaa/ }))
    await vi.waitFor(() =>
      expect(paidOn()).toEqual(["2026-11-10", "2026-11-10"])
    )
  })

  it("pays only the entry the amount matched when there is no reference", async () => {
    open("2026-11-10;57,00;Asiakas Oy;Osamaksu;;ABC2")
    fireEvent.click(await screen.findByRole("button", { name: /^Kirjaa/ }))
    await vi.waitFor(() => expect(paidOn()).toEqual([null, "2026-11-10"]))
  })
})
