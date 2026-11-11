# Kirjanpito: project context for Claude Code

This file explains what the app is, what has been decided and built so far, and how to carry it into the real project. The prototype was built as a single HTML file (the "artifact"), which is provided alongside this file together with the original Excel workbook `docs/reference/kirjanpito.xlsx`. The artifact is the reference implementation for behaviour, texts and design. This file and the files it indexes in `spec/` are the reference for intent and rules. If they disagree, ask the user. **For Form 5 the specification in `docs/specs/` outranks this file and the code**: a field code, its label, a sum or a check is whatever the PDF says. When this file contradicts it, fix this file.

> **`docs/` is local-only and gitignored, except `docs/specs/`.** Neither the workbook nor the prototype is in the repository: they are the user's source material, not part of the published project. References to them below are still accurate for a working copy that has them. Without them, this file is the specification — §3 describes the workbook sheet by sheet, §10 lists the reference figures the tests assert, and §11 records the palette the prototype defines, so nothing here depends on opening either file. `docs/specs/` is tracked and holds Verohallinto's published specifications, the reference the tax logic is built against: today `verohallinto_tietuekuvaus_2026_5.pdf`, the Form 5 data file specification for 2026 (version 1.0, 22.9.2026).

The user writes in Finnish and English. The app's default language is Finnish.

## Where to look

**The specification is split by area, and the section numbers are the same everywhere.** Code comments cite them as "CLAUDE.md §8.4", which means section 8.4 of the file below that holds it. Read the file for the area you are about to change before you change it; nothing else needs loading.

| sections     | file                          | covers                                                                                                                                                                                                                                                                                         |
| ------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 2, 2b     | this file                     | purpose, stack, how comments are written                                                                                                                                                                                                                                                       |
| 3, 4, 5      | `spec/data-model.md`          | the Excel workbook, the data model, the chart of accounts and categories                                                                                                                                                                                                                       |
| 6            | `spec/rules.md`               | VAT, income statement and every calculation rule, rule engine and rule tables, partial deduction                                                                                                                                                                                               |
| 7            | `spec/files.md`               | CSV, ZIP, receipts, saving back to the file, `settings.json`, encryption, integrity seal, spreadsheet                                                                                                                                                                                          |
| 8.1 to 8.11  | `spec/views.md`               | shell, landing, ledger, entry dialog, viewer, VAT return, income statement, settings, confirmations and locks                                                                                                                                                                                  |
| 8.12 to 8.35 | `spec/features.md`            | overview, new year, onboarding, bank import, category rules, click-through, archive, undo, retention package, audit package, calendar, book check, help, parts in use, sales invoices, stocktake, counterparties, payables, receipt inbox, demo book, backup reminder, quotes, command palette |
| 9, 10        | `spec/i18n-and-fixture.md`    | UI vocabulary, formatting, the §10 reference figures the tests assert                                                                                                                                                                                                                          |
| 11           | `spec/design.md`              | palette, type, controls, the one-component-per-element table                                                                                                                                                                                                                                   |
| 11b, 12      | `spec/hosting-and-storage.md` | routes, SEO, GitHub Pages, git hooks, storage keys and migrations                                                                                                                                                                                                                              |
| 13, 14       | `spec/status.md`              | implementation order, acceptance checklist, open questions, legal gaps                                                                                                                                                                                                                         |

When a rule changes, change it in the file that owns it, and keep the section number. A new section takes the next free number in its file's range.

---

## 1. Purpose

**Kirjanpito** is single-entry bookkeeping (yhdenkertainen kirjanpito) for a Finnish sole trader (toiminimi / yksityinen elinkeinonharjoittaja).

The user records the business's receipts and invoices (tositteet), income and expenses, month by month. From these, the app calculates the figures the user reports to the Finnish Tax Administration (Verohallinto) themselves in OmaVero:

- the **VAT return** (arvonlisäveroilmoitus), by month, quarter or year, and
- the **income statement** (tuloslaskelma) for the business tax return (elinkeinotoiminnan veroilmoitus, form 5), ending in the business profit (358) or loss (359).

The app does not file anything and is not tax advice. A short disclaimer to this effect is shown on the landing page and in report notes.

### Core product idea: the file is the database

There is **no backend, no account and no database**. The user opens their bookkeeping from a file, works on it in the browser, and writes it back to a file.

- The file is a **ZIP**: the entries as a CSV, a `settings.json` with everything else that belongs to the bookkeeping (§7.6), and the receipt files in folders by year and month.
- A bare **CSV** can still be opened, but it holds the entries only. The app always writes a ZIP.
- Where the browser allows it, the app **saves straight back to the file that was opened** (§7.5). Where it does not, the user **downloads a copy**. Either way the file on disk is the user's real, safe copy.
- Between saves, work is kept in the browser (localStorage for entries and settings, IndexedDB for receipt files), so a page reload doesn't lose anything — but the browser is a working buffer, not the record.

---

## 2. Target stack

