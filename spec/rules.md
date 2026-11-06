# Calculation rules

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

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
- **A loss (359) carries forward, but the app does not track it.** Verohallinto confirms the loss in the assessment, and it is deducted from business income over the next 10 years, oldest first. The statement (`statement.lossNote`) and the overview's Tulos widget (`overview.lossCarry`) say so under a 359 result. No confirmed-loss balance is stored and field 373 is left empty, since both depend on the assessment and the user's other income.
- Every line is shown even when zero (greyed out with "–"). Section headings carry the section totals.
- The period is 1.1.–31.12. of the selected year. All amounts exclude VAT.
- These rules were checked against Verohallinto's Form 5 instructions (vero.fi, "Instructions for filing", Form 5): tax-exempt income is not part of taxable revenue, 354 is deductible, and 365–367 may not be deducted.
- **Dividends count only their taxable share.** Form 5 splits them into listed companies (319, taxable portion in 320) and others (321, taxable portion in 322), and its taxable income (316) adds only 320 and 322. In a sole trader's business income source, 85 % of a listed company's dividend is taxable and 75 % of any other (vero.fi, Osinkotulojen verotus, 2.4; EVL 6 a § 6 mom.). `AccountLine.taxableShare` holds the percentage, and the share is rounded to the cent. The sheet lists both lines in full and says what was counted in a note.
- **Co-operative surplus counts its taxable part.** Form 5 asks for the surplus from non-listed co-operatives as 327 and its taxable part as 328, which its check rules keep at 25 % of 327 or more (specification 2026). In the business income source 25 % of the first 5 000 € is taxable and 75 % of the rest (vero.fi, "Osuuskuntien ylijäämien verotus"). The relief is one per person per year and is applied to business income last, so a user who used it elsewhere changes 328 in OmaVero, and a note says so. The part is rounded up, so 328 never falls under a quarter of 327 by a fraction of a cent. Surplus from listed co-operatives (325, 326) is left out: the specification itself says none existed in 2026.
- **Depreciation counts up to the register's maximum.** `StatementOptions.depreciationMax` holds each year's maximum from the asset register (§8.8), and line 337 counts at most that, which is Form 5's 338. A year with no register, meaning no purchase and no opening balance, is not capped. The excess is shown in a note under the statement and is not deducted. Every view that reports a result passes the same options (`useStatementOptions`), so the overview, the summary and the statement agree.
- **Every line has a `counted` part**, the amount that enters the result: the taxable part of an income line, the deductible part of an expense line. Revenue (316) and deductible expenses (355) are sums of it; the section headings are sums of the lines in full (`incomeTotal`, `expenseTotal`).

- **An amount belongs to the year it was paid** (`lib/domain/open-items.ts`). `Entry.date` is the delivery or invoice date, and `Entry.paidOn` the payment date when that differs, or null while the entry is open. An ammatinharjoittaja with single-entry books is taxed on payment (EVL 27 a §). A liikkeenharjoittaja has to adjust to accrual basis. `traderType` (`professional` by default, or `business`; Asetukset, Yleiset and the setup dialog, saved in `settings.json`) picks which. For `professional`, `taxBasisEntries` moves each entry to its payment date and leaves out an open one. For `business` it returns the entries as they are, so each counts in the year of its own date, paid or open. The ledger reconciliation of §8.4 is then empty, a paid-in-another-year entry no longer locks with that year's Form 5 (`entryLock`), and the statement's note names the accrual basis. The payment date still drives receivables, payables, the bank estimate and the wages of 394. The setting does not check which kind a user is, and the hint tells them to ask Verohallinto or an accountant. The income statement, Form 5, the summary and the overview's result all read the entries this way, and the VAT views never do, since the return goes by `date`. A note under the statement names the basis and gives the year-end receivables and payables.
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
- **The tax return does not ask for it** in a single-entry book. Form 5's withdrawals and investments, and the equity at the start and end of the year, are asked only of a business keeping double-entry books (vero.fi, "Veroilmoituksen täyttöohje", Taustatiedot). The paper form says the same under section 13, "Oman pääoman erittely": fill it only with double-entry books. Its row "Yksityisnostot ja -sijoitukset" is field 741, one signed net figure, which the specification ties to the double-entry flag 916 (743 = 748 + 741 + 742). Fields 384 and 385, "Rahan nostot" and "Sijoitukset rahana kalenterivuonna", are a separate optional pair under "Rahan nostot ja sijoitukset kirjanpidon mukaan". No check rule in the specification mentions them. The app leaves all of 384, 385 and 741 empty on purpose.
- Goods or a car taken into private use are not this: they are income on 313 to 315.

