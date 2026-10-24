# Kirjanpito: project context for Claude Code

This file explains what the app is, what has been decided and built so far, and how to carry it into the real project. The prototype was built as a single HTML file (the "artifact"), which is provided alongside this file together with the original Excel workbook `docs/reference/kirjanpito.xlsx`. The artifact is the reference implementation for behaviour, texts and design. This file is the reference for intent and rules. If they disagree, ask the user.

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
  - `papaparse` for CSV parsing, plus `zod` for row validation. The prototype has a hand-written parser; its behaviour is described in §7.
  - `jszip` for ZIP import and export.
  - `pdfjs-dist` for rendering PDFs. **The worker is copied to `public/pdf.worker.min.mjs` by `scripts/copy-pdf-worker.mjs` on `predev`/`prebuild`, and `workerSrc` points at that fixed URL.** The `new URL(..., import.meta.url)` form was rejected: the worker is an ES module bundle, and whether Turbopack copies it as an asset or pulls it into the module graph differs between the dev server and the export — a failure that would surface only in production. pdfjs is still imported dynamically, from `lib/browser/pdf.ts` alone.
  - `idb` or `idb-keyval` for IndexedDB.
  - `next-themes` for light, dark and system theme (the standard shadcn approach).
  - `@tanstack/react-table` for the sortable, filterable, paginated tables (the shadcn data-table pattern).
  - `sonner` for toasts (shadcn's toast).
  - State: a small store such as Zustand with a persistence layer, or React context plus `useReducer`. Keep the domain logic (calculations, CSV, paths) in plain TypeScript modules with no React, so it can be unit-tested.
- Money is always stored as **integer cents**, never floats.

### Things in the artifact that exist only because of claude.ai, and should not be ported

- **`window.claude.use("downloads")`.** The artifact saves files through a claude.ai capability. In the real app, use a normal Blob plus an `<a download>` link, or the File System Access API where available.
- **Loading PDF.js and JSZip from cdnjs with script tags**, and running the PDF.js worker on the main thread (`globalThis.pdfjsWorker`). In the real app, import them from npm.
- **Custom in-app confirmation dialogs** replaced `window.confirm()` because claude.ai's sandbox blocks native dialogs. Keep in-app dialogs anyway (shadcn `AlertDialog`), since they're better UX and translatable. Never use `window.confirm`.
- The **single-file, hand-rendered HTML** structure. Rebuild it as proper React components.

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

```ts
type EntryType = "tulo" | "kulu";          // income | expense
type AmountMode = "brutto" | "netto";      // amount includes VAT | excludes VAT

interface Entry {
  id: string;
  pvm: string;            // ISO date "YYYY-MM-DD"
  selite: string;         // description
  tyyppi: EntryType;
  catId: string;          // Category.id
  summa: number;          // integer cents, as entered (gross or net depending on syotto)
  alv: number;            // VAT rate in percent, e.g. 25.5
  syotto: AmountMode;     // stored per entry (the Excel had one switch per month)
  atts?: Attachment[];    // receipts, may be several
}
```

### Attachment (tosite)

```ts
interface Attachment {
  id: string | null;      // IndexedDB key, null if the file is missing
  name: string;           // display / original file name
  type: string;           // MIME type
  size: number;           // bytes
  missing?: true;         // listed in the CSV but the file wasn't available on import
  path?: string;          // original path from the CSV, kept for missing files
}
```

### Category (luokka)

```ts
interface Category {
  id: string;             // e.g. "300-suomi", "333", "344-matka", or "c-<uid>" for custom
  line: string;           // key of the income statement line it belongs to (see §5)
  nimi: string;           // Finnish name (custom categories: the user's name)
  alv: number;            // default VAT %
  kind?: "kotimaa" | "eu" | "muutmaat" | "kaanteinen"; // for income categories
  on: boolean;            // enabled = shown in the entry dialog's dropdown
  custom: boolean;        // user-created
}
```

**Design decision:** the VAT rate is **separate from the category**. Instead of one category per rate (as in the Excel), each category has a default rate that pre-fills the entry's VAT % field, and the user can change it per entry. Default categories show English names from a translation map when the UI language is English. Custom categories always show the user's name.

### Calculation per entry

```
rate = entry.alv
if syotto == "netto":  net = summa; vat = round(net * rate / 100);           gross = net + vat
else (brutto):         gross = summa; vat = round(gross * rate / (100 + rate)); net = gross - vat
```

All in cents with `Math.round`.

---

## 5. Chart of accounts (income statement lines)

Each line has a key, an account number (tili), a side, Finnish and English names, an optional group heading, a default VAT %, a summary bucket (expenses only), and a non-deductible flag.

| key | tili | side | Finnish | English | group (fi / en) | default VAT | bucket |
|---|---|---|---|---|---|---|---|
| 300 | 300 | tulo | Tuotot ammatista | Business revenue | – | (see sales categories) | – |
| 301 | 301 | tulo | Muut tuotot | Other revenue | – | 0 | – |
| 312 | 312 | tulo | Varausten vähennys | Decrease in provisions | Varausten vähennys / Decrease in provisions | 0 | – |
| 313 | 313 | tulo | Auton yksityiskäyttö | Private use of car | Yksityiskäyttö / Private use | 0 | – |
| 314 | 314 | tulo | Tavaroiden yksityiskäyttö | Private use of goods | Yksityiskäyttö / Private use | 0 | – |
| 315 | 315 | tulo | Muu yksityiskäyttö | Other private use | Yksityiskäyttö / Private use | 0 | – |
| 317 | 317 | tulo | Tuloslaskelman verovapaat tuotot | Tax-exempt income | Muut tuotot / Other income | 0 | – |
| 318 | 318 | tulo | Saadut avustukset ja tuet | Grants and subsidies received | Muut tuotot / Other income | 0 | – |
| 319 | 319 | tulo | Saadut osingot | Dividends received | Muut tuotot / Other income | 0 | – |
| 323 | 323 | tulo | Korkotuotot ja muut rahoitustuotot | Interest and other financial income | Muut tuotot / Other income | 0 | – |
| 324 | 324 | tulo | Muut veronalaiset tuotot | Other taxable income | Muut tuotot / Other income | 0 | – |
| 333 | 333 | kulu | Ostot ja varastojen muutokset | Purchases and change in inventory | – | 25.5 | ostot |
| 334 | 334 | kulu | Ulkopuoliset palvelut | External services | – | 25.5 | ostot |
| 335 | 335 | kulu | Palkat ja palkkiot | Wages and fees | Henkilöstökulut / Personnel expenses | 0 | henk |
| 336 | 336 | kulu | Eläke- ja henkilösivukulut | Pension and other personnel costs | Henkilöstökulut / Personnel expenses | 0 | henk |
| 337 | 337 | kulu | Poistot | Depreciation | Poistot, edustuskulut ja vuokrat / Depreciation, entertainment and rent | 0 | poist |
| 341 | 341 | kulu | Edustuskulut | Entertainment expenses | (same) | 0 | poist |
| 343 | 343 | kulu | Vuokrat | Rent | (same) | 25.5 | poist |
| 344-matka | 344 | kulu | Matkakulut | Travel expenses | Muut vähennyskelpoiset kulut / Other deductible expenses | 25.5 | muut |
| 344-ajo | 344 | kulu | Ajoneuvokulut | Vehicle expenses | (same) | 25.5 | muut |
| 344-kokous | 344 | kulu | Kokous- ja neuvottelukulut | Meeting expenses | (same) | 25.5 | muut |
| 344-muut | 344 | kulu | Muut vähennyskelpoiset kulut | Other deductible expenses | (same) | 25.5 | muut |
| 354 | 354 | kulu | Kirjanpidon ulkopuoliset vähennyskelpoiset kulut | Deductible expenses outside bookkeeping | (same) | 0 | muut |
| 346 | 346 | kulu | Korkokulut | Interest expenses | Rahoituskulut / Financial expenses | 0 | rah |
| 349 | 349 | kulu | Muut rahoituskulut | Other financial expenses | (same) | 0 | rah |
| 353 | 353 | kulu | Varausten lisäykset | Increase in provisions | Varausten muutokset / Changes in provisions | 0 | var |
| 365 | 365 | kulu | Välittömät verot | Direct taxes | Vähennyskelvottomat kulut / Non-deductible expenses | 0 | vk (non-deductible) |
| 366 | 366 | kulu | Sakot ja muut rangaistusmaksut | Fines and penalties | (same) | 0 | vk (non-deductible) |
| 367 | 367 | kulu | Muut vähennyskelvottomat kulut | Other non-deductible expenses | (same) | 0 | vk (non-deductible) |

The table order is also the display order of the income statement.

**Sales categories on line 300** (income), each its own category:

| id | Finnish | English | default VAT | kind |
|---|---|---|---|---|
| 300-suomi | Myynti – Suomi | Sales – Finland | 25.5 | kotimaa |
| 300-eu | Myynti – EU | Sales – EU | 0 | eu |
| 300-muut | Myynti – muut maat | Sales – other countries | 0 | muutmaat |
| 300-kaant | Myynti – käänteinen verotus | Sales – reverse charge | 0 | kaanteinen |

**Default categories:** the four sales categories, plus one category per remaining line, with `id = line key`, `nimi = Finnish line name`, `alv = line default VAT`, and `kind = "kotimaa"` for income lines.

**Expense summary buckets** (Yhteenveto columns): ostot = Ostot ja ulkopuoliset palvelut, henk = Henkilöstökulut, poist = Poistot, edustuskulut ja vuokrat, muut = Muut vähennyskelpoiset kulut, rah = Rahoituskulut, var = Varausten muutokset, vk = Vähennyskelvottomat kulut.

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
  - Category matching: same account number and side, and the name matches the Finnish name or the English default name (case-insensitive). If no name is given, the first category on that account is used. If there's no match but the account number exists, a **custom category** is created with that name. If the account is unknown, the entry is booked to 301 (income) or 344-muut (expense) with a warning.
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

### 7.3 File naming on export

An export dialog lets the user edit the base name, with a fixed extension shown beside the field (`.csv` or `.zip`). The default is `kirjanpito_{YYYY-MM-DD}` in Finnish or `accounting_{YYYY-MM-DD}` in English, using **today's date**. Characters `\ / : * ? " < > |` and control characters are stripped, and a trailing `.csv` is removed. An empty name falls back to the default. The last opened or exported name is shown in the sidebar, but it is **not** used as the default.

### 7.4 Receipt files

- Accepted: images (`image/*`, including `.heic`/`.heif`) and PDF. Several per entry.
- Images: if the long edge is ≤ 2000 px, the file is ≤ 1.5 MB and the type is JPEG/PNG/WebP, the original is kept. Otherwise it is redrawn onto a white canvas with the long edge at 2000 px and saved as JPEG at quality 0.85, with the extension renamed to `.jpg`. If the browser can't decode it (e.g. HEIC outside Safari), the original is kept and the preview shows the file name instead.
- PDFs are stored as they are.
- Stored in IndexedDB (prototype: database `kirjanpito-tositteet`, object store `files`, key = attachment id, value = Blob).
- **Garbage collection:** after saving or deleting entries, closing the file, importing, loading the demo, or closing the entry dialog, delete IndexedDB files that no entry (and no open dialog) references. Revoke object URLs of removed thumbnails.

---

## 8. App structure and features

### 8.1 States and routes

- An **open/closed** flag: whether a bookkeeping is open. It is persisted. On load, if it isn't stored, it is true when entries exist.
- When **no bookkeeping is open**, every route shows the **landing page**.
- Views (the prototype uses hash routes, which should become Next.js routes): landing (`etusivu`), ledger (`kirjanpito`), VAT return (`alv`), income statement (`tulos`), summary (`yhteenveto`), settings (`asetukset`). The old `kirjaukset` route redirects to the ledger.
- The app logo / brand links to the landing page.
- Persisted UI preferences: language, theme, selected year, last amount mode and type used in the entry dialog, and rows per page for each table.

### 8.2 Shell (desktop sidebar, mobile top bar)

- **Sidebar (≥ 900 px wide), top to bottom:**
  - Brand: a "K" mark, "Kirjanpito", and the subtitle "Toiminimen yhdenkertainen kirjanpito".
  - A financial year selector, offering the years found in the data plus the current year and the selected year.
  - Navigation with icons: Kirjanpito, ALV-laskelma, Tuloslaskelma, Yhteenveto, Asetukset.
  - At the bottom: a FI | EN toggle and a theme toggle (system / light / dark, as icons), then the **file box**. The file box shows the file name (or "Uusi kirjanpito"), a **"Sulje" (close file)** button, a status dot with text (yellow "Muutoksia, joita ei ole viety" / green "Kaikki muutokset viety"), and "Avaa" / "Vie" buttons. The "Vie" button is highlighted while there are unexported changes.
- **Mobile top bar (< 900 px):** the logo (links home), the name (truncates first), the year selector, a language toggle button (shows the other language), a theme cycle button, open, close (only when a file is open) and export. Below these, horizontally scrollable navigation tabs.
- **Drag and drop anywhere:**
  - Dropping a CSV or ZIP opens it. A full-screen overlay says "Pudota CSV- tai ZIP-tiedosto avataksesi sen".
  - While the entry dialog is open, dropped images and PDFs are attached to it instead, and the dialog gets a dashed outline.
  - Dropping media while no dialog is open shows a hint to open an entry first.

### 8.3 Landing page

A full-width page with no sidebar. It has its own nav: logo, FI/EN, theme, and "Avaa tiedosto" (or "Avaa kirjanpito" when a bookkeeping is open). Sections:

1. **Hero.**
   - Headline "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon." and a lead paragraph.
   - Calls to action:
     - Closed state: "Aloita uusi kirjanpito", "Avaa tiedosto" and "Kokeile esimerkillä", plus a dashed drop zone ("Pudota CSV- tai ZIP-tiedosto tähän…").
     - Open state: "Jatka kirjanpitoa" and "Avaa tiedosto", with a meta line showing the file name, the number of entries and the unexported-changes status.
   - Visual: two overlapping, slightly rotated paper receipts on a soft accent panel. One is an expense receipt, the other the October VAT calculation ending in "Maksettava 617,18 €". On small screens only the VAT receipt is shown.
2. **"Tositteesta veroilmoitukseen neljässä vaiheessa".** Four numbered steps: open or start, record receipts (including attaching), check the figures, export (a ZIP organised by year and month).
3. **"Mitä kirjanpito laskee puolestasi".** Three cards: VAT (with rate chips), income statement (a mini statement), and monthly summary (a mini bar chart).
4. **"Ei tiliä, ei tietokantaa".** A privacy explanation next to a CSV sample block.
5. **"Kysyttyä".** An accordion with four questions: who it's for, whether it files returns, moving over from Excel (lists the columns; `tosite` is optional), and what happens when the browser is closed.
6. A closing call to action, "Aloita tämän kuun tositteista.", and a footer disclaimer: "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa."

- "Aloita uusi kirjanpito" opens an empty ledger and sets the year to the current year. If there are unexported changes, it asks first.
- "Kokeile esimerkillä" loads the demo data (§10), asking first if there are unexported changes.

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
  - Type as a segmented control (Tulo / Kulu, coloured green and red when selected).
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
- **Validation:** a valid date, a non-zero amount and a chosen category are required. Error texts: "Anna päivämäärä.", "Anna summa, esim. 124,50.", "Valitse luokka."
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

Presented as a printable **paper sheet**: warm paper background, a thin border, and a soft shadow. It has the title, the period, sections with totals, greyed group headings, lines with muted account numbers, and a double-ruled result line. A "Tulosta" button calls `window.print()`, and the print styles hide the chrome.

### 8.9 Summary (Yhteenveto)

See §6.4. Wide tables scroll horizontally with a sticky first column.

### 8.10 Settings (Asetukset)

- **"Lisää oma luokka" form:**
  - Type (Kulu / Tulo).
  - Income statement line, filtered by type.
  - Name (required).
  - Default VAT % (validated as 0 ≤ x < 100).
  - "Lisää" button.
  - New income categories get `kind: "kotimaa"`.
  - The typed values survive re-renders. Leaving the page with a typed but unadded name asks first.
- **Categories table:**
  - Search, a type filter, and a count.
  - Sortable columns: Käytössä (checkbox), Tyyppi (badge), Tili, Nimi, and Oletus ALV % (an inline input that commits on change and shows a toast).
  - Delete is only offered for custom categories that no entry uses.
  - Pagination with a default of 25 rows.
- **Data:**
  - "Palauta oletusluokat" restores the defaults and keeps custom categories that are in use.
  - "Tyhjennä kirjaukset" deletes all entries (with a confirmation) and leaves the bookkeeping open but empty.

### 8.11 Confirmations and unsaved-change rules (apply everywhere)

Use one shared `AlertDialog`-based `confirm()` helper, with a title, a message, a destructive confirm button (red) and a cancel button. The cancel button can be relabelled, e.g. "Jatka muokkausta", and gets focus by default. Cases:

| Trigger | Condition | Title / confirm label |
|---|---|---|
| Close file ("Sulje") | unexported changes | "Suljetaanko tiedosto?" / "Sulje viemättä" |
| Start new bookkeeping | unexported changes | same as above |
| Open a file / load the demo over the current one | unexported changes | "Korvataanko avoin kirjanpito?" / "Korvaa" |
| Delete an entry (row or dialog) | always | "Poistetaanko kirjaus?" / "Poista" |
| Clear all entries | always | "Tyhjennetäänkö kirjaukset?" / "Tyhjennä" |
| Close the entry dialog (Peruuta / Esc) | form differs from its snapshot | "Hylätäänkö muutokset?" / "Hylkää muutokset", cancel = "Jatka muokkausta" |
| Navigate away from Settings | the new-category name is filled | same as above, with the category message |
| Browser tab close (`beforeunload`) | any of the above dirty states | the browser's native prompt |

**Dirty bookkeeping** means the entries changed since the last import or export. It is set by any add, edit, delete or demo load, and cleared by a successful export or an import.

Closing a file clears entries, the file name and filters, sets the bookkeeping to closed, garbage-collects receipts, and returns to the landing page.

---

## 9. Internationalisation and formatting

- Two languages: **Finnish (default)** and **English**. The choice is persisted. Update `<html lang>` and the document title when it changes. Every UI string is in a dictionary keyed by id, with `[fi, en]` values and `{param}` interpolation. Plural forms are functions (e.g. "1 kirjaus" / "{n} kirjausta"). The artifact's `L` object holds every string and is the source to port. A typed dictionary is enough; no locale routing is needed.
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

## 10. Demo data ("Kokeile esimerkillä")

Sixteen gross entries for 2026. The file name is empty (so export uses the default name), and the bookkeeping is marked dirty.

| pvm | selite | tyyppi | catId | summa (€) | alv |
|---|---|---|---|---|---|
| 2026-01-08 | Lasku 1001 – Mäkinen Rakennus Oy | tulo | 300-suomi | 2510.00 | 25.5 |
| 2026-01-15 | Osto – K-Rauta – tarvikkeet | kulu | 333 | 186.40 | 25.5 |
| 2026-01-31 | Puhelinliittymä – Elisa | kulu | 344-muut | 29.90 | 25.5 |
| 2026-02-12 | Lasku 1002 – Virtanen | tulo | 300-suomi | 1255.00 | 25.5 |
| 2026-02-20 | Työtilan vuokra, helmikuu | kulu | 343 | 450.00 | 25.5 |
| 2026-03-03 | Lasku 1003 – Nordic Build AB | tulo | 300-eu | 3200.00 | 0 |
| 2026-03-18 | Polttoaine – Neste | kulu | 344-ajo | 92.35 | 25.5 |
| 2026-03-20 | Työtilan vuokra, maaliskuu | kulu | 343 | 450.00 | 25.5 |
| 2026-04-09 | Lounaspalaveri asiakkaan kanssa | kulu | 344-kokous | 48.60 | 13.5 |
| 2026-04-20 | Työtilan vuokra, huhtikuu | kulu | 343 | 450.00 | 25.5 |
| 2026-05-14 | Lasku 1004 – Laaksonen Oy | tulo | 300-kaant | 4800.00 | 0 |
| 2026-06-02 | YEL-maksu | kulu | 336 | 310.00 | 0 |
| 2026-09-22 | Kirjanpito-ohjelma, vuosimaksu | kulu | 344-muut | 119.00 | 25.5 |
| 2026-10-10 | Osto – K-Rauta – Tarvikkeet | kulu | 333 | 100.00 | 25.5 |
| 2026-10-28 | Lasku 1005 – Mäkinen Rakennus Oy | tulo | 300-suomi | 1882.50 | 25.5 |
| 2026-10-30 | Pankin palvelumaksut | kulu | 349 | 8.50 | 0 |

Useful checks against this data (all verified by the unit tests in `lib/domain`):

- **Whole year 2026:** income net 12 500,00 €, expenses net 1 857,47 €, sales VAT 1 147,50 €, purchase VAT 387,28 €, **VAT payable 760,22 €**. Income statement: revenue 12 500,00 €, deductible expenses 1 857,47 €, result **358 = 10 642,53 €**.
- **October 2026:** sales VAT 382,50 € − purchase VAT 20,32 € = **VAT payable 362,18 €**. (Q4 is the same, because November and December are empty.)
- **January 2026:** income net 2 000,00 €, expenses net 172,35 €, VAT payable 466,05 €.

> An earlier version of this section claimed October showed 617,18 € payable from sales VAT 637,50 €. Those two figures are decorative constants in the prototype's landing hero (`docs/prototype/kirjanpito.html` lines 1037 and 1039, `fmt(63750)` / `fmt(61718)`) and do not follow from the demo entries: the only October sale is 1 882,50 € gross at 25,5 %, giving 382,50 € of sales VAT. The hero's numbers are illustration and may stay as they are.

The user also provided two real receipts for testing (a Motonet till receipt as JPG, and a Pleksi invoice as PDF). **Do not bundle them into the demo or commit them**: the invoice contains a person's name, phone number and email address.

---

## 11. Design system

The aim is a calm, Nordic, functional tool. The one bold element is the **paper receipt motif**: the live preview in the entry dialog, the landing hero, and the printed income statement. Everything around it stays quiet. Avoid generic SaaS-card layouts, gradients, all-caps labels and decorative motion.

> **The project's shadcn theme is the source of truth for colours and typography.**
> `app/globals.css` — style `base-nova` on Base UI, neutral greys with an emerald
> `--primary`, `--radius: 0.625rem`, Geist via `next/font/google` — wins over the
> hex table below, which is kept only as a record of the prototype's palette.
> Use the theme's semantic variables (`background`, `card`, `muted`, `primary`,
> `destructive`, `border`, `ring`, `sidebar-*`) and the standard component
> variants. Never hard-code a hex value and never write a manual `dark:` override.
>
> **Seven variables were added** on `:root` and `.dark`, because the theme has no
> equivalent and its nearest colours already mean something else — `--primary` is
> the call-to-action fill and `--destructive` means "error", not "expense":
>
> | variable | use |
> |---|---|
> | `--income` / `--income-subtle` | income amounts, the Tulo segment, row edge, income bars. Hue 148, kept clear of the emerald primary at 165 |
> | `--expense` / `--expense-subtle` | expense amounts, the Kulu segment, row edge, expense bars. Less saturated than `--destructive` |
> | `--paper` / `--paper-foreground` / `--paper-edge` | the receipt motif: the entry dialog preview, the landing hero, the printed income statement |
> | `--warning` | the amber "Muutoksia, joita ei ole viety" status dot |
>
> They are exposed through `@theme inline` as `--color-income`, `--color-expense`
> and so on, so they work as `bg-income`, `text-expense`, `bg-paper`.
> A `.tabular` utility and the `@media print` rules also live in `globals.css`.

