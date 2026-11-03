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
- A bare **CSV** can still be opened, but it holds the entries only. The app always writes a ZIP.
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

**Identifiers are English everywhere in the code and in browser storage**, and
the canonical CSV column names are English too. What a *file* is written with —
the column spellings and the `tulo`/`kulu`, `brutto`/`netto` words — follows the
book's export language (§7.1). `lib/domain/csv-header.ts` is the only module
that spells a column name and `lib/domain/csv.ts` the only one that knows those
values. Nothing else, including `Entry`, mentions either.

```ts
type EntryType = "income" | "expense"
type AmountMode = "gross" | "net" // amount includes VAT | excludes VAT

interface Entry {
  id: string
  voucher?: number // voucher number (tositenumero), one series per year
  date: string // ISO date "YYYY-MM-DD"
  description: string
  type: EntryType
  catId: string // Category.id
  amount: number // integer cents, as entered (gross or net per amountMode)
  vatRate: number // VAT rate in percent, e.g. 25.5
  amountMode: AmountMode // stored per entry (the Excel had one switch per month)
  atts?: Attachment[] // receipts, may be several
  settles?: string // VAT payment or refund only: the period key it settles (§6.6)
  paidOn?: string | null // payment date if not `date`; null while open (§6.3)
  buyerVatId?: string // the buyer's VAT number on an EU sale (§8.7)
  euPurchase?: "goods" | "services" // bought from another EU country with no VAT on the invoice (§6.9)
}
```

### Voucher numbers (tositenumero)

The Accounting Act has every entry rest on a dated voucher that is "järjestelmällisesti numeroitu tai vastaavalla tavalla yksilöity" (KPL 2:5, checked on Finlex). An entry here is its own voucher, so it carries the number. `lib/domain/voucher.ts` owns the rule:

- One series per financial year, starting at 1. A new entry takes the year's highest number plus one.
- An entry keeps its number while it stays in its year (`keepVoucher`). Moved to another year, it takes the next number there. Nothing renumbers by itself to close a gap, so a deleted entry leaves one, unless it was the newest.
- **Renumbering is the user's own action** (`renumberYear`, `renumberVouchers` in `book-commands.ts`). Asetukset, Yleiset, Tositenumerot numbers the selected year from 1 in date order, and entries of one date stay in their current order. It asks first and can be undone from the toast for 10 seconds. It refuses a year with any locked entry (§8.11), since the numbers are then on record.
- `assignVouchers` numbers whatever has no number, or a number another entry of its year already holds, in date order after the year's highest. The store runs it on every add, on opening a file and on restoring deleted entries, which go first so they keep theirs. `persist.migrate` (version 4) numbers a book stored before this existed.
- In the UI the field is "Tositenumero" / "Voucher number", and the ledger column is "Nro". "Tosite" on its own stays the receipt file.

### Attachment (tosite)

```ts
interface Attachment {
  id: string | null // IndexedDB key, null if the file is missing
  name: string // the original file name; also its name in the ZIP (§7.2)
  type: string // MIME type
  size: number // bytes
  missing?: true // listed in the CSV but the file wasn't available on import
  path?: string // original path from the CSV, kept for missing files
}
```

**`name` is the one name a receipt has.** The extension (`extensionFor`),
whether it is a PDF (`isPdf`), whether it is a receipt at all
(`isReceiptFile`), the duplicate check (`fileKey`, §8.4), the viewer title, the
change log and the file's own name inside the archive all read it. There is no
second, user-entered name: a user who files an invoice as
"2.11.2026 - HC-Maschinentechnik - Lasku.pdf" has already said what it is, so
the app does not ask again.

### Category (luokka)

