/*
 * Release notes from Conventional Commit subjects.
 *
 *   node scripts/release-notes.mjs [--from <ref>] [--to <ref>] [--title <text>] [--all] [--json]
 *
 * With no --from it starts after the newest tag, or at the first commit when
 * there is none. --to defaults to HEAD. Only what a user can notice is listed:
 * `feat`, `fix` and `perf`, and any commit marked breaking with `!`. --all adds
 * the rest (docs, tests, CI, refactors), which are written for developers.
 * --json prints the entries instead of Markdown, for something that renders
 * them itself.
 */
import { execFileSync } from "node:child_process"

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()

const TYPES = [
  ["feat", "New"],
  ["fix", "Fixed"],
  ["perf", "Faster"],
  ["refactor", "Internal: refactoring"],
  ["docs", "Internal: documentation"],
  ["test", "Internal: tests"],
  ["ci", "Internal: build and CI"],
  ["build", "Internal: build and CI"],
  ["style", "Internal: formatting"],
  ["chore", "Internal: chores"],
]
const USER_FACING = new Set(["feat", "fix", "perf"])

function newestTag(before) {
  try {
    return git("describe", "--tags", "--abbrev=0", `${before}^`)
  } catch {
    return undefined
  }
}

const to = value("to") ?? "HEAD"
let from = value("from")
if (!from) {
  try {
    from = git("describe", "--tags", "--abbrev=0", to)
    /* A run on the tagged commit itself lists the release before it. */
    if (git("rev-list", "-n", "1", from) === git("rev-list", "-n", "1", to)) {
      from = newestTag(from)
    }
  } catch {
    from = undefined
  }
}

const range = from ? `${from}..${to}` : to
const raw = git("log", "--no-merges", "--format=%H%x1f%s", range)
const pattern = /^([a-z]+)(?:\(([^)]*)\))?(!)?: (.+)$/

const entries = []
for (const line of raw ? raw.split("\n") : []) {
  const [hash, subject] = line.split("\x1f")
  const m = pattern.exec(subject)
  if (!m) continue
  const [, type, scope, bang, text] = m
  const known = TYPES.some(([t]) => t === type)
  if (!known) continue
  const breaking = Boolean(bang)
  if (!flag("all") && !USER_FACING.has(type) && !breaking) continue
  entries.push({ type, scope: scope ?? "", text, breaking, hash: hash.slice(0, 7) })
}

if (flag("json")) {
  console.log(JSON.stringify({ from: from ?? null, to, entries }, null, 2))
  process.exit(0)
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const out = []
out.push(`## ${value("title") ?? (to === "HEAD" ? "Unreleased" : to)}`)
out.push("")
if (!entries.length) {
  out.push("No user-facing changes.")
}

const breaking = entries.filter((e) => e.breaking)
if (breaking.length) {
  out.push("### Breaking", "")
  for (const e of breaking) out.push(`- ${e.scope ? `**${e.scope}:** ` : ""}${cap(e.text)}`)
  out.push("")
}

const sections = new Map()
for (const e of entries) {
  const title = TYPES.find(([t]) => t === e.type)[1]
  if (!sections.has(title)) sections.set(title, [])
  sections.get(title).push(e)
}
for (const [, title] of TYPES) {
  const list = sections.get(title)
  if (!list) continue
  sections.delete(title)
  out.push(`### ${title}`, "")
  const byScope = new Map()
  for (const e of list) {
    const key = e.scope || "other"
    if (!byScope.has(key)) byScope.set(key, [])
    byScope.get(key).push(e)
  }
  for (const [scope, items] of [...byScope].sort(([a], [b]) => (a === "other") - (b === "other") || a.localeCompare(b))) {
    for (const e of items) out.push(`- ${scope === "other" ? "" : `**${scope}:** `}${cap(e.text)}`)
  }
  out.push("")
}

console.log(out.join("\n").trimEnd())
