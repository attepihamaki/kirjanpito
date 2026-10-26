# Kirjanpito

Single-entry bookkeeping (_yhdenkertainen kirjanpito_) for a Finnish sole trader,
running entirely in the browser.

**→ [attepihamaki.github.io/kirjanpito](https://attepihamaki.github.io/kirjanpito/)**

You record the business's receipts and invoices month by month, and the app
works out the figures you report to the Tax Administration yourself in OmaVero:
the **VAT return** (_arvonlisäveroilmoitus_) by month, quarter or year, and the
**income statement** (_tuloslaskelma_) for the business tax return, ending in the
profit on line 358 or the loss on line 359.

The UI is Finnish by default and also available in English. Currency is always
formatted the Finnish way, in both languages, because the figures are copied
into a Finnish form.

> The app files nothing on your behalf, and its calculations are not tax or
> accounting advice. Check the figures before you submit them.

## The file is the database

There is **no backend, no account and no database**. You open your bookkeeping
from a file, work on it, and export it back to a file.

- Without receipts, that file is a **CSV** — semicolon-separated, UTF-8 with a
  BOM, so it opens directly in a Finnish Excel.
- With receipts attached, it is a **ZIP**: the same CSV plus the receipt files,
  in folders by year and month.

Between exports the work is kept in the browser — entries and settings in
`localStorage`, receipt files in IndexedDB — so reloading the page loses
nothing. The exported file is your real copy; the browser is a working buffer.

Nothing is ever uploaded. The site is static files, and there is no server to
send anything to.

## What it does

- **Ledger** — entries by month, searchable and filterable, sortable on every
  column, with the net / VAT / gross split calculated per entry.
- **Receipts** — several images or PDFs per entry, stored in IndexedDB, with a
  viewer that does zoom, rotate, multi-page PDFs and save-the-original. Large
  images are downscaled to 2000 px on the long edge before storage.
- **VAT return** — sales and purchase VAT by rate for a month, quarter or year,
  ending in the amount payable or refundable. EU, non-EU and reverse-charge
  sales are reported separately rather than counted as VAT-bearing.
- **Income statement** — the full chart of accounts for form 5, laid out as a
  printable sheet.
- **Summary** — income against expenses per month, with sales by type and
  expenses by group.
- **Settings** — the category list, each with a default VAT rate, plus your own
  custom categories.

Money is stored as integer cents throughout, never as floats.

## Running it

Node 24, which is what CI builds with.

```bash
npm install
npm run dev      # http://localhost:3000/kirjanpito
```

Note the path — the app is served under `/kirjanpito` in development too, so
that what you test matches what deploys. See [Deployment](#deployment).

| Script                  | What it does                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`           | Dev server. `predev` copies the pdf.js worker into `public/`.                              |
| `npm run build`         | Static export into `out/`. `prebuild` does the same copy, `postbuild` verifies the result. |
| `npm run check`         | `typecheck` → `lint` → `test`. What CI runs.                                               |
| `npm test`              | Vitest once. `npm run test:watch` to keep it open.                                         |
| `npm run test:coverage` | Coverage, with thresholds enforced on the domain and i18n layers.                          |
| `npm run format`        | Prettier over `**/*.{ts,tsx}`.                                                             |

## Layout

```
app/                 Next.js App Router. The landing page at /, the app under
                     /app/*, plus robots.txt, sitemap.xml and the OG card.
components/
  ui/                shadcn/ui primitives. Only the ones actually imported.
  common/            Shared pieces: Panel, Money, OptionSelect, the receipt
                     paper motif, pagination, table headers.
  app/               The shell — sidebar, top bar, file box, year select.
  landing/ ledger/ entry/ receipt/ vat/ statement/ summary/ settings/ export/
                     One directory per view.
lib/
  domain/            Pure TypeScript, no React: the chart of accounts, money,
                     dates, per-entry calculation, the VAT report, the income
                     statement, the summary, CSV, ZIP, receipt paths.
  i18n/              The message dictionary and the formatters.
  commands/          User intents (open, export, save entry, clear…).
  browser/           Everything that touches a browser API: IndexedDB, pdf.js,
                     image downscaling, object URLs, downloads.
  site.ts            Base path, canonical URL, the indexing switch, routes.
stores/              Zustand stores and the derived selectors.
hooks/               File drop, receipt GC, beforeunload, breakpoint, delays.
test/                Component tests. Domain tests sit next to their module.
```

## Architecture

The whole app is client-side and statically exported. There are no API routes
and no server actions — nothing would have anywhere to run.

It is layered so that the part worth testing has no React in it:

**`lib/domain` — pure functions.** Every calculation, every file format. No
imports from React, Next or the store. This is where the VAT report, the income
statement and the CSV parser live, and it is covered by unit tests against a
sixteen-entry reference bookkeeping whose expected figures are known.

**`stores` — state.** A Zustand store holding entries, categories, the selected
year, filters and UI preferences, persisted to `localStorage`. Derived data is
_not_ stored: `stores/selectors.ts` holds plain functions the components call
inside `useMemo`, so there is one source of truth and nothing to invalidate.

**`lib/commands` — intents.** A command owns the whole sequence a user action
implies: confirm → mutate the store → garbage-collect orphaned receipts → toast
→ navigate. That keeps the store a set of pure transitions, and keeps the
components from each re-implementing the confirmation rules. Commands take a
small context (`t` for translation, `navigate`) so they can live outside React.

They are split in two on purpose. `book-commands.ts` is safe to import
statically; `io-commands.ts` is loaded with `await import()` because it pulls in
`jszip` and `papaparse`, which must not land in the landing page's bundle.

**`components` — rendering.** Views select narrow slices of the store and call
selectors. Tables are hand-composed on shadcn's `Table`: sorting, filtering and
pagination live in the store because the toolbar, the month chips and the
totals cards all read the same state, which would leave a table adapter owning
nothing.

A few deliberate choices worth knowing before changing things:

- **`pdfjs-dist`, `jszip`, `papaparse` and `recharts` must stay out of the
  landing bundle.** Each is reachable only through a dynamic import, and
  `scripts/verify-export.mjs` fails the build if one gets in.
- **The pdf.js worker is copied to `public/` by a script**, not resolved
  through the bundler, because Turbopack's choice between copying it as an
  asset and pulling it into the module graph differs between `next dev` and
  `next build` — a failure that would appear only in production.
- **Colours are CSS variables in `app/globals.css`.** No hex values in
  components, no manual `dark:` overrides.
- **No `window.confirm` or `alert`** anywhere; confirmations are an
  `AlertDialog`, so they can be translated and styled.

## Internationalisation

Every string lives in a dictionary keyed `namespace.name`, with `[fi, en]`
values. The dictionary is split across two modules so the landing page does not
ship the whole app's strings. Language is a stored preference, not a route —
there is one set of URLs, and switching language is a state change rather than a
navigation. A test enforces the key shape and that the two modules stay
disjoint.

## Testing

```bash
npm test
```

Vitest. The domain layer runs in plain Node; component tests opt into
jsdom per file and drive the real components through Testing Library. The
reference bookkeeping in `lib/domain/test-helpers/` is a fixture only — an
eslint rule blocks importing it outside test files, so no sample ledger can
leak into the app.

## Deployment

Pushing to `main` builds the static export and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`): `npm run check`, then `npm run build`, then
`out/` as a Pages artifact. The checks run first so a red build never reaches
the published URL. The only repository setting it needs is
**Settings → Pages → Source = GitHub Actions**.

Because this is a project repo without a custom domain, Pages serves the site
under the repository's own path. `BASE_PATH` in `lib/site.ts` is that prefix and
`next.config.ts` imports it as `basePath`, which covers every route, every
`next/link` and every `_next/` asset. The one URL that has to spell the prefix
out by hand is the pdf.js worker in `lib/browser/pdf.ts`, because it is handed
to a library rather than to Next.

`INDEXABLE` in the same file is **off**: the github.io address is a working URL,
and a search result pointing at it would outlive the move to the final domain
and compete with it. While it is off, every document carries `noindex`,
`robots.txt` disallows everything and the sitemap is empty. Open Graph is not
gated, so links still preview in chat apps.

To move to a custom domain: set `BASE_PATH` to `""`, `SITE_URL` to the new
origin and `INDEXABLE` to `true`, add a `public/CNAME` file containing the
domain, and set the domain under Settings → Pages. Nothing else in the codebase
mentions either the prefix or the indexing state, and `test/seo.test.tsx` fails
if the three SEO files stop agreeing with the flag.

## Built with

[Next.js](https://nextjs.org) 16 (App Router, `output: "export"`) ·
[React](https://react.dev) 19 · TypeScript ·
[Tailwind CSS](https://tailwindcss.com) 4 ·
[shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) ·
[Zustand](https://zustand.docs.pmnd.rs) ·
[Recharts](https://recharts.org) · [pdf.js](https://mozilla.github.io/pdf.js/) ·
[JSZip](https://stuk.github.io/jszip/) ·
[Papa Parse](https://www.papaparse.com) · [Vitest](https://vitest.dev)

## Background

The app replaces an Excel workbook, and was built from an HTML prototype.
Neither is in the repository — they are source material rather than part of the
project — but `CLAUDE.md` carries everything taken from them: the domain rules,
the chart of accounts, the file formats, the design system and the reasoning
behind the decisions above. That includes the four bugs found in the workbook's
formulas, which the app deliberately does not reproduce. It is the place to look
before changing behaviour.