---

### 6.8 Loans

`loan-drawdown` "Lainan nosto" and `loan-repayment` "Lainan lyhennys", on account 2600 at 0 %. KPL 2:1 has the books record financing transactions, and a loan is neither income nor an expense, so `offStatement` covers both and the VAT report skips them. Interest stays an expense on 346. 2600 is the app's own number, like 2939 and 2000. They move the bank estimate, and they are left out of the "unusually large amount" check. `ALL_LINES` is the 30 statement lines and eight off-statement ones.

### 6.9 Purchases from other EU countries

A seller in another EU country invoices a VAT-registered buyer without VAT, and the buyer reports the tax (vero.fi, "Ilmoituksen täyttöohje"). **The category says so**, as it does for an EU sale: `Category.euPurchase` is `goods` or `services`, on the four defaults of §5 or on a custom category. The purchase categories sit on several lines rather than on one like the sales, because Form 5 has no single line for purchases, and a custom category with "Osto muusta EU-maasta" set (§8.10) covers any other line.

- **`Entry.euPurchase` is a copy of the category's**, because `calcEntry` works from the entry alone and is called everywhere. `syncEuPurchase` keeps the two equal on every add, edit and opened file (`lib/domain/eu-purchase-category.ts`), and the category wins.
- **An entry marked on a category that does not say so moves** to an EU category on the same line (`moveEuPurchasesToCategories`), when a file opens and in `persist.migrate` (version 10). A stored book or an older file can hold these. A default category moves to the default on its line if there is one. Otherwise a custom category "{name} – EU, palvelut" or "– EU, tavarat" is made. Only the category changes, so the Form 5 line, the return and a filed period stay as they were, and the change log records nothing.

- **`amount` is what the invoice says and what was paid.** `calcEntry` gives it no VAT, so the statement, the ledger, the bank estimate and open items all read it as they should. `amountMode` is always `net`. `vatRate` is only the rate the tax is reported at, and `euPurchaseVat` works that tax out.
- **On the return**, goods fill 313 and 305, services 314 and 306, and the deductible tax joins 307, so the tax payable does not change. The return asks for the amount even when no tax falls on it, so an EU purchase at 0 % counts too (`countsOnVatReturn`).
- **On a line with `noVatDeduction`** the tax is reported but not deducted, so it adds to the tax payable. It is not a cost in the statement by itself, and the dialog says to book it as a 0 % cost of its own. The dialog's advice to book the gross at 0 % does not fit an EU purchase, and `vatNotDeductible` leaves these out.
- **A custom category can be one on any cost line** (`canBeEuPurchase`), and the settings file drops the status from any other. A recurring template follows its category, since a monthly subscription is the usual case.
- **Bulk category changes do not cross the line** (§8.4). An EU purchase's amount is without VAT and any other entry's follows its mode, so moving one across would change what was paid. The entry dialog can change it, with the amount in view.
- **The rate comes from the category.** The dialog hides "ALV %" and "Verollisuus" on an EU category. An info icon beside "Luokka" opens a popover on hover or tap that says what the category is for and names the tax and the rate, and the receipt preview shows them too. The warning about a tax that cannot be deducted stays in view. Picking one sets the category's rate as it was on the entry's date, whatever was there before. A purchase taxed at another rate takes a custom EU category at that rate (§8.10), and an entry saved at another rate keeps it. A rate read from an invoice PDF is ignored on an EU category, since the invoice prints no Finnish tax. The ledger shows a pill.
- **Imports and domestic reverse charge use the same mechanism.** `EuPurchase` has two more values, `import` (goods from outside the EU) and `reverse` (construction services and scrap metal bought in Finland). The invoice or customs value is the amount, the category's rate gives the tax, and the deductible tax joins 307, so the tax payable does not change. Imports fill 310 and 304, reverse-charge purchases 320 and 318. The default categories are `333-import`, `333-reverse` (scrap metal) and `334-reverse` (construction), and a custom category can be either kind through "Osto, jonka veron ilmoitat itse" (§8.10). The `eu_purchase` column reads and writes `tuonti` / `import` and `käänteinen` / `reverse`. If customs collects import tax separately, the user books what was paid as a 0 % cost of its own, which the dialog says.
- **Not handled:** a business that is not VAT registered, which reports these on its own.

