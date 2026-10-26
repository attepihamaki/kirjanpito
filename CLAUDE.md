# Kirjanpito: project context for Claude Code

This file explains what the app is, what has been decided and built so far, and how to carry it into the real project. The prototype was built as a single HTML file (the "artifact"), which is provided alongside this file together with the original Excel workbook `docs/reference/kirjanpito.xlsx`. The artifact is the reference implementation for behaviour, texts and design. This file is the reference for intent and rules. If they disagree, ask the user.

> **`docs/` is local-only and gitignored.** Neither the workbook nor the prototype is in the repository: they are the user's source material, not part of the published project. References to them below are still accurate for a working copy that has them. Without them, this file is the specification — §3 describes the workbook sheet by sheet, §10 lists the reference figures the tests assert, and §11 records the palette the prototype defines, so nothing here depends on opening either file.

The user writes in Finnish and English. The app's default language is Finnish.

---

## 1. Purpose

**Kirjanpito** is single-entry bookkeeping (yhdenkertainen kirjanpito) for a Finnish sole trader (toiminimi / yksityinen elinkeinonharjoittaja).

The user records the business's receipts and invoices (tositteet), income and expenses, month by month. From these, the app calculates the figures the user reports to the Finnish Tax Administration (Verohallinto) themselves in OmaVero:

- the **VAT return** (arvonlisäveroilmoitus), by month, quarter or year, and
- the **income statement** (tuloslaskelma) for the business tax return (elinkeinotoiminnan veroilmoitus, form 5), ending in the business profit (358) or loss (359).

The app does not file anything and is not tax advice. A short disclaimer to this effect is shown on the landing page and in report notes.

### Core product idea: the file is the database

There is **no backend, no account and no database**. The user opens their bookkeeping from a file, works on it in the browser, and exports it back to a file.

- Without receipts, the file is a **CSV**.
- With receipts attached, the file is a **ZIP** containing the CSV and the receipt files, in folders by year and month.
- Between exports, work is kept in the browser (localStorage for entries and settings, IndexedDB for receipt files), so a page reload doesn't lose anything. The exported file is the user's real, safe copy.

---

## 2. Target stack

- **Next.js** (App Router) with **TypeScript**, **React** and **shadcn/ui**. The user will create the project from a shadcn/ui template and connect the shadcn/ui skill.
- The whole app is **client-side**. Prefer `output: "export"` (static export). No API routes or server actions are needed.
- Suggested libraries:
  - `papaparse` for CSV parsing. Row validation is hand-written in `lib/domain/csv.ts` rather than done with `zod`: §7.1 requires the import to be _lenient_ — a bad row is skipped and counted, never rejected — and every problem is reported as a machine-readable code the i18n layer translates. A schema validator would have to be unwrapped back into exactly that shape. `zod` was removed from the dependencies.
  - `jszip` for ZIP import and export.
  - `pdfjs-dist` for rendering PDFs. **The worker is copied to `public/pdf.worker.min.mjs` by `scripts/copy-pdf-worker.mjs` on `predev`/`prebuild`, and `workerSrc` points at that fixed URL.** The `new URL(..., import.meta.url)` form was rejected: the worker is an ES module bundle, and whether Turbopack copies it as an asset or pulls it into the module graph differs between the dev server and the export — a failure that would surface only in production. pdfjs is still imported dynamically, from `lib/browser/pdf.ts` alone.
  - `idb` or `idb-keyval` for IndexedDB.
  - `next-themes` for light, dark and system theme (the standard shadcn approach).
  - Tables are hand-composed on shadcn's `Table`, **not** `@tanstack/react-table`, which was removed from the dependencies. Sorting, filtering and pagination all live in the store — they have to, because the toolbar, the month chips and the totals strip read the same state — which would leave a table adapter owning nothing. See the comment at the top of `components/ledger/ledger-table.tsx`.
  - Toasts are `components/ui/toast.tsx`, **not** `sonner`, which was removed from the dependencies. It is a provider, so it wraps the tree in `HtmlShell` rather than sitting beside it.
  - State: a small store such as Zustand with a persistence layer, or React context plus `useReducer`. Keep the domain logic (calculations, CSV, paths) in plain TypeScript modules with no React, so it can be unit-tested.
- Money is always stored as **integer cents**, never floats.

### Things in the artifact that exist only because of claude.ai, and should not be ported

- **`window.claude.use("downloads")`.** The artifact saves files through a claude.ai capability. In the real app, use a normal Blob plus an `<a download>` link, or the File System Access API where available.
- **Loading PDF.js and JSZip from cdnjs with script tags**, and running the PDF.js worker on the main thread (`globalThis.pdfjsWorker`). In the real app, import them from npm.
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

---

## 3. The original Excel workbook (`docs/reference/kirjanpito.xlsx`)

This is what the app replaces. Useful for understanding the domain and for checking calculations.

### Sheets

- **`01`–`12` (one per month).** Rows 2–100 are the ledger:
  - A: date. B: description. C: type (1 = Tulo / income, 2 = Kulu / expense, chosen with radio buttons). E: category, a dropdown via `INDIRECT($D2)` that lists income or expense categories depending on the type. F: amount.
  - G: VAT %, looked up from the category with `VLOOKUP`.
  - H–L: VAT amount split by rate (25.5 / 24 / 14 / 13.5 / 10). M / O / P / Q: gross, net and VAT.
  - **F1** is a switch: 1 means amounts are entered excluding VAT, otherwise including VAT (the "Verollinen summa" dropdown).
  - **S2:V23** is the monthly VAT calculation: sales VAT by rate, purchase VAT by rate, and "Maksettava arvonlisävero" in U23.
  - **Z2:AL3** are expense totals by group and sales totals by type.
- **`Tuloslaskelma`.** The yearly income statement. It sums all 12 months by account prefix with `SUMIF(... "333*" ...)` and ends in 358 (profit) / 359 (loss).
- **`Yhteenveto`.** A monthly summary grid of sales by type and expenses by group.
- **`Asetukset ja luokat`.** Income and expense categories with default VAT rates and TRUE/FALSE toggles. Only enabled categories appear in the dropdowns, through `INDEX/MATCH` helper columns. In the Excel, expense categories are duplicated per VAT rate (e.g. "333 … 24%" and "333 … 25,5%").
- **`Kaaviot`.** A hidden sheet for charts.

### Bugs found in the Excel (do not reproduce them)

1. `Tuloslaskelma!F15` (318 grants) sums column **N** instead of **O** for months 02–12. N is empty, so grants were missing.
2. `Tuloslaskelma!F33` uses `"344*"`. That pattern also matches rows F30–F32 (travel, vehicle, meeting), and F19 adds F30:F33, so **344 costs were counted twice**.
3. Monthly sheets, `U17` (purchase VAT at 13.5 %) sums column J (the 14 % column) instead of K.
4. The VAT summary ranges are inconsistent (some end at row 100, others at 101–104). Harmless, but untidy.
5. The Excel left line 354 out of the deductible expenses. The app includes it (see §6.3).

---

## 4. Data model

### Entry (kirjaus)

**Identifiers are English everywhere in the code and in browser storage.** The
CSV columns and their `tulo`/`kulu` and `brutto`/`netto` values stay Finnish —
that is the file format (§7.1), and `lib/domain/csv.ts` is the only module that
knows the Finnish names. Nothing else, including `Entry`, mentions them.

```ts
type EntryType = "income" | "expense"
type AmountMode = "gross" | "net" // amount includes VAT | excludes VAT

interface Entry {
  id: string
  date: string // ISO date "YYYY-MM-DD"
  description: string
  type: EntryType
  catId: string // Category.id
  amount: number // integer cents, as entered (gross or net per amountMode)
  vatRate: number // VAT rate in percent, e.g. 25.5
  amountMode: AmountMode // stored per entry (the Excel had one switch per month)
  atts?: Attachment[] // receipts, may be several
}
```

### Attachment (tosite)

```ts
interface Attachment {
  id: string | null // IndexedDB key, null if the file is missing
  name: string // display / original file name
  type: string // MIME type
  size: number // bytes
  missing?: true // listed in the CSV but the file wasn't available on import
  path?: string // original path from the CSV, kept for missing files
}
```

### Category (luokka)

```ts
interface Category {
  id: string // e.g. "300-domestic", "333", "344-travel", or "c-<uid>" for custom
  line: string // key of the income statement line it belongs to (see §5)
  name: string // Finnish name (custom categories: the user's name)
  vatRate: number // default VAT %
  kind?: "domestic" | "eu" | "nonEu" | "reverse" // for income categories
  enabled: boolean // shown in the entry dialog's dropdown
  custom: boolean // user-created
}
```

**Design decision:** the VAT rate is **separate from the category**. Instead of one category per rate (as in the Excel), each category has a default rate that pre-fills the entry's VAT % field, and the user can change it per entry. Default categories show English names from a translation map when the UI language is English. Custom categories always show the user's name.

### Calculation per entry

