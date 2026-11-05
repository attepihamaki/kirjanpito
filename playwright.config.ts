import { defineConfig } from "@playwright/test"

const PORT = 4173

export default defineConfig({
  testDir: "e2e",
  /*
   * One baseline per snapshot, with no platform in its name. Fonts and
   * anti-aliasing differ per OS, so the baselines are Linux's alone and the
   * spec skips everywhere else.
   */
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fi-FI",
    timezoneId: "Europe/Helsinki",
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "node e2e/serve.mjs",
    url: `http://localhost:${PORT}/kirjanpito/`,
    reuseExistingServer: !process.env.CI,
  },
})