```ts
interface Category {
  id: string // e.g. "300-domestic", "333", "344-travel", or "c-<uid>" for custom
  line: string // key of the income statement line it belongs to (see §5)
  name: string // Finnish name (custom categories: the user's name)
  vatRate: number // default VAT %
  kind?: "domestic" | "euGoods" | "euServices" | "eu" | "nonEu" | "reverse" // for income categories
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

All in cents. `roundCents` rounds a half away from zero rather than up, as `Math.round` does, so a credit note is the exact opposite of its sale: 1,00 € net at 25,5 % carries 0,26 € of VAT and −1,00 € carries −0,26 €.

---

## 5. Chart of accounts (income statement lines)

Each line has a key, an account number (tili), a side, Finnish and English names, an optional group heading, a default VAT %, a summary bucket (expenses only), and a non-deductible flag.

| key         | tili | side    | Finnish                                          | English                                 | group (fi / en)                                                         | default VAT            | bucket          |
| ----------- | ---- | ------- | ------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------- | ---------------------- | --------------- |
| 300         | 300  | income  | Liikevaihto | Net sales | – | (see sales categories) | – |
| 301         | 301  | income  | Liiketoiminnan muut tuotot | Other operating income | – | 0 | – |
| 312         | 312  | income  | Varausten vähennys | Relieved write-offs and reserves | – | 0 | – |
| 313         | 313  | income  | Auton yksityiskäyttö | Private use of a car | Yksityiskäyttö / Private use | 0 | – |
| 314         | 314  | income  | Tavaroiden yksityiskäyttö                        | Private use of goods                    | Yksityiskäyttö / Private use                                            | 0                      | –               |
| 315         | 315  | income  | Muu yksityiskäyttö                               | Other private use                       | Yksityiskäyttö / Private use                                            | 0                      | –               |
| 317         | 317  | income  | Tuloslaskelman verovapaat tuotot | Tax-exempt income in the profit and loss account | Muut tuotot / Other income | 0 | – |
| 318         | 318  | income  | Saadut avustukset ja tuet                        | Grants and subsidies received           | Muut tuotot / Other income                                              | 0                      | –               |
| 319         | 319  | income  | Osingot julkisesti noteeratuista yhtiöistä       | Dividends from listed companies         | Muut tuotot / Other income                                              | 0                      | –               |
| 321         | 321  | income  | Osingot muista kuin julkisesti noteeratuista yhtiöistä | Dividends from non-listed companies | Muut tuotot / Other income                                              | 0                      | –               |
| 323         | 323  | income  | Korkotuotot ja muut rahoitustuotot | Interest income and other financial income | Muut tuotot / Other income | 0 | – |
| 324         | 324  | income  | Muut veronalaiset tuotot (ei tilikauden tuloslaskelmassa) | Other taxable income (off-income-statement) | Muut tuotot / Other income | 0 | – |
| 333         | 333  | expense | Ostot ja varastojen muutokset | Purchases and changes in inventory | – | 25.5 | purchases |
| 334         | 334  | expense | Ulkopuoliset palvelut                            | External services                       | –                                                                       | 25.5                   | purchases       |
| 335         | 335  | expense | Palkat ja palkkiot | Wages, salaries and fringe benefits | Henkilöstökulut / Staff expenses | 0 | personnel |
| 336         | 336  | expense | Eläke- ja henkilösivukulut | Pension and other staff expenses | Henkilöstökulut / Staff expenses | 0 | personnel |
| 337         | 337  | expense | Poistot | Depreciation | – | 0 | depreciation |
| 341         | 341  | expense | Edustuskulut | Entertainment expenses | – | 0 | depreciation |
| 343         | 343  | expense | Vuokrat | Rental expenses | – | 25.5 | depreciation |
| 344-travel  | 344  | expense | Matkakulut | Travel expenses | Muut vähennyskelpoiset kulut / Other deductible expenses | 13.5 | otherDeductible |
| 344-vehicle | 344  | expense | Ajoneuvokulut                                    | Vehicle expenses                        | (same)                                                                  | 25.5                   | otherDeductible |
| 344-meeting | 344  | expense | Kokous- ja neuvottelukulut                       | Meeting expenses                        | (same)                                                                  | 25.5                   | otherDeductible |
| 344-other   | 344  | expense | Muut vähennyskelpoiset kulut                     | Other deductible expenses               | (same)                                                                  | 25.5                   | otherDeductible |
| 354         | 354  | expense | Kirjanpidon ulkopuoliset vähennyskelpoiset kulut | Deductible expenses not entered in accounting | (same) | 0 | otherDeductible |
| 346         | 346  | expense | Korkokulut                                       | Interest expenses                       | Rahoituskulut / Financial expenses                                      | 0                      | financial       |
| 349         | 349  | expense | Muut rahoituskulut | Other financial costs | (same) | 0 | financial |
| 353         | 353  | expense | Varausten lisäykset | Increases to reserves | Varausten muutokset / Changes in reserves | 0 | provisions |
| 365         | 365  | expense | Ennakkoverot ja muut välittömät verot | Advance tax and other direct taxes | Vähennyskelvottomat kulut / Non-deductible expenses | 0 | nondeductible |
| 366         | 366  | expense | Sakot ja muut rangaistusmaksut | Fines and other penalty fees | (same) | 0 | nondeductible |
| 367         | 367  | expense | Muut vähennyskelvottomat kulut                   | Other non-deductible expenses           | (same)                                                                  | 0                      | nondeductible   |

The names are the form's, in Finnish and in Verohallinto's English, and `form5.ts` reads them from here. 365 is the one exception: the chart adds "Ennakkoverot" so a user finds it, and Form 5's view keeps the form's "Välittömät verot". On the statement a line under a group heading is indented, so 337 to 343, which have no group, do not read as part of Henkilöstökulut. A renamed default keeps its old name in `FORMER_NAMES`, so an older file still finds its category, and `persist.migrate` gives a stored list the new names.

The table order is also the display order of the income statement. **It is not quite Form 5's order, and that is deliberate.** The form lists the income fields as 300, 318, 301, 313–315, 319–328, 323, 312, 324, 317, so grants come second and reserve decreases late. The app keeps the order above, which groups the lines under their headings. Each line still carries its form number, so copying a figure into OmaVero goes by number, not by position. The expense lines are in the form's order. Checked against Verohallinto's 2026 data file specification for Form 5. The Form 5 view (§8.8) lists the same figures in the form's own order.

319 was "Saadut osingot", one line for all dividends. `FORMER_NAMES` in `accounts.ts` still matches that name on CSV import, so an older file books its dividends to 319 rather than creating a custom category.

**Sales categories on line 300** (income), each its own category:

| id           | Finnish                     | English                 | default VAT | kind     |
| ------------ | --------------------------- | ----------------------- | ----------- | -------- |
| 300-domestic | Myynti – Suomi              | Sales – Finland         | 25.5        | domestic |
| 300-eu-goods | Myynti – EU, tavarat        | Sales – EU, goods       | 0           | euGoods  |
| 300-eu-services | Myynti – EU, palvelut    | Sales – EU, services    | 0           | euServices |
| 300-other    | Myynti – muut maat          | Sales – other countries | 0           | nonEu    |
| 300-reverse  | Myynti – käänteinen verotus | Sales – reverse charge  | 0           | reverse  |

**`300-eu`, "Myynti – EU", is retired.** The return asks for goods (311) and services (312) separately, and an entry on this category does not say which it was, so nothing moves it automatically. It stays in the list, disabled, so older entries and files keep it (`RETIRED_CATEGORY_ID`; a CSV row with that name still matches it). The VAT views show its total on a row of its own while any entry uses it, and the return's row says to change the category.

**Fixed assets are off the statement.** `CAPITAL_LINES` holds two more lines, both on account 1100: `asset-purchase` "Koneiden ja kaluston hankinta" (expense) and `asset-sale` "Koneiden ja kaluston myynti" (income), each at 25,5 %. Their VAT goes on the VAT return like any other entry's, but they are neither income nor an expense: the income statement, Form 5, the summary and the ledger's totals cards all leave them out, and the journal's totals too, though its rows and the general ledger list them. The cost reaches the result as depreciation (§8.8). `LINES` stays the statement's 30 lines, and `ALL_LINES` is what a category can sit on. Custom categories cannot be added to these two.

**VAT payments and refunds are off the statement too.** `SETTLEMENT_LINES` holds `vat-payment` "Arvonlisäveron maksu" (expense) and `vat-refund` "Arvonlisäveron palautus" (income), both on account 2939 at 0 %. Single-entry books have no balance sheet, so 2939 is the app's own number for the CSV's `account` column; it is not one Form 5 asks for and was not checked against a published chart. `AccountLine.settlement` marks them, and `offStatement` is the one test for "capital or settlement" that the statement, the summary, the journal's totals and the ledger's totals cards use. The VAT report skips settlement lines whatever their rate (§6.6).

**So are the owner's own transfers.** `OWNER_LINES` holds `owner-withdrawal` "Yksityisotto" (expense) and `owner-investment` "Yksityissijoitus" (income), both on account 2000 at 0 %. Like 2939, 2000 is the app's own number and was not checked against a published chart. `AccountLine.owner` marks them, `offStatement` covers them, and the VAT report skips them like settlements (§6.7). `ALL_LINES` is the 30 statement lines and these, with the loan lines of §6.8.

**Default categories:** the six sales categories, plus one category per remaining line, with `id = line key`, `name = Finnish line name`, `vatRate = line default VAT`, and `kind = "domestic"` for income lines.

**Expense summary buckets** (Yhteenveto columns): `purchases` = Ostot ja ulkopuoliset palvelut, `personnel` = Henkilöstökulut, `depreciation` = Tilat, poistot ja edustus, `otherDeductible` = Muut vähennyskelpoiset kulut, `financial` = Rahoituskulut, `provisions` = Varausten muutokset, `nondeductible` = Vähennyskelvottomat kulut.

**VAT rates offered** in the entry dialog: 25.5, 24, 14, 13.5, 10, 0, plus the entry's own rate if it differs. Background: the general rate rose to 25.5 % on 1 September 2024, and the 14 % rate was lowered to 13.5 % at the start of 2026. Older rates are kept for older entries and corrections.

**The rate follows the entry's date.** `lib/domain/vat-rates.ts` holds the two changes, 24 % → 25,5 % on 1.9.2024 and 14 % → 13,5 % on 1.1.2026, both confirmed on vero.fi. `rateOnDate` maps a rate to the one in force on a date; `rateMismatch` says why a rate does not fit. What decides the rate is when the tax falls due, normally the delivery date, so the entry's date is a stand-in: a mismatch is a hint and never blocks saving, because corrections and credit notes can carry an older rate on purpose. See §8.5 for the dialog, §8.4 for the ledger filter and §8.12 for the checklist.

---

## 6. Calculation rules

### 6.1 VAT report (ALV-laskelma)

The period is a month, a quarter or the whole year, within the selected financial year.

- **Sales VAT** (income entries):
  - Entries whose category kind is `euGoods`, `euServices`, `eu`, `nonEu` or `reverse` are **not** part of sales VAT. Their net amounts are reported separately under "Muut ilmoitettavat myynnit": sales to other EU countries, sales outside the EU, and reverse-charge sales (construction services and scrap metal).
  - Other income entries with rate > 0 are grouped by rate (25.5, 24, 14, 13.5, 10). Rates not in the list go to "Muut verokannat".
  - Income entries at 0 % are included (in the 0 % row) **only if their category is on line 300**. 0 % income on lines 301–324 (grants, dividends, interest and so on) isn't VAT-relevant and is left out.
- **Purchase VAT** (expense entries): entries with rate > 0, grouped by rate. 0 % expenses (wages, YEL, bank fees) are not shown, and the 0 % row is hidden in the purchases table.
- **VAT payable** = total sales VAT − total purchase VAT. If negative, it is shown as **refundable** (palautettava), in green.

### 6.2 Totals cards on the ledger

For the selected month (or the whole year): income net total, expense net total, and VAT payable or refundable (same rules as 6.1).

### 6.3 Income statement (Tuloslaskelma)

- Revenue total = the sum of net amounts on the income lines **except 317**. Tuloslaskelman verovapaat tuotot is listed on its line and counted in the section heading, but Form 5 reports it separately and it is not taxed, so it stays out of the revenue total and the result. A note under the sheet gives its total. (`AccountLine.taxExempt`; `IncomeStatement.taxExemptTotal`.)
- Deductible expenses = the sum of net amounts on expense lines **except** 365–367. This **includes 353 and 354**; the Excel omitted 354.
- **Entertainment expenses (341) are half deductible.** Form 5 asks for the full amount in 341 and the deductible part in field 342, which may not exceed half of it, and its total of deductible expenses (355) adds 342, not 341. The app lists 341 in full, deducts `Math.trunc(341 / 2)` (`IncomeStatement.entertainmentDeductible`) and says so in a note under the sheet. The per-month results of §8.12 are year to date minus the month before, so they still add up to 358.
- Non-deductible expenses (365–367) are listed but not deducted. A note shows their total.
- Result = revenue − deductible expenses. If ≥ 0, it's labelled "358 Elinkeinotoiminnan tulos"; otherwise "359 Elinkeinotoiminnan tappio".
- Every line is shown even when zero (greyed out with "–"). Section headings carry the section totals.
- The period is 1.1.–31.12. of the selected year. All amounts exclude VAT.
- These rules were checked against Verohallinto's Form 5 instructions (vero.fi, "Instructions for filing", Form 5): tax-exempt income is not part of taxable revenue, 354 is deductible, and 365–367 may not be deducted.
- **Dividends count only their taxable share.** Form 5 splits them into listed companies (319, taxable portion in 320) and others (321, taxable portion in 322), and its taxable income (316) adds only 320 and 322. In a sole trader's business income source, 85 % of a listed company's dividend is taxable and 75 % of any other (vero.fi, Osinkotulojen verotus, 2.4; EVL 6 a § 6 mom.). `AccountLine.taxableShare` holds the percentage, and the share is rounded to the cent. The sheet lists both lines in full and says what was counted in a note.
- **Every line has a `counted` part**, the amount that enters the result: the taxable part of an income line, the deductible part of an expense line. Revenue (316) and deductible expenses (355) are sums of it; the section headings are sums of the lines in full (`incomeTotal`, `expenseTotal`).

- **An amount belongs to the year it was paid** (`lib/domain/open-items.ts`). `Entry.date` is the delivery or invoice date, and `Entry.paidOn` the payment date when that differs, or null while the entry is open. An ammatinharjoittaja with single-entry books is taxed on payment (EVL 27 a §). The app treats every user as one, so `taxBasisEntries` moves each entry to its payment date and leaves out an open one. A liikkeenharjoittaja has to adjust to accrual basis, which the app does not do (§14). The income statement, Form 5, the summary and the overview's result all read the entries this way, and the VAT views never do, since the return goes by `date`. A note under the statement names the basis and gives the year-end receivables and payables.
- **Receivables and payables** (`balancesAt`) are the gross amounts of entries open on a date, which KPL 1:1a requires a sole trader of either kind to be able to determine. A non-cash line, a VAT settlement, an owner's transfer and a loan movement cannot be open (`canBeUnpaid`).

### 6.4 Summary (Yhteenveto)

For the selected year, by month (net amounts):

- A mirrored chart of income and expenses per month, with the year totals in the panel heading (§8.9).
- A sales table: total sales (line 300 only), then columns Finland 25.5 / 24 / 14 / 13.5 / 10 / 0 %, EU, other countries, reverse charge, and "Muut tulot" (income on lines 301–324). Totals row.
- An expenses table: total, then one column per bucket. Totals row.
- With entries in the year before, a comparison table: income, expenses and result of both years by month, the change in the result, and a totals row whose results are the two statements' (`yearComparison`).

### 6.5 VAT reporting periods and due dates

`lib/domain/vat-deadline.ts`, pure and tested.

- The user files **monthly, quarterly or yearly**. That is `vatPeriod`, set in Settings (§8.10) and saved in `settings.json`. The default is monthly.
- A monthly or quarterly return is due on the **12th of the second month after the period**: September 2026 on 12.11.2026, Q4 2026 on 12.2.2027. A yearly return is due at the **end of February** of the following year.
- A due date on a weekend or a Finnish bank holiday moves to the next working day. The holidays are New Year's Day, Epiphany, Good Friday, Easter Monday, 1 May, Ascension Day, Midsummer Eve, Independence Day and 24 to 26 December. October 2026 is due 14.12.2026, because the 12th is a Saturday.
- A period is **future**, **open** (today is inside it), **filed** (closed and marked), **due** (closed, not marked, due date ahead or today) or **overdue**. A period is keyed `2026-09`, `2026-Q3` or `2026`, and `vatFiled` maps that key to the ISO date it was marked.
- **Filing is the user's statement, not the app's knowledge.** The app cannot see OmaVero, so a closed period stays due until the user marks it. A mark can be undone.
- **A filed mark counts whatever period it was made in** (`filedKeys`), so changing how often VAT is filed leaves filed returns filed: three marked months cover their quarter, and a marked quarter or year covers what is in it. A period only partly covered still shows as due.
- **A closed period with no entries still needs a return**, a nil return ("Nollailmoitus"). The timeline starts at the period that contains the book's start: the start month set in Settings (`bookStart`, §8.10), or else the first entry (`bookStartDate`). A period that ended before the start is **before**, owes nothing and has no filed toggle, so a business founded in October does not see January to September as overdue. With neither a start month nor an entry the bookkeeping has not begun: every period is **before** and the timeline is empty, so an untouched book reports no overdue returns. `periodStatus` takes the start date as a required argument, so no caller can leave that question unanswered.
- The overview's VAT widget follows **today**, not the selected year, because December's return falls due in the February after it. It also runs one period past today's, so "and after that" always has an answer.
- **Source:** vero.fi, "When to file and pay VAT" and the Arvonlisäverovelvollisen opas. The tests assert Verohallinto's own examples: March's return due 12 May, the 2020 yearly return due 1.3.2021, the 2025 one due 2.3.2026. Midsummer Eve and Christmas Eve are in the list because the act on calculating time limits moves a deadline past them too.
- **Not handled:** a business that stops trading files by the 12th of the second month after the month it ends, whatever its period.

### 6.6 VAT payments and refunds

`lib/domain/vat-settlement.ts`, pure and tested.

- **Each payment or refund is an entry**, on `vat-payment` or `vat-refund` (§5), so it takes the next voucher number in the year's series and can carry the bank statement as its receipt. KPL 2:1 has the books record financing transactions as well as income and expenses, and KPL 2:5 has every entry rest on a dated, numbered voucher. Vero's guidance on VAT bookkeeping only covers the transactions that set the tax, and says nothing about the payment itself, so this follows the Accounting Act.
- **It is neither income nor an expense.** VAT is a debt to the state or a claim on it (the Accounting Board's general guideline on recording VAT, 31.10.2017), so the entry stays out of the income statement, Form 5, the summary, the VAT return and the ledger's and journal's totals. It is in the journal's rows and under account 2939 in the general ledger.
- **`Entry.settles` names the return it pays**, a period key of §6.5. The entry dialog shows "Verokausi" for a settlement category, offering this year's and last year's periods. Unset, it is the period before the one the date falls in (`defaultSettledKey`): September's tax is paid in November. The CSV carries it in `settles` (§7.1).
- **An entry counts whatever period it was booked under** (`settlementSummary`), like a filed mark: three monthly payments add up under their quarter. A quarter's payment seen from one of its months is listed but not compared, since it cannot be split.
- The sum is compared with the period's calculated due. A difference is shown, not treated as an error: a part payment, a refund Vero used for other taxes, or an entry changed after filing all cause one.
- **The record is the user's**, like the filed mark: the app cannot see the bank or OmaVero and never books one by itself.
- Settlement entries are left out of the "unusually large amount" check (§8.4), since a period's tax in one sum is large by nature. The "no receipt" check still applies: the bank statement is the voucher.
- **Not decided:** an accountant has not confirmed that an entry on a 2939 line is the right form for a single-entry book (§14).

### 6.7 The owner's withdrawals and investments

- **Money the owner moves between the business account and their own is an entry**, on `owner-withdrawal` (yksityisotto) or `owner-investment` (yksityissijoitus) (§5), with the bank statement as its receipt. KPL 2:1 has the books record financing transactions, and this is one.
- **It is neither income nor an expense.** Vero: a withdrawal from the business account is a private drawing and is not booked as an expense, and the private account (yksityistili), where investments and withdrawals go, is part of equity (vero.fi, "Rahan nostot ja sijoitukset rahana"; syventävä ohje "Tulolähdesiirrot, yksityiskäyttöönotot ja yksityissijoitukset", 25.11.2019). So the entry stays out of the income statement, Form 5, the summary, the VAT return and the ledger's and journal's totals, and is listed in the journal's rows and under account 2000 in the general ledger.
- **It does move the bank estimate** (§8.12), since money really moves.
- It is left out of the "unusually large amount" check (§8.4): the owner moves round sums, large next to a receipt. The "no receipt" check still applies.
- **The tax return does not ask for it** in a single-entry book. Form 5's withdrawals and investments, and the equity at the start and end of the year, are asked only of a business keeping double-entry books (vero.fi, "Veroilmoituksen täyttöohje", Taustatiedot).
- Goods or a car taken into private use are not this: they are income on 313 to 315.

---

### 6.8 Loans

`loan-drawdown` "Lainan nosto" and `loan-repayment` "Lainan lyhennys", on account 2600 at 0 %. KPL 2:1 has the books record financing transactions, and a loan is neither income nor an expense, so `offStatement` covers both and the VAT report skips them. Interest stays an expense on 346. 2600 is the app's own number, like 2939 and 2000. They move the bank estimate, and they are left out of the "unusually large amount" check. `ALL_LINES` is the 30 statement lines and eight off-statement ones.

### 6.9 Purchases from other EU countries

A seller in another EU country invoices a VAT-registered buyer without VAT, and the buyer reports the tax (vero.fi, "Ilmoituksen täyttöohje"). `Entry.euPurchase` marks such an expense as `goods` or `services`. It belongs to the entry and not to the category, because the same cost can be bought at home or abroad, so software from Ireland stays on 344.

- **`amount` is what the invoice says and what was paid.** `calcEntry` gives it no VAT, so the statement, the ledger, the bank estimate and open items all read it as they should. `amountMode` is always `net`. `vatRate` is only the rate the tax is reported at, and `euPurchaseVat` works that tax out.
- **On the return**, goods fill 313 and 305, services 314 and 306, and the deductible tax joins 307, so the tax payable does not change. The return asks for the amount even when no tax falls on it, so an EU purchase at 0 % counts too (`countsOnVatReturn`).
- **On a line with `noVatDeduction`** the tax is reported but not deducted, so it adds to the tax payable. It is not a cost in the statement by itself, and the dialog says to book it as a 0 % cost of its own. The dialog's advice to book the gross at 0 % does not fit an EU purchase, and `vatNotDeductible` leaves these out.
- **It can sit on any cost or on a fixed asset** (`canBeEuPurchase`), not on a VAT settlement, an owner's transfer or a loan. A recurring template keeps it, since a monthly subscription is the usual case.
- A category at 0 % starts the entry at the general rate. The dialog hides "Summa on", and the ledger shows a pill.
- **Not handled:** a business that is not VAT registered, which reports these on its own, and imports from outside the EU.

---

## 7. File formats

### 7.1 CSV

**The file is written in the book's own language** (`exportLang`, §7.6), which
is Finnish or English. It decides the header, the words in the cells, the
category names, the ZIP's suggested name, the CSV's name and the receipt folder
(§7.2) — and nothing else.

- **Header row**, always these columns in this order, in one of two spellings:
  - fi: `tositenro;pvm;selite;tyyppi;tili;luokka;summa;alv;syotto;liitteet;verokausi;maksettu;ostajan_alv;eu_osto`
  - en: `voucher;date;description;type;account;category;amount;vat;mode;receipts;settles;paid;buyer_vat;eu_purchase`
- **`lib/domain/csv-header.ts` is the one place a column name is spelled.** The
  English names are the canonical ones the parser works in; `FINNISH_LABELS`
  gives the Finnish spelling of each, `csvHeaderLine(lang)` builds a header and
  `columnName` maps either spelling back. The alias map is **derived** from the
  label table, so what the app writes is always what it reads. Both the header
  match and the delimiter detection go through `columnName`. Nothing else in the
  codebase may spell a column name in either language.
- **The words in the cells follow the language; the formats never do.**
  `lib/domain/csv.ts` is the single translation layer for the values:
  `TYPE_TO_CSV` (`tulo`/`kulu` ⇄ `income`/`expense`), `MODE_TO_CSV`
  (`brutto`/`netto` ⇄ `gross`/`net`), `EU_PURCHASE_TO_CSV`
  (`tavara`/`palvelu` ⇄ `goods`/`services`) and `PAID_OPEN` (`avoin` ⇄ `open`),
  each writing one language and reading both. The decimal comma, the `;`
  delimiter and the ISO date are the same in both, so an English file still
  opens in a European Excel and there is one number format to parse.
  > **`NET_VALUES` has to name every word that means net.** Anything the reader
  > does not recognise is read as gross, so a net row misread keeps its number
  > and changes what the number means — 1 000,00 € net at 25,5 % becomes
  > 796,81 € net — with no error, no skipped row and no warning.
- **Export:**
  - UTF-8 with BOM, `;` delimiter, CRLF line endings. Fields containing `;`, `"` or line breaks are quoted with `"` (doubled inside).
  - `voucher` is the voucher number (§4). `date` is ISO `YYYY-MM-DD` in both languages. `type` is `tulo`/`kulu` or `income`/`expense`. `account` is the account number.
  - `category` is the category's name in the export language, from `categoryName`. A custom category keeps the user's own name in both.
  - `amount` uses a decimal comma with no thousands separator (`1882,50`) in both languages. `vat` is the rate, with a decimal comma (`25,5`). `mode` is `brutto`/`netto` or `gross`/`net`.
  - `receipts` holds the receipt paths inside the ZIP, separated by `|`. A CSV taken out of the ZIP and opened on its own still records which receipts existed, and the import marks them missing per §7.2.
  - `settles` is the period a VAT payment or refund settles (`2026-10`, `2026-Q4`, `2026`), empty on every other row (§6.6).
  - `paid` is the payment date when it is not the entry's own, `avoin` / `open` while the entry is open, and otherwise empty (§6.3).
  - `buyer_vat` is the buyer's VAT number on an EU sale (§8.7), empty on every other row.
  - `eu_purchase` is `tavara`/`palvelu` or `goods`/`services` on an EU purchase (§6.9), empty on every other row.
  - Rows are sorted by date, then by voucher number. Nothing about the format depends on the **UI** language, only on the book's.
  - **A text cell that Excel would run as a formula gets a leading apostrophe.** That is `description`, `category` or `receipts` starting with `=`, `+`, `-`, `@`, a tab or a carriage return. A value that already starts with apostrophes before one of those gets one more, and the import takes exactly one off, so every value round-trips. The amount and rate columns are left alone, so a negative amount stays a number. Excel may show the apostrophe in the cell.
- **Import (be lenient with rows, strict about the shape):**
  - **A bad row is skipped and counted, never fatal. A file whose header the app does not recognise is refused with an explanation**, and a column it does not know is reported rather than dropped in silence (§8.2 of this list, and the dialog in §8.11). There is no compatibility layer behind an older or foreign shape, so saying so is what stands in for one.
  - `decodeCsv` reads the bytes: a UTF-16 BOM decides, then strict UTF-8, then windows-1252, which is what Excel's plain "CSV (semicolon delimited)" writes. Strip a BOM. Detect the delimiter from the header line (`;`, tab or `,`, whichever splits it most). Headers are matched case-insensitively, in either language. `date`, `type` and `amount` are required; the rest are optional.
  - **No column recognised at all** is `not-a-book`: some other CSV entirely, and a different sentence from a bookkeeping missing a column. **A column that resolves to nothing** raises an `unknown-columns` warning naming it; the entries still import.
  - Dates are accepted as `YYYY-MM-DD` or `D.M.YYYY` and validated as real dates.
  - `settles` is optional. It is kept only on a settlement category and only when it names a period; otherwise the entry goes by its date (§6.6).
  - `voucher` is optional. A positive whole number is kept; a missing, malformed or repeated one is numbered when the book opens (§4), so an older file without the column opens with its entries numbered by date.
  - Amounts may contain spaces, NBSP, `€` and a Unicode minus. If both `,` and `.` appear, the last one is the decimal separator. A lone comma is a decimal comma in both languages, so a file reads the same in either. More than two decimals is refused, in a file and in the entry dialog: `1,234` could mean 1,23 € or 1 234 €, and a guess would be silently wrong by a factor of a thousand.
  - `mode` values `netto`, `veroton` or `net` mean net; anything else means gross. `veroton` is read but never written. An empty `vat` uses the category default, and so does one that is not a number from 0 up to 100 (`isVatRate`).
  - Category matching: same account number and side, and the name matches the Finnish name or the English default name (case-insensitive). If no name is given, the first category on that account is used. If there's no match but the account number exists, a **custom category** is created with that name. If the account is unknown, the entry is booked to 301 (income) or 344-other (expense) with a warning.
  - Invalid rows (bad date, type or amount) are skipped. A toast summarises: N entries imported, new categories, receipts imported, missing or rejected, columns not recognised, the first skipped rows, and whether the settings came from a newer version.
  - After import, the selected year is the latest year found in the file.

### 7.2 ZIP (the bookkeeping file)

A bookkeeping is always written as a ZIP, because `settings.json` (§7.6) has to travel with the entries, receipts or not. The CSV is the vouchers and the folder holds their attachments, so each is named for what it is rather than after the ZIP around it. Both names follow the book's export language (§7.1), and `receipt-path.ts` holds them in `CSV_FILE_NAME` and `RECEIPT_FOLDER`:

```
kirjanpito.zip                  bookkeeping.zip
  tositteet.csv                   vouchers.csv
  settings.json                   settings.json
  liitteet/                       attachments/
    2026/                           2026/
      01/                             01/
        K-Rauta kuitti.jpg
        IMG_4417.jpg
      10/
        2.11.2026 - HC-Maschinentechnik - Lasku.pdf
