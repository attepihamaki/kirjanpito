/*
 * How the service worker answers a request (CLAUDE.md §11b).
 *
 * `scripts/build-sw.mjs` writes this function's source into the worker with
 * `toString()`, so it must stand alone: no imports, and nothing read from
 * this module's scope.
 */

/**
 * - `"pass"`: the worker stays out of it. Anything that is not a GET, anything
 *   outside the site's scope (the bank proxy, the other sites on a shared
 *   host) and the worker script itself.
 * - `"static"`: cache first. Files under `_next/static/` carry a content hash
 *   in their name, so a cached copy is never stale.
 * - `"fresh"`: network first, the cache when offline. Documents, their RSC
 *   payloads and the pdf.js worker keep one URL across builds, so a cached
 *   copy served online would mix two builds.
 *
 * @param {string} method
 * @param {string} url absolute URL of the request
 * @param {string} scope absolute URL of the worker's scope, ending in "/"
 * @returns {"pass" | "static" | "fresh"}
 */
export function strategyFor(method, url, scope) {
  if (method !== "GET") return "pass"
  if (!url.startsWith(scope)) return "pass"
  const path = url.slice(scope.length).split(/[?#]/)[0]
  if (path === "sw.js") return "pass"
  return path.startsWith("_next/static/") ? "static" : "fresh"
}
