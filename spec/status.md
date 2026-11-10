# Implementation order, open questions and legal gaps

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

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
- [ ] Printing the income statement, the journal and the general ledger gives the same sheet in Chromium, Firefox and Safari: no sidebar or top bar, 15 mm margins, the pill and result-line tints kept, no row split across two pages, and the table header repeated on each page. Check the ledger with enough rows to run past one page, in light and dark themes. Only Chromium has been tried so far.

## 14. Open questions and ideas not yet done

- The VAT file's corrections (332 to 335) are written as a reason choice (§8.7); the app does not compare a replacement return with the one filed before it beyond the figure changes the filed mark already shows. The Form 5 file (§8.8) was accepted by Ilmoitin in a test upload on 8 November 2026, with remark #1410 on a full write-off of a small balance.
- Form 5 fields the app leaves out on purpose: surplus from listed co-operatives (325, 326), since the specification says no co-operative was listed in 2026 (remark #2048); the detail behind 388 and 392 (401 to 420), the home use (431 to 433, 386), the spouse split (369 to 372), 393 and the double-entry equity (748, 741 to 743). None is mandatory (§8.8).
- Invoicing (§8.27). Open: how a trader who is not registered for VAT invoices (rate 0 and which note), the source and wording of the late-payment interest, whether per-row VAT rounding is needed, and the exact required fields on a Finnish invoice, to be checked on vero.fi before the PDF is laid out.
- E-invoicing (Finvoice 3.0 or Peppol BIS Billing 3.0 UBL) as a companion to the invoice PDF (§8.27). Not built. The app has no backend, so it could only write the XML, and the user would have to upload it to a bank or an operator. A sole trader whose bank gives business services only with a paid business account has no bank channel, and an operator that takes a plain file upload has not been found. No Finnish law requires it for B2B: a buyer above the 10 000 € turnover threshold may demand one under the e-invoicing act (241/2019), and public buyers require it. The EU rule (ViDA) makes structured e-invoices mandatory for cross-border B2B from 1 July 2030, and a PDF does not count. Build it when a customer asks for one, an operator accepting uploads from a sole trader is found, or the 2030 date nears for a trader who sells across borders. It would need the buyer's e-invoice address and operator code on the customer, a unit code and a VAT category code per row, an exemption reason for VAT-free rows, and validation against the published schemas and Peppol rules. Embedding the XML in the PDF (Factur-X) is a further option.
- Asset classes other than machinery and equipment, and templates repeating less often than monthly.
- Whether KPL 2:6's duty reaches the Form 5 fields the book does not hold: the year-end figures typed in on Varat ja velat, and the loan's opening balance. The click-through (§8.18) lists the vouchers behind a figure and says what is typed in. Assumed that a figure made from the books is covered and one typed in is not.

### Legal gaps

Compared on 3 November 2026 against the Accounting Act as consolidated on Finlex (KPL), Vero's guidance and Verohallinto's 2026 data file specification for Form 5.

What the sources settle:

- **Who keeps what (KPL 1:1a).** A sole trader of either kind must be able to determine accounts payable and receivable at all times. Single-entry books are allowed while at most one of three limits is exceeded in both the closed year and the one before: balance sheet 100 000 €, turnover 200 000 €, more than 3 employees on average. Financial statements are required only when at least two of the micro limits of KPL 1:4b are exceeded in both years: 450 000 €, 900 000 €, 10 employees. They then follow the micro rules, within 4 months (3:6), dated and signed (3:7).
- **Income timing (EVL 27 a §, vero.fi, "Yritystoiminta, tulonhankkimistoiminta ja harrastustoiminta henkilöverotuksessa").** An ammatinharjoittaja with single-entry books is taxed on a cash basis: income and expenses belong to the year of payment. A liikkeenharjoittaja may keep single-entry books but must adjust them to accrual basis for tax. The app reads a liikkeenharjoittaja's entries by their own date, and an entry with a period is spread over the years it covers (§6.3). KPL 2:3 allows the accrual, invoice and payment bases in the books themselves.
- **Changing what is recorded (KPL 2:7).** The content of a voucher or a book may not be changed or deleted after the financial statements are prepared, or after a periodic return to an authority has been made from the books. That includes the VAT return. The form may change for handling or storage, if the content and the audit trail survive.
- **Timing of entries (KPL 2:4).** Cash payments are recorded without delay, in date order. Others may be monthly, and in time for returns to be made from up-to-date books. The Act sets no four-month limit for a sole trader. An entry marked as paid in cash is checked against when it was added (§8.5), and a new entry in a filed period gets the warning of §8.11.
- **Lists (KPL 2:2, 2:7a, 2:10).** An account list that explains each account's content, for each financial year, and a list of the books and voucher types showing how they connect and how they are kept. Both for 10 years.
- **Private use (AVL 21 §, 22 a §, Vero's guidance of 17.3.2020).** Goods whose VAT was deducted carry VAT when taken into private use, on the purchase price or a lower probable selling price. For a natural person, private use of at most 850 € a year without VAT is minor and free, and above that only the part over 850 € carries VAT (guidance section 4). The guidance is in force until further notice, and vero.fi repeated the figure on 28.3.2025; checked on 10.11.2026.
- **EC Sales List (vero.fi).** Monthly, only for a month with such sales, due on the 20th of the next month or the next working day. It lists each buyer's VAT number and total. Goods go by the invoice's month and services by the month of the supply or payment.
- **Form 5's balance (specification 2026).** 704 machinery and equipment, 708 goods, 709 other current assets, 711 accounts receivable, 714 cash in hand, 716 other financial assets, 718 total assets. 749 current and 750 non-current liabilities, 725 total. 733 or 734 net worth. 394 wages paid in the 12 months before the year's end. **Bank deposits are in none of these.**
- **Payroll.** Line 335 takes wages, but the app has no payroll records or income register reporting, and says so in the entry dialog and in the year-end dialog. Building them is not planned.

Questions for an accountant. Building proceeds on the answer given:

- Does `Entry.date` as the delivery or invoice date, with a separate payment date, satisfy both kinds of trader? Assumed yes.
- Is a per-voucher change history with locked periods enough for KPL 2:6 and 2:7 in a file the user controls, given that a deletion has no view in the app? Assumed yes, and the landing page says the log is a record of use and not proof.

What the app still leaves to the user is listed above each topic. No known legal gap remains open beyond the questions above, the Form 5 fields at the top of this section. A liikkeenharjoittaja's accrual basis is the entry's own date (§6.3); the app has no accrual or deferral entries beyond that. KPL 2:7 follows the return a voucher went on, while a Form 5 mark locks by both the entry's date and its payment date, so an ammatinharjoittaja's December invoice paid in January locks with the year it is dated in, though it is reported a year later.