### 6.10 The rule engine and the specification

Every condition that comes from a law or from Verohallinto is a **rule**: data with a name, a `source` and a severity, in `lib/domain/rules/`. `engine.ts` has `defineRules` (ids must be unique), `evaluate` (every breach, in rule order) and the `Rule` and `Finding` types. A rule's `check` returns one value per breach and nothing when it holds, and the caller decides what a breach means: the ledger filters by it, a checklist counts it, a test asserts there is none. A rule with `source: "app"` is one the app made up, and says so.

- **`form5-spec.ts`** is section 7 of the Form 5 specification as a table: code, Finnish label, format and the required mark (`FORM5_FIELDS`). The Form 5 view and the balance section take every Finnish label from it (`form5Label`), so a code and its label always agree with OmaVero. The spec writes some totals in capitals and explains 358 and 359 in a clause, which `form5Label` removes. English labels are the chart's, or written in `form5.ts` and `form5-balance.ts`; the specification has none.
- **`rules/form5-rules.ts`** (`FORM5_RULES`) holds the checks and remarks of sections 8 and 9 over the fields the book fills, each with its number in the specification as `source`: the sums 316, 355 and 718, 341 and 342, 347 against 346, 364 against 388 and 392, 358 and 359, the pool 800 to 806, 733 and 734, the dividend and surplus shares, and the 30 % cap of 871. `form5.test.ts` runs them over every case. Checks on fields the book never fills (the car detail, double-entry equity, the spouse split) hold trivially and are not written.
- **`entry-checks.ts`** has `ENTRY_RULES`, one rule per entry check of §8.4, each returning entry ids. `flaggedEntryIds` looks the rule up by name, so the ledger filter, the overview checklist, the VAT return checks and the year-end checks all read the same rules.
- **The checklists, limits and locks are rules too.** `vat-checks.ts` (`VAT_CHECK_RULES`) and `year-end.ts` (`YEAR_END_RULES`) hold the two dialogs' items, `book-limits.ts` (`BOOK_LIMIT_RULES`) the limits of KPL 1:1a and 1:4b, `vat-threshold.ts` (`VAT_LIMIT_RULES`) the registration limit and the filing period's limit, and `period-lock.ts` (`LOCK_RULES`, one rule per mark, in precedence order) the locks of §8.11. `vatCheckFindings` and `yearEndFindings` return the engine's `Finding`s sorted by severity (`sortBySeverity`), so a dialog switches on `ruleId` and reads `data`. A rule has one fixed severity, so a limit that is an error when two limits are over and information when one is over is two rules (`singleEntryOver`, `singleEntryStaff`). `entryLock` and `lockOn` keep their signatures and return the first lock found. The calculators behind them (`bookLimits`, `vatThreshold`, `vatPeriodOverLimit`) stay as plain functions.
- **"Check my book"** (§8.23) runs these sets over the whole book. Evaluating them is all it does.
- **Not on the engine yet:** the overview's other rows (deadlines, Form 5's due date, empty months, open items), the retention reminders (`retention.ts`) and the rule-table gaps (`ruleGaps`). They hold their rules as code.
- **The specification is the source of truth** for a code, a label or a check. It is tracked in `docs/specs/`. `form5-spec.pdf.test.ts` reads the PDF and fails when `FORM5_FIELDS` has a code or a label the PDF does not, so a changed table is caught. The rules in `FORM5_RULES` are checked by hand. A new year's version replaces the PDF, and the test then lists what moved.