### Colour tokens (historical — the prototype's palette, superseded by the theme)

| token | light | dark | use |
|---|---|---|---|
| bg | `#F3F5F4` | `#101513` | page background |
| surface | `#FFFFFF` | `#171D1A` | panels, sidebar, dialogs |
| sunken | `#EAEEEC` | `#1F2724` | segmented controls, chips, viewer stage, receipt column |
| ink | `#17201D` | `#E5EBE8` | text |
| muted | `#5E6B66` | `#9AA7A1` | secondary text |
| faint | `#8A9590` | `#6F7C76` | tertiary, zero values |
| rule | `#D9DFDC` | `#2A3330` | borders |
| rule-strong | `#B9C2BE` | `#3B4642` | input borders |
| accent | `#1D4F91` | `#7FA9E3` | primary buttons, active nav, focus ring |
| accent-ink | `#FFFFFF` | `#0E1A2B` | text on accent |
| accent-soft | `#E3ECF7` | `#1B2A3F` | active nav background, landing hero panel |
| in / in-soft | `#24704A` / `#E1F0E7` | `#6FC296` / `#17301F` | income, positive |
| out / out-soft | `#A63A32` / `#F6E4E2` | `#E8877F` / `#3A1E1B` | expenses, destructive |
| paper / paper-edge | `#FFFDF8` / `#E7E1D4` | `#1E2320` / `#323A36` | receipts, income statement sheet |
| unexported-changes dot | `#C58A1A` | same | file status |