```

- Path: `{folder}/{YYYY}/{MM}/{receiptStem(file name)}.{ext}`. On a collision — two receipts of the same month whose names match, ignoring case — `-2`, `-3`, … is appended before the extension.
- **The receipt keeps the name it already has**, and there is no field asking for another (§4). The name is stripped of the extension it will be given back, using the same pattern `extFromName` matches, so the stem and the extension cannot disagree.
- **`receiptStem` sanitises, it does not slug.** The name came off the user's own disk, so it is already a valid file name and most of it is a choice they made. It keeps spaces, dots, case and Finnish letters, and removes only what a file system would refuse: `\ / : * ? " < > |`, control characters, leading and trailing dots and spaces (Windows trims those on creation), and an MS-DOS device name (`CON`, `NUL`, `COM1`…, which Windows refuses whatever extension follows) gets a `_`. At most 100 characters; an empty result falls back to `tosite`. Dropping `|` and `"` is also what keeps the path safe in the CSV's receipts column (§7.1).
- **The round trip is lossless, and the path is a fixed point.** `receiptStem` is idempotent — everything it does either removes a character that could never survive or is a no-op on its own output — so the name a re-import reads off the path is the name the next export writes, and a book can go round any number of times without its receipts drifting or degrading.
- **No date prefix.** The folder gives the year and month, and a user's own name often carries a date already — prefixing one would read twice.
- The extension comes from the file name (`jpeg` → `jpg`), otherwise from the MIME type.
- Receipt files are stored without compression (STORE); the CSV and `settings.json` are DEFLATE-compressed.
- **Import:** the user picks a ZIP. Use the shallowest `.csv` in it (ignoring `__MACOSX`), whatever it is called. Paths in `receipts` are resolved relative to the CSV's folder, then at the ZIP root, then by a **unique file name anywhere in the archive**. That last fallback is what survives a move: changing the export language renames the folder, so a save asks the file it is replacing for a path that file never held, and a receipt whose bytes this browser no longer holds would be dropped (§7.5, `carryFrom`). A name two files share is ambiguous, so the fallback refuses it rather than guessing. Files found are stored in IndexedDB. Listed files that aren't found become `missing` attachments that keep their path, so re-exporting doesn't lose the reference. Importing a plain CSV that has `receipts` paths marks those receipts as missing in the same way. A listed path that names neither an image nor a PDF is not a receipt at all: it is dropped rather than kept as missing, so it cannot reappear in the next export, and the toast counts it.
- Unpacking, decoding and writing every receipt to IndexedDB takes seconds for a real ZIP, so the import raises `importing` in the store and the UI shows progress once it passes 400 ms — see §8.2.

### 7.3 File naming when downloading a copy

The download dialog lets the user edit the base name, with the fixed extension `.zip` shown beside the field. The default is **the last opened or saved name**, as it was, without its extension (`suggestedBaseName` in `lib/domain/receipt-path.ts`). With no file behind the book it is `defaultFileBaseName`: `kirjanpito` or `bookkeeping`, from the book's **export language** (§7.1) rather than the UI's — the name belongs to the file. It carries no date: saving back to the same file is the normal flow (§7.5), so a date in the name only ages. Characters `\ / : * ? " < > |` and control characters are stripped, and a trailing `.csv` or `.zip` is removed. An empty name falls back to the default.

`fileName` in the store holds that name **with its extension** (`kirjanpito.zip`), for display only, and is set by opening, saving and downloading alike. `lib/commands/io-commands.test.ts` covers it.

### 7.4 Receipt files

- Accepted: images (`image/*`, including `.heic`/`.heif`) and PDF. Several per entry. **`isReceiptFile` in `lib/domain/receipt-path.ts` is the one place that decides this**, and every route in and out goes through it: the file picker (whose `accept` is only a hint, so the picked files are filtered again), drag and drop, and the `receipts` paths of an imported CSV or ZIP. Export applies it too — an attachment outside the rule gets no ZIP path and no `receipts` entry — so nothing a browser still holds from before the rule can leak back into a file.
- Images are stored as the original file, byte for byte, whatever their size or type. KPL 2:7 lets a voucher's form change only if its content survives, and a resized JPEG is not obviously the same content, so the app never converts one. The viewer scales a large image to the stage when it draws it (§8.6). If the browser can't decode it (e.g. HEIC outside Safari), the preview shows the file name instead.
- PDFs are stored as they are.
- Stored in IndexedDB: database `bookkeeping-receipts`, object store `files`, key = attachment id, value = Blob. (The prototype used `kirjanpito-tositteet`; see §12.)
- **Garbage collection:** after saving or deleting entries, closing the file, importing, or closing the entry dialog, delete IndexedDB files that no entry (and no open dialog) references. Revoke object URLs of removed thumbnails. **A receipt being added counts as referenced before its bytes are written:** the entry dialog registers its id first, and the sweep waits while `importing` is up, since an import's receipts belong to no entry until the whole file is read.

---

### 7.5 Saving back to the opened file

On browsers with the File System Access API the app writes the bookkeeping
back to the file it was opened from, so the user does not have to download a
copy to keep their work. **Saving is an explicit action by default.** A
handle's write permission reverts to "prompt" on reload and re-granting it
needs a user gesture, an edit cannot be undone (only a delete can, §8.11) and
the file has no version history, and packing a ZIP of receipts is not instant. Autosave exists, but it is opt-in and it never
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
- **The file is settled before the ZIP is packed.** The permission prompt and the save picker both need a recent user gesture, which packing can outlast, and a user who backs out should not have to wait for it.
- **Saving never drops a receipt from the file it replaces without asking.** A receipt this browser does not hold, because storing it failed when the file was opened, is copied across from the ZIP being replaced, found by its path (`carryFrom` in `io-commands.ts`). What is left is a stored receipt whose bytes are gone from IndexedDB and from that path: `saveBook` asks first (`confirm.receiptsLost*`), autosave pauses without writing, and a download says so in a toast.
- **A save stops if another bookkeeping takes over.** The UI stays usable during a save, so a file can be opened or closed meanwhile. `bookEpoch` is compared before the write and before recording it (`replacedSince`), or the new book would be written into the old file, or linked to it.
- **A file changed outside the app is not overwritten blind.** `savedAt` holds
  the file's modification time as of the last read or write; if the file's own
  timestamp has moved since, saving asks first (§8.11). Writing moves that
  timestamp, so the baseline follows it or the app would mistake its own save
  for someone else's edit. `savedAt` is persisted with the book, so the check
  also holds after a reload.
