// Checks the static export in out/ for the things that can only go wrong at
// build time, and that nothing else would notice until the site was live.
//
// Runs on `postbuild`, so it guards local builds and the Pages deploy alike:
// a failure here fails `npm run build`, and the workflow never gets as far as
// uploading an artifact.
//
// Until this existed the same checks were run by hand after each change, and
// pasted into commit messages. One of them was quietly broken: the landing
// bundle was grepped for the string "papaparse", which does not survive
// minification, so that library was never actually being checked. Hence the
// self-test below — a marker that stops matching must fail loudly rather than
// turn its check into a no-op.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const OUT = "out"
const SITE_TS = join("lib", "site.ts")

const failures = []
const notes = []

const fail = (msg) => failures.push(msg)
const note = (msg) => notes.push(msg)

/**
 * Libraries that must not reach the landing page's bundle (CLAUDE.md §11b).
 *
 * The landing is the public document; these four are only ever reached through
 * `await import()`. Each entry lists several markers because minifiers keep
 * string literals and mangle identifiers — the package name itself is usually
 * gone.
 */
const FORBIDDEN_ON_LANDING = [
  {
    name: "pdfjs-dist",
    markers: ["GlobalWorkerOptions", "PDFDocumentLoadingTask", "pdf.worker"],
  },
  { name: "jszip", markers: ["JSZip"] },
  {
    name: "papaparse",
    markers: ["MissingQuotes", "__parsed_extra", "TooFewFields"],
  },
  { name: "recharts", markers: ["recharts-wrapper", "CartesianGrid"] },
]

function walk(dir, match) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...walk(path, match))
    else if (match(entry)) found.push(path)
  }
  return found
}

function basePathFromSource() {
  const src = readFileSync(SITE_TS, "utf8")
  const m = src.match(/export const BASE_PATH = "([^"]*)"/)
  if (!m) {
    fail(`Could not read BASE_PATH from ${SITE_TS} — has it been renamed?`)
    return null
  }
  return m[1]
}

// ---------------------------------------------------------------------------

if (!existsSync(OUT)) {
  console.error(`✗ ${OUT}/ does not exist — run \`next build\` first.`)
  process.exit(1)
}

const htmlFiles = walk(OUT, (f) => f.endsWith(".html"))
const chunkDir = join(OUT, "_next", "static", "chunks")
const allChunks = existsSync(chunkDir)
  ? walk(chunkDir, (f) => f.endsWith(".js"))
  : []

// 1. Every absolute path in the exported HTML carries the base path.
//    A missed prefix is invisible locally at the root and 404s in production.
const basePath = basePathFromSource()
if (basePath !== null) {
  const bad = new Set()
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8")
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (basePath === "" || url.startsWith(`${basePath}/`)) continue
      bad.add(`${relative(OUT, file)} → ${url}`)
    }
  }
  if (bad.size > 0) {
    fail(
      `Absolute paths missing the base path "${basePath}":\n` +
        [...bad].map((b) => `    ${b}`).join("\n")
    )
  } else {
    note(
      basePath === ""
        ? `base path is empty — prefix check skipped`
        : `all absolute paths in ${htmlFiles.length} HTML files carry "${basePath}"`
    )
  }
}

// 2. The landing bundle contains none of the four heavy libraries.
const landingHtml = readFileSync(join(OUT, "index.html"), "utf8")
const landingChunks = [
  ...new Set(
    [...landingHtml.matchAll(/(?:href|src)="([^"]*\/_next\/[^"]*\.js)"/g)].map(
      ([, url]) => join(OUT, url.replace(/^.*\/_next\//, "_next/"))
    )
  ),
].filter(existsSync)

if (landingChunks.length === 0) {
  fail("Found no JS chunks referenced by out/index.html — the check is blind.")
}

const landingSource = landingChunks.map((f) => readFileSync(f, "utf8")).join("")
const allSource = allChunks.map((f) => readFileSync(f, "utf8")).join("")

for (const { name, markers } of FORBIDDEN_ON_LANDING) {
  const onLanding = markers.filter((m) => landingSource.includes(m))
  if (onLanding.length > 0) {
    fail(
      `${name} reached the landing bundle (matched ${onLanding.join(", ")}). ` +
        `It must be behind an \`await import()\` — see CLAUDE.md §11b.`
    )
    continue
  }

  // Self-test: the markers must still identify the library somewhere in the
  // export, or "absent from the landing" means nothing.
  if (!markers.some((m) => allSource.includes(m))) {
    fail(
      `None of ${name}'s markers (${markers.join(", ")}) appear anywhere in ` +
        `the export. Either the library is no longer used — drop it from ` +
        `this list — or the markers are stale and this check is a no-op.`
    )
  }
}

if (!failures.length) {
  note(`${landingChunks.length} landing chunks free of the four libraries`)
}

// 3. Things the export has to contain.
for (const [path, what] of [
  [join(OUT, "404.html"), "the 404 page Pages serves for unmatched paths"],
  [join(OUT, "pdf.worker.min.mjs"), "the pdf.js worker (copied on prebuild)"],
  [join(OUT, "og", "opengraph-image.png"), "the Open Graph card"],
]) {
  if (!existsSync(path)) fail(`Missing ${relative(OUT, path)} — ${what}.`)
}

// The OG card has to be a real PNG: it is served by a host that types the
// response from the file extension, and a crawler rejects anything else.
const og = join(OUT, "og", "opengraph-image.png")
if (existsSync(og)) {
  const magic = readFileSync(og).subarray(0, 8)
  if (
    !magic.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    fail("out/og/opengraph-image.png is not a PNG.")
}

// 4. One <html> per document. Two root layouts used to produce two.
for (const file of htmlFiles) {
  const count = (readFileSync(file, "utf8").match(/<html[\s>]/g) ?? []).length
  if (count !== 1) {
    fail(`${relative(OUT, file)} has ${count} <html> elements, expected 1.`)
  }
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n✗ Export check failed:\n`)
  for (const f of failures) console.error(`  • ${f}\n`)
  process.exit(1)
}

console.log("✓ Export check passed:")
for (const n of notes) console.log(`  • ${n}`)
console.log(`  • ${htmlFiles.length} documents, one <html> each`)
console.log("  • 404, pdf.js worker and OG card present")
