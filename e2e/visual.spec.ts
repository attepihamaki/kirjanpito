import { fileURLToPath } from "node:url"
import { expect, test, type Page } from "@playwright/test"

const FIXTURE = fileURLToPath(new URL("fixtures/vouchers.csv", import.meta.url))
const BASE = "/kirjanpito"

/*
 * Baselines are rendered on Linux. Running elsewhere would compare another
 * font rasteriser against them, so the specs skip rather than fail.
 */
test.skip(
  process.platform !== "linux" && !process.env.VISUAL_FORCE,
  "Screenshot baselines are Linux-only. Set VISUAL_FORCE=1 to run anyway."
)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-05T10:00:00+02:00"))
})

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => {
    localStorage.setItem("theme", value)
  }, theme)
}

/** Opens the §10 fixture from the landing page, as a user would. */
async function openBook(page: Page) {
  await page.goto(`${BASE}/`)
  await page.locator('input[type="file"]').setInputFiles(FIXTURE)
  await page.waitForURL(/\/app\/overview/)
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`receipt motif, ${theme}`, () => {
    test.beforeEach(async ({ page }) => setTheme(page, theme))

    test("landing hero", async ({ page }) => {
      await page.goto(`${BASE}/`)
      await expect(
        page.locator('[data-visual="landing-receipts"]')
      ).toHaveScreenshot(`landing-receipts-${theme}.png`)
    })

    test("entry dialog preview", async ({ page }) => {
      await openBook(page)
      await page.goto(`${BASE}/app/ledger/`)
      await page.getByRole("row", { name: /Lasku 1001/ }).click()
      await expect(
        page.locator('[data-visual="receipt-preview"]')
      ).toHaveScreenshot(`receipt-preview-${theme}.png`)
    })
  })
}

test.describe("printed sheets", () => {
  const SHEETS = [
    ["statement", "/app/statement/"],
    ["journal", "/app/ledger/journal/"],
    ["general-ledger", "/app/ledger/accounts/"],
    ["account-list", "/app/ledger/chart/"],
  ] as const

  for (const [name, route] of SHEETS) {
    test(`${name} in print`, async ({ page }) => {
      await openBook(page)
      await page.goto(`${BASE}${route}`)
      const sheet = page.locator(".print-sheet").first()
      await expect(sheet).toBeVisible()
      await page.emulateMedia({ media: "print" })
      await expect(sheet).toHaveScreenshot(`${name}-print.png`)
    })
  }

  test("statement on screen, dark", async ({ page }) => {
    await setTheme(page, "dark")
    await openBook(page)
    await page.goto(`${BASE}/app/statement/`)
    await expect(page.locator(".print-sheet").first()).toHaveScreenshot(
      "statement-screen-dark.png"
    )
  })
})
