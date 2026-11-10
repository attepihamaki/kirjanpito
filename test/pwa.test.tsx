import { describe, expect, it, vi } from "vitest"

import manifest from "@/app/manifest"
import { APP_ICONS, APP_SCOPE, APP_START_URL, appIconUrl } from "@/lib/pwa"
import { BASE_PATH } from "@/lib/site"
import { strategyFor } from "../scripts/sw/strategy.mjs"
import { worker } from "../scripts/sw/worker.mjs"

const SCOPE = "https://example.test/kirjanpito/"

describe("web app manifest (§11b)", () => {
  it("spells the base path out in every URL", () => {
    const m = manifest()
    expect(m.start_url).toBe(`${BASE_PATH}/app/`)
    expect(m.scope).toBe(`${BASE_PATH}/`)
    expect(m.id).toBe(APP_START_URL)
    expect(APP_START_URL.startsWith(APP_SCOPE)).toBe(true)
    for (const icon of m.icons ?? []) {
      expect(icon.src.startsWith(`${BASE_PATH}/icons/`)).toBe(true)
    }
  })

  it("lists the icons the route handler writes, the apple one aside", () => {
    const listed = (manifest().icons ?? []).map((icon) => icon.src)
    expect(listed).toEqual(
      APP_ICONS.filter((icon) => icon.purpose !== "apple").map((icon) =>
        appIconUrl(icon.file)
      )
    )
    expect(listed.length).toBeGreaterThan(0)
  })
})

describe("service worker strategy (§11b)", () => {
  it("answers hashed assets from the cache", () => {
    expect(
      strategyFor("GET", `${SCOPE}_next/static/chunks/a1b2.js`, SCOPE)
    ).toBe("static")
  })

  it("asks the network first for anything with a stable URL", () => {
    for (const path of [
      "",
      "app/vat/",
      "app/vat/index.txt?_rsc=abc",
      "pdf.worker.min.mjs",
      "manifest.webmanifest",
    ]) {
      expect(strategyFor("GET", SCOPE + path, SCOPE)).toBe("fresh")
    }
  })

  it("stays out of writes, other sites and its own script", () => {
    expect(strategyFor("POST", `${SCOPE}app/`, SCOPE)).toBe("pass")
    expect(strategyFor("GET", "https://bank.test/accounts", SCOPE)).toBe("pass")
    expect(strategyFor("GET", "https://example.test/other-site/", SCOPE)).toBe(
      "pass"
    )
    expect(strategyFor("GET", `${SCOPE}sw.js`, SCOPE)).toBe("pass")
  })
})

/* -------------------------------------------------------------------------
 * The worker, run against a fake global scope
 * ---------------------------------------------------------------------- */

type Listener = (event: {
  request: Request
  waitUntil: (p: Promise<unknown>) => void
  respondWith: (p: Promise<Response> | Response) => void
}) => void

function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>()
  const key = (request: Request | string) => {
    const url = new URL(typeof request === "string" ? request : request.url)
    return url.origin + url.pathname
  }
  return {
    stores,
    open: async (name: string) => {
      const store = stores.get(name) ?? new Map<string, Response>()
      stores.set(name, store)
      return {
        addAll: async (requests: Request[]) => {
          for (const r of requests) store.set(key(r), new Response(`cached`))
        },
        match: async (request: Request) => store.get(key(request))?.clone(),
      }
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  }
}

function start(version: string, caches = fakeCaches()) {
  const listeners = new Map<string, Listener>()
  const fetch = vi.fn<(request: Request) => Promise<Response>>()
  const self = {
    registration: { scope: SCOPE },
    caches,
    fetch,
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
  }
  worker(
    self as unknown as Parameters<typeof worker>[0],
    { version, precache: ["", "app/vat/", "_next/static/chunks/a.js"] },
    strategyFor
  )

  const lifecycle = async (type: "install" | "activate") => {
    let done: Promise<unknown> = Promise.resolve()
    listeners.get(type)!({
      request: new Request(SCOPE),
      waitUntil: (p) => (done = p),
      respondWith: () => {},
    })
    await done
  }
  const request = (url: string, init?: RequestInit) => {
    let answer: Promise<Response> | Response | undefined
    listeners.get("fetch")!({
      request: new Request(url, init),
      waitUntil: () => {},
      respondWith: (p) => (answer = p),
    })
    return answer
  }
  return { self, caches, fetch, lifecycle, request }
}

describe("service worker (§11b)", () => {
  it("stores the whole build on install and takes over", async () => {
    const sw = start("v1")
    await sw.lifecycle("install")
    expect([...sw.caches.stores.get("kirjanpito-v1")!.keys()]).toEqual([
      SCOPE,
      `${SCOPE}app/vat/`,
      `${SCOPE}_next/static/chunks/a.js`,
    ])
    expect(sw.self.skipWaiting).toHaveBeenCalled()
  })

  it("deletes its own older caches and nobody else's", async () => {
    const caches = fakeCaches()
    await caches.open("kirjanpito-old")
    await caches.open("another-site")
    const sw = start("v2", caches)
    await sw.lifecycle("install")
    await sw.lifecycle("activate")
    expect(await caches.keys()).toEqual(["another-site", "kirjanpito-v2"])
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })

  it("serves a document from the network while there is one", async () => {
    const sw = start("v1")
    await sw.lifecycle("install")
    sw.fetch.mockResolvedValue(new Response("network"))
    const res = await sw.request(`${SCOPE}app/vat/`)
    expect(await res!.text()).toBe("network")
    // A newer document is never stored beside the older build's chunks.
    const kept = sw.caches.stores.get("kirjanpito-v1")!.get(`${SCOPE}app/vat/`)
    expect(await kept!.clone().text()).toBe("cached")
  })

  it("falls back to the stored document offline, whatever the query", async () => {
    const sw = start("v1")
    await sw.lifecycle("install")
    sw.fetch.mockRejectedValue(new TypeError("offline"))
    const res = await sw.request(`${SCOPE}app/vat/?_rsc=abc`)
    expect(await res!.text()).toBe("cached")
  })

  it("answers a hashed asset without the network", async () => {
    const sw = start("v1")
    await sw.lifecycle("install")
    const res = await sw.request(`${SCOPE}_next/static/chunks/a.js`)
    expect(await res!.text()).toBe("cached")
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it("leaves requests it has no business with alone", async () => {
    const sw = start("v1")
    await sw.lifecycle("install")
    expect(sw.request("https://bank.test/accounts")).toBeUndefined()
    expect(sw.request(`${SCOPE}app/`, { method: "POST" })).toBeUndefined()
  })
})
