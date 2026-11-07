/*
 * Fails when the documentation points at something that is gone.
 *
 * Two kinds of pointer are checked:
 *
 * - A file path in backticks in CLAUDE.md or spec/*.md must exist in the
 *   repository.
 * - A section reference (§8.4) in those files, and every "CLAUDE.md §8.4" in
 *   the sources, must name a heading of the specification.
 *
 * Paths under docs/ are local-only and gitignored (except docs/specs/), so
 * they are not checked. A name is not checked when it holds a placeholder
 * (`{`, `<`, `*`) or is a file the build writes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const SPEC_FILES = [
  "CLAUDE.md",
  ...readdirSync(join(ROOT, "spec"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => `spec/${f}`),
]

const read = (file) => readFileSync(join(ROOT, file), "utf8")

/* ---------------------------------------------------------------- headings */

const headings = new Set()
for (const file of SPEC_FILES) {
  for (const line of read(file).split(/\r?\n/)) {
    const m = /^#{2,3} (\d+[a-z]?(?:\.\d+)?)[ .]/.exec(line)
    if (m) headings.add(m[1])
  }
}

/* ------------------------------------------------------------------- paths */

const PATH_ROOTS = [
  "app/",
  "components/",
  "data/",
  "hooks/",
  "lib/",
  "public/",
  "scripts/",
  "spec/",
  "stores/",
  "test/",
  ".github/",
]
const PATH_FILES = new Set([
  "CLAUDE.md",
  "README.md",
  "AGENTS.md",
  "package.json",
  "next.config.ts",
  "eslint.config.mjs",
  "vitest.config.ts",
  "components.json",
])
/* Written by the build or the user, never committed. */
const GENERATED = [/^public\/pdf\.worker\.min\.mjs$/, /^public\/CNAME$/]

function looksLikePath(text) {
  if (/[{}<>*\s]/.test(text)) return false
  if (PATH_FILES.has(text)) return true
  return PATH_ROOTS.some((root) => text.startsWith(root)) && /\.[a-z]+$/.test(text)
}

const problems = []

for (const file of SPEC_FILES) {
  const text = read(file)
  const lines = text.split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const candidate = m[1].replace(/:\d+$/, "")
      if (!looksLikePath(candidate)) continue
      if (GENERATED.some((re) => re.test(candidate))) continue
      if (!existsSync(join(ROOT, candidate))) {
        problems.push(`${file}:${i + 1}: no such file: ${candidate}`)
      }
    }
    for (const m of line.matchAll(/§(\d+[a-z]?(?:\.\d+)?)/g)) {
      const ref = m[1].replace(/\.$/, "")
      if (!headings.has(ref) && !headings.has(ref.split(".")[0])) {
        problems.push(`${file}:${i + 1}: no section ${ref}`)
      } else if (ref.includes(".") && !headings.has(ref)) {
        problems.push(`${file}:${i + 1}: no section ${ref}`)
      }
    }
  })
}

/* --------------------------------------------------- section refs in code */

const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git", "test-results", "playwright-report"])
const CODE = /\.(ts|tsx|mjs|css|yml)$/

function* walk(dir) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (SKIP_DIRS.has(name)) continue
    const rel = dir ? `${dir}/${name}` : name
    const stat = statSync(join(ROOT, rel))
    if (stat.isDirectory()) yield* walk(rel)
    else if (CODE.test(name)) yield rel
  }
}

for (const file of walk("")) {
  const lines = read(file).split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/CLAUDE\.md\s+§(\d+[a-z]?(?:\.\d+)?)/g)) {
      if (!headings.has(m[1])) problems.push(`${file}:${i + 1}: no section ${m[1]}`)
    }
  })
}

if (problems.length) {
  console.error(`Documentation points at ${problems.length} thing(s) that do not exist:\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`Documentation pointers ok (${headings.size} sections).`)
