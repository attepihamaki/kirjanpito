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

  "nav.overview": ["Yleiskatsaus", "Overview"],
  "nav.ledger": ["Kirjanpito", "Bookkeeping"],
  "nav.statement": ["Tuloslaskelma", "Income statement"],
  "nav.summary": ["Yhteenveto", "Summary"],
  "nav.settings": ["Asetukset", "Settings"],

  /*
   * --- The open file (§8.2) ---
   *
   * The status words are deliberately about saving rather than exporting, so
   * they hold whether the bookkeeping is written back to its own file (§7.5)
   * or only ever downloaded as a copy. Both end in a file; only one of them
   * ends in *that* file, and `dirty` already encodes which (§7.5).
   */
  "file.clean": ["Tallennettu", "Saved"],
  "file.save": ["Tallenna", "Save"],
  /*
   * Named after what it does, not after its relationship to "Tallenna":
   * where the browser cannot write to a file (§7.5) this row is the only way
   * to keep the work, so "kopio" would imply an original somewhere else. It
   * also puts the row in line with "Avaa tiedosto" and "Sulje tiedosto".
   */
  "file.download": ["Lataa tiedosto", "Download file"],
  "file.autosaveOn": ["Tallentuu automaattisesti.", "Saves automatically."],
  "file.autosavePaused": [
    "Automaattinen tallennus odottaa. Tallenna kerran itse.",
    "Autosave is waiting. Save once yourself.",
  ],
  "file.openShort": ["Avaa", "Open"],
  "file.close": ["Sulje tiedosto", "Close file"],
  "file.closed": ["Tiedosto suljettu.", "File closed."],

  // --- Confirmations (§8.11) ---
  "confirm.closeTitle": ["Suljetaanko tiedosto?", "Close the file?"],
  "confirm.closeMessage": [
    "Kirjanpidossa on muutoksia, joita ei ole tallennettu tiedostoon. Jos suljet sen, ne menetetään.",
    "There are changes that haven’t been saved to a file. If you close it, they’ll be lost.",
  ],
  "confirm.closeConfirm": ["Sulje tallentamatta", "Close without saving"],
  "confirm.overwriteTitle": ["Korvataanko tiedosto?", "Overwrite the file?"],
  "confirm.overwriteMessage": [
    "Tiedostoa {f} on muutettu tämän sovelluksen ulkopuolella sen jälkeen, kun se avattiin. Tallennus korvaa nuo muutokset.",
    "The file {f} has been changed outside this app since it was opened. Saving will overwrite those changes.",
  ],
  "confirm.overwriteConfirm": ["Korvaa", "Overwrite"],
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
    "Avoimessa kirjanpidossa on muutoksia, joita ei ole tallennettu. Avattava tiedosto korvaa ne.",
    "The open bookkeeping has changes that haven’t been saved. The file you open will replace them.",
  ],
  "confirm.replaceConfirm": ["Korvaa", "Replace"],
  "confirm.clearTitle": ["Tyhjennetäänkö kirjaukset?", "Clear all entries?"],
  "confirm.clearMessage": [
    "Kaikki kirjaukset poistetaan tästä selaimesta. Tallenna ne ensin tiedostoon, jos haluat säilyttää ne.",
    "All entries will be removed from this browser. Save them to a file first if you want to keep them.",
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
  "common.allTypes": ["Kaikki tyypit", "All types"],
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
  "common.result": ["Tulos", "Result"],
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

  // --- Overview (§8.12) ---
  "overview.subtitle": ["Tilikausi {y}", "Financial year {y}"],
  "overview.newEntry": ["Uusi kirjaus", "New entry"],
  "overview.edit": ["Muokkaa näkymää", "Edit layout"],
  "overview.done": ["Valmis", "Done"],
  "overview.reset": ["Palauta oletus", "Reset layout"],
  "overview.editHint": [
    "Raahaa widgettiä kahvasta tai siirrä sitä nuolilla. Asettelu tallentuu kirjanpitotiedostoon.",
    "Drag a widget by its handle or move it with the arrows. The layout is saved in the bookkeeping file.",
  ],
  "overview.hidden": ["Piilotetut:", "Hidden:"],
  "overview.allHidden": [
    "Kaikki widgetit on piilotettu.",
    "Every widget is hidden.",
  ],
  "overview.drag": ["Siirrä: {w}", "Move {w}"],
  "overview.moveEarlier": ["Siirrä aiemmaksi", "Move earlier"],
  "overview.moveLater": ["Siirrä myöhemmäksi", "Move later"],
  "overview.widen": ["Levennä", "Widen"],
  "overview.narrow": ["Kavenna", "Narrow"],
  "overview.hide": ["Piilota", "Hide"],
  "overview.show": ["Näytä {w}", "Show {w}"],
  /*
   * The drag library's screen-reader texts, which it would otherwise speak
   * in English whatever the UI language.
   */
  "overview.dndInstructions": [
    "Nosta widget välilyönnillä tai Enterillä, siirrä sitä nuolinäppäimillä ja pudota välilyönnillä tai Enterillä. Escape peruu siirron.",
    "Press Space or Enter to pick up a widget, move it with the arrow keys, and press Space or Enter again to drop it. Escape cancels.",
  ],
  "overview.dndRole": ["siirrettävä widget", "movable widget"],
  "overview.dndPicked": ["{w} nostettu.", "Picked up {w}."],
  "overview.dndOver": ["{w} kohdan {o} paikalla.", "{w} is over {o}."],
  "overview.dndDropped": ["{w} pudotettu.", "Dropped {w}."],
  "overview.dndCancelled": ["Siirto peruttu.", "Move cancelled."],

  "overview.widgetResult": ["Tulos", "Result"],
  "overview.widgetVat": ["Seuraava ALV-ilmoitus", "Next VAT return"],
  "overview.widgetMonths": ["Kuukaudet", "Months"],
  "overview.widgetSales": ["Myynti", "Sales"],
  "overview.widgetExpenses": ["Kulut ryhmittäin", "Expenses by group"],
  "overview.widgetRecent": ["Viimeisimmät kirjaukset", "Latest entries"],
  "overview.widgetChecks": ["Tarkistettavaa", "To check"],

  "overview.range": ["{a}–{b}", "{a} – {b}"],
  "overview.resultFormula": [
    "Tulot {a} − vähennyskelpoiset kulut {b}",
    "Income {a} − deductible expenses {b}",
  ],
  "overview.entries": ["Kirjauksia", "Entries"],
  "overview.margin": ["Tulosprosentti", "Profit margin"],
  "overview.yearVat": ["ALV, koko vuosi", "VAT, whole year"],
  "overview.sparkLabel": [
    "Kertynyt tulos kuukausittain, nyt {a}",
    "Cumulative result by month, now {a}",
  ],

  "overview.vatNext": ["Seuraava ALV-ilmoitus · {p}", "Next VAT return · {p}"],
  "overview.payable": ["Maksettava", "Payable"],
  "overview.refundable": ["Palautettava", "Refundable"],
  "overview.noVat": ["Ei veroa", "No VAT"],
  "overview.nilReturn": ["Nollailmoitus", "Nil return"],
  "overview.vatFormula": [
    "{w} · myynnin vero {a} − ostojen vero {b}",
    "{w} · sales VAT {a} − purchase VAT {b}",
  ],
  "overview.dueDate": ["Eräpäivä {d}", "Due {d}"],
  "overview.dueToday": ["tänään", "today"],
  "overview.daysLeft": [pl("1 päivä", "{n} päivää"), pl("1 day", "{n} days")],
  "overview.daysLate": [
    pl("1 pv myöhässä", "{n} pv myöhässä"),
    pl("1 day late", "{n} days late"),
  ],
  "overview.periodOpen": [
    "Jakso on kesken, joten luku voi vielä muuttua.",
    "The period is still running, so the figure can change.",
  ],
  "overview.periodClosed": [
    "Jakso on päättynyt. Ilmoita se OmaVerossa.",
    "The period has ended. File it in OmaVero.",
  ],
  "overview.periodLate": [
    "Eräpäivä on mennyt. Ilmoita se OmaVerossa.",
    "The due date has passed. File it in OmaVero.",
  ],
  "overview.otherSalesToo": [
    "Ilmoita myös EU-myynti ja käänteisen verotuksen myynti.",
    "Report the EU and reverse-charge sales too.",
  ],
  "overview.after": ["Sen jälkeen: {p}", "After that: {p}"],
  "overview.upcoming": ["tulossa", "upcoming"],
  "overview.running": ["kesken", "in progress"],
  "overview.markFiled": ["Merkitse ilmoitetuksi", "Mark as filed"],
  "overview.markedFiled": ["{p} merkitty ilmoitetuksi", "{p} marked as filed"],
  "overview.undo": ["Peru", "Undo"],
  "overview.earlierFiled": [
    "Aiemmat jaksot on ilmoitettu",
    "Earlier periods are filed",
  ],

  "overview.monthsHint": [
    "Verottomat summat. Valitse kuukausi avataksesi sen kirjaukset.",
    "Net amounts. Pick a month to open its entries.",
  ],
  "overview.bestMonth": ["Paras kuukausi", "Best month"],
  "overview.avgIncome": ["Tulot keskimäärin", "Average income"],
  "overview.avgExpenses": ["Kulut keskimäärin", "Average expenses"],
  "overview.perMonth": ["{a} / kk", "{a} / month"],
  "overview.activeMonths": ["Kuukausia kirjauksin", "Months with entries"],

  "overview.salesDomestic": ["Suomi", "Finland"],
  "overview.otherIncome": ["Muut tulot (301–324)", "Other income (301–324)"],
  "overview.emptyBuckets": [
    pl("1 ryhmä ilman kuluja.", "{n} ryhmää ilman kuluja."),
    pl("1 group with no expenses.", "{n} groups with no expenses."),
  ],

  "overview.allEntries": ["Kaikki kirjaukset", "All entries"],
  "overview.noReceipt": ["ei tositetta", "no receipt"],
  "overview.noEntriesYear": [
    "Ei kirjauksia vuodelta {y}.",
    "No entries for {y}.",
  ],

  "overview.openCount": [
    pl("1 avoinna", "{n} avoinna"),
    pl("1 open", "{n} open"),
  ],
  "overview.vatOverdue": [
    "{p}: ALV-ilmoitus myöhässä",
    "{p}: VAT return overdue",
  ],
  "overview.vatOverdueSub": ["Eräpäivä oli {d}.", "It was due {d}."],
  "overview.vatDue": [
    "{p}: ALV-ilmoitus erääntyy {d}",
    "{p}: VAT return due {d}",
  ],
  "overview.filed": ["Ilmoitettu", "Filed"],
  "overview.withoutReceipt": [
    pl("1 kirjaus ilman tositetta", "{n} kirjausta ilman tositetta"),
    pl("1 entry without a receipt", "{n} entries without a receipt"),
  ],
  "overview.withoutReceiptSub": [
    "Liitä kirjaukseen kuva tai PDF.",
    "Attach a photo or a PDF to the entry.",
  ],
  "overview.showThem": ["Näytä", "Show"],
  "overview.rateMismatch": [
    pl(
      "1 kirjaus, jonka verokanta ei vastaa päivämäärää",
      "{n} kirjausta, joiden verokanta ei vastaa päivämäärää"
    ),
    pl(
      "1 entry whose VAT rate doesn’t fit its date",
      "{n} entries whose VAT rate doesn’t fit their date"
    ),
  ],
  "overview.rateMismatchSub": [
    "Esimerkiksi 25,5 % ennen 1.9.2024. Korjaukset voivat olla tarkoituksella vanhalla verokannalla.",
    "For example 25.5% before 1 Sep 2024. Corrections can carry an older rate on purpose.",
  ],
  "overview.missingFiles": [
    pl("1 tosite puuttuu tiedostosta", "{n} tositetta puuttuu tiedostosta"),
    pl(
      "1 receipt is missing from the file",
      "{n} receipts are missing from the file"
    ),
  ],
  "overview.missingFilesSub": [
    "Ne on listattu CSV-tiedostossa, mutta itse tiedostoja ei löytynyt.",
    "The CSV lists them, but the files themselves were not found.",
  ],
  "overview.emptyMonths": ["Ei kirjauksia: {m}", "No entries: {m}"],
  "overview.emptyMonthsSub": [
    "Tarkista, puuttuuko tositteita.",
    "Check whether any receipts are missing.",
  ],
  "overview.allClear": ["Ei tarkistettavaa.", "Nothing to check."],

  "overview.emptyTitle": ["Ei vielä kirjauksia", "No entries yet"],
  "overview.emptyBody": [
    "Kirjaa ensimmäinen tosite tai avaa aiempi kirjanpito CSV- tai ZIP-tiedostona. Yleiskatsaus täyttyy sitä mukaa kuin kirjaat.",
    "Record your first receipt, or open an earlier bookkeeping as a CSV or ZIP file. The overview fills in as you go.",
  ],
  "overview.step1Title": [
    "Kirjaa tulot ja kulut",
    "Record income and expenses",
  ],
  "overview.step1Body": [
    "Pudota kuitti tai lasku sivulle, niin kirjaus alkaa siitä.",
    "Drop a receipt or an invoice on the page to start an entry from it.",
  ],
  "overview.step2Title": [
    "Valitse ALV-ilmoitusjakso",
    "Choose your VAT reporting period",
  ],
  "overview.step2Body": [
    "Asetuksista. Eräpäivät näkyvät täällä ensimmäisestä kirjauksesta alkaen.",
    "In Settings. The due dates appear here from your first entry on.",
  ],
  "overview.step3Title": ["Tallenna tiedostoon", "Save to a file"],
  "overview.step3Body": [
    "Tiedosto on kirjanpitosi. Selain on vain työtila.",
    "The file is your bookkeeping. The browser is only a workspace.",
  ],

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
  "ledger.checkFilter": ["Tarkistettavat", "Needs a look"],
  "ledger.checkAll": ["Kaikki kirjaukset", "All entries"],
  "ledger.withoutReceipt": ["Ilman tositetta", "Without a receipt"],
  "ledger.rateMismatch": [
    "Verokanta ei vastaa päivää",
    "Rate doesn’t fit the date",
  ],
  "ledger.copyAsNew": ["Kopioi", "Copy"],
  "ledger.deleteEntry": ["Poista kirjaus", "Delete entry"],

  // --- Entry dialog (§8.5) ---
  "entry.editTitle": ["Muokkaa kirjausta", "Edit entry"],
  "entry.copyTitle": ["Kopio kirjaus", "Copied entry"],
  "entry.date": ["Päivämäärä", "Date"],
  "entry.description": ["Selite", "Description"],
  "entry.descriptionPlaceholder": [
    "Esim. Lasku 1006 – Asiakas Oy",
    "E.g. Invoice 1006 – Client Ltd",
  ],
  "entry.category": ["Luokka", "Category"],
  "entry.amount": ["Summa (€)", "Amount (€)"],
  "entry.vatRate": ["ALV %", "VAT %"],
  "entry.rateNotYet": [
    "{r} on voimassa {d} alkaen. Tälle päivälle verokanta on {s}.",
    "{r} applies from {d}. The rate for this date is {s}.",
  ],
  "entry.rateEnded": [
    "{r} oli voimassa {d} asti. Tälle päivälle verokanta on {s}.",
    "{r} applied until {d}. The rate for this date is {s}.",
  ],
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
  "receipt.prefilled": [
    "Tiedot luettiin PDF:stä. Tarkista ne ennen tallennusta.",
    "Details were read from the PDF. Check them before saving.",
  ],
  "receipt.invoiceDescription": ["Lasku {number}", "Invoice {number}"],
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
  "vat.quarterShort": ["{q}. nelj.", "Q{q}"],
  "vat.filed": ["Ilmoitettu", "Filed"],
  "vat.filedOn": ["Merkitty ilmoitetuksi {d}", "Marked as filed on {d}"],
  "vat.overdue": ["Myöhässä", "Overdue"],
  "vat.dueShort": ["Erä {d}", "Due {d}"],
  "vat.dueDate": ["Eräpäivä {d}", "Due {d}"],
  "vat.running": ["Kesken", "In progress"],
  "vat.upcoming": ["Tulossa", "Upcoming"],
  "vat.beforeStart": ["Ei ilmoitusta", "No return"],
  "vat.beforeStartHint": [
    "Jakso päättyi ennen kirjanpidon aloituskuukautta, joten siitä ei anneta ilmoitusta.",
    "The period ended before the month the bookkeeping began, so no return is filed for it.",
  ],
  "vat.markFiled": ["Merkitse ilmoitetuksi", "Mark as filed"],
  "vat.unmarkFiled": ["Poista merkintä", "Remove the mark"],
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
  // An EU, non-EU or reverse-charge sale that carries a VAT rate (§6.1).
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
  "statement.revenueTotal": [
    "Veronalaiset tuotot yhteensä",
    "Total taxable revenue",
  ],
  "statement.exemptNote": [
    "Tuloslaskelman verovapaat tuotot (317, yhteensä {a}) ilmoitetaan erikseen, eivätkä ne sisälly tulokseen.",
    "Tax-exempt income (317, total {a}) is reported separately and is not part of the result.",
  ],
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
    "Asetukset tallentuvat kirjanpitotiedostoon, kun tallennat sen.",
    "Settings are saved with the bookkeeping file when you save it.",
  ],
  "settings.sections": ["Asetusten osiot", "Settings sections"],
  "settings.general": ["Yleiset", "General"],
  "settings.vatPeriod": ["ALV-ilmoitusjakso", "VAT reporting period"],
  "settings.vatPeriodHint": [
    "Kuinka usein annat arvonlisäveroilmoituksen. Yleiskatsauksen eräpäivät lasketaan tämän mukaan.",
    "How often you file a VAT return. The due dates on the overview follow it.",
  ],
  "settings.bookStart": ["Kirjanpidon aloitus", "Start of the bookkeeping"],
  "settings.bookStartHint": [
    "Kuukausi, jona yritystoiminta alkoi. Sitä aiemmista jaksoista ei odoteta ALV-ilmoitusta. Ilman valintaa ilmoitukset lasketaan ensimmäisestä kirjauksesta alkaen.",
    "The month the business began. No VAT return is expected for the periods before it. Without a choice, returns are counted from the first entry.",
  ],
  "settings.bookStartMonth": ["Aloituskuukausi", "Start month"],
  "settings.bookStartYear": ["Aloitusvuosi", "Start year"],
  "settings.bookStartNone": [
    "Ensimmäisestä kirjauksesta",
    "From the first entry",
  ],
  "settings.saving": ["Tallennus", "Saving"],
  "settings.autosave": ["Tallenna automaattisesti", "Save automatically"],
  "settings.autosaveHint": [
    "Kirjanpito tallentuu avattuun tiedostoon muutama sekunti jokaisen muutoksen jälkeen. Kumoamista ei ole, joten poistettu kirjaus poistuu myös tiedostosta. Jos selain kysyisi jotain, tallennus odottaa, kunnes tallennat kerran itse.",
    "The bookkeeping is saved to the opened file a few seconds after each change. There is no undo, so a deleted entry is gone from the file too. If the browser would have to ask anything, autosave waits until you save once yourself.",
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
  "settings.defaultCategories": ["Oletusluokat", "Default categories"],
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
  "io.receiptsRejected": [
    " Ohitettu {n}: vain kuvia ja PDF-tiedostoja voi liittää.",
    " Skipped {n}: only images and PDF files can be attached.",
  ],
  "io.dropHere": [
    "Pudota CSV- tai ZIP-tiedosto avataksesi sen",
    "Drop a CSV or ZIP file to open it",
  ],
  /* Neutral on purpose: the row that opens this dialog has two names. */
  "io.exportTitle": ["Lataa kirjanpito", "Download bookkeeping"],
  "io.fileNameLabel": ["Tiedoston nimi", "File name"],
  "io.exportHint": [
    "Tiedosto sisältää kaikkien tilikausien kirjaukset.",
    "The file includes the entries of all financial years.",
  ],
  "io.exportAction": ["Lataa", "Download"],
  "io.csvOnly": ["Lataa vain CSV-tiedosto", "Download only the CSV file"],
  /*
   * The paths are written either way, so a re-import still knows the receipts
   * existed — it just marks them missing. The settings have no such fallback.
   */
  "io.csvOnlyHint": [
    "CSV-tiedostoon tulevat vain kirjaukset. Tositteet ja asetukset, kuten ilmoitetuiksi merkityt ALV-jaksot, jäävät pois. Tositteiden polut säilyvät, joten ne voi yhdistää myöhemmin uudelleen.",
    "The CSV holds the entries only. Receipts and settings, such as the VAT returns marked as filed, are left out. Receipt paths are kept, so they can be reconnected later.",
  ],
  "io.zipHint": [
    pl(
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston, asetukset ja 1 tositteen kansiossa vuoden ja kuukauden mukaan.",
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston, asetukset ja {n} tositetta kansioissa vuoden ja kuukauden mukaan."
    ),
    pl(
      "The ZIP file contains the bookkeeping CSV, the settings and 1 receipt in a folder by year and month.",
      "The ZIP file contains the bookkeeping CSV, the settings and {n} receipts in folders by year and month."
    ),
  ],
  "io.zipHintNoReceipts": [
    "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston ja asetukset.",
    "The ZIP file contains the bookkeeping CSV and the settings.",
  ],
  "io.nothingToExport": [
    "Ei vietävää. Lisää ensin kirjauksia.",
    "Nothing to export. Add some entries first.",
  ],
  "io.exporting": ["Pakataan tositteita…", "Packing receipts…"],
  "io.exported": ["Ladattu tiedostoon {f}.", "Downloaded as {f}."],

  // --- Saving back to the opened file (§7.5) ---
  "io.saving": ["Tallennetaan…", "Saving…"],
  "io.saved": ["Tallennettu tiedostoon {f}.", "Saved to {f}."],
  "io.saveFailed": ["Tallennus epäonnistui.", "Couldn’t save the file."],
  "io.saveDenied": [
    "Selain ei antanut lupaa kirjoittaa tiedostoon. Voit silti ladata kopion.",
    "The browser didn’t allow writing to the file. You can still download a copy.",
  ],
  "io.fileGone": [
    "Tiedostoa ei enää löydy. Valitse, mihin kirjanpito tallennetaan.",
    "That file can’t be found any more. Choose where to save the bookkeeping.",
  ],
  "io.shapeChanged": [
    "Kirjanpito tallennetaan nyt nimellä {f}, koska asetukset ja tositteet eivät mahdu CSV-tiedostoon. Valitse, mihin.",
    "The bookkeeping is now saved as {f}, because its settings and receipts don’t fit in a CSV file. Choose where.",
  ],
  "io.exportFailed": [
    "Kopion lataaminen epäonnistui.",
    "Couldn’t download the copy.",
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
