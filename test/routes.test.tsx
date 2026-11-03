import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  APP_ROUTES,
  LEDGER_ROUTES,
  SETTINGS_ROUTES,
  STATEMENT_ROUTES,
  VAT_ROUTES,
} from "@/lib/site"

const ROUTES = [
  ...Object.values(APP_ROUTES),
  ...Object.values(LEDGER_ROUTES),
  ...Object.values(STATEMENT_ROUTES),
  ...Object.values(VAT_ROUTES),
  ...Object.values(SETTINGS_ROUTES),
]

/* A tab links to its route whether or not a page exists, and a static export turns a missing one into a 404. */
describe("routes", () => {
  it.each(ROUTES)("%s has a page", (route) => {
    expect(existsSync(join(process.cwd(), "app", route, "page.tsx"))).toBe(true)
  })
})
