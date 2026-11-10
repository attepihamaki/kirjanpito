# File formats

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

## 7. File formats

### 7.1 CSV

**The file is written in the book's own language** (`exportLang`, §7.6), which
is Finnish or English. It decides the header, the words in the cells, the
category names, the ZIP's suggested name, the CSV's name and the receipt folder
(§7.2) — and nothing else.

- **Header row**, always these columns in this order, in one of two spellings:
  - fi: `tositenro;päivämäärä;selite;tyyppi;tili;luokka;summa;alv;verollisuus;liitteet;verokausi;maksettu;ostajan_alv;eu_osto;käteinen;jaettu;osuus;korjaa;myy;jakso_alkaa;jakso_päättyy;osapuoli`
  - en: `voucher;date;description;type;account;category;amount;vat;mode;receipts;settles;paid;buyer_vat;eu_purchase;cash;split;share;reverses;sells;period_from;period_to;party`
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
  - `cash` is `kyllä` / `yes` on an entry paid in cash (§8.5), empty on every other row. Reading also takes `käteinen`, `cash` and `x`, and keeps it only on a paid entry on a line that can be paid.
  - `split` is the voucher number of the first part of a receipt that was split, on every part of it (§8.4), and empty on every other row. A voucher number is unique within a year, so the import links rows by year and number. A part dated in another year than the first, a group whose first part has no number and a group of one are not written. On import a number only one row holds links nothing: the row stands alone and the toast says so. A cell that is not a whole number is ignored. `Entry.split` itself is an opaque id and renumbering does not touch it.
  - `share` is the business share of a cost used partly privately (§6.12), a whole percent from 1 to 99 written without a sign, and empty on every other row. Reading also takes a trailing `%`. It is kept only on an expense that is not an EU purchase; any other value reads as the whole voucher.
  - `reverses` names the voucher a refund, credit note or correction reverses (§8.4), written as `#number/year` (`#12/2026`), and empty on every other row. The `#` keeps Excel from reading it as a date. A voucher number is unique within a year, so the import finds the target by year and number. A target without a number is not written. On import a cell that is unreadable, names no row of the file, names the row itself or would close a loop links nothing, and the toast counts those rows. `Entry.reverses` itself is the target's id.
  - `period_from` and `period_to` are the first and last day an entry covers (§6.3), as ISO dates, and empty on an entry with no period. The import keeps them only as a pair of real dates with the end not before the start, on a line that can be paid; anything else reads as no period.
  - `party` is the id of the entry's counterparty in `customers.json` (§8.29), and empty on an entry with none. The import keeps any cell shaped like an id (letters, digits, `-` and `_`, at most 64) and checks it against the register only where it is shown, since a bare CSV has no register beside it.
  - `sells` names the purchase voucher a sale of machinery or equipment disposes of (§8.8), written as `#number/year` like `reverses`, and empty on every other row. The import finds the purchase by year and number; a cell that is unreadable, names no row of the file or names the row itself links nothing, and the toast counts those rows. `Entry.sells` itself is the purchase's id.
  - `eu_purchase` is `tavara`/`palvelu` or `goods`/`services` on an EU purchase (§6.9), empty on every other row. A CSV opened on its own has no `settings.json`, so this is what tells a custom EU category it is one. A row marked on any other category moves to an EU category when the book opens.
  - Rows are sorted by date, then by voucher number. Nothing about the format depends on the **UI** language, only on the book's.
  - **A text cell that Excel would run as a formula gets a leading apostrophe.** That is `description`, `category` or `receipts` starting with `=`, `+`, `-`, `@`, a tab or a carriage return. A value that already starts with apostrophes before one of those gets one more, and the import takes exactly one off, so every value round-trips. The amount and rate columns are left alone, so a negative amount stays a number. Excel may show the apostrophe in the cell.
  - **The same goes for such a character after a comma or a tab inside a text cell**, which gets an apostrophe in front of it, and the import takes one off. An Excel whose list separator is a comma splits the row there rather than at the `;`, and quoting does not stop that, because the quote is not at the start of what Excel takes as the field. `Lasku,=cmd…` is written `Lasku,'=cmd…`.
  - **A word read from a cell is looked up in a `Map`, never a plain object**, so `constructor` or `__proto__` in the `type` or `eu_purchase` column is not mistaken for a value.
