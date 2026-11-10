/*
 * The service worker's body (CLAUDE.md §11b).
 *
 * `scripts/build-sw.mjs` writes this function's source into `out/sw.js` with
 * `toString()` and calls it there, so it must stand alone: no imports, and
 * nothing read from this module's scope. Everything it needs arrives as an
 * argument, which is also what lets a test run it against a fake `self`.
 */

/**
 * @param {ServiceWorkerGlobalScope} self
 * @param {{ version: string, precache: string[] }} build `precache` holds
 *   every file of the export the app needs offline, as paths relative to the
 *   scope. `version` changes whenever any of them does.
 * @param {(method: string, url: string, scope: string) => "pass" | "static" | "fresh"} strategyFor
 */
export function worker(self, build, strategyFor) {
  /*
   * The origin may be shared with other sites (GitHub Pages serves every
   * project of an account from one), and Cache Storage is per origin. The
   * prefix marks the caches that are this site's to delete.
   */
  const PREFIX = "kirjanpito-"
  const CACHE = PREFIX + build.version
  const SCOPE = self.registration.scope
  /** How long a document may take before the cached copy is shown instead. */
  const TIMEOUT_MS = 4000

  /*
   * One build, whole or not at all: `addAll` rejects when any file fails, the
   * install fails with it and the browser tries again on the next visit.
   * Files with one URL across builds skip the HTTP cache, which could
   * otherwise hand over the previous build's copy.
   */
  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const cache = await self.caches.open(CACHE)
        await cache.addAll(
          build.precache.map(
            (path) =>
              new Request(new URL(path, SCOPE), {
                cache: path.startsWith("_next/static/") ? "default" : "reload",
              })
          )
        )
        await self.skipWaiting()
      })()
    )
  })

  /*
   * A new build takes over at once. Online, an open page already came from
   * the network, so it is the new build too and nothing has to prompt for a
   * reload.
   */
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const names = await self.caches.keys()
        await Promise.all(
          names
            .filter((name) => name.startsWith(PREFIX) && name !== CACHE)
            .map((name) => self.caches.delete(name))
        )
        await self.clients.claim()
      })()
    )
  })

  self.addEventListener("fetch", (event) => {
    const { request } = event
    const strategy = strategyFor(request.method, request.url, SCOPE)
    if (strategy === "pass") return
    event.respondWith(
      strategy === "static" ? cacheFirst(request) : networkFirst(request)
    )
  })

  /*
   * The query is ignored because Next adds `?_rsc=…` to payload requests and
   * a hash to the favicon, and the export holds one file for each path.
   */
  async function cached(request) {
    const cache = await self.caches.open(CACHE)
    return cache.match(request, { ignoreSearch: true, ignoreVary: true })
  }

  async function cacheFirst(request) {
    return (await cached(request)) ?? self.fetch(request)
  }

  /*
   * The network's answer is returned as it is and never stored: the cache
   * holds exactly one build, and a document from a newer one would point at
   * chunks it does not have. A redirect passes through too, which is how a
   * moved site reaches a browser that still has this worker.
   */
  async function networkFirst(request) {
    const fallback = await cached(request)
    if (!fallback) return self.fetch(request)
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(fallback), TIMEOUT_MS)
      self.fetch(request).then(
        (response) => {
          clearTimeout(timer)
          resolve(response)
        },
        () => {
          clearTimeout(timer)
          resolve(fallback)
        }
      )
    })
  }
}