```
rate = entry.vatRate
if amountMode == "net":  net = amount; vat = round(net * rate / 100);           gross = net + vat
else (gross):            gross = amount; vat = round(gross * rate / (100 + rate)); net = gross - vat
```

All in cents with `Math.round`.

---

## 5. Chart of accounts (income statement lines)

Each line has a key, an account number (tili), a side, Finnish and English names, an optional group heading, a default VAT %, a summary bucket (expenses only), and a non-deductible flag.

| key         | tili | side    | Finnish                                          | English                                 | group (fi / en)                                                         | default VAT            | bucket          |
| ----------- | ---- | ------- | ------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------- | ---------------------- | --------------- |
| 300         | 300  | income  | Tuotot ammatista                                 | Business revenue                        | –                                                                       | (see sales categories) | –               |
| 301         | 301  | income  | Muut tuotot                                      | Other revenue                           | –                                                                       | 0                      | –               |
| 312         | 312  | income  | Varausten vähennys                               | Decrease in provisions                  | Varausten vähennys / Decrease in provisions                             | 0                      | –               |
| 313         | 313  | income  | Auton yksityiskäyttö                             | Private use of car                      | Yksityiskäyttö / Private use                                            | 0                      | –               |
| 314         | 314  | income  | Tavaroiden yksityiskäyttö                        | Private use of goods                    | Yksityiskäyttö / Private use                                            | 0                      | –               |
| 315         | 315  | income  | Muu yksityiskäyttö                               | Other private use                       | Yksityiskäyttö / Private use                                            | 0                      | –               |
| 317         | 317  | income  | Tuloslaskelman verovapaat tuotot                 | Tax-exempt income                       | Muut tuotot / Other income                                              | 0                      | –               |
| 318         | 318  | income  | Saadut avustukset ja tuet                        | Grants and subsidies received           | Muut tuotot / Other income                                              | 0                      | –               |
| 319         | 319  | income  | Saadut osingot                                   | Dividends received                      | Muut tuotot / Other income                                              | 0                      | –               |
| 323         | 323  | income  | Korkotuotot ja muut rahoitustuotot               | Interest and other financial income     | Muut tuotot / Other income                                              | 0                      | –               |
| 324         | 324  | income  | Muut veronalaiset tuotot                         | Other taxable income                    | Muut tuotot / Other income                                              | 0                      | –               |
| 333         | 333  | expense | Ostot ja varastojen muutokset                    | Purchases and change in inventory       | –                                                                       | 25.5                   | purchases       |
| 334         | 334  | expense | Ulkopuoliset palvelut                            | External services                       | –                                                                       | 25.5                   | purchases       |
| 335         | 335  | expense | Palkat ja palkkiot                               | Wages and fees                          | Henkilöstökulut / Personnel expenses                                    | 0                      | personnel       |
| 336         | 336  | expense | Eläke- ja henkilösivukulut                       | Pension and other personnel costs       | Henkilöstökulut / Personnel expenses                                    | 0                      | personnel       |
| 337         | 337  | expense | Poistot                                          | Depreciation                            | Poistot, edustuskulut ja vuokrat / Depreciation, entertainment and rent | 0                      | depreciation    |
| 341         | 341  | expense | Edustuskulut                                     | Entertainment expenses                  | (same)                                                                  | 0                      | depreciation    |
| 343         | 343  | expense | Vuokrat                                          | Rent                                    | (same)                                                                  | 25.5                   | depreciation    |
| 344-travel  | 344  | expense | Matkakulut                                       | Travel expenses                         | Muut vähennyskelpoiset kulut / Other deductible expenses                | 25.5                   | otherDeductible |
| 344-vehicle | 344  | expense | Ajoneuvokulut                                    | Vehicle expenses                        | (same)                                                                  | 25.5                   | otherDeductible |
| 344-meeting | 344  | expense | Kokous- ja neuvottelukulut                       | Meeting expenses                        | (same)                                                                  | 25.5                   | otherDeductible |
| 344-other   | 344  | expense | Muut vähennyskelpoiset kulut                     | Other deductible expenses               | (same)                                                                  | 25.5                   | otherDeductible |
| 354         | 354  | expense | Kirjanpidon ulkopuoliset vähennyskelpoiset kulut | Deductible expenses outside bookkeeping | (same)                                                                  | 0                      | otherDeductible |
| 346         | 346  | expense | Korkokulut                                       | Interest expenses                       | Rahoituskulut / Financial expenses                                      | 0                      | financial       |
| 349         | 349  | expense | Muut rahoituskulut                               | Other financial expenses                | (same)                                                                  | 0                      | financial       |
| 353         | 353  | expense | Varausten lisäykset                              | Increase in provisions                  | Varausten muutokset / Changes in provisions                             | 0                      | provisions      |
| 365         | 365  | expense | Välittömät verot                                 | Direct taxes                            | Vähennyskelvottomat kulut / Non-deductible expenses                     | 0                      | nondeductible   |
| 366         | 366  | expense | Sakot ja muut rangaistusmaksut                   | Fines and penalties                     | (same)                                                                  | 0                      | nondeductible   |
| 367         | 367  | expense | Muut vähennyskelvottomat kulut                   | Other non-deductible expenses           | (same)                                                                  | 0                      | nondeductible   |

The table order is also the display order of the income statement.

**Sales categories on line 300** (income), each its own category:

| id           | Finnish                     | English                 | default VAT | kind     |
| ------------ | --------------------------- | ----------------------- | ----------- | -------- |
| 300-domestic | Myynti – Suomi              | Sales – Finland         | 25.5        | domestic |
| 300-eu       | Myynti – EU                 | Sales – EU              | 0           | eu       |
| 300-other    | Myynti – muut maat          | Sales – other countries | 0           | nonEu    |
| 300-reverse  | Myynti – käänteinen verotus | Sales – reverse charge  | 0           | reverse  |

**Default categories:** the four sales categories, plus one category per remaining line, with `id = line key`, `name = Finnish line name`, `vatRate = line default VAT`, and `kind = "domestic"` for income lines.

**Expense summary buckets** (Yhteenveto columns): `purchases` = Ostot ja ulkopuoliset palvelut, `personnel` = Henkilöstökulut, `depreciation` = Poistot, edustuskulut ja vuokrat, `otherDeductible` = Muut vähennyskelpoiset kulut, `financial` = Rahoituskulut, `provisions` = Varausten muutokset, `nondeductible` = Vähennyskelvottomat kulut.

**VAT rates offered** in the entry dialog: 25.5, 24, 14, 13.5, 10, 0, plus the entry's own rate if it differs. Background: the general rate rose to 25.5 % on 1 September 2024, and the 14 % rate was lowered to 13.5 % at the start of 2026. Older rates are kept for older entries and corrections. **Not yet implemented:** suggesting or validating the rate from the entry's date. The prototype only pre-fills the category default. Verify current rates with Verohallinto before relying on them.

---

## 6. Calculation rules

### 6.1 VAT report (ALV-laskelma)

The period is a month, a quarter or the whole year, within the selected financial year.

- **Sales VAT** (income entries):
  - Entries whose category kind is `eu`, `muutmaat` or `kaanteinen` are **not** part of sales VAT. Their net amounts are reported separately under "Muut ilmoitettavat myynnit": sales to other EU countries, sales outside the EU, and reverse-charge sales (construction services and scrap metal).
  - Other income entries with rate > 0 are grouped by rate (25.5, 24, 14, 13.5, 10). Rates not in the list go to "Muut verokannat".
  - Income entries at 0 % are included (in the 0 % row) **only if their category is on line 300**. 0 % income on lines 301–324 (grants, dividends, interest and so on) isn't VAT-relevant and is left out.
- **Purchase VAT** (expense entries): entries with rate > 0, grouped by rate. 0 % expenses (wages, YEL, bank fees) are not shown, and the 0 % row is hidden in the purchases table.
- **VAT payable** = total sales VAT − total purchase VAT. If negative, it is shown as **refundable** (palautettava), in green.

### 6.2 Totals strip on the ledger

For the selected month (or the whole year): income net total, expense net total, and VAT payable or refundable (same rules as 6.1).

### 6.3 Income statement (Tuloslaskelma)

- Revenue total = the sum of net amounts on all income lines.
- Deductible expenses = the sum of net amounts on expense lines **except** 365–367. This **includes 353 and 354**; the Excel omitted 354.
- Non-deductible expenses (365–367) are listed but not deducted. A note shows their total.
- Result = revenue − deductible expenses. If ≥ 0, it's labelled "358 Elinkeinotoiminnan tulos"; otherwise "359 Elinkeinotoiminnan tappio".
- Every line is shown even when zero (greyed out with "–"). Section headings carry the section totals.
- The period is 1.1.–31.12. of the selected year. All amounts exclude VAT.
- ⚠️ These rules match the user's Excel with its bugs fixed. Have the user verify them against Verohallinto's form 5 instructions, especially the treatment of 317 (tax-exempt income) and 354.

### 6.4 Summary (Yhteenveto)

For the selected year, by month (net amounts):

