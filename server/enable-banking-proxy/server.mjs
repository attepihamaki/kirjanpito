/*
 * A stateless pass-through to the Enable Banking API, for one person's own
 * server. Enable Banking sends no CORS headers and wants every request signed
 * with an RS256 key that must not reach a browser, so the browser talks to this
 * process and this process talks to Enable Banking.
 *
 * It stores nothing and logs no transaction data. Zero dependencies: the
 * signing is node:crypto.
 *
 * Environment:
 *   EB_APP_ID          application id (the JWT `kid`)
 *   EB_KEY_FILE        path to the PEM private key
 *   PROXY_TOKEN        shared secret the app sends as a Bearer token
 *   ALLOWED_ORIGIN     the app's origin, e.g. http://localhost:3000
 *   PORT               default 8787
 */
import { createServer } from "node:http"
import { createSign } from "node:crypto"
import { readFileSync } from "node:fs"

const API = "https://api.enablebanking.com"
const { EB_APP_ID, EB_KEY_FILE, PROXY_TOKEN, ALLOWED_ORIGIN } = process.env
const PORT = Number(process.env.PORT ?? 8787)

if (!EB_APP_ID || !EB_KEY_FILE || !PROXY_TOKEN || !ALLOWED_ORIGIN) {
  console.error(
    "Set EB_APP_ID, EB_KEY_FILE, PROXY_TOKEN and ALLOWED_ORIGIN (see the header of this file)."
  )
  process.exit(1)
}
const key = readFileSync(EB_KEY_FILE, "utf8")

const b64url = (v) => Buffer.from(v).toString("base64url")

/** A JWT valid for one hour, signed with the application key. */
function jwt() {
  const iat = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ typ: "JWT", alg: "RS256", kid: EB_APP_ID }))
  const body = b64url(
    JSON.stringify({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat,
      exp: iat + 3600,
    })
  )
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(key)
  return `${head}.${body}.${b64url(sig)}`
}

async function eb(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      "Content-Type": "application/json",
    },
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { message: text }
  }
  if (!res.ok) throw Object.assign(new Error(json.message ?? res.statusText), { status: res.status })
  return json
}

/** Every booked transaction since `from`, following the paging key. */
async function transactions(account, from) {
  const out = []
  let continuation = ""
  do {
    const q = new URLSearchParams({ date_from: from, transaction_status: "BOOK" })
    if (continuation) q.set("continuation_key", continuation)
    const page = await eb(`/accounts/${encodeURIComponent(account)}/transactions?${q}`)
    out.push(...(page.transactions ?? []))
    continuation = page.continuation_key ?? ""
  } while (continuation)
  return out
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let s = ""
    req.on("data", (c) => {
      s += c
      if (s.length > 1e5) reject(new Error("body too large"))
    })
    req.on("end", () => resolve(s ? JSON.parse(s) : {}))
    req.on("error", reject)
  })

createServer(async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  }
  const send = (status, data) => {
    res.writeHead(status, { ...cors, "Content-Type": "application/json" })
    res.end(JSON.stringify(data))
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors)
    return res.end()
  }
  if (req.headers.authorization !== `Bearer ${PROXY_TOKEN}`) {
    return send(401, { message: "unauthorized" })
  }
  try {
    const url = new URL(req.url, "http://x")
    if (req.method === "GET" && url.pathname === "/banks") {
      const country = url.searchParams.get("country") ?? "FI"
      const data = await eb(`/aspsps?country=${encodeURIComponent(country)}`)
      return send(200, data)
    }
    if (req.method === "POST" && url.pathname === "/auth") {
      const { bank, country, redirectUrl, state, personal } = await readBody(req)
      const validUntil = new Date(Date.now() + 89 * 864e5).toISOString()
      const data = await eb("/auth", {
        method: "POST",
        body: JSON.stringify({
          access: { valid_until: validUntil },
          aspsp: { name: bank, country },
          state,
          redirect_url: redirectUrl,
          psu_type: personal ? "personal" : "business",
        }),
      })
      return send(200, { url: data.url })
    }
    if (req.method === "POST" && url.pathname === "/session") {
      const { code } = await readBody(req)
      const data = await eb("/sessions", { method: "POST", body: JSON.stringify({ code }) })
      return send(200, {
        sessionId: data.session_id,
        accounts: (data.accounts ?? []).map((a) => ({
          uid: a.uid,
          iban: a.account_id?.iban ?? "",
          name: a.name ?? "",
        })),
      })
    }
    if (req.method === "GET" && url.pathname === "/transactions") {
      const account = url.searchParams.get("account")
      const from = url.searchParams.get("from")
      if (!account || !/^\d{4}-\d{2}-\d{2}$/.test(from ?? "")) {
        return send(400, { message: "account and from=YYYY-MM-DD are required" })
      }
      return send(200, { transactions: await transactions(account, from) })
    }
    return send(404, { message: "not found" })
  } catch (e) {
    return send(e.status ?? 500, { message: String(e.message ?? e) })
  }
}).listen(PORT, () => console.log(`enable-banking-proxy on :${PORT}`))