- **Next.js** (App Router) with **TypeScript**, **React** and **shadcn/ui**. The user will create the project from a shadcn/ui template and connect the shadcn/ui skill.
- The whole app is **client-side**. Prefer `output: "export"` (static export). No API routes or server actions are needed.
- Suggested libraries:
  - `papaparse` for CSV parsing. Row validation is hand-written in `lib/domain/csv.ts` rather than done with `zod`: §7.1 requires the import to be _lenient_ — a bad row is skipped and counted, never rejected — and every problem is reported as a machine-readable code the i18n layer translates. A schema validator would have to be unwrapped back into exactly that shape. `zod` was removed from the dependencies.
  - `@zip.js/zip.js` for ZIP import and export, including AES encryption (§7.8). `lib/domain/zip.ts` imports its `index-native.js` build, which uses the browser's own deflate and needs neither web workers nor wasm, and `configure({ useWebWorkers: false })` keeps it inside the CSP of §11b.
  - `@dnd-kit/core` and `@dnd-kit/sortable` for rearranging the overview's widgets (§8.12). Native HTML drag and drop has no keyboard or touch support, and dnd-kit's keyboard sensor gives both.
  - `pdfjs-dist` for rendering PDFs. **The worker is copied to `public/pdf.worker.min.mjs` by `scripts/copy-pdf-worker.mjs` on `predev`/`prebuild`, and `workerSrc` points at that fixed URL.** The `new URL(..., import.meta.url)` form was rejected: the worker is an ES module bundle, and whether Turbopack copies it as an asset or pulls it into the module graph differs between the dev server and the export — a failure that would surface only in production. pdfjs is still imported dynamically, from `lib/browser/pdf.ts` alone.
  - `pdf-lib` for writing the memo vouchers of calculated entries (§8.8). `lib/browser/memo-pdf.ts` and `lib/browser/report-pdf.ts` (§8.21) are the only modules that import it, and the commands that use them import them dynamically, so no bundle carries it until an entry is booked or a package is made.
  - `@zxing/library` for reading a bill's bank barcode and EPC QR code from a photo or a PDF (§8.30), where the browser has no `BarcodeDetector`. It is plain JavaScript, so it needs no `wasm-unsafe-eval`, and `lib/browser/barcode.ts` is the only module that imports it, dynamically.
  - `idb` or `idb-keyval` for IndexedDB.
  - `next-themes` for light, dark and system theme (the standard shadcn approach).
  - Tables are hand-composed on shadcn's `Table`, **not** `@tanstack/react-table`, which was removed from the dependencies. Sorting, filtering and pagination all live in the store — they have to, because the toolbar, the month chips and the totals cards read the same state — which would leave a table adapter owning nothing. See the comment at the top of `components/ledger/ledger-table.tsx`.
  - Toasts are `components/ui/toast.tsx`, **not** `sonner`, which was removed from the dependencies. It is a provider, so it wraps the tree in `HtmlShell` rather than sitting beside it. Its viewport is the one layer above the `z-50` that dialogs, sheets and overlays share: they are all portalled to the body, where an equal z-index is settled by DOM order, and the provider's portal is always the earliest. Toasts are raised from inside dialogs, so **the viewport stays at `z-100`**.
  - State: a small store such as Zustand with a persistence layer, or React context plus `useReducer`. Keep the domain logic (calculations, CSV, paths) in plain TypeScript modules with no React, so it can be unit-tested.
- Money is always stored as **integer cents**, never floats.

### Things in the artifact that exist only because of claude.ai, and should not be ported

- **`window.claude.use("downloads")`.** The artifact saves files through a claude.ai capability. The app uses a normal Blob plus an `<a download>` link for downloading a copy, and the File System Access API to save back to the opened file where it exists (§7.5).
- **Loading PDF.js and the ZIP library from cdnjs with script tags**, and running the PDF.js worker on the main thread (`globalThis.pdfjsWorker`). In the real app, import them from npm.
- **Custom in-app confirmation dialogs** replaced `window.confirm()` because claude.ai's sandbox blocks native dialogs. Keep in-app dialogs anyway (shadcn `AlertDialog`), since they're better UX and translatable. Never use `window.confirm`.
- The **single-file, hand-rendered HTML** structure. Rebuild it as proper React components.

---

## 2b. How comments are written

Comments describe the code as it stands. They are read by someone looking at
this file today, who has no way to check a claim about anything outside it.

- **Say what the code does and why it is the way it is.** Rules the code has to
  obey, invariants, the consequence of getting it wrong, the §-reference in
  this file that the code implements — all of that earns its place.
- **Never mention past bugs, earlier versions, review discussions, tickets or
  the prototype.** Not "this used to…", not "the port dropped…", not "the
  prototype did X silently", not "X was rejected because…". If an old mistake
  is worth guarding against, write the rule it taught, in the present tense:
  "Paths are always written, so a CSV-only export still records which receipts
  existed" — not "the prototype dropped them, which made CSV-only lossy."
- **Don't restate the line below it**, and don't repeat a test's own name as a
  comment above it. Delete rather than paraphrase.
- Prefer a comment that would still be true after an unrelated refactor.

### Syntax

- **One line → `//`.** `/** … */` on a single line is fine for a short doc
  comment on a type, field or function.
- **More than one line → `/* … */`**, with each continuation line aligned on a
  leading `*`. **Never a run of `//` lines.** This holds inside function
  bodies, inside JSX and in `.mjs` scripts, not only for doc comments.
- JSDoc (`/** … */`) is the block form for anything exported: types, fields,
  functions, store actions.
- A section divider inside a module is a block comment, not a row of `//`:

  ```ts
  /* -------------------------------------------------------------------------
   * Parse
   * ---------------------------------------------------------------------- */
  ```

- CSS has block comments only; the same "one line / several lines" rule applies
  to how they are laid out.
- Two adjacent one-line comments that say different things are separated by a
  blank line, so they do not read as one run of `//`.