- A bar chart of income versus expenses per month, with year totals in the legend.
- A sales table: total sales (line 300 only), then columns Finland 25.5 / 24 / 14 / 13.5 / 10 / 0 %, EU, other countries, reverse charge, and "Muut tulot" (income on lines 301–324). Totals row.
- An expenses table: total, then one column per bucket. Totals row.

---

## 7. File formats

### 7.1 CSV

- **Header row**, always exactly these columns in this order:
  `pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;tosite`
- **The column names and their values are Finnish and must stay Finnish** — this
  is the user's file, it opens in Finnish Excel, and files already exported have
  to keep importing. The in-memory and stored field names are English (§4), and
  `lib/domain/csv.ts` is the single translation layer: `TYPE_TO_CSV` /
  `TYPE_FROM_CSV` for `tulo`/`kulu` and `MODE_TO_CSV` for `brutto`/`netto`.
  Nothing else in the codebase may spell a Finnish column name.
- **Export:**
  - UTF-8 with BOM, `;` delimiter, CRLF line endings. Fields containing `;`, `"` or line breaks are quoted with `"` (doubled inside).
  - `pvm` is ISO `YYYY-MM-DD`. `tyyppi` is `tulo` or `kulu`. `tili` is the account number.
  - `luokka` is the category's **Finnish** name (stable across UI languages).
  - `summa` uses a decimal comma with no thousands separator (`1882,50`). `alv` uses a decimal comma (`25,5`). `syotto` is `brutto` or `netto`.
  - `tosite` holds the receipt paths inside the ZIP, separated by `|`. **These are written even when exporting CSV only**, so a plain CSV still records which receipts existed and a re-import can mark them missing per §7.2. The prototype dropped them, which made a CSV-only export lossy.
  - Rows are sorted by date. The format is identical in both UI languages, so it opens directly in Finnish Excel.
- **Import (be lenient):**
  - Strip a BOM. Detect the delimiter from the header line (`;`, tab or `,`, whichever splits it most). Headers are matched case-insensitively. `pvm`, `tyyppi` and `summa` are required; the rest are optional.
  - Dates are accepted as `YYYY-MM-DD` or `D.M.YYYY` and validated as real dates.
  - Amounts may contain spaces, NBSP, `€` and a Unicode minus. If both `,` and `.` appear, the last one is the decimal separator. A lone comma is a decimal comma, except in English mode when the value matches a thousands pattern such as `1,234`.
  - `syotto` values `netto` or `veroton` mean net; anything else means gross. An empty `alv` uses the category default.
  - Category matching: same account number and side, and the name matches the Finnish name or the English default name (case-insensitive). If no name is given, the first category on that account is used. If there's no match but the account number exists, a **custom category** is created with that name. If the account is unknown, the entry is booked to 301 (income) or 344-other (expense) with a warning.
  - Invalid rows (bad date, type or amount) are skipped. A toast summarises: N entries imported, new categories, receipts imported or missing, and the first skipped rows.
  - After import, the selected year is the latest year found in the file.

### 7.2 ZIP (bookkeeping with receipts)

When any entry has an available receipt, export produces a ZIP. The user can tick "Vie vain CSV-tiedosto ilman tositteita" to export only the CSV. The structure is:

```
kirjanpito_2026-10-24.csv
tositteet/
  2026/
    01/
      2026-01-15_osto-k-rauta-tarvikkeet_1.jpg
      2026-01-15_osto-k-rauta-tarvikkeet_2.pdf
    10/
      2026-10-28_lasku-1005-makinen-rakennus-oy.pdf
```

- Path: `tositteet/{YYYY}/{MM}/{YYYY-MM-DD}_{slug(selite)}[_{n}].{ext}`. `_{n}` (1-based) is added only when the entry has several receipts. On a name collision, `-2`, `-3`, … is appended before the extension.
- Slug: lowercase; å/ä → a, ö → o; strip other diacritics; non-alphanumeric runs → `-`; trim dashes; at most 40 characters; fall back to `tosite`.
- The extension comes from the file name (`jpeg` → `jpg`), otherwise from the MIME type.
- Receipt files are stored without compression (STORE); the CSV is DEFLATE-compressed.
- **Import:** the user picks a ZIP. Use the shallowest `.csv` in it (ignoring `__MACOSX`). Paths in `tosite` are resolved relative to the CSV's folder, falling back to the ZIP root. Files found are stored in IndexedDB. Listed files that aren't found become `missing` attachments that keep their path, so re-exporting doesn't lose the reference. Importing a plain CSV that has `tosite` paths marks those receipts as missing in the same way.
- Unpacking, decoding and writing every receipt to IndexedDB takes seconds for a real ZIP, so the import raises `importing` in the store and the UI shows progress once it passes 400 ms — see §8.2.

### 7.3 File naming on export

An export dialog lets the user edit the base name, with a fixed extension shown beside the field (`.csv` or `.zip`). The default is `kirjanpito_{YYYY-MM-DD}` in Finnish or `accounting_{YYYY-MM-DD}` in English, using **today's date**. Characters `\ / : * ? " < > |` and control characters are stripped, and a trailing `.csv` is removed. An empty name falls back to the default. The last opened or exported name is shown in the sidebar, but it is **not** used as the default.

`fileName` in the store holds that name **with its extension** (`kirjanpito_2026-10-24.zip`), for display only, and is set by both import and export. Opening a file and finding the box still reading "Uusi kirjanpito" is the bug this format fixes: the first port hard-coded `fileName: null` on import, and the display site appended a literal `.csv`, which was wrong for a ZIP. `lib/commands/io-commands.test.ts` covers it.

### 7.4 Receipt files

- Accepted: images (`image/*`, including `.heic`/`.heif`) and PDF. Several per entry.
- Images: if the long edge is ≤ 2000 px, the file is ≤ 1.5 MB and the type is JPEG/PNG/WebP, the original is kept. Otherwise it is redrawn onto a white canvas with the long edge at 2000 px and saved as JPEG at quality 0.85, with the extension renamed to `.jpg`. If the browser can't decode it (e.g. HEIC outside Safari), the original is kept and the preview shows the file name instead.
- PDFs are stored as they are.
- Stored in IndexedDB: database `bookkeeping-receipts`, object store `files`, key = attachment id, value = Blob. (The prototype used `kirjanpito-tositteet`; see §12.)
- **Garbage collection:** after saving or deleting entries, closing the file, importing, or closing the entry dialog, delete IndexedDB files that no entry (and no open dialog) references. Revoke object URLs of removed thumbnails.

---

## 8. App structure and features

### 8.1 States and routes

- An **open/closed** flag: whether a bookkeeping is open. It is persisted. On load, if it isn't stored, it is true when entries exist.
- When **no bookkeeping is open**, every route shows the **landing page**.
- Views: landing, ledger, VAT return, income statement, summary, settings. The prototype used Finnish hash routes (`etusivu`, `kirjanpito`, `alv`, `tulos`, `yhteenveto`, `asetukset`); the real app uses **English** Next.js routes — see §11b. Only the visible labels are translated.
- The app logo / brand links to the landing page.
- Persisted UI preferences: language, theme, selected year, last amount mode and type used in the entry dialog, rows per page for each table, and whether the sidebar is collapsed. Language and theme each have their own localStorage key; the rest live with the bookkeeping (§12).

### 8.2 Shell (sidebar + top bar)

The layout follows the sibling project FormBox (`../formbox`): a sidebar that
holds the brand, the file and the navigation, and a top bar across the content
area for the view's context and the user's preferences. **The top bar is the
same at every width**, so no control exists twice; below 900 px the sidebar
becomes a sheet instead of the app growing a second header. The earlier split
— a desktop sidebar plus a separate mobile top bar with its own copies of
everything and a row of nav tabs — is gone.

