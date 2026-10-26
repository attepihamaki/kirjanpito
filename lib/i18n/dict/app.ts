import { pl, type Dict } from "@/lib/i18n/t"

/**
 * Strings used inside the bookkeeping app. Keys the landing page also needs
 * live in `dict/landing.ts` instead — see the note there.
 *
 * Keys are `namespace.name`. The namespace says which part of the app the
 * string belongs to, so a call site reads as what it is — `t("io.zipNoCsv")`
 * rather than `t("zipNoCsv")` — and the dictionary can be scanned a section
 * at a time. `common.*` is for the handful of words several views share;
 * anything used in one place belongs to that place's namespace, even when
 * the word is short.
 *
 * **The namespace is not the module.** Which of the two dictionary files a
 * key lives in is a bundling decision (see `dict/landing.ts`), so a few
 * namespaces are split across both — `nav.vat` is in the landing module
 * because the landing hero names the VAT return. `messages.test.ts` enforces
 * the shape of the names and that the two modules stay disjoint.
 */
export const APP_DICT = {
  // --- Shell ---
  // Short enough to fit the sidebar's brand button on one line.
  "app.tagline": ["Yhdenkertainen kirjanpito", "Single-entry bookkeeping"],
  "app.fiscalYear": ["Tilikausi", "Financial year"],
  "app.toggleNav": ["Näytä tai piilota valikko", "Show or hide the menu"],

  "nav.ledger": ["Kirjanpito", "Bookkeeping"],
  "nav.statement": ["Tuloslaskelma", "Income statement"],
  "nav.summary": ["Yhteenveto", "Summary"],
  "nav.settings": ["Asetukset", "Settings"],
  "nav.help": ["Ohje", "Help"],

  // --- The open file (§8.2) ---
  "file.clean": ["Kaikki muutokset viety", "All changes exported"],
  "file.export": ["Vie tiedosto", "Export file"],
  "file.openShort": ["Avaa", "Open"],
  "file.close": ["Sulje tiedosto", "Close file"],
  "file.closed": ["Tiedosto suljettu.", "File closed."],
  // The file box's own buttons. Short on purpose: three of them share one
  // sidebar row, and the box above them already says which file it is.
  "file.importBtn": ["Tuo", "Import"],
  "file.exportBtn": ["Vie", "Export"],
  "file.closeBtn": ["Sulje", "Close"],

  // --- Confirmations (§8.11) ---
  "confirm.closeTitle": ["Suljetaanko tiedosto?", "Close the file?"],
  "confirm.closeMessage": [
    "Kirjanpidossa on muutoksia, joita ei ole viety CSV-tiedostoon. Jos suljet tiedoston, ne menetetään.",
    "There are changes that haven’t been exported to CSV. If you close the file, they’ll be lost.",
  ],
  "confirm.closeConfirm": ["Sulje viemättä", "Close without exporting"],
  "confirm.deleteTitle": ["Poistetaanko kirjaus?", "Delete this entry?"],
  "confirm.deleteMessage": [
    "Kirjaus ”{x}” poistetaan.",
    "The entry “{x}” will be deleted.",
  ],
  "confirm.replaceTitle": [
    "Korvataanko avoin kirjanpito?",
    "Replace the open bookkeeping?",
  ],
  "confirm.replaceMessage": [
    "Avoimessa kirjanpidossa on muutoksia, joita ei ole viety. Tuotava tiedosto korvaa ne.",
    "The open bookkeeping has changes that haven’t been exported. The imported file will replace them.",
  ],
  "confirm.replaceConfirm": ["Korvaa", "Replace"],
  "confirm.clearTitle": ["Tyhjennetäänkö kirjaukset?", "Clear all entries?"],
  "confirm.clearMessage": [
    "Kaikki kirjaukset poistetaan tästä selaimesta. Vie ne ensin CSV-tiedostoksi, jos haluat säilyttää ne.",
    "All entries will be removed from this browser. Export them to CSV first if you want to keep them.",
  ],
  "confirm.clearConfirm": ["Tyhjennä", "Clear"],
  "confirm.discardTitle": ["Hylätäänkö muutokset?", "Discard changes?"],
  "confirm.discardConfirm": ["Hylkää muutokset", "Discard changes"],
  "confirm.keepEditing": ["Jatka muokkausta", "Keep editing"],
  "confirm.discardEntry": [
    "Kirjauksessa on tallentamattomia muutoksia. Jos suljet ikkunan, ne menetetään.",
    "This entry has unsaved changes. If you close the dialog, they’ll be lost.",
  ],
  "confirm.discardCategory": [
    "Olet täyttänyt uuden luokan tiedot, mutta luokkaa ei ole lisätty. Jos poistut sivulta, tiedot menetetään.",
    "You’ve filled in a new category but haven’t added it. If you leave this page, it will be lost.",
  ],

  // --- Shared by several views ---
  "common.all": ["Kaikki", "All"],
  "common.actions": ["Toiminnot", "Actions"],
  "common.type": ["Tyyppi", "Type"],
  "common.typeFilter": ["Tyyppi", "Type"],
  "common.income": ["Tulo", "Income"],
  "common.expense": ["Kulu", "Expense"],
  "common.incomePlural": ["Tulot", "Income"],
  "common.expensePlural": ["Kulut", "Expenses"],
  "common.gross": ["Verollinen", "Incl. VAT"],
  "common.net": ["Veroton", "Excl. VAT"],
  "common.rate": ["Verokanta", "Rate"],
  "common.vat": ["Vero", "VAT"],
  "common.total": ["Yhteensä", "Total"],
  "common.name": ["Nimi", "Name"],
  "common.account": ["Tili", "Account"],
  "common.add": ["Lisää", "Add"],
  "common.save": ["Tallenna", "Save"],
  "common.cancel": ["Peruuta", "Cancel"],
  "common.delete": ["Poista", "Delete"],
  "common.close": ["Sulje", "Close"],

  // --- Table chrome (§8.4) ---
  "table.rowsPerPage": ["Rivejä sivulla", "Rows per page"],
  "table.pageOf": ["Sivu {p} / {n}", "Page {p} of {n}"],
  "table.firstPage": ["Ensimmäinen sivu", "First page"],
  "table.prevPage": ["Edellinen sivu", "Previous page"],
  "table.nextPage": ["Seuraava sivu", "Next page"],
  "table.lastPage": ["Viimeinen sivu", "Last page"],

  // --- Ledger (§8.4) ---
  "ledger.emptyTitle": ["Ei vielä kirjauksia", "No entries yet"],
  "ledger.emptyBody": [
    "Lisää ensimmäinen tosite tai tuo aiemmat kirjaukset CSV-tiedostosta.",
    "Add your first receipt or import earlier entries from a CSV file.",
  ],
  "ledger.startEmpty": ["Aloita tyhjästä", "Start from scratch"],
  "ledger.newEntry": ["Uusi kirjaus", "New entry"],
  "ledger.wholeYear": ["Koko vuosi", "Whole year"],
  "ledger.incomeNet": ["Tulot, veroton", "Income, excl. VAT"],
  "ledger.expenseNet": ["Kulut, veroton", "Expenses, excl. VAT"],
  "ledger.vatPayable": ["Maksettava ALV", "VAT payable"],
  "ledger.vatRefundable": ["Palautettava ALV", "VAT refundable"],
  "ledger.search": [
    "Hae selitteestä tai luokasta",
    "Search description or category",
  ],
  "ledger.colDate": ["Päivämäärä", "Date"],
  "ledger.colDescription": ["Selite", "Description"],
  "ledger.colCategory": ["Luokka", "Category"],
  "ledger.colNet": ["Veroton", "Net"],
  "ledger.colGross": ["Verollinen", "Gross"],
  "ledger.noDescription": ["Ei selitettä", "No description"],
  "ledger.noMatch": [
    "Ei kirjauksia valituilla suodattimilla.",
    "No entries match the filters.",
  ],
  "ledger.noEntriesFor": ["Ei kirjauksia: {p}.", "No entries: {p}."],
  "ledger.clearFilters": ["Tyhjennä suodattimet", "Clear filters"],
  "ledger.allCategories": ["Kaikki luokat", "All categories"],
  "ledger.copyAsNew": ["Kopioi uudeksi", "Copy as new"],
  "ledger.deleteEntry": ["Poista kirjaus", "Delete entry"],

  // --- Entry dialog (§8.5) ---
  "entry.editTitle": ["Muokkaa kirjausta", "Edit entry"],
  "entry.copyTitle": ["Kopio kirjaus", "Copied entry"],
  "entry.date": ["Päivämäärä", "Date"],
  "entry.description": ["Tapahtuman selite", "Description"],
  "entry.descriptionPlaceholder": [
    "Esim. Lasku 1006 – Asiakas Oy",
    "E.g. Invoice 1006 – Client Ltd",
  ],
  "entry.category": ["Luokka", "Category"],
  "entry.amount": ["Summa (€)", "Amount (€)"],
  "entry.vatRate": ["ALV %", "VAT %"],
  "entry.amountMode": ["Summa on", "Amount is"],
  "entry.saveAndNew": ["Tallenna ja uusi", "Save and add another"],
  "entry.errDate": ["Anna päivämäärä.", "Enter a date."],
  "entry.errAmount": [
    "Anna summa, esim. 124,50.",
    "Enter an amount, e.g. 124.50.",
  ],
  "entry.errCategory": ["Valitse luokka.", "Choose a category."],
  "entry.saved": ["Kirjaus tallennettu.", "Entry saved."],
  "entry.changesSaved": ["Muutokset tallennettu.", "Changes saved."],
  "entry.deleted": ["Kirjaus poistettu.", "Entry deleted."],
  "entry.unknownCategory": ["Tuntematon luokka", "Unknown category"],

  // --- Receipts: the paper preview's labels (§8.5) and the files (§7.4) ---
  "receipt.description": ["Selite", "Description"],
  "receipt.purchaseBadge": [
    "Vähennetään ostojen verona",
    "Deducted as VAT on purchases",
  ],
  "receipt.noVatBadge": ["Ei arvonlisäveroa", "No VAT"],
  "receipt.sectionTitle": ["Tositteet", "Receipts"],
  "receipt.add": ["Lisää tosite", "Add receipt"],
  "receipt.hint": [
    "Kuva tai PDF. Voit myös raahata tiedoston tähän.",
    "Image or PDF. You can also drag a file here.",
  ],
  "receipt.remove": ["Poista tosite", "Remove receipt"],
  "receipt.open": ["Avaa tosite", "Open receipt"],
  "receipt.missing": ["Tiedosto puuttuu", "File missing"],
  "receipt.count": [
    pl("1 tosite", "{n} tositetta"),
    pl("1 receipt", "{n} receipts"),
  ],
  "receipt.badType": [
    "Vain kuvia ja PDF-tiedostoja voi liittää.",
    "Only images and PDF files can be attached.",
  ],
  "receipt.noStorage": [
    "Tositteiden tallennus ei ole käytettävissä tässä selaimessa.",
    "Saving receipts isn’t available in this browser.",
  ],
  "receipt.dropHint": [
    "Avaa kirjaus, jos haluat liittää siihen tositteen.",
    "Open an entry to attach a receipt to it.",
  ],
  "receipt.drop": [
    "Pudota tosite liittääksesi sen kirjaukseen",
    "Drop a receipt to attach it to the entry",
  ],

  // --- VAT return (§8.7) ---
  "vat.month": ["Kuukausi", "Month"],
  "vat.quarter": ["Neljännesvuosi", "Quarter"],
  "vat.year": ["Vuosi", "Year"],
  "vat.period": ["Kausi", "Period"],
  "vat.yearN": ["Vuosi {y}", "Year {y}"],
  "vat.quarterN": ["{q}. neljännes {y}", "Q{q} {y}"],
  "vat.quarterOption": ["{q}. neljännes ({a}–{b})", "Q{q} ({a}–{b})"],
  "vat.payableTitle": ["Maksettava arvonlisävero", "VAT payable"],
  "vat.refundableTitle": ["Palautettava arvonlisävero", "VAT refundable"],
  "vat.formula": [
    "Myynnin vero {a} − ostojen vähennettävä vero {b}",
    "VAT on sales {a} − deductible VAT on purchases {b}",
  ],
  "vat.salesTable": ["Myynnin arvonlisävero", "VAT on sales"],
  "vat.purchaseTable": [
    "Ostojen vähennettävä vero",
    "Deductible VAT on purchases",
  ],
  "vat.otherRates": ["Muut verokannat", "Other rates"],
  "vat.otherSales": ["Muut ilmoitettavat myynnit", "Other sales to report"],
  "vat.euSales": [
    "Tavaroiden ja palveluiden myynti muihin EU-maihin",
    "Sales of goods and services to other EU countries",
  ],
  "vat.nonEuSales": ["Myynti EU:n ulkopuolelle", "Sales outside the EU"],
  "vat.reverseChargeSales": [
    "Rakentamispalveluiden ja metalliromun myynti (käänteinen verotus)",
    "Construction services and scrap metal sales (reverse charge)",
  ],
  "vat.note": [
    "Ostojen 0 %:n kirjaukset (esim. palkat, YEL, pankkikulut) eivät vaikuta arvonlisäveroon, joten niitä ei näytetä vähennyksissä. Tarkista luvut ennen ilmoittamista OmaVerossa.",
    "Purchases at 0% (e.g. wages, YEL, bank fees) don’t affect VAT, so they aren’t shown as deductions. Check the figures before filing in OmaVero.",
  ],
  // An EU, non-EU or reverse-charge sale that carries a VAT rate: the rate is
  // ignored, which the prototype did silently.
  "vat.exemptSaleWarning": [
    "Kirjauksessa ”{x}” on verokanta, mutta luokka raportoidaan ilman myynnin veroa. Vero jätetään huomiotta.",
    "The entry “{x}” has a VAT rate, but its category is reported without VAT on sales. The VAT is ignored.",
  ],

  // --- Income statement (§8.8) ---
  "statement.subtitle": [
    "Elinkeinotoiminnan veroilmoitusta (lomake 5) varten",
    "For the business tax return (form 5)",
  ],
  "statement.print": ["Tulosta", "Print"],
  "statement.revenue": ["Tuotot", "Revenue"],
  "statement.expenses": ["Elinkeinotoiminnan kulut", "Business expenses"],
  "statement.profitOrLoss": ["Voitto tai tappio", "Profit or loss"],
  "statement.revenueTotal": ["Tuotot yhteensä", "Total revenue"],
  "statement.deductibleTotal": [
    "Vähennyskelpoiset kulut yhteensä",
    "Total deductible expenses",
  ],
  "statement.loss": ["359 Elinkeinotoiminnan tappio", "359 Business loss"],
  "statement.note": [
    "Vähennyskelvottomat kulut (365–367, yhteensä {a}) näytetään, mutta niitä ei vähennetä tuloksesta. Summat ovat verottomia.",
    "Non-deductible expenses (365–367, total {a}) are shown but not deducted from the result. Amounts exclude VAT.",
  ],

  // --- Summary (§8.9) ---
  "summary.subtitle": [
    "Verottomat summat kuukausittain, {y}",
    "Amounts excl. VAT by month, {y}",
  ],
  "summary.incomeAndExpenses": ["Tulot ja kulut", "Income and expenses"],
  "summary.sales": ["Myynti", "Sales"],
  "summary.expenses": ["Kulut", "Expenses"],
  "summary.chartLabel": [
    "Tulot ja kulut kuukausittain",
    "Income and expenses by month",
  ],
  "summary.month": ["Kk", "Month"],
  "summary.salesTotal": ["Myynti yht.", "Sales total"],
  "summary.otherIncome": ["Muut tulot", "Other income"],
  "summary.expenseTotal": ["Kulut yht.", "Expenses total"],
  "summary.total": ["Yht.", "Total"],
  "summary.finland": ["Suomi {r}", "Finland {r}"],
  "summary.eu": ["EU", "EU"],
  "summary.otherCountries": ["Muut maat", "Other countries"],
  "summary.bucketPurchases": [
    "Ostot ja ulkopuoliset palvelut",
    "Purchases and external services",
  ],
  "summary.bucketPersonnel": ["Henkilöstökulut", "Personnel expenses"],
  "summary.bucketDepreciation": [
    "Poistot, edustuskulut ja vuokrat",
    "Depreciation, entertainment and rent",
  ],
  "summary.bucketOtherDeductible": [
    "Muut vähennyskelpoiset kulut",
    "Other deductible expenses",
  ],
  "summary.bucketFinancial": ["Rahoituskulut", "Financial expenses"],
  "summary.bucketProvisions": ["Varausten muutokset", "Changes in provisions"],
  "summary.bucketNondeductible": [
    "Vähennyskelvottomat kulut",
    "Non-deductible expenses",
  ],

  // --- Settings (§8.10) ---
  "settings.subtitle": [
    "Luokat ja oletusverokannat. Asetukset tallentuvat tähän selaimeen.",
    "Categories and default VAT rates. Settings are saved in this browser.",
  ],
  "settings.addCategory": ["Lisää oma luokka", "Add a category"],
  "settings.line": ["Tuloslaskelman rivi", "Income statement line"],
  "settings.namePlaceholder": ["Esim. Työkalut", "E.g. Tools"],
  "settings.defaultVat": ["Oletus ALV %", "Default VAT %"],
  "settings.categories": ["Luokat", "Categories"],
  "settings.inUse": ["Käytössä", "Active"],
  "settings.searchCategories": ["Hae luokkia", "Search categories"],
  "settings.categoryCount": [
    pl("1 luokka", "{n} luokkaa"),
    pl("1 category", "{n} categories"),
  ],
  "settings.deleteCategory": ["Poista luokka", "Delete category"],
  "settings.isActive": ["{c} käytössä", "{c} active"],
  "settings.categoryAdded": ["Luokka lisätty: {c}.", "Category added: {c}."],
  "settings.nameRequired": ["Anna luokalle nimi.", "Give the category a name."],
  "settings.vatInvalid": [
    "Anna verokanta numerona, esim. 25,5.",
    "Enter the rate as a number, e.g. 25.5.",
  ],
  "settings.vatUpdated": [
    "Oletus-ALV päivitetty: {c} {r}.",
    "Default VAT updated: {c} {r}.",
  ],
  "settings.data": ["Tiedot", "Data"],
  "settings.resetCategories": [
    "Palauta oletusluokat",
    "Restore default categories",
  ],
  "settings.resetHint": [
    "Palauttaa oletusluokat ja niiden verokannat. Omat luokat, joita kirjaukset käyttävät, säilyvät.",
    "Restores the default categories and their VAT rates. Custom categories your entries use are kept.",
  ],
  "settings.categoriesReset": [
    "Oletusluokat palautettu.",
    "Default categories restored.",
  ],
  "settings.clearEntries": ["Tyhjennä kirjaukset", "Clear all entries"],
  "settings.clearHint": [
    "Poistaa kaikki kirjaukset tästä selaimesta. Vie ne ensin CSV-tiedostoksi, jos haluat säilyttää ne.",
    "Removes every entry from this browser. Export them to CSV first if you want to keep them.",
  ],
  "settings.cleared": ["Kirjaukset tyhjennetty.", "Entries cleared."],

  // --- Import and export (§7) ---
  "io.opening": ["Avataan tiedostoa…", "Opening the file…"],
  "io.fileEmpty": ["Tiedosto on tyhjä.", "The file is empty."],
  "io.missingColumn": [
    "Tiedostosta puuttuu sarake: {c}. Odotettu otsikkorivi: {h}",
    "The file is missing a column: {c}. Expected header row: {h}",
  ],
  "io.noRows": [
    "Yhtään riviä ei voitu lukea. {e}",
    "No rows could be read. {e}",
  ],
  "io.imported": [
    pl("Tuotiin 1 kirjaus.", "Tuotiin {n} kirjausta."),
    pl("Imported 1 entry.", "Imported {n} entries."),
  ],
  "io.newCategories": [" Uusia luokkia: {n}.", " New categories: {n}."],
  "io.skipped": [
    " Ohitettu tai korjattu: {n} ({e}).",
    " Skipped or corrected: {n} ({e}).",
  ],
  "io.rowError": ["rivi {n}: {f}", "row {n}: {f}"],
  "io.fieldDate": ["päivämäärä", "date"],
  "io.fieldType": ["tyyppi", "type"],
  "io.fieldAmount": ["summa", "amount"],
  "io.unknownCategoryRow": [
    "rivi {n}: tuntematon luokka ”{c}”, kirjattu luokkaan {d}",
    "row {n}: unknown category “{c}”, booked to {d}",
  ],
  "io.newCategoryRow": [
    "rivi {n}: uusi luokka ”{c}” luotiin",
    "row {n}: created the new category “{c}”",
  ],
  "io.readFailed": [
    "Tiedoston lukeminen epäonnistui.",
    "Couldn’t read the file.",
  ],
  "io.receiptsImported": [" Tositteita: {n}.", " Receipts: {n}."],
  "io.receiptsMissing": [
    " Puuttuvia tositteita: {n}.",
    " Missing receipts: {n}.",
  ],
  "io.dropHere": [
    "Pudota CSV- tai ZIP-tiedosto avataksesi sen",
    "Drop a CSV or ZIP file to open it",
  ],
  "io.exportTitle": ["Vie kirjanpito", "Export bookkeeping"],
  "io.fileNameLabel": ["Tiedoston nimi", "File name"],
  "io.exportHint": [
    "Tiedosto sisältää kaikkien tilikausien kirjaukset.",
    "The file includes the entries of all financial years.",
  ],
  "io.exportAction": ["Vie tiedosto", "Export file"],
  "io.csvOnly": [
    "Vie vain CSV-tiedosto ilman tositteita",
    "Export only the CSV file, without receipts",
  ],
  // The paths are written either way, so a re-import still knows the
  // receipts existed — it just marks them missing.
  "io.csvOnlyHint": [
    "Tositteiden polut säilyvät CSV-tiedostossa, joten ne voi yhdistää myöhemmin uudelleen.",
    "Receipt paths are kept in the CSV, so they can be reconnected later.",
  ],
  "io.zipHint": [
    pl(
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston ja 1 tositteen kansiossa vuoden ja kuukauden mukaan.",
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston ja {n} tositetta kansioissa vuoden ja kuukauden mukaan."
    ),
    pl(
      "The ZIP file contains the bookkeeping CSV and 1 receipt in a folder by year and month.",
      "The ZIP file contains the bookkeeping CSV and {n} receipts in folders by year and month."
    ),
  ],
  "io.nothingToExport": [
    "Ei vietävää. Lisää ensin kirjauksia.",
    "Nothing to export. Add some entries first.",
  ],
  "io.exporting": ["Pakataan tositteita…", "Packing receipts…"],
  "io.exported": ["Viety tiedostoon {f}.", "Exported to {f}."],
  "io.exportCancelled": ["Vienti peruttiin.", "Export cancelled."],
  "io.exportFailed": [
    "Tiedoston tallennus ei onnistunut tässä näkymässä.",
    "Couldn’t save the file in this view.",
  ],
  "io.zipFailed": [
    "ZIP-tiedostoa ei voitu lukea.",
    "Couldn’t read the ZIP file.",
  ],
  "io.zipNoCsv": [
    "ZIP-tiedostosta ei löytynyt CSV-tiedostoa.",
    "No CSV file was found in the ZIP file.",
  ],

  // --- Receipt viewer (§8.6) ---
  "viewer.prevReceipt": ["Edellinen tosite", "Previous receipt"],
  "viewer.nextReceipt": ["Seuraava tosite", "Next receipt"],
  "viewer.prevPage": ["Edellinen sivu", "Previous page"],
  "viewer.nextPage": ["Seuraava sivu", "Next page"],
  "viewer.pageOf": ["Sivu {p} / {n}", "Page {p} of {n}"],
  "viewer.zoomIn": ["Suurenna", "Zoom in"],
  "viewer.zoomOut": ["Pienennä", "Zoom out"],
  "viewer.fit": ["Sovita näkymään", "Fit to view"],
  "viewer.rotate": ["Käännä", "Rotate"],
  "viewer.saveOriginal": ["Tallenna alkuperäinen", "Save original"],
  "viewer.loading": ["Ladataan…", "Loading…"],
  "viewer.noPreview": [
    "Tätä tiedostoa ei voi esikatsella tässä selaimessa. Voit tallentaa alkuperäisen tiedoston.",
    "This file can’t be previewed in this browser. You can save the original file.",
  ],
  "viewer.pdfFailed": [
    "PDF-tiedoston avaaminen epäonnistui.",
    "Couldn’t open the PDF file.",
  ],
  "viewer.receiptOf": ["Tosite {i} / {n}", "Receipt {i} of {n}"],
  "viewer.saved": ["Tallennettu: {f}", "Saved: {f}"],
} as const satisfies Dict
