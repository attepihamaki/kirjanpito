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
  "app.waitingForTab": [
    "Jatka siellä tai sulje se välilehti. Tämä välilehti avautuu silloin itsestään.",
    "Continue there or close that tab. This tab then opens by itself.",
  ],
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
  /*
   * Shown when a write to localStorage fails (§12): private browsing,
   * blocked site data or a full quota. Only the file keeps the work then.
   */
  "file.storageTitle": [
    "Selain ei pysty säilyttämään työtä",
    "The browser can’t keep your work",
  ],
  "file.storageMessage": [
    "Muutokset ovat vain tällä sivulla. Tallenna tai lataa kirjanpito tiedostoksi, ennen kuin suljet sivun.",
    "Your changes exist only on this page. Save or download the bookkeeping before you close it.",
  ],
  "file.storageNote": [
    "Selain ei säilytä muutoksia. Vain tiedosto pitää ne tallessa.",
    "The browser isn’t keeping your changes. Only the file does.",
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
  "confirm.receiptsLostTitle": [
    "Jätetäänkö tositteet pois?",
    "Leave the receipts out?",
  ],
  "confirm.receiptsLostMessage": [
    pl(
      "1 tosite ei löydy selaimesta eikä tiedostosta {f}. Tallennus jättää sen pois, ja jos se on tiedostossa toisella nimellä, se katoaa sieltä.",
      "{n} tositetta ei löydy selaimesta eikä tiedostosta {f}. Tallennus jättää ne pois, ja jos ne ovat tiedostossa toisella nimellä, ne katoavat sieltä."
    ),
    pl(
      "1 receipt isn’t in this browser or in the file {f}. Saving leaves it out, and if the file holds it under another name, it is lost from there.",
      "{n} receipts aren’t in this browser or in the file {f}. Saving leaves them out, and if the file holds them under other names, they are lost from there."
    ),
  ],
  "confirm.receiptsLostConfirm": ["Tallenna silti", "Save anyway"],
  "confirm.deleteTitle": ["Poistetaanko kirjaus?", "Delete this entry?"],
  "confirm.deleteManyTitle": [
    pl("Poistetaanko 1 kirjaus?", "Poistetaanko {n} kirjausta?"),
    pl("Delete 1 entry?", "Delete {n} entries?"),
  ],
  "confirm.deleteManyMessage": [
    "Valitut kirjaukset poistetaan. Voit perua poiston heti sen jälkeen.",
    "The selected entries will be deleted. You can undo it right after.",
  ],
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
  // The fill-in forms for OmaVero (§8.7, §8.8).
  "common.formShow": ["Näytettävät kohdat", "Fields to show"],
  "common.formFill": ["Täytettävät", "To fill in"],
  "common.formAll": ["Kaikki kohdat", "All fields"],
  "common.formOpenOmaVero": ["Avaa OmaVero", "Open MyTax"],
  "common.formStepInput": ["Syötä OmaVeroon", "Enter in MyTax"],
  "common.formProgress": ["{n}/{m} kopioitu", "{n}/{m} copied"],
  "common.formAllDone": [
    "Kaikki kohdat kopioitu. Tarkista vielä yhteissummat.",
    "Every field copied. Check the totals too.",
  ],
  "common.formStepCheck": ["Tarkista yhteissummat", "Check the totals"],
  "common.formCheckHint": [
    "Vertaa näitä OmaVeron lukuihin. Niiden pitää täsmätä.",
    "Compare these with the figures in MyTax. They should match.",
  ],
  "common.formNotIncluded": [
    "Mitä laskelma ei sisällä",
    "What this does not cover",
  ],
  "common.formNoAmount": ["Ei summaa", "No amount"],
  "common.formCopyField": [
    "Kopioi kohta {code}: {v}",
    "Copy field {code}: {v}",
  ],
  "common.formCopied": [
    "Kopioitu: kohta {code}, {v}. Kopioi uudelleen",
    "Copied: field {code}, {v}. Copy again",
  ],
  "common.formCopyFailed": [
    "Kopiointi ei onnistunut. Selain ei salli leikepöydän käyttöä.",
    "Could not copy. The browser does not allow clipboard access.",
  ],
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
  "common.undo": ["Kumoa", "Undo"],
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
  "overview.widgetBank": ["Pankkitili", "Bank account"],
  "overview.widgetMonths": ["Kuukaudet", "Months"],
  "overview.widgetSales": ["Myynti", "Sales"],
  "overview.widgetExpenses": ["Kulut ryhmittäin", "Expenses by group"],
  "overview.widgetRecent": ["Viimeisimmät kirjaukset", "Latest entries"],
  "overview.widgetChecks": ["Tarkistettavaa", "To check"],

  "overview.bankOn": ["Pankkitilin saldo {d}", "Bank balance on {d}"],
  "overview.bankMovement": [
    "Kirjaukset sen jälkeen ({n})",
    "Entries since then ({n})",
  ],
  "overview.bankEstimate": ["Arvio tänään", "Estimate for today"],
  "overview.bankEstimateNote": [
    "Arvio laskee kirjaukset päivämäärän mukaan, ei maksupäivän. Siinä eivät näy verojen maksut, yksityisotot eivätkä omat talletukset.",
    "The estimate goes by each entry’s date, not the day it was paid. It leaves out tax payments, private withdrawals and your own deposits.",
  ],
  "overview.bankUpdate": ["Päivitä saldo", "Update balance"],
  "overview.bankEmpty": [
    "Kirjanpito ei näe pankkiasi. Syötä saldo pankista, niin se näkyy tässä.",
    "The app cannot see your bank. Enter the balance from your bank and it shows here.",
  ],
  "overview.bankAmount": ["Saldo (€)", "Balance (€)"],
  "overview.bankDate": ["Päivä", "Date"],
  "overview.bankSave": ["Tallenna saldo", "Save balance"],
  "overview.bankRemove": ["Poista saldo", "Remove balance"],
  "overview.bankAmountError": [
    "Anna saldo, esim. 1 250,00.",
    "Enter the balance, e.g. 1 250,00.",
  ],
  "overview.bankDateError": [
    "Anna päivä, joka ei ole tulevaisuudessa.",
    "Enter a date that is not in the future.",
  ],

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
  "overview.futureDate": [
    pl(
      "1 kirjaus on päivätty tulevaisuuteen",
      "{n} kirjausta on päivätty tulevaisuuteen"
    ),
    pl("1 entry is dated in the future", "{n} entries are dated in the future"),
  ],
  "overview.futureDateSub": [
    "Tarkista vuosi ja kuukausi.",
    "Check the year and the month.",
  ],
  "overview.zeroVatSale": [
    pl(
      "1 kotimaan myynti ilman arvonlisäveroa",
      "{n} kotimaan myyntiä ilman arvonlisäveroa"
    ),
    pl("1 domestic sale without VAT", "{n} domestic sales without VAT"),
  ],
  "overview.zeroVatSaleSub": [
    "Muussa kotimaan myynnissä on veroa. Tarkista, että tämä myynti on verotonta.",
    "Your other domestic sales carry VAT. Check that this sale is exempt.",
  ],
  "overview.largeAmount": [
    pl("1 poikkeuksellisen suuri summa", "{n} poikkeuksellisen suurta summaa"),
    pl("1 unusually large amount", "{n} unusually large amounts"),
  ],
  "overview.largeAmountSub": [
    "Yli kymmenen kertaa tavallinen kirjaus. Tarkista desimaalipilkun paikka.",
    "Over ten times a typical entry. Check where the decimal separator is.",
  ],
  "overview.duplicate": [
    pl("1 mahdollinen kaksoiskirjaus", "{n} mahdollista kaksoiskirjausta"),
    pl("1 possible duplicate", "{n} possible duplicates"),
  ],
  "overview.duplicateSub": [
    "Sama päivä ja summa tai sama tositetiedosto kuin toisella kirjauksella.",
    "Same date and amount, or the same receipt file, as another entry.",
  ],
  "overview.vatNotDeductible": [
    pl(
      "1 kulu, jonka arvonlisävero ei ole vähennettävää",
      "{n} kulua, joiden arvonlisävero ei ole vähennettävää"
    ),
    pl(
      "1 expense whose VAT can’t be deducted",
      "{n} expenses whose VAT can’t be deducted"
    ),
  ],
  "overview.vatNotDeductibleSub": [
    "Edustuskulujen ja vähennyskelvottomien kulujen vero lasketaan nyt ostojen veroksi. Kirjaa ne 0 %:lla.",
    "VAT on entertainment and non-deductible expenses is now counted as purchase VAT. Book them at 0 %.",
  ],
  "overview.yearClosed": [
    "Tilikausi {y} on päättynyt",
    "Financial year {y} has ended",
  ],
  "overview.yearClosedSub": [
    "Ota tiedostosta talteen kopio, jota et enää muokkaa. Säilytä kirjanpito {b} ja tositteet {v} asti.",
    "Put away a copy of the file that you no longer edit. Keep the books until {b} and the vouchers until {v}.",
  ],
  "overview.yearStored": ["Tallessa", "Stored"],
  "overview.yearStoredDone": [
    "Vuosi {y} merkitty tallessa olevaksi.",
    "Year {y} marked as stored.",
  ],
  "overview.threshold": [
    "Liikevaihto {y}: {a} / {l}",
    "Turnover {y}: {a} / {l}",
  ],
  "overview.thresholdSub": [
    "Myynneissäsi ei ole arvonlisäveroa. Arvonlisäverovelvollisuus alkaa, kun kalenterivuoden liikevaihto ylittää {l}.",
    "Your sales carry no VAT. VAT liability starts when a calendar year’s turnover exceeds {l}.",
  ],
  "overview.thresholdNearSub": [
    "Raja lähestyy. Verovelvollisuus alkaa päivästä, jona {l} ylittyy, joten ilmoittaudu ajoissa.",
    "The limit is close. VAT liability starts on the day turnover exceeds {l}, so register in good time.",
  ],
  "overview.thresholdOver": [
    "Liikevaihto ylitti arvonlisäverorajan {d}",
    "Turnover exceeded the VAT limit on {d}",
  ],
  "overview.thresholdOverSub": [
    "Verovelvollisuus alkaa tästä päivästä, ja rajan ylittävä myynti on verollista. Ilmoittaudu arvonlisäverovelvolliseksi, jos et ole jo tehnyt niin. Raja on {l} kalenterivuodessa.",
    "VAT liability starts on this date, and the sale that exceeds the limit is taxable. Register for VAT if you haven’t yet. The limit is {l} per calendar year.",
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
    "Hae selitteestä, luokasta tai numerolla",
    "Search description, category or number",
  ],
  "ledger.colDate": ["Päivämäärä", "Date"],
  "ledger.selectRow": ["Valitse kirjaus {x}", "Select entry {x}"],
  "ledger.selectPage": [
    "Valitse sivun kirjaukset",
    "Select the entries on this page",
  ],
  "ledger.selected": [
    pl("1 valittu", "{n} valittu"),
    pl("1 selected", "{n} selected"),
  ],
  "ledger.bulkCategory": ["Vaihda luokka", "Change category"],
  "ledger.bulkMixed": [
    "Luokan voi vaihtaa, kun valitut ovat kaikki tuloja tai kaikki kuluja.",
    "To change the category, select only income or only expenses.",
  ],
  "ledger.bulkDelete": ["Poista valitut", "Delete selected"],
  "ledger.bulkClear": ["Poista valinta", "Clear selection"],
  "ledger.colAccount": ["Tili", "Account"],
  "ledger.sections": ["Kirjanpidon osiot", "Bookkeeping sections"],
  "ledger.entriesTab": ["Kirjaukset", "Entries"],
  "ledger.journalTab": ["Päiväkirja", "Journal"],
  "ledger.accountsTab": ["Pääkirja", "General ledger"],
  "ledger.journalTitle": ["Päiväkirja {y}", "Journal {y}"],
  "ledger.accountsTitle": ["Pääkirja {y}", "General ledger {y}"],
  "ledger.journalSub": [
    "kirjaukset aikajärjestyksessä",
    "entries in date order",
  ],
  "ledger.accountsSub": ["kirjaukset tileittäin", "entries by account"],
  "ledger.incomeTotal": ["Tulot yhteensä", "Total income"],
  "ledger.expenseTotal": ["Menot yhteensä", "Total expenses"],
  "ledger.noEntriesYear": ["Ei kirjauksia vuonna {y}.", "No entries in {y}."],
  "ledger.print": ["Tulosta", "Print"],
  /* KPL 2:10, checked on Finlex. */
  "ledger.retention": [
    "Säilytä päiväkirja ja pääkirja vähintään {b} asti (10 vuotta tilikauden päättymisestä) ja tositteet vähintään {v} asti (6 vuotta sen vuoden lopusta, jona tilikausi päättyi). Kirjanpitolaki 2:10.",
    "Keep the journal and the general ledger until at least {b} (10 years from the end of the financial year), and the vouchers until at least {v} (6 years from the end of the year in which it ended). Accounting Act 2:10.",
  ],
  /* The voucher number (tositenumero, §4); "tosite" alone is the receipt file. */
  "ledger.colVoucher": ["Nro", "No."],
  "ledger.colDescription": ["Selite", "Description"],
  "ledger.colCategory": ["Luokka", "Category"],
  "ledger.colNet": ["Veroton", "Net"],
  "ledger.colGross": ["Verollinen", "Gross"],
  "ledger.noDescription": ["Ei selitettä", "No description"],
  "ledger.hitsElsewhere": ["Osumia myös muualla:", "Also found elsewhere:"],
  "ledger.hitsInYear": [
    pl("Näytä vuosi {y}, 1 osuma", "Näytä vuosi {y}, {n} osumaa"),
    pl("Show {y}, 1 match", "Show {y}, {n} matches"),
  ],
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
  "ledger.futureDate": ["Päivä tulevaisuudessa", "Date in the future"],
  "ledger.zeroVatSale": [
    "Kotimaan myynti ilman ALV:tä",
    "Domestic sale without VAT",
  ],
  "ledger.largeAmount": [
    "Poikkeuksellisen suuri summa",
    "Unusually large amount",
  ],
  "ledger.duplicate": ["Mahdollinen kaksoiskirjaus", "Possible duplicate"],
  "ledger.vatNotDeductible": ["ALV ei vähennettävää", "VAT not deductible"],
  "ledger.copyAsNew": ["Kopioi", "Copy"],
  "ledger.deleteEntry": ["Poista kirjaus", "Delete entry"],

  // --- Entry dialog (§8.5) ---
  "entry.editTitle": ["Muokkaa kirjausta", "Edit entry"],
  "entry.voucher": ["Tositenumero {n}", "Voucher number {n}"],
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
  "entry.duplicateOf": [
    "Samana päivänä on jo kirjaus samalla summalla: nro {n}, {d}.",
    "There is already an entry with this date and amount: no. {n}, {d}.",
  ],
  "entry.vatNotDeductible341": [
    "Edustuskulujen arvonlisäveroa ei saa vähentää (AVL 114 §). Kirjaa verollinen summa 0 %:n verokannalla, niin vero jää osaksi kulua.",
    "VAT on entertainment can’t be deducted (VAT Act 114 §). Book the amount including VAT at 0 %, so the tax stays part of the cost.",
  ],
  "entry.vatNotDeductible": [
    "Vähennyskelvottoman kulun arvonlisäveroa ei voi vähentää. Kirjaa verollinen summa 0 %:n verokannalla, niin vero jää osaksi kulua.",
    "VAT on a non-deductible expense can’t be deducted. Book the amount including VAT at 0 %, so the tax stays part of the cost.",
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
  "entry.deletedMany": [
    pl("1 kirjaus poistettu.", "{n} kirjausta poistettu."),
    pl("1 entry deleted.", "{n} entries deleted."),
  ],
  "entry.restoredMany": ["Kirjaukset palautettu.", "Entries restored."],
  "entry.addUndone": ["Lisäys kumottu.", "Addition undone."],
  "entry.recategorized": [
    pl("Luokka vaihdettu 1 kirjaukseen.", "Luokka vaihdettu {n} kirjaukseen."),
    pl("Category changed on 1 entry.", "Category changed on {n} entries."),
  ],
  "entry.recategorizeUndone": ["Luokat palautettu.", "Categories restored."],
  "entry.restored": ["Kirjaus palautettu.", "Entry restored."],
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
  "receipt.attachedElsewhere": [
    "Sama tiedosto on jo kirjauksessa nro {n}, {d}.",
    "The same file is already on entry no. {n}, {d}.",
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
  /*
   * A change to an entry in a period already marked as filed (§8.11). The
   * fixes follow Vero's instructions for correcting a VAT return: a
   * replacement return for the period, or the next return when only the tax
   * changes and by at most 500 €.
   */
  "vat.filedChangeTitle": [
    "Muutetaanko ilmoitettua kautta?",
    "Change a filed period?",
  ],
  "vat.filedChangeMarked": [
    "{p} on merkitty ilmoitetuksi {d}.",
    "{p} was marked as filed on {d}.",
  ],
  "vat.filedChangeTaxUp": [
    "Maksettava vero kasvaa {x}.",
    "The tax payable goes up by {x}.",
  ],
  "vat.filedChangeTaxDown": [
    "Maksettava vero pienenee {x}.",
    "The tax payable goes down by {x}.",
  ],
  "vat.filedChangeTaxSame": [
    "Vero ei muutu, mutta ilmoitetut luvut muuttuvat.",
    "The tax stays the same, but the reported figures change.",
  ],
  "vat.filedChangeFixNext": [
    "Korjaa ero seuraavalla ilmoituksella tai anna kaudelle korvaava ilmoitus OmaVerossa.",
    "Correct the difference on your next return, or file a replacement return for the period in OmaVero.",
  ],
  "vat.filedChangeFixReplace": [
    "Anna kaudelle korvaava ilmoitus OmaVerossa.",
    "File a replacement return for the period in OmaVero.",
  ],
  "vat.filedChangeSave": ["Tallenna silti", "Save anyway"],
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
  "vat.euGoodsSales": [
    "Tavaroiden myynti muihin EU-maihin",
    "Sales of goods to other EU countries",
  ],
  "vat.euServicesSales": [
    "Palveluiden myynti muihin EU-maihin",
    "Sales of services to other EU countries",
  ],
  "vat.euUnsortedSales": [
    "EU-myynti, ei merkitty tavaraksi tai palveluksi",
    "EU sales not marked as goods or services",
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
  "vat.sections": ["ALV-laskelman osiot", "VAT return sections"],
  "vat.sheetTab": ["Laskelma", "Calculation"],
  "vat.returnTab": ["Ilmoitus", "Return"],
  "vat.returnTitle": ["Arvonlisäveroilmoitus", "VAT return"],
  "vat.returnKicker": ["{p}, eräpäivä {d}", "{p}, due {d}"],
  "vat.returnIntro": [
    "Napsauta summaa, niin se kopioituu. Liitä se OmaVerossa samannimiseen kohtaan.",
    "Click an amount to copy it. Paste it into the field with the same name in MyTax.",
  ],
  "vat.returnNothing": [
    "Tällä kaudella ei ole täytettäviä summia. Jos arvonlisäverollista toimintaa ei ollut, valitse OmaVerossa ”Ei toimintaa verokaudella”.",
    "There are no amounts to enter for this period. If there was no VAT activity, select “No activities during the tax period” in MyTax.",
  ],
  "vat.returnStepFile": ["Merkitse ilmoitetuksi", "Mark as filed"],
  "vat.returnFileHint": [
    "Kirjanpito ei näe OmaVeroa. Merkitse kausi ilmoitetuksi, kun olet lähettänyt ilmoituksen.",
    "The bookkeeping cannot see MyTax. Mark the period as filed once you have sent the return.",
  ],
  "vat.returnNotClosed": [
    "Kausi ei ole vielä päättynyt, joten luvut voivat muuttua. Eräpäivä on {d}.",
    "The period has not ended yet, so the figures may change. The return is due {d}.",
  ],
  "vat.returnOtherRate": [
    "Kaudella on myyntiä verokannalla, jolle ilmoituksessa ei ole kohtaa ({v} veroa). Se ei ole kohdissa, mutta sisältyy maksettavaan veroon. Tarkista kirjausten verokannat.",
    "This period has sales at a rate the return has no field for ({v} of VAT). It is not in the fields, but it is included in the tax payable. Check the rates on the entries.",
  ],
  "vat.returnPurchases": [
    "Kirjanpito ei erottele ostoja muista EU-maista, tuontia EU:n ulkopuolelta eikä rakentamispalvelun ja metalliromun ostoja. Jos sinulla on niitä, täytä niiden vero ja summa OmaVerossa, ja lisää vero myös vähennettävään veroon, jos saat vähentää sen. Maksettava vero muuttuu silloin.",
    "The bookkeeping does not separate purchases from other EU countries, imports from outside the EU, or purchases of construction services and scrap metal. If you have any, enter their tax and amount in MyTax, and add the tax to the deductible tax if you may deduct it. The tax payable then changes.",
  ],
  "vat.returnCodes": [
    "Numerot ovat Verohallinnon tunnukset tiedoille. Kohtien nimet ja järjestys noudattavat OmaVeron ilmoitusta.",
    "The numbers are the Tax Administration’s codes for the fields. The names and order follow the return in MyTax.",
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
  "statement.sections": ["Tuloslaskelman osiot", "Income statement sections"],
  "statement.sheetTab": ["Laskelma", "Statement"],
  "summary.compareTitle": ["Vertailu vuoteen {y}", "Compared with {y}"],
  "summary.compareIncome": ["Tulot {y}", "Income {y}"],
  "summary.compareExpense": ["Kulut {y}", "Expenses {y}"],
  "summary.compareResult": ["Tulos {y}", "Result {y}"],
  "summary.compareChange": ["Muutos", "Change"],
  "overview.lastYearToDate": [
    "Tulos {y} samaan aikaan",
    "Result {y} to the same date",
  ],
  "overview.lastYearMonth": ["{m} {y}", "{m} {y}"],
  "overview.thisYearMonth": ["(nyt {x})", "(now {x})"],
  "statement.form5Tab": ["Lomake 5", "Form 5"],
  "statement.form5Title": [
    "Lomake 5, tuloverolaskelma",
    "Form 5, calculation of taxable income",
  ],
  "statement.form5Kicker": ["Verovuosi {y}", "Tax year {y}"],
  "statement.form5Intro": [
    "Napsauta summaa, niin se kopioituu. Liitä se OmaVerossa saman numeron kohtaan.",
    "Click an amount to copy it. Paste it into the field with the same code in MyTax.",
  ],
  "statement.form5Assumed": [
    "Poistot (337) ja korkokulut (346) on laskettu kokonaan vähennyskelpoisiksi, joten 338 ja 347 ovat samat summat. Jos osa ei ole vähennyskelpoista, muuta kohtia OmaVerossa, jolloin myös 355 ja tulos muuttuvat.",
    "Depreciation (337) and interest expenses (346) are counted as fully deductible, so 338 and 347 are the same amounts. If part of them is not deductible, change those fields in OmaVero, and 355 and the result change with them.",
  ],
  "statement.form5Missing": [
    "Kirjanpito ei täytä osuuskuntien ylijäämiä (325–328), lisävähennyksiä (364) eikä lomakkeen muita osia, kuten poistoja, ajoneuvoja ja varallisuuslaskelmaa. Ne täytetään OmaVerossa.",
    "The bookkeeping does not fill co-operative surplus (325–328), additional deductions (364) or the form’s other sections, such as depreciation, vehicles and net worth. Fill those in OmaVero.",
  ],
  "statement.form5Nothing": [
    "Tälle vuodelle ei ole summia, jotka täytetään lomakkeelle.",
    "There are no amounts to enter on the form for this year.",
  ],
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
  "statement.entertainmentNote": [
    "Edustuskuluista (341, yhteensä {a}) vähennetään puolet, {b}. Veroilmoitukseen koko summa kuuluu kohtaan 341 ja vähennettävä osuus kohtaan 342.",
    "Half of entertainment expenses (341, total {a}) is deducted, {b}. On the tax return the full amount goes in 341 and the deductible part in 342.",
  ],
  "statement.dividendNote": [
    "Osingoista (319 ja 321, yhteensä {a}) tulokseen lasketaan veronalainen osuus, {b}: 85 % julkisesti noteeratun yhtiön ja 75 % muun yhtiön osingosta. Veroilmoitukseen osuudet kuuluvat kohtiin 320 ja 322.",
    "Of the dividends (319 and 321, total {a}) the result counts the taxable part, {b}: 85% of a listed company’s dividend and 75% of any other. On the tax return those parts go in 320 and 322.",
  ],
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
  // --- Recurring entries ---

  "recurring.tab": ["Toistuvat", "Recurring"],
  "recurring.repeat": ["Toista joka kuukausi", "Repeat every month"],
  "recurring.dueTitle": [
    pl(
      "1 toistuva kirjaus lisäämättä tältä kuulta",
      "{n} toistuvaa kirjausta lisäämättä tältä kuulta"
    ),
    pl(
      "1 recurring entry not added for this month",
      "{n} recurring entries not added for this month"
    ),
  ],
  "recurring.noticeTitle": [
    pl(
      "1 toistuva kirjaus lisäämättä: {m}",
      "{n} toistuvaa kirjausta lisäämättä: {m}"
    ),
    pl(
      "1 recurring entry not added: {m}",
      "{n} recurring entries not added: {m}"
    ),
  ],
  "recurring.review": ["Tarkista ja lisää", "Review and add"],
  "recurring.dialogTitle": [
    "Toistuvat kirjaukset: {m}",
    "Recurring entries: {m}",
  ],
  "recurring.dialogHint": [
    "Valitse tämän kuun kirjaukset. Voit muokata summaa ja liittää tositteen lisäämisen jälkeen.",
    "Choose this month’s entries. You can change an amount and attach a receipt after adding them.",
  ],
  "recurring.noneDue": [
    "Kaikki tämän kuun toistuvat kirjaukset on lisätty.",
    "All of this month’s recurring entries have been added.",
  ],
  "recurring.addSelected": [
    pl("Lisää 1 kirjaus", "Lisää {n} kirjausta"),
    pl("Add 1 entry", "Add {n} entries"),
  ],
  "recurring.added": [
    pl("1 kirjaus lisätty.", "{n} kirjausta lisätty."),
    pl("1 entry added.", "{n} entries added."),
  ],
  "recurring.settingsTitle": ["Toistuvat kirjaukset", "Recurring entries"],
  "recurring.settingsHint": [
    "Pohja syntyy, kun valitset kirjauksessa ”Toista joka kuukausi”. Mikään ei kirjaudu itsestään: kirjaukset lisätään kuukausittain Kirjanpito-näkymästä. Pohjan muutos tai poisto ei muuta jo tehtyjä kirjauksia.",
    "A template is made when you choose “Repeat every month” on an entry. Nothing is booked by itself: you add the entries month by month in the ledger. Changing or deleting a template leaves existing entries as they are.",
  ],
  "recurring.empty": ["Ei toistuvia kirjauksia.", "No recurring entries."],
  "recurring.description": ["Selite", "Description"],
  "recurring.category": ["Luokka", "Category"],
  "recurring.amount": ["Summa", "Amount"],
  "recurring.day": ["Päivä", "Day"],
  "recurring.from": ["Alkaen", "From"],
  "recurring.deleted": [
    "Toistuva kirjaus poistettu.",
    "Recurring entry deleted.",
  ],
  "recurring.remove": ["Poista {x}", "Delete {x}"],

  // --- Fixed assets ---

  "assets.tab": ["Poistot", "Depreciation"],
  "assets.title": ["Koneet ja kalusto {y}", "Machinery and equipment {y}"],
  "assets.intro": [
    "Yli kolme vuotta käytettävä tai yli 1 200 euron hankinta kirjataan luokkaan ”Käyttöomaisuuden hankinta”. Sen alv lasketaan ALV-ilmoitukselle, mutta kulu vähennetään poistoina. Poisto on enintään 25 % menojäännöksestä, ja 1 200 euron tai pienemmän menojäännöksen voi poistaa kerralla.",
    "A purchase with a life of over three years or a price over €1,200 goes on the “Purchase of fixed assets” category. Its VAT counts on the VAT return, but the cost is deducted as depreciation. Depreciation is at most 25% of the undepreciated balance, and a balance of €1,200 or less can be written off at once.",
  ],
  "assets.smallNote": [
    "Pienhankinnan (enintään 1 200 euroa, yhteensä enintään 3 600 euroa vuodessa) ja enintään kolme vuotta käytettävän hankinnan voi kirjata suoraan kuluksi. Rivin 337 kirjaukset luetaan tämän menojäännöksen poistoiksi. Rakennukset ja muu poistettava omaisuus eivät kuulu tähän laskelmaan.",
    "A small purchase (up to €1,200, up to €3,600 a year in total) or one with a life of up to three years can be booked straight as an expense. Entries on line 337 are read as depreciation of this balance. Buildings and other depreciable assets are not part of this calculation.",
  ],
  "assets.noneTitle": ["Ei käyttöomaisuutta", "No fixed assets"],
  "assets.noneBody": [
    "Kirjaa hankinta luokkaan ”Käyttöomaisuuden hankinta”, tai anna alla menojäännös, jos sinulla on jo poistettavaa omaisuutta.",
    "Book a purchase on the “Purchase of fixed assets” category, or enter a balance below if you already have assets to depreciate.",
  ],
  "assets.opening": ["Menojäännös vuoden alussa", "Balance at start of year"],
  "assets.additions": ["Hankinnat", "Purchases"],
  "assets.disposals": ["Myynnit", "Sales"],
  "assets.base": ["Poistopohja", "Depreciation base"],
  "assets.maximum": ["Enimmäispoisto", "Maximum depreciation"],
  "assets.taken": ["Kirjatut poistot", "Booked depreciation"],
  "assets.closing": ["Menojäännös vuoden lopussa", "Balance at end of year"],
  "assets.amount": ["Poiston määrä", "Depreciation amount"],
  "assets.book": ["Kirjaa poisto", "Book depreciation"],
  "assets.bookHint": [
    "Poiston voi tehdä enimmäismäärää pienempänä. Kirjaus tehdään riville 337.",
    "You can depreciate less than the maximum. The entry goes on line 337.",
  ],
  "assets.badAmount": [
    "Anna summa, esim. 500,00.",
    "Enter an amount, e.g. 500.00.",
  ],
  "assets.overMaximum": [
    "Kirjatut poistot ylittävät enimmäismäärän {x}.",
    "Booked depreciation is over the maximum of {x}.",
  ],
  "assets.saleExcess": [
    "Myyntihinta ylittää menojäännöksen {x}:lla. Ylimenevä osa on veronalaista tuloa, joten kirjaa se myös tuloksi.",
    "The sale price is {x} over the balance. That part is taxable income, so book it as income too.",
  ],
  "assets.entryDescription": [
    "Poisto {y}, koneet ja kalusto",
    "Depreciation {y}, machinery and equipment",
  ],
  "assets.booked": ["Poisto kirjattu.", "Depreciation booked."],
  "assets.yearEntries": ["Hankinnat ja myynnit {y}", "Purchases and sales {y}"],
  "assets.noYearEntries": [
    "Ei hankintoja tai myyntejä tänä vuonna.",
    "No purchases or sales this year.",
  ],
  "assets.schedule": ["Menojäännös vuosittain", "Balance by year"],
  "assets.year": ["Vuosi", "Year"],
  "assets.voucher": ["Nro", "No."],
  "assets.date": ["Pvm", "Date"],
  "assets.openingTitle": ["Aloitussaldo", "Opening balance"],
  "assets.openingHint": [
    "Jos omaisuutta on jo ennen tätä kirjanpitoa, anna sen menojäännös vuoden {y} alussa. Luku on edellisen vuoden poistoerittelyssä (lomake 62).",
    "If you have assets from before this bookkeeping, enter their balance at the start of {y}. The figure is on last year’s depreciation schedule (form 62).",
  ],
  "assets.openingLabel": [
    "Menojäännös vuoden {y} alussa",
    "Balance at the start of {y}",
  ],

  // --- Calculated deductions ---

  "deductions.tab": ["Vähennykset", "Deductions"],
  "deductions.intro": [
    "Nämä vähennykset kirjataan riville 354, kirjanpidon ulkopuolisiin vähennyskelpoisiin kuluihin. Laskelmat käyttävät Verohallinnon vuoden {y} määriä, ja ne ovat apuväline: säilytä ajopäiväkirja ja matkojen tiedot itse.",
    "These deductions go on line 354, deductible expenses outside the books. The calculators use the Tax Administration’s amounts for {y}. They are an aid: keep your own logbook and trip records.",
  ],
  "deductions.noTravelRates": [
    "Sovelluksessa ei ole Verohallinnon matkakorvausten määriä vuodelle {y}.",
    "The app does not have the Tax Administration’s travel amounts for {y}.",
  ],
  "deductions.noHomeRates": [
    "Sovelluksessa ei ole vahvistettua työhuonevähennyksen määrää vuodelle {y}.",
    "The app does not have a confirmed home office amount for {y}.",
  ],
  "deductions.mileageTitle": ["Kilometrivähennys", "Mileage deduction"],
  "deductions.mileageHint": [
    "Oma tai puolison auto, jonka ajoista vähintään puolet on yksityisajoa. {r} kilometriltä, vähennettynä auton kirjatuilla kuluilla. Ei koske asunnon ja vakituisen työpaikan välisiä matkoja. Matkustaja- ja perävaunulisät eivät ole mukana.",
    "A car owned by you or your spouse, driven at least half privately. {r} per kilometre, less the car’s booked costs. Trips between home and a permanent workplace do not count. Passenger and trailer additions are not included.",
  ],
  "deductions.km": ["Työajot, km", "Business driving, km"],
  "deductions.bookedCar": ["Kirjatut autokulut", "Booked car costs"],
  "deductions.bookedCarHint": [
    "Esitäytetty luokan Ajoneuvokulut summasta. Muuta, jos kaikki ei ole tämän auton kuluja.",
    "Filled from the Vehicle expenses category. Change it if not all of that is this car’s.",
  ],
  "deductions.perDiemTitle": ["Päivärahavähennys", "Per diem deduction"],
  "deductions.perDiemHint": [
    "Tilapäinen työmatka tavallisen toimialueen ulkopuolelle: yli 15 km kotoa tai työpaikalta ja yli 5 km molemmista. {a} yli 6 tunnin ja {b} yli 10 tunnin matkalta, Suomessa. Jos ateria sisältyy hintaan, määrä puolittuu, joten vähennä se itse.",
    "A temporary work trip outside your usual area: over 15 km from home or your workplace and over 5 km from both. {a} for a trip over 6 hours and {b} for one over 10 hours, in Finland. If meals are included the amount is halved, so take that off yourself.",
  ],
  "deductions.fullDays": ["Yli 10 tunnin päivät", "Days over 10 hours"],
  "deductions.partialDays": ["Yli 6 tunnin päivät", "Days over 6 hours"],
  "deductions.bookedLiving": [
    "Kirjatut lisääntyneet elantokulut",
    "Booked increased living costs",
  ],
  "deductions.homeTitle": ["Työhuonevähennys", "Home office deduction"],
  "deductions.homeHint": [
    "Kaavamainen vähennys kodin käytöstä työhön, enintään {x} vuodessa. Todellisia työtilan kuluja ei voi vähentää sen lisäksi.",
    "A standard deduction for using your home for work, at most {x} a year. Actual workspace costs cannot be deducted on top of it.",
  ],
  "deductions.tierFull": [
    "Jatkuva, päätoiminen käyttö tai yli puolet työpäivistä",
    "Continuous full-time use, or over half of working days",
  ],
  "deductions.tierPart": [
    "Jatkuva, osa-aikainen käyttö tai neljännes tai puolet työpäivistä",
    "Continuous part-time use, or a quarter to half of working days",
  ],
  "deductions.tierOccasional": [
    "Satunnainen mutta toistuva käyttö",
    "Occasional but repeated use",
  ],
  "deductions.tier": ["Käyttö", "Use"],
  "deductions.result": ["Vähennys", "Deduction"],
  "deductions.book": ["Kirjaa vähennys", "Book deduction"],
  "deductions.booked": ["Vähennys kirjattu.", "Deduction booked."],
  "deductions.nothing": [
    "Ei vähennettävää: kirjatut kulut ovat vähintään yhtä suuret.",
    "Nothing to deduct: the booked costs are at least as much.",
  ],
  "deductions.mileageEntry": [
    "Kilometrivähennys {y}: {k} km × {r}, kirjatut kulut {b}",
    "Mileage deduction {y}: {k} km × {r}, booked costs {b}",
  ],
  "deductions.perDiemEntry": [
    "Päivärahavähennys {y}: {a} × {x}, {b} × {z}, kirjatut kulut {c}",
    "Per diem deduction {y}: {a} × {x}, {b} × {z}, booked costs {c}",
  ],
  "deductions.homeEntry": ["Työhuonevähennys {y}", "Home office deduction {y}"],
  "deductions.homeExists": [
    "Työhuonevähennys on jo kirjattu vuodelle {y}.",
    "A home office deduction is already booked for {y}.",
  ],
  "deductions.bookedTitle": ["Kirjattu vuodelle {y}", "Booked for {y}"],
  "deductions.noneBooked": [
    "Rivillä 354 ei ole vielä kirjauksia.",
    "No entries on line 354 yet.",
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
    "Kirjanpito tallentuu avattuun tiedostoon muutama sekunti jokaisen muutoksen jälkeen. Poiston voi kumota ilmoituksesta 10 sekunnin ajan, ja palautus tallentuu samalla tavalla. Kirjauksen muokkausta ei voi kumota, eikä tiedostoon jää aiempia versioita. Jos selain kysyisi jotain, tallennus odottaa, kunnes tallennat kerran itse.",
    "The bookkeeping is saved to the opened file a few seconds after each change. You can undo a delete from its notification for 10 seconds, and the restored entry is saved the same way. Edits to an entry can’t be undone, and the file keeps no earlier versions. If the browser would have to ask anything, autosave waits until you save once yourself.",
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
  "settings.restored": ["Kirjaukset palautettu.", "Entries restored."],

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
  "io.receiptsLost": [
    pl(
      "1 tosite puuttuu selaimesta, joten se jää tästä tiedostosta pois.",
      "{n} tositetta puuttuu selaimesta, joten ne jäävät tästä tiedostosta pois."
    ),
    pl(
      "1 receipt is missing from this browser, so this file leaves it out.",
      "{n} receipts are missing from this browser, so this file leaves them out."
    ),
  ],
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