- **Downloading a copy clears the dirty flag only when no file is linked.**
  With a linked file, the copy says nothing about that file, and claiming
  otherwise would let the user close a bookkeeping whose own file is still
  stale.
- **A change made during a write keeps the book dirty.** Packing and writing
  take time and the UI stays usable, so `markSaved` compares the state the file
  was built from with the state now. Autosave then runs again.
- **A book with no entries can be saved.** Deleting the last entry has to reach
  the file too, so only a book that is empty and clean has nothing to save. Its
  CSV is the header alone, which opens as an empty bookkeeping.
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
reads and writes it beside the CSV. The CSV stays the Excel-friendly
format of §7.1. Everything else that belongs to a bookkeeping is here.

```json
{
  "version": 1,
  "language": "fi",
  "theme": "system",
  "exportLang": "fi",
  "vatPeriod": "month",
  "bookStart": "2026-10",
  "vatFiled": { "2026-08": "2026-10-12" },
  "yearsArchived": { "2025": "2026-01-20" },
  "form5Filed": { "2025": "2026-03-20" },
  "overview": { "layout": [{ "id": "result", "size": "L", "hidden": false }] },
  "categories": [{ "id": "333", "line": "333", "name": "Ostot ja varastojen muutokset", "vatRate": 25.5, "enabled": true, "custom": false }],
  "autosave": false,
  "pageSize": { "ledger": 10, "categories": 25 },
  "recurring": [{ "id": "r1", "description": "Vuokra", "type": "expense", "catId": "343", "amount": 45000, "vatRate": 25.5, "amountMode": "gross", "day": 20, "from": "2026-02" }],
  "assetOpening": { "year": 2026, "amount": 300000 },
  "bankBalance": { "amount": 125000, "date": "2026-10-31" },
  "loanOpening": { "year": 2026, "amount": 800000 },
  "changeLog": [{ "at": "2026-11-03T10:00:00.000Z", "action": "add", "voucher": 1, "date": "2026-10-10", "description": "Osto" }],
  "yearEnd": { "2026": { "goods": 120000, "otherCurrent": 0, "otherFixed": 0, "cash": 3500, "otherFinancial": 0, "loanCurrent": 0, "otherCurrentDebt": 0, "otherLongDebt": 0 } }
}
```

- **Keys are English**, like browser storage (§12). Nobody opens this file in Excel.
- **Reading is lenient**, like the CSV. A missing file means defaults. A bad or unknown value is dropped on its own and the rest is kept. A `version` above `SETTINGS_VERSION` still parses, and sets `fromNewerVersion` so the import can say the file may hold settings this reader passed over — lenient, but not silent.
- **`exportLang` is the language the book is written out in** (§7.1, §7.2). It belongs to the bookkeeping, not to the browser: open a book elsewhere and save it, and it comes back in the shape it went out in rather than reformatting itself to that browser's UI language. Unlike `language` and `theme` it **marks the book dirty**, since it changes the bytes a save would produce, and it is in `bookVersion()`. Absent from a file, it falls back to `"fi"`; a new book is seeded from the UI language and the setup dialog (§8.3) can change it.
- **Categories**: the full list. A default category keeps its id, line, name and kind from the chart of accounts and takes only `enabled` and `vatRate` from the file, and one the file does not list comes in with its defaults. `persist.migrate` runs a stored list through the same merge. Custom categories come across whole. The CSV is then matched against this list, so a custom category comes back with its own id instead of being recreated from its name.
- **The overview layout** goes through `normalizeLayout` in `lib/domain/overview-layout.ts`: an unknown widget id is dropped and a missing one goes right after the widget it follows in the default layout, at its default size, so a file from an older or newer version still opens and a new widget does not land at the bottom of the page.
- **Language and theme** are written from the browser's own keys (§12) at save. Opening a file switches the app to them. They are preferences of the browser as much as of the book, so changing them does not mark the book dirty, and the landing page goes on using the browser's keys. The theme is applied through `Ctx.setTheme`, because only React can reach next-themes.
- **Page sizes and autosave** are saved the same way: written at save, applied on open, never dirty.
- **The export language, the VAT period, the start month, the filed marks, the archived years, the layout, the categories, the recurring templates, the opening balances, the year-end figures and the bank balance do mark the book dirty**, since the file no longer matches.
- A plain CSV has no settings. Opening one starts with no filed marks and no start month, and keeps the rest as it was.
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
  - **15 rem wide**, one step under shadcn's 16 rem, which the six short labels do not need. `app-skeleton.tsx` draws the same width, so nothing shifts on rehydrate. The mobile sheet keeps its own 18 rem: it is an overlay on a phone, not a column beside the content.
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

  - **`N` opens a new entry**, from the same listener, and "Uusi kirjaus" says so in its `title` and `aria-keyshortcuts` (`NewEntryButton`). `Ctrl`/`⌘`+`N` belongs to the browser, so this key has no modifier. It stays out of the way of typing: it does nothing in a field or a list that jumps by letter, behind a popover or a confirmation, or when held down.

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
- **Reading a file shows progress, but only once it is slow** (§7.2). `importing` in the store is raised for the whole of `openFile`, and `hooks/use-delayed-flag.ts` turns it into a visible state **after `BUSY_DELAY_MS` (400 ms)**: the file menu's trigger icon and its "Avaa tiedosto" row become spinners, "Lataa tiedosto" is disabled, and `components/app/import-overlay.tsx` covers the page with "Avataan tiedostoa…". A plain CSV opens in a few milliseconds and never reaches the delay, so nothing flickers; a ZIP of receipts does, and used to leave the UI silent for seconds. The overlay is **blocking**, unlike the drop overlay — the import is about to replace the whole bookkeeping. Both the app and the landing page render it, because a file can be picked from either and the drop overlay vanishes the instant the file lands. `importing` also guards re-entry: a second file dropped mid-import is ignored rather than interleaving two `replaceBook` calls.

### 8.3 Landing page

A full-width page with no sidebar. It has its own nav: logo, FI/EN, theme, and "Avaa tiedosto" (or "Avaa kirjanpito" when a bookkeeping is open). Sections:

1. **Hero.**
   - Headline "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon." and a lead paragraph.
   - Calls to action:
     - Closed state: "Aloita uusi kirjanpito" and "Avaa tiedosto", plus a dashed drop zone ("Pudota CSV- tai ZIP-tiedosto tähän…"). A file can be dropped anywhere on the page, with the same overlay as in the app (`useFileDrop`), and anything but a CSV or ZIP gets a toast.
     - Open state: "Jatka kirjanpitoa" (to the overview) and "Avaa tiedosto", with a meta line showing the file name, the number of entries and the unsaved-changes status.
   - Visual: two overlapping, slightly rotated paper receipts on a soft accent panel. One is an expense receipt, the other the October VAT calculation ending in "Maksettava 617,18 €". On small screens only the VAT receipt is shown.
2. **"Tositteesta veroilmoitukseen neljässä vaiheessa".** Four numbered steps: open or start, record receipts (including attaching), check the figures, export (a ZIP organised by year and month).
3. **"Mitä kirjanpito laskee puolestasi".** Three cards: VAT (with rate chips), income statement (a mini statement), and monthly summary (a mini bar chart).
4. **"Ei tiliä, ei tietokantaa".** A privacy explanation next to a CSV sample block.
5. **"Kysyttyä".** An accordion with four questions: who it's for, whether it files returns, moving over from Excel (lists the columns; `receipts` is optional), and what happens when the browser is closed.
6. A closing call to action, "Aloita tämän kuun tositteista.", and a footer disclaimer: "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa."

- "Aloita uusi kirjanpito" opens the empty overview and sets the year to the current year. If there are unsaved changes, it asks first.
- **It then opens the setup dialog** (`components/settings/setup-dialog.tsx`, `DialogState` kind `setup`), which asks for the four settings a bookkeeping starts with rather than deciding them silently: the export language (§7.1, seeded from the UI language), the VAT period, the start month, and autosave where a file can be written at all. The controls are the ones Asetukset, Yleiset exports — `ExportLanguageToggle`, `VatPeriodToggle`, `BookStartSelects`, `AutosaveCheckbox` — not copies of them (§11). "Ohita" closes with the defaults; everything it asks lives on Asetukset, so it is never a dead end. `startBook` applies all four at once and leaves `dirty` false, since a bookkeeping nobody has typed into has nothing unsaved. The dialog is **not** shown when a file is opened: a file brings its own `settings.json`. Its host is in `AppShell`, which the route it navigates to mounts. `test/setup-dialog.test.tsx` covers it.

### 8.4 Ledger (Kirjanpito)