- **Import (be lenient with rows, strict about the shape):**
  - **A bad row is skipped and counted, never fatal. A file whose header the app does not recognise is refused with an explanation**, and a column it does not know is reported rather than dropped in silence (§8.2 of this list, and the dialog in §8.11). There is no compatibility layer behind an older or foreign shape, so saying so is what stands in for one.
  - `decodeCsv` reads the bytes: a UTF-16 BOM decides, then strict UTF-8, then windows-1252, which is what Excel's plain "CSV (semicolon delimited)" writes. Strip a BOM. Detect the delimiter from the header line (`;`, tab or `,`, whichever splits it most). Headers are matched case-insensitively, in either language. `date`, `type` and `amount` are required; the rest are optional.
  - **No column recognised at all** is `not-a-book`: some other CSV entirely, and a different sentence from a bookkeeping missing a column. **A column that resolves to nothing** raises an `unknown-columns` warning naming it; the entries still import.
  - Dates are accepted as `YYYY-MM-DD` or `D.M.YYYY` and validated as real dates.
  - `settles` is optional. It is kept only on a settlement category and only when it names a period; otherwise the entry goes by its date (§6.6).
  - `voucher` is optional. A positive whole number is kept; a missing, malformed or repeated one is numbered when the book opens (§4), so an older file without the column opens with its entries numbered by date.
  - Amounts may contain spaces, NBSP, `€` and a Unicode minus. If both `,` and `.` appear, the last one is the decimal separator. A lone comma is a decimal comma in both languages, so a file reads the same in either. More than two decimals is refused, in a file and in the entry dialog: `1,234` could mean 1,23 € or 1 234 €, and a guess would be silently wrong by a factor of a thousand.
  - `mode` values `netto`, `veroton` or `net` mean net; anything else means gross. `veroton` is read but never written. An empty `vat` uses the category default, and so does one that is not a number from 0 up to 100 (`isVatRate`).
  - An older file's account number for an off-statement line (1100, 2939 on a refund, 2000, 2600) is read as the current one first (`FORMER_ACCOUNTS`, §5.1).
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
- **A stored file two entries hold is one file in the archive.** Attachments with the same `id` share the path the earliest entry gets, `packZip` reads and writes that path once, and the CSV lists it on every entry that uses it. Import already turns a path listed twice into one stored file, so the sharing survives a round trip. Two files that only share a name and size are different files and get `-2`.
- **The receipt keeps the name it already has**, and there is no field asking for another (§4). The name is stripped of the extension it will be given back, using the same pattern `extFromName` matches, so the stem and the extension cannot disagree.
- **`receiptStem` sanitises, it does not slug.** The name came off the user's own disk, so it is already a valid file name and most of it is a choice they made. It keeps spaces, dots, case and Finnish letters, and removes only what a file system would refuse: `\ / : * ? " < > |`, control characters, leading and trailing dots and spaces (Windows trims those on creation), and an MS-DOS device name (`CON`, `NUL`, `COM1`…, which Windows refuses whatever extension follows) gets a `_`. At most 100 characters; an empty result falls back to `liite`. Dropping `|` and `"` is also what keeps the path safe in the CSV's receipts column (§7.1).
- **The round trip is lossless, and the path is a fixed point.** `receiptStem` is idempotent — everything it does either removes a character that could never survive or is a no-op on its own output — so the name a re-import reads off the path is the name the next export writes, and a book can go round any number of times without its receipts drifting or degrading.
- **No date prefix.** The folder gives the year and month, and a user's own name often carries a date already — prefixing one would read twice.
- The extension comes from the file name (`jpeg` → `jpg`), otherwise from the MIME type.
- Receipt files are stored without compression (STORE); the CSV and `settings.json` are DEFLATE-compressed. An encrypted book keeps the same layout and methods (§7.8).
- **Import:** the user picks a ZIP. Use the shallowest `.csv` in it (ignoring `__MACOSX`), whatever it is called. Paths in `receipts` are resolved relative to the CSV's folder, then at the ZIP root, then by the **path below the top folder**, and last by a **unique file name anywhere in the archive**. The last two are what survive a move: changing the export language renames the folder, so a save asks the file it is replacing for a path that file never held, and a receipt whose bytes this browser no longer holds would be dropped (§7.5, `carryFrom`). Only the folder's own name changes, so the year, the month and the file name under it still identify the receipt — which is what the bare name cannot do, since two receipts of different months may share one. A key two files share is ambiguous, so the fallback refuses it rather than guessing. Files found are stored in IndexedDB. Listed files that aren't found become `missing` attachments that keep their path, so re-exporting doesn't lose the reference. Importing a plain CSV that has `receipts` paths marks those receipts as missing in the same way. A listed path that names neither an image nor a PDF, or that leads outside the archive (`..`, `.` or an empty segment, a leading `/`, a backslash or a drive), is not a receipt at all: it is dropped rather than kept as missing, so it cannot reappear in the next export, and the toast counts it. `isReceiptPath` decides this.
- **Unpacking is capped** (`ZIP_LIMITS` in `zip.ts`), because a small ZIP can unpack to gigabytes and the size in its header can be forged. The bytes are counted as they come out of the archive. The CSV and `settings.json` may unpack to 64 MiB each; past that the file is refused in a dialog (`io.zipTooLarge`). One receipt may unpack to 512 MiB; past that it reads as missing.
- Unpacking, decoding and writing every receipt to IndexedDB takes seconds for a real ZIP, so the import raises `importing` in the store and the UI shows progress once it passes 400 ms — see §8.2.

