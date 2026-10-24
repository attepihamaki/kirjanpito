import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Generated on predev/prebuild by scripts/copy-pdf-worker.mjs.
    "public/**",
  ]),
  // The §10 reference bookkeeping is a fixture, not a feature: the app has no
  // sample ledger, so only tests may reach for lib/domain/test-helpers.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/domain/test-helpers/*", "@/lib/domain/test-helpers/*"],
              message:
                "Test fixtures are for *.test.ts(x) only — the app ships no sample data.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "test/**"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
