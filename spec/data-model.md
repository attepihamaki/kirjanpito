# Data model and chart of accounts

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

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

### Entry (tosite)

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
  periodFrom?: string // first day the cost or income covers; with periodTo, spread over the years for a liikkeenharjoittaja (§6.3)
  periodTo?: string // last day it covers
  cash?: true // paid in cash (§8.5)
  buyerVatId?: string // the buyer's VAT number on an EU sale (§8.7)
  euPurchase?: "goods" | "services" // a copy of its category's, for `calcEntry` (§6.9)
  split?: string // links the parts of one receipt split across categories or rates
  share?: number // business share in whole percent, 1 to 99; absent means all of it (§6.12)
  reverses?: string // id of the entry this refund, credit note or correction reverses; a reference only (§8.4)
  sells?: string // id of the asset purchase this sale of machinery or equipment disposes of; a reference for the asset list only (§8.8)
}
```

### Voucher numbers (tositenumero)

The Accounting Act has every entry rest on a dated voucher that is "järjestelmällisesti numeroitu tai vastaavalla tavalla yksilöity" (KPL 2:5, checked on Finlex). An entry here is its own voucher, so it carries the number. `lib/domain/voucher.ts` owns the rule:

- One series per financial year, starting at 1. A new entry takes the year's highest number plus one.
- An entry keeps its number while it stays in its year (`keepVoucher`). Moved to another year, it takes the next number there. Nothing renumbers by itself to close a gap, so a deleted entry leaves one, unless it was the newest.
- **Renumbering is the user's own action** (`renumberYear`, `renumberVouchers` in `book-commands.ts`). Asetukset, Yleiset, Tositenumerot numbers the selected year from 1 in date order, and entries of one date stay in their current order. It asks first and can be undone from the toast for 10 seconds. It refuses a year with any locked entry (§8.11), since the numbers are then on record.
- `assignVouchers` numbers whatever has no number, or a number another entry of its year already holds, in date order after the year's highest. The store runs it on every add, on opening a file and on restoring deleted entries, which go first so they keep theirs. `persist.migrate` (version 4) numbers a book stored before this existed.
- In the UI the field is "Tositenumero" / "Voucher number", and the ledger column is "Nro". "Tosite" on its own is the entry itself, and the file attached to it is a "liite" (§9).

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
  euPurchase?: "goods" | "services" // for expense categories bought from another EU country (§6.9)
  share?: number // default business share for new entries (§6.12)
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
| 327         | 327  | income  | Ylijäämät muista kuin julkisesti noteeratuista osuuskunnista | Surplus from non-listed co-operatives | Muut tuotot / Other income | 0 | – |
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
| 364-travel  | 364  | expense | Lisävähennys tilapäisistä työmatkoista | Additional deduction for temporary business trips | Muut vähennyskelpoiset kulut / Other deductible expenses | 0 | otherDeductible |
| 364-car     | 364  | expense | Lisävähennys yksityisauton käytöstä | Additional deduction for use of a private car | (same) | 0 | otherDeductible |
| 346         | 346  | expense | Korkokulut                                       | Interest expenses                       | Rahoituskulut / Financial expenses                                      | 0                      | financial       |
| 349         | 349  | expense | Muut rahoituskulut | Other financial costs | (same) | 0 | financial |
| 353         | 353  | expense | Varausten lisäykset | Increases to reserves | Varausten muutokset / Changes in reserves | 0 | provisions |
| 365         | 365  | expense | Ennakkoverot ja muut välittömät verot | Advance tax and other direct taxes | Vähennyskelvottomat kulut / Non-deductible expenses | 0 | nondeductible |
| 366         | 366  | expense | Sakot ja muut rangaistusmaksut | Fines and other penalty fees | (same) | 0 | nondeductible |
| 367         | 367  | expense | Muut vähennyskelvottomat kulut                   | Other non-deductible expenses           | (same)                                                                  | 0                      | nondeductible   |

The names are the form's, in Finnish and in Verohallinto's English, and a category keeps its short name. The Form 5 view prints the specification's own Finnish label for each code (`form5-spec.ts`, §6.10). 365 is the one exception: the chart adds "Ennakkoverot" so a user finds it, and Form 5's view keeps the form's "Välittömät verot". On the statement a line under a group heading is indented, so 337 to 343, which have no group, do not read as part of Henkilöstökulut. A renamed default keeps its old name in `FORMER_NAMES`, so an older file still finds its category, and `persist.migrate` gives a stored list the new names.

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

**Fixed assets are off the statement.** `CAPITAL_LINES` holds two more lines, both on account 1100: `asset-purchase` "Koneiden ja kaluston hankinta" (expense) and `asset-sale` "Koneiden ja kaluston myynti" (income), each at 25,5 %. Their VAT goes on the VAT return like any other entry's, but they are neither income nor an expense: the income statement, Form 5, the summary and the ledger's totals cards all leave them out, and the journal's totals too, though its rows and the general ledger list them. The cost reaches the result as depreciation (§8.8). `LINES` stays the statement's 33 lines, and `ALL_LINES` is what a category can sit on. Custom categories cannot be added to these two.

**VAT payments and refunds are off the statement too.** `SETTLEMENT_LINES` holds `vat-payment` "Arvonlisäveron maksu" (expense) and `vat-refund` "Arvonlisäveron palautus" (income), both on account 2939 at 0 %. Single-entry books have no balance sheet, so 2939 is the app's own number for the CSV's `account` column; it is not one Form 5 asks for and was not checked against a published chart. `AccountLine.settlement` marks them, and `offStatement` is the one test for "capital or settlement" that the statement, the summary, the journal's totals and the ledger's totals cards use. The VAT report skips settlement lines whatever their rate (§6.6).

**So are the owner's own transfers.** `OWNER_LINES` holds `owner-withdrawal` "Yksityisotto" (expense) and `owner-investment` "Yksityissijoitus" (income), both on account 2000 at 0 %. Like 2939, 2000 is the app's own number and was not checked against a published chart. `AccountLine.owner` marks them, `offStatement` covers them, and the VAT report skips them like settlements (§6.7). `ALL_LINES` is the 30 statement lines and these, with the loan lines of §6.8.

**EU purchases have categories of their own**, the counterpart of the EU sales (§6.9):

| id                | line           | Finnish                                     | English                                  | euPurchase |
| ----------------- | -------------- | ------------------------------------------- | ---------------------------------------- | ---------- |
| 333-eu-goods      | 333            | Ostot ja varastojen muutokset – EU                         | Purchases and changes in inventory – EU                    | goods      |
| 334-eu-services   | 334            | Ulkopuoliset palvelut – EU                  | External services – EU                   | services   |
| 344-eu-services   | 344-other      | Muut vähennyskelpoiset kulut – EU, palvelut | Other deductible expenses – EU, services | services   |
| asset-purchase-eu | asset-purchase | Koneiden ja kaluston hankinta – EU          | Purchase of machinery and equipment – EU | goods      |

Three more sit on the same lines, for purchases whose tax the buyer reports without an EU seller (§6.9): `333-import` "Ostot ja varastojen muutokset – maahantuonti" (import), `333-reverse` "… – metalliromu" (reverse) and `334-reverse` "Ulkopuoliset palvelut – rakentaminen" (reverse). All start at 25,5 %. They come last in the list, so a CSV row with no category name still finds its line's own category. The dropdowns and the settings table list a line's own category before its EU one (`compareCategories`), whatever the names.

**Default categories:** the six sales categories, the four EU purchases, plus one category per remaining line, with `id = line key`, `name = Finnish line name`, `vatRate = line default VAT`, and `kind = "domestic"` for income lines.

**Expense summary buckets** (Yhteenveto columns): `purchases` = Ostot ja ulkopuoliset palvelut, `personnel` = Henkilöstökulut, `depreciation` = Tilat, poistot ja edustus, `otherDeductible` = Muut vähennyskelpoiset kulut, `financial` = Rahoituskulut, `provisions` = Varausten muutokset, `nondeductible` = Vähennyskelvottomat kulut.

**VAT rates offered** in the entry dialog: 25.5, 24, 14, 13.5, 10, 0, plus the entry's own rate if it differs. Background: the general rate rose to 25.5 % on 1 September 2024, and the 14 % rate was lowered to 13.5 % at the start of 2026. Older rates are kept for older entries and corrections.

**The rate follows the entry's date.** `data/rules.json` holds the two changes (§6.11), 24 % → 25,5 % on 1.9.2024 and 14 % → 13,5 % on 1.1.2026, both confirmed on vero.fi. `rateOnDate` maps a rate to the one in force on a date; `rateMismatch` says why a rate does not fit. What decides the rate is when the tax falls due, normally the delivery date, so the entry's date is a stand-in: a mismatch is a hint and never blocks saving, because corrections and credit notes can carry an older rate on purpose. See §8.5 for the dialog, §8.4 for the ledger filter and §8.12 for the checklist.
