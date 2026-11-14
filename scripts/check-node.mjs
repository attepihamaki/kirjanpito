/*
 * Stops `npm run dev` before Next starts when this Node gives request headers
 * a null prototype, as Node 27 does. Next 16.4's dev runtime calls
 * `headers.hasOwnProperty`, so on such a Node every page answers 500 with
 * "rawHeaders.hasOwnProperty is not a function".
 *
 * It tests the behaviour, not the version number, so it stays quiet once
 * either side changes. `.nvmrc` holds the version the project is run on.
 */

import { readFileSync } from "node:fs"
import { createServer, get } from "node:http"

const nullHeaders = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    resolve(Object.getPrototypeOf(req.headers) === null)
    res.end()
    server.close()
  })
  server.on("error", reject)
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address()
    get({ host: "127.0.0.1", port }, (res) => res.resume()).on("error", reject)
  })
})

if (nullHeaders) {
  let pinned = "the version in .nvmrc"
  try {
    pinned = readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim()
  } catch {}
  console.error(
    `Node ${process.version} gives request headers no prototype, and the Next dev server fails on every page.\n` +
      `Run it on Node ${pinned} instead, for example: fnm exec --using=.nvmrc npm run dev`
  )
  process.exit(1)
}
