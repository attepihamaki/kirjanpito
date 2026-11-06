# Internationalisation, formatting and reference data

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

## 9. Internationalisation and formatting

### The UI's vocabulary

The code's identifiers are English and are not affected by this (§4, §12). What
the **UI** calls a thing is a separate decision, and a user-facing word follows
this table:

| the thing            | Finnish | English    | never again |
| -------------------- | ------- | ---------- | ----------- |
| an `Entry`           | tosite  | voucher    | kirjaus, entry |
| an `Attachment`      | liite   | attachment | tosite, receipt |
| `Entry.description`  | kuvaus  | description | selite |

"Tosite" is what the Accounting Act calls the dated, numbered record an entry
rests on (KPL 2:5), and an entry here **is** its own voucher (§4) — so "kirjaus"
and "tosite" were two words for one thing while the file attached to it took the
name of the other. Calling that file a liite leaves each thing one name.

The UI is the whole of it. The CSV's columns and words (§7.1), the receipt
folder (§7.2), `settings.json` (§7.6) and the storage keys (§12) are unchanged,
and so is the `receipt.*` i18n namespace: a namespace is a code identifier, and
moving ~30 keys would change nothing a user reads.

Two words stay as they are, in both languages:

- **A quoted law keeps the law's own wording.** KPL 2:10 distinguishes the
  books, kept 10 years, from the tositteet kept 6 — and there "tosite" is the
  voucher document, not the entry. `ledger.retention` and
  `overview.yearClosedSub` print that sentence, so they keep the Act's term
  even though the app's own term now means the entry. In the account list
  (KPL 2:7a) the row naming the original files is "Tositeliitteet" /
  "Voucher attachments", which holds both senses at once.
- **"Kuitti" / "receipt" is still the paper slip a shop hands over**, as in
  "Pudota kuitti tai lasku sivulle". That is the thing the user photographs;
  what the photo becomes in the app is a liite. The receipt motif of §11 is
  named after the slip too.

- Two languages: **Finnish (default)** and **English**. The choice is persisted. Update `<html lang>` and the document title when it changes. Every UI string is in a dictionary keyed by id, with `[fi, en]` values and `{param}` interpolation. Plural forms are functions (e.g. "1 tosite" / "{n} tositetta"). The artifact's `L` object holds every string and is the source to port. A typed dictionary is enough; no locale routing is needed.
- **Keys are `namespace.name`** — `t("io.zipNoCsv")`, `t("confirm.clearTitle")`, `t("settings.defaultVat")`. The namespaces are app, assets, balance, calendar, check, common, confirm, deductions, entry, file, io, landing, ledger, memo, nav, notFound, overview, receipt, recurring, settings, statement, summary, table, vat, viewer. `common.*` is only for words several views share; anything used in one place belongs to that place's namespace even when it is short. The keys were once flat and abbreviated (`setSub`, `f_type`, `nCats`, `delT`, `fb_import`) with four inconsistent prefix styles — unreadable at the call site, and with no room for a second settings subtitle. `messages.test.ts` enforces the shape and the list of namespaces, which is what stops the next key being added the old way.
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