- **Type:** Geist (400–700) for everything, with tabular figures for numbers. Page titles are 26 px / 600 / −0.02 em. The landing headline is `clamp(38px, 5.4vw, 64px)` with tight leading (1.03) and −0.035 em tracking.
- **Radii:** 6 px for inputs and buttons, 10 px for panels, 14 px for dialogs and large cards. Segmented controls and chips are pills.
- **Theme:** a system / light / dark switch, defaulting to system.
- **Responsive breakpoints:** 900 px (sidebar becomes the top bar; dialogs stack) and 560 px (compact table and totals).
- **Accessibility:** visible focus rings, `aria-sort` on sortable headers, `aria-pressed` on toggles, `aria-label` on icon buttons, `prefers-reduced-motion` respected. The only motion is a short pop-in on dialogs.

### Suggested shadcn/ui mapping

Sidebar → `Sidebar`. Buttons → `Button` (variants default, outline, ghost, destructive). Segmented controls → `ToggleGroup`. Selects → `Select`. Entry, export and viewer dialogs → `Dialog`. Confirmations → `AlertDialog`. Tables → `Table` with TanStack Table. Pagination → custom controls in the style of the user's screenshot ("Rows per page", "Page 1 of 2", «‹›»). Toasts → `Sonner`. FAQ → `Accordion`. Checkboxes → `Checkbox`. Inputs → `Input`. Badges → `Badge`. Chart → a simple SVG or Recharts. Use the shadcn/ui skill for component usage.

