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

There is **no backend, no account and no database**. The user opens their bookkeeping from a file, works on it in the browser, and writes it back to a file.

- The file is a **ZIP**: the entries as a CSV, a `settings.json` with everything else that belongs to the bookkeeping (§7.6), and the receipt files in folders by year and month.
- A bare **CSV** is still read, and can still be downloaded on request, but it holds the entries only.
- Where the browser allows it, the app **saves straight back to the file that was opened** (§7.5). Where it does not, the user **downloads a copy**. Either way the file on disk is the user's real, safe copy.
- Between saves, work is kept in the browser (localStorage for entries and settings, IndexedDB for receipt files), so a page reload doesn't lose anything — but the browser is a working buffer, not the record.

---

## 2. Target stack

- **Next.js** (App Router) with **TypeScript**, **React** and **shadcn/ui**. The user will create the project from a shadcn/ui template and connect the shadcn/ui skill.
- The whole app is **client-side**. Prefer `output: "export"` (static export). No API routes or server actions are needed.
- Suggested libraries:
  - `papaparse` for CSV parsing. Row validation is hand-written in `lib/domain/csv.ts` rather than done with `zod`: §7.1 requires the import to be _lenient_ — a bad row is skipped and counted, never rejected — and every problem is reported as a machine-readable code the i18n layer translates. A schema validator would have to be unwrapped back into exactly that shape. `zod` was removed from the dependencies.
  - `jszip` for ZIP import and export.
  - `@dnd-kit/core` and `@dnd-kit/sortable` for rearranging the overview's widgets (§8.12). Native HTML drag and drop has no keyboard or touch support, and dnd-kit's keyboard sensor gives both.
  - `pdfjs-dist` for rendering PDFs. **The worker is copied to `public/pdf.worker.min.mjs` by `scripts/copy-pdf-worker.mjs` on `predev`/`prebuild`, and `workerSrc` points at that fixed URL.** The `new URL(..., import.meta.url)` form was rejected: the worker is an ES module bundle, and whether Turbopack copies it as an asset or pulls it into the module graph differs between the dev server and the export — a failure that would surface only in production. pdfjs is still imported dynamically, from `lib/browser/pdf.ts` alone.
  - `idb` or `idb-keyval` for IndexedDB.
  - `next-themes` for light, dark and system theme (the standard shadcn approach).
  - Tables are hand-composed on shadcn's `Table`, **not** `@tanstack/react-table`, which was removed from the dependencies. Sorting, filtering and pagination all live in the store — they have to, because the toolbar, the month chips and the totals cards read the same state — which would leave a table adapter owning nothing. See the comment at the top of `components/ledger/ledger-table.tsx`.
  - Toasts are `components/ui/toast.tsx`, **not** `sonner`, which was removed from the dependencies. It is a provider, so it wraps the tree in `HtmlShell` rather than sitting beside it. Its viewport is the one layer above the `z-50` that dialogs, sheets and overlays share: they are all portalled to the body, where an equal z-index is settled by DOM order, and the provider's portal is always the earliest. Toasts are raised from inside dialogs, so **the viewport stays at `z-100`**.
  - State: a small store such as Zustand with a persistence layer, or React context plus `useReducer`. Keep the domain logic (calculations, CSV, paths) in plain TypeScript modules with no React, so it can be unit-tested.
- Money is always stored as **integer cents**, never floats.

### Things in the artifact that exist only because of claude.ai, and should not be ported

- **`window.claude.use("downloads")`.** The artifact saves files through a claude.ai capability. The app uses a normal Blob plus an `<a download>` link for downloading a copy, and the File System Access API to save back to the opened file where it exists (§7.5).
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

**VAT rates offered** in the entry dialog: 25.5, 24, 14, 13.5, 10, 0, plus the entry's own rate if it differs. Background: the general rate rose to 25.5 % on 1 September 2024, and the 14 % rate was lowered to 13.5 % at the start of 2026. Older rates are kept for older entries and corrections.

**The rate follows the entry's date.** `lib/domain/vat-rates.ts` holds the two changes, 24 % → 25,5 % on 1.9.2024 and 14 % → 13,5 % on 1.1.2026, both confirmed on vero.fi. `rateOnDate` maps a rate to the one in force on a date; `rateMismatch` says why a rate does not fit. What decides the rate is when the tax falls due, normally the delivery date, so the entry's date is a stand-in: a mismatch is a hint and never blocks saving, because corrections and credit notes can carry an older rate on purpose. See §8.5 for the dialog, §8.4 for the ledger filter and §8.12 for the checklist.

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

### 6.2 Totals cards on the ledger

For the selected month (or the whole year): income net total, expense net total, and VAT payable or refundable (same rules as 6.1).

### 6.3 Income statement (Tuloslaskelma)

- Revenue total = the sum of net amounts on the income lines **except 317**. Tuloslaskelman verovapaat tuotot is listed on its line and counted in the section heading, but Form 5 reports it separately and it is not taxed, so it stays out of the revenue total and the result. A note under the sheet gives its total. (`AccountLine.taxExempt`; `IncomeStatement.taxExemptTotal`.)
- Deductible expenses = the sum of net amounts on expense lines **except** 365–367. This **includes 353 and 354**; the Excel omitted 354.
- Non-deductible expenses (365–367) are listed but not deducted. A note shows their total.
- Result = revenue − deductible expenses. If ≥ 0, it's labelled "358 Elinkeinotoiminnan tulos"; otherwise "359 Elinkeinotoiminnan tappio".
- Every line is shown even when zero (greyed out with "–"). Section headings carry the section totals.
- The period is 1.1.–31.12. of the selected year. All amounts exclude VAT.
- These rules were checked against Verohallinto's Form 5 instructions (vero.fi, "Instructions for filing", Form 5): tax-exempt income is not part of taxable revenue, 354 is deductible, and 365–367 may not be deducted.
- **Dividends on 319 are one gross line.** In business income only part of a dividend is taxable, and the share depends on whether the payer is listed. Form 5 asks for dividends as received and Verohallinto works out the taxable share, so the app does not split them. Check this if the user ever receives dividends.

### 6.4 Summary (Yhteenveto)

For the selected year, by month (net amounts):

- A bar chart of income versus expenses per month, with year totals in the legend.
- A sales table: total sales (line 300 only), then columns Finland 25.5 / 24 / 14 / 13.5 / 10 / 0 %, EU, other countries, reverse charge, and "Muut tulot" (income on lines 301–324). Totals row.
- An expenses table: total, then one column per bucket. Totals row.

### 6.5 VAT reporting periods and due dates

`lib/domain/vat-deadline.ts`, pure and tested.

