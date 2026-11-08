import {
  apiRows,
  rowsToOpCsv,
  type ApiTransaction,
} from "@/lib/domain/bank-api"

/**
 * Client for the account-feed proxy (`server/enable-banking-proxy`). The proxy
 * is the only host besides the site itself the page may contact, and only when
 * `NEXT_PUBLIC_BANK_PROXY_URL` was set at build time (`CONTENT_SECURITY_POLICY`).
 */

export const BANK_PROXY_URL = process.env.NEXT_PUBLIC_BANK_PROXY_URL ?? ""

const STORE = "kirjanpito.bank-sync"
const STATE = "kirjanpito.bank-sync.state"

export interface LinkedAccount {
  uid: string
  iban: string
  name: string
}

/** What this browser remembers about the link. Never part of the bookkeeping file. */
export interface BankLink {
  token: string
  accounts: LinkedAccount[]
}

export function loadLink(): BankLink {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null")
    if (v && typeof v.token === "string" && Array.isArray(v.accounts)) return v
  } catch {
    /* unreadable storage is the same as no link */
  }
  return { token: "", accounts: [] }
}

export function saveLink(link: BankLink): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(link))
  } catch {
    /* the link just has to be made again */
  }
}

async function call<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BANK_PROXY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message ?? String(res.status))
  return data as T
}

export async function listBanks(token: string): Promise<string[]> {
  const data = await call<{ aspsps?: { name: string }[] }>(
    token,
    "/banks?country=FI"
  )
  return (data.aspsps ?? []).map((b) => b.name).sort()
}

/** Sends the browser to the bank. Returns only if the proxy refused. */
export async function startLink(
  token: string,
  bank: string,
  personal: boolean
): Promise<void> {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE, state)
  const redirectUrl = `${location.origin}${location.pathname}`
  const { url } = await call<{ url: string }>(token, "/auth", {
    method: "POST",
    body: JSON.stringify({ bank, country: "FI", redirectUrl, state, personal }),
  })
  location.assign(url)
}

/**
 * Finishes a link when the bank has sent the browser back with `?code&state`.
 * Returns the new link, or null when the URL carries no matching callback.
 */
export async function finishLink(token: string): Promise<BankLink | null> {
  const q = new URLSearchParams(location.search)
  const code = q.get("code")
  const state = q.get("state")
  if (!code || !state || state !== sessionStorage.getItem(STATE)) return null
  sessionStorage.removeItem(STATE)
  history.replaceState(null, "", location.pathname)
  const data = await call<{ accounts: LinkedAccount[] }>(token, "/session", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
  return { token, accounts: data.accounts }
}

/** The statement text for an account since `from`, ready for the import dialog. */
export async function fetchStatement(
  token: string,
  account: string,
  from: string
): Promise<{ text: string; count: number }> {
  const q = new URLSearchParams({ account, from })
  const data = await call<{ transactions: ApiTransaction[] }>(
    token,
    `/transactions?${q}`
  )
  const rows = apiRows(data.transactions)
  return { text: rowsToOpCsv(rows), count: rows.length }
}
