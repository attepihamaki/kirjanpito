/*
 * Serves the static export in `out/` under the same prefix GitHub Pages uses,
 * so the visual tests load exactly the files a deploy would publish.
 */
import { createServer } from "node:http"
import { existsSync, readFileSync, statSync } from "node:fs"
import { extname, join, normalize, resolve } from "node:path"

const ROOT = resolve("out")
const PREFIX = "/kirjanpito"
const PORT = Number(process.env.PORT ?? 4173)

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
}

if (!existsSync(join(ROOT, "index.html"))) {
  console.error("out/ has no export. Run `npm run build` first.")
  process.exit(1)
}

function resolveFile(pathname) {
  const rel = normalize(decodeURIComponent(pathname.slice(PREFIX.length)))
  const file = join(ROOT, rel)
  if (!file.startsWith(ROOT)) return null
  if (existsSync(file) && statSync(file).isDirectory()) {
    const index = join(file, "index.html")
    return existsSync(index) ? index : null
  }
  return existsSync(file) ? file : null
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost")
  const file = pathname.startsWith(PREFIX) ? resolveFile(pathname) : null
  const found = file ?? join(ROOT, "404.html")
  res.writeHead(file ? 200 : 404, {
    "content-type": TYPES[extname(found)] ?? "application/octet-stream",
  })
  res.end(readFileSync(found))
}).listen(PORT, () => console.log(`http://localhost:${PORT}${PREFIX}/`))
