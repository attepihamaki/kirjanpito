import Papa from "papaparse"

import { ibanIn, type BankRow } from "@/lib/domain/bank-csv"
import { formatAmountForCsv, parseAmount } from "@/lib/domain/money"

/**
 * Transactions fetched from a PSD2 account feed (Enable Banking), turned into
 * the shape the statement import already reviews (§8.16). Pure: no network.
 */

/** The fields of an Enable Banking transaction the import reads. */
export interface ApiTransaction {
  entry_reference?: string | null
  transaction_id?: string | null
  transaction_amount?: { amount?: string; currency?: string }
  credit_debit_indicator?: "CRDT" | "DBIT"
  creditor?: { name?: string | null } | null
  debtor?: { name?: string | null } | null
  creditor_account?: { iban?: string | null } | null
  debtor_account?: { iban?: string | null } | null
  booking_date?: string | null
  value_date?: string | null
  remittance_information?: string[] | null
  reference_number?: string | null
  bank_transaction_code?: { description?: string | null } | null
}

/** Rows for the transactions that have a booking date and a euro amount. */
export function apiRows(txs: readonly ApiTransaction[]): BankRow[] {
  const rows: BankRow[] = []
  for (const t of txs) {
    const date = t.booking_date ?? t.value_date ?? ""
    const abs = parseAmount(t.transaction_amount?.amount)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || abs === null) continue
    if (
      t.transaction_amount?.currency &&
      t.transaction_amount.currency !== "EUR"
    )
      continue
    const money =
      t.credit_debit_indicator === "DBIT" ? -Math.abs(abs) : Math.abs(abs)
    const party = money < 0 ? t.creditor : t.debtor
    const iban = ibanIn(
      (money < 0 ? t.creditor_account : t.debtor_account)?.iban ?? ""
    )
    rows.push({
      date,
      valueDate: t.value_date ?? undefined,
      amount: money,
      counterparty: party?.name?.trim() ?? "",
      message: (t.remittance_information ?? []).join(" ").trim(),
      reference: (t.reference_number ?? "").replace(/\s+/g, ""),
      ...(iban ? { iban } : {}),
      bankId: t.entry_reference ?? t.transaction_id ?? undefined,
      kind: t.bank_transaction_code?.description ?? "",
    })
  }
  return rows
}

/**
 * The rows written in OP's export layout, which `parseBankCsv` recognises as a
 * preset. The import dialog then needs no second input path.
 */
export function rowsToOpCsv(rows: readonly BankRow[]): string {
  return Papa.unparse(
    {
      fields: [
        "Kirjauspäivä",
        "Arvopäivä",
        "Määrä EUROA",
        "Selitys",
        "Saaja/Maksaja",
        "Viite",
        "Viesti",
        "Arkistointitunnus",
        "Saajan tilinumero",
      ],
      data: rows.map((r) => [
        r.date,
        r.valueDate ?? r.date,
        formatAmountForCsv(r.amount),
        r.kind,
        r.counterparty,
        `ref=${r.reference}`,
        r.message,
        r.bankId ?? "",
        r.iban ?? "",
      ]),
    },
    { delimiter: ";", newline: "\n" }
  )
}
