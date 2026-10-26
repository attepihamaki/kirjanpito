/*
 * Copies pdfjs-dist's worker into public/ so it is served from a fixed,
 * predictable URL in both `next dev` and the static export.
 *
 * Resolving it through the bundler instead — new URL("pdfjs-dist/build/
 * pdf.worker.min.mjs", import.meta.url) — leaves Turbopack to decide whether
 * to copy the file as an asset or pull it into the module graph as a chunk,
 * and that decision differs between the dev server and `next build`.
 *
 * Runs on predev and prebuild, and always rewrites, so the copy can never
 * fall behind the installed version.
 */

import { copyFileSync, mkdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)

const pkgPath = require.resolve("pdfjs-dist/package.json")
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"))
const source = join(dirname(pkgPath), "build", "pdf.worker.min.mjs")
const target = join(process.cwd(), "public", "pdf.worker.min.mjs")

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)

console.log(`pdf.worker.min.mjs copied from pdfjs-dist@${version}`)