- The user files **monthly, quarterly or yearly**. That is `vatPeriod`, set in Settings (§8.10) and saved in `settings.json`. The default is monthly.
- A monthly or quarterly return is due on the **12th of the second month after the period**: September 2026 on 12.11.2026, Q4 2026 on 12.2.2027. A yearly return is due at the **end of February** of the following year.
- A due date on a weekend or a Finnish bank holiday moves to the next working day. The holidays are New Year's Day, Epiphany, Good Friday, Easter Monday, 1 May, Ascension Day, Midsummer Eve, Independence Day and 24 to 26 December. October 2026 is due 14.12.2026, because the 12th is a Saturday.
- A period is **future**, **open** (today is inside it), **filed** (closed and marked), **due** (closed, not marked, due date ahead or today) or **overdue**. A period is keyed `2026-09`, `2026-Q3` or `2026`, and `vatFiled` maps that key to the ISO date it was marked.
- **Filing is the user's statement, not the app's knowledge.** The app cannot see OmaVero, so a closed period stays due until the user marks it. A mark can be undone.
- **A closed period with no entries still needs a return**, a nil return ("Nollailmoitus"). The timeline starts at the period of the book's first entry, so a book started in October does not report January to September as overdue.
- The overview's VAT widget follows **today**, not the selected year, because December's return falls due in the February after it. It also runs one period past today's, so "and after that" always has an answer.
- **Source:** vero.fi, "When to file and pay VAT" and the Arvonlisäverovelvollisen opas. The tests assert Verohallinto's own examples: March's return due 12 May, the 2020 yearly return due 1.3.2021, the 2025 one due 2.3.2026. Midsummer Eve and Christmas Eve are in the list because the act on calculating time limits moves a deadline past them too.
- **Not handled:** a business that stops trading files by the 12th of the second month after the month it ends, whatever its period.

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
  - Invalid rows (bad date, type or amount) are skipped. A toast summarises: N entries imported, new categories, receipts imported, missing or rejected, and the first skipped rows.
  - After import, the selected year is the latest year found in the file.

### 7.2 ZIP (the bookkeeping file)

A bookkeeping is always written as a ZIP, because `settings.json` (§7.6) has to travel with the entries, receipts or not. The download dialog's "Lataa vain CSV-tiedosto" writes the bare CSV instead, and its hint says that the receipts and the settings stay out. The structure is:

```
kirjanpito_2026-10-24.csv
settings.json
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
- Receipt files are stored without compression (STORE); the CSV and `settings.json` are DEFLATE-compressed.
- **Import:** the user picks a ZIP. Use the shallowest `.csv` in it (ignoring `__MACOSX`). Paths in `tosite` are resolved relative to the CSV's folder, falling back to the ZIP root. Files found are stored in IndexedDB. Listed files that aren't found become `missing` attachments that keep their path, so re-exporting doesn't lose the reference. Importing a plain CSV that has `tosite` paths marks those receipts as missing in the same way. A listed path that names neither an image nor a PDF is not a receipt at all: it is dropped rather than kept as missing, so it cannot reappear in the next export, and the toast counts it.
- Unpacking, decoding and writing every receipt to IndexedDB takes seconds for a real ZIP, so the import raises `importing` in the store and the UI shows progress once it passes 400 ms — see §8.2.

### 7.3 File naming when downloading a copy

The download dialog lets the user edit the base name, with a fixed extension shown beside the field (`.csv` or `.zip`). The default is **the last opened or saved name**, as it was, date included, without its extension (`suggestedBaseName` in `lib/domain/receipt-path.ts`). With no file behind the book it is `kirjanpito_{YYYY-MM-DD}` in Finnish or `accounting_{YYYY-MM-DD}` in English, using **today's date**. Characters `\ / : * ? " < > |` and control characters are stripped, and a trailing `.csv` or `.zip` is removed. An empty name falls back to the dated default.

`fileName` in the store holds that name **with its extension** (`kirjanpito_2026-10-24.zip`), for display only, and is set by opening, saving and downloading alike. Opening a file and finding the box still reading "Uusi kirjanpito" is the bug this format fixes: the first port hard-coded `fileName: null` on import, and the display site appended a literal `.csv`, which was wrong for a ZIP. `lib/commands/io-commands.test.ts` covers it.

### 7.4 Receipt files

- Accepted: images (`image/*`, including `.heic`/`.heif`) and PDF. Several per entry. **`isReceiptFile` in `lib/domain/receipt-path.ts` is the one place that decides this**, and every route in and out goes through it: the file picker (whose `accept` is only a hint, so the picked files are filtered again), drag and drop, and the `tosite` paths of an imported CSV or ZIP. Export applies it too — an attachment outside the rule gets no ZIP path and no `tosite` entry — so nothing a browser still holds from before the rule can leak back into a file.
- Images: if the long edge is ≤ 2000 px, the file is ≤ 1.5 MB and the type is JPEG/PNG/WebP, the original is kept. Otherwise it is redrawn onto a white canvas with the long edge at 2000 px and saved as JPEG at quality 0.85, with the extension renamed to `.jpg`. If the browser can't decode it (e.g. HEIC outside Safari), the original is kept and the preview shows the file name instead.
- PDFs are stored as they are.
- Stored in IndexedDB: database `bookkeeping-receipts`, object store `files`, key = attachment id, value = Blob. (The prototype used `kirjanpito-tositteet`; see §12.)
- **Garbage collection:** after saving or deleting entries, closing the file, importing, or closing the entry dialog, delete IndexedDB files that no entry (and no open dialog) references. Revoke object URLs of removed thumbnails.

---

### 7.5 Saving back to the opened file

On browsers with the File System Access API the app writes the bookkeeping
back to the file it was opened from, so the user does not have to download a
copy to keep their work. **Saving is an explicit action by default.** A
handle's write permission reverts to "prompt" on reload and re-granting it
needs a user gesture, there is no undo and no version history, and packing a
ZIP of receipts is not instant. Autosave exists, but it is opt-in and it never
asks anything (below).

- **`lib/browser/file-handle.ts` is the only module that touches the API.** It
  feature-detects the pickers, wraps the permission calls, writes, and keeps
  the handle in IndexedDB. Everything else treats a handle as optional.
- **`isFileHandleSupported` gates the UI.** Firefox, Safari and phones have no
  pickers, and a file taken from `<input type="file">` or a drop carries no
  handle on any browser. There the app behaves exactly as it did: the
  downloaded copy is how the work is kept, and the file menu has no save row
  at all rather than a dead one (§8.2).
- **Opening goes through the picker first** (`pickAndOpenFile`), falling back
  to the hidden `<input>` when there is none. Both the app and the landing page
  do this, since a file can be opened from either.
- **`saveBook` asks for a file** when there is no handle, when the book's shape
  has outgrown it, or when the file has been moved or deleted. A bookkeeping is
  a ZIP (§7.2) and cannot be written into a path called `.csv`, so a book
  opened from a CSV asks once, on its first save, and writes to the ZIP from
  then on. Otherwise it writes in place. `createWritable` streams into a swap
  file that the browser moves into place on `close`, so a failure part-way
  through leaves the file on disk untouched.
- **A file changed outside the app is not overwritten blind.** `savedAt` holds
  the file's modification time as of the last read or write; if the file's own
  timestamp has moved since, saving asks first (§8.11). Writing moves that
  timestamp, so the baseline follows it or the app would mistake its own save
  for someone else's edit.
- **Downloading a copy clears the dirty flag only when no file is linked.**
  With one, the copy says nothing about that file, and claiming otherwise
  would let the user close a bookkeeping whose own file is still stale.
- **Leaving a bookkeeping unlinks the file**, in the store *and* in IndexedDB
  (`unlinkFile` in `lib/commands/book-commands.ts`). The stored handle outlives
  a reload, so a new book that skipped this would find the old file waiting and
  save itself over it.
- `Ctrl`/`⌘`+`S` saves. It is bound only where a file can be written at all,
  so on Firefox and Safari the browser keeps its own — see §8.2 for the full
  set of shortcuts and what each row shows.