---

## 11b. SEO and the route structure

The landing pages are public, indexed documents; the bookkeeping app is not.

```
app/
  robots.ts                      → /robots.txt      (disallows /app/)
  sitemap.ts                     → /sitemap.xml     (/ and /en, with alternates)

  (fi)/                          ROOT LAYOUT — <html lang="fi">
    page.tsx                     /                  landing FI, indexed
    opengraph-image.tsx          1200×630 via next/og
    app/
      layout.tsx                 AppShell + metadata.robots = noindex, nofollow
      kirjanpito/  alv/  tulos/  yhteenveto/  asetukset/

  (en)/                          ROOT LAYOUT — <html lang="en">
    en/page.tsx                  /en                landing EN, indexed
    en/opengraph-image.tsx
```

- **Two root layouts**, because only a root layout renders `<html lang>` and each
  indexed document must ship the right one in its static HTML. `/` and `/app/*`
  share the `(fi)` layout, so entering the app is a soft navigation; switching
  landing language is a full reload, which is correct for a document-language
  change.
- **`output: "export"`** with `trailingSlash: true` and `images.unoptimized`.
  `robots.ts`, `sitemap.ts` and both `opengraph-image.tsx` are Route Handlers and
  need `export const dynamic = "force-static"` — without it the build fails.
  `ImageResponse` does emit PNGs under static export; verified in `out/`.
