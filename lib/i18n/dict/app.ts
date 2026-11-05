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
    "Jätetäänkö liitteet pois?",
    "Leave the attachments out?",
  ],
  "confirm.receiptsLostMessage": [
    pl(
      "1 liite ei löydy selaimesta eikä tiedostosta {f}. Tallennus jättää sen pois, ja jos se on tiedostossa toisella nimellä, se katoaa sieltä.",
      "{n} liitettä ei löydy selaimesta eikä tiedostosta {f}. Tallennus jättää ne pois, ja jos ne ovat tiedostossa toisella nimellä, ne katoavat sieltä."
    ),
    pl(
      "1 attachment isn’t in this browser or in the file {f}. Saving leaves it out, and if the file holds it under another name, it is lost from there.",
      "{n} attachments aren’t in this browser or in the file {f}. Saving leaves them out, and if the file holds them under other names, they are lost from there."
    ),
  ],
  "confirm.receiptsLostConfirm": ["Tallenna silti", "Save anyway"],
  "confirm.deleteTitle": ["Poistetaanko tosite?", "Delete this voucher?"],
  "confirm.deleteManyTitle": [
    pl("Poistetaanko 1 tosite?", "Poistetaanko {n} tositetta?"),
    pl("Delete 1 voucher?", "Delete {n} vouchers?"),
  ],
  "confirm.deleteManyMessage": [
    "Valitut tositteet poistetaan. Voit perua poiston heti sen jälkeen.",
    "The selected vouchers will be deleted. You can undo it right after.",
  ],
  "confirm.deleteMessage": [
    "Tosite ”{x}” poistetaan.",
    "The voucher “{x}” will be deleted.",
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
  "confirm.deleteBookTitle": [
    "Poistetaanko kirjanpito?",
    "Delete the bookkeeping?",
  ],
  "confirm.deleteBookMessage": [
    "Tositteet, liitteet ja asetukset poistetaan tästä selaimesta pysyvästi, eikä poistoa voi perua. Lataa kirjanpito tiedostoksi ensin, jos haluat säilyttää sen.",
    "The vouchers, attachments and settings are removed from this browser for good, and there is no undoing it. Download the bookkeeping as a file first if you want to keep it.",
  ],
  "confirm.deleteBookConfirm": ["Poista kirjanpito", "Delete bookkeeping"],
  "confirm.renumberTitle": [
    "Numeroidaanko vuoden {year} tositteet uudelleen?",
    "Renumber the vouchers of {year}?",
  ],
  "confirm.renumberMessage": [
    pl(
      "1 tositteen numero muuttuu. Jos olet kirjoittanut numeroita kuitteihin tai antanut ne kirjanpitäjälle, ne eivät enää täsmää.",
      "{n} tositteen numero muuttuu. Jos olet kirjoittanut numeroita kuitteihin tai antanut ne kirjanpitäjälle, ne eivät enää täsmää."
    ),
    pl(
      "The number of 1 voucher changes. Numbers you have written on receipts or given to an accountant will no longer match.",
      "The numbers of {n} vouchers change. Numbers you have written on receipts or given to an accountant will no longer match."
    ),
  ],
  "confirm.renumberConfirm": ["Numeroi uudelleen", "Renumber"],
  "confirm.discardTitle": ["Hylätäänkö muutokset?", "Discard changes?"],
  "confirm.discardConfirm": ["Hylkää muutokset", "Discard changes"],
  "confirm.keepEditing": ["Jatka muokkausta", "Keep editing"],
  "confirm.discardEntry": [
    "Tositteessa on tallentamattomia muutoksia. Jos suljet ikkunan, ne menetetään.",
    "This voucher has unsaved changes. If you close the dialog, they’ll be lost.",
  ],
  "confirm.discardCategory": [
    "Olet täyttänyt uuden luokan tiedot, mutta luokkaa ei ole lisätty. Jos poistut sivulta, tiedot menetetään.",
    "You’ve filled in a new category but haven’t added it. If you leave this page, it will be lost.",
  ],

  // --- Shared by several views ---
  // The fill-in forms for OmaVero (§8.7, §8.8).
  "common.businessId": ["Y-tunnus", "Business ID"],
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
  "overview.widgetRecent": ["Viimeisimmät tositteet", "Latest vouchers"],
  "overview.widgetChecks": ["Tarkistettavaa", "To check"],

  "overview.bankOn": ["Pankkitilin saldo {d}", "Bank balance on {d}"],
  "overview.bankMovement": [
    "Tositteet sen jälkeen ({n})",
    "Vouchers since then ({n})",
  ],
  "overview.bankEstimate": ["Arvio tänään", "Estimate for today"],
  "overview.bankEstimateNote": [
    "Arvio laskee tositteet päivämäärän mukaan, ei maksupäivän. Siinä eivät näy muut verojen maksut kuin kirjatut arvonlisäverot eivätkä yksityisotot tai -sijoitukset, joita ei ole kirjattu.",
    "The estimate goes by each voucher’s date, not the day it was paid. It leaves out tax payments other than booked VAT, and any owner’s withdrawals or investments not booked.",
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
  "overview.entries": ["Tositteita", "Vouchers"],
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
    "Verottomat summat. Valitse kuukausi avataksesi sen tositteet.",
    "Net amounts. Pick a month to open its vouchers.",
  ],
  "overview.bestMonth": ["Paras kuukausi", "Best month"],
  "overview.avgIncome": ["Tulot keskimäärin", "Average income"],
  "overview.avgExpenses": ["Kulut keskimäärin", "Average expenses"],
  "overview.perMonth": ["{a} / kk", "{a} / month"],
  "overview.activeMonths": ["Kuukausia tosittein", "Months with vouchers"],

  "overview.salesDomestic": ["Suomi", "Finland"],
  "overview.otherIncome": ["Muut tulot (301–324)", "Other income (301–324)"],
  "overview.emptyBuckets": [
    pl("1 ryhmä ilman kuluja.", "{n} ryhmää ilman kuluja."),
    pl("1 group with no expenses.", "{n} groups with no expenses."),
  ],

  "overview.allEntries": ["Kaikki tositteet", "All vouchers"],
  "overview.noReceipt": ["ei liitettä", "no attachment"],
  "overview.noEntriesYear": [
    "Ei tositteita vuodelta {y}.",
    "No vouchers for {y}.",
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
    pl("1 tosite ilman liitettä", "{n} tositetta ilman liitettä"),
    pl("1 voucher without an attachment", "{n} vouchers without an attachment"),
  ],
  "overview.withoutReceiptSub": [
    "Liitä tositteeseen kuva tai PDF.",
    "Attach a photo or a PDF to the voucher.",
  ],
  "overview.showThem": ["Näytä", "Show"],
  "overview.rateMismatch": [
    pl(
      "1 tosite, jonka verokanta ei vastaa päivämäärää",
      "{n} tositetta, joiden verokanta ei vastaa päivämäärää"
    ),
    pl(
      "1 voucher whose VAT rate doesn’t fit its date",
      "{n} vouchers whose VAT rate doesn’t fit their date"
    ),
  ],
  "overview.rateMismatchSub": [
    "Esimerkiksi 25,5 % ennen 1.9.2024. Korjaukset voivat olla tarkoituksella vanhalla verokannalla.",
    "For example 25.5% before 1 Sep 2024. Corrections can carry an older rate on purpose.",
  ],
  "overview.futureDate": [
    pl(
      "1 tosite on päivätty tulevaisuuteen",
      "{n} tositetta on päivätty tulevaisuuteen"
    ),
    pl(
      "1 voucher is dated in the future",
      "{n} vouchers are dated in the future"
    ),
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
    "Yli kymmenen kertaa tavallinen tosite. Tarkista desimaalipilkun paikka.",
    "Over ten times a typical voucher. Check where the decimal separator is.",
  ],
  "overview.duplicate": [
    pl("1 mahdollinen kaksoistosite", "{n} mahdollista kaksoistositetta"),
    pl("1 possible duplicate", "{n} possible duplicates"),
  ],
  "overview.duplicateSub": [
    "Sama päivä ja summa tai sama liitetiedosto kuin toisella tositteella.",
    "Same date and amount, or the same attachment file, as another voucher.",
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
  "overview.privateUseNoVat": [
    pl(
      "1 tavaran oma käyttö ilman arvonlisäveroa",
      "{n} tavaran omaa käyttöä ilman arvonlisäveroa"
    ),
    pl(
      "1 private use of goods without VAT",
      "{n} private uses of goods without VAT"
    ),
  ],
  "overview.lateCash": [
    pl("1 käteismaksu kirjattu myöhässä", "{n} käteismaksua kirjattu myöhässä"),
    pl("1 cash payment booked late", "{n} cash payments booked late"),
  ],
  "overview.lateCashSub": [
    "Käteismaksu kirjataan viipymättä ja päivä kerrallaan (kirjanpitolaki 2:4). Kirjaa seuraavat heti.",
    "A cash payment is booked without delay, day by day (Accounting Act 2:4). Book the next ones straight away.",
  ],
  "overview.privateUseNoVatSub": [
    "Oma käyttö ylittää vuodessa 850 €. Ylittävä osa on arvonlisäverollista, jos tavaran ostosta on vähennetty vero.",
    "Private use is over 850 € this year. The part above that carries VAT if the VAT on the goods was deducted.",
  ],
  "overview.openItems": [
    pl("1 avoin tosite", "{n} avointa tositetta"),
    pl("1 open voucher", "{n} open vouchers"),
  ],
  "overview.openItemsSub": [
    "Myyntisaamiset {r}, ostovelat {p}.",
    "Receivables {r}, payables {p}.",
  ],
  "overview.singleEntryLimit": [
    "Yhdenkertaisen kirjanpidon rajat, tilikaudet {y} ja sitä edeltävä",
    "Limits for single-entry books, financial year {y} and the one before",
  ],
  "overview.singleEntryLimitOver": [
    "Kaksi rajaa ylittyy molempina vuosina, joten sinun on pidettävä kahdenkertaista kirjanpitoa (KPL 1:1a). Tämä sovellus ei tee sitä.",
    "Two limits are exceeded in both years, so you must keep double-entry books (KPL 1:1a). This app does not do that.",
  ],
  "overview.singleEntryLimitStaff": [
    "Yksi raja ylittyy molempina vuosina. Jos palveluksessasi on keskimäärin yli 3 henkilöä, sinun on pidettävä kahdenkertaista kirjanpitoa (KPL 1:1a).",
    "One limit is exceeded in both years. If you employ more than 3 people on average, you must keep double-entry books (KPL 1:1a).",
  ],
  "overview.statementLimit": [
    "Tilinpäätöksen rajat, tilikaudet {y} ja sitä edeltävä",
    "Limits for financial statements, financial year {y} and the one before",
  ],
  "overview.statementLimitOver": [
    "Kaksi rajaa ylittyy molempina vuosina, joten sinun on laadittava tilinpäätös neljässä kuukaudessa (KPL 1:1a, 3:6). Tämä sovellus ei tee sitä.",
    "Two limits are exceeded in both years, so you must prepare financial statements within four months (KPL 1:1a, 3:6). This app does not do that.",
  ],
  "overview.statementLimitStaff": [
    "Yksi raja ylittyy molempina vuosina. Jos palveluksessasi on keskimäärin yli 10 henkilöä, sinun on laadittava tilinpäätös (KPL 1:1a).",
    "One limit is exceeded in both years. If you employ more than 10 people on average, you must prepare financial statements (KPL 1:1a).",
  ],
  "overview.vatPeriodLimit": [
    "Liikevaihto {y} oli {a}",
    "Turnover in {y} was {a}",
  ],
  "overview.vatPeriodLimitSub": [
    "Valitsemasi ALV-ilmoitusjakso edellyttää enintään {l} liikevaihtoa. Tarkista verokausi OmaVerosta.",
    "The VAT filing period you chose requires turnover of at most {l}. Check your tax period in OmaVero.",
  ],
  "overview.form5Due": [
    "Veroilmoitus (lomake 5) vuodelta {y}",
    "Tax return (Form 5) for {y}",
  ],
  "overview.form5DueOn": [
    "Annettava viimeistään {d}. Tarkista päivä OmaVerosta.",
    "Due by {d}. Check the date in OmaVero.",
  ],
  "overview.form5DueUnknown": [
    "Määräpäivä on keväällä. Tarkista se OmaVerosta.",
    "It is due in the spring. Check the date in OmaVero.",
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
    pl("1 liite puuttuu tiedostosta", "{n} liitettä puuttuu tiedostosta"),
    pl(
      "1 attachment is missing from the file",
      "{n} attachments are missing from the file"
    ),
  ],
  "overview.missingFilesSub": [
    "Ne on listattu CSV-tiedostossa, mutta itse tiedostoja ei löytynyt.",
    "The CSV lists them, but the files themselves were not found.",
  ],
  "overview.emptyMonths": ["Ei tositteita: {m}", "No vouchers: {m}"],
  "overview.emptyMonthsSub": [
    "Tarkista, puuttuuko tositteita.",
    "Check whether any vouchers are missing.",
  ],
  "overview.allClear": ["Ei tarkistettavaa.", "Nothing to check."],

  "overview.emptyTitle": ["Ei vielä tositteita", "No vouchers yet"],
  "overview.emptyBody": [
    "Kirjaa ensimmäinen tosite tai avaa aiempi kirjanpito CSV- tai ZIP-tiedostona. Yleiskatsaus täyttyy sitä mukaa kuin kirjaat.",
    "Record your first voucher, or open an earlier bookkeeping as a CSV or ZIP file. The overview fills in as you go.",
  ],
  "overview.step1Title": [
    "Kirjaa tulot ja kulut",
    "Record income and expenses",
  ],
  "overview.step1Body": [
    "Pudota kuitti tai lasku sivulle, niin tosite alkaa siitä.",
    "Drop a receipt or an invoice on the page to start a voucher from it.",
  ],
  "overview.step2Title": [
    "Valitse ALV-ilmoitusjakso",
    "Choose your VAT reporting period",
  ],
  "overview.step2Body": [
    "Asetuksista. Eräpäivät näkyvät täällä ensimmäisestä tositteesta alkaen.",
    "In Settings. The due dates appear here from your first voucher on.",
  ],
  "overview.step3Title": ["Tallenna tiedostoon", "Save to a file"],
  "overview.step3Body": [
    "Tiedosto on kirjanpitosi. Selain on vain työtila.",
    "The file is your bookkeeping. The browser is only a workspace.",
  ],

  // --- Ledger (§8.4) ---
  "ledger.emptyTitle": ["Ei vielä tositteita", "No vouchers yet"],
  "ledger.emptyBody": [
    "Lisää ensimmäinen tosite tai tuo aiemmat tositteet CSV-tiedostosta.",
    "Add your first voucher or import earlier vouchers from a CSV file.",
  ],
  "ledger.startEmpty": ["Aloita tyhjästä", "Start from scratch"],
  "ledger.newEntry": ["Uusi tosite", "New voucher"],
  "ledger.wholeYear": ["Koko vuosi", "Whole year"],
  "ledger.incomeNet": ["Tulot, veroton", "Income, excl. VAT"],
  "ledger.expenseNet": ["Kulut, veroton", "Expenses, excl. VAT"],
  "ledger.vatPayable": ["Maksettava ALV", "VAT payable"],
  "ledger.vatRefundable": ["Palautettava ALV", "VAT refundable"],
  "ledger.search": [
    "Hae kuvauksesta, luokasta tai numerolla",
    "Search description, category or number",
  ],
  "ledger.colDate": ["Päivämäärä", "Date"],
  "ledger.selectRow": ["Valitse tosite {x}", "Select voucher {x}"],
  "ledger.selectPage": [
    "Valitse sivun tositteet",
    "Select the vouchers on this page",
  ],
  "ledger.selected": [
    pl("1 valittu", "{n} valittu"),
    pl("1 selected", "{n} selected"),
  ],
  "ledger.bulkCategory": ["Vaihda luokka", "Change category"],
  "ledger.bulkMixedEu": [
    "Luokan voi vaihtaa, kun valitut ovat kaikki EU-ostoja tai kaikki muita kuluja.",
    "To change the category, select only EU purchases or only other expenses.",
  ],
  "ledger.bulkMixed": [
    "Luokan voi vaihtaa, kun valitut ovat kaikki tuloja tai kaikki kuluja.",
    "To change the category, select only income or only expenses.",
  ],
  "ledger.bulkDelete": ["Poista valitut", "Delete selected"],
  "ledger.bulkClear": ["Poista valinta", "Clear selection"],
  "ledger.colAccount": ["Tili", "Account"],
  "ledger.sections": ["Kirjanpidon osiot", "Bookkeeping sections"],
  "ledger.entriesTab": ["Tositteet", "Vouchers"],
  "ledger.journalTab": ["Päiväkirja", "Journal"],
  "ledger.accountsTab": ["Pääkirja", "General ledger"],
  "entry.logAdd": ["Lisätty", "Added"],
  "entry.logDelete": ["Poistettu", "Deleted"],
  "entry.logRestore": ["Palautettu", "Restored"],
  "entry.logEdit": ["{field}: {a} → {b}", "{field}: {a} → {b}"],
  "entry.logFieldDate": ["Päivä", "Date"],
  "entry.logFieldDescription": ["Kuvaus", "Description"],
  "entry.logFieldType": ["Tyyppi", "Type"],
  "entry.logFieldCategory": ["Luokka", "Category"],
  "entry.logFieldAmount": ["Summa", "Amount"],
  "entry.logFieldVat": ["ALV", "VAT"],
  "entry.logFieldMode": ["Summan tyyppi", "Amount type"],
  "entry.logFieldSettles": ["Verokausi", "Tax period"],
  "entry.logFieldPaid": ["Maksettu", "Paid"],
  "entry.logFieldCash": ["Maksutapa", "Payment method"],
  "entry.cash": ["Käteinen", "Cash"],
  "entry.cashLabel": ["Maksettu käteisellä", "Paid in cash"],
  "entry.cashInfo": [
    "Mitä käteismaksu tarkoittaa?",
    "What does paid in cash mean?",
  ],
  "entry.cashInfoText": [
    "Käteismaksu kirjataan viipymättä ja päivä kerrallaan (kirjanpitolaki 2:4). Kirjanpito huomauttaa, jos käteinen tosite kirjataan yli {d} päivää maksun jälkeen. Käteismaksu ei liikuta pankkitilin arviota.",
    "A cash payment is booked without delay, day by day (Accounting Act 2:4). The book points it out when a cash voucher is booked more than {d} days after the payment. A cash payment does not move the bank estimate.",
  ],
  "entry.logFieldBuyer": ["Ostajan ALV-numero", "Buyer’s VAT number"],
  "entry.logFieldEuPurchase": ["EU-osto", "EU purchase"],
  "entry.logFieldVoucher": ["Tositenumero", "Voucher number"],
  "entry.logFieldReceipts": ["Liitteet", "Attachments"],
  "ledger.chartTab": ["Tililuettelo", "Account list"],
  "ledger.chartTitle": ["Tililuettelo {y}", "Account list {y}"],
  "ledger.chartSub": [
    "Tilit ja niiden sisältö tällä tilikaudella",
    "The accounts and their content this financial year",
  ],
  "ledger.chartName": ["Tili", "Account"],
  "ledger.chartContent": ["Sisältö", "Content"],
  "ledger.bookListTitle": [
    "Luettelo kirjanpidoista ja aineistoista",
    "List of books and material",
  ],
  "ledger.bookJournal": ["Päiväkirja", "Journal"],
  "ledger.bookJournalKept": [
    "Tositteet aikajärjestyksessä. Muodostetaan kirjanpitotiedoston CSV:stä, ja jokainen rivi viittaa tositenumeroon.",
    "The vouchers in date order. Built from the CSV in the bookkeeping file, and each row refers to a voucher number.",
  ],
  "ledger.bookGeneral": ["Pääkirja", "General ledger"],
  "ledger.bookGeneralKept": [
    "Samat tositteet tileittäin. Muodostetaan samasta CSV:stä, ja siitä johdetaan tuloslaskelma.",
    "The same vouchers by account. Built from the same CSV, and the income statement is derived from it.",
  ],
  "ledger.bookVouchers": ["Tositeliitteet", "Voucher attachments"],
  "ledger.bookVouchersKept": [
    "Alkuperäiset tiedostot kirjanpitotiedoston kansiossa {d}/vuosi/kuukausi. CSV:n rivi kertoo tositteen liitteet.",
    "The original files in the bookkeeping file, in the folder {d}/year/month. A CSV row names its voucher’s attachments.",
  ],
  "ledger.bookReports": [
    "Tuloslaskelma ja arvonlisäveroilmoitukset",
    "Income statement and VAT returns",
  ],
  "ledger.bookReportsKept": [
    "Lasketaan tositteista. Tulosta ne talteen, kun ilmoitus on annettu.",
    "Calculated from the vouchers. Print them for keeping once the return is filed.",
  ],
  "ledger.journalTitle": ["Päiväkirja {y}", "Journal {y}"],
  "ledger.accountsTitle": ["Pääkirja {y}", "General ledger {y}"],
  "ledger.journalSub": [
    "tositteet aikajärjestyksessä",
    "vouchers in date order",
  ],
  "ledger.accountsSub": ["tositteet tileittäin", "vouchers by account"],
  "ledger.incomeTotal": ["Tulot yhteensä", "Total income"],
  "ledger.expenseTotal": ["Menot yhteensä", "Total expenses"],
  "ledger.noEntriesYear": ["Ei tositteita vuonna {y}.", "No vouchers in {y}."],
  "ledger.print": ["Tulosta", "Print"],
  /* KPL 2:10, checked on Finlex. */
  "ledger.reconTitle": [
    "Täsmäytys tuloslaskelmaan",
    "Reconciliation to the income statement",
  ],
  "ledger.reconIntro": [
    "Pääkirja lukee tositteet niiden päivämäärän mukaan. Tuloslaskelma ja lomake 5 lukevat ne maksuvuoden mukaan, koska ammatinharjoittaja verotetaan maksuperusteisesti. Ne eroavat siis näiden tositteiden verran.",
    "The general ledger reads vouchers by their date. The income statement and Form 5 read them by the year they were paid, since a professional practitioner is taxed on a payment basis. They differ by these vouchers.",
  ],
  "ledger.reconLedger": ["Pääkirja", "General ledger"],
  "ledger.reconOut": [
    "− maksettu muuna vuonna tai avoin",
    "− paid in another year or open",
  ],
  "ledger.reconIn": [
    "+ päivätty muuna vuonna, maksettu {y}",
    "+ dated in another year, paid in {y}",
  ],
  "ledger.reconStatement": ["= Tuloslaskelma", "= Income statement"],
  "ledger.reconEntries": ["Tositteet, jotka siirtyvät", "Vouchers that move"],
  "ledger.colPaid": ["Maksettu", "Paid"],
  "ledger.colEffect": ["Vaikutus", "Effect"],
  "ledger.reconNote": [
    "Tuloslaskelman rivit ovat täysimääräisiä. Lomake 5 laskee niistä osan riveillä 319, 321 ja 341.",
    "The income statement’s lines are in full. Form 5 counts part of lines 319, 321 and 341.",
  ],
  "ledger.closingNote": [
    "Jos toiminta loppuu, aineisto säilytetään samoin ajoin. Lopettamisilmoituksessa (Y6-lomake YTJ:ssä) ilmoitetaan, kuka sitä säilyttää ja missä (kirjanpitolaki 2:10).",
    "If the business closes, the material is kept for the same periods. The closure notice (form Y6 in YTJ) names who keeps it and where (Accounting Act 2:10).",
  ],
  "ledger.retention": [
    "Säilytä päiväkirja ja pääkirja vähintään {b} asti (10 vuotta tilikauden päättymisestä) ja tositteet vähintään {v} asti (6 vuotta sen vuoden lopusta, jona tilikausi päättyi). Kirjanpitolaki 2:10.",
    "Keep the journal and the general ledger until at least {b} (10 years from the end of the financial year), and the vouchers until at least {v} (6 years from the end of the year in which it ended). Accounting Act 2:10.",
  ],
  /* The voucher number (tositenumero, §4). */
  "ledger.colVoucher": ["Nro", "No."],
  "ledger.colDescription": ["Kuvaus", "Description"],
  "ledger.colCategory": ["Luokka", "Category"],
  "ledger.colNet": ["Veroton", "Net"],
  "ledger.colGross": ["Verollinen", "Gross"],
  "ledger.noDescription": ["Ei kuvausta", "No description"],
  "ledger.hitsElsewhere": ["Osumia myös muualla:", "Also found elsewhere:"],
  "ledger.hitsInYear": [
    pl("Näytä vuosi {y}, 1 osuma", "Näytä vuosi {y}, {n} osumaa"),
    pl("Show {y}, 1 match", "Show {y}, {n} matches"),
  ],
  "ledger.noMatch": [
    "Ei tositteita valituilla suodattimilla.",
    "No vouchers match the filters.",
  ],
  "ledger.noEntriesFor": ["Ei tositteita: {p}.", "No vouchers: {p}."],
  "ledger.clearFilters": ["Tyhjennä suodattimet", "Clear filters"],
  "ledger.allCategories": ["Kaikki luokat", "All categories"],
  "ledger.openItems": ["Avoimet", "Open"],
  "ledger.openPill": ["Avoin", "Open"],
  "ledger.euPill": ["EU-osto", "EU purchase"],
  "ledger.checkFilter": ["Tarkistettavat", "Needs a look"],
  "ledger.checkAll": ["Kaikki tositteet", "All vouchers"],
  "ledger.withoutReceipt": ["Ilman liitettä", "Without an attachment"],
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
  "ledger.duplicate": ["Mahdollinen kaksoistosite", "Possible duplicate"],
  "ledger.vatNotDeductible": ["ALV ei vähennettävää", "VAT not deductible"],
  "ledger.lateCash": [
    "Käteismaksu kirjattu myöhässä",
    "Cash payment booked late",
  ],
  "ledger.privateUseNoVat": [
    "Oma käyttö ilman ALV:tä",
    "Private use without VAT",
  ],
  "ledger.copyAsNew": ["Kopioi", "Copy"],
  "ledger.deleteEntry": ["Poista tosite", "Delete voucher"],

  // --- Entry dialog (§8.5) ---
  "entry.editTitle": ["Muokkaa tositetta", "Edit voucher"],
  "entry.voucher": ["Tositenumero {n}", "Voucher number {n}"],
  "entry.copyTitle": ["Kopioitu tosite", "Copied voucher"],
  "entry.date": ["Päivämäärä", "Date"],
  "entry.description": ["Kuvaus", "Description"],
  "entry.descriptionPlaceholder": [
    "Esim. Lasku 1006 – Asiakas Oy",
    "E.g. Invoice 1006 – Client Ltd",
  ],
  "entry.category": ["Luokka", "Category"],
  "entry.amount": ["Summa (€)", "Amount (€)"],
  "entry.locked": ["Lukittu", "Locked"],
  "entry.lockedFiled": [
    "Tämä tosite on mukana kauden {p} arvonlisäveroilmoituksessa, joka on merkitty ilmoitetuksi {d}. Kirjanpitolaki (2:7) ei salli muuttaa tositetta ilmoituksen jälkeen. Tee korjaustosite. Vain maksupäivän voi vielä merkitä. Jos ilmoitusta ei oikeasti ole annettu, poista merkintä ALV-laskelmasta.",
    "This voucher is on the VAT return for period {p}, marked as filed on {d}. The Accounting Act (2:7) does not allow changing a voucher after a return. Make a correction voucher. Only the payment date can still be set. If the return has not really been filed, remove the mark in the VAT view.",
  ],
  "entry.lockedYear": [
    "Vuosi {p} on merkitty talletetuksi {d}, joten sen tositteet ovat lukittuja. Tee korjaustosite. Vain maksupäivän voi vielä merkitä.",
    "Year {p} was marked as stored on {d}, so its vouchers are locked. Make a correction voucher. Only the payment date can still be set.",
  ],
  "entry.lockedForm5Paid": [
    "Tosite on maksettu vuonna {p}, ja sen vuoden veroilmoitus (lomake 5) on merkitty ilmoitetuksi {d}. Ilmoitus luki tositteen maksuvuoden mukaan, joten se on lukittu (kirjanpitolaki 2:7). Tee korjaustosite. Jos ilmoitusta ei oikeasti ole annettu, poista merkintä kohdasta Tuloslaskelma, Lomake 5.",
    "This voucher was paid in {p}, and the tax return (Form 5) for that year was marked as filed on {d}. The return counted it by the year it was paid, so it is locked (Accounting Act 2:7). Make a correction voucher. If the return has not really been filed, remove the mark under Income statement, Form 5.",
  ],
  "entry.lockedForm5": [
    "Vuoden {p} veroilmoitus (lomake 5) on merkitty ilmoitetuksi {d}, joten kaikki sen tositteet ovat lukittuja (kirjanpitolaki 2:7). Tee korjaustosite. Vain maksupäivän voi vielä merkitä, jos se on myöhemmältä vuodelta. Jos ilmoitusta ei oikeasti ole annettu, poista merkintä kohdasta Tuloslaskelma, Lomake 5.",
    "The tax return (Form 5) for {p} was marked as filed on {d}, so all its vouchers are locked (Accounting Act 2:7). Make a correction voucher. Only a payment date in a later year can still be set. If the return has not really been filed, remove the mark under Income statement, Form 5.",
  ],
  "entry.yearForm5Filed": [
    "Tämän vuoden veroilmoitus on merkitty ilmoitetuksi. Valitse toinen päivä.",
    "This year’s tax return is marked as filed. Choose another date.",
  ],
  "entry.paidInForm5Year": [
    "Tämä muuttaisi vuotta, jonka veroilmoitus on merkitty ilmoitetuksi. Maksupäivä voi olla vain myöhemmältä vuodelta.",
    "This would change a year whose tax return is marked as filed. The payment date can only be in a later year.",
  ],
  "entry.lockedRefused": [
    pl(
      "1 tosite on lukitulla kaudella, joten muutosta ei tehty.",
      "{n} tositetta on lukitulla kaudella, joten muutosta ei tehty."
    ),
    pl(
      "1 voucher is in a locked period, so nothing was changed.",
      "{n} vouchers are in a locked period, so nothing was changed."
    ),
  ],
  "entry.yearStored": [
    "Tämä vuosi on merkitty talletetuksi. Valitse toinen päivä.",
    "This year is marked as stored. Choose another date.",
  ],
  "entry.correction": ["Tee korjaustosite", "Make a correction voucher"],
  "entry.correctionOf": [
    "Korjaus: tosite {n}, {x}",
    "Correction: voucher {n}, {x}",
  ],
  "entry.historyTitle": ["Muutoshistoria", "Change history"],
  "entry.euPurchaseGoods": ["Kyllä, tavara", "Yes, goods"],
  "entry.euPurchaseServices": ["Kyllä, palvelu", "Yes, services"],
  "entry.euPurchaseInfo": ["Mikä on EU-osto?", "What is an EU purchase?"],
  "entry.euPurchaseVat": [
    "Tämä luokka on ostoille, jotka toisessa EU-maassa oleva myyjä laskuttaa ilman arvonlisäveroa. Kirjaa laskun summa. Vero {a} ({r}) menee ALV-ilmoitukselle sekä verona että vähennyksenä, joten maksettava vero ei muutu.",
    "This category is for purchases a seller in another EU country invoices without VAT. Book the invoice amount. The tax of {a} ({r}) goes on the VAT return both as tax and as a deduction, so the tax payable does not change.",
  ],
  "entry.euPurchaseNoDeduction": [
    "Tämän kulun veroa ei saa vähentää, joten se kasvattaa maksettavaa veroa. Vero ei tule tuloslaskelmaan tästä tositteesta, joten kirjaa se omana 0 %:n kulunaan.",
    "The tax on this cost can’t be deducted, so it adds to the tax payable. It does not reach the income statement from this voucher, so book it as a cost of its own at 0%.",
  ],
  "entry.buyerVat": ["Ostajan ALV-numero", "Buyer’s VAT number"],
  "entry.buyerVatHint": [
    "Tarvitaan yhteenvetoilmoitukseen.",
    "Needed for the EC Sales List.",
  ],
  "entry.buyerVatBad": [
    "Numero alkaa yleensä maakoodilla, esim. SE. Tarkista se VIES-palvelusta.",
    "A number usually starts with a country code, such as SE. Check it in VIES.",
  ],
  "entry.paid": ["Maksettu", "Paid"],
  "entry.paidInfo": [
    "Miksi maksupäivä kysytään?",
    "Why is the payment date asked?",
  ],
  "entry.paidInfoText": [
    "Tulos lasketaan maksupäivän mukaan, joten vuodenvaihteen yli maksettu tosite kuuluu maksuvuoteen. Avoin tosite jää tuloksesta pois ja näkyy saatavana tai velkana.",
    "The result goes by the payment date, so a voucher paid across a year-end belongs to the year it was paid. An open voucher stays out of the result and shows as a receivable or a payable.",
  ],
  "entry.paidSame": ["Samana päivänä", "On the same day"],
  "entry.paidLater": ["Toisena päivänä", "On another day"],
  "entry.paidOpen": ["Avoin, ei vielä maksettu", "Open, not paid yet"],
  "entry.paidDate": ["Maksupäivä", "Payment date"],
  "entry.paidHint": [
    "Tositteen päivä on toimitus- tai laskupäivä. Arvonlisävero menee sen mukaan.",
    "The voucher’s date is the delivery or invoice date. VAT goes by it.",
  ],
  "entry.privateUseHint": [
    "Tavaran oma käyttö on arvonlisäverollista, jos ostosta on vähennetty vero, ja 850 € vuodessa on verotonta. Auton kohdalla asia riippuu siitä, paljonko autosta on vähennetty.",
    "Taking goods into private use carries VAT if the VAT on the purchase was deducted, and the first 850 € a year is free. For a car it depends on how much of the car was deducted.",
  ],
  "entry.payrollHint": [
    "Tämä tosite ei korvaa palkkakirjanpitoa eikä tulorekisteri-ilmoitusta. Hoida ne muualla.",
    "This voucher does not replace payroll records or income register reporting. Handle those elsewhere.",
  ],
  "entry.ownerHint": [
    "Oma raha yrityksen ja oman tilisi välillä ei ole tuloa eikä kulua. Se ei vaikuta tulokseen eikä arvonlisäveroon. Liitä tiliote liitteeksi.",
    "Your own money moving between the business and your personal account is neither income nor an expense. It doesn’t affect the result or VAT. Attach the bank statement.",
  ],
  "entry.settles": ["Verokausi", "Tax period"],
  "entry.settlesHint": [
    "Arvonlisäveroilmoitus, jonka maksu tai palautus tämä on.",
    "The VAT return this payment or refund is for.",
  ],
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
    "Samana päivänä on jo tosite samalla summalla: nro {n}, {d}.",
    "There is already a voucher with this date and amount: no. {n}, {d}.",
  ],
  "entry.vatNotDeductible341": [
    "Edustuskulujen arvonlisäveroa ei saa vähentää (AVL 114 §). Kirjaa verollinen summa 0 %:n verokannalla, niin vero jää osaksi kulua.",
    "VAT on entertainment can’t be deducted (VAT Act 114 §). Book the amount including VAT at 0 %, so the tax stays part of the cost.",
  ],
  "entry.vatNotDeductible": [
    "Vähennyskelvottoman kulun arvonlisäveroa ei voi vähentää. Kirjaa verollinen summa 0 %:n verokannalla, niin vero jää osaksi kulua.",
    "VAT on a non-deductible expense can’t be deducted. Book the amount including VAT at 0 %, so the tax stays part of the cost.",
  ],
  "entry.amountMode": ["Verollisuus", "VAT treatment"],
  "entry.amountModeInfo": [
    "Mitä verollisuus tarkoittaa?",
    "What does VAT treatment mean?",
  ],
  "entry.amountModeInfoText": [
    "Kertoo, sisältääkö summa arvonlisäveron. Valitse Verollinen, jos kirjoitit loppusumman, jolloin vero lasketaan sen sisältä. Valitse Veroton, jos kirjoitit summan ilman veroa, jolloin vero lasketaan sen päälle.",
    "Says whether the amount includes VAT. Choose Incl. VAT if you entered the total, and the tax is worked out from within it. Choose Excl. VAT if you entered the amount without tax, and the tax is added on top.",
  ],
  "entry.saveAndNew": ["Tallenna ja uusi", "Save and add another"],
  "entry.errDate": ["Anna päivämäärä.", "Enter a date."],
  "entry.errAmount": [
    "Anna summa, esim. 124,50.",
    "Enter an amount, e.g. 124.50.",
  ],
  "entry.errCategory": ["Valitse luokka.", "Choose a category."],
  "entry.saved": ["Tosite tallennettu.", "Voucher saved."],
  "entry.changesSaved": ["Muutokset tallennettu.", "Changes saved."],
  "entry.deleted": ["Tosite poistettu.", "Voucher deleted."],
  "entry.deletedMany": [
    pl("1 tosite poistettu.", "{n} tositetta poistettu."),
    pl("1 voucher deleted.", "{n} vouchers deleted."),
  ],
  "entry.restoredMany": ["Tositteet palautettu.", "Vouchers restored."],
  "entry.addUndone": ["Lisäys kumottu.", "Addition undone."],
  "entry.editUndone": ["Muutokset kumottu.", "Changes undone."],
  "entry.editUndoChanged": [
    "Tositetta on muutettu sen jälkeen, joten muutosta ei voi kumota.",
    "The voucher has changed since, so the edit cannot be undone.",
  ],
  "entry.recategorized": [
    pl(
      "Luokka vaihdettu 1 tositteeseen.",
      "Luokka vaihdettu {n} tositteeseen."
    ),
    pl("Category changed on 1 voucher.", "Category changed on {n} vouchers."),
  ],
  "entry.recategorizeUndone": ["Luokat palautettu.", "Categories restored."],
  "entry.restored": ["Tosite palautettu.", "Voucher restored."],
  "entry.unknownCategory": ["Tuntematon luokka", "Unknown category"],

  // --- The paper preview's labels (§8.5) and the attachment files (§7.4) ---
  "receipt.description": ["Kuvaus", "Description"],
  "receipt.purchaseBadge": [
    "Vähennetään ostojen verona",
    "Deducted as VAT on purchases",
  ],
  "receipt.noVatBadge": ["Ei arvonlisäveroa", "No VAT"],
  "receipt.euPurchaseBadge": [
    "Vero {a} ilmoitetaan itse ALV-ilmoituksella",
    "The tax of {a} is reported on the VAT return",
  ],
  "receipt.sectionTitle": ["Liitteet", "Attachments"],
  "receipt.add": ["Lisää liite", "Add attachment"],
  "receipt.hint": [
    "Kuva tai PDF. Voit myös raahata tiedoston tähän.",
    "Image or PDF. You can also drag a file here.",
  ],
  "receipt.remove": ["Poista liite", "Remove attachment"],
  "receipt.open": ["Avaa liite", "Open attachment"],
  "receipt.missing": ["Tiedosto puuttuu", "File missing"],
  "receipt.count": [
    pl("1 liite", "{n} liitettä"),
    pl("1 attachment", "{n} attachments"),
  ],
  "receipt.badType": [
    "Vain kuvia ja PDF-tiedostoja voi liittää.",
    "Only images and PDF files can be attached.",
  ],
  "receipt.noStorage": [
    "Liitteiden tallennus ei ole käytettävissä tässä selaimessa.",
    "Saving attachments isn’t available in this browser.",
  ],
  "receipt.prefilled": [
    "Tiedot luettiin PDF:stä. Tarkista ne ennen tallennusta.",
    "Details were read from the PDF. Check them before saving.",
  ],
  "receipt.attachedElsewhere": [
    "Sama tiedosto on jo tositteessa nro {n}, {d}.",
    "The same file is already on voucher no. {n}, {d}.",
  ],
  "receipt.invoiceDescription": ["Lasku {number}", "Invoice {number}"],
  "receipt.drop": [
    "Pudota tiedosto lisätäksesi sen liitteeksi",
    "Drop a file to attach it to the voucher",
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
  /* The money that moved for a return, booked as an entry (§6.6). */
  "vat.ecTab": ["Yhteenvetoilmoitus", "EC Sales List"],
  "vat.ecIntro": [
    "Ilmoitus annetaan kuukausittain, vain kuukaudelta, jolla on tällaista myyntiä, ja se eritellään ostajittain. Tavarat menevät laskun kuukauden mukaan, ja palvelut suorituksen tai maksun kuukauden mukaan. Tässä kuukausi on tositteen päivän mukainen.",
    "The list is filed monthly, only for a month with such sales, and itemised by buyer. Goods go by the invoice’s month, and services by the month of the supply or payment. Here the month follows the voucher’s date.",
  ],
  "vat.ecNone": [
    "Vuonna {y} ei ole myyntiä muihin EU-maihin.",
    "There are no sales to other EU countries in {y}.",
  ],
  "vat.ecDue": ["Annettava viimeistään {d}", "Due by {d}"],
  "vat.ecBuyer": ["Ostajan ALV-numero", "Buyer’s VAT number"],
  "vat.ecGoods": ["Tavarat", "Goods"],
  "vat.ecServices": ["Palvelut", "Services"],
  "vat.ecNoNumber": ["Numero puuttuu", "Number missing"],
  "vat.ecUnsorted": [
    "{a} vanhalla luokalla Myynti – EU. Vaihda luokka.",
    "{a} on the old category Sales – EU. Change the category.",
  ],
  "vat.settlementHint": [
    "Kirjanpito ei näe pankkia. Kirjaa maksu tai palautus, kun raha on liikkunut, ja liitä tiliote. Tosite saa tositenumeron, mutta se ei ole tulo eikä kulu eikä muuta ilmoitusta.",
    "The bookkeeping cannot see your bank. Book the payment or refund once the money has moved, and attach the bank statement. It gets a voucher number, but it is neither income nor an expense and does not change the return.",
  ],
  "vat.settlementAddPayment": ["Kirjaa maksu", "Book payment"],
  "vat.settlementAddRefund": ["Kirjaa palautus", "Book refund"],
  "vat.settlementPaidOn": ["Maksettu {d}", "Paid on {d}"],
  "vat.settlementReceivedOn": ["Palautus saatu {d}", "Refund received on {d}"],
  "vat.settlementVoucher": ["tosite {n}", "voucher {n}"],
  "vat.settlementOpen": ["Avaa tosite", "Open voucher"],
  "vat.settlementDescPayment": ["Arvonlisävero, {p}", "VAT, {p}"],
  "vat.settlementDescRefund": [
    "Arvonlisäveron palautus, {p}",
    "VAT refund, {p}",
  ],
  "vat.settlementMatches": [
    "Täsmää laskelman kanssa.",
    "Matches the calculation.",
  ],
  "vat.settlementDifference": [
    "Ero laskelmaan on {x}. Se voi johtua osamaksusta, palautuksen käyttämisestä muihin veroihin tai tositteisiin tehdyistä muutoksista.",
    "This differs from the calculation by {x}. A part payment, a refund used for other taxes or a change to the vouchers can cause that.",
  ],
  "vat.settlementWider": [
    "Tosite koskee pidempää kautta, joten sitä ei verrata tämän kauden laskelmaan.",
    "This voucher covers a longer period, so it is not compared with this period’s calculation.",
  ],
  "vat.returnStepSettle": [
    "Kirjaa maksu tai palautus",
    "Book the payment or refund",
  ],
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
  "vat.formulaEu": [
    "Myynnin ja EU-ostojen vero {a} − vähennettävä vero {b}",
    "VAT on sales and EU purchases {a} − deductible VAT {b}",
  ],
  "vat.euPurchases": [
    "Ostot muista EU-maista",
    "Purchases from other EU countries",
  ],
  "vat.euGoodsPurchases": ["Tavaraostot", "Purchases of goods"],
  "vat.euGoodsTax": ["Vero tavaraostoista", "Tax on goods"],
  "vat.euServicesPurchases": ["Palveluostot", "Purchases of services"],
  "vat.euServicesTax": ["Vero palveluostoista", "Tax on services"],
  "vat.euDeductible": ["Tästä vähennettävä vero", "Of which deductible"],
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
    "Ostojen 0 %:n tositteet (esim. palkat, YEL, pankkikulut) eivät vaikuta arvonlisäveroon, joten niitä ei näytetä vähennyksissä. Tarkista luvut ennen ilmoittamista OmaVerossa.",
    "Purchases at 0% (e.g. wages, YEL, bank fees) don’t affect VAT, so they aren’t shown as deductions. Check the figures before filing in OmaVero.",
  ],
  "vat.sections": ["ALV-laskelman osiot", "VAT return sections"],
  "vat.sheetTab": ["Laskelma", "Calculation"],
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
  "vat.returnFileHint": [
    "Kirjanpito ei näe OmaVeroa. Merkitse kausi ilmoitetuksi, kun olet lähettänyt ilmoituksen. Merkintä lukitsee kauden tositteet, koska kirjanpitolaki (2:7) ei salli muuttaa niitä ilmoituksen jälkeen.",
    "The bookkeeping cannot see MyTax. Mark the period as filed once you have sent the return. The mark locks the period’s vouchers, because the Accounting Act (2:7) does not allow changing them after a return.",
  ],
  "vat.returnButton": ["Ilmoita OmaVerossa", "Report in OmaVero"],
  "vat.returnOpenFiled": ["Ilmoitettu", "Filed"],
  "vat.returnDialogTitle": ["Arvonlisäveroilmoitus: {p}", "VAT return: {p}"],
  "vat.returnDialogIntro": [
    "Käy läpi tarkistukset, kopioi summat OmaVeroon ja merkitse kausi ilmoitetuksi.",
    "Go through the checks, copy the amounts into OmaVero and mark the period as filed.",
  ],
  "vat.returnSteps": ["Vaiheet", "Steps"],
  "vat.returnStepChecks": ["Tarkistukset", "Checks"],
  "vat.returnStepValues": ["Summat", "Amounts"],
  "vat.returnStepFile": ["Merkintä", "Mark"],
  "vat.returnStepPay": ["Maksu", "Payment"],
  "vat.returnFileTitle": ["Merkitse {p} ilmoitetuksi", "Mark {p} as filed"],
  "vat.returnBack": ["Takaisin", "Back"],
  "vat.returnNext": ["Seuraava", "Next"],
  "vat.returnDone": ["Valmis", "Done"],
  "vat.returnAllClear": [
    "Ei huomautettavaa. Kausi on valmis ilmoitettavaksi.",
    "Nothing to flag. The period is ready to report.",
  ],
  "vat.returnOngoing": ["{p} on vielä kesken", "{p} is still ongoing"],
  "vat.returnOngoingSub": [
    "Kauden voi merkitä ilmoitetuksi vasta, kun se on päättynyt. Eräpäivä on {d}. Summat näkyvät jo nyt, mutta ne voivat muuttua.",
    "A period can be marked as filed only once it has ended. It is due {d}. The amounts are visible already, but they may change.",
  ],
  "vat.returnNoEntries": [
    "Kaudella {p} ei ole tositteita",
    "{p} has no vouchers",
  ],
  "vat.returnNoEntriesSub": [
    "Ilmoitus on nollailmoitus. Tarkista, ettei tositteita puutu.",
    "This is a nil return. Check that no vouchers are missing.",
  ],
  "vat.returnUnsavedSub": [
    "Tallenna tiedosto ennen merkintää, jotta merkintä ja tositteet päätyvät samaan tiedostoon.",
    "Save the file before marking, so the mark and the vouchers end up in the same file.",
  ],
  "vat.returnEarlierUnfiled": [
    "Aiempia kausia ei ole merkitty ilmoitetuiksi: {p}",
    "Earlier periods not marked as filed: {p}",
  ],
  "vat.returnEarlierUnfiledSub": [
    "Merkitse ne ilmoitetuiksi, jos ne on jo annettu. Muuten ne näkyvät myöhässä olevina.",
    "Mark them as filed if they are already filed. Otherwise they show as overdue.",
  ],
  "vat.returnOtherRate": [
    "Kaudella on myyntiä verokannalla, jolle ilmoituksessa ei ole kohtaa ({v} veroa). Se ei ole kohdissa, mutta sisältyy maksettavaan veroon. Tarkista tositteiden verokannat.",
    "This period has sales at a rate the return has no field for ({v} of VAT). It is not in the fields, but it is included in the tax payable. Check the rates on the vouchers.",
  ],
  "vat.returnPurchases": [
    "Kirjanpito ei erottele tuontia EU:n ulkopuolelta eikä rakentamispalvelun ja metalliromun ostoja. Jos sinulla on niitä, täytä niiden vero ja summa OmaVerossa, ja lisää vero myös vähennettävään veroon, jos saat vähentää sen. Maksettava vero muuttuu silloin.",
    "The bookkeeping does not separate imports from outside the EU or purchases of construction services and scrap metal. If you have any, enter their tax and amount in MyTax, and add the tax to the deductible tax if you may deduct it. The tax payable then changes.",
  ],
  "vat.returnCodes": [
    "Numerot ovat Verohallinnon tunnukset tiedoille. Kohtien nimet ja järjestys noudattavat OmaVeron ilmoitusta.",
    "The numbers are the Tax Administration’s codes for the fields. The names and order follow the return in MyTax.",
  ],
  // An EU, non-EU or reverse-charge sale that carries a VAT rate (§6.1).
  "vat.exemptSaleWarning": [
    "Tositteessa ”{x}” on verokanta, mutta luokka raportoidaan ilman myynnin veroa. Vero jätetään huomiotta.",
    "The voucher “{x}” has a VAT rate, but its category is reported without VAT on sales. The VAT is ignored.",
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
  "statement.yearEndButton": ["Ilmoita OmaVerossa", "Report in OmaVero"],
  "statement.yearEndOpenFiled": ["Vuosi lukittu", "Year locked"],
  "statement.yearEndTitle": [
    "Vuoden {y} ilmoitus OmaVeroon",
    "Reporting {y} in OmaVero",
  ],
  "statement.yearEndIntro": [
    "Käy läpi tarkistukset, kopioi summat OmaVeroon ja lukitse vuosi.",
    "Go through the checks, copy the amounts into OmaVero and lock the year.",
  ],
  "statement.yearEndSteps": ["Vaiheet", "Steps"],
  "statement.yearEndStepChecks": ["Tarkistukset", "Checks"],
  "statement.yearEndStepValues": ["Summat", "Amounts"],
  "statement.yearEndStepLock": ["Lukitus", "Lock"],
  "statement.yearEndBack": ["Takaisin", "Back"],
  "statement.yearEndNext": ["Seuraava", "Next"],
  "statement.yearEndOpen": ["Avaa", "Open"],
  "statement.yearEndAllClear": [
    "Ei huomautettavaa. Vuosi on valmis ilmoitettavaksi.",
    "Nothing to flag. The year is ready to report.",
  ],
  "statement.yearEndOngoing": [
    "Vuosi {y} on vielä kesken",
    "{y} is still ongoing",
  ],
  "statement.yearEndOngoingSub": [
    "Vuoden voi lukita vasta, kun se on päättynyt. Summat näkyvät jo nyt.",
    "A year can be locked only once it has ended. The amounts are visible already.",
  ],
  "statement.yearEndNoEntries": [
    "Vuodella {y} ei ole tositteita",
    "{y} has no vouchers",
  ],
  "statement.yearEndNoEntriesSub": [
    "Ilmoitus on tyhjä. Tarkista, ettei tositteita puutu.",
    "The return is empty. Check that no vouchers are missing.",
  ],
  "statement.yearEndUnsavedSub": [
    "Tallenna tiedosto ennen lukitusta, jotta lukitus ja tositteet päätyvät samaan tiedostoon.",
    "Save the file before locking, so the lock and the vouchers end up in the same file.",
  ],
  "statement.yearEndVatUnfiled": [
    "ALV-ilmoituksia ei ole merkitty ilmoitetuiksi: {p}",
    "VAT returns not marked as filed: {p}",
  ],
  "statement.yearEndVatUnfiledSub": [
    "Lomake 5 lukitsee koko vuoden. Merkitse ALV-ilmoitukset ensin, jos ne on jo annettu.",
    "Form 5 locks the whole year. Mark the VAT returns first if they are already filed.",
  ],
  "statement.yearEndDepreciation": [
    "Poistoa ei ole kirjattu",
    "No depreciation is booked",
  ],
  "statement.yearEndDepreciationSub": [
    "Koneiden ja kaluston enimmäispoisto on {a}. Poiston voi kirjata vain ennen lukitusta.",
    "The maximum depreciation on machinery and equipment is {a}. It can be booked only before the lock.",
  ],
  "statement.yearEndPrivateCar": [
    "Auton yksityiskäyttö {a} vaatii ajotiedot",
    "Private use of a car, {a}, needs the driving details",
  ],
  "statement.yearEndPrivateCarSub": [
    "OmaVero laskee kohdan 313 itse ajetuista kilometreistä ja autokuluista, eikä lomake mene läpi ilman niitä. Anna ne OmaVerossa (271, 273, 381 ja 396) ja tarkista, että 313 vastaa kirjattua summaa.",
    "OmaVero works out field 313 itself from the kilometres and car costs, and the form is not accepted without them. Enter them in OmaVero (271, 273, 381 and 396) and check that 313 matches the booked amount.",
  ],
  "statement.yearEndFigures": [
    "Vuoden lopun varat ja velat puuttuvat",
    "Year-end assets and liabilities are missing",
  ],
  "statement.yearEndFiguresSub": [
    "Varasto, käteinen ja muut luvut lasketaan nollaksi, jos et täytä niitä.",
    "Goods, cash in hand and the other figures count as zero unless you enter them.",
  ],
  "statement.yearEndLockTitle": ["Lukitse vuosi {y}", "Lock {y}"],
  "statement.yearEndLockWarn": [
    "{n} huomautusta on vielä auki. Voit lukita vuoden silti.",
    "{n} flags are still open. You can lock the year anyway.",
  ],
  "statement.yearEndLockAction": [
    "Merkitse ilmoitetuksi ja lukitse",
    "Mark as filed and lock",
  ],
  "statement.yearEndLocked": ["Vuosi {y} on lukittu.", "{y} is locked."],
  "statement.form5Title": [
    "Lomake 5, elinkeinotoiminnan veroilmoitus",
    "Form 5, business tax return",
  ],
  "statement.form5Kicker": ["Verovuosi {y}", "Tax year {y}"],
  "statement.form5Intro": [
    "Napsauta summaa, niin se kopioituu. Liitä se OmaVerossa saman numeron kohtaan.",
    "Click an amount to copy it. Paste it into the field with the same code in MyTax.",
  ],
  "statement.form5Assumed": [
    "Poistot (337) vähennetään Poistot-sivun enimmäismäärään asti, joten 338 on enintään yhtä suuri kuin 337. Korkokulut (346) on laskettu kokonaan vähennyskelpoisiksi, joten 347 on sama summa. Jos osa koroista ei ole vähennyskelpoista, muuta kohtaa OmaVerossa, jolloin myös 355 ja tulos muuttuvat.",
    "Depreciation (337) is deducted up to the maximum on the Depreciation page, so 338 is at most 337. Interest expenses (346) are counted as fully deductible, so 347 is the same amount. If part of the interest is not deductible, change that field in OmaVero, and 355 and the result change with it.",
  ],
  "statement.cashNote": [
    "Ammatinharjoittajan maksuperuste (EVL 27 a §): tulot ja kulut ovat maksupäivän mukaan, eikä avoimia tositteita ole mukana. Myyntisaamiset {d}: {r}. Ostovelat {d}: {p}.",
    "An ammatinharjoittaja’s cash basis (EVL 27 a §): income and expenses go by payment date, and open vouchers are left out. Receivables on {d}: {r}. Payables on {d}: {p}.",
  ],
  "statement.form5FileHint": [
    "Kun olet antanut ilmoituksen OmaVerossa, merkitse se tähän. Se lukitsee kaikki vuoden {y} tositteet, koska kirjanpitolaki (2:7) ei salli muuttaa niitä ilmoituksen jälkeen.",
    "Once you have filed the return in OmaVero, mark it here. That locks every voucher of {y}, because the Accounting Act (2:7) does not allow changing them after a return.",
  ],
  "statement.form5FiledOn": [
    "Merkitty ilmoitetuksi {d}. Vuoden tositteet ovat lukittuja.",
    "Marked as filed on {d}. The year’s vouchers are locked.",
  ],
  "statement.form5Payroll": [
    "Kirjanpito ei sisällä palkkakirjanpitoa eikä tulorekisteri-ilmoituksia.",
    "The bookkeeping includes no payroll records or income register reporting.",
  ],
  "statement.form5Missing": [
    "Kirjanpito ei täytä julkisesti noteerattujen osuuskuntien ylijäämiä (325, 326), jotka Verohallinnon mukaan puuttuivat vuonna 2026, eikä lomakkeen muita osia, kuten poistoerittelyä ja ajoneuvoja. Ne täytetään OmaVerossa.",
    "The bookkeeping does not fill surplus from listed co-operatives (325, 326), which the Tax Administration says did not exist in 2026, or the form’s other sections, such as the depreciation breakdown and vehicles. Fill those in OmaVero.",
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
  "statement.surplusNote": [
    "Osuuskuntien ylijäämät {a}, josta veronalaista {b}. Veronalaista on 25 % ensimmäisestä 5 000 eurosta ja 75 % siitä ylittävästä osasta. Helpotus on yksi henkilöä kohden vuodessa, ja se käytetään elinkeinotoimintaan viimeisenä. Jos olet käyttänyt sen jo muussa tulolähteessä, muuta kohtaa 328 OmaVerossa.",
    "Co-operative surplus {a}, of which {b} is taxable. 25% of the first 5,000 euros is taxable and 75% of the rest. The relief is one per person per year and is applied to business income last. If you have used it in another income source, change field 328 in OmaVero.",
  ],
  "statement.depreciationNote": [
    "Poistoja on kirjattu {a} yli Poistot-sivun enimmäismäärän. Tämä osa ei ole vähennyskelpoinen, eikä se ole mukana tuloksessa. Tarkista Poistot-sivun avaussaldo ja ostot.",
    "Depreciation of {a} is booked above the maximum on the Depreciation page. That part is not deductible and is left out of the result. Check the opening balance and purchases on that page.",
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
  "summary.bucketPersonnel": ["Henkilöstökulut", "Staff expenses"],
  "summary.bucketDepreciation": [
    "Tilat, poistot ja edustus",
    "Premises, depreciation and entertainment",
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
  "recurring.repeatInfo": [
    "Mitä toistaminen tekee?",
    "What does repeating do?",
  ],
  "recurring.repeatHint": [
    "Tosite jää pohjaksi. Mikään ei kirjaudu itsestään: kun kuukaudelta puuttuu tämä tosite, Kirjanpito ja Yleiskatsaus muistuttavat siitä, ja voit lisätä sen sieltä. Pohjia voi muokata kohdassa Asetukset, Toistuvat.",
    "The voucher is kept as a template. Nothing is booked by itself: when a month lacks this voucher, the ledger and the overview remind you, and you can add it from there. You can edit templates in Settings, Recurring.",
  ],
  "recurring.dueTitle": [
    pl(
      "1 toistuva tosite lisäämättä tältä kuulta",
      "{n} toistuvaa tositetta lisäämättä tältä kuulta"
    ),
    pl(
      "1 recurring voucher not added for this month",
      "{n} recurring vouchers not added for this month"
    ),
  ],
  "recurring.noticeTitle": [
    pl(
      "1 toistuva tosite lisäämättä: {m}",
      "{n} toistuvaa tositetta lisäämättä: {m}"
    ),
    pl(
      "1 recurring voucher not added: {m}",
      "{n} recurring vouchers not added: {m}"
    ),
  ],
  "recurring.review": ["Tarkista ja lisää", "Review and add"],
  "recurring.dialogTitle": [
    "Toistuvat tositteet: {m}",
    "Recurring vouchers: {m}",
  ],
  "recurring.dialogHint": [
    "Valitse tämän kuun tositteet. Voit muokata summaa ja lisätä liitteen jälkeenpäin.",
    "Choose this month’s vouchers. You can change an amount and add an attachment afterwards.",
  ],
  "recurring.noneDue": [
    "Kaikki tämän kuun toistuvat tositteet on lisätty.",
    "All of this month’s recurring vouchers have been added.",
  ],
  "recurring.addSelected": [
    pl("Lisää 1 tosite", "Lisää {n} tositetta"),
    pl("Add 1 voucher", "Add {n} vouchers"),
  ],
  "recurring.added": [
    pl("1 tosite lisätty.", "{n} tositetta lisätty."),
    pl("1 voucher added.", "{n} vouchers added."),
  ],
  "recurring.settingsTitle": ["Toistuvat tositteet", "Recurring vouchers"],
  "recurring.settingsHint": [
    "Pohja syntyy, kun valitset tositteessa ”Toista joka kuukausi”. Mikään ei kirjaudu itsestään: tositteet lisätään kuukausittain Kirjanpito-näkymästä. Pohjan muutos tai poisto ei muuta jo tehtyjä tositteita.",
    "A template is made when you choose “Repeat every month” on a voucher. Nothing is booked by itself: you add the vouchers month by month in the ledger. Changing or deleting a template leaves existing vouchers as they are.",
  ],
  "recurring.empty": ["Ei toistuvia tositteita.", "No recurring vouchers."],
  "recurring.description": ["Kuvaus", "Description"],
  "recurring.category": ["Luokka", "Category"],
  "recurring.amount": ["Summa", "Amount"],
  "recurring.day": ["Päivä", "Day"],
  "recurring.from": ["Alkaen", "From"],
  "recurring.deleted": [
    "Toistuva tosite poistettu.",
    "Recurring voucher deleted.",
  ],
  "recurring.remove": ["Poista {x}", "Delete {x}"],

  // --- Fixed assets ---

  "balance.tab": ["Varat ja velat", "Assets and liabilities"],
  "balance.intro": [
    "Varat ja velat ratkaisevat, kuinka suuri osa tuloksesta on pääomatuloa. Täytä ne OmaVeroon tilikauden päättymisen tilanteen mukaan.",
    "Assets and liabilities decide how much of the profit counts as capital income. Enter them in OmaVero as they stood at the end of the financial year.",
  ],
  "balance.notBank": [
    "Pankkitalletukset eivät kuulu näihin kohtiin.",
    "Bank deposits are in none of these fields.",
  ],
  "balance.missing": [
    "Kiinteistöjä (703) ja arvopapereita (705, 745) kirjanpito ei täytä, koska ne eritellään lomakkeilla 18B ja 8B. Oikaistu negatiivinen oma pääoma (747) täytetään OmaVerossa. Jos sinulla on näitä, kohdat 718, 725 ja nettovarallisuus ovat OmaVerossa eri summat kuin tässä.",
    "The bookkeeping does not fill real estate (703) or securities (705, 745), which are itemised on Forms 18B and 8B. Adjusted negative equity (747) is entered in OmaVero. If you have any of these, fields 718 and 725 and the net worth differ in OmaVero from the amounts here.",
  ],
  "balance.figuresTitle": [
    "Mistä varat ja velat tulevat",
    "Where the assets and liabilities come from",
  ],
  "balance.editFigures": ["Muokkaa lukuja", "Edit the figures"],
  "balance.figures": [
    "Tositteista: myyntisaamiset {r}, ostovelat {p}, lainat {l}. Poistolaskelmasta: koneet ja kalusto {m}.",
    "From the vouchers: receivables {r}, payables {p}, loans {l}. From the depreciation register: machinery and equipment {m}.",
  ],
  "balance.yearEndTitle": ["Tilanne {d}", "Position on {d}"],
  "balance.yearEndFiled": [
    "Vuoden veroilmoitus on merkitty ilmoitetuksi, joten nämä luvut ovat lukittuja. Poista merkintä välilehdeltä Lomake 5, jos sinun on muutettava niitä.",
    "The year’s tax return is marked as filed, so these figures are locked. Remove the mark on the Form 5 tab if you need to change them.",
  ],
  "balance.yearEndHint": [
    "Kirjanpito ei tiedä näitä, joten kirjoita ne tähän. Tyhjä kohta on nolla. Luvut tallentuvat kirjanpitotiedostoon, ja kopioit ne OmaVeroon välilehdeltä Lomake 5.",
    "The bookkeeping cannot know these, so enter them here. An empty field is zero. They are saved in the bookkeeping file, and you copy them into OmaVero from the Form 5 tab.",
  ],
  "balance.goods": ["Tavarat (708)", "Goods (708)"],
  "balance.otherCurrent": [
    "Muu vaihto-omaisuus (709)",
    "Other current assets (709)",
  ],
  "balance.otherFixed": [
    "Muu käyttöomaisuus (706)",
    "Other fixed assets (706)",
  ],
  "balance.cash": ["Käteisvarat (714)", "Cash in hand (714)"],
  "balance.otherFinancial": [
    "Muu rahoitusomaisuus (716)",
    "Other financial assets (716)",
  ],
  "balance.loanCurrent": [
    "Lainoista vuoden sisällä erääntyvä osa",
    "Part of the loans due within a year",
  ],
  "balance.otherCurrentDebt": [
    "Muut lyhytaikaiset velat",
    "Other current liabilities",
  ],
  "balance.otherLongDebt": [
    "Muut pitkäaikaiset velat",
    "Other non-current liabilities",
  ],
  "balance.loanOpening": [
    "Lainat vuoden {y} alussa",
    "Loans at the start of {y}",
  ],
  "balance.figuresDialogTitle": [
    "Varat ja velat {y}",
    "Assets and liabilities {y}",
  ],
  "balance.figuresDone": ["Valmis", "Done"],
  "balance.goodsHelp": [
    "Jälleenmyyntiin ostetut tavarat, jotka ovat varastossa vuoden viimeisenä päivänä. Arvo on hankintameno. Jos sinulla ei ole myyntivarastoa, jätä tyhjäksi.",
    "Goods bought for resale that are in stock on the last day of the year, valued at cost. Leave empty if you hold no stock for sale.",
  ],
  "balance.otherCurrentHelp": [
    "Aineet, tarvikkeet ja itse valmistetut keskeneräiset tai valmiit tuotteet vuoden lopussa. Arvo on hankinta- tai valmistusmeno.",
    "Materials, supplies and self-made unfinished or finished products at year end, valued at cost.",
  ],
  "balance.otherFixedHelp": [
    "Pitkäaikainen omaisuus, joka ei ole koneita tai kalustoa, kiinteistöjä tai arvopapereita. Esimerkkejä ovat soranottopaikat ja sillat. Koneet ja kalusto tulevat Poistot-välilehdeltä.",
    "Long-term property that is not machinery, equipment, real estate or securities, such as gravel pits or bridges. Machinery and equipment come from the Depreciation tab.",
  ],
  "balance.cashHelp": [
    "Käteinen, joka sinulla on yrityksen kassassa vuoden viimeisenä päivänä. Pankkitilin saldo ei kuulu tähän.",
    "Cash you hold for the business on the last day of the year. A bank balance does not belong here.",
  ],
  "balance.otherFinancialHelp": [
    "Muu rahoitusomaisuus kuin pankkitalletukset, saamiset ja arvopaperit. Useimmilla toiminimillä tämä on tyhjä.",
    "Financial assets other than bank deposits, receivables and securities. For most sole traders this stays empty.",
  ],
  "balance.loanCurrentHelp": [
    "Se osa yrityksen lainoista, joka erääntyy seuraavan 12 kuukauden aikana. Kirjanpito laskee lainat kokonaisuudessaan tositteista, ja tämä summa siirretään pitkäaikaisista lyhytaikaisiin.",
    "The part of the business loans that falls due in the next 12 months. The bookkeeping works out the loans in full from the vouchers, and this amount moves from non-current to current.",
  ],
  "balance.otherCurrentDebtHelp": [
    "Alle vuoden sisällä maksettavat velat, jotka eivät ole ostovelkoja tai lainoja. Avoimet ostolaskut tulevat tositteista, joten niitä ei kirjoiteta tähän.",
    "Debts due within a year that are not purchase payables or loans. Open purchase invoices come from the vouchers, so do not enter them here.",
  ],
  "balance.otherLongDebtHelp": [
    "Yli vuoden päästä erääntyvät velat, jotka eivät ole lainoja. Lainat tulevat tositteista.",
    "Debts due in over a year that are not loans. Loans come from the vouchers.",
  ],
  "balance.loanOpeningHelp": [
    "Yrityksen lainojen saldo kirjanpidon aloitusvuoden alussa. Sen jälkeiset nostot ja lyhennykset tulevat tositteista.",
    "The balance of the business loans at the start of the year the books begin. Later drawdowns and repayments come from the vouchers.",
  ],
  "balance.badAmount": [
    "Anna summa, esim. 124,50.",
    "Enter an amount, e.g. 124.50.",
  ],
  "balance.inventoryTitle": ["Varaston muutos", "Change in inventory"],
  "balance.inventoryHint": [
    "Tavarat ja muu vaihto-omaisuus edellisen vuoden lopusta tämän vuoden loppuun. Tosite riville 333: {a}. Varaston kasvu pienentää kuluja.",
    "Goods and other current assets from the end of last year to the end of this one. The voucher on line 333: {a}. A growing stock lowers the cost.",
  ],
  "balance.inventoryBook": ["Kirjaa varaston muutos", "Book the change"],
  "balance.inventoryBooked": [
    "Varaston muutos on kirjattu tälle vuodelle.",
    "The change in inventory is booked for this year.",
  ],
  "balance.inventoryEntry": ["Varaston muutos {y}", "Change in inventory {y}"],
  "balance.assetsTitle": ["Varat", "Assets"],
  "balance.assetsHint": [
    "Mitä omistat tilikauden lopussa. Pankkitalletuksia ei kirjata.",
    "What you own at the end of the year. Bank deposits are left out.",
  ],
  "balance.debtsTitle": ["Velat", "Liabilities"],
  "balance.debtsHint": [
    "Mitä olet velkaa tilikauden lopussa. Avoimet ostolaskut tulevat tositteista.",
    "What you owe at the end of the year. Open purchase invoices come from the vouchers.",
  ],
  "balance.total": ["Yhteensä", "Total"],
  "balance.statAssets": ["Syötetyt varat", "Assets entered"],
  "balance.statDebts": ["Syötetyt velat", "Liabilities entered"],
  "balance.statStock": ["Varaston muutos", "Change in stock"],
  "balance.statHint": [
    "Ei sisällä tositteista laskettua",
    "Excludes what the vouchers add",
  ],
  "balance.locked": ["Lukittu", "Locked"],
  "balance.stockOpening": ["Varasto vuoden alussa", "Stock at start of year"],
  "balance.stockClosing": ["Varasto vuoden lopussa", "Stock at end of year"],
  "balance.stockCost": ["Kirjattava kulu", "Cost to book"],
  "assets.tab": ["Poistot", "Depreciation"],
  "assets.title": ["Koneet ja kalusto {y}", "Machinery and equipment {y}"],
  "assets.intro": [
    "Yli kolme vuotta käytettävä tai yli 1 200 euron hankinta kirjataan luokkaan ”Koneiden ja kaluston hankinta”. Sen alv lasketaan ALV-ilmoitukselle, mutta kulu vähennetään poistoina. Poisto on enintään 25 % menojäännöksestä, ja 1 200 euron tai pienemmän menojäännöksen voi poistaa kerralla.",
    "A purchase with a life of over three years or a price over €1,200 goes on the “Purchase of machinery and equipment” category. Its VAT counts on the VAT return, but the cost is deducted as depreciation. Depreciation is at most 25% of the undepreciated balance, and a balance of €1,200 or less can be written off at once.",
  ],
  "assets.smallNote": [
    "Pienhankinnan (enintään 1 200 euroa, yhteensä enintään 3 600 euroa vuodessa) ja enintään kolme vuotta käytettävän hankinnan voi kirjata suoraan kuluksi. Rivin 337 tositteet luetaan tämän menojäännöksen poistoiksi. Rakennukset ja muu poistettava omaisuus eivät kuulu tähän laskelmaan.",
    "A small purchase (up to €1,200, up to €3,600 a year in total) or one with a life of up to three years can be booked straight as an expense. Vouchers on line 337 are read as depreciation of this balance. Buildings and other depreciable assets are not part of this calculation.",
  ],
  "assets.noneTitle": ["Ei käyttöomaisuutta", "No fixed assets"],
  "assets.noneBody": [
    "Kirjaa hankinta luokkaan ”Koneiden ja kaluston hankinta”, tai anna alla menojäännös, jos sinulla on jo poistettavaa omaisuutta.",
    "Book a purchase on the “Purchase of machinery and equipment” category, or enter a balance below if you already have assets to depreciate.",
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
    "Poiston voi tehdä enimmäismäärää pienempänä. Tosite tehdään riville 337.",
    "You can depreciate less than the maximum. The voucher goes on line 337.",
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
  "assets.purchase": ["Hankinta", "Purchase"],
  "assets.sale": ["Myynti", "Sale"],
  "assets.used": ["Enimmäispoistosta kirjattu", "Booked of the maximum"],
  "assets.calculation": ["Poistopohjan lasku", "How the base is worked out"],
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
    "Matkojen ja yksityisauton lisävähennykset kirjataan riville 364 (veroilmoituksen kohdat 388 ja 392) ja työhuonevähennys riville 354, kirjanpidon ulkopuolisiin vähennyskelpoisiin kuluihin. Laskelmat käyttävät Verohallinnon vuoden {y} määriä, ja ne ovat apuväline: säilytä ajopäiväkirja ja matkojen tiedot itse.",
    "The travel and private car deductions go on line 364 (fields 388 and 392 of the return), and the home office deduction on line 354, deductible expenses outside the books. The calculators use the Tax Administration’s amounts for {y}. They are an aid: keep your own logbook and trip records.",
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
  "deductions.calculate": ["Laske ja kirjaa", "Calculate and book"],
  "deductions.mileageCard": [
    "Työajot omalla autolla, vähennettynä auton kirjatuilla kuluilla.",
    "Business driving in your own car, less the car’s booked costs.",
  ],
  "deductions.perDiemCard": [
    "Tilapäiset työmatkat, vähennettynä kirjatuilla elantokuluilla.",
    "Temporary work trips, less the booked living costs.",
  ],
  "deductions.homeCard": [
    "Kaavamainen vähennys kodin käytöstä työhön.",
    "A standard deduction for using your home for work.",
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
  "deductions.statBooked": ["Kirjattu yhteensä", "Booked in total"],
  "deductions.statVouchers": ["Tositteita", "Vouchers"],
  "deductions.bookedTitle": ["Kirjattu vuodelle {y}", "Booked for {y}"],
  "deductions.noneBooked": [
    "Riveillä 354 ja 364 ei ole vielä tositteita.",
    "No vouchers on lines 354 and 364 yet.",
  ],

  "memo.title": ["Muistiotosite", "Memo voucher"],
  "memo.made": ["Laadittu {d}", "Made on {d}"],
  "memo.entryTitle": ["Kirjaus", "Entry"],
  "memo.date": ["Päivämäärä", "Date"],
  "memo.description": ["Kuvaus", "Description"],
  "memo.account": ["Tili", "Account"],
  "memo.amount": ["Summa", "Amount"],
  "memo.calcTitle": ["Laskelma", "Calculation"],
  "memo.selfMade": [
    "Kirjanpitovelvollisen itse laatima tosite (kirjanpitolaki 2:5). Laskelma on tehty Kirjanpito-sovelluksen laskurilla laatimispäivänä.",
    "A voucher prepared by the trader (Accounting Act 2:5). The calculation was made with the Kirjanpito app’s calculator on the date shown.",
  ],
  "memo.failed": [
    "Muistiotositetta ei voitu tallentaa, joten tosite kirjataan ilman liitettä. Liitä laskelma itse.",
    "The memo voucher could not be stored, so the voucher is booked without an attachment. Attach the calculation yourself.",
  ],
  "memo.depreciationHeading": ["Poisto {y}", "Depreciation {y}"],
  "memo.thisDepreciation": [
    "Tällä tositteella kirjattava poisto",
    "Depreciation booked by this voucher",
  ],
  "memo.closingAfter": [
    "Menojäännös tämän poiston jälkeen",
    "Balance after this depreciation",
  ],
  "memo.depreciationRule": [
    "Koneiden ja kaluston poisto on enintään 25 % poistopohjasta, ja enintään 1 200 euron poistopohjan voi poistaa kokonaan (elinkeinoverolaki 30 §). Hankinnat ja myynnit ovat omina tositteinaan tilillä 1100.",
    "Depreciation of machinery and equipment is at most 25% of the base, and a base of €1,200 or less can be written off in full (Business Income Tax Act 30 §). Purchases and sales are vouchers of their own on account 1100.",
  ],
  "memo.mileageHeading": ["Kilometrivähennys {y}", "Mileage deduction {y}"],
  "memo.perDiemHeading": ["Päivärahavähennys {y}", "Per diem deduction {y}"],
  "memo.rate": ["Korvaus kilometriltä", "Rate per kilometre"],
  "memo.allowance": [
    "Verovapaat korvaukset yhteensä",
    "Tax-free allowances in total",
  ],
  "memo.deduction": ["Vähennys", "Deduction"],
  "memo.travelRule": [
    "Verovapaiden matkakustannusten korvausten määrät vuodelle {y} Verohallinnon päätöksen mukaan. Vähennys on korvausten määrä vähennettynä jo kirjatuilla todellisilla kuluilla.",
    "The tax-free travel allowances for {y} as set by the Tax Administration. The deduction is the allowances less the actual costs already booked.",
  ],
  "memo.keepLog": [
    "Säilytä ajopäiväkirja tämän tositteen rinnalla: päivä, matkan alku- ja päätepiste, kilometrit ja tarkoitus. Sen voi liittää tähän tositteeseen.",
    "Keep the logbook alongside this voucher: date, start and end point, kilometres and purpose of each trip. It can be attached to this voucher.",
  ],
  "memo.keepTrips": [
    "Säilytä matkojen tiedot tämän tositteen rinnalla: päivä, lähtö- ja paluuaika, kohde ja tarkoitus. Ne voi liittää tähän tositteeseen.",
    "Keep the trip records alongside this voucher: date, departure and return time, destination and purpose. They can be attached to this voucher.",
  ],
  "memo.homeHeading": ["Työhuonevähennys {y}", "Home office deduction {y}"],
  "memo.homeRule": [
    "Kaavamainen työhuonevähennys vuodelle {y} Verohallinnon päätöksen mukaan. Todellisia työtilan kuluja ei vähennetä sen lisäksi.",
    "The standard home office deduction for {y} as set by the Tax Administration. Actual workspace costs are not deducted on top of it.",
  ],
  "memo.inventoryHeading": ["Varaston muutos {y}", "Change in inventory {y}"],
  "memo.stockOn": ["Varasto 31.12.{y}", "Stock on 31 Dec {y}"],
  "memo.stockChange": [
    "Varaston muutos (alkuvarasto − loppuvarasto)",
    "Change (opening stock − closing stock)",
  ],
  "memo.inventoryRule": [
    "Varasto on tavarat ja muu vaihto-omaisuus (lomakkeen 5 kohdat 708 ja 709) sellaisina kuin ne on syötetty kohtaan Varat ja velat. Kasvanut varasto pienentää ostojen kulua.",
    "The stock is goods and other inventory (Form 5 fields 708 and 709) as entered under Assets and liabilities. A larger stock lowers the cost of purchases.",
  ],
  "memo.keepCount": [
    "Säilytä varaston inventaariolista tämän tositteen rinnalla. Sen voi liittää tähän tositteeseen.",
    "Keep the stocktake list alongside this voucher. It can be attached to this voucher.",
  ],

  "settings.sections": ["Asetusten osiot", "Settings sections"],
  "settings.general": ["Yleiset", "General"],
  /* The dialog a new bookkeeping opens with (§8.3). */
  "settings.setupTitle": ["Uusi kirjanpito", "New bookkeeping"],
  "settings.setupIntro": [
    "Valitse kirjanpidon asetukset. Voit muuttaa näitä myöhemmin Asetuksista.",
    "Choose the settings for this bookkeeping. You can change them later in Settings.",
  ],
  "settings.setupSkip": ["Ohita", "Skip"],
  "settings.setupStart": ["Aloita", "Start"],

  "settings.exportLang": ["Tiedoston kieli", "File language"],
  "settings.exportLangHint": [
    "Kieli, jolla kirjanpito tallennetaan: tiedoston nimi, CSV:n sarakkeet ja arvot sekä liitekansio. Summat, päivämäärät ja erotin pysyvät samoina molemmilla kielillä.",
    "The language the bookkeeping is saved in: the file name, the CSV’s columns and values, and the attachment folder. Amounts, dates and the separator stay the same in both languages.",
  ],
  "settings.vatPeriod": ["ALV-ilmoitusjakso", "VAT reporting period"],
  "settings.vatPeriodHint": [
    "Kuinka usein annat arvonlisäveroilmoituksen. Yleiskatsauksen eräpäivät lasketaan tämän mukaan.",
    "How often you file a VAT return. The due dates on the overview follow it.",
  ],
  "settings.filing": ["ALV-ilmoitukset", "VAT returns"],
  "settings.change": ["Muuta", "Change"],
  "settings.done": ["Valmis", "Done"],
  "settings.notSet": ["Ei asetettu", "Not set"],
  "settings.moreActions": ["Lisää toimintoja", "More actions"],
  "settings.businessIdLine": ["Y-tunnus {id}", "Business ID {id}"],
  "settings.vatPeriodNote": [
    "Määrää yleiskatsauksen eräpäivät.",
    "Sets the due dates on the overview.",
  ],
  "settings.bookStartNote": [
    "Ei ALV-ilmoitusta sitä aiemmilta jaksoilta",
    "No VAT return for earlier periods",
  ],
  "settings.bookStartNoteNone": [
    "Ilmoitukset lasketaan ensimmäisestä tositteesta",
    "Returns are counted from the first voucher",
  ],
  "settings.exportLangNote": [
    "Nimi, sarakkeet ja liitekansio",
    "File name, columns and attachment folder",
  ],
  "settings.autosaveOn": ["Automaattinen", "Automatic"],
  "settings.autosaveOff": ["Manuaalinen", "Manual"],
  "settings.autosaveOnNote": [
    "Tallentuu muutaman sekunnin kuluttua",
    "Saves a few seconds after a change",
  ],
  "settings.autosaveOffNote": [
    "Tallennat itse tiedostovalikosta",
    "You save from the file menu",
  ],
  "settings.vouchersOk": ["Järjestyksessä", "In order"],
  "settings.vouchersOutValue": [
    pl("1 numero uusittavana", "{n} numeroa uusittavana"),
    pl("1 number to renumber", "{n} numbers to renumber"),
  ],
  "settings.vouchersYear": ["Vuosi {year}", "Year {year}"],
  "settings.renumberShort": ["Numeroi", "Renumber"],
  "settings.business": ["Yrityksen tiedot", "Business details"],
  "settings.businessHint": [
    "Nimi ja y-tunnus näkyvät tuloslaskelman, päiväkirjan, pääkirjan ja tililuettelon otsikossa ja tallentuvat tiedostoon.",
    "The name and business ID show in the heading of the income statement, journal, general ledger and account list, and are saved in the file.",
  ],
  "settings.businessName": ["Yrityksen nimi", "Business name"],
  "settings.businessIdInvalid": [
    "Tarkista y-tunnus, esim. 1234567-1.",
    "Check the business ID, e.g. 1234567-1.",
  ],
  "settings.bookStart": ["Kirjanpidon aloitus", "Start of the bookkeeping"],
  "settings.bookStartHint": [
    "Kuukausi, jona yritystoiminta alkoi. Sitä aiemmista jaksoista ei odoteta ALV-ilmoitusta. Ilman valintaa ilmoitukset lasketaan ensimmäisestä tositteesta alkaen.",
    "The month the business began. No VAT return is expected for the periods before it. Without a choice, returns are counted from the first voucher.",
  ],
  "settings.bookStartMonth": ["Aloituskuukausi", "Start month"],
  "settings.bookStartYear": ["Aloitusvuosi", "Start year"],
  "settings.bookStartNone": [
    "Ensimmäisestä tositteesta",
    "From the first voucher",
  ],
  "settings.saving": ["Tallennus", "Saving"],
  "settings.autosave": ["Tallenna automaattisesti", "Save automatically"],
  "settings.autosaveHint": [
    "Kirjanpito tallentuu avattuun tiedostoon muutama sekunti jokaisen muutoksen jälkeen. Poiston ja tositteen muokkauksen voi kumota ilmoituksesta 10 sekunnin ajan, ja palautus tallentuu samalla tavalla. Tiedostoon ei jää aiempia versioita. Jos selain kysyisi jotain, tallennus odottaa, kunnes tallennat kerran itse.",
    "The bookkeeping is saved to the opened file a few seconds after each change. You can undo a delete or a voucher edit from its notification for 10 seconds, and the restored voucher is saved the same way. The file keeps no earlier versions. If the browser would have to ask anything, autosave waits until you save once yourself.",
  ],
  "settings.addCategory": ["Lisää oma luokka", "Add a category"],
  "settings.newCategory": ["Lisää luokka", "Add category"],
  "settings.euPurchase": [
    "Osto muusta EU-maasta",
    "Purchase from another EU country",
  ],
  "settings.euPurchaseNo": ["Ei", "No"],
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
  "settings.editCategory": ["Muokkaa luokkaa {c}", "Edit category {c}"],
  "settings.deleteCategory": ["Poista luokka {c}", "Delete category {c}"],
  "settings.editCategoryTitle": ["Muokkaa luokkaa", "Edit category"],
  "settings.categoryUpdated": [
    "Luokka päivitetty: {c}.",
    "Category updated: {c}.",
  ],
  "settings.lineLocked": [
    "Tositteet käyttävät tätä luokkaa, joten sen riviä ei voi vaihtaa. Lisää uusi luokka ja poista tämä, jolloin tositteet siirtyvät sinne.",
    "Vouchers use this category, so its line can’t change. Add a new category and delete this one, which moves the vouchers there.",
  ],
  "settings.vatRow": ["ALV-ilmoituksen rivi", "VAT return row"],
  "settings.vatRowDomestic": [
    "Kotimaan myynti (verokannan mukaan)",
    "Domestic sales (by VAT rate)",
  ],
  "settings.vatRowEuGoods": [
    "Myynti EU:hun, tavarat",
    "Sales to the EU, goods",
  ],
  "settings.vatRowEuServices": [
    "Myynti EU:hun, palvelut",
    "Sales to the EU, services",
  ],
  "settings.vatRowNonEu": ["Myynti EU:n ulkopuolelle", "Sales outside the EU"],
  "settings.vatRowReverse": ["Käänteinen verotus", "Reverse charge"],
  "settings.vatRowLocked": [
    "Tositteet käyttävät tätä luokkaa, joten sen ALV-riviä ei voi vaihtaa. Lisää uusi luokka ja poista tämä, jolloin tositteet siirtyvät sinne.",
    "Vouchers use this category, so its VAT row can’t change. Add a new category and delete this one, which moves the vouchers there.",
  ],
  "settings.nameTaken": [
    "Tilillä {a} on jo tämän niminen luokka.",
    "Account {a} already has a category with this name.",
  ],
  "settings.deleteCategoryTitle": [
    "Poistetaanko luokka {c}?",
    "Delete category {c}?",
  ],
  "settings.deleteCategoryUses": [
    "Tositteita: {v}. Toistuvia tositteita: {r}. Ne siirtyvät valitsemaasi luokkaan.",
    "Vouchers: {v}. Recurring vouchers: {r}. They move to the category you choose.",
  ],
  "settings.moveTo": ["Siirrä luokkaan", "Move to category"],
  "settings.noMoveTarget": [
    "Käytössä ei ole toista samanlaista luokkaa. Ota sellainen käyttöön tai lisää uusi.",
    "No other category of this kind is active. Turn one on or add a new one.",
  ],
  "settings.deleteCategoryConfirm": ["Siirrä ja poista", "Move and delete"],
  "settings.categoryDeleted": [
    "Luokka poistettu: {c}.",
    "Category deleted: {c}.",
  ],
  "settings.categoryDeletedMoved": [
    "Luokka {c} poistettu. Tositteet siirrettiin luokkaan {t}.",
    "Category {c} deleted. Its vouchers moved to {t}.",
  ],
  "settings.categoryRestored": [
    "Luokka palautettu: {c}.",
    "Category restored: {c}.",
  ],
  "settings.isActive": ["{c} käytössä", "{c} active"],
  "settings.categoryAdded": ["Luokka lisätty: {c}.", "Category added: {c}."],
  "settings.nameRequired": ["Anna luokalle nimi.", "Give the category a name."],
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
    "Palauttaa oletusluokat ja niiden verokannat. Omat luokat, joita tositteet käyttävät, säilyvät.",
    "Restores the default categories and their VAT rates. Custom categories your vouchers use are kept.",
  ],
  "settings.categoriesReset": [
    "Oletusluokat palautettu.",
    "Default categories restored.",
  ],
  "settings.vouchers": ["Tositenumerot", "Voucher numbers"],
  "settings.renumber": ["Numeroi vuosi {year} uudelleen", "Renumber {year}"],
  "settings.renumbered": [
    pl("1 tositenumero muutettu.", "{n} tositenumeroa muutettu."),
    pl("1 voucher number changed.", "{n} voucher numbers changed."),
  ],
  "settings.renumberUndone": [
    "Tositenumerot palautettu.",
    "Voucher numbers restored.",
  ],
  "settings.deleteBook": ["Poista kirjanpito", "Delete bookkeeping"],
  "settings.bookDeleted": ["Kirjanpito poistettu.", "Bookkeeping deleted."],
  "settings.restored": ["Tositteet palautettu.", "Vouchers restored."],

  // --- Import and export (§7) ---
  "io.opening": ["Avataan tiedostoa…", "Opening the file…"],
  "io.fileEmpty": ["Tiedosto on tyhjä.", "The file is empty."],
  /* The title of the dialog that says a file could not be opened (§8). */
  "io.notOpened": ["Tiedostoa ei voitu avata", "The file could not be opened"],
  "io.notABook": [
    "Tiedosto ei ole kirjanpitotiedosto: yhtäkään saraketta ei tunnistettu. Odotettu otsikkorivi: {h}",
    "This is not a bookkeeping file: not one column was recognised. Expected header row: {h}",
  ],
  "io.missingColumn": [
    "Tiedostosta puuttuu sarake: {c}. Odotettu otsikkorivi: {h}",
    "The file is missing a column: {c}. Expected header row: {h}",
  ],
  /*
   * A column the app does not know was not read, so the entries came in
   * without it. Said out loud, since the loss would otherwise only show in
   * the next export.
   */
  "io.unknownColumns": [
    pl(
      " Tuntematonta saraketta ei luettu: {c}.",
      " Tuntemattomia sarakkeita ei luettu: {c}."
    ),
    pl(
      " One column was not recognised and was not read: {c}.",
      " {n} columns were not recognised and were not read: {c}."
    ),
  ],
  "io.noRows": [
    "Yhtään riviä ei voitu lukea. {e}",
    "No rows could be read. {e}",
  ],
  "io.imported": [
    pl("Tuotiin 1 tosite.", "Tuotiin {n} tositetta."),
    pl("Imported 1 voucher.", "Imported {n} vouchers."),
  ],
  "io.newCategories": [" Uusia luokkia: {n}.", " New categories: {n}."],
  "io.settingsNewer": [
    " Tiedosto on tehty uudemmalla versiolla, joten kaikkia asetuksia ei ehkä luettu.",
    " The file was made with a newer version, so some settings may not have been read.",
  ],
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
  "io.receiptsImported": [" Liitteitä: {n}.", " Attachments: {n}."],
  "io.receiptsMissing": [
    " Puuttuvia liitteitä: {n}.",
    " Missing attachments: {n}.",
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
    "Tiedosto sisältää kaikkien tilikausien tositteet.",
    "The file includes the vouchers of all financial years.",
  ],
  "io.exportAction": ["Lataa", "Download"],
  "io.zipHint": [
    pl(
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston, asetukset ja 1 liitteen kansiossa vuoden ja kuukauden mukaan.",
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston, asetukset ja {n} liitettä kansioissa vuoden ja kuukauden mukaan."
    ),
    pl(
      "The ZIP file contains the bookkeeping CSV, the settings and 1 attachment in a folder by year and month.",
      "The ZIP file contains the bookkeeping CSV, the settings and {n} attachments in folders by year and month."
    ),
  ],
  "io.zipHintNoReceipts": [
    "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston ja asetukset.",
    "The ZIP file contains the bookkeeping CSV and the settings.",
  ],
  "io.nothingToExport": [
    "Ei vietävää. Lisää ensin tositteita.",
    "Nothing to export. Add some vouchers first.",
  ],
  "io.exporting": ["Pakataan liitteitä…", "Packing attachments…"],
  "io.receiptsLost": [
    pl(
      "1 liite puuttuu selaimesta, joten se jää tästä tiedostosta pois.",
      "{n} liitettä puuttuu selaimesta, joten ne jäävät tästä tiedostosta pois."
    ),
    pl(
      "1 attachment is missing from this browser, so this file leaves it out.",
      "{n} attachments are missing from this browser, so this file leaves them out."
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
    "Kirjanpito tallennetaan nyt nimellä {f}, koska asetukset ja liitteet eivät mahdu CSV-tiedostoon. Valitse, mihin.",
    "The bookkeeping is now saved as {f}, because its settings and attachments don’t fit in a CSV file. Choose where.",
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
  "io.zipTooLarge": [
    "ZIP-tiedoston CSV tai settings.json on purettuna liian suuri, joten sitä ei avattu.",
    "The CSV or settings.json in the ZIP file is too large when unpacked, so it wasn’t opened.",
  ],

  // --- Attachment viewer (§8.6) ---
  "viewer.prevReceipt": ["Edellinen liite", "Previous attachment"],
  "viewer.nextReceipt": ["Seuraava liite", "Next attachment"],
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
  "viewer.receiptOf": ["Liite {i} / {n}", "Attachment {i} of {n}"],
  "viewer.saved": ["Tallennettu: {f}", "Saved: {f}"],

  "newYear.title": ["Vuoden {y} aloitus", "Opening {y}"],
  "newYear.intro": [
    "Katso, mitä edellisestä vuodesta siirtyy uuteen, kopioi tilinpäätöslukujen lähtöarvot ja tarkista toistuvat tositteet.",
    "See what carries over from the year before, copy the year-end figures as starting values and review the recurring vouchers.",
  ],
  "newYear.open": ["Aloita vuosi {y}", "Open year {y}"],
  "newYear.steps": ["Vaiheet", "Steps"],
  "newYear.stepCarried": ["Siirtyy", "Carried over"],
  "newYear.stepFigures": ["Luvut", "Figures"],
  "newYear.stepRecurring": ["Toistuvat", "Recurring"],
  "newYear.noPrevious": [
    "Vuodelta {p} ei ole tositteita, joten mitään ei siirry. Voit silti syöttää luvut ja toistuvat tositteet.",
    "There are no vouchers for {p}, so nothing carries over. You can still enter the figures and recurring vouchers.",
  ],
  "newYear.carriedNote": [
    "Nämä siirtyvät itsestään, eikä niille tarvitse tehdä mitään. Tositenumerointi alkaa myös alusta.",
    "These carry over by themselves and need nothing from you. Voucher numbering starts again at 1 as well.",
  ],
  "newYear.previousResult": ["Vuoden {p} tulos", "Result for {p}"],
  "newYear.previousResultSub": [
    "Maksupäivän mukaan, kuten tuloslaskelmassa.",
    "By payment date, as on the income statement.",
  ],
  "newYear.assetPool": ["Poistamaton jäännös", "Undepreciated balance"],
  "newYear.assetPoolSub": [
    "Koneet ja kalusto, alkusaldo vuodelle {y}.",
    "Machinery and equipment, the opening balance for {y}.",
  ],
  "newYear.loans": ["Lainat", "Loans"],
  "newYear.loansSub": ["Jäljellä {d}.", "Outstanding on {d}."],
  "newYear.openItems": ["Avoimet tositteet", "Open vouchers"],
  "newYear.openItemsSub": [
    "Saamisia {r}, velkoja {p}. Ne kirjautuvat sille vuodelle, jona ne maksetaan.",
    "Receivables {r}, payables {p}. They count in the year they are paid.",
  ],
  "newYear.filed": ["Vuoden {p} lomake 5", "Form 5 for {p}"],
  "newYear.filedYes": ["Merkitty ilmoitetuksi {d}.", "Marked as filed on {d}."],
  "newYear.filedNo": [
    "Ei ole vielä merkitty ilmoitetuksi. Edellisen vuoden tositteet ovat vielä muokattavissa.",
    "Not marked as filed yet. The year’s vouchers can still be edited.",
  ],
  "newYear.figuresHint": [
    "Varat ja velat -luvut kirjataan vuosittain. Kopioi edellisen vuoden luvut lähtöarvoiksi ja muuta ne, kun tilanne vuoden lopussa on selvä.",
    "The year-end figures are entered year by year. Copy last year’s as starting values and change them once the position at year end is clear.",
  ],
  "newYear.copy": ["Kopioi vuoden {p} luvut", "Copy the figures for {p}"],
  "newYear.copyNone": [
    "Vuodelle {p} ei ole syötetty lukuja, joten kopioitavaa ei ole.",
    "No figures were entered for {p}, so there is nothing to copy.",
  ],
  "newYear.copyLocked": [
    "Vuoden {y} lomake 5 on merkitty ilmoitetuksi, joten luvut ovat lukittuja.",
    "The Form 5 for {y} is marked as filed, so the figures are locked.",
  ],
  "newYear.copyTitle": ["Korvataanko luvut?", "Replace the figures?"],
  "newYear.copyMessage": [
    "Vuodelle {y} on jo syötetty lukuja. Kopiointi korvaa ne vuoden {p} luvuilla.",
    "Figures are already entered for {y}. Copying replaces them with those of {p}.",
  ],
  "newYear.copyConfirm": ["Korvaa", "Replace"],
  "newYear.copied": [
    "Luvut kopioitu vuodelta {p}.",
    "Figures copied from {p}.",
  ],
  "newYear.recurringHint": [
    "Muuta summat, jotka muuttuvat vuodenvaihteessa, esimerkiksi vuokra tai YEL. Mitään ei kirjata ennen kuin lisäät tositteet.",
    "Change the amounts that move at the new year, such as rent or YEL. Nothing is booked until you add the vouchers.",
  ],
  "newYear.recurringEmpty": [
    "Toistuvia tositteita ei ole. Voit tehdä sellaisen tositteen muokkauksessa.",
    "There are no recurring vouchers. You can make one from the entry dialog.",
  ],
  "newYear.recurringBook": ["Lisää {m}", "Add {m}"],
  "newYear.done": ["Valmis", "Done"],
  "newYear.start": ["Aloita", "Start"],
  "newYear.dueTitle": ["Aloita vuosi {y}", "Open year {y}"],
  "newYear.dueSub": [
    "Kopioi edellisen vuoden luvut ja tarkista toistuvat tositteet.",
    "Copy last year’s figures and review the recurring vouchers.",
  ],
} as const satisfies Dict
