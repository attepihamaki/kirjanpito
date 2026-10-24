import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // The domain layer is pure TypeScript and needs no DOM. Component tests
    // opt in per file with `// @vitest-environment jsdom`.
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.ts", "test/**/*.test.tsx"],
    setupFiles: ["test/setup.ts"],
    // Pins the clock so date tests behave the same here and on CI.
    env: { TZ: "Europe/Helsinki" },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["lib/domain/**/*.ts", "lib/i18n/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/**/test-helpers/**"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
})