- **Sidebar** (`components/app/app-sidebar.tsx`, shadcn `Sidebar`,
  `collapsible="icon"`), top to bottom:
  - Brand: a "K" mark, "Kirjanpito", and the subtitle "Yhdenkertainen kirjanpito" — shortened from the prototype's "Toiminimen yhdenkertainen kirjanpito", which could not fit the button without truncating. The two lines need `leading-tight`: at the default leading they are 36 px and the `size="lg"` button's content box is 32. Links to the landing page.
  - **`components/app/file-box.tsx`** — the financial year and the open file, which belong together because the year is read out of the file:
    - "Tilikausi" and a year selector, offering the years found in the data plus the current year and the selected year.
    - A recessed panel (`border`, `bg-background` on the `--sidebar` surface, as the prototype's `.filebox`): the file name (or "Uusi kirjanpito") with a "✕ Sulje" button on its right, a status dot with text (amber "Muutoksia, joita ei ole viety" / green "Kaikki muutokset viety"), and side-by-side "Tuo" and "Vie" buttons. **"Vie" is `variant="default"` while there are unexported changes** and `outline` otherwise. The three labels are deliberately one word each: they share one narrow column, and the panel above them already names the file.
  - Navigation with icons: Kirjanpito, ALV-laskelma, Tuloslaskelma, Yhteenveto, Asetukset.
  - **A secondary group pinned to the bottom with `mt-auto`**, as in FormBox's sidebar: an "Ohje" row linking to the landing page's FAQ (`LANDING_FAQ`, the `#faq` anchor on that section), and the §1 disclaimer "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa." as plain text under it. The app is reachable without ever passing the landing page — a bookmark goes straight to `/app/ledger` — so the explanation of what this is needed a route back, and the disclaimer appeared only on the landing and in the report notes, never where the figures are entered. The rail keeps the link and drops the text, the same rule the file box follows.
  - ≥ 900 px it collapses to a 3 rem icon rail; below 900 px it is a sheet, and tapping a link closes it. Navigation rows are `SidebarMenuButton`s and collapse on their own. **The file box cannot** — neither a select nor a bordered panel fits a rail — so it renders twice: the box, and an icon menu (Avaa tiedosto / Vie tiedosto / Sulje tiedosto) that takes over in icon mode. Both must offer the same three actions; collapsing is allowed to lose the name, the status line and the year, nothing else.
  - The expanded / collapsed state is `sidebarOpen` in the store (§12), **not** shadcn's `sidebar_state` cookie: nothing is server-rendered, so a cookie could never be read back.
- **Top bar** (`components/app/app-topbar.tsx`), laid out like FormBox's `AppHeader`: `h-14`, `gap-2`, `px-4 lg:px-6`, sticky, and **no rule below it** — the sidebar's border already separates the chrome from the page, and a second line only boxed the content in. It holds only what is the same on every view — a panel icon on the left that collapses the sidebar (≥ 900 px) or opens it as a sheet (< 900 px), and, pushed right, the theme toggle and the language picker. The icon is hand-rolled rather than shadcn's `SidebarTrigger`, which hard-codes an English screen-reader label.
  - **Every control in the bar is 32 px tall** — `size="icon"` buttons and the default `Select` trigger — so the row reads as one line rather than three sizes. Match that when adding anything.
- **Theme toggle:** one ghost button with a sun / moon icon that flips light ↔ dark, as in FormBox. There is no "system" control — next-themes still has `defaultTheme="system"`, so an untouched browser follows the OS; it simply cannot be chosen back. Both icons are always in the markup and CSS picks one off the `.dark` class, so the prerendered HTML is already right.
- **Language picker:** a globe button opening a checked list of Suomi / English (endonyms, so each option reads the same either way). Language stays a stored preference, never a route (§11b).
- **Drag and drop anywhere:**
  - Dropping a CSV or ZIP opens it. A full-screen overlay says "Pudota CSV- tai ZIP-tiedosto avataksesi sen".
  - While the entry dialog is open, dropped images and PDFs are attached to it instead, and the dialog gets a dashed outline.
  - Dropping media while no dialog is open shows a hint to open an entry first.
- **Reading a file shows progress, but only once it is slow** (§7.2). `importing` in the store is raised for the whole of `openFile`, and `hooks/use-delayed-flag.ts` turns it into a visible state **after `BUSY_DELAY_MS` (400 ms)**: the sidebar's "Tuo" button becomes a spinner, "Vie" is disabled, and `components/app/import-overlay.tsx` covers the page with "Avataan tiedostoa…". A plain CSV opens in a few milliseconds and never reaches the delay, so nothing flickers; a ZIP of receipts does, and used to leave the UI silent for seconds. The overlay is **blocking**, unlike the drop overlay — the import is about to replace the whole bookkeeping. Both the app and the landing page render it, because a file can be picked from either and the drop overlay vanishes the instant the file lands. `importing` also guards re-entry: a second file dropped mid-import is ignored rather than interleaving two `replaceBook` calls.

### 8.3 Landing page

A full-width page with no sidebar. It has its own nav: logo, FI/EN, theme, and "Avaa tiedosto" (or "Avaa kirjanpito" when a bookkeeping is open). Sections:

1. **Hero.**
   - Headline "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon." and a lead paragraph.
   - Calls to action:
     - Closed state: "Aloita uusi kirjanpito" and "Avaa tiedosto", plus a dashed drop zone ("Pudota CSV- tai ZIP-tiedosto tähän…").
     - Open state: "Jatka kirjanpitoa" and "Avaa tiedosto", with a meta line showing the file name, the number of entries and the unexported-changes status.
   - Visual: two overlapping, slightly rotated paper receipts on a soft accent panel. One is an expense receipt, the other the October VAT calculation ending in "Maksettava 617,18 €". On small screens only the VAT receipt is shown.
2. **"Tositteesta veroilmoitukseen neljässä vaiheessa".** Four numbered steps: open or start, record receipts (including attaching), check the figures, export (a ZIP organised by year and month).
3. **"Mitä kirjanpito laskee puolestasi".** Three cards: VAT (with rate chips), income statement (a mini statement), and monthly summary (a mini bar chart).
4. **"Ei tiliä, ei tietokantaa".** A privacy explanation next to a CSV sample block.
5. **"Kysyttyä".** An accordion with four questions: who it's for, whether it files returns, moving over from Excel (lists the columns; `tosite` is optional), and what happens when the browser is closed.
6. A closing call to action, "Aloita tämän kuun tositteista.", and a footer disclaimer: "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa."

- "Aloita uusi kirjanpito" opens an empty ledger and sets the year to the current year. If there are unexported changes, it asks first.

### 8.4 Ledger (Kirjanpito)

- Header: "Kirjanpito", the period ("Koko vuosi 2026" or "Lokakuu 2026"), and a primary "Uusi kirjaus" button.
- **Month chips:** Kaikki plus Tammi…Joulu, with entry counts. Empty months are greyed. The selected chip is a filled pill.
- **Totals strip** (§6.2): three cells in one bordered bar, not separate cards.
- **Toolbar:**
  - Search over description and category.
  - A type filter (Kaikki / Tulot / Kulut).
  - A category filter, listing only the categories used in the period.
  - "Tyhjennä suodattimet" when any filter is active.
  - An entry count ("16 kirjausta").
- **Table columns:** Pvm, Selite, Luokka, Veroton, ALV (amount, with the rate small below), Verollinen (bold, with "−" for expenses), and actions.
  - Every column is sortable, with ↑/↓ shown on the active column and ⇅ on the others. The default sort is date ascending. Sorting by gross uses signed values.
  - Rows have a coloured left edge: green for income, red for expenses.
  - The description cell shows a **paperclip button** (with a count if there are several receipts) that opens the viewer.
  - Row actions: **edit (pencil)**, **copy as new**, and delete. Clicking or pressing Enter on a row also edits it.
  - Responsive: the category column is hidden under 1240 px. Under 560 px, the net, VAT and actions columns are hidden (tap the row to edit).
- **Pagination** (shown when there are more than 10 rows): "Rivejä sivulla" with a 10/25/50/100 select (default 10), "Sivu 1 / 2", and first / previous / next / last icon buttons. The page resets to 1 when filters, sorting or the month change.
- **Empty state** (open but no entries): "Ei vielä kirjauksia" with "Uusi kirjaus" and "Avaa tiedosto".

### 8.5 Entry dialog (Uusi kirjaus / Muokkaa kirjausta / Kopio kirjaus)

A two-column modal. On mobile the columns stack.

- **Left column:**
  - Date.
  - Type as a segmented control (`EntryTypeToggle`: Tulo / Kulu, coloured green and red when selected).
  - Description (placeholder "Esim. Lasku 1006 – Asiakas Oy").
  - Category select: only enabled categories of the chosen type, plus the entry's current category even if disabled.
  - Amount, right-aligned with tabular figures.
  - VAT % select: picking a category sets its default rate.
  - "Summa on" segmented control (Verollinen / Veroton).
  - An inline error line.
- **Footer:**
  - Edit mode: Poista, Kopioi uudeksi, Peruuta, Tallenna.
  - New and copy modes: Peruuta, Tallenna ja uusi, Tallenna.
- **Right column:**
  - A **live receipt preview**, the signature visual element. It looks like a paper receipt with a perforated bottom edge and shows: type, date, description, category, net, VAT with rate, a bold total, and a badge ("Kasvattaa myynnin veroa" / "Vähennetään ostojen verona" / "Ei arvonlisäveroa").
  - Below it, the **"Tositteet" section:** a two-column grid (three on tablets) of 3:4 thumbnails. Images are shown cropped to the top; PDFs show their first page with a "PDF" badge. Each has a remove ✕. An "+ Lisää tosite" tile and the hint "Kuva tai PDF. Voit myös raahata tiedoston tähän." follow. Clicking a thumbnail opens the viewer on that receipt.
- **Defaults for a new entry:** if a month is selected, its date (today's day, capped at 28). Otherwise today if the year matches, else 1.1. of the selected year. The type and amount mode are the last ones used.
- **Validation:** a valid date, a non-zero amount and a chosen category are required. Error texts: "Anna päivämäärä.", "Anna summa, esim. 124,50.", "Valitse luokka." The error is held as `{ field, message }` where `field` is the `FormState` key: one `FieldError` line shows the message, and the field it names carries `aria-invalid` (the category select takes it through `OptionSelect`'s `invalid` prop). Editing that field clears the error, rather than leaving a complaint under a corrected value until the next save.
- **Tallenna ja uusi** saves, keeps the date, and resets the rest for the next entry.
- **Copy as new** (from a row or from the edit dialog): opens a new entry with every field copied **except receipts**. The date becomes today if the year matches, and the date field gets focus. The title is "Kopio kirjaus".
- Saving an entry from another year switches the selected year to that year.
- **Unsaved changes:** a snapshot of all fields (including receipt ids) is taken when the dialog opens. Closing with Peruuta or Escape while the snapshot differs asks "Hylätäänkö muutokset?" with the buttons "Jatka muokkausta" and "Hylkää muutokset". With no changes, it closes immediately.

### 8.6 Receipt viewer

A near full-screen modal.

- The top bar shows the file name and a sub-line ("Tosite 1 / 2, 139 kt").
- Controls:
  - Previous/next receipt (when there are several).
  - Previous/next page with "Sivu 1 / 3" (PDFs with several pages).
  - Zoom out, a zoom percentage, and zoom in (1×–4×, steps of 1.5×).
  - Fit to view, rotate 90°, save original, and close.
- The stage is a scrollable grey area. The content is drawn to a canvas: fitted to the stage at 100 %, sized for the device pixel ratio, with the image or PDF page rotated. Images never upscale beyond 100 % at fit. The view redraws on window resize.
- Keyboard: ←/→ moves between receipts, and +/− zooms.
- Missing files show "Tiedosto puuttuu" with the path. Undecodable images or PDFs show a message and a "save original" button.

### 8.7 VAT return (ALV-laskelma)

- Period controls: a segmented control (Kuukausi / Neljännesvuosi / Vuosi) and a select for the month or quarter ("4. neljännes (Loka–Joulu)").
- A result banner: "Maksettava arvonlisävero" (or "Palautettava…") as a large number, with the formula line "Myynnin vero X − ostojen vähennettävä vero Y".
- Two tables side by side, "Myynnin arvonlisävero" and "Ostojen vähennettävä vero", with the columns Verokanta, Veroton, Vero and Yhteensä, plus a totals row.
- A "Muut ilmoitettavat myynnit" panel, and a note explaining 0 % purchases and asking the user to check the figures before filing in OmaVero.

### 8.8 Income statement (Tuloslaskelma)

Presented as a printable **sheet**: the `--sheet` surface (warm paper in light, the card tone in dark — see §11), a thin border, and a soft shadow. It has the title, the period, sections with totals, greyed group headings, lines with muted account numbers, and a double-ruled result line. A "Tulosta" button calls `window.print()`, and the print styles hide the chrome.

### 8.9 Summary (Yhteenveto)

See §6.4. Wide tables scroll horizontally with a sticky first column.

### 8.10 Settings (Asetukset)

Every section on this page is a `Panel` (§11).

- **"Lisää oma luokka" form:**
  - Type — the same `EntryTypeToggle` the entry dialog uses, so the two controls read alike: Tulo before Kulu, coloured when selected.
  - Income statement line, filtered by type.
  - Name (required).
  - Default VAT % (validated as 0 ≤ x < 100).
  - **"Lisää" sits on the panel's footer strip**, not in the grid. It used to share the fourth cell with the VAT input, which cramped both.
  - New income categories get `kind: "domestic"`.
  - One error line (`FieldError`) under the grid, and **the field it is about carries `aria-invalid`** — the error is stored as `{ field, message }`. A bad VAT rate used to light up the name input, because the message was a bare string with nowhere to point. Typing in the offending field clears it.
  - The typed values survive re-renders. Leaving the page with a typed but unadded name asks first.
- **Categories table:**
  - Search, a type filter, and a count.
  - Sortable columns: Käytössä (checkbox), Tyyppi (badge), Tili, Nimi, and Oletus ALV % (an inline input that commits on change and shows a toast).
  - Delete is only offered for custom categories that no entry uses.
  - Pagination with a default of 25 rows.
- **Two data panels, not one.** Restoring categories is reversible and routine; clearing the entries erases the bookkeeping from this browser. One shared section gave them the same visual weight, which is exactly wrong for the second.
  - "Tiedot" — a description of what restoring does, and "Palauta oletusluokat" (`outline`) on the footer. It restores the defaults and keeps custom categories that are in use.
  - A `variant="destructive"` panel titled "Tyhjennä kirjaukset", with "Tyhjennä" (`destructive`) on the footer. It deletes all entries (with a confirmation) and leaves the bookkeeping open but empty.

### 8.11 Confirmations and unsaved-change rules (apply everywhere)

Use one shared `AlertDialog`-based `confirm()` helper, with a title, a message, a destructive confirm button (red) and a cancel button. The cancel button can be relabelled, e.g. "Jatka muokkausta", and gets focus by default. Cases:

| Trigger                                | Condition                       | Title / confirm label                                                     |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| Close file ("Sulje")                   | unexported changes              | "Suljetaanko tiedosto?" / "Sulje viemättä"                                |
| Start new bookkeeping                  | unexported changes              | same as above                                                             |
| Open a file over the current one       | unexported changes              | "Korvataanko avoin kirjanpito?" / "Korvaa"                                |
| Delete an entry (row or dialog)        | always                          | "Poistetaanko kirjaus?" / "Poista"                                        |
| Clear all entries                      | always                          | "Tyhjennetäänkö kirjaukset?" / "Tyhjennä"                                 |
| Close the entry dialog (Peruuta / Esc) | form differs from its snapshot  | "Hylätäänkö muutokset?" / "Hylkää muutokset", cancel = "Jatka muokkausta" |
| Navigate away from Settings            | the new-category name is filled | same as above, with the category message                                  |
| Browser tab close (`beforeunload`)     | any of the above dirty states   | the browser's native prompt                                               |

**Dirty bookkeeping** means the entries changed since the last import or export. It is set by any add, edit or delete, and cleared by a successful export or an import.

Closing a file clears entries, the file name and filters, sets the bookkeeping to closed, garbage-collects receipts, and returns to the landing page.

---

## 9. Internationalisation and formatting

- Two languages: **Finnish (default)** and **English**. The choice is persisted. Update `<html lang>` and the document title when it changes. Every UI string is in a dictionary keyed by id, with `[fi, en]` values and `{param}` interpolation. Plural forms are functions (e.g. "1 kirjaus" / "{n} kirjausta"). The artifact's `L` object holds every string and is the source to port. A typed dictionary is enough; no locale routing is needed.
- **Keys are `namespace.name`** — `t("io.zipNoCsv")`, `t("confirm.clearTitle")`, `t("settings.defaultVat")`. The namespaces are app, common, confirm, entry, file, io, landing, ledger, nav, notFound, receipt, settings, statement, summary, table, vat, viewer. `common.*` is only for words several views share; anything used in one place belongs to that place's namespace even when it is short. The keys were once flat and abbreviated (`setSub`, `f_type`, `nCats`, `delT`, `fb_import`) with four inconsistent prefix styles — unreadable at the call site, and with no room for a second settings subtitle. `messages.test.ts` enforces the shape and the list of namespaces, which is what stops the next key being added the old way.
- **The namespace is not the module.** Which of `dict/app.ts` and `dict/landing.ts` a key lives in is a bundling decision (the landing bundle must not ship all ~300 keys in both languages), so a namespace may be split across both: `nav.vat`, `receipt.*` and `statement.profit` sit in the landing module because the hero's decorative receipt and mini statement need them. Keys stay disjoint between the two; a test checks it.
- **Currency always uses Finnish formatting in both languages:** `1 234,56 €` (`Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" })`). The amount input also shows the Finnish format.
- **Dates:**
  - Finnish UI: `8.1.2026`.
  - English UI: `8 Jan 2026` (`en-GB`, `day: numeric, month: short`).
  - CSV: always ISO.
- **VAT rates:** Finnish `25,5 %`, English `25.5%`.
- **File sizes:** `kt`/`Mt` in Finnish, `KB`/`MB` in English.
- Months have full and short names in both languages (Tammi…Joulu / Jan…Dec).
- Sorting uses `Intl.Collator` for the current language with numeric ordering.
- Category names: default categories are translated, custom ones are not. The CSV always uses Finnish names.
- **Typography in UI copy:** use typographic apostrophes and quotes (’ in English, “ ” in English, ” ” in Finnish), an en dash for ranges, and the minus sign (−) for negative amounts.

---

## 10. Reference data (test fixture)

Sixteen gross entries for 2026. **The app has no sample ledger**: there is no "Kokeile esimerkillä" button, no `loadDemo` command and no way for a user to load these entries. They live only in `lib/domain/test-helpers/sample-book.ts` (`sampleEntries()`) as the fixture the calculations are verified against. An eslint `no-restricted-imports` rule blocks `lib/domain/test-helpers/*` outside test files, so the fixture cannot drift back into the app.

| date       | description                      | type    | catId        | amount (€) | vatRate |
| ---------- | -------------------------------- | ------- | ------------ | ---------- | ------- |
| 2026-01-08 | Lasku 1001 – Mäkinen Rakennus Oy | income  | 300-domestic | 2510.00    | 25.5    |
| 2026-01-15 | Osto – K-Rauta – tarvikkeet      | expense | 333          | 186.40     | 25.5    |
| 2026-01-31 | Puhelinliittymä – Elisa          | expense | 344-other    | 29.90      | 25.5    |
| 2026-02-12 | Lasku 1002 – Virtanen            | income  | 300-domestic | 1255.00    | 25.5    |
| 2026-02-20 | Työtilan vuokra, helmikuu        | expense | 343          | 450.00     | 25.5    |
| 2026-03-03 | Lasku 1003 – Nordic Build AB     | income  | 300-eu       | 3200.00    | 0       |
| 2026-03-18 | Polttoaine – Neste               | expense | 344-vehicle  | 92.35      | 25.5    |
| 2026-03-20 | Työtilan vuokra, maaliskuu       | expense | 343          | 450.00     | 25.5    |
| 2026-04-09 | Lounaspalaveri asiakkaan kanssa  | expense | 344-meeting  | 48.60      | 13.5    |
| 2026-04-20 | Työtilan vuokra, huhtikuu        | expense | 343          | 450.00     | 25.5    |
| 2026-05-14 | Lasku 1004 – Laaksonen Oy        | income  | 300-reverse  | 4800.00    | 0       |
| 2026-06-02 | YEL-maksu                        | expense | 336          | 310.00     | 0       |
| 2026-09-22 | Kirjanpito-ohjelma, vuosimaksu   | expense | 344-other    | 119.00     | 25.5    |
| 2026-10-10 | Osto – K-Rauta – Tarvikkeet      | expense | 333          | 100.00     | 25.5    |
| 2026-10-28 | Lasku 1005 – Mäkinen Rakennus Oy | income  | 300-domestic | 1882.50    | 25.5    |
| 2026-10-30 | Pankin palvelumaksut             | expense | 349          | 8.50       | 0       |

Useful checks against this data (all verified by the unit tests in `lib/domain`):

- **Whole year 2026:** income net 12 500,00 €, expenses net 1 857,47 €, sales VAT 1 147,50 €, purchase VAT 387,28 €, **VAT payable 760,22 €**. Income statement: revenue 12 500,00 €, deductible expenses 1 857,47 €, result **358 = 10 642,53 €**.
- **October 2026:** sales VAT 382,50 € − purchase VAT 20,32 € = **VAT payable 362,18 €**. (Q4 is the same, because November and December are empty.)
- **January 2026:** income net 2 000,00 €, expenses net 172,35 €, VAT payable 466,05 €.

> An earlier version of this section claimed October showed 617,18 € payable from sales VAT 637,50 €. Those two figures are decorative constants in the prototype's landing hero (`docs/prototype/kirjanpito.html` lines 1037 and 1039, `fmt(63750)` / `fmt(61718)`) and do not follow from the §10 entries: the only October sale is 1 882,50 € gross at 25,5 %, giving 382,50 € of sales VAT. The hero's numbers are illustration and may stay as they are.

The user also provided two real receipts for testing (a Motonet till receipt as JPG, and a Pleksi invoice as PDF). **Do not bundle them into the fixture or commit them**: the invoice contains a person's name, phone number and email address.

---

## 11. Design system

The aim is a calm, Nordic, functional tool. The one bold element is the **paper receipt motif**: the live preview in the entry dialog and the landing hero. Everything around it stays quiet. Avoid generic SaaS-card layouts, gradients, all-caps labels and decorative motion.

> **`app/globals.css` is the source of truth for colours, and it is the
> prototype's palette.** Every value is the matching `docs/prototype/kirjanpito.html`
> hex converted to oklch, with the hex kept beside it in a comment so the two
> can be diffed. The prototype's variable names map onto the theme's as:
>
> | prototype     | theme                                |
> | ------------- | ------------------------------------ |
> | `bg`          | `background`                         |
> | `surface`     | `card`, `popover`, `sidebar`         |
> | `sunken`      | `muted`, `secondary`, `accent`       |
> | `ink`         | `foreground`                         |
> | `muted`       | `muted-foreground`                   |
> | `rule`        | `border`                             |
> | `rule-strong` | `input`                              |
> | `accent`      | `primary`, `ring`, `sidebar-primary` |
> | `accent-ink`  | `primary-foreground`                 |
> | `out`         | `destructive`                        |
>
> The rest of the shadcn theme still holds: style `base-nova` on Base UI,
> `--radius: 0.625rem`, Geist via `next/font/google`. Use the semantic
> variables and the standard component variants. **Never hard-code a hex value
> and never write a manual `dark:` override.** A `bg-card` panel over the
> `--background` canvas is how the prototype's `.panel` sits on `--bg`; a
> bordered panel with no fill would vanish into the page.
>
> `--accent-soft` has no theme equivalent — shadcn's `--accent` is the neutral
> hover grey, not a tint of the brand colour. The landing hero panel uses
> `bg-primary/10` instead, which gives both themes what the prototype spells
> out as two hex values.
>
> **Nine variables were added** on `:root` and `.dark`, because the theme has no
> equivalent and its nearest colours already mean something else — `--primary` is
> the call-to-action fill and `--destructive` means "error", not "expense":
>
> | variable                                          | use                                                              |
> | ------------------------------------------------- | ---------------------------------------------------------------- |
> | `--income` / `--income-subtle`                    | income amounts, the Tulo segment, row edge, income bars          |
> | `--expense` / `--expense-subtle`                  | expense amounts, the Kulu segment, row edge, expense bars        |
> | `--paper` / `--paper-foreground` / `--paper-edge` | the receipt motif: the entry dialog preview and the landing hero |
> | `--sheet` / `--sheet-edge`                        | the income statement and the landing's CSV sample                |
> | `--warning`                                       | the amber "Muutoksia, joita ei ole viety" status dot             |
>
> They are exposed through `@theme inline` as `--color-income`, `--color-expense`
> and so on, so they work as `bg-income`, `text-expense`, `bg-paper`.
> A `.tabular` utility, `.paper-surface` and the `@media print` rules also live
> in `globals.css`.

### Paper and sheet are two different surfaces

The prototype split them, and the app follows:

- **`--paper`** is the receipt motif — a printed slip, so it stays warm paper
  with dark ink **in both themes**. `.dark` deliberately does not override it.
  Because of that, whatever is printed on it has to stay light too: the
  `.paper-surface` class on `ReceiptPaper` pins `--income` / `--expense` and
  their subtle fills back to their light values, exactly as the prototype's
  `.receipt` redeclares the same variables. Dark mode's pale mint badge on warm
  paper is unreadable and its near-black fills read as ink blots.
- **`--sheet`** is the income statement (§8.8) and the landing's CSV sample — a
  document on screen rather than an object, so it follows the theme, goes dark
  with it, and carries the ordinary `foreground` / `muted-foreground` text.
  Only in light mode is it the same warm tone as `--paper`.

- **Type:** Geist (400–700) for everything, with tabular figures for numbers. Page titles are 26 px / 600 / −0.02 em. The landing headline is `clamp(38px, 5.4vw, 64px)` with tight leading (1.03) and −0.035 em tracking.
- **Radii:** 6 px for inputs and buttons, 10 px for panels, 14 px for dialogs and large cards. Segmented controls and chips are pills.
- **Theme:** light ↔ dark from the top bar, defaulting to the system theme (§8.2).
- **Responsive breakpoints:** 900 px (the sidebar becomes a sheet; dialogs stack) and 560 px (compact table and totals). 900 is also `MOBILE_BREAKPOINT` in `hooks/use-mobile.ts`, and the `min-[900px]:` that replaced shadcn's hard-coded `md:` inside `components/ui/sidebar.tsx` — the CSS and the JS have to flip on the same pixel.
- **Accessibility:** visible focus rings, `aria-sort` on sortable headers, `aria-pressed` on toggles, `aria-label` on icon buttons, `prefers-reduced-motion` respected. The only motion is a short pop-in on dialogs.

### Suggested shadcn/ui mapping

Sidebar → shadcn's `Sidebar` (with `Sheet`, `Tooltip` and `hooks/use-mobile.ts`), in `components/app/app-sidebar.tsx`. It was hand-written and the shadcn one deleted while the sidebar was a static panel; §8.2's collapse-to-icons and mobile sheet are exactly the machinery it provides, so it came back — the one local edit is the 900 px breakpoint. Language picker → `DropdownMenu`. Buttons → `Button` (variants default, outline, ghost, destructive). Segmented controls → `ToggleGroup`. Selects → `Select`. Entry, export and viewer dialogs → `Dialog`. Confirmations → `AlertDialog`. Tables → `Table`, hand-composed (see §2). Pagination → `components/common/table-pagination.tsx` ("Rows per page", "Page 1 of 2", «‹›»). Field errors → `FieldError` from `components/ui/field.tsx` — never a hand-rolled `<p className="text-sm text-destructive">`, and never without `aria-invalid` on the field the message is about. Toasts → `components/ui/toast.tsx` (see §2). FAQ → `Accordion`. Checkboxes → `Checkbox`. Inputs → `Input`. Chart → Recharts, used directly in `summary-view.tsx`; shadcn's `Chart` wrapper was removed. Use the shadcn/ui skill for component usage.

### One source of truth per element

Anything that appears in two views is a component in `components/common/`, taking attributes rather than being rebuilt. A second hand-written copy of a class string is how one view ends up a shade off every other, so when a shape is needed twice, the second use extends the first instead of restating it.

| element                      | component                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every bordered box           | `surface.tsx` — `radius` (lg / xl) and `tone`. shadcn's `Card` is not used; it was deleted (§11)                                                                                                                                                                               |
| a box with a ruled heading   | `panel.tsx`, built on `Surface`. `title`, `description` and `actions` are all optional — with none of them it is a bare box, which is what the totals strip and the VAT banner are. `footer` is a tinted strip for buttons acting on its contents; `variant="destructive"` is for an action that cannot be undone |
| tables                       | `ui/table.tsx`. Row padding is the `density` prop — `"comfortable"` for the ledger, the default elsewhere — never a `[&_td]:` override at the call site. `Table` is already the horizontal scroller, so never wrap it in another `overflow-x-auto` |
| money                        | `money.tsx` — `Money` with `tone` / `signed`, `ZeroDash` for an absent amount. Only a string context (an interpolated message, a chart tick, `ReceiptRow`) calls `f.money` directly, and writes a minus with `MINUS`, never a literal |
| a control that can be busy   | `busy-button.tsx` — `BusyButton` swaps the icon for a spinner and, with `busyLabel`, the label too; `BusyIcon` is the swap alone, for controls that are not `Button`s |
| small labels                 | `pill.tsx` — `tone` (neutral / income / expense) and `size`. shadcn's `Badge` is not used: `--destructive` means "error", not "expense" |
| income or expense            | `filter-controls.tsx` — `EntryTypeToggle` (income first, coloured) and `TypeFilterToggle` (all / income / expense) |
| a full-screen scrim          | `overlay.tsx` — `blocking` is the whole difference between the import overlay and the drop hint |
| a dashed "put a file here"   | `drop-tile.tsx` — owns the outline, hover, focus and disabled state; the caller gives it its shape |
| the receipt motif            | `receipt-paper.tsx` — `ReceiptPaper` and its `Head` / `Rule` / `Row` / `Total` parts, shared by the entry preview and the landing hero |
| landing and 404 type         | `typography.tsx` — `DisplayHeading` (`size` lg / md), `Lead`, `SectionHeading` |
| the root of a document       | `LangRoot` in `lang-provider.tsx` — the app shell, the landing page and the 404 all start with it |
| sortable column headers      | `sortable-header.tsx` |
| single-choice selects        | `option-select.tsx` |
| page titles inside the app   | `page-header.tsx` |
| the header and footer outside the app shell | `site-chrome.tsx` |

`components/landing/og-image.tsx` is the one deliberate duplicate: Satori supports no CSS variables and no Tailwind, so the card restates the receipt in literal hex and inline flex. It cannot share anything above.

**Only the components actually in use are kept.** `components/ui/` holds 22 files; `avatar`, `badge`, `breadcrumb`, `card`, `chart`, `drawer`, `scroll-area`, `sonner` and `tabs` were generated by the shadcn CLI, never imported, and deleted. (`dropdown-menu`, `sheet`, `sidebar` and `tooltip` were deleted too, then re-added for §8.2's shell.) Re-add any of them with `npx shadcn add <name>` if a use appears — do not keep unused ones around on spec. `card` and `badge` are the exceptions that stay out: `Surface` and `Pill` cover them with the variants this app actually needs, and the table above says why.

---

## 11b. SEO and the route structure

The landing page is the public document; the bookkeeping app is not.

> **Indexing is currently switched off entirely.** `INDEXABLE` in `lib/site.ts`
> is `false` while the site is served from its github.io working URL: a search
> result pointing there would outlive the move to the real domain and compete
> with it as a duplicate. The flag drives three things — the robots meta on
> every document (`app/layout.tsx`), `robots.txt` and the sitemap — and
> `test/seo.test.tsx` asserts all three against it, in whichever position it
> is in, so flipping it cannot leave one behind. The Open Graph card is
> deliberately **not** gated: noindex keeps a page out of search results, not
> out of a chat app's link preview. Turn it on in the same change that sets
> `BASE_PATH` back to `""` and `SITE_URL` to the custom domain. Everything
> below describes how the site behaves with it on.

**Only Finnish is indexed.** English remains a first-class UI language (§9), but
it is a stored preference, not a URL. That single decision is what keeps the
route tree flat — see "One root layout" below for what the alternative cost.

```
app/
  robots.ts                      → /robots.txt      (disallows /app/)
  sitemap.ts                     → /sitemap.xml     (/ only, no alternates)
  not-found.tsx                  → /404.html        noindex, title only
  layout.tsx                     ROOT LAYOUT — <html lang="fi">
  page.tsx                       /                  landing, indexed
  og/[file]/route.tsx            /og/opengraph-image.png  1200×630 via next/og
  app/
    layout.tsx                   AppShell + metadata.robots = noindex, nofollow
    page.tsx                     /app → /app/ledger
    ledger/  vat/  statement/  summary/  settings/
```

- **The app routes are English** (`/app/ledger`, `/app/vat`, `/app/statement`,
  `/app/summary`, `/app/settings`), in both UI languages. Each segment is the key
  it has in `APP_ROUTES`, so a route and the code linking to it cannot drift.
  Nothing under `/app` is indexed, so there is no SEO reason to localise the
  paths, and a single set of URLs keeps language switching a pure state change
  rather than a navigation.
- **`/app` itself redirects to `/app/ledger`** (`components/app/app-index-redirect.tsx`).
  It is a guessable, bookmarkable URL, and without a page here the export has no
  `out/app/index.html` and it would 404. Static export rules out a server-side
  redirect, which costs nothing: the app is client-only and AppShell already
  holds every route back until the store has rehydrated. Only the open case is
  handled — AppShell already sends a closed bookkeeping to the landing (§8.1).
- **One root layout.** An earlier version had two, inside `(fi)` and `(en)` route
  groups, because only a root layout renders `<html lang>` and each indexed
  document must ship the right one in its static HTML. Dropping the indexed `/en`
  removed that requirement and with it the route groups, the `hreflang`
  alternates, the sitemap alternates, the first-visit language seeding, and the
  full page load that a landing-language switch used to be. **Do not reintroduce
  a per-language URL without reinstating all of it.**
- **The 404 is the ordinary `app/not-found.tsx`**, wrapped by the root layout
  like any other page; `experimental.globalNotFound` is gone from
  `next.config.ts` along with the second root layout that forced it. Next already
  adds the `noindex` meta, so the file only sets a title. (With `INDEXABLE` off
  the 404 carries two robots tags, Next's and the root layout's; they agree, and
  a crawler takes the most restrictive of several anyway.) The page is plain text
  and buttons — no receipt motif: it is a dead end, not a document.
- **`output: "export"`** with `trailingSlash: true` and `images.unoptimized`.
  `robots.ts`, `sitemap.ts` and `og/[file]/route.tsx` are Route Handlers and
  need `export const dynamic = "force-static"` — without it the build fails.
  `ImageResponse` does emit PNGs under static export; `verify-export.mjs`
  checks the file is there and really is a PNG.
- **The OG card is a route handler, not the `opengraph-image.tsx` convention.**
  The convention emits an extensionless `out/opengraph-image` and tags it as
  `/opengraph-image`, relying on the route's `contentType` export — which only
  a host that serves the route can honour. GitHub Pages serves plain files and
  types each response from its extension, so that file would go out as
  `application/octet-stream` and link-preview crawlers would reject it
  (vercel/next.js#82177). A dynamic segment with one literal value makes the
  export write a real `out/og/opengraph-image.png` instead. `OG_FILE` /
  `OG_PATH` in `components/landing/og-image.tsx` are the single source of that
  name, and `app/page.tsx` declares `openGraph.images` and `twitter.images`
  from them by hand — the file convention silently overrides explicit metadata,
  so the two cannot coexist.
- **Language**: `HtmlShell` bakes `lang="fi"` into every document. It is the
  store's default, so the prerendered HTML and the first client render match
  byte for byte; `LangHtmlAttr` then follows the stored preference, the way
  next-themes manages `class` on the same element. The landing, the 404 and the
  app all work this way — the landing switches to English in place once
  rehydration lands. A crawler only ever receives the Finnish document, and
  there is no alternate URL to redirect to, so nothing here is
  cloaking-adjacent. This is §9's "no locale routing is needed", now true
  without qualification.
  **Known cost, accepted:** a first-time English-speaking visitor lands on
  Finnish and has to find the FI|EN toggle in the header. Seeding from
  `navigator.language` on a first visit would fix it and is safe now that no
  alternate URL exists — deliberately not done, to keep first paint predictable.
- **The landing bundle must not contain `pdfjs-dist`, `jszip`, `papaparse` or
  `recharts`.** Commands are split into `lib/commands/book-commands.ts` (safe to
  import statically) and `lib/commands/io-commands.ts` (pulled in with
  `await import()` from the landing's file handler). `lib/browser/pdf.ts` is the
  only module importing pdfjs and is always dynamically imported.
  **`scripts/verify-export.mjs` enforces this on every build** (`postbuild`, so
  a failure fails `npm run build` and the deploy never uploads an artifact). It
  reads the chunks `out/index.html` references and looks for several string
  markers per library, because minification keeps string literals and mangles
  identifiers — the package name itself is usually gone. It also **self-tests**:
  each library's markers must still match somewhere in the export, or the check
  fails as a no-op rather than passing vacuously. That rule exists because the
  hand-run version of this check grepped for `"papaparse"`, a string that does
  not survive minification, and so had never once tested that library.
- `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL` in `lib/site.ts`, which also holds
  `BASE_PATH` and the route constants. `SITE_URL` **includes `BASE_PATH`**: the
  site's root document is `https://attepihamaki.github.io/kirjanpito/`, and Next
  joins that pathname onto the relative URLs in the metadata, so `OG_PATH`
  resolves to `…/kirjanpito/og/opengraph-image.png` rather than losing the
  prefix.

### Hosting: GitHub Pages

The export is published to **GitHub Pages** by `.github/workflows/deploy.yml`
on every push to `main` — `npm run check`, then `npm run build`, then the `out/`
directory as a Pages artifact. Nothing about the app is host-specific: it is
static files, so any static host would do.

- **The site is served under the repository's path**, `https://attepihamaki.github.io/kirjanpito/`,
  because this is a project repo and no custom domain is set. `BASE_PATH` in
  `lib/site.ts` is that prefix, and `next.config.ts` imports it as `basePath`.
  **`assetPrefix` is not needed and must not be added**: `basePath` already
  prefixes the routes, every `next/link` and every `_next/` asset — verified in
  `out/`. The two differ only when assets come from another origin.
- **`lib/browser/pdf.ts` is the one place that spells the prefix out.** It hands
  pdf.js `` `${BASE_PATH}/pdf.worker.min.mjs` ``, a URL that never passes through
  Next, so nothing prefixes it automatically. Everything else routes through
  `next/navigation` or `next/link`, which are `basePath`-aware. A missed prefix
  there would break the receipt viewer in production only.
- **`robots.txt` and `sitemap.xml` are published under the prefix too**, at
  `/kirjanpito/robots.txt` — and a crawler only reads the one at the host root,
  which belongs to a different repository. So robots is inert here whatever it
  says, which is the second reason `INDEXABLE` puts the real instruction in a
  meta tag on each document: that one travels with the page. Both files are
  still generated with correct host-absolute paths, so moving to a host root
  needs no code change in them.
- **To move to a custom domain:** in `lib/site.ts` set `BASE_PATH` to `""`,
  `SITE_URL` to that origin and `INDEXABLE` to `true`; add `public/CNAME`
  containing the domain (that file is what carries it into the export — without
  it a deploy clears the repository's custom-domain setting); and set the domain
  in Settings → Pages. Nothing else in the codebase mentions the prefix or the
  indexing state.
- **Jekyll never runs**, because Pages is deployed from the Actions artifact
  rather than from a branch. That is what makes `_next/` serve; a branch-based
  deploy would need a `.nojekyll` file.
- **The 404 needs no configuration.** The export emits `out/404.html` and Pages
  serves it for unmatched paths, which is also why `trailingSlash: true` matters:
  every route is a real `index.html` and no rewrite rules are involved.

## 12. Persistence keys

**Storage names and the field names inside them are English**, so what a
browser holds is legible without Finnish. The CSV and the ZIP's `tositteet/`
folder are the file format and stay Finnish (§7.1, §7.2) — the two vocabularies
meet only in `lib/domain/csv.ts`.

**The two app-level preferences each own a key**, outside the bookkeeping
blob, and each holds a bare value rather than JSON. They belong to the
browser, not to a bookkeeping: the landing page and the 404 need the language
before any file is open, and must not read or write `bookkeeping` to get it.

- localStorage `bookkeeping` — exported as `BOOK_STORAGE_KEY` from
  `stores/book-store.ts`, so nothing hard-codes the string twice:
  `{ entries, cats, year, dirty, fileName, lastMode, lastType, open, ledgerSize, ctSize, sidebarOpen }`.
  **The key carries no version suffix.** Zustand's `persist` already writes its
  `version` into the stored value and owns the `migrate` hook, which can
  transform old data; a version in the key could only orphan it, and two version
  numbers would eventually disagree. A future break not worth migrating renames
  the key to `bookkeeping.v2` at that point.
  **Only a bookkeeping creates the key.** `bookStorage`, the store's own
  `PersistStorage`, skips the write while there is no bookkeeping (`open` false
  and no entries) and the key does not already exist. Rehydration is itself a
  state change, so without that rule a visitor who only ever read the landing
  page came away with the whole default blob — every category — stored under
  their name. Once the key exists it is kept up to date as usual, closed file
  included, so `ledgerSize`, `ctSize` and `sidebarOpen` survive a close.
- localStorage `lang` — `fi` | `en`, owned by `stores/lang-store.ts`
  (`LANG_STORAGE_KEY`). A plain Zustand store, not `persist`: the value is the
  string itself, as next-themes writes `theme`, and `StoreHydrator` reads it
  after mount so the prerendered Finnish HTML and the first client render still
  match (§11b). Reading never creates the key — only the picker writes it.
- localStorage `theme` — owned by next-themes: `system` | `light` | `dark`.
  Its pre-paint inline script reads that key before any of our JS runs, so a
  second source of truth would drift.
- Both preferences used to live in the `bookkeeping` blob. `persist.migrate`
  (now at `version: 2`) moves each into its own key and drops the field,
  seeding only a key that is still empty — the separate key is the newer truth.
- IndexedDB `bookkeeping-receipts`, store `files`: receipt Blobs keyed by
  attachment id.
- **sessionStorage is not used.**

`stores/storage.test.ts` covers all of this: the landing-page visit that
stores nothing, the close that keeps the page sizes, and both migrations.

**No migration from the prototype-era names** (`kirjanpito.v1`,
`kirjanpito-tositteet`). A browser still holding them starts empty and the old
data is orphaned; the user re-opens their exported CSV or ZIP. This was a
deliberate choice over writing a one-shot copy step — the exported file is the
real copy of the bookkeeping, and the browser is only a working buffer (§1).

Wrap all storage access in try/catch, and render correctly when storage is empty or unavailable.

---

## 13. Suggested implementation order

1. Domain modules with no React: types, the chart of accounts and default categories, money and format helpers, `calc`, VAT report, income statement, summary, CSV parse and serialize, path and slug building, and ZIP pack and unpack. **Unit-test these first** (Vitest), including the reference figures in §10 and comparisons with the Excel's monthly sheets.
2. A store with persistence (localStorage and IndexedDB), the open/dirty/year/language/theme state, and the i18n dictionary.
3. The shell (sidebar, mobile top bar), routing, and the theme and language switches.
4. The ledger with the data table (sort, filter, paginate), the entry dialog, and the confirmation helper.
5. Import and export (CSV and ZIP), the export dialog, and drag and drop.
6. Receipts: attach, IndexedDB storage, thumbnails, the viewer with PDF.js, and garbage collection.
7. The VAT return, income statement (with print), summary, and settings.
8. The landing page.
9. Responsive polish, accessibility, and dark-mode check.

### Acceptance checklist

- [ ] The §10 fixture gives the figures in §10.
- [ ] Exporting a CSV and importing it back reproduces the same entries (including custom categories and the `syotto` mode).
- [ ] Exporting a ZIP with receipts and importing it back restores the receipts. A plain CSV import keeps their paths as missing.
- [ ] Every confirmation in §8.11 appears in the right situations, and only then.
- [ ] No `window.confirm` / `alert` anywhere.
- [ ] Currency is shown in Finnish format in both languages.
- [ ] Light, dark and system themes all work. Layouts work at 390 px, 900 px and desktop widths.
- [ ] None of the Excel bugs in §3 are reproduced.

## 14. Open questions and ideas not yet done

- VAT rate suggestions or validation by entry date (§5).
- Confirming the income statement rules with the user against form 5 (§6.3).
- Whether to remember a last-used file name, and whether to support the File System Access API to save over the same file.
- Possibly importing categories from, or exporting them to, the file (currently they live only in the browser; unknown categories are recreated on import).