- **A dropped file carries its handle** on Chromium, through
  `DataTransferItem.getAsFileSystemHandle()` (`dropHandles` in
  `file-handle.ts`). The browser empties a drop's items as soon as the event
  returns, so the handles are requested inside the event and awaited after.
  Firefox, Safari and a dropped folder give none, and the file opens
  read-only as before; the first save then asks where to put it.
- **Autosave** (`autosaveBook` in `io-commands.ts`, `hooks/use-autosave.ts`)
  is the "Tallenna automaattisesti" setting, off by default and absent where
  no file can be written. It saves **3 seconds after the last change**, never
  while a dialog is open or a file is being read or written. It runs only
  where nothing has to be asked: a linked ZIP, write permission already
  granted (`hasWritePermission`, which only queries), and no outside edit
  since the last read or write. Anywhere `saveBook` would ask, it stops
  instead and sets `autosavePaused`; the amber dot stays, the file menu says
  autosave is waiting, and one manual save starts it again. After a reload it
  is always paused until that save, since permission is back to "prompt".
- `lib/commands/save-commands.test.ts` covers the round trip, the picker
  fallback, a refused permission, the outside-edit guard and both download
  cases, against a fake handle.

### 7.6 settings.json

`lib/domain/settings-file.ts` parses and serialises it; `lib/domain/zip.ts`
reads and writes it beside the CSV. The CSV stays the Finnish, Excel-friendly
format of §7.1. Everything else that belongs to a bookkeeping is here.

```json
{
  "version": 1,
  "language": "fi",
  "theme": "system",
  "vatPeriod": "month",
  "vatFiled": { "2026-08": "2026-10-12" },
  "overview": { "layout": [{ "id": "result", "size": "L", "hidden": false }] },
  "categories": [{ "id": "333", "line": "333", "name": "Ostot ja varastojen muutokset", "vatRate": 25.5, "enabled": true, "custom": false }],
  "autosave": false,
  "pageSize": { "ledger": 10, "categories": 25 }
}
```

- **Keys are English**, like browser storage (§12). Nobody opens this file in Excel.
- **Reading is lenient**, like the CSV. A missing file means defaults. A bad or unknown value is dropped on its own and the rest is kept. `version` leaves room for a migration.
- **Categories**: the full list. A default category keeps its id, line, name and kind from the chart of accounts and takes only `enabled` and `vatRate` from the file. Custom categories come across whole. The CSV is then matched against this list, so a custom category comes back with its own id instead of being recreated from its name.
- **The overview layout** goes through `normalizeLayout` in `lib/domain/overview-layout.ts`: an unknown widget id is dropped and a missing one is appended at its default size, so a file from an older or newer version still opens.
- **Language and theme** are written from the browser's own keys (§12) at save. Opening a file switches the app to them. They are preferences of the browser as much as of the book, so changing them does not mark the book dirty, and the landing page goes on using the browser's keys. The theme is applied through `Ctx.setTheme`, because only React can reach next-themes.
- **Page sizes and autosave** are saved the same way: written at save, applied on open, never dirty.
- **The VAT period, the filed marks, the layout and the categories do mark the book dirty**, since the file no longer matches.
- A plain CSV has no settings. Opening one starts with no filed marks and keeps the rest as it was.
- `lib/domain/settings-file.test.ts` covers the round trip and the lenient reading; `lib/commands/io-commands.test.ts` covers opening a ZIP with settings.

## 8. App structure and features

### 8.1 States and routes

- An **open/closed** flag: whether a bookkeeping is open. It is persisted. On load, if it isn't stored, it is true when entries exist.
- When **no bookkeeping is open**, every route shows the **landing page**.
- Views: landing, overview, ledger, VAT return, income statement, summary, settings. The prototype used Finnish hash routes (`etusivu`, `kirjanpito`, `alv`, `tulos`, `yhteenveto`, `asetukset`); the real app uses **English** Next.js routes — see §11b. Only the visible labels are translated.
- The app logo / brand links to the landing page.
- Persisted UI preferences: language, theme, selected year, last amount mode and type used in the entry dialog, rows per page for each table, and whether the sidebar is collapsed. Language and theme each have their own localStorage key; the rest live with the bookkeeping (§12).

### 8.2 Shell (sidebar + top bar)

The layout follows the sibling project FormBox (`../formbox`): a sidebar that
holds the brand and the navigation, and a top bar across the content area for
the open file and the user's preferences. **The top bar is the same at every
width**, so no control exists twice; below 900 px the sidebar becomes a sheet
instead of the app growing a second header. The earlier split — a desktop
sidebar plus a separate mobile top bar with its own copies of everything and a
row of nav tabs — is gone.

- **Sidebar** (`components/app/app-sidebar.tsx`, shadcn `Sidebar`,
  `collapsible="icon"`), top to bottom:
  - Brand: a "K" mark, "Kirjanpito", and the subtitle "Yhdenkertainen kirjanpito" — shortened from the prototype's "Toiminimen yhdenkertainen kirjanpito", which could not fit the button without truncating. The two lines need `leading-tight`: at the default leading they are 36 px and the `size="lg"` button's content box is 32. Links to the landing page.
  - Navigation with icons: Yleiskatsaus, Kirjanpito, ALV-laskelma, Tuloslaskelma, Yhteenveto, Asetukset.
  - **Nothing below the navigation.** The sidebar is the brand and the six views; the §1 disclaimer lives on the landing page and in the report notes, and the brand row is the route back to the landing page and its FAQ.
  - **15 rem wide**, one step under shadcn's 16 rem, which the five short labels do not need. `app-skeleton.tsx` draws the same width, so nothing shifts on rehydrate. The mobile sheet keeps its own 18 rem: it is an overlay on a phone, not a column beside the content.
  - ≥ 900 px it collapses to a 3 rem icon rail; below 900 px it is a sheet, and tapping a link closes it. **Everything in it is a menu row**, so collapsing loses only the words — there is nothing here that needs a second rendering to survive the rail.
  - The expanded / collapsed state is `sidebarOpen` in the store (§12), **not** shadcn's `sidebar_state` cookie: nothing is server-rendered, so a cookie could never be read back.
- **Top bar** (`components/app/app-topbar.tsx`), laid out like FormBox's `AppHeader`: `h-14`, `gap-2`, `px-4 lg:px-6`, sticky, and **no rule below it** — the sidebar's border already separates the chrome from the page, and a second line only boxed the content in. It holds only what is the same on every view: a panel icon on the left that collapses the sidebar (≥ 900 px) or opens it as a sheet (< 900 px), and, pushed right, the theme toggle, the language picker and the file menu. The panel icon is hand-rolled rather than shadcn's `SidebarTrigger`, which hard-codes an English screen-reader label.
  - **Every control in the bar is 36 px tall** — `size="icon"` buttons and the default `Select` trigger — so the row reads as one line rather than three sizes. Match that when adding anything.