### 7.3 File naming when downloading a copy

The download dialog lets the user edit the base name, with the fixed extension `.zip` shown beside the field. The default is **the last opened or saved name**, as it was, without its extension (`suggestedBaseName` in `lib/domain/receipt-path.ts`). With no file behind the book it is `defaultFileBaseName`: `kirjanpito` or `bookkeeping`, from the book's **export language** (§7.1) rather than the UI's — the name belongs to the file. It carries no date: saving back to the same file is the normal flow (§7.5), so a date in the name only ages. Characters `\ / : * ? " < > |` and control characters are stripped, and a trailing `.csv` or `.zip` is removed. An empty name falls back to the default.

`fileName` in the store holds that name **with its extension** (`kirjanpito.zip`), for display only, and is set by opening, saving and downloading alike. `lib/commands/io-commands.test.ts` covers it.

### 7.4 Receipt files

- Accepted: JPEG, PNG, WebP, GIF, HEIC/HEIF, AVIF, BMP, TIFF, SVG and PDF. Several per entry. **Each type is known by both its MIME type and its extension**, because a file comes in by its type and goes back into the CSV by its path: a type known only one way would be written into the ZIP and then lose its link to the entry on the next open. `extensionFor` writes a receipt's own extension only when it is one of these, else the one its MIME type gives. An SVG never runs its script here, since the app draws receipts only through `<img>` and `createImageBitmap`, and the CSP (§11b) stands behind that. A stored file outside the rule, which a browser can hold from before it, is counted as a lost receipt when the book is written, so a save asks and autosave pauses rather than dropping it without a word (§7.5). **`isReceiptFile` in `lib/domain/receipt-path.ts` is the one place that decides this**, and every route in and out goes through it: the file picker (whose `accept` is only a hint, so the picked files are filtered again), drag and drop, and the `receipts` paths of an imported CSV or ZIP. Export applies it too — an attachment outside the rule gets no ZIP path and no `receipts` entry — so nothing a browser still holds from before the rule can leak back into a file.
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
needs a user gesture, an edit can be undone only for 10 seconds (§8.11) and
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
- **A write that throws is tried again, not given up on.** A cloud folder
  syncing or another program holding the file makes a write fail for a while.
  `autosaveBook` counts such a failure (`autosaveFailures`, not persisted) and
  the wait before the next try doubles: 3, 6, 12 and 24 seconds
  (`autosaveDelay`, never over a minute). The first failure raises a toast, the
  file menu says autosave is trying again, and the fifth in a row pauses
  autosave like any other question (`AUTOSAVE_MAX_FAILURES`). Any save resets
  the count. A pause for a missing permission or an outside edit never retries,
  since waiting changes neither.
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
  "businessId": "0112038-9",
  "businessName": "Oma Yritys Oy",
  "businessPhone": "09 1234567",
  "vatPeriod": "month",
  "traderType": "professional",
  "bookStart": "2026-10",
  "vatFiled": { "2026-08": "2026-10-12" },
  "vatFiledFigures": { "2026-08": { "301": 12000, "308": 4500 } },
  "taxPayment": { "iban": "", "reference": "" },
  "yearsArchived": { "2025": "2026-01-20" },
  "form5Filed": { "2025": "2026-03-20" },
  "archives": { "2024": { "file": "kirjanpito-2024.zip", "on": "2025-03-01", "entries": 42 } },
  "overview": { "layout": [{ "id": "result", "size": "L", "hidden": false }] },
  "categories": [{ "id": "333", "line": "333", "name": "Ostot ja varastojen muutokset", "vatRate": 25.5, "enabled": true, "custom": false }],
  "autosave": false,
  "encrypted": false,
  "pageSize": { "ledger": 10, "categories": 25 },
  "showAccounts": true,
  "recurring": [{ "id": "r1", "description": "Vuokra", "type": "expense", "catId": "343", "amount": 45000, "vatRate": 25.5, "amountMode": "gross", "day": 20, "from": "2026-02" }],
  "categoryRules": [{ "id": "rule-1", "contains": "Elisa", "catId": "344-other", "vatRate": 25.5 }],
  "bankSeen": ["id:2026102801234", "fp:2026-10-28|-12450|k market||0"],
  "assetOpening": { "year": 2026, "amount": 300000 },
  "bankBalance": { "amount": 125000, "date": "2026-10-31" },
  "payMonths": { "yel": [1, 7], "advanceTax": [2, 4, 6, 8, 10, 12], "advanceTaxYearly": { "2026": 360000 }, "taxRate": 22.5 },
  "loanOpening": { "year": 2026, "amount": 800000 },
  "changeLog": [{ "at": "2026-11-03T10:00:00.000Z", "action": "add", "voucher": 1, "date": "2026-10-10", "description": "Osto" }],
  "yearEnd": { "2026": { "goods": 120000, "otherCurrent": 0, "otherFixed": 0, "cash": 3500, "otherFinancial": 0, "loanCurrent": 0, "otherCurrentDebt": 0, "otherLongDebt": 0 } }
}
```

- **The stocktake is another JSON file at the ZIP root** (§8.28): `inventory.json` (`lib/domain/inventory-file.ts`), with `version`, the cost `method` and the `years` that map a year to its rows. It is DEFLATE-compressed like `settings.json`, read as leniently as the invoice files and encrypted with the rest (§7.8). A row that cannot be read, such as one with a fractional quantity or a purchase layer with no date, is dropped and counted, and a year key that is not four digits is ignored. A book with no rows writes no file. The seal (§7.9) gains an `inventory` hash. A year archive (§8.19) carries only the years its entries fall in. Quantities are integer thousandths and unit costs integer cents, bounded so that a row's value stays far below 2^53.
- **Invoices are two more JSON files at the ZIP root** (§8.27): `invoices.json` and `customers.json` (`lib/domain/invoice-file.ts`), DEFLATE-compressed like `settings.json`, read as leniently, and encrypted with the rest (§7.8). `customers.json` is the counterparty register (§8.29): each party carries `role`, `incomeCat`, `expenseCat` and `vatRate` besides its address, and a party without `role` reads as a customer. A book with no invoices or no customers writes no file for them. An invoice may carry `reminders` (§8.27), each read on its own and dropped when unreadable. A record that cannot be read is dropped and counted, and an invoice with a half-set issue (a number without a reference, say) counts as unreadable. The seal (§7.9) gains an `invoices` and a `customers` hash when the file is written. A file the seal covers that has changed or gone missing is reported as edited, and a file it does not mention is not checked. `settings.json` gains `invoiceSettings` (address, email, IBAN, payment term, terms text, first invoice number). An invoice's PDF is an ordinary attachment of its entries (§7.2). A book without the files has no invoices.
- **Keys are English**, like browser storage (§12). Nobody opens this file in Excel.
- **Reading is lenient**, like the CSV. A missing file means defaults. A bad or unknown value is dropped on its own and the rest is kept. A `version` above `SETTINGS_VERSION` still parses, and sets `fromNewerVersion` so the import can say the file may hold settings this reader passed over — lenient, but not silent.
- **`exportLang` is the language the book is written out in** (§7.1, §7.2). It belongs to the bookkeeping, not to the browser: open a book elsewhere and save it, and it comes back in the shape it went out in rather than reformatting itself to that browser's UI language. Unlike `language` and `theme` it **marks the book dirty**, since it changes the bytes a save would produce, and it is in `bookVersion()`. Absent from a file, it falls back to `"fi"`; a new book is seeded from the UI language and the setup dialog (§8.3) can change it.
- **Categories**: the full list. A default category keeps its id, line, name and kind from the chart of accounts and takes only `enabled` and `vatRate` from the file, and one the file does not list comes in with its defaults. `persist.migrate` runs a stored list through the same merge. Custom categories come across whole. The CSV is then matched against this list, so a custom category comes back with its own id instead of being recreated from its name.
- **The overview layout** goes through `normalizeLayout` in `lib/domain/overview-layout.ts`: an unknown widget id is dropped and a missing one goes right after the widget it follows in the default layout, at its default size, so a file from an older or newer version still opens and a new widget does not land at the bottom of the page.
- **Language and theme** are written from the browser's own keys (§12) at save. Opening a file switches the app to them. They are preferences of the browser as much as of the book, so changing them does not mark the book dirty, and the landing page goes on using the browser's keys. The theme is applied through `Ctx.setTheme`, because only React can reach next-themes.
- **Page sizes and autosave** are saved the same way: written at save, applied on open, never dirty.
- **The export language, whether the file is encrypted (§7.8), the business's name and ID, the VAT period, the trader type, the start month, the filed marks, the archived years, the layout, the categories, the recurring templates, the category rules, the opening balances, the year-end figures, the bank balance and the payment months do mark the book dirty**, since the file no longer matches.
- A plain CSV has no settings. Opening one starts with no filed marks and no start month, and keeps the rest as it was.
- `lib/domain/settings-file.test.ts` covers the round trip and the lenient reading; `lib/commands/io-commands.test.ts` covers opening a ZIP with settings.

### 7.8 Encrypted ZIP

The bookkeeping holds a business's figures and its receipts, and the file may sit in a cloud folder or an email. Encryption is opt-in per book.

- **The format is a standard ZIP with WinZip AES-256 (AE-2).** Every entry is encrypted: the CSV, `settings.json` and the receipts, with the same methods as a plain book (§7.2). 7-Zip, WinRAR and Keka open it with the password, so the file stays readable without the app. `lib/domain/zip.ts` is the only module that knows the library. `lib/domain/zip.test.ts` and `lib/commands/encryption.test.ts` cover the archive and the flows.
- **File names, sizes and dates are not encrypted.** A ZIP's central directory is readable without the password, so a receipt called `2.11.2026 - HC-Maschinentechnik - Lasku.pdf` shows its name. The setting says so. Hiding the names would take an encrypted ZIP inside another, which no other tool opens in one step.
- **The password is never stored.** It is held in memory by `lib/commands/book-password.ts`, tied to `bookEpoch`: another book taking over, a closed file and a reload all drop it. It is not in localStorage, IndexedDB or `settings.json`. The `encrypted` flag is (§7.6, §12), and the archive itself is the truth: opening a file sets the flag from what the entries are, not from `settings.json`.
- **Opening** (`unpackZip`) throws `ZipPasswordRequiredError` for an encrypted archive with no password and `ZipWrongPasswordError` for a wrong one. The import asks through `askPassword` (`lib/ui/password-prompt.ts`, hosted by `components/password-dialog-host.tsx`). The check runs inside the dialog, so a wrong password shows its message and the dialog stays open. Cancelling opens nothing. The import's busy flag is down while the dialog is up.
- **Saving** needs the password. With none held, `ensurePassword` asks before the file picker, so answering the dialog is the user gesture the picker needs. If the file being replaced is encrypted, the answer is checked against it, because a mistyped password would write a file the user cannot open. With no such file the password is asked twice and must be at least `MIN_PASSWORD_LENGTH` (10) characters. The AES key derivation is the format's own PBKDF2 with 1 000 rounds, which makes a short password the weak point. A downloaded copy follows the same rule.
- **Autosave never asks.** An encrypted book with no held password pauses autosave like any other question the save would have asked (§7.5), and one manual save starts it again. After a reload it is always paused.
- **Turning it on or off** is Asetukset, Yleiset, Salaus. Both mark the book dirty and take effect at the next save. Turning it off asks first and keeps the old password in memory, because the file on disk is still encrypted until that save and its receipts have to be read from it (§7.5).
- **The browser's working copy is not encrypted.** Between saves the entries are in localStorage and the receipts in IndexedDB, as before (§12). The file is protected on disk, in a cloud folder and in transit. It is not protected against someone using the browser profile. "Sulje tiedosto" clears the buffer, and the setting's description says so.
- **A plain CSV import is unchanged**, and an unencrypted ZIP opens as before. An encrypted ZIP opened with a password it does not need ignores the password.
- **Not handled:** recovering a forgotten password, a separate password per receipt, and keeping the old password while the new one is first written. Changing the password in a session and saving reads the old file's missing receipts with the new one, which fails, so those receipts count as lost (§7.5) and the save asks.

### 7.9 Integrity seal

`lib/domain/integrity.ts`. Every save writes `integrity` into `settings.json`: the algorithm (`sha256`) and two lowercase hex hashes, one of the CSV text and one of the settings body without the `integrity` key. Opening a ZIP recomputes both (`checkIntegrity`, called from `importZip`). The seal also holds a hash of each of `invoices.json`, `customers.json` and `inventory.json` when the book had that file (§7.6).

- **It catches casual edits and proves nothing.** The hashes have no key, so anyone who edits a file on purpose can recompute them. The landing page's wording about the change log applies here too (§8.11).
- **Receipts are not covered.** Hashing every receipt on open would be slow on a large book. A swapped receipt file goes unreported.
- **The settings hash goes through the parser.** The body is parsed and written out compactly before hashing, so white space and indentation in `settings.json` do not count, only values. The CSV is hashed as the text `unpackZip` returns, which is the text `packZip` was given.
- **A mismatch informs and blocks nothing.** The book opens as it is, then a dialog says whether the entries, the settings or both changed. The change log gets an `external-edit` record, which no view shows. The book stays clean, so the dialog returns on every open until a save writes a fresh seal.
- **No seal, no report.** An older file, a ZIP without `settings.json`, unparsable settings or a seal this version cannot read give `none`. A plain CSV has no seal.
- `lib/domain/integrity.test.ts` covers the check.