### 6.11 Rule tables

Every figure that a law or Verohallinto sets and that changes over time is in `data/rules.json`, bundled at build time. Nothing is fetched at run time and nothing is read from the user's file, so a book always computes with the tables of the build it runs in. `lib/domain/rule-tables.ts` parses the file with a hand-written validator and throws on the first value that does not fit, which fails the build and the tests.

- **What is in it.** `vatRateChanges` (§5), `form5Due` (§8.12), `travel` and `homeOffice` (§8.8), and `limits`: dated constants such as the VAT registration limit, the filing period limits, the private-use allowance, the KPL 1:1a and 1:4b limits and the depreciation rule. The staff limits of KPL stay in the sentences that mention them, since the book does not record staff.
- **Every row has a `source`**, a URL or a citation, and the file has a `checkedOn` date that Asetukset, Yleiset shows. Move `checkedOn` only after comparing the figures with their sources.
- **Dated values.** `limitOn(key, date)` returns the value in force on a date. The first value of a limit may have `from: null`, meaning it has always held; a date before the first dated value gets the first value. A law change adds a row and leaves the old one. Callers pass the date the rule applies to: the first day of the year for a yearly limit, the end of the closed year for the KPL limits, the entry's date for the private-use allowance.
- **Year tables** (travel, home office, Form 5 due dates) are ascending with no year twice. A year with no row degrades as before: no calculator, or "in the spring".
- **The overview says when a table is behind** (`ruleGaps`): from 1 January, while this year has no travel or home office row or last year's Form 5 has no due date, the checklist has an information row naming what is missing. It never blocks anything.
- **`.github/workflows/rules-reminder.yml`** opens an issue on 15 December asking for next year's rows, listing every table with the source of its newest row (`scripts/rules-issue.mjs`).
- **Not in the file:** the Finnish bank holidays (computed from Easter, `vat-deadline.ts`) and the Form 5 field list, which the specification in `docs/specs/` governs (§6.10).

### 6.12 Costs used partly privately

A phone, a car or a home internet line serves the business and the owner. `Entry.share` is the business share in whole percent, 1 to 99; absent means all of it. It is the user's own estimate, and the app does not check it.

- **The share applies to the whole voucher.** `calcEntry` returns `net` and `vat` as that share of the full amounts and leaves `gross` as the amount paid, so `net + vat` falls short of `gross` by the private part. 125,50 € with 25,5 % VAT included at 50 % gives a cost of 50,00 € and deductible VAT of 12,75 €. Each is rounded half away from zero, so a credit note mirrors its cost. `calcWhole` gives the full amounts, which the receipt preview prints.
- **Everything that counts a cost or a tax reads `net` and `vat`**, so the income statement, Form 5, the summary, the VAT return and the click-through lists all follow the share. Everything that follows money reads `gross`, so open items, the bank estimate and the duplicate check see what was paid. The private part is not booked anywhere: it is neither a cost nor an owner's withdrawal, since the money left the account to pay a real invoice.
- **Where it applies.** Costs on any line that can be an EU purchase (`canHaveShare`), which leaves out income, VAT payments, the owner's transfers, loans and EU purchases. The CSV reads it only there (§7.1) and `settings.json` drops it from a category elsewhere.
- **A category holds a default** (`Category.share`), set in Asetukset, Luokat on any cost category. It pre-fills a new voucher's field when the category is picked, unless the user has typed a share of their own. A voucher keeps the share it was saved with, whatever the category says later.
- **The entry dialog** shows "Yrityksen osuus" on the Maksu tab, under the payment date, on a cost, with an info popover. Empty means the whole voucher. The receipt preview prints the whole voucher and, beneath it, the business net and the deductible VAT. The ledger shows an "Osuus 50 %" pill.
- **A split part starts without a share**, since it sits in another category. A copy keeps the share. The change log records it as "Yrityksen osuus".
- **Not handled:** deriving the share from a logbook or a bill breakdown, a share that differs between the VAT deduction and the income tax deduction, and the adjustment of deducted VAT on fixed assets when use changes later (AVL 117 §).