- **Language**: the *document* language is fixed by the route and baked at build
  time; the *UI* language inside the app is the persisted preference. The landing
  never redirects on a stored preference — that would be cloaking-adjacent and
  would break the back button. On a first visit only, the route seeds the
  preference. This is how §9's "no locale routing is needed" coexists with having
  two indexed URLs.
- **The landing bundle must not contain `pdfjs-dist`, `jszip`, `papaparse` or
  `recharts`.** Commands are split into `lib/commands/book-commands.ts` (safe to
  import statically) and `lib/commands/io-commands.ts` (pulled in with
  `await import()` from the landing's file handler). `lib/browser/pdf.ts` is the
  only module importing pdfjs and is always dynamically imported. The build
  verification greps the chunks referenced by `out/index.html`.
- `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL` in `lib/site.ts`, which also holds
  the route constants.

## 12. Persistence keys (prototype)

- localStorage `kirjanpito.v1`: `{ entries, cats, year, dirty, fileName, lastMode, lastType, lang, open, ledgerSize, ctSize }`.
  **`theme` is no longer in this blob.** next-themes owns it under its own key,
  because its pre-paint inline script reads that key before any of our JS runs;
  two sources of truth would drift. A `persist.migrate` step seeds next-themes
  from a prototype-era blob and drops the field.
- IndexedDB `kirjanpito-tositteet`, store `files`: receipt Blobs keyed by attachment id.

Wrap all storage access in try/catch, and render correctly when storage is empty or unavailable.

---

## 13. Suggested implementation order

1. Domain modules with no React: types, the chart of accounts and default categories, money and format helpers, `calc`, VAT report, income statement, summary, CSV parse and serialize, path and slug building, and ZIP pack and unpack. **Unit-test these first** (Vitest), including the demo-data figures in §10 and comparisons with the Excel's monthly sheets.
2. A store with persistence (localStorage and IndexedDB), the open/dirty/year/language/theme state, and the i18n dictionary.
3. The shell (sidebar, mobile top bar), routing, and the theme and language switches.
4. The ledger with the data table (sort, filter, paginate), the entry dialog, and the confirmation helper.
5. Import and export (CSV and ZIP), the export dialog, and drag and drop.
6. Receipts: attach, IndexedDB storage, thumbnails, the viewer with PDF.js, and garbage collection.
7. The VAT return, income statement (with print), summary, and settings.
8. The landing page.
9. Responsive polish, accessibility, and dark-mode check.

### Acceptance checklist

- [ ] The demo data gives the figures in §10.
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