- **File menu** (`components/app/file-menu.tsx`) — the open file and everything that acts on it, as one `Popover` at the right-hand end of the top bar:
  - The trigger is a `ghost` `size="icon"` button at the right-hand end of the bar, after the language picker, so the file reads as app chrome rather than as the one loud control in it. Its icon is lucide's `book-bookmark`, and the **status dot rides the icon's top-right corner the way an unread badge does** — with no file name on the bar, the dot is the only always-visible sign that there is unsaved work. Nothing in the button is visible text, so the `aria-label` is `"{name}, {status}"` and the `title` is the file name. While a file is being read or written the icon is a spinner (§7.2, §7.5).
  - The popup, top to bottom: the file name and the status line (amber "Tallentamattomia muutoksia" / green "Tallennettu"); "Tilikausi" and a year selector, offering the years found in the data plus the current year and the selected year; and the actions as full-width rows with their icons on one line — "Avaa tiedosto", "Tallenna", "Lataa tiedosto", "Sulje tiedosto".
  - **Three of the four rows carry a shortcut**, as a `<kbd>` key cap: muted text, recessed to `--background` rather than filled with `--muted`, which is what the row itself turns on hover. `hooks/use-app-shortcuts.ts` owns the one listener, and `useShortcut` in `use-save-book.ts` writes each combination both ways — `⇧⌘S` or `Ctrl+Shift+S` for the cap, `Meta+Shift+S` or `Control+Shift+S` for the row's `aria-keyshortcuts`.

    | row | shortcut | why |
    | --- | --- | --- |
    | Avaa tiedosto | `Ctrl`/`⌘`+`O` | universal, and a page is allowed to cancel it |
    | Tallenna | `Ctrl`/`⌘`+`S` | only bound where the browser can write to a file (§7.5); elsewhere it stays the browser's own |
    | Lataa tiedosto | `Ctrl`/`⌘`+`Shift`+`S` | reads as "save as", which is what a downloaded copy is |
    | Sulje tiedosto | **none** | `Ctrl`/`⌘`+`W` is one of the few combinations a browser will not hand to a page, so binding it would close the tab instead |

  - **The key cap is `aria-hidden`, and the combination travels in `aria-keyshortcuts`.** Accessible names concatenate with no separator, so a cap inside the row would have it announced as "TallennaCtrl+S".
  - **No shortcut fires while a dialog is open**, or during an import or a save, or with no bookkeeping open. Every one of them replaces or rewrites the whole bookkeeping, and the entry being typed into a dialog is not in the book yet. `test/app-shortcuts.test.tsx` covers each refusal, and that the browser keeps its own default in those cases.
  - **Every row is a `ghost` button, with no highlighted one.** They are menu items, and a filled row among them would read as the only real action. The dot and the status line are what say there is unsaved work; a second signal competing with them only makes the popup louder.
  - **"Tallenna" is absent, not disabled, where the browser cannot write to a file.** A permanent dead control in front of every Firefox, Safari and phone user is worse than three rows that all work.
  - **The download is named after what it does, not after "Tallenna".** "Lataa kopio" would read as a copy of an original, which is wrong wherever the download is the only way to keep the work — and one label for one action beats a row that renames itself per browser. It also puts the row in line with "Avaa tiedosto" and "Sulje tiedosto". The dialog it opens is titled "Lataa kirjanpito".
  - The status words are about saving, not exporting, so one wording covers both ways of keeping the work. Which file is current is `dirty`'s job (§7.5).
  - The year belongs in here because it is read out of the file: this popup is the one place that answers "which bookkeeping, which year, and is it saved".
  - Every action closes the popup first — it hands over to a dialog, a picker, or empties the bookkeeping.
  - `components/app/file-status.tsx` holds the one wording of the save status: `useFileStatusText` for the trigger's accessible name, `StatusDot` for the dot alone (the trigger's badge), `FileStatus` for the dot with its label (the popup's status line).
- **Theme toggle:** one ghost button with a sun / moon icon that flips light ↔ dark, as in FormBox. There is no "system" control — next-themes still has `defaultTheme="system"`, so an untouched browser follows the OS; it simply cannot be chosen back. Both icons are always in the markup and CSS picks one off the `.dark` class, so the prerendered HTML is already right.
- **Language picker:** a `LanguagesIcon` button opening a checked list of Suomi / English (endonyms, so each option reads the same either way). Language stays a stored preference, never a route (§11b).
- **Drag and drop anywhere:**
  - Dropping a CSV or ZIP opens it. A full-screen overlay says "Pudota CSV- tai ZIP-tiedosto avataksesi sen".
  - While the entry dialog is open, dropped images and PDFs are attached to it instead, and the dialog gets a dashed outline.
  - Dropping media while no dialog is open starts a new entry with the files attached. A PDF among them pre-fills the form (§8.5).
- **Reading a file shows progress, but only once it is slow** (§7.2). `importing` in the store is raised for the whole of `openFile`, and `hooks/use-delayed-flag.ts` turns it into a visible state **after `BUSY_DELAY_MS` (400 ms)**: the file menu's trigger icon and its "Avaa tiedosto" row become spinners, "Vie tiedosto" is disabled, and `components/app/import-overlay.tsx` covers the page with "Avataan tiedostoa…". A plain CSV opens in a few milliseconds and never reaches the delay, so nothing flickers; a ZIP of receipts does, and used to leave the UI silent for seconds. The overlay is **blocking**, unlike the drop overlay — the import is about to replace the whole bookkeeping. Both the app and the landing page render it, because a file can be picked from either and the drop overlay vanishes the instant the file lands. `importing` also guards re-entry: a second file dropped mid-import is ignored rather than interleaving two `replaceBook` calls.

### 8.3 Landing page

A full-width page with no sidebar. It has its own nav: logo, FI/EN, theme, and "Avaa tiedosto" (or "Avaa kirjanpito" when a bookkeeping is open). Sections:

1. **Hero.**
   - Headline "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon." and a lead paragraph.
   - Calls to action:
     - Closed state: "Aloita uusi kirjanpito" and "Avaa tiedosto", plus a dashed drop zone ("Pudota CSV- tai ZIP-tiedosto tähän…").
     - Open state: "Jatka kirjanpitoa" (to the overview) and "Avaa tiedosto", with a meta line showing the file name, the number of entries and the unsaved-changes status.
   - Visual: two overlapping, slightly rotated paper receipts on a soft accent panel. One is an expense receipt, the other the October VAT calculation ending in "Maksettava 617,18 €". On small screens only the VAT receipt is shown.
2. **"Tositteesta veroilmoitukseen neljässä vaiheessa".** Four numbered steps: open or start, record receipts (including attaching), check the figures, export (a ZIP organised by year and month).
3. **"Mitä kirjanpito laskee puolestasi".** Three cards: VAT (with rate chips), income statement (a mini statement), and monthly summary (a mini bar chart).
4. **"Ei tiliä, ei tietokantaa".** A privacy explanation next to a CSV sample block.
5. **"Kysyttyä".** An accordion with four questions: who it's for, whether it files returns, moving over from Excel (lists the columns; `tosite` is optional), and what happens when the browser is closed.
6. A closing call to action, "Aloita tämän kuun tositteista.", and a footer disclaimer: "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa."

- "Aloita uusi kirjanpito" opens the empty overview and sets the year to the current year. If there are unsaved changes, it asks first.

### 8.4 Ledger (Kirjanpito)

- Header: "Kirjanpito", the period ("Koko vuosi 2026" or "Lokakuu 2026"), and a primary "Uusi kirjaus" button.
- **Month chips:** Kaikki plus Tammi…Joulu, with entry counts. Empty months are greyed. The selected chip is filled in the primary colour. Each chip is shaped exactly like a default `Button` — **36 px tall** and the button radius (§11) — so the chip row and the toolbar below it read as one scale and one shape.
- **Totals cards** (§6.2): three cards side by side, each a bare `Panel`, stacking to one column under 640 px. One bar with dividers made the three figures read as a single row of a table; they are three separate answers.
- **Toolbar:** three controls of the same shape, left to right, and nothing pushed to the right-hand end. It is **hidden, together with the table, on a period that holds no entries at all** — the page then shows "Ei kirjauksia: Lokakuu 2026." A row of controls that cannot change the result reads as if the filters were what emptied the page. The filters keep their values while hidden and come back with the next period that has rows.
  - Search over description and category. It is a **fixed 20 rem box**, not one that grows into the row: the queries are a word or two, and a field stretched across the toolbar reads as the page's main control.
  - A type filter (Kaikki tyypit / Tulot / Kulut) as a **select**, like the category filter beside it. A segmented control would be the one control here shaped unlike the others, and it grows with the language. `EntryTypeToggle` (§8.5, §8.10) stays segmented because it is a form field, not a filter.
  - A category filter, listing only the categories used in the period.
  - "Tarkistettavat": Kaikki kirjaukset / Ilman tositetta / Verokanta ei vastaa päivää (`ledgerCheck`). An entry counts as having a receipt only when a file is available; one listed in the CSV but missing from the ZIP does not. A rate mismatch is `rateMismatch` (§5). The overview's checklist sets this filter when it sends the user here.
  - "Tyhjennä suodattimet" when any filter is active.
- **Table columns:** Pvm, Tyyppi, Selite, Luokka, Veroton, ALV (amount, with the rate small below), Verollinen (bold, with "−" for expenses), and actions.
  - Every column is sortable, with ↑/↓ shown on the active column and ⇅ on the others. Sorting by gross uses signed values, and sorting by type puts income first.
  - **A header cycles through three states: ascending, descending, then no column chosen** (⇅ everywhere), so every sort can be undone. The third state is `ledgerSort: null` / `catSort: null`, **not the default order spelled out**: the column that order follows — Pvm here, Tili in the categories table — would otherwise be stuck between its two directions, because "back to the default" *is* that column ascending. With null it reaches ⇅ like every other column. The rows then take `LEDGER_SORT_DEFAULT` / `CAT_SORT_DEFAULT` from `stores/book-store.ts`, read where the list is built rather than where the header is clicked, and `nextSort` is the one implementation of the cycle.
  - A first click is always ascending, including on Pvm, where the rows are in that order already and only the icon moves.
  - Tyyppi is a `Pill` in the income or expense tone — the same badge as the categories table (§8.10), so the two tables read alike.
  - The description cell shows a **paperclip button** (with a count if there are several receipts) that opens the viewer.
  - Row actions: **edit (pencil)**, **copy as new**, and delete. Clicking or pressing Enter on a row also edits it.
  - Responsive: the category column is hidden under 1240 px. Under 560 px, the type, net, VAT and actions columns are hidden (tap the row to edit); the signed gross is what still tells income from expense there.
- **Pagination:** the row count ("16 kirjausta") at the left-hand end, and at the right "Rivejä sivulla" with a 10/25/50/100 select (default 10), "Sivu 1 / 2", and first / previous / next / last icon buttons. The strip reads as "what you are looking at" / "how to move through it", which is why the count lives here rather than in the toolbar. The page resets to 1 when filters, sorting or the month change. It sits **inside the table's surface**, as the categories table places it (§8.10) — `ledger-table.tsx` renders the table alone and the view composes the `Surface` around both. `TablePagination` owns that strip, its padding and the rule above it: the table body drops the last row's own bottom border, which in a table that ends its surface would land on the surface's edge. **It is always shown**, even on a single page: the rows-per-page select is how the page length is set, so hiding the row until the list outgrows that length would hide the only control that changes it.
- **Empty state** (open but no entries): "Ei vielä kirjauksia" with "Uusi kirjaus" and "Avaa tiedosto".

### 8.5 Entry dialog (Uusi kirjaus / Muokkaa kirjausta / Kopio kirjaus)

A two-column modal. On mobile the columns stack.

- **Left column.** Date and type share a row, and so do the amount and the VAT %; both pairs fall back to one column below 560 px, where a date input and its picker no longer fit half a dialog.
  - Date.
  - Type as a segmented control (`EntryTypeToggle`: Tulo / Kulu, coloured green and red when selected).
  - Description (placeholder "Esim. Lasku 1006 – Asiakas Oy").
  - Category select: only enabled categories of the chosen type, plus the entry's current category even if disabled.
  - Amount, right-aligned with tabular figures.
  - VAT % select. Picking a category sets its default rate **as it was on the entry's date** (§5), and changing the date moves an unchosen rate across a rate change. A rate the user picked, one read from a PDF, and the rate of an entry being edited or copied count as chosen and stay. When the rate does not fit the date, a warning-coloured line under the field says so ("25,5 % on voimassa 1.9.2024 alkaen. Tälle päivälle verokanta on 24 %."). Saving is never blocked by it.
  - "Summa on" segmented control (Verollinen / Veroton).
  - An inline error line.
- **Footer:**
  - Edit mode: Poista, Kopioi, Peruuta, Tallenna.
  - New and copy modes: Peruuta, Tallenna ja uusi, Tallenna.
- **Right column:**
  - A **live receipt preview**, the signature visual element. It looks like a paper receipt with a perforated bottom edge and shows: type, date, description, category, net, VAT with rate, a bold total, and a badge ("Kasvattaa myynnin veroa" / "Vähennetään ostojen verona" / "Ei arvonlisäveroa").
  - Below it, the **"Tositteet" section:** a two-column grid (three on tablets) of 3:4 thumbnails. Images are shown cropped to the top; PDFs show their first page with a "PDF" badge. Each has a remove ✕. An "+ Lisää tosite" tile and the hint "Kuva tai PDF. Voit myös raahata tiedoston tähän." follow. Clicking a thumbnail opens the viewer on that receipt.
- **Defaults for a new entry:** if a month is selected, its date (today's day, capped at 28). Otherwise today if the year matches, else 1.1. of the selected year. The type and amount mode are the last ones used.
- **Validation:** a valid date, a non-zero amount and a chosen category are required. Error texts: "Anna päivämäärä.", "Anna summa, esim. 124,50.", "Valitse luokka." The error is held as `{ field, message }` where `field` is the `FormState` key: one `FieldError` line shows the message, and the field it names carries `aria-invalid` (the category select takes it through `OptionSelect`'s `invalid` prop). Editing that field clears the error, rather than leaving a complaint under a corrected value until the next save.
- **Pre-fill from a PDF:** adding an invoice PDF to an untouched form (no amount, no description) reads its text layer and fills the date, a description "Lasku {nro} – {myyjä} – {first row}" (whichever parts it found), the total as a gross amount and the VAT rate. A previous entry naming the same seller supplies the type and category; failing that, `suggestCategory` picks an expense category from words in the seller's name and the rows, falling back to 333. The seller is the company name printed beside a business ID, which is often only in the footer. A rate read this way survives picking a category. `lib/domain/invoice-text.ts` does the reading and is pure; `extractPdfText` in `lib/browser/pdf.ts` feeds it. The virtual barcode, when printed, wins over any labelled total or due date. A scanned PDF has no text layer and pre-fills nothing; there is no OCR.
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

- **The view has no period control of its own.** It always shows the filing period set in Settings (`vatPeriod`, §6.5, §8.10). A monthly or quarterly filer gets a strip of the year's months or quarters in the shape of the ledger's month chips (§8.4); a yearly filer gets the whole year and no strip. Figures by any other period are ones the user never files, so a second switch here would only duplicate the setting.
- Each chip shows where its period stands: Ilmoitettu, Myöhässä, the due date, Kesken or Tulossa. The result banner carries the filed toggle for a closed period: "Merkitse ilmoitetuksi", or "Merkitty ilmoitetuksi {date}" with "Poista merkintä".
- A result banner: "Maksettava arvonlisävero" (or "Palautettava…") as a large number, with the formula line "Myynnin vero X − ostojen vähennettävä vero Y".
- Two tables side by side, "Myynnin arvonlisävero" and "Ostojen vähennettävä vero", with the columns Verokanta, Veroton, Vero and Yhteensä, plus a totals row.
- A "Muut ilmoitettavat myynnit" panel, and a note explaining 0 % purchases and asking the user to check the figures before filing in OmaVero.

### 8.8 Income statement (Tuloslaskelma)

Presented as a printable **sheet**: the `--sheet` surface (warm paper in light, the card tone in dark — see §11), a thin border, and a soft shadow. It has the title, the period, sections with totals, greyed group headings, lines with muted account numbers, and a double-ruled result line. A "Tulosta" button calls `window.print()`, and the print styles hide the chrome.

### 8.9 Summary (Yhteenveto)

See §6.4. Wide tables scroll horizontally with a sticky first column. The chart is the overview's (`components/common/income-expense-chart.tsx`, §8.12): mirrored, with the year totals in the panel heading, and a click opens the ledger on that month.

### 8.10 Settings (Asetukset)

Every section is a `Panel` (§11). The page is split into two sub-pages, so the categories table does not bury the handful of book-wide settings:

- **Yleiset** at `/app/settings`: the VAT period, saving, and clearing the entries.
- **Luokat** at `/app/settings/categories`: the add form, the categories table, and restoring the defaults.

`app/app/settings/layout.tsx` renders `SettingsShell` (`components/settings/settings-shell.tsx`): the page title and a row of tab links shaped like the month chips (§8.4). The current tab is `bg-muted` with `aria-current="page"`, not filled with the primary colour, because it marks a place rather than a filter. The routes are `SETTINGS_ROUTES` in `lib/site.ts`. The sidebar keeps Asetukset lit on any path below it. The new-category name lives in the store (`catFormName`), so it survives switching tabs.

On **Yleiset**:

- **"ALV-ilmoitusjakso"** comes first: a segmented Kuukausi / Neljännesvuosi / Vuosi. It sets `vatPeriod` (§6.5), which the overview's due dates and the VAT view follow. Changing it keeps the VAT view on the same part of the year: October becomes Q4.
- **"Tallennus"**, only where the browser can write to a file: the "Tallenna automaattisesti" checkbox (§7.5), with a description that says there is no undo.
- **"Tyhjennä kirjaukset"**, last, as a `variant="destructive"` panel with "Tyhjennä" (`destructive`) on the footer. It deletes all entries (with a confirmation) and leaves the bookkeeping open but empty.

On **Luokat**:

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
  - Search and a type filter in the panel's heading row; the category count sits at the left of the pagination strip, as the entry count does on the ledger (§8.4).
  - Sortable columns: Käytössä (checkbox), Tyyppi (badge), Tili, Nimi, and Oletus ALV % (an inline input that commits on change and shows a toast). They cycle in three states as on the ledger (§8.4); with none chosen the rows are in Tili order.
  - Delete is only offered for custom categories that no entry uses.
  - Pagination with a default of 25 rows, laid out as on the ledger (§8.4).
- **"Oletusluokat"**, under the table: a description of what restoring does, and "Palauta oletusluokat" (`outline`) on the footer. It restores the defaults and keeps custom categories that are in use. It is reversible and routine, so it sits beside the table it changes; clearing the entries is not, so it is on the other page in its own destructive panel.

### 8.11 Confirmations and unsaved-change rules (apply everywhere)

Use one shared `AlertDialog`-based `confirm()` helper, with a title, a message, a destructive confirm button (red) and a cancel button. The cancel button can be relabelled, e.g. "Jatka muokkausta", and gets focus by default. Cases:

| Trigger                                | Condition                          | Title / confirm label                                                     |
| -------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Close file ("Sulje tiedosto")          | unsaved changes                    | "Suljetaanko tiedosto?" / "Sulje tallentamatta"                           |
| Start new bookkeeping                  | unsaved changes                    | same as above                                                             |
| Open a file over the current one       | unsaved changes                    | "Korvataanko avoin kirjanpito?" / "Korvaa"                                |
| Save over a file edited elsewhere      | its timestamp moved since we read it | "Korvataanko tiedosto?" / "Korvaa"                                      |
| Delete an entry (row or dialog)        | always                             | "Poistetaanko kirjaus?" / "Poista"                                        |
| Clear all entries                      | always                             | "Tyhjennetäänkö kirjaukset?" / "Tyhjennä"                                 |
| Close the entry dialog (Peruuta / Esc) | form differs from its snapshot     | "Hylätäänkö muutokset?" / "Hylkää muutokset", cancel = "Jatka muokkausta" |
| Navigate away from Settings            | the new-category name is filled    | same as above, with the category message                                  |
| Browser tab close (`beforeunload`)     | any of the above dirty states      | the browser's native prompt                                               |

**Dirty bookkeeping** means the entries or the book's settings changed since the last read or write of a file. It is set by any add, edit or delete, by a category change, and by the VAT period, a filed mark or the overview layout (§7.6), and cleared by opening a file, by saving to the linked one, and by downloading a copy **only when no file is linked** (§7.5).

The wording everywhere is about saving rather than exporting, so one set of strings covers both ways of keeping the work. The row above that highlights this: the close confirmation is the same sentence whether the user saves to their own file or downloads a copy.

Closing a file clears entries, the file name and filters, unlinks the file (§7.5), sets the bookkeeping to closed, garbage-collects receipts, and returns to the landing page.

### 8.12 Overview (Yleiskatsaus)

The app's front page, at `/app/overview`. `/app`, "Jatka kirjanpitoa", opening a file and starting a new bookkeeping all land here. It answers three questions: how the year is going, what VAT is due and when, and what is left to do. Every widget is a summary that links into a view; nothing here edits a figure except the filed mark.

- **`components/overview/`.** `overview-data.tsx` computes everything once, in a context, from the selected year: the summary, the income statement, VAT per month, and the VAT timeline from today (§6.5). The widgets read it.
- **Widgets**, in their default order and size:
  - **Tulos** (wide): line 358 or 359 from 1.1. to today, or to 31.12. for a past year; the formula line; a sparkline of the cumulative result; the entry count, the profit margin and the year's VAT. Links to Tuloslaskelma.
  - **Seuraava ALV-ilmoitus**: the next period not yet filed, its amount as payable, refundable or "Nollailmoitus", a due-date row with the weekday and a days-left pill (amber at 14 days or fewer, red with "pv myöhässä" once overdue), a note when EU or reverse-charge sales must be reported too, and the period after it. "Merkitse ilmoitetuksi" for a closed period, with "Peru" right after. Links to ALV-laskelma on that period.
  - **Kuukaudet** (wide, two rows tall): `IncomeExpenseChart`, shared with Yhteenveto. Net income above the axis and net expenses below it, one axis. **The bars are mirrored on purpose**: the income green and expense red fail a deuteranopia check side by side (ΔE 5.3 light, 3.5 dark, against 8), and position gives the two series a difference every reader sees. A hover gives the month's income, expenses, VAT and result, the result by the income statement's rules (`monthFigures` in `summary.ts`), so the months add up to 358; a click opens the ledger on that month. Four figures under it: the best month, average income and expenses per elapsed month, months with entries.
  - **Myynti**: line 300 split into Suomi, EU, muut maat and käänteinen, as a stacked bar and a list; lines 301 to 324 below as other income.
  - **Kulut ryhmittäin**: the §6.4 buckets with expenses, largest first; empty ones are counted.
  - **Viimeisimmät kirjaukset** (wide): the year's six newest entries, signed gross, flagged "ei tositetta" where there is no receipt file. A row opens the entry dialog.
  - **Tarkistettavaa**: unsaved changes with a save (or download) button; each overdue return and each return due within 30 days, with "Ilmoitettu"; entries without a receipt, and entries whose rate does not fit their date, each with "Näytä", which opens the ledger filtered to them; receipts missing from the file; and empty months from the first entry to the last complete month.
- **The board** (`overview-board.tsx`) is a three-column grid with `grid-flow-dense` from 1100 px, one column below it. "S" spans one column and "L" two; the month chart at "L" also spans two rows, so the default fills the grid with no holes. Widgets use container queries for their own narrow layouts, so a widget adapts to its column, not the window.
- **Editing the layout.** "Muokkaa näkymää" turns on edit mode. Each widget gets a toolbar: a drag handle, arrows to move it among the visible widgets, widen or narrow (hidden below 1100 px, where size means nothing), and hide. Its contents go `inert`, so a drag never opens an entry. Hidden widgets wait as buttons under the board. "Palauta oletus" resets; "Valmis" leaves. The layout is `overviewLayout`, saved in `settings.json` and dirty like any setting. dnd-kit's screen-reader texts are translated (`overview.dnd*`).
- **Empty book**: no widgets and no edit button, but the two ways in and three short steps.
- `test/overview.test.tsx` covers the §10 result, the countdown, filing and undoing, the checklist, hiding and moving widgets, and the empty state.

---

## 9. Internationalisation and formatting

- Two languages: **Finnish (default)** and **English**. The choice is persisted. Update `<html lang>` and the document title when it changes. Every UI string is in a dictionary keyed by id, with `[fi, en]` values and `{param}` interpolation. Plural forms are functions (e.g. "1 kirjaus" / "{n} kirjausta"). The artifact's `L` object holds every string and is the source to port. A typed dictionary is enough; no locale routing is needed.
- **Keys are `namespace.name`** — `t("io.zipNoCsv")`, `t("confirm.clearTitle")`, `t("settings.defaultVat")`. The namespaces are app, common, confirm, entry, file, io, landing, ledger, nav, notFound, overview, receipt, settings, statement, summary, table, vat, viewer. `common.*` is only for words several views share; anything used in one place belongs to that place's namespace even when it is short. The keys were once flat and abbreviated (`setSub`, `f_type`, `nCats`, `delT`, `fb_import`) with four inconsistent prefix styles — unreadable at the call site, and with no room for a second settings subtitle. `messages.test.ts` enforces the shape and the list of namespaces, which is what stops the next key being added the old way.
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

> **`app/globals.css` is the source of truth for colours.** The surfaces are
> shadcn's own "neutral" base, unchanged: white cards on a white page with a
> `#FAFAFA` sidebar in light, `#171717` cards on `#0A0A0A` in dark, and
> borders at 10 % white. The one colour of the app's own is `--primary`, the
> forest green "Metsä" (`#145A3C` light, `#7FCBA2` dark), which also drives
> `--ring`, `--sidebar-primary` and the green `--chart-*` ramp. Every value is
> oklch with its hex in a comment beside it. Green also means income here, so
> a primary button never stands beside an income amount without its label.
> The prototype's variable names still map onto the theme's as:
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
> and never write a manual `dark:` override.** `Surface` adds shadcn's
> `shadow-xs`: in light mode a white card on a white page is held apart only
> by its border and that shadow.
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

- **Type:** **Geist is the app's only face** (400–700), with tabular figures for numbers. `HtmlShell` loads it and defines `--font-sans`; there is no `--font-mono`, and no monospace is loaded or wanted. One consequence worth knowing: Tailwind's preflight puts `code`, `kbd`, `samp` and `pre` in a mono stack of the browser's own, so **any such element needs `font-sans`** — the save shortcut's `<kbd>` carries it. Adding a monospace back means a `next/font` call, a `--font-mono` line in `globals.css`'s `@theme inline` block beside `--font-sans`, and dropping that override; without the theme line Tailwind keeps its generic stack and the loaded face goes unused. Page titles are 26 px / 600 / −0.02 em. The landing headline is `clamp(38px, 5.4vw, 64px)` with tight leading (1.03) and −0.035 em tracking.
- **Radii:** 6 px for inputs and buttons, 10 px for panels, 14 px for dialogs and large cards. Segmented controls and the month chips take the button radius — they are buttons, and a pill among them would be the one control shaped unlike the rest. Only `Pill` itself and the status dot are fully round.
- **Control heights:** **36 px** is the default for a button, an input, a `Select` trigger and a segmented control, 32 px one step down (`size="sm"` / `icon-sm`) and 40 px one step up (`lg`). Each is a unit taller than the shadcn default, which was too tight for a form that is mostly amounts and dates. The scale is spelled out in five files — `button.tsx`, `input.tsx`, `select.tsx`, `toggle.tsx` and `sidebar.tsx` — because each owns its own variants; **they are changed together or not at all**, or a row of mixed controls stops lining up. `sidebar.tsx` carries the scale as a `size="md"` on `SidebarMenuButton` (shadcn's own sizes are 28 / 32 / 48), which the navigation rows use; the brand button stays `lg`. Collapsed, every row is pinned back to 32 px so the icons sit on one grid in the 3 rem rail — `app-skeleton.tsx` draws the expanded height, so nothing shifts on rehydrate.
- **Theme:** light ↔ dark from the top bar, defaulting to the system theme (§8.2).
- **Responsive breakpoints:** 900 px (the sidebar becomes a sheet; dialogs stack) and 560 px (compact table and totals). 900 is also `MOBILE_BREAKPOINT` in `hooks/use-mobile.ts`, and the `min-[900px]:` that replaced shadcn's hard-coded `md:` inside `components/ui/sidebar.tsx` — the CSS and the JS have to flip on the same pixel.
- **Accessibility:** visible focus rings, `aria-sort` on sortable headers, `aria-pressed` on toggles, `aria-label` on icon buttons, `prefers-reduced-motion` respected. The only motion is a short pop-in on dialogs.

### Suggested shadcn/ui mapping

Sidebar → shadcn's `Sidebar` (with `Sheet`, `Tooltip` and `hooks/use-mobile.ts`), in `components/app/app-sidebar.tsx`. It was hand-written and the shadcn one deleted while the sidebar was a static panel; §8.2's collapse-to-icons and mobile sheet are exactly the machinery it provides, so it came back — the local edits are the 900 px breakpoint, the `md` row size and the 15 rem width. Language picker → `DropdownMenu`. File menu → `Popover`, not `DropdownMenu`: it holds a year `Select`, and a select inside a menu fights the menu's own keyboard handling. Buttons → `Button` (variants default, outline, ghost, destructive). Segmented controls → `ToggleGroup`. Selects → `Select`. Entry, export and viewer dialogs → `Dialog`. Confirmations → `AlertDialog`. Tables → `Table`, hand-composed (see §2). Pagination → `components/common/table-pagination.tsx` ("Rows per page", "Page 1 of 2", «‹›»). Field errors → `FieldError` from `components/ui/field.tsx` — never a hand-rolled `<p className="text-sm text-destructive">`, and never without `aria-invalid` on the field the message is about. Toasts → `components/ui/toast.tsx` (see §2). FAQ → `Accordion`. Checkboxes → `Checkbox`. Inputs → `Input`. Chart → Recharts, used directly in `summary-view.tsx`; shadcn's `Chart` wrapper was removed. Use the shadcn/ui skill for component usage.

### One source of truth per element

Anything that appears in two views is a component in `components/common/`, taking attributes rather than being rebuilt. A second hand-written copy of a class string is how one view ends up a shade off every other, so when a shape is needed twice, the second use extends the first instead of restating it.

| element                      | component                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every bordered box           | `surface.tsx` — `radius` (lg / xl) and `tone`. shadcn's `Card` is not used; it was deleted (§11)                                                                                                                                                                               |
| a box with a ruled heading   | `panel.tsx`, built on `Surface`. `title`, `description` and `actions` are all optional — with none of them it is a bare box, which is what the totals cards and the VAT banner are. `footer` is a tinted strip for buttons acting on its contents; `variant="destructive"` is for an action that cannot be undone |
| tables                       | `ui/table.tsx`. Row padding is the `density` prop — `"comfortable"` for the ledger, the default elsewhere — never a `[&_td]:` override at the call site. `Table` is already the horizontal scroller, so never wrap it in another `overflow-x-auto`. The header row is **56 px**, the height of the `TablePagination` strip under the table (a 32 px control row inside `py-3`): they are the table's two chrome rows and are changed together |
| money                        | `money.tsx` — `Money` with `tone` / `signed`, `ZeroDash` for an absent amount. Only a string context (an interpolated message, a chart tick, `ReceiptRow`) calls `f.money` directly, and writes a minus with `MINUS`, never a literal |
| a control that can be busy   | `busy-button.tsx` — `BusyButton` swaps the icon for a spinner and, with `busyLabel`, the label too; `BusyIcon` is the swap alone, for controls that are not `Button`s |
| a link that looks like a button | `button-link.tsx` — a `next/link` wearing `buttonVariants`. `Button` enforces button semantics, so a link must never go through its `render` prop: it would announce `role="button"` on something that navigates |
| small labels                 | `pill.tsx` — `tone` (neutral / income / expense) and `size`. shadcn's `Badge` is not used: `--destructive` means "error", not "expense" |
| income or expense            | `filter-controls.tsx` — `EntryTypeToggle` (income first, coloured, a form field) and `TypeFilterSelect` (all / income / expense, a toolbar filter) |
| a full-screen scrim          | `overlay.tsx` — `blocking` is the whole difference between the import overlay and the drop hint |
| a dashed "put a file here"   | `drop-tile.tsx` — owns the outline, hover, focus and disabled state; the caller gives it its shape |
| the receipt motif            | `receipt-paper.tsx` — `ReceiptPaper` and its `Head` / `Rule` / `Row` / `Total` parts, shared by the entry preview and the landing hero |
| landing and 404 type         | `typography.tsx` — `DisplayHeading` (`size` lg / md), `Lead`, `SectionHeading` |
| the root of a document       | `LangRoot` in `lang-provider.tsx` — the app shell, the landing page and the 404 all start with it |
| sortable column headers      | `sortable-header.tsx` |
| the income and expense chart | `income-expense-chart.tsx`: `IncomeExpenseChart` and `IncomeExpenseLegend`, on the overview and Yhteenveto |
| single-choice selects        | `option-select.tsx` |
| page titles inside the app   | `page-header.tsx` |
| the header and footer outside the app shell | `site-chrome.tsx` |

`components/landing/og-image.tsx` is the one deliberate duplicate: Satori supports no CSS variables and no Tailwind, so the card restates the receipt in literal hex and inline flex. It cannot share anything above.

**Only the components actually in use are kept.** `components/ui/` holds 23 files; `avatar`, `badge`, `breadcrumb`, `card`, `chart`, `drawer`, `scroll-area`, `sonner` and `tabs` were generated by the shadcn CLI, never imported, and deleted. (`dropdown-menu`, `sheet`, `sidebar` and `tooltip` were deleted too, then re-added for §8.2's shell, which also brought in `popover`.) Re-add any of them with `npx shadcn add <name>` if a use appears — do not keep unused ones around on spec. `card` and `badge` are the exceptions that stay out: `Surface` and `Pill` cover them with the variants this app actually needs, and the table above says why.

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
    page.tsx                     /app → /app/overview
    overview/  ledger/  vat/  statement/  summary/
    settings/                    layout.tsx = SettingsShell; page.tsx = Yleiset
      categories/                /app/settings/categories (§8.10)
```

- **The app routes are English** (`/app/overview`, `/app/ledger`, `/app/vat`, `/app/statement`,
  `/app/summary`, `/app/settings`), in both UI languages. Each segment is the key
  it has in `APP_ROUTES`, so a route and the code linking to it cannot drift.
  Nothing under `/app` is indexed, so there is no SEO reason to localise the
  paths, and a single set of URLs keeps language switching a pure state change
  rather than a navigation.
- **`/app` itself redirects to `/app/overview`** (`components/app/app-index-redirect.tsx`).
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
  `{ entries, cats, year, dirty, fileName, lastMode, lastType, open, ledgerSize, ctSize, sidebarOpen, vatPeriod, vatFiled, overviewLayout, autosave }`.
  The book's settings are kept twice: here, as the working buffer, and in the
  file's `settings.json` (§7.6), as the record. A reload restores them from
  here; opening a file replaces them from there.
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
- IndexedDB `bookkeeping-file`, store `handle`, key `book`: the
  `FileSystemFileHandle` of the opened file (§7.5). Its own database, because
  adding a second object store to the one above would mean a version upgrade.
  It is **not** in the localStorage blob — a handle is not JSON — so
  `AppShell` restores it by hand once the book has rehydrated, and both ways
  of leaving a bookkeeping delete it.
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
- [ ] On Chrome, a file opened through the picker saves back to itself, survives a reload, and asks before overwriting a file edited elsewhere (§7.5). On Firefox and Safari the save row is absent and nothing else changes.
- [ ] Every confirmation in §8.11 appears in the right situations, and only then.
- [ ] No `window.confirm` / `alert` anywhere.
- [ ] Currency is shown in Finnish format in both languages.
- [ ] Light, dark and system themes all work. Layouts work at 390 px, 900 px and desktop widths.
- [ ] None of the Excel bugs in §3 are reproduced.

## 14. Open questions and ideas not yet done

- Undo, at least for a deleted entry and for clearing the entries. Autosave (§7.5) makes a mistake reach the file within seconds, which is why it is opt-in.
- Splitting dividends (319) into their taxable and tax-free shares, if the user ever receives them (§6.3).
- The VAT return of a business that stops trading (§6.5).
