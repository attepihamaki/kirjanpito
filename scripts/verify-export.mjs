/*
 * Checks the static export in out/ for the things that can only go wrong at
 * build time, and that nothing else would notice until the site was live.
 *
 * Runs on `postbuild`, so it guards local builds and the Pages deploy alike:
 * a failure here fails `npm run build`, and the workflow never gets as far as
 * uploading an artifact.
 *
 * Each library check self-tests, so a marker that stops matching fails loudly
 * rather than turning its check into a no-op.
 */

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
 * The landing is the public document; these are only ever reached through
 * `await import()`. Each entry lists several markers because minifiers keep
 * string literals and mangle identifiers — the package name itself is usually
 * gone.
 */
const FORBIDDEN_ON_LANDING = [
  {
    name: "pdfjs-dist",
    markers: ["GlobalWorkerOptions", "PDFDocumentLoadingTask", "pdf.worker"],
  },
  {
    name: "@zip.js/zip.js",
    markers: [
      "Invalid password",
      "File contains encrypted entry",
      "Invalid authentication code",
    ],
  },
  {
    name: "papaparse",
    markers: ["MissingQuotes", "__parsed_extra", "TooFewFields"],
  },
  { name: "recharts", markers: ["recharts-wrapper", "CartesianGrid"] },
  { name: "pdf-lib", markers: ["Hopding/pdf-lib"] },
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

/*
 * 1. Every absolute path in the exported HTML carries the base path. A
 *    missed prefix is invisible locally at the root and 404s in production.
 */
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

// 2. The landing bundle contains none of the heavy libraries.
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

  /*
   * Self-test: the markers must still identify the library somewhere in the
   * export, or "absent from the landing" means nothing.
   */
  if (!markers.some((m) => allSource.includes(m))) {
    fail(
      `None of ${name}'s markers (${markers.join(", ")}) appear anywhere in ` +
        `the export. Either the library is no longer used — drop it from ` +
        `this list — or the markers are stale and this check is a no-op.`
    )
  }
}

if (!failures.length) {
  note(
    `${landingChunks.length} landing chunks free of ${FORBIDDEN_ON_LANDING.map((l) => l.name).join(", ")}`
  )
}

// 3. Things the export has to contain.
for (const [path, what] of [
  [join(OUT, "404.html"), "the 404 page Pages serves for unmatched paths"],
  [join(OUT, "pdf.worker.min.mjs"), "the pdf.js worker (copied on prebuild)"],
  [join(OUT, "og", "opengraph-image.png"), "the Open Graph card"],
  [join(OUT, "icons", "apple-touch-icon.png"), "the iOS home-screen icon"],
]) {
  if (!existsSync(path)) fail(`Missing ${relative(OUT, path)} — ${what}.`)
}

/*
 * The OG card has to be a real PNG: it is served by a host that types the
 * response from the file extension, and a crawler rejects anything else.
 */
const og = join(OUT, "og", "opengraph-image.png")
if (existsSync(og)) {
  const magic = readFileSync(og).subarray(0, 8)
  if (
    !magic.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    fail("out/og/opengraph-image.png is not a PNG.")
}

// 4. One <html> per document.
for (const file of htmlFiles) {
  const count = (readFileSync(file, "utf8").match(/<html[\s>]/g) ?? []).length
  if (count !== 1) {
    fail(`${relative(OUT, file)} has ${count} <html> elements, expected 1.`)
  }
}

/*
 * 5. Every document carries the Content Security Policy in its <head>. It is a
 *    meta tag rendered only in production, so nothing but the export shows it.
 */
const noPolicy = htmlFiles.filter((file) => {
  const html = readFileSync(file, "utf8")
  const at = html.indexOf('http-equiv="Content-Security-Policy"')
  return at < 0 || at > html.indexOf("</head>")
})
if (noPolicy.length > 0) {
  fail(
    `No Content-Security-Policy meta tag in the <head> of:\n` +
      noPolicy.map((f) => `    ${relative(OUT, f)}`).join("\n")
  )
}

/*
 * 6. The manifest and the service worker (CLAUDE.md §11b). Neither passes
 *    through Next's basePath, so every URL in the manifest is checked for the
 *    prefix and for a file behind it, and every path the worker precaches has
 *    to exist, because one missing file fails the worker's whole install.
 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const manifestFile = join(OUT, "manifest.webmanifest")
if (!existsSync(manifestFile)) {
  fail("Missing manifest.webmanifest, the web app manifest.")
} else if (basePath !== null) {
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"))
  const fileFor = (url) => join(OUT, url.slice(basePath.length))
  for (const key of ["id", "start_url", "scope"]) {
    const url = manifest[key]
    if (typeof url !== "string" || !url.startsWith(`${basePath}/`)) {
      fail(`manifest ${key} "${url}" does not carry the base path.`)
    } else if (!existsSync(join(fileFor(url), "index.html"))) {
      fail(`manifest ${key} "${url}" has no document behind it.`)
    }
  }
  for (const { src } of manifest.icons ?? []) {
    if (!src.startsWith(`${basePath}/`)) {
      fail(`manifest icon "${src}" does not carry the base path.`)
    } else if (!existsSync(fileFor(src))) {
      fail(`manifest icon "${src}" is not in the export.`)
    } else if (!readFileSync(fileFor(src)).subarray(0, 8).equals(PNG_MAGIC)) {
      fail(`manifest icon "${src}" is not a PNG.`)
    }
  }
  if (!manifest.icons?.length) fail("The manifest lists no icons.")
  if (!landingHtml.includes('rel="manifest"')) {
    fail("out/index.html does not link the manifest.")
  }
  if (!landingHtml.includes('rel="apple-touch-icon"')) {
    fail("out/index.html does not link the apple-touch-icon.")
  }
}

const swFile = join(OUT, "sw.js")
if (!existsSync(swFile)) {
  fail("Missing sw.js, the service worker (written by scripts/build-sw.mjs).")
} else {
  const sw = readFileSync(swFile, "utf8")
  const build = sw.match(/^const BUILD = (.*)$/m)
  if (!build) {
    fail("Could not read the precache list from out/sw.js.")
  } else {
    const paths = JSON.parse(build[1]).precache
    const missing = paths.filter((path) => {
      const file = join(OUT, path)
      return !existsSync(
        path === "" || path.endsWith("/") ? join(file, "index.html") : file
      )
    })
    if (missing.length > 0) {
      fail(
        `sw.js precaches files the export does not hold:\n` +
          missing.map((m) => `    ${m}`).join("\n")
      )
    }
    if (paths.includes("sw.js")) fail("sw.js precaches itself.")
    for (const needed of ["", "app/", "app/overview/", "pdf.worker.min.mjs"]) {
      if (!paths.includes(needed)) {
        fail(`sw.js does not precache "${needed}", so the app breaks offline.`)
      }
    }
    if (!paths.some((p) => p.startsWith("_next/static/"))) {
      fail("sw.js precaches no chunks.")
    }
    if (!failures.length) {
      note(`manifest and icons in place, sw.js precaches ${paths.length} files`)
    }
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
console.log(
  `  • ${htmlFiles.length} documents, one <html> and a CSP meta tag each`
)
console.log("  • 404, pdf.js worker and OG card present")