- Header: "Kirjanpito", the period ("Koko vuosi 2026" or "Lokakuu 2026"), and a primary "Uusi kirjaus" button.
- **Month chips:** Kaikki plus Tammi…Joulu, with entry counts. Empty months are greyed. The selected chip is filled in the primary colour. Each chip is shaped exactly like a default `Button` — **36 px tall** and the button radius (§11) — so the chip row and the toolbar below it read as one scale and one shape.
- **Totals cards** (§6.2): three cards side by side, each a bare `Panel`, stacking to one column under 640 px. One bar with dividers made the three figures read as a single row of a table; they are three separate answers.
- **Toolbar:** four controls of the same shape, left to right, and nothing pushed to the right-hand end. It is **hidden, together with the table, on a period that holds no entries at all** — the page then shows "Ei kirjauksia: Lokakuu 2026." A row of controls that cannot change the result reads as if the filters were what emptied the page. The filters keep their values while hidden and come back with the next period that has rows.
  - Search over description and category, or an exact voucher number. It is a **fixed 20 rem box**, not one that grows into the row: the queries are a word or two, and a field stretched across the toolbar reads as the page's main control.
  - **A search also reports where else it matches.** Under the toolbar, "Osumia myös muualla:" lists the other years with a match as buttons, "2025 (2)", newest first (`searchHitsElsewhere` in `stores/selectors.ts`). With one month on screen the selected year is listed too, for its other months. A button opens that whole year, keeps the search and clears the other filters, so the count is what the user then sees. The list stays out of the way until there is a search, and the table and totals remain one year's, since voucher numbers and totals only mean something within a year.
  - A type filter (Kaikki tyypit / Tulot / Kulut) as a **select**, like the category filter beside it. A segmented control would be the one control here shaped unlike the others, and it grows with the language. `EntryTypeToggle` (§8.5, §8.10) stays segmented because it is a form field, not a filter.
  - A category filter, listing only the categories used in the period.
  - "Tarkistettavat": Kaikki kirjaukset / Avoimet (entries not yet paid, §6.3; not a check, so it has no warning row) / Ilman tositetta / Verokanta ei vastaa päivää / Päivä tulevaisuudessa / Kotimaan myynti ilman ALV:tä / Poikkeuksellisen suuri summa / Mahdollinen kaksoiskirjaus / ALV ei vähennettävää (`ledgerCheck`). `lib/domain/entry-checks.ts` decides each one, for this filter and the overview's checklist alike, and it is given the whole selected year, so a month on screen does not change what stands out.
    - An entry counts as having a receipt only when a file is available; one listed in the CSV but missing from the ZIP does not.
    - A rate mismatch is `rateMismatch` (§5).
    - A future date is any date after today.
    - A domestic sale without VAT is a line 300 `domestic` sale at 0 %, flagged only in a year that also has domestic sales with VAT, since a business that is not VAT registered sells everything at 0 %.
    - A large amount is a gross amount over ten times the median of that year's income, or expenses, given at least five of them, and never under 1 000 €. It is meant to catch a misplaced decimal comma.
    - A possible duplicate shares its date, side and gross amount with another entry, or a stored receipt file (same name, type and size). Both of a pair are flagged. The category is not compared, since the same receipt entered twice can land in two categories.
    - Private use without VAT is a 0 % entry on line 314 in a year where that line adds up to more than 850 €, the free part for a natural person (AVL 21 §). Line 313 is not checked, since a car's VAT depends on how much of it was deducted. The entry dialog explains the rule under the category on 313 to 315.
    - VAT not deductible is an expense with VAT on entertainment (341) or a non-deductible line (365–367), `AccountLine.noVatDeduction`. VAT on entertainment cannot be deducted (AVL 114 § 1 mom. 3 kohta, checked in Vero's guide "Markkinointi- ja edustustilaisuudet arvonlisäverotuksessa"), and a cost that is not deductible for income tax is usually not for the taxable business either. Such a cost is booked at its gross amount with 0 % VAT, so the tax stays part of the cost; with a rate it would count as purchase VAT.
    - The overview's checklist sets this filter when it sends the user here.
  - "Tyhjennä suodattimet" when any filter is active.
- **Table columns:** a selection checkbox and Nro (the voucher number), both hidden under 560 px, then Pvm, Tyyppi, Selite, Luokka, Veroton, ALV (amount, with the rate small below), Verollinen (bold, with "−" for expenses), and actions.
  - Every column is sortable, with ↑/↓ shown on the active column and ⇅ on the others. Sorting by gross uses signed values, and sorting by type puts income first.
  - **A header cycles through three states: ascending, descending, then no column chosen** (⇅ everywhere), so every sort can be undone. The third state is `ledgerSort: null` / `catSort: null`, **not the default order spelled out**: the column that order follows — Pvm here, Tili in the categories table — would otherwise be stuck between its two directions, because "back to the default" *is* that column ascending. With null it reaches ⇅ like every other column. The rows then take `LEDGER_SORT_DEFAULT` / `CAT_SORT_DEFAULT` from `stores/book-store.ts`, read where the list is built rather than where the header is clicked, and `nextSort` is the one implementation of the cycle.
  - A first click is always ascending, including on Pvm, where the rows are in that order already and only the icon moves.
  - Tyyppi is a `Pill` in the income or expense tone — the same badge as the categories table (§8.10), so the two tables read alike.
  - The description cell shows a **paperclip button** (with a count if there are several receipts) that opens the viewer.
  - Row actions: **edit (pencil)**, **copy as new**, and delete. Clicking or pressing Enter on a row also edits it.
  - Responsive: the category column is hidden under 1240 px. Under 560 px, the type, net, VAT and actions columns are hidden (tap the row to edit); the signed gross is what still tells income from expense there.
- **Bulk actions.** Ticking rows, or the header box for the whole page, shows a bar above the table (`components/ledger/bulk-bar.tsx`) with the count, "Vaihda luokka" and "Poista valitut".
  - The category list offers the enabled categories of the selected side. A mix of income and expenses cannot share a category, so the bar says so instead of offering one. Each entry keeps its own VAT rate and its voucher number.
  - Both go through `lib/commands/bulk-commands.ts`: the delete asks first, both refuse an entry in a locked period (§8.11), and both can be undone from the toast for 10 seconds.
  - The selection belongs to the period and filters it was made under. Changing either starts over, so the bar never acts on rows that are no longer listed. It is component state, not stored.
- **Pagination:** the row count ("16 kirjausta") at the left-hand end, and at the right "Rivejä sivulla" with a 10/25/50/100 select (default 10), "Sivu 1 / 2", and first / previous / next / last icon buttons. The strip reads as "what you are looking at" / "how to move through it", which is why the count lives here rather than in the toolbar. The page resets to 1 when filters, sorting or the month change. It sits **inside the table's surface**, as the categories table places it (§8.10) — `ledger-table.tsx` renders the table alone and the view composes the `Surface` around both. `TablePagination` owns that strip, its padding and the rule above it: the table body drops the last row's own bottom border, which in a table that ends its surface would land on the surface's edge. **It is always shown**, even on a single page: the rows-per-page select is how the page length is set, so hiding the row until the list outgrows that length would hide the only control that changes it.
- **Empty state** (open but no entries): "Ei vielä kirjauksia" with "Uusi kirjaus" and "Avaa tiedosto".
- **Päiväkirja, Pääkirja and Tililuettelo.** The view has four tabs (`LedgerTabs`, routes `LEDGER_ROUTES` in `lib/site.ts`): Kirjaukset at `/app/ledger`, Päiväkirja at `/app/ledger/journal`, Pääkirja at `/app/ledger/accounts` and Tililuettelo at `/app/ledger/chart`. The Accounting Act asks that entries can be viewed "aikajärjestyksessä ja asiajärjestyksessä" (KPL 2:4, checked on Finlex), and these two are that, for the selected year (`lib/domain/books.ts`, `components/ledger/books-view.tsx`).
  - The journal lists the year by month, in date and then voucher order, with the account number, expenses as negative, and income and expense totals.
  - The general ledger lists the same entries by account in chart-of-accounts order (§5), only accounts that have entries, each with its total. A category is shown under the description unless it has the account's own name.
  - The account list (KPL 2:2, `accountList`) names each account with an enabled category or an entry that year and what it holds, followed by the list of books and material of KPL 2:7a. The Act keeps both for 10 years with the books.
  - All three are printable sheets on the `--sheet` surface with a "Tulosta" button, like the income statement (§8.8), and end with the retention rule of KPL 2:10, with the year's own dates: the books for 10 years from the end of the financial year, the vouchers for 6 years from the end of the year it ended in.

### 8.5 Entry dialog (Uusi kirjaus / Muokkaa kirjausta / Kopio kirjaus)

A two-column modal. On mobile the columns stack.

- **Left column.** Date and type share a row, and so do the amount and the VAT %; both pairs fall back to one column below 560 px, where a date input and its picker no longer fit half a dialog.
  - Date.
  - Type as a segmented control (`EntryTypeToggle`: Tulo / Kulu, coloured green and red when selected).
  - Description (placeholder "Esim. Lasku 1006 – Asiakas Oy").
  - Category select: only enabled categories of the chosen type, plus the entry's current category even if disabled.
  - Amount, right-aligned with tabular figures.
  - VAT % select. Picking a category sets its default rate **as it was on the entry's date** (§5), and changing the date moves an unchosen rate across a rate change. A rate the user picked, one read from a PDF, and the rate of an entry being edited or copied count as chosen and stay. When the rate does not fit the date, a warning-coloured line under the field says so ("25,5 % on voimassa 1.9.2024 alkaen. Tälle päivälle verokanta on 24 %."). Saving is never blocked by it. A second warning line follows when the category's VAT cannot be deducted and the rate is above 0 %, saying to book the gross amount at 0 % (`vatNotDeductible`).
  - "Summa on" segmented control (Verollinen / Veroton).
  - A warning-coloured line under the amount when another entry has the same date, side and gross amount, naming its voucher number and description (`duplicateOf`). Attaching a file that another entry already holds raises a toast naming that entry (`entryWithReceipt`). Both are hints: two equal purchases on one day, or one receipt covering two entries, can be right.
  - An inline error line.
- **Footer:**
  - Edit mode: Poista, Kopioi, Peruuta, Tallenna.
  - New and copy modes: Peruuta, Tallenna ja uusi, Tallenna.
- **Right column:**
  - A **live receipt preview**, the signature visual element. It looks like a paper receipt with a perforated bottom edge and shows: type, date, description, category, net, VAT with rate, a bold total, and a badge ("Kasvattaa myynnin veroa" / "Vähennetään ostojen verona" / "Ei arvonlisäveroa").
  - Below it, the **"Tositteet" section:** a two-column grid (three on tablets) of 3:4 thumbnails. Images are shown cropped to the top; PDFs show their first page with a "PDF" badge. Each has a remove ✕. An "+ Lisää tosite" tile and the hint "Kuva tai PDF. Voit myös raahata tiedoston tähän." follow. Clicking a thumbnail opens the viewer on that receipt.
  - **There is no name field.** The receipt's own file name is what names it in the archive (§7.2), so asking for a second name would only make the user type again what they already decided when they saved the file.
- **Defaults for a new entry:** if a month is selected, its date (today's day, capped at 28). Otherwise today if the year matches, else 1.1. of the selected year. The type and amount mode are the last ones used.
- **Validation:** a valid date, a non-zero amount and a chosen category are required. Error texts: "Anna päivämäärä.", "Anna summa, esim. 124,50.", "Valitse luokka." The error is held as `{ field, message }` where `field` is the `FormState` key: one `FieldError` line shows the message, and the field it names carries `aria-invalid` (the category select takes it through `OptionSelect`'s `invalid` prop). Editing that field clears the error, rather than leaving a complaint under a corrected value until the next save.
- **Pre-fill from a PDF:** adding an invoice PDF to an untouched form (no amount, no description) reads its text layer and fills the date, a description "Lasku {nro} – {myyjä} – {first row}" (whichever parts it found), the total as a gross amount and the VAT rate. A previous entry naming the same seller supplies the type and category; failing that, `suggestCategory` picks an expense category from words in the seller's name and the rows, falling back to 333. The seller is the company name printed beside a business ID, which is often only in the footer. A rate read this way survives picking a category. `lib/domain/invoice-text.ts` does the reading and is pure; `extractPdfText` in `lib/browser/pdf.ts` feeds it. The virtual barcode, when printed, wins over any labelled total or due date. A credit note keeps its minus, wherever it is printed, and its total is the largest amount by size. An amount like "2 123,00" reads as 2 123,00 €, since a quantity beside a price in the same text run cannot be told from a thousands separator. A scanned PDF has no text layer and pre-fills nothing; there is no OCR.
- **Nothing saves while a receipt is being stored:** "Tallenna" and "Tallenna ja uusi" are disabled and `Ctrl`/`⌘`+`Enter` waits, because the receipt is not in the form yet.
- **Toista joka kuukausi** keeps the entry as a monthly template (`lib/domain/recurring.ts`), in `settings.json` as `recurring`. Nothing books itself. When a month lacks a template's entry, the ledger shows a line for the selected month, or this month on the current year's whole-year view, and the overview's checklist has a row for this calendar month; both open a dialog that lists them, ticked, and adds them with an undo. **Whether a month has its entry is read from the entries, not stored**: the same side, category and description count, so a changed amount still counts, a deleted entry comes due again, and it survives the CSV. The date is the template's day, or the month's last day, and the rate follows it (§5). A template is monthly only. Unticking the box on an edited entry removes its template, and Asetukset, Toistuvat lists them with the amount and day editable.
- **Maksettu** offers the same day, another day with a date, or "Avoin", on any line that can be unpaid (§6.3). An open entry carries a pill in the ledger.
- **Verokausi** appears under the category when it is a VAT payment or refund (§6.6), and the entry dialog can be opened with fields filled in (`DialogState.prefill`), which is how the VAT view books one.
- **Yksityisotto or Yksityissijoitus** as the category shows a line under it: neither income nor an expense, no effect on the result or VAT, and the bank statement as the receipt (`entry.ownerHint`, §6.7).
- **Tallenna ja uusi** saves, keeps the date, resets the rest for the next entry, and puts the focus back on the date.
- **`Ctrl`/`⌘`+`Enter`** saves from any field: "Tallenna ja uusi" in the new and copy modes, where its button shows the key cap, and "Tallenna" when editing. It waits while a receipt is still being stored. A new or copied entry opens with the focus on the date, so a month's receipts can be entered from the keyboard alone.
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
  - Fit to view, rotate 90°, and save original. Closing is the dialog's own ✕ in the top right; the toolbar has no second one.
- The stage is a scrollable grey area. The content is drawn to a canvas: fitted to the stage at 100 %, sized for the device pixel ratio, with the image or PDF page rotated. Images never upscale beyond 100 % at fit. The view redraws on window resize.
- Keyboard: ←/→ moves between receipts, and +/− zooms.
- Missing files show "Tiedosto puuttuu" with the path. Undecodable images or PDFs show a message and a "save original" button.
- The content centres itself with `m-auto` rather than from the stage, so a zoomed receipt can be scrolled to all four edges. A new draw of a PDF cancels the one under way (`renderPdfPage`), since pdf.js refuses a second render on a canvas.

### 8.7 VAT return (ALV-laskelma)

- **The view opens on the period today falls in.** `vatIndex` is what the user has picked, null until then, so it cannot be a month number read as a quarter after a reload. `useVatPeriod` works out one index for the title, the figures and the filed mark.
- **The view has no period control of its own.** It always shows the filing period set in Settings (`vatPeriod`, §6.5, §8.10). A monthly or quarterly filer gets a strip of the year's months or quarters in the shape of the ledger's month chips (§8.4); a yearly filer gets the whole year and no strip. Figures by any other period are ones the user never files, so a second switch here would only duplicate the setting.
- Each chip shows where its period stands: Ilmoitettu, Myöhässä, the due date, Kesken, Tulossa, or "Ei ilmoitusta" for a period before the book's start (§6.5), whose banner says so instead of offering the filed toggle. The result banner carries the filed toggle for a closed period: "Merkitse ilmoitetuksi", or "Merkitty ilmoitetuksi {date}" with "Poista merkintä".
- **A period before the book's start is left out of the strip**, so a business founded in October is offered October to December rather than nine months that owe nothing. It stays out even when it holds entries, since a chip reading "Ei ilmoitusta" is no way to report a date on the wrong side of the start month. The one kept is the period on screen, so the strip always has a selected chip and the banner can explain it; it is reachable by having been selected before the start month was set.
- A result banner: "Maksettava arvonlisävero" (or "Palautettava…") as a large number, with the formula line "Myynnin vero X − ostojen vähennettävä vero Y".
- Two tables side by side, "Myynnin arvonlisävero" and "Ostojen vähennettävä vero", with the columns Verokanta, Veroton, Vero and Yhteensä, plus a totals row.
- Under the banner, for a closed period with tax to pay or reclaim, a "Maksu tai palautus" panel (`VatSettlementPanel`, §6.6). "Kirjaa maksu" or "Kirjaa palautus" opens the entry dialog filled in: today, the period's due, 0 %, the settlement category and the period. Booked entries are listed with their date and voucher number and "Avaa kirjaus", then whether they match the calculation. The button stays while there is a difference, for the rest of a part payment. An entry already booked shows on any period.
- A "Muut ilmoitettavat myynnit" panel, and a note explaining 0 % purchases and asking the user to check the figures before filing in OmaVero.

The view has two sub-pages, as tabs shaped like the settings tabs (`SubPageTabs`). `VatShell` holds the title, the tabs and the period strip, and `useVatPeriod` gives both pages the same selected period. The routes are `VAT_ROUTES` in `lib/site.ts`.

- **Laskelma** at `/app/vat`: the banner, tables and panel above.
- **Ilmoitus** at `/app/vat/return`: the period's figures as the return's fields, on the `TaxForm` that Form 5 also uses (§8.8), in three steps: the fields with an amount as a copy checklist, the tax payable or refundable (308) to check against OmaVero, and the filed mark. A fourth step books the payment or refund, with the same control as the panel above. `lib/domain/vat-return.ts` maps the report to the fields.
  - The names and order follow the return in OmaVero. The codes are those of Verohallinto's data file specification VSRALVKV (version 1.10), whose check #1924 the tests run: 308 is the tax fields minus 307. OmaVero is matched by name, so the intro says so.
  - 301 holds 25,5 % and 24 %, 302 holds 13,5 % and 14 %, 303 holds 10 %. 307 is all purchase VAT.
  - 309 (zero-rated turnover) is line 300 sales at 0 % plus non-EU sales. Its hint says to leave out exempt sales whose purchase VAT cannot be deducted, such as healthcare, because the book cannot tell them apart. 319 is reverse-charge sales.
  - 311 and 312 are the sales on `300-eu-goods` and `300-eu-services`. Their hints say these sales also go on the EC Sales List (yhteenvetoilmoitus). Sales on the retired `300-eu` (§5) get an extra "311/312" row, only while there are any.
  - EU purchases fill 305, 306, 313 and 314, and their deductible tax joins 307 (§6.9).
  - The book records no imports or domestic reverse-charge purchases, so 304, 310, 318 and 320 stay empty. "Mitä laskelma ei sisällä" says to enter them in OmaVero and add their tax to 307 if deductible.
  - A sales rate outside `RATES` has no field. It stays in 308 and the view warns about it.
  - With no amounts, the checklist points to "Ei toimintaa verokaudella".

- **Yhteenvetoilmoitus** at `/app/vat/ec`: the EC Sales List for the selected year, month by month, with each buyer's VAT number, goods and services (`lib/domain/ec-sales.ts`). It is monthly whatever the VAT period is, so the shell hides the period strip here. Due on the 20th of the next month or the next working day (vero.fi). The month is the entry's date, which stands in for the invoice's month on goods and the supply's or payment's on services. An EU sale gets "Ostajan ALV-numero" in the entry dialog, with a warning on a number of the wrong shape that never blocks saving. The app has no connection to VIES. A sale with no number is listed for the user to fix.

### 8.8 Income statement (Tuloslaskelma)

Presented as a printable **sheet**: the `--sheet` surface (warm paper in light, the card tone in dark — see §11), a thin border, and a soft shadow. It has the title, the period, sections with totals, greyed group headings, lines with muted account numbers, and a double-ruled result line. A "Tulosta" button calls `window.print()`, and the print styles hide the chrome: `.print-hidden`, which the top bar carries, and the sidebar by its `data-slot`.

The view has two sub-pages, as tabs shaped like the settings tabs (§8.10, `SubPageTabs` in `components/common/sub-page-tabs.tsx`). `StatementShell` holds the title, "Tulosta" and the tabs, so both pages print. The routes are `STATEMENT_ROUTES` in `lib/site.ts`.

- **Laskelma** at `/app/statement`: the sheet above.
- **The Form 5 mark.** For a closed year, Lomake 5 ends with "Merkitse ilmoitetuksi" (`form5Filed` in `settings.json`, dirty like any setting). It locks every voucher of the year and the year-end figures (§8.11), stops the overview's due-date row, and can be removed, which the change log records.
- **Lomake 5** at `/app/statement/form5`: the same figures as Form 5's section 2, in the form's order, with its codes and its labels (`lib/domain/form5.ts`), followed by the assets, liabilities and wages of `lib/domain/form5-balance.ts`, so one checklist covers everything the app fills. It opens on "Täytettävät", in two steps: the fields with an amount, as a checklist with a "3/10 kopioitu" count and a progress bar, then the totals 316, 355 and 358 or 359, and 718, 725 and 733 or 734 once there are assets or liabilities, to check against OmaVero. The totals have no copy button. A third step says where the assets and liabilities come from and links to Varat ja velat. "Kaikki kohdat" shows every field in the form's order, for finding one by its place; the non-deductible expenses and the result are sections of their own. Each code sits in a box like the paper form's, filled where there is an amount to enter, and a portion (320, 322, 338, 342, 347) is indented under its field. The amount itself is the copy button: a click puts it on the clipboard as `1234,56`, with no spaces and no euro sign, and turns the button green. "Avaa OmaVero" links to vero.fi/omavero; the notes on what the app leaves out are behind "Mitä laskelma ei sisällä". The codes use Geist with tabular figures rather than a monospace, since Geist is the only face (§11). It sits on the same `--sheet` surface as the statement, so the two tabs read as one document, and its rules take `--sheet-edge`. The checklist itself is `TaxForm` in `components/common/tax-form.tsx`, shared with the VAT return (§8.7); `lib/domain/tax-form.ts` holds its row types and splits a form into steps. 338 and 347 repeat 337 and 346, since the app deducts depreciation and interest in full, and a note says so. Another note names what the app does not fill: 325 to 328, 364 and the form's other sections. `lib/domain/form5.test.ts` runs Verohallinto's own check rules from the 2026 data file specification against the fields.
- **Varat ja velat** at `/app/statement/balance`: what Form 5's net worth calculation needs beyond the book (`lib/domain/form5-balance.ts`). The resulting fields are copied from Lomake 5. 704 is the register's closing balance below, 711 the open sales on 31.12. and 725 holds the open purchases and the loans (§6.8). What the book cannot know is typed in per year: goods, other current assets, other fixed assets, cash in hand, other financial assets, the part of the loans due within a year, and other debts (`yearEnd` in `settings.json`). Bank deposits are in no field, as the form says. Real estate and securities are left to Forms 18B and 8B, and adjusted negative equity (747) to OmaVero. 394 is line 335 by payment date. "Kirjaa varaston muutos" books the year's stock change on line 333 at 31.12., opening minus closing, so a growing stock lowers the cost. Tests assert the specification's rule for 718.
- **Poistot** at `/app/statement/assets`: the register of machinery and equipment (`lib/domain/assets.ts`), one pool as EVL 30 § has it. A purchase is an entry on `asset-purchase` and a sale one on `asset-sale` (§5), so each keeps its voucher number and receipt, and the only thing stored is an opening balance for older assets (`assetOpening` in `settings.json`). Each year: opening + purchases − sales is the base; the maximum is 25 % of it, or all of it at 1 200 € or less; **depreciation is whatever the year's entries on line 337 add up to**, so a year with none carries the whole balance forward. "Kirjaa poisto" adds such an entry, the maximum by default, and less is allowed. A sale above the balance gets a warning that the excess is taxable income. Buildings and other classes are not handled, and the raised 50 % rate of 2020 to 2025 is not either. Rules from vero.fi, "Poistot ja pienhankinnat".
- **Vähennykset** at `/app/statement/deductions`: calculators that book an entry on line 354 (`lib/domain/deductions.ts`), since these are deductible outside the books. Mileage and per diems are the additional deduction: the year's tax-free amount minus the actual costs already booked, zero if those are higher (Vero, "Liikkeen- ja ammatinharjoittajien sekä maataloudenharjoittajien matkakustannusten vähentäminen"). Booked car costs start from `344-vehicle`, which can only lower the figure. The home office deduction is one of three yearly tiers. **The amounts are a table per year, added by hand from Vero's decisions**: travel for 2024 to 2027, home office for 2025 and 2026. A year with none says so and offers no calculator. Passenger and trailer additions and foreign per diems are left out. An entry calculated for a year is dated today within that year and otherwise 31.12. Line 337 and 354 entries are exempt from the "no receipt" check (§8.4).
- An Ilmoitin.fi file is not made. That would be filing, and the app does not know the rest of the form (§1).

### 8.9 Summary (Yhteenveto)

See §6.4. Wide tables scroll horizontally with a sticky first column. The chart is the overview's (`components/common/income-expense-chart.tsx`, §8.12): mirrored, with the year totals in the panel heading, and a click opens the ledger on that month.

### 8.10 Settings (Asetukset)

Every section is a `Panel` (§11). The page is split into two sub-pages, so the categories table does not bury the handful of book-wide settings:

- **Yleiset** at `/app/settings`: the VAT period, the start month, saving, the voucher numbers (§4), and clearing the entries.
- **Luokat** at `/app/settings/categories`: the add form, the categories table, and restoring the defaults.
- **Toistuvat** at `/app/settings/recurring`: the monthly templates (§8.5).

`app/app/settings/layout.tsx` renders `SettingsShell` (`components/settings/settings-shell.tsx`): the page title and a row of tab links shaped like the month chips (§8.4). The current tab is `bg-muted` with `aria-current="page"`, not filled with the primary colour, because it marks a place rather than a filter. The routes are `SETTINGS_ROUTES` in `lib/site.ts`. The sidebar keeps Asetukset lit on any path below it. The new-category name lives in the store (`catFormName`), so it survives switching tabs.

On **Yleiset**:

- **"Tiedoston kieli"** comes first: a segmented Suomi / English setting `exportLang` (§7.1). It decides the shape of the file — its name, the CSV's columns and words, and the receipt folder — where the VAT period only decides what goes in it, so it leads. The options are endonyms from `LANG_NAMES`, shared with the language picker.
- **"ALV-ilmoitusjakso"**: a segmented Kuukausi / Neljännesvuosi / Vuosi. It sets `vatPeriod` (§6.5), which the overview's due dates and the VAT view follow. Changing it keeps the VAT view on the same part of the year: October becomes Q4.
- **"Kirjanpidon aloitus"**: the month the business began, as a month select ("Ensimmäisestä kirjauksesta" or a month) and, once a month is chosen, a year select. It sets `bookStart` (§6.5). Unset, returns are counted from the first entry.
- **"Tallennus"**, only where the browser can write to a file: the "Tallenna automaattisesti" checkbox (§7.5), with a description that says what can be undone: a delete for 10 seconds (§8.11), an edit not at all.
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
  - Delete is only offered for custom categories that no entry or recurring template uses.
  - Pagination with a default of 25 rows, laid out as on the ledger (§8.4).
- **"Oletusluokat"**, under the table: a description of what restoring does, and "Palauta oletusluokat" (`outline`) on the footer. It restores the defaults and keeps custom categories that an entry or a recurring template uses. It is reversible and routine, so it sits beside the table it changes; clearing the entries is not, so it is on the other page in its own destructive panel.

### 8.11 Confirmations and unsaved-change rules (apply everywhere)

Use one shared `AlertDialog`-based `confirm()` helper, with a title, a message, a destructive confirm button (red) and a cancel button. The cancel button can be relabelled, e.g. "Jatka muokkausta", and gets focus by default.

`alertDialog()` is the same primitive with no cancel label: one button, nothing to decide. It is for the cases where **nothing happened and the reason is the whole message** — a file the app could not open (§7.1). A toast is easy to miss and carries two sentences badly; a partial problem, where the book did open, stays a toast. Never `window.alert` (§2).

Cases:

| Trigger                                | Condition                          | Title / confirm label                                                     |
| -------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Close file ("Sulje tiedosto")          | unsaved changes                    | "Suljetaanko tiedosto?" / "Sulje tallentamatta"                           |
| Start new bookkeeping                  | unsaved changes                    | same as above                                                             |
| Open a file over the current one       | unsaved changes                    | "Korvataanko avoin kirjanpito?" / "Korvaa"                                |
| Save over a file edited elsewhere      | its timestamp moved since we read it | "Korvataanko tiedosto?" / "Korvaa"                                      |
| Delete an entry (row or dialog)        | not in a locked period             | "Poistetaanko kirjaus?" / "Poista" |
| Save an entry                          | it adds to a period marked as filed | "Muutetaanko ilmoitettua kautta?" / "Tallenna silti"                     |
| Clear all entries                      | always                             | "Tyhjennetäänkö kirjaukset?" / "Tyhjennä"                                 |
| Close the entry dialog (Peruuta / Esc) | form differs from its snapshot     | "Hylätäänkö muutokset?" / "Hylkää muutokset", cancel = "Jatka muokkausta" |
| Navigate away from Settings            | the new-category name is filled    | same as above, with the category message                                  |
| Browser tab close (`beforeunload`)     | any of the above dirty states      | the browser's native prompt                                               |

**Dirty bookkeeping** means the entries or the book's settings changed since the last read or write of a file. It is set by any add, edit or delete, by a category change, and by the VAT period, a filed mark, an archived year or the overview layout (§7.6), and cleared by opening a file, by saving to the linked one, and by downloading a ZIP **only when no file is linked** (§7.5). A book with no entries asks too: deleting the last one still left the file behind.

The wording everywhere is about saving rather than exporting, so one set of strings covers both ways of keeping the work. The row above that highlights this: the close confirmation is the same sentence whether the user saves to their own file or downloads a copy.

Closing a file clears entries, the file name and filters, puts the categories back to the defaults, unlinks the file (§7.5), sets the bookkeeping to closed, garbage-collects receipts, and returns to the landing page. A new bookkeeping starts from the default categories too: custom ones and changed rates belong to the old file (§7.6).

**A filed period and a stored year are locked** (`lib/domain/period-lock.ts`). KPL 2:7 forbids changing or deleting the content of a voucher or a book after a periodic return has been made from it, or after the financial statements are prepared. So an entry the VAT return counts (`countsOnVatReturn`, the rule `vatReport` itself uses), dated in a period marked as filed, opens read-only, with "Lukittu" beside the dialog's title and the reason in a popover that opens on hover or tap. So does every entry of a year whose Form 5 is marked as filed (`form5Filed`, on the Lomake 5 tab, §8.8) or which is marked as stored. An entry the VAT return does not count, such as YEL, a bank fee, a grant, an owner's transfer, a loan or a VAT payment, stays open after a VAT return until Form 5, and changing it so that the return would count it gets the warning below. Delete, bulk actions, clearing and renumbering refuse with a toast (`refuseLocked`). The payment date stays open, since a later payment adds to what is known and alters nothing reported, but a Form 5 year is stricter: no payment date may be set in it or moved out of it (`paidChangeHitsForm5`), since its year-end receivables and an ammatinharjoittaja's result follow those dates. "Tee korjauskirjaus" opens a new entry with the opposite amount, dated today. Removing the mark unlocks the entry, which is how a mark made by mistake gets undone, and the log shows it. No new entry can be dated in a stored year or a year whose Form 5 is filed. The year-end figures on Varat ja velat lock with Form 5 too. **Not locked:** the asset opening balance, which can still change a filed year's figures.

**Every change to the entries is logged** (`lib/domain/change-log.ts`). The store's entry actions diff the entries before and after and append one record per voucher: added, edited with each field's old and new value (a new voucher number included), deleted or restored. An undo is logged as its own record. Each mark set or removed is logged too, and a file opened with no log, such as a plain CSV, starts one with a record saying so. The log is `changeLog` in `settings.json` and the browser's blob. **The app shows it only on the voucher**: `EntryHistory` lists an entry's records, open, in its dialog once anything beyond adding it has happened. A deleted voucher has no dialog, so its record, and the records of the marks, stay in `settings.json` with no view in the app. **It records use of the app.** A file the user controls can be edited by hand, so the log is not proof, and the landing page's FAQ says so.

**A change that adds to a filed return says how to correct it.** `filedPeriodChanges` in `lib/domain/filed-changes.ts` builds each touched period's return before and after the change and compares the fields, so an entry no field counts (a 0 % grant) asks nothing. For each period that does change, the confirmation names it, the date it was marked, and how much the tax payable goes up or down. It then gives Vero's fix (vero.fi, "Miten arvonlisäveroilmoituksen tietoja korjataan?"): a replacement return (korvaava ilmoitus) for the period in OmaVero, or, when only the tax fields change and by at most 500 €, the next return instead (`fitsNextReturn`). A change to EU, reverse-charge or 0 % sales always needs the replacement. The filed mark stays as it was, since the user decides when the correction is made. `lib/commands/filed-commands.ts` holds the wording and is loaded on demand by `deleteEntry`, because `book-commands.ts` is in the landing bundle.

**Deleting can be undone.** Deleting an entry and clearing the entries both still ask first, then raise a toast with "Kumoa" for 10 seconds (`offerUndo` in `lib/commands/book-commands.ts`). An undo also brings back a custom category deleted in the meantime, and undoing a bulk category change only moves the category back, so an edit made since stays. The deleted entries' receipts stay in IndexedDB while the toast is up (`undoAttachmentIds`, which the GC sweep counts as live), or an undo would bring back entries whose files were already gone. An undo after a new, closed or opened bookkeeping has taken over does nothing (`bookEpoch`). Undo marks the book dirty, since autosave may already have written the deletion. `lib/commands/book-commands.test.ts` covers it.

### 8.12 Overview (Yleiskatsaus)

The app's front page, at `/app/overview`. `/app`, "Jatka kirjanpitoa", opening a file and starting a new bookkeeping all land here. It answers three questions: how the year is going, what VAT is due and when, and what is left to do. Every widget is a summary that links into a view; nothing here edits a figure except the filed mark.

- **`components/overview/`.** `overview-data.tsx` computes everything once, in a context, from the selected year: the summary, the income statement, VAT per month, and the VAT timeline from today (§6.5). The widgets read it.
- **Widgets**, in their default order and size:
  - **Tulos**: line 358 or 359 from 1.1. to today, or to 31.12. for a past year; the formula line; a sparkline of the cumulative result; the entry count, the profit margin and the year's VAT. With entries in the year before, also its result to the same date and its same month, beside this year's (`sameTimeLastYear` in `lib/domain/year-compare.ts`), so part of a year is never set against all of the last. Links to Tuloslaskelma.
  - **Seuraava ALV-ilmoitus**: the next period not yet filed, its amount as payable, refundable or "Nollailmoitus", a due-date row with the weekday and a days-left pill (amber at 14 days or fewer, red with "pv myöhässä" once overdue), a note when EU or reverse-charge sales must be reported too, and the period after it. "Merkitse ilmoitetuksi" for a closed period, with "Peru" right after. Links to ALV-laskelma on that period.
  - **Pankkitili**: the bank balance the user typed in, with its date (`bankBalance`, `lib/domain/bank-balance.ts`). The app has no connection to a bank, and a static export could not hold one. With entries paid after the reading and up to today, the big figure is an estimate for today, labelled as one, with the balance and the entries' gross total under it: an open entry is left out until it is paid, and tax payments other than booked VAT (§6.6) are not in the book. The owner's withdrawals and investments count once booked (§6.7). Lines where no money moves (312 to 315, 337, 353, 354) stay out; fixed assets count. The balance goes in `settings.json`, not on any report.
  - **Kuukaudet** (wide, two rows tall): `IncomeExpenseChart`, shared with Yhteenveto. Net income above the axis and net expenses below it, one axis. **The bars are mirrored on purpose**: the income green and expense red fail a deuteranopia check side by side (ΔE 5.3 light, 3.5 dark, against 8), and position gives the two series a difference every reader sees. A hover gives the month's income, expenses, VAT and result, the result by the income statement's rules (`monthFigures` in `summary.ts`), so the months add up to 358; a click opens the ledger on that month. Four figures under it: the best month, average income and expenses per elapsed month, months with entries.
  - **Myynti**: line 300 split into Suomi, EU, muut maat and käänteinen, as a stacked bar and a list; lines 301 to 324 below as other income.
  - **Kulut ryhmittäin**: the §6.4 buckets with expenses, largest first; empty ones are counted.
  - **Viimeisimmät kirjaukset** (wide): the year's six newest entries, signed gross, flagged "ei tositetta" where there is no receipt file. A row opens the entry dialog.
  - **Tarkistettavaa**: unsaved changes with a save (or download) button; each overdue return and each return due within 30 days, with "Ilmoitettu"; one row per check of §8.4 that flags anything (no receipt, a rate that does not fit the date, a future date, a domestic sale without VAT, an unusually large amount, a possible duplicate, VAT on a cost whose VAT cannot be deducted), each with "Näytä", which opens the ledger filtered to them; receipts missing from the file; the VAT registration limit (below); empty months from the first entry to the last complete month, skipping any before the start month; and one row per closed year with entries, as a reminder outside the open count (`yearsToArchive` in `lib/domain/retention.ts`). It gives the dates of KPL 2:10 (vero.fi, "Kirjanpito, tilikausi, verokausi"), the books until 31.12. ten years on and the vouchers six, and asks for a copy of the file that is no longer edited. "Tallessa" marks the year in `yearsArchived` and the toast can undo it. A year past the 10 years is not listed. The journal and the general ledger print the same dates (§8.4).
- **The limits of KPL 1:1a** (`lib/domain/book-limits.ts`). Each counts only when it holds in both the closed year and the one before. Single-entry books are allowed unless two of these are exceeded: assets 100 000 €, turnover 200 000 €, more than 3 staff. Financial statements are required when two of the micro limits are: 450 000 €, 900 000 €, 10 staff. They then follow the micro rules, within 4 months. The book does not record staff, so two limits over gets an error row saying the app does not cover it, and one over gets an information row naming the staff limit. Assets are Form 5's 718, which has no bank deposits, so a business near a limit has to count those in itself.
- **The filing period's limit** (`vatPeriodOverLimit`). Quarterly filing needs turnover of at most 100 000 € and yearly filing at most 30 000 € (vero.fi, "Tax period"). A closed year above that gets a warning row, and nothing is blocked, since the period itself is set in OmaVero.
- **Form 5's due date** (`lib/domain/tax-return-deadline.ts`). A row from the start of the year until Verohallinto's date, added by hand per tax year. A year not in the table says "in the spring" until the end of April rather than guessing.
- **The VAT registration limit** (`lib/domain/vat-threshold.ts`). A business is liable for VAT from the day a calendar year's turnover exceeds 20 000 €, and while the previous year's did (AVL 3 §, vero.fi, "VAT exemption for small businesses", valid from 1.1.2025). The book does not record registration, so a line 300 sale with VAT this year or last is what says the business is registered, and the row then disappears. Otherwise the checklist has one row, following today rather than the selected year: turnover against the limit as information, a warning from 15 000 €, and from the sale that goes over, the date it did, as an error. Turnover is line 300 net, without `300-eu-services`, which is supplied in the buyer's country. The book cannot tell a service sold outside the EU from an exported good, or a fixed asset from other sales, so those count.
- **The board** (`overview-board.tsx`) is a three-column grid with `grid-flow-dense` from 1100 px, one column below it. "S" spans one column and "L" two; the month chart at "L" also spans two rows, so the default fills the grid with no holes. Widgets use container queries for their own narrow layouts, so a widget adapts to its column, not the window.
- **Editing the layout.** "Muokkaa näkymää" turns on edit mode. Each widget gets a toolbar: a drag handle, arrows to move it among the visible widgets, widen or narrow (hidden below 1100 px, where size means nothing), and hide. Its contents go `inert`, so a drag never opens an entry. Hidden widgets wait as buttons under the board. "Palauta oletus" resets; "Valmis" leaves. The layout is `overviewLayout`, saved in `settings.json` and dirty like any setting. dnd-kit's screen-reader texts are translated (`overview.dnd*`).
- **Empty book**: no widgets and no edit button, but the two ways in and three short steps.
- `test/overview.test.tsx` covers the §10 result, the countdown, filing and undoing, the checklist, hiding and moving widgets, and the empty state.

---

## 9. Internationalisation and formatting

- Two languages: **Finnish (default)** and **English**. The choice is persisted. Update `<html lang>` and the document title when it changes. Every UI string is in a dictionary keyed by id, with `[fi, en]` values and `{param}` interpolation. Plural forms are functions (e.g. "1 kirjaus" / "{n} kirjausta"). The artifact's `L` object holds every string and is the source to port. A typed dictionary is enough; no locale routing is needed.
- **Keys are `namespace.name`** — `t("io.zipNoCsv")`, `t("confirm.clearTitle")`, `t("settings.defaultVat")`. The namespaces are app, assets, balance, common, confirm, deductions, entry, file, io, landing, ledger, nav, notFound, overview, receipt, recurring, settings, statement, summary, table, vat, viewer. `common.*` is only for words several views share; anything used in one place belongs to that place's namespace even when it is short. The keys were once flat and abbreviated (`setSub`, `f_type`, `nCats`, `delT`, `fb_import`) with four inconsistent prefix styles — unreadable at the call site, and with no room for a second settings subtitle. `messages.test.ts` enforces the shape and the list of namespaces, which is what stops the next key being added the old way.
- **The namespace is not the module.** Which of `dict/app.ts` and `dict/landing.ts` a key lives in is a bundling decision (the landing bundle must not ship all ~300 keys in both languages), so a namespace may be split across both: `nav.vat`, `receipt.*` and `statement.profit` sit in the landing module because the hero's decorative receipt and mini statement need them. Keys stay disjoint between the two; a test checks it.
- **Currency always uses Finnish formatting in both languages:** `1 234,56 €` (`Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" })`). The amount input also shows the Finnish format.
- **Dates:**
  - Finnish UI: `8.1.2026`.
  - English UI: `8 Jan 2026` (`en-GB`, `day: numeric, month: short`).
  - CSV: always ISO, in both export languages. So are the decimal comma and the `;` delimiter — only the words in a file follow its language (§7.1).
- **VAT rates:** Finnish `25,5 %`, English `25.5%`. In the CSV, `25,5` in both.
- **File sizes:** `kt`/`Mt` in Finnish, `KB`/`MB` in English.
- Months have full and short names in both languages (Tammi…Joulu / Jan…Dec).
- Sorting uses `Intl.Collator` for the current language with numeric ordering.
- Category names: default categories are translated, custom ones are not. The CSV uses the book's export language (§7.1), which is independent of the UI's.
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
| 2026-03-03 | Lasku 1003 – Nordic Build AB     | income  | 300-eu-goods | 3200.00    | 0       |
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
> **Ten variables were added** on `:root` and `.dark`, because the theme has no
> equivalent and its nearest colours already mean something else — `--primary` is
> the call-to-action fill and `--destructive` means "error", not "expense":
>
> | variable                                          | use                                                              |
> | ------------------------------------------------- | ---------------------------------------------------------------- |
> | `--income` / `--income-subtle`                    | income amounts, the Tulo segment, row edge, income bars          |
> | `--expense` / `--expense-subtle`                  | expense amounts, the Kulu segment, row edge, expense bars        |
> | `--paper` / `--paper-foreground` / `--paper-edge` | the receipt motif: the entry dialog preview and the landing hero |
> | `--sheet` / `--sheet-edge`                        | the income statement and the landing's CSV sample                |
> | `--warning`                                       | the amber "Tallentamattomia muutoksia" status dot             |
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

Sidebar → shadcn's `Sidebar` (with `Sheet`, `Tooltip` and `hooks/use-mobile.ts`), in `components/app/app-sidebar.tsx`. It was hand-written and the shadcn one deleted while the sidebar was a static panel; §8.2's collapse-to-icons and mobile sheet are exactly the machinery it provides, so it came back — the local edits are the 900 px breakpoint, the `md` row size and the 15 rem width. Language picker → `DropdownMenu`. File menu → `Popover`, not `DropdownMenu`: it holds a year `Select`, and a select inside a menu fights the menu's own keyboard handling. Buttons → `Button` (variants default, outline, ghost, destructive). Segmented controls → `ToggleGroup`. Selects → `Select`. Entry, export and viewer dialogs → `Dialog`. Confirmations → `AlertDialog`. Tables → `Table`, hand-composed (see §2). Pagination → `components/common/table-pagination.tsx` ("Rows per page", "Page 1 of 2", «‹›»). Field errors → `FieldError` from `components/ui/field.tsx` — never a hand-rolled `<p className="text-sm text-destructive">`, and never without `aria-invalid` on the field the message is about. Toasts → `components/ui/toast.tsx` (see §2). FAQ → `Accordion`. Checkboxes → `Checkbox`. Inputs → `Input`. Chart → Recharts, used directly in `income-expense-chart.tsx` and `result-widget.tsx`; shadcn's `Chart` wrapper was removed. Use the shadcn/ui skill for component usage.

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
| a form for copying into OmaVero | `tax-form.tsx`: `TaxForm` and `TaxFormStep`, for Form 5 (§8.8) and the VAT return (§8.7) |
| sortable column headers      | `sortable-header.tsx` |
| tabs between sub-pages       | `sub-page-tabs.tsx`, used by Kirjanpito, Asetukset, Tuloslaskelma and ALV-laskelma |
| the income and expense chart | `income-expense-chart.tsx`: `IncomeExpenseChart` and `IncomeExpenseLegend`, on the overview and Yhteenveto |
| single-choice selects        | `option-select.tsx` |
| a key cap on a button or row | `keys.tsx` |
| the "Uusi kirjaus" button    | `new-entry-button.tsx` |
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
    overview/  summary/
    ledger/                      page.tsx = Kirjaukset
      journal/  accounts/  chart/  Päiväkirja, Pääkirja, Tililuettelo (§8.4)
    vat/                         layout.tsx = VatShell; page.tsx = Laskelma
      return/                    /app/vat/return (§8.7)
    statement/                   layout.tsx = StatementShell; page.tsx = Laskelma
      form5/  balance/  assets/  deductions/  Form 5, Varat ja velat, Poistot, Vähennykset (§8.8)
    settings/                    layout.tsx = SettingsShell; page.tsx = Yleiset
      categories/  recurring/    /app/settings/… (§8.10)
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
browser holds is legible without Finnish, whatever language the book is written
out in. The file's own vocabulary — the CSV's columns and words, the receipt
folder — belongs to `exportLang` (§7.1, §7.2) and meets this one only in
`lib/domain/csv.ts` and `lib/domain/csv-header.ts`.

**The two app-level preferences each own a key**, outside the bookkeeping
blob, and each holds a bare value rather than JSON. They belong to the
browser, not to a bookkeeping: the landing page and the 404 need the language
before any file is open, and must not read or write `bookkeeping` to get it.

- localStorage `bookkeeping` — exported as `BOOK_STORAGE_KEY` from
  `stores/book-store.ts`, so nothing hard-codes the string twice:
  `{ entries, cats, year, dirty, fileName, savedAt, lastMode, lastType, open, ledgerSize, ctSize, sidebarOpen, exportLang, vatPeriod, bookStart, vatFiled, yearsArchived, overviewLayout, autosave, recurring, assetOpening, bankBalance }`.
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
  (`version: 3`; the store is now at 9, §4, §5, §6.6, §6.7) moves each into its own key and drops the field,
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
- **Persistent storage is requested** with `navigator.storage.persist()` at the first unsaved change of a page load (`hooks/use-persistent-storage.ts`), so a browser that prompts does so when there is work to protect. Without it the browser may evict storage under disk pressure, and until a save this is the only copy. A refusal changes nothing and is not shown.
- **One tab at a time holds the bookkeeping.** localStorage and IndexedDB are
  shared between tabs while the store is per tab, so a second tab would
  overwrite the first one's entries and its receipt sweep would delete the
  first one's receipts. `AppShell` holds the Web Lock `bookkeeping-app`
  (`lib/browser/tab-lock.ts`) for as long as it is mounted. A second app tab
  shows a notice, runs no sweep and no autosave, and takes over by itself when
  the lock frees, reloading what the first tab stored. The landing page holds
  no lock, so it stays readable, but it refuses to open or start a bookkeeping
  while another tab holds one. Where the browser has no Web Locks the guard is
  simply absent.

`stores/storage.test.ts` covers all of this: the landing-page visit that
stores nothing, the close that keeps the page sizes, and both migrations.

**No migration from the prototype-era names** (`kirjanpito.v1`,
`kirjanpito-tositteet`). A browser still holding them starts empty and the old
data is orphaned; the user re-opens their exported CSV or ZIP. This was a
deliberate choice over writing a one-shot copy step — the exported file is the
real copy of the bookkeeping, and the browser is only a working buffer (§1).

Wrap all storage access in try/catch, and render correctly when storage is empty or unavailable. **A failed write is shown, not swallowed.** Private browsing, blocked site data or a full quota leave the book in memory only, so `useStorageWarning` raises a toast that stays until a write succeeds again, the file menu adds a line under the save status (`StorageNote`), and closing the tab asks even when the book is saved to its file, because a reload would bring back the older book that storage still holds. `test/storage-warning.test.tsx` covers it.

---

## 13. Suggested implementation order

1. Domain modules with no React: types, the chart of accounts and default categories, money and format helpers, `calc`, VAT report, income statement, summary, CSV parse and serialize, path and file-name building, and ZIP pack and unpack. **Unit-test these first** (Vitest), including the reference figures in §10 and comparisons with the Excel's monthly sheets.
2. A store with persistence (localStorage and IndexedDB), the open/dirty/year/language/theme state, and the i18n dictionary.
3. The shell (sidebar, top bar), routing, and the theme and language switches.
4. The ledger with the data table (sort, filter, paginate), the entry dialog, and the confirmation helper.
5. Import and export (CSV and ZIP), the export dialog, and drag and drop.
6. Receipts: attach, IndexedDB storage, thumbnails, the viewer with PDF.js, and garbage collection.
7. The VAT return, income statement (with print), summary, and settings.
8. The landing page.
9. Responsive polish, accessibility, and dark-mode check.

### Acceptance checklist

- [ ] The §10 fixture gives the figures in §10.
- [ ] Exporting and importing back reproduces the same entries **in either export language** (including custom categories, the `mode` column and a net entry's amount).
- [ ] An English export writes English words and Finnish numbers, dates and delimiter, so it still opens in a European Excel.
- [ ] Exporting a ZIP with receipts and importing it back restores them under the same names, and a second export reproduces the same paths. A plain CSV import keeps their paths as missing.
- [ ] Changing the export language on a book whose receipts are not in this browser still carries every receipt into the new file, with no "receipts lost" prompt.
- [ ] A file the app does not understand is refused in a dialog that says why; a column it does not know is named in the import toast.
- [ ] On Chrome, a file opened through the picker saves back to itself, survives a reload, and asks before overwriting a file edited elsewhere (§7.5). On Firefox and Safari the save row is absent and nothing else changes.
- [ ] Every confirmation in §8.11 appears in the right situations, and only then.
- [ ] No `window.confirm` / `alert` anywhere.
- [ ] Currency is shown in Finnish format in both languages.
- [ ] Light, dark and system themes all work. Layouts work at 390 px, 900 px and desktop widths.
- [ ] None of the Excel bugs in §3 are reproduced.

## 14. Open questions and ideas not yet done

- A trader type setting. The app treats every user as an ammatinharjoittaja on the payment basis (§6.3). A liikkeenharjoittaja has to adjust single-entry books to accrual basis for tax, so their result is wrong when a payment crosses a year-end or an entry is open at one. The setting would choose between `taxBasisEntries` and the entries' own dates, go in `settings.json`, and need help for a user who does not know which kind they are.
- Undo for edits. Deleting can be undone (§8.11); changing an entry cannot, though the change log shows the old values. Autosave (§7.5) makes a mistake reach the file within seconds, which is why it is opt-in.
- Filing through Ilmoitin.fi, at least for the VAT return. Not before the user asks for it (§8.8).
- Form 5 fields the app does not work out: 338 and 347, the deductible parts of depreciation (337) and interest (346), which it fills with the full amounts (§8.8); co-operative surplus (325–328); and the additional deductions of 364, which come from fields 388 and 392 elsewhere on the return.
- The VAT return of a business that stops trading (§6.5).
- Asset classes other than machinery and equipment, and templates repeating less often than monthly.
- VAT return fields the book cannot fill (§8.7): imports and domestic reverse-charge purchases.
- Whether a VAT payment or refund booked on account 2939 (§6.6) is what an accountant would expect in a single-entry book, and whether 2939 should be another number. The same goes for the owner's transfers on 2000 (§6.7).

### Legal gaps

Compared on 3 November 2026 against the Accounting Act as consolidated on Finlex (KPL), Vero's guidance and Verohallinto's 2026 data file specification for Form 5.

What the sources settle:

- **Who keeps what (KPL 1:1a).** A sole trader of either kind must be able to determine accounts payable and receivable at all times. Single-entry books are allowed while at most one of three limits is exceeded in both the closed year and the one before: balance sheet 100 000 €, turnover 200 000 €, more than 3 employees on average. Financial statements are required only when at least two of the micro limits of KPL 1:4b are exceeded in both years: 450 000 €, 900 000 €, 10 employees. They then follow the micro rules, within 4 months (3:6), dated and signed (3:7).
- **Income timing (EVL 27 a §, vero.fi, "Yritystoiminta, tulonhankkimistoiminta ja harrastustoiminta henkilöverotuksessa").** An ammatinharjoittaja with single-entry books is taxed on a cash basis: income and expenses belong to the year of payment. A liikkeenharjoittaja may keep single-entry books but must adjust them to accrual basis for tax, which the app leaves to the user for now (§6.3). KPL 2:3 allows the accrual, invoice and payment bases in the books themselves.
- **Changing what is recorded (KPL 2:7).** The content of a voucher or a book may not be changed or deleted after the financial statements are prepared, or after a periodic return to an authority has been made from the books. That includes the VAT return. The form may change for handling or storage, if the content and the audit trail survive.
- **Timing of entries (KPL 2:4).** Cash payments are recorded without delay, in date order. Others may be monthly, and in time for returns to be made from up-to-date books. The Act sets no four-month limit for a sole trader. The book does not say which sales were cash, so the app does not check this, and a new entry in a filed period gets the warning of §8.11.
- **Lists (KPL 2:2, 2:7a, 2:10).** An account list that explains each account's content, for each financial year, and a list of the books and voucher types showing how they connect and how they are kept. Both for 10 years.
- **Private use (AVL 21 §, Vero's guidance of 17.3.2020).** Goods whose VAT was deducted carry VAT when taken into private use, on the purchase price or a lower probable selling price. For a natural person the first 850 € a year is free. This guidance predates 2021, so confirm the figure.
- **EC Sales List (vero.fi).** Monthly, only for a month with such sales, due on the 20th of the next month or the next working day. It lists each buyer's VAT number and total. Goods go by the invoice's month and services by the month of the supply or payment.
- **Form 5's balance (specification 2026).** 704 machinery and equipment, 708 goods, 709 other current assets, 711 accounts receivable, 714 cash in hand, 716 other financial assets, 718 total assets. 749 current and 750 non-current liabilities, 725 total. 733 or 734 net worth. 394 wages paid in the 12 months before the year's end. **Bank deposits are in none of these.**
- **Payroll.** Line 335 takes wages, but the app has no payroll records or income register reporting, and says so in the entry dialog and on Lomake 5. Building them is not planned.

Questions for an accountant. Building proceeds on the answer given:

- Does `Entry.date` as the delivery or invoice date, with a separate payment date, satisfy both kinds of trader? Assumed yes.
- Is a per-voucher change history with locked periods enough for KPL 2:6 and 2:7 in a file the user controls, given that a deletion has no view in the app? Assumed yes, and the landing page says the log is a record of use and not proof.
- Are accounts 2939 and 2000, and a loan account, what a single-entry book should use? Assumed acceptable as the app's own numbers.

What the app still leaves to the user is listed above each topic. No known legal gap remains open beyond the questions above, a liikkeenharjoittaja's accrual basis and the Form 5 fields at the top of this section. KPL 2:7 follows the return a voucher went on, while a Form 5 mark locks by the entry's date, so an ammatinharjoittaja's December invoice paid in January locks with the year it is dated in, though it is reported a year later.
