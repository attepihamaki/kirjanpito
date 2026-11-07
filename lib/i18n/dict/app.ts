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
  "nav.calendar": ["Kalenteri", "Calendar"],
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
  /* The top bar's note after a save; {t} is the device's clock at that moment. */
  "file.savedAt": ["Tallennettu {t}", "Saved {t}"],
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
  "file.autosaveRetrying": [
    "Automaattinen tallennus ei onnistunut. Yritetään uudelleen.",
    "Autosave failed. Trying again.",
  ],
  /* When the file on disk was last written, which is what `savedAt` holds. */
  "file.writtenToday": ["Tiedosto päivitetty klo {t}", "File updated at {t}"],
  "file.writtenDay": [
    "Tiedosto päivitetty {d} klo {t}",
    "File updated {d} at {t}",
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
  "file.check": ["Tarkista kirjanpito", "Check the book"],
  "file.closed": ["Tiedosto suljettu.", "File closed."],
  "file.messages": ["Viestit", "Messages"],
  "file.messagesTitle": ["Viestit", "Messages"],
  "file.messagesDescription": [
    "Tämän istunnon ilmoitukset, uusin ensin.",
    "Notices from this session, newest first.",
  ],
  "file.messagesEmpty": ["Ei viestejä vielä.", "No messages yet."],
  "file.messagesClear": ["Tyhjennä", "Clear"],

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
  "entry.splitAction": ["Jaa tosite", "Split voucher"],
  "entry.splitTitle": ["Jaa tosite", "Split voucher"],
  "entry.splitHint": [
    "Siirrä osa summasta toiselle luokalle tai verokannalle. Osat ovat omia tositteitaan, mutta jakavat maksun ja liitteet.",
    "Move part of the amount to another category or VAT rate. The parts are vouchers of their own, but share the payment and the attachments.",
  ],
  "entry.splitAmount": ["Uuden osan summa", "Amount of the new part"],
  "entry.splitCategory": ["Uuden osan luokka", "Category of the new part"],
  "entry.splitVatRate": ["Uuden osan ALV %", "VAT % of the new part"],
  "entry.splitLeft": [
    "Alkuperäiseen osaan jää {a}. Summat ovat {m}.",
    "{a} stays on the original. Amounts are {m}.",
  ],
  "entry.splitGross": ["verollisia", "including VAT"],
  "entry.splitNet": ["verottomia", "excluding VAT"],
  "entry.splitSubmit": ["Jaa", "Split"],
  "entry.splitDone": ["Tosite jaettu.", "Voucher split."],
  "entry.splitUndone": ["Jako kumottu.", "Split undone."],
  "entry.splitAmountRefused": [
    "Uuden osan summa on oltava nollaa suurempi ja alkuperäistä pienempi.",
    "The new part’s amount must be above zero and smaller than the original.",
  ],
  "entry.splitCategoryRefused": [
    "Tätä tositetta ei voi jakaa tähän luokkaan.",
    "This voucher cannot be split into that category.",
  ],
  "ledger.splitPill": ["Jaettu {v}", "Split {v}"],
  "confirm.deleteSplitTitle": [
    "Poistetaanko jaetun kuitin osa?",
    "Delete a part of a split receipt?",
  ],
  "confirm.deleteSplitMessage": [
    "Tosite ”{x}” on yksi jaetun kuitin osista. Voit poistaa vain tämän osan tai kaikki osat. Voit perua poiston heti sen jälkeen.",
    "The voucher “{x}” is one part of a split receipt. You can delete only this part or all parts. You can undo it right after.",
  ],
  "confirm.deleteSplitAll": ["Poista kaikki {n} osaa", "Delete all {n} parts"],
  "confirm.deleteSplitOne": ["Vain tämä osa", "Only this part"],
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
  "common.helpLabel": ["Mikä tämä on?", "What is this?"],
  "common.helpSource": ["Lähde", "Source"],
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
  "common.figureShow": ["Näytä tositteet: {x}", "Show the vouchers behind {x}"],
  "common.figureCount": ["Tositteita: {n}", "Vouchers: {n}"],
  "common.figureEmpty": [
    "Tässä luvussa ei ole tositteita.",
    "No vouchers make up this figure.",
  ],
  "common.figureSum": ["Tositteet yhteensä", "Vouchers in total"],
  "common.figureShown": ["Ilmoitettava luku", "Figure to report"],
  "common.figureOpen": ["Avaa tosite {n}", "Open voucher {n}"],
  "common.figurePaid": ["maksettu {d}", "paid {d}"],
  "common.figureOpenItem": ["avoin", "open"],
  "common.figurePartNote": [
    "Luku ottaa mukaan vain osan joistakin tositteista: osingoista verotettavan osuuden, edustuskuluista puolet, osuuskunnan ylijäämästä verotettavan osan ja poistoista enintään rekisterin enimmäismäärän. Tositteet on lueteltu täysinä summina.",
    "The figure counts only part of some vouchers: the taxable share of dividends, half of entertainment, the taxable part of a co-operative surplus and depreciation up to the register's maximum. The vouchers are listed in full.",
  ],
  "common.figureTypedNote": [
    "Luku sisältää myös käsin annettuja velkoja ja lainan alkusaldon, joita ei ole tositteilla. Tositteet kattavat vain kirjanpidon osan.",
    "The figure also includes debts typed in by hand and the loan's opening balance, which no voucher stands behind. The vouchers cover only the part held in the book.",
  ],
  "entry.figuresVat": ["ALV-ilmoitus, {p}", "VAT return, {p}"],
  "entry.figuresForm5": ["Lomake 5, {y}", "Form 5, {y}"],
  /* Group headings in the category picker (§8.5). */
  "entry.categoryMostUsed": ["Eniten käytetyt", "Most used"],
  "entry.categoryAll": ["Kaikki", "All"],
  "entry.figuresHint": [
    "Tallennetun tositteen mukaan. Napsauta kohtaa nähdäksesi kaikki sen tositteet.",
    "As saved. Click a field to see all of its vouchers.",
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
  "common.print": ["Tulosta", "Print"],
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
  "common.amountAmbiguous": ["Tarkoititko:", "Did you mean:"],
  "common.datePlaceholder": ["pp.kk.vvvv", "dd.mm.yyyy"],
  "common.openCalendar": ["Avaa kalenteri", "Open calendar"],
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
  "overview.smallAsset": [
    pl(
      "1 käyttöomaisuushankinta alle pienhankintarajan",
      "{n} käyttöomaisuushankintaa alle pienhankintarajan"
    ),
    pl(
      "1 asset purchase under the small purchase limit",
      "{n} asset purchases under the small purchase limit"
    ),
  ],
  "overview.smallAssetSub": [
    "Enintään 1 200 euron hankinnan voi vähentää heti, yhteensä 3 600 euroon asti vuodessa. Kirjaa se kuluksi, jos haluat vähentää sen kerralla.",
    "A purchase of up to 1,200 euros can be deducted at once, up to 3,600 euros a year in total. Book it as an expense if you want to deduct it in one go.",
  ],
  "overview.largeExpense": [
    pl("1 kulu yli pienhankintarajan", "{n} kulua yli pienhankintarajan"),
    pl(
      "1 expense over the small purchase limit",
      "{n} expenses over the small purchase limit"
    ),
  ],
  "overview.largeExpenseSub": [
    "Yli 1 200 euron laite on yleensä kirjattava käyttöomaisuudeksi ja poistettava. Heti vähentäminen onnistuu vain, jos käyttöikä on enintään 3 vuotta.",
    "Equipment over 1,200 euros is usually booked as a fixed asset and depreciated. Deducting it at once works only if its useful life is 3 years or less.",
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
  "overview.rulesStale": [
    "Vuoden {y} sääntötaulukot ovat vajaat",
    "The rule tables for {y} are incomplete",
  ],
  "overview.rulesStaleSub": [
    "Puuttuu: {what}. Taulukot tarkistettiin {d}. Laskelma ei arvaa puuttuvia lukuja.",
    "Missing: {what}. The tables were checked on {d}. The app does not guess missing figures.",
  ],
  "overview.rulesTravel": ["matkakorvaukset", "travel allowances"],
  "overview.rulesHomeOffice": ["kotitoimistovähennys", "home office deduction"],
  "overview.rulesForm5Due": ["lomakkeen 5 määräpäivä", "Form 5 due date"],
  "settings.rulesChecked": [
    "Verosäännöt ja -rajat tarkistettu {d}.",
    "Tax rules and limits checked on {d}.",
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
  "overview.onboardTitle": ["Aloita tästä", "Get started"],
  "overview.onboardIntro": [
    "Viisi askelta ensimmäisestä tositteesta tiedostoon. Esimerkit näyttävät, mitä kenttiin kirjoitetaan. Ne ovat mallia, eivät valmiita tositteita.",
    "Five steps from the first voucher to a saved file. The examples show what goes in the fields. They are models, not ready-made vouchers.",
  ],
  "overview.onboardProgress": ["{done}/{total} tehty", "{done}/{total} done"],
  "overview.onboardDismiss": ["Piilota lista", "Hide the list"],
  "overview.onboardAllDone": [
    "Kaikki tehty. Lista poistuu, kun suljet sen.",
    "All done. The list goes away when you close it.",
  ],
  "overview.onboardStepDone": ["Tehty", "Done"],
  "overview.onboardRecord": ["Kirjaa tosite", "Record a voucher"],
  "overview.onboardSettings": ["Avaa asetukset", "Open settings"],
  "overview.onboardSave": ["Tallenna", "Save"],
  "overview.onboardBusinessTitle": [
    "Kerro yrityksesi tiedot",
    "Add your business details",
  ],
  "overview.onboardBusinessExample": [
    "Esim. Oma Yritys Oy ja y-tunnus 0112038-9. Ne näkyvät tuloslaskelman ja kirjojen otsikossa.",
    "E.g. Oma Yritys Oy and business ID 0112038-9. They show in the heading of the income statement and the books.",
  ],
  "overview.onboardSaleTitle": [
    "Kirjaa ensimmäinen myyntilasku",
    "Record your first sales invoice",
  ],
  "overview.onboardSaleExample": [
    "Esim. Lasku 1001 – Mäkinen Rakennus Oy, 2 510,00 € verollisena, ALV 25,5 %. Kirjaa summa niin kuin laskulla.",
    "E.g. Invoice 1001 – Mäkinen Rakennus Oy, 2 510,00 € including VAT, VAT 25.5%. Enter the amount as the invoice shows it.",
  ],
  "overview.onboardPurchaseTitle": [
    "Kirjaa ensimmäinen kulu",
    "Record your first expense",
  ],
  "overview.onboardPurchaseExample": [
    "Esim. Osto – K-Rauta – tarvikkeet, 186,40 €, ALV 25,5 %. Palkat, YEL ja pankin kulut ovat 0 %:n kuluja.",
    "E.g. Purchase – K-Rauta – supplies, 186,40 €, VAT 25.5%. Wages, YEL and bank fees are 0% expenses.",
  ],
  "overview.onboardReceiptTitle": [
    "Liitä kuitti tai lasku tositteeseen",
    "Attach a receipt or an invoice to a voucher",
  ],
  "overview.onboardReceiptExample": [
    "Pudota kuva tai PDF tositteen päälle. Laskun PDF täyttää päivän, summan ja myyjän puolestasi.",
    "Drop a photo or a PDF on the voucher. An invoice PDF fills in the date, amount and seller for you.",
  ],
  "overview.onboardSaveTitle": [
    "Tallenna kirjanpito tiedostoon",
    "Save the bookkeeping to a file",
  ],
  "overview.onboardSaveExample": [
    "Tiedosto on kirjanpitosi. Selain on vain työtila, joten tallenna ennen kuin suljet välilehden.",
    "The file is your bookkeeping. The browser is only a workspace, so save before you close the tab.",
  ],
  "overview.step3Title": ["Tallenna tiedostoon", "Save to a file"],
  "overview.step3Body": [
    "Tiedosto on kirjanpitosi. Selain on vain työtila.",
    "The file is your bookkeeping. The browser is only a workspace.",
  ],

  // --- Empty states (§8.12) ---
  "empty.noEntriesTitle": ["Ei tositteita vuonna {y}", "No vouchers in {y}"],
  "empty.vatBody": [
    "ALV-ilmoitus lasketaan tositteista. Lisää tosite tai tuo tiliote, niin luvut ilmestyvät tähän.",
    "The VAT return is calculated from vouchers. Add a voucher or import a bank statement and the figures appear here.",
  ],
  "empty.statementBody": [
    "Tuloslaskelma muodostuu vuoden {y} tositteista. Lisää tosite tai tuo tiliote aloittaaksesi.",
    "The income statement is built from the vouchers of {y}. Add a voucher or import a bank statement to start.",
  ],
  "empty.summaryBody": [
    "Yhteenveto kokoaa vuoden {y} tulot ja kulut. Lisää tosite tai tuo tiliote aloittaaksesi.",
    "The summary adds up the income and expenses of {y}. Add a voucher or import a bank statement to start.",
  ],
  "empty.assetsBody": [
    "Poistot lasketaan hankintatositteista. Kirjaa pitkävaikutteinen hankinta, niin se ilmestyy tähän.",
    "Depreciation is calculated from purchase vouchers. Book a long-lived purchase and it appears here.",
  ],
  "empty.booksBody": [
    "Kirjanpito täyttyy tositteista. Lisää tosite tai tuo tiliote vuodelle {y}.",
    "The books fill up from vouchers. Add a voucher or import a bank statement for {y}.",
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
    "Hae kuvauksesta, luokasta, numerolla tai kuitista",
    "Search description, category, number or receipt",
  ],
  "ledger.inReceiptPill": ["Kuitissa", "In receipt"],
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
  "ledger.editDescription": ["Muokkaa kuvausta", "Edit description"],
  "ledger.bulkMixedEu": [
    "Luokan voi vaihtaa, kun valitut ovat kaikki ostoja, joiden veron ilmoitat itse, tai kaikki muita kuluja.",
    "To change the category, select only purchases whose tax you report yourself, or only other expenses.",
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
  "entry.logAdd": ["Tosite lisätty", "Voucher added"],
  "entry.logDelete": ["Tosite poistettu", "Voucher deleted"],
  "entry.logRestore": ["Tosite palautettu", "Voucher restored"],
  "entry.logChanged": ["{field} muutettu", "{field} changed"],
  "entry.historyAt": ["{d} klo {t}", "{d} {t}"],
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
  "entry.logFieldEuPurchase": ["Veron ilmoitus itse", "Self-reported tax"],
  "entry.logFieldVoucher": ["Tositenumero", "Voucher number"],
  "entry.logFieldReceipts": ["Liitteet", "Attachments"],
  "entry.logFieldSplit": ["Jaettu kuitti", "Split receipt"],
  "entry.logSplitValue": ["osa", "part"],
  "entry.splitMergeAction": ["Yhdistä osa", "Merge part"],
  "entry.splitMerged": ["Osa yhdistetty.", "Part merged."],
  "entry.splitMergeUndone": ["Yhdistäminen kumottu.", "Merge undone."],
  "confirm.mergeSplitTitle": [
    "Yhdistetäänkö osa toiseen?",
    "Merge this part into another?",
  ],
  "confirm.mergeSplitMessage": [
    "Tosite {a} poistetaan ja sen summa lisätään tositteeseen {b}. Tosite {b} säilyttää luokkansa ja verokantansa. Voit perua yhdistämisen heti sen jälkeen.",
    "Voucher {a} is deleted and its amount added to voucher {b}. Voucher {b} keeps its category and VAT rate. You can undo it right after.",
  ],
  "confirm.mergeSplitConfirm": ["Yhdistä", "Merge"],
  "entry.splitPaidHint": [
    "Tämä tosite on osa jaettua kuittia. Maksupäivä, avoin-tila ja käteismaksu koskevat kaikkia osia.",
    "This voucher is part of a split receipt. The payment date, open state and cash payment apply to every part.",
  ],
  "entry.splitFilesHint": [
    "Liitteet ovat yhteisiä kaikille jaetun kuitin osille.",
    "The attachments are shared by every part of the split receipt.",
  ],
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
  "ledger.importPill": ["Maahantuonti", "Import"],
  "ledger.reversePill": ["Käänteinen ALV", "Reverse charge"],
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
  "ledger.smallAsset": [
    "Pienhankinta kirjattu käyttöomaisuutena",
    "Small purchase booked as an asset",
  ],
  "ledger.largeExpense": [
    "Suuri hankinta kirjattu kuluksi",
    "Large purchase booked as an expense",
  ],
  "ledger.copyAsNew": ["Kopioi", "Copy"],
  "ledger.deleteEntry": ["Poista tosite", "Delete voucher"],
  "ledger.markPaid": ["Merkitse maksetuksi", "Mark as paid"],

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
  "entry.euPurchaseGoods": ["Kyllä, tavara", "Yes, goods"],
  "entry.euPurchaseServices": ["Kyllä, palvelu", "Yes, services"],
  "entry.euPurchaseImport": ["Kyllä, maahantuonti", "Yes, import"],
  "entry.euPurchaseReverse": [
    "Kyllä, käänteinen verovelvollisuus",
    "Yes, reverse charge",
  ],
  "entry.euPurchaseInfo": [
    "Miksi veroa ei ole laskulla?",
    "Why is there no VAT on the invoice?",
  ],
  "entry.importVat": [
    "Tämä luokka on ostoille, jotka tuodaan EU:n ulkopuolelta. Kirjaa tavaran arvo ilman veroa. Vero {a} ({r}) menee ALV-ilmoitukselle sekä verona että vähennyksenä, joten maksettava vero ei muutu. Jos tulli perii veron erikseen, kirjaa maksettu vero omaksi kuluksi 0 %:n verolla.",
    "This category is for goods imported from outside the EU. Book the value of the goods without tax. The tax of {a} ({r}) goes on the VAT return both as tax and as a deduction, so the tax payable does not change. If customs collects the tax separately, book what you paid as a cost of its own at 0%.",
  ],
  "entry.reverseVat": [
    "Tämä luokka on rakentamispalvelun ja metalliromun ostoille Suomesta, kun myyjä laskuttaa ilman arvonlisäveroa. Kirjaa laskun summa. Vero {a} ({r}) menee ALV-ilmoitukselle sekä verona että vähennyksenä, joten maksettava vero ei muutu.",
    "This category is for construction services and scrap metal bought in Finland, invoiced without VAT. Book the invoice amount. The tax of {a} ({r}) goes on the VAT return both as tax and as a deduction, so the tax payable does not change.",
  ],
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
  "entry.tabDetails": ["Tiedot", "Details"],
  "entry.tabPayment": ["Maksu", "Payment"],
  "entry.tabFigures": ["Kirjaukset", "Postings"],
  "entry.tabHistory": ["Historia", "History"],
  "entry.moreActions": ["Lisää toimintoja", "More actions"],
  "entry.copyAction": ["Kopioi tosite", "Copy voucher"],
  "entry.deleteAction": ["Poista tosite", "Delete voucher"],
  "entry.paidOpenShort": ["Avoin", "Open"],
  "entry.cashDesc": [
    "Ei vaikuta pankkitilin arvioon.",
    "Does not affect the bank estimate.",
  ],
  "entry.repeatDesc": [
    "Muistuttaa lisäämään samanlaisen tositteen joka kuukausi.",
    "Reminds you to add a similar voucher every month.",
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
  "entry.period": ["Kattaa ajanjakson", "Covers the period"],
  "entry.periodFrom": ["Jakson ensimmäinen päivä", "First day of the period"],
  "entry.periodTo": ["Jakson viimeinen päivä", "Last day of the period"],
  "entry.periodInfo": ["Mitä jakso tekee?", "What does the period do?"],
  "entry.periodInfoText": [
    "Liikkeenharjoittajan tulos jaksotetaan suoriteperusteelle. Jos kulu tai tulo kattaa useamman vuoden, esimerkiksi marraskuussa maksettu vuoden vakuutus, tulos jakaa veroton summan vuosille päivien suhteessa. Arvonlisäveroilmoitus ei muutu, se menee edelleen tositteen päivän mukaan. Vähäisen erän voi jättää jaksottamatta (EVL 19 §).",
    "A liikkeenharjoittaja’s result is on accrual basis. When a cost or income covers more than one year, for example a year’s insurance paid in November, the statement splits the amount without VAT across the years by days. The VAT return does not change and still goes by the voucher’s date. An insignificant item can be left unspread (EVL 19 §).",
  ],
  "entry.periodHint": [
    "Täytä vain, kun tosite kattaa vuodenvaihteen yli ulottuvan ajan. Tyhjänä tosite lasketaan tositteen päivälle.",
    "Fill in only when the voucher covers a time across a year-end. Left empty, the voucher counts on its own date.",
  ],
  "entry.periodBad": [
    "Anna jakson molemmat päivät, ja loppu ei saa olla alkua aiemmin.",
    "Give both days of the period. The end cannot be before the start.",
  ],
  "entry.logFieldPeriodFrom": ["Jakso alkaa", "Period starts"],
  "entry.logFieldPeriodTo": ["Jakso päättyy", "Period ends"],
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
  "entry.assetHint": [
    "Ei kulua tuloslaskelmassa. Hankinta ja myynti muodostavat Lomake 5:n kohdan 704 (Koneet ja kalusto) poistopohjan, ja kulu syntyy poistoina. Katso Tuloslaskelma, Poistot.",
    "Not an expense on the income statement. Purchases and sales make up the depreciation base behind Form 5 field 704 (machinery and equipment), and the cost reaches the result as depreciation. See Income statement, Depreciation.",
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
  "entry.logFieldShare": ["Yrityksen osuus", "Business share"],
  "entry.share": ["Yrityksen osuus", "Business share"],
  "entry.shareInfo": [
    "Mikä on yrityksen osuus?",
    "What is the business share?",
  ],
  "entry.shareInfoText": [
    "Kulu, jota käytetään sekä työhön että yksityisesti, esimerkiksi puhelin. Vain yrityksen osuus kirjataan kuluksi ja vain sen osuuden arvonlisäveron saa vähentää. Maksettu summa pysyy ennallaan.",
    "A cost used for both work and private life, such as a phone. Only the business share counts as an expense and only that share of the VAT can be deducted. The amount paid stays as it is.",
  ],
  "entry.shareBad": [
    "Anna osuus kokonaislukuna 1–99.",
    "Enter the share as a whole number from 1 to 99.",
  ],
  "receipt.businessNet": ["Yrityksen osuus {p}", "Business share {p}"],
  "receipt.businessVat": ["Vähennettävä ALV", "Deductible VAT"],
  "ledger.sharePill": ["Osuus {p}", "Share {p}"],
  "settings.catShare": ["Yrityksen osuus", "Business share"],
  "settings.catShareHint": [
    "Esitäyttää uuden tositteen yrityksen osuuden, esimerkiksi 50 % puhelimelle. Voit muuttaa sen jokaisella tositteella.",
    "Pre-fills the business share of a new voucher, for example 50 % for a phone. You can change it on each voucher.",
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
  "entry.historyUndone": ["Viimeisin muutos kumottu.", "Last change undone."],
  "entry.historyRedone": ["Muutos tehty uudelleen.", "Change redone."],
  "entry.historyNoUndo": ["Ei kumottavaa.", "Nothing to undo."],
  "entry.historyNoRedo": ["Ei uudelleen tehtävää.", "Nothing to redo."],
  "entry.historyLocked": [
    "Muutos koskee lukittua tositetta, joten sitä ei voi kumota tai tehdä uudelleen.",
    "The change touches a locked voucher, so it cannot be undone or redone.",
  ],
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
  "receipt.kinds": ["Kuva tai PDF", "Image or PDF"],
  "receipt.add": ["Lisää liite", "Add attachment"],
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
  "vat.settlementOverdue": [
    "Eräpäivä {d} on mennyt. Maksa vero mahdollisimman pian.",
    "The due date {d} has passed. Pay the tax as soon as you can.",
  ],
  "vat.filingDate": ["Ilmoituspäivä", "Filing date"],
  "vat.filingDateHint": [
    "Päivä, jona annoit ilmoituksen OmaVerossa. Oletuksena tämä päivä.",
    "The day you gave the return in OmaVero. Today by default.",
  ],
  "vat.changedTitle": [
    "Luvut ovat muuttuneet ilmoittamisen jälkeen",
    "The figures have changed since the return was filed",
  ],
  "vat.changedNow": ["Nyt", "Now"],
  "vat.matchesFiled": [
    "Luvut vastaavat ilmoitettuja lukuja.",
    "The figures match what was filed.",
  ],
  "vat.stepDone": ["valmis", "done"],
  "vat.stepAttention": ["vaatii huomiota", "needs attention"],
  "vat.payTitle": ["Maksutiedot", "Payment details"],
  "vat.payIban": ["Verotilin IBAN", "Tax account IBAN"],
  "vat.payReference": ["Viitenumero", "Reference number"],
  "vat.payEdit": ["Muokkaa", "Edit"],
  "vat.payHint": [
    "Hae tiedot OmaVerosta. Ne tallentuvat kirjanpidon asetuksiin, eikä sovellus lähetä niitä mihinkään.",
    "Copy them from OmaVero. They are saved in the book's settings, and the app sends them nowhere.",
  ],
  "vat.payNone": ["Ei tallennettu.", "Not saved."],
  "vat.payCopy": ["Kopioi", "Copy"],
  "vat.downloadPdf": ["Lataa PDF", "Download PDF"],
  "vat.downloadFile": [
    "Lataa Ilmoitin.fi-tiedosto",
    "Download Ilmoitin.fi file",
  ],
  "vat.fileHint": [
    "Tiedosto ladataan Ilmoitin.fi-palveluun itse. Kirjanpito ei lähetä mitään.",
    "You upload the file to Ilmoitin.fi yourself. The app sends nothing.",
  ],
  "vat.fileBlockNotClosed": [
    "Verokausi on vielä kesken.",
    "The tax period has not closed yet.",
  ],
  "vat.fileBlockNoBusinessId": [
    "Lisää y-tunnus kohdassa Asetukset, Yrityksen tiedot.",
    "Add the business ID under Settings, Business details.",
  ],
  "vat.fileBlockEuUnsplit": [
    "Vanhan luokan Myynti – EU tositteet pitää merkitä tavaroiksi tai palveluiksi.",
    "Vouchers on the old category Sales – EU must be marked as goods or services.",
  ],
  "vat.fileBlockSumMismatch": [
    "Maksettava vero ei täsmää kenttiin, esimerkiksi tuntemattoman verokannan takia.",
    "The tax payable does not match the fields, for example because of an unknown tax rate.",
  ],
  "vat.pdfFailed": ["PDF:n teko epäonnistui.", "Making the PDF failed."],
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
    "Ostot, joiden veron ilmoitat itse",
    "Purchases whose tax you report yourself",
  ],
  "vat.importPurchases": [
    "Maahantuonnit EU:n ulkopuolelta",
    "Imports from outside the EU",
  ],
  "vat.importTax": ["Vero maahantuonneista", "Tax on imports"],
  "vat.reversePurchases": [
    "Rakentamispalvelun ja metalliromun ostot",
    "Construction services and scrap metal purchased",
  ],
  "vat.reverseTax": ["Vero näistä ostoista", "Tax on these purchases"],
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
  "vat.returnViewFiled": ["Näytä ilmoitus", "View return"],
  "vat.returnDialogTitle": ["Arvonlisäveroilmoitus: {p}", "VAT return: {p}"],
  "vat.returnDialogIntro": [
    "Käy läpi tarkistukset, kopioi summat OmaVeroon ja merkitse kausi ilmoitetuksi.",
    "Go through the checks, copy the amounts into OmaVero and mark the period as filed.",
  ],
  "vat.returnSteps": ["Vaiheet", "Steps"],
  "vat.returnStepChecks": ["Tarkistukset", "Checks"],
  "vat.returnStepValues": ["Summat", "Amounts"],
  "vat.returnStepFile": ["Merkintä", "Mark"],
  "vat.returnStepGuide": ["OmaVero", "OmaVero"],
  "vat.guideIntro": [
    "Ensimmäisen ilmoituksen voi tehdä tämän listan mukaan. Kun olet merkinnyt ensimmäisen kauden ilmoitetuksi, vaihe poistuu.",
    "You can make your first return by following this list. Once you have marked your first period as filed, this step goes away.",
  ],
  "vat.guideLogin": ["Kirjaudu OmaVeroon", "Sign in to OmaVero"],
  "vat.guideLoginSub": [
    "Käytä verkkopankkitunnuksia tai mobiilivarmennetta. Toiminimen asiat hoidat omilla tunnuksillasi.",
    "Use your online banking credentials or mobile certificate. You handle a sole trader’s affairs with your own credentials.",
  ],
  "vat.guideStart": ["Aloita arvonlisäveroilmoitus", "Start the VAT return"],
  "vat.guideStartSub": [
    "Valitse kaudeksi {p}. Jos OmaVero ei tarjoa kautta, tarkista, että arvonlisäverovelvollisuutesi on voimassa.",
    "Choose {p} as the period. If OmaVero does not offer it, check that your VAT registration is in force.",
  ],
  "vat.guideFill": ["Täytä kohdat", "Fill in the fields"],
  "vat.guideFillSub": [
    "Seuraava vaihe listaa kohdat OmaVeron järjestyksessä. Napsauta summaa ja liitä se samannimiseen kohtaan. Kohdat, joita listassa ei ole, jätä tyhjiksi.",
    "The next step lists the fields in the order OmaVero shows them. Click an amount and paste it into the field with the same name. Leave fields that are not in the list empty.",
  ],
  "vat.guideCompare": ["Vertaa maksettavaa veroa", "Compare the tax payable"],
  "vat.guideCompareSub": [
    "OmaVero laskee kohdan 308 itse. Jos se eroaa tämän sovelluksen luvusta, älä lähetä. Etsi ero kohdista ensin.",
    "OmaVero works out field 308 itself. If it differs from this app’s figure, do not send. Find the difference in the fields first.",
  ],
  "vat.guideSend": [
    "Lähetä ja tallenna kuittaus",
    "Send it and save the receipt",
  ],
  "vat.guideSendSub": [
    "Palaa tänne ja merkitse kausi ilmoitetuksi. Jos maksettavaa on, maksu kirjataan Maksu-vaiheessa.",
    "Come back here and mark the period as filed. If there is tax to pay, you book the payment in the Payment step.",
  ],
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
    "Tuonnit EU:n ulkopuolelta ja rakentamispalvelun ja metalliromun ostot tulevat laskelmaan vain, jos kirjasit ne luokalle, jonka veron ilmoitat itse. Muut täytä OmaVerossa, ja lisää niiden vero myös vähennettävään veroon, jos saat vähentää sen.",
    "Imports from outside the EU and purchases of construction services and scrap metal reach the return only if you booked them on a category whose tax you report yourself. Enter any others in MyTax, and add their tax to the deductible tax if you may deduct it.",
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
  "statement.accrualNote": [
    "Liikkeenharjoittajan suoriteperuste: tulot ja kulut ovat tositteen päivän mukaan, maksettuina tai avoimina. Myyntisaamiset {d}: {r}. Ostovelat {d}: {p}.",
    "A liikkeenharjoittaja’s accrual basis: income and expenses go by voucher date, paid or open. Receivables on {d}: {r}. Payables on {d}: {p}.",
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
  "statement.lossNote": [
    "Tappio {a} vahvistetaan verotuksessa. Vahvistettu tappio vähennetään elinkeinotoiminnan tuloksesta seuraavien 10 vuoden aikana, vanhin tappio ensin. Sovellus ei seuraa vahvistettuja tappioita, joten kirjaa vähennys itse, kun tulos on voitollinen. Kohtaa 373 sovellus ei täytä.",
    "The loss of {a} is confirmed in the tax assessment. A confirmed loss is deducted from business income over the next 10 years, oldest first. The app does not track confirmed losses, so enter the deduction yourself when a year turns to profit. The app leaves field 373 empty.",
  ],
  "overview.lossCarry": [
    "Tappio voidaan vähentää seuraavien 10 vuoden voitoista.",
    "A loss can be deducted from profits in the next 10 years.",
  ],
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
  "recurring.empty": [
    "Ei toistuvia tositteita. Tee ensimmäinen tositteen lomakkeella valitsemalla Toista joka kuukausi.",
    "No recurring vouchers. Make the first one in the voucher form by ticking Repeat every month.",
  ],
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
  "assets.listTitle": ["Käyttöomaisuusluettelo", "Fixed asset list"],
  "assets.listHint": [
    "Hankintatositteet {y} loppuun asti ja niihin linkitetyt myyntitositteet. Luettelo on muistiinpano: vero lasketaan edelleen yhtenä poistopohjana.",
    "Purchase vouchers up to the end of {y} and the sale vouchers linked to them. The list is a record only. The tax is still worked out on one pool.",
  ],
  "assets.listEmpty": [
    "Ei hankintatositteita. Aloitussaldoon sisältyvät hyödykkeet eivät näy luettelossa.",
    "No purchase vouchers. Assets inside the opening balance are not listed.",
  ],
  "assets.listItem": ["Hyödyke", "Item"],
  "assets.listPurchase": ["Hankintatosite", "Purchase voucher"],
  "assets.listCost": ["Hankintameno", "Cost"],
  "assets.listSale": ["Myyntitosite", "Sale voucher"],
  "assets.listPrice": ["Myyntihinta", "Sale price"],
  "assets.listStatus": ["Tila", "Status"],
  "assets.listInUse": ["Käytössä", "In use"],
  "assets.listSold": ["Myyty", "Sold"],
  "assets.listUnlinked": [
    "Myyntejä ilman linkkiä hankintaan",
    "Sales not linked to a purchase",
  ],
  "assets.listUnlinkedHint": [
    "Avaa myyntitosite ja valitse Maksu-välilehdellä hankinta, jonka myynti koskee.",
    "Open the sale voucher and choose the purchase it sells on the Maksu tab.",
  ],
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

  // --- VAT by period under the statement ---

  "statement.vatYear": ["ALV vuoden aikana", "VAT over the year"],
  "statement.vatYearPeriod": ["Kausi", "Period"],
  "statement.vatYearTax": ["Vero", "Tax"],
  "statement.vatYearDeductible": ["Vähennettävä (307)", "Deductible (307)"],
  "statement.vatYearDue": ["Maksettava (308)", "Payable (308)"],
  "statement.vatYearStatus": ["Tila", "Status"],
  "statement.vatYearFiledOn": ["Ilmoitettu {d}", "Filed {d}"],
  "statement.vatYearNotFiled": [
    "Ei ilmoitettu, eräpäivä {d}",
    "Not filed, due {d}",
  ],
  "statement.vatYearNote": [
    "Miinusmerkkinen summa on palautukseen oikeuttava vero.",
    "A negative amount is tax that qualifies for a refund.",
  ],

  // --- Calculated deductions ---

  "deductions.tab": ["Vähennykset", "Deductions"],
  "deductions.intro": [
    "Matkojen ja yksityisauton lisävähennykset kirjataan riville 364 (veroilmoituksen kohdat 388 ja 392) ja työhuonevähennys riville 354, kirjanpidon ulkopuolisiin vähennyskelpoisiin kuluihin. Laskelmat käyttävät Verohallinnon vuoden {y} määriä, ja ne ovat apuväline: säilytä ajopäiväkirja ja matkojen tiedot itse.",
    "The travel and private car deductions go on line 364 (fields 388 and 392 of the return), and the home office deduction on line 354, deductible expenses outside the books. The calculators use the Tax Administration’s amounts for {y}. They are an aid: keep your own logbook and trip records.",
  ],
  "deductions.noRates": ["Ei määriä vuodelle {y}", "No amounts for {y}"],
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
  "settings.traderType": [
    "Elinkeinonharjoittajan tyyppi",
    "Type of sole trader",
  ],
  "settings.traderProfessional": ["Ammatinharjoittaja", "Professional"],
  "settings.traderBusiness": ["Liikkeenharjoittaja", "Business trader"],
  "settings.traderTypeHint": [
    "Ammatinharjoittaja (esimerkiksi konsultti tai freelancer) verotetaan maksuperusteisesti: tulo ja meno kuuluvat sille vuodelle, jona ne maksetaan. Liikkeenharjoittaja (esimerkiksi kauppias tai valmistaja) verotetaan suoriteperusteisesti: tulo ja meno kuuluvat tositteen päivän mukaiselle vuodelle, vaikka maksu tulisi myöhemmin. Jos et tiedä kumpi olet, tarkista asia Verohallinnolta tai tilitoimistolta.",
    "A professional (for example a consultant or freelancer) is taxed on payment: income and costs belong to the year they are paid. A business trader (for example a shopkeeper or manufacturer) is taxed on accrual: income and costs belong to the year of the voucher date, even when payment comes later. If you do not know which you are, ask Verohallinto or an accountant.",
  ],
  "settings.traderProfessionalNote": [
    "Tuloslaskelma ja lomake 5 lukevat tositteet maksupäivän mukaan.",
    "The income statement and Form 5 read vouchers by payment date.",
  ],
  "settings.traderBusinessNote": [
    "Tuloslaskelma ja lomake 5 lukevat tositteet tositteen päivän mukaan, maksettuina tai avoimina.",
    "The income statement and Form 5 read vouchers by voucher date, paid or open.",
  ],
  "settings.features": ["Käytössä olevat osat", "Parts in use"],
  "settings.featuresQuestion": [
    "Mitä liiketoimintasi sisältää?",
    "What does your business involve?",
  ],
  "settings.featuresHint": [
    "Poista rasti osasta, jota et käytä. Sen luokat, näkymä tai laskuri piilotetaan. Osa näkyy silti, jos kirjanpidossa on jo siihen kuuluvia tositteita. Voit palauttaa osan milloin tahansa Asetukset-sivulta.",
    "Clear the box for a part you do not use. Its categories, view or calculator are hidden. A part still shows when the book already has entries that belong to it. You can bring it back at any time on the Settings page.",
  ],
  "settings.featuresAll": ["Kaikki näkyvissä", "All shown"],
  "settings.featuresAllNote": [
    "Mikään osa ei ole piilotettu.",
    "No part is hidden.",
  ],
  "settings.featuresHidden": ["{n} piilotettu", "{n} hidden"],
  "settings.featureEmployees": [
    "Minulla on työntekijöitä (palkat ja sivukulut)",
    "I have employees (wages and staff costs)",
  ],
  "settings.featureCar": [
    "Käytän autoa yritystoimintaan (ajoneuvokulut, kilometrikorvaus)",
    "I use a car for the business (vehicle costs, mileage)",
  ],
  "settings.featureHomeOffice": [
    "Teen töitä kotona (kotitoimiston vähennys)",
    "I work from home (home office deduction)",
  ],
  "settings.featureEuSales": [
    "Myyn tavaroita tai palveluja toiseen EU-maahan (yhteenvetoilmoitus)",
    "I sell goods or services to other EU countries (EC Sales List)",
  ],
  "settings.featureLoans": [
    "Minulla on yrityksen laina (nosto ja lyhennys)",
    "I have a business loan (drawdown and repayment)",
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
  "settings.businessPhone": [
    "Puhelinnumero (ALV-tiedostoon)",
    "Phone number (for the VAT file)",
  ],
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
  "settings.encrypt": ["Salaus", "Encryption"],
  "settings.encryptHint": [
    "Tiedosto tallennetaan ZIP-tiedostona, jonka sisältö on salattu AES-256:lla. 7-Zip ja vastaavat ohjelmat avaavat sen salasanalla. Tiedostojen nimet, koot ja päivämäärät näkyvät ilman salasanaa, joten liitteiden nimet eivät ole salaisia. Salasanaa ei tallenneta selaimeen eikä tiedostoon: se kysytään, kun avaat tiedoston, ja kerran, kun tallennat sen avattuasi selaimen uudelleen. Jos unohdat sen, tiedostoa ei voi avata. Selaimen työkopio kirjanpidosta ei ole salattu, ennen kuin suljet tiedoston.",
    "The file is saved as a ZIP with its contents encrypted with AES-256. 7-Zip and similar programs open it with the password. File names, sizes and dates are visible without the password, so attachment names are not secret. The password is not stored in the browser or in the file. It is asked when you open the file, and once when you save after reopening the browser. If you forget it, the file can’t be opened. The browser’s working copy of the bookkeeping is not encrypted until you close the file.",
  ],
  "settings.encryptOn": ["Salattu", "Encrypted"],
  "settings.encryptOff": ["Ei salattu", "Not encrypted"],
  "settings.encryptOnNote": [
    "AES-256, tallennus kysyy salasanan tarvittaessa",
    "AES-256, saving asks for the password when needed",
  ],
  "settings.encryptOffNote": [
    "Tiedosto kirjoitetaan ilman salasanaa",
    "The file is written without a password",
  ],
  "settings.encryptEnable": ["Ota salaus käyttöön", "Turn on encryption"],
  "settings.encryptChange": ["Vaihda salasana", "Change password"],
  "settings.encryptDisable": ["Poista salaus", "Turn off encryption"],
  "settings.encryptSetTitle": ["Valitse salasana", "Choose a password"],
  "settings.encryptSetMessage": [
    "Jos unohdat salasanan, tiedostoa ei voi avata, eikä salasanaa voi palauttaa. Tallenna se salasanojen hallintaan.",
    "If you forget the password, the file can’t be opened and the password can’t be recovered. Keep it in a password manager.",
  ],
  "settings.encryptRepeatLabel": ["Toista salasana", "Repeat the password"],
  "settings.encryptMismatch": [
    "Salasanat eivät täsmää.",
    "The passwords don’t match.",
  ],
  "settings.encryptTooShort": [
    "Salasanassa pitää olla vähintään {n} merkkiä.",
    "The password needs at least {n} characters.",
  ],
  "settings.encryptSetConfirm": ["Käytä salasanaa", "Use this password"],
  "settings.encryptEnabled": [
    "Salaus on päällä. Tiedosto salataan seuraavassa tallennuksessa.",
    "Encryption is on. The file is encrypted the next time you save.",
  ],
  "settings.encryptOffTitle": ["Poistetaanko salaus?", "Turn off encryption?"],
  "settings.encryptOffMessage": [
    "Seuraava tallennus kirjoittaa tiedoston ilman salasanaa, ja sen sisällön voi lukea kuka tahansa, jolla on tiedosto.",
    "The next save writes the file without a password, and anyone with the file can read it.",
  ],
  "settings.encryptOffConfirm": ["Poista salaus", "Turn off encryption"],
  "settings.encryptDisabled": [
    "Salaus on pois päältä. Tiedosto kirjoitetaan ilman salasanaa seuraavassa tallennuksessa.",
    "Encryption is off. The file is written without a password the next time you save.",
  ],
  "settings.addCategory": ["Lisää oma luokka", "Add a category"],
  "settings.newCategory": ["Lisää luokka", "Add category"],
  "settings.euPurchase": [
    "Osto, jonka veron ilmoitat itse",
    "Purchase whose tax you report yourself",
  ],
  "settings.euPurchaseNo": ["Ei", "No"],
  "settings.line": ["Tuloslaskelman rivi", "Income statement line"],
  "settings.namePlaceholder": ["Esim. Työkalut", "E.g. Tools"],
  "settings.defaultVat": ["Oletus ALV %", "Default VAT %"],
  "settings.categories": ["Luokat", "Categories"],
  "settings.rulesTab": ["Säännöt", "Rules"],
  "settings.calendarTab": ["Kalenteri", "Calendar"],
  "settings.rulesTitle": ["Luokkasäännöt", "Category rules"],
  "settings.rulesHint": [
    "Sääntö valitsee luokan ja verokannan, kun teksti esiintyy tiliotteen rivillä tai laskussa. Ensimmäinen osuva sääntö voittaa, joten järjestyksellä on väliä. Säännöt ohittavat tositehistorian ja arvauksen. Ne eivät muuta jo kirjattuja tositteita.",
    "A rule picks the category and VAT rate when its text appears in a bank statement row or an invoice. The first matching rule wins, so the order matters. Rules come before the voucher history and the guesses. They do not change vouchers already booked.",
  ],
  "settings.rulesContains": ["Teksti sisältää", "Text contains"],
  "settings.rulesPlaceholder": ["Esim. Elisa", "E.g. Elisa"],
  "settings.rulesCategory": ["Luokka", "Category"],
  "settings.rulesRateDefault": ["Luokan oletus", "Category default"],
  "settings.rulesAdd": ["Lisää sääntö", "Add rule"],
  "settings.rulesEmpty": [
    "Ei sääntöjä. Lisää ensimmäinen yllä olevalla lomakkeella.",
    "No rules. Add the first one with the form above.",
  ],
  "settings.rulesTextError": [
    "Anna vähintään {n} merkkiä.",
    "Enter at least {n} characters.",
  ],
  "settings.rulesCategoryError": ["Valitse luokka.", "Choose a category."],
  "settings.rulesUnusable": [
    "Luokka puuttuu tai ei ole käytössä, joten sääntö ohitetaan.",
    "The category is missing or switched off, so the rule is skipped.",
  ],
  "settings.rulesDeleted": ["Sääntö poistettu.", "Rule deleted."],
  "settings.rulesUp": ["Siirrä ylös: {x}", "Move up: {x}"],
  "settings.rulesDown": ["Siirrä alas: {x}", "Move down: {x}"],
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
  /* A split row whose other parts are not in the file stands alone. */
  "io.splitDissolved": [
    pl(
      " Yksi jaetun kuitin osa jäi ilman muita osia ja on tavallinen tosite.",
      " {n} jaetun kuitin osaa jäi ilman muita osia ja ovat tavallisia tositteita."
    ),
    pl(
      " One part of a split receipt had no other parts in the file and is now an ordinary voucher.",
      " {n} parts of split receipts had no other parts in the file and are now ordinary vouchers."
    ),
  ],
  /* A reverses cell that names no voucher in the file links to nothing. */
  "io.reversesDissolved": [
    pl(
      " Yhden tositteen korjauslinkki ei osoittanut mihinkään tositteeseen tiedostossa, joten se jätettiin pois.",
      " {n} tositteen korjauslinkki ei osoittanut mihinkään tositteeseen tiedostossa, joten ne jätettiin pois."
    ),
    pl(
      " One voucher's link to the voucher it reverses pointed at nothing in the file and was left out.",
      " {n} vouchers' links to the voucher they reverse pointed at nothing in the file and were left out."
    ),
  ],
  /* A sells cell that names no voucher in the file links to nothing. */
  "io.sellsDissolved": [
    pl(
      " Yhden myyntitositteen linkki hankintaan ei osoittanut mihinkään tositteeseen tiedostossa, joten se jätettiin pois.",
      " {n} myyntitositteen linkki hankintaan ei osoittanut mihinkään tositteeseen tiedostossa, joten ne jätettiin pois."
    ),
    pl(
      " One sale voucher's link to its purchase pointed at nothing in the file and was left out.",
      " {n} sale vouchers' links to their purchases pointed at nothing in the file and were left out."
    ),
  ],
  "entry.logFieldSells": ["Myy hankinnan", "Sells purchase"],
  "entry.sells": ["Myytävä hankinta", "Purchase sold"],
  "entry.sellsInfo": [
    "Mihin myyntilinkkiä käytetään?",
    "What is the sale link for?",
  ],
  "entry.sellsInfoText": [
    "Valitse koneen tai kaluston hankintatosite, jonka tämä myynti koskee. Käyttöomaisuusluettelo näyttää silloin hankinnan ja myynnin samalla rivillä. Linkki on vain muistiinpano: poistopohja lasketaan edelleen summista.",
    "Choose the purchase voucher of the machine or equipment this sale is for. The fixed asset list then shows the purchase and the sale on one row. The link is a note only. The depreciation base is still worked out from the sums.",
  ],
  "entry.sellsNone": ["Ei linkkiä", "No link"],
  "ledger.reversesPill": ["Korjaa {v}", "Reverses {v}"],
  "ledger.reversedByPill": ["Korjattu {v}", "Reversed by {v}"],
  "entry.logFieldReverses": ["Korjaa tositetta", "Reverses voucher"],
  "entry.logReversesValue": ["linkitetty", "linked"],
  "entry.reverses": ["Korjaa tositetta", "Reverses voucher"],
  "entry.reversesInfo": [
    "Mitä korjaustosite tarkoittaa?",
    "What does reversing a voucher mean?",
  ],
  "entry.reversesInfoText": [
    "Hyvitys, hyvityslasku tai oikaisu osoittaa tositteeseen, jonka se kumoaa. Linkki on vain muistiinpano: se ei muuta laskelmia, joten kirjaa hyvitys silti omana rivinään oikealla summalla ja päivämäärällä. Kumpikin tosite näyttää toisensa.",
    "A refund, credit note or correction points at the voucher it reverses. The link is a note only. It changes no calculation, so still book the refund as its own row with the right amount and date. Each voucher shows the other.",
  ],
  "entry.reversesNone": ["Ei linkkiä", "No link"],
  "entry.reversesSearch": [
    "Hae numerolla, selitteellä, päivällä tai summalla",
    "Search by number, description, date or amount",
  ],
  "entry.reversesEmpty": ["Ei osumia", "No matches"],
  "entry.reversesMore": [
    "{n} muuta. Tarkenna hakua.",
    "{n} more. Narrow the search.",
  ],
  "entry.reversesOption": ["{v} · {d} · {x} · {m}", "{v} · {d} · {x} · {m}"],
  "entry.reversedBy": ["Korjattu tositteilla", "Reversed by"],
  "entry.reversesOpen": ["Avaa tosite {v}", "Open voucher {v}"],
  "io.noRows": [
    "Yhtään riviä ei voitu lukea. {e}",
    "No rows could be read. {e}",
  ],
  "io.imported": [
    pl("Tuotiin 1 tosite.", "Tuotiin {n} tositetta."),
    pl("Imported 1 voucher.", "Imported {n} vouchers."),
  ],
  "io.newCategories": [" Uusia luokkia: {n}.", " New categories: {n}."],
  "io.editedTitle": [
    "Tiedostoa on muokattu sovelluksen ulkopuolella",
    "The file was changed outside the app",
  ],
  "io.edited": [
    "Tiedoston tarkiste ei täsmää. {parts} Kirjanpito on avattu sellaisenaan. Jos muokkaus oli tarkoituksellinen, tallenna tiedosto, niin tarkiste päivittyy. Muussa tapauksessa tarkista luvut.",
    "The file's checksum does not match. {parts} The bookkeeping was opened as it is. If you made the change on purpose, save the file to update the checksum. Otherwise check the figures.",
  ],
  "io.editedEntries": [
    "Tositteita (CSV) on muutettu.",
    "The entries (CSV) were changed.",
  ],
  "io.editedSettings": [
    "Asetuksia (settings.json) on muutettu.",
    "The settings (settings.json) were changed.",
  ],
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
  "io.archiveReadOnly": [
    "Arkisto on vain luettavissa. Avaa työkirjanpito, jos haluat tallentaa.",
    "This archive is read-only. Open your working book to save.",
  ],
  "io.archiveRunning": [
    "Vuosi {y} ei ole vielä päättynyt.",
    "Year {y} has not ended yet.",
  ],
  "io.archiveForm5": [
    "Merkitse vuoden {y} lomake 5 ilmoitetuksi.",
    "Mark the Form 5 for {y} as filed.",
  ],
  "io.archiveVat": [
    "Merkitse nämä ALV-kaudet ilmoitetuiksi: {p}.",
    "Mark these VAT periods as filed: {p}.",
  ],
  "io.archiveOlder": [
    "Arkistoi ensin vuosi {y}. Vuodet arkistoidaan vanhimmasta alkaen.",
    "Archive {y} first. Years go oldest first.",
  ],
  "io.archiveUnsettled": [
    "Tositteita, jotka ovat avoimia tai maksettu vasta myöhemmin: {n}. Ne pysyvät kirjanpidossa, joten arkistoi vuosi vasta kun ne on maksettu.",
    "Vouchers that are open or were paid later: {n}. They stay in the book, so archive the year once they are paid.",
  ],
  "io.archiveAssetOpening": [
    "Koneiden ja kaluston alkusaldo on myöhemmältä vuodelta kuin seuraava vuosi. Korjaa se Poistot-sivulla.",
    "The machinery opening balance is dated later than the next year. Fix it on the Depreciation page.",
  ],
  "io.archiveEmpty": [
    "Vuodella {y} ei ole tositteita.",
    "Year {y} has no vouchers.",
  ],
  "io.archiveBlockedTitle": [
    "Vuotta {y} ei voi vielä arkistoida",
    "Year {y} cannot be archived yet",
  ],
  "io.archiveNeedsPickerTitle": [
    "Arkistointi ei toimi tässä selaimessa",
    "Archiving does not work in this browser",
  ],
  "io.archiveNeedsPicker": [
    "Tositteet poistetaan kirjanpidosta vasta, kun arkistotiedosto on varmasti kirjoitettu. Siihen tarvitaan selain, joka tallentaa tiedostoja suoraan, esimerkiksi Chrome tai Edge.",
    "Vouchers leave the book only once the archive file is certainly written. That needs a browser that saves files directly, such as Chrome or Edge.",
  ],
  "io.archiveLost": [
    "Liitteitä, joita tämä selain ei pidä hallussaan: {n}. Arkistosta puuttuisi tositteita. Avaa kirjanpito uudelleen tiedostosta ja yritä sitten.",
    "Attachments this browser does not hold: {n}. The archive would be missing vouchers. Reopen the book from its file and try again.",
  ],
  "io.archiveDone": [
    "Vuosi {y} arkistoitu tiedostoon {f}. Kirjanpidosta poistettiin {n} tositetta. Tallenna kirjanpito.",
    "Year {y} archived to {f}. {n} vouchers left the book. Save the book now.",
  ],
  "io.archiveFailed": [
    "Arkistointi epäonnistui. Kirjanpito ei muuttunut.",
    "Archiving failed. Your book is unchanged.",
  ],
  "confirm.archiveTitle": ["Arkistoidaanko vuosi {y}?", "Archive {y}?"],
  "confirm.archiveMessage": [
    "Vuosi {y} tallennetaan omaan ZIP-tiedostoonsa. Sen jälkeen {n} tositetta liitteineen poistetaan tästä kirjanpidosta ja kirjanpito pitää tallentaa. Arkiston voi avata vain luettavaksi milloin tahansa.",
    "{y} is written to a ZIP of its own. After that {n} vouchers and their attachments leave this book, and the book needs saving. You can open the archive read-only at any time.",
  ],
  "confirm.archiveConfirm": [
    "Valitse tiedosto ja arkistoi",
    "Choose file and archive",
  ],
  "overview.yearArchive": ["Arkistoi", "Archive"],
  "overview.yearPackage": ["Säilytyspaketti", "Retention package"],
  "ledger.packForm5Title": ["Lomake 5 {y}", "Form 5 {y}"],
  "ledger.packForm5Sub": [
    "kentät siinä järjestyksessä, jossa ne annetaan OmaVerossa",
    "fields in the order they are entered in OmaVero",
  ],
  "ledger.packVatVouchers": [
    "Tositteet kenttien takana",
    "Vouchers behind the fields",
  ],
  "ledger.packVatNote": [
    "Jokaisen kentän alla ovat tositteet, joista sen summa koostuu. Kenttä 308 on veron saldo, joten palautukseen oikeuttavan veron tositteiden summa on miinusmerkkinen.",
    "Under each field are the vouchers its amount is made of. Field 308 is the balance of the tax, so the vouchers of a refund add up to a negative amount.",
  ],
  "ledger.packVatChanged": [
    "Muutokset ilmoittamisen jälkeen",
    "Changes since filing",
  ],
  "ledger.packVatChangedIntro": [
    "Kirjanpidon luvut poikkeavat luvuista, joilla ilmoitus merkittiin annetuksi. Tämä sivu näyttää kentät, joissa ero on.",
    "The book's figures differ from those the return was marked filed with. This page lists the fields that differ.",
  ],
  "ledger.packVatMatches": [
    "Luvut vastaavat lukuja, joilla ilmoitus merkittiin annetuksi.",
    "The figures match those the return was marked filed with.",
  ],
  "ledger.packVatAmount": ["Summaan", "To the field"],
  "ledger.packReadmeEncrypted": [
    "\nKirjanpidon ZIP on salattu, mutta raportit ja tämä tiedosto eivät ole.\n",
    "\nThe book ZIP is encrypted, but the reports and this file are not.\n",
  ],
  "ledger.packReadme": [
    "Säilytyspaketti, vuosi {y}\n\nTämä paketti on kirjanpitolain 2 luvun 10 §:n säilytystä varten. Päiväkirja ja pääkirja säilytetään vähintään {b} asti ja tositteet vähintään {v} asti.\n\nSisältö:\n- {r}/: päiväkirja, pääkirja, tililuettelo, tuloslaskelma, lomake 5 ja vuoden arvonlisäveroilmoitukset tositteineen PDF-tiedostoina.\n- {z}: vuoden kirjanpito ZIP-tiedostona. Se sisältää tositteet CSV:nä, asetukset ja liitteet kansiossa {d}/. Sen voi avata Kirjanpito-sovelluksessa vain luettavaksi.\n- {h}: pakettitiedostojen SHA-256-tarkisteet.\n- {s}: liitteiden SHA-256-tarkisteet polkuineen, jotka niillä on {z}-tiedoston avaamisen jälkeen.\n\nTarkistus: pura paketti ja aja sen kansiossa komento sha256sum -c {h}. Liitteet tarkistetaan samoin, kun {z} on purettu omaan kansioonsa ja komento ajetaan siellä: sha256sum -c ../{s}.\n\nTarkisteet paljastavat vahingossa muuttuneen tai vioittuneen tiedoston. Ne eivät todista mitään sille, joka muuttaa tiedoston tarkoituksella ja laskee tarkisteen uudelleen.\n{e}",
    "Retention package, year {y}\n\nThis package is for the retention of Accounting Act chapter 2 section 10. Keep the journal and the general ledger until at least {b}, and the vouchers until at least {v}.\n\nContents:\n- {r}/: the journal, general ledger, account list, income statement, Form 5 and the year's VAT returns with their vouchers as PDF files.\n- {z}: the year's bookkeeping as a ZIP. It holds the vouchers as CSV, the settings and the attachments in the folder {d}/. The Kirjanpito app opens it read-only.\n- {h}: SHA-256 hashes of the files in the package.\n- {s}: SHA-256 hashes of the attachments, with the paths they have once {z} is unpacked.\n\nTo check: unpack the package and run sha256sum -c {h} in its folder. Check the attachments the same way: unpack {z} into a folder of its own and run sha256sum -c ../{s} there.\n\nThe hashes reveal a file that changed by accident or is damaged. They prove nothing against someone who changes a file on purpose and recomputes the hash.\n{e}",
  ],
  "ledger.noEntriesRange": [
    "Ei tositteita välillä {r}.",
    "No vouchers in {r}.",
  ],
  "ledger.auditReadme": [
    "Tarkastuspaketti, {a}\n\nTämä paketti on kirjanpidon tarkastusta varten, esimerkiksi Verohallinnon tai tilintarkastajan pyynnöstä. Se kattaa tositteet, jotka on päivätty välillä {a}.\n\nSisältö:\n- {r}/: päiväkirja, pääkirja, tililuettelo ja ne arvonlisäveroilmoitukset tositteineen, joiden kausi on kokonaan tällä välillä, PDF-tiedostoina.\n- {z}: välin kirjanpito ZIP-tiedostona. Se sisältää tositteet CSV:nä ja liitteet kansiossa {d}/.\n- {h}: pakettitiedostojen SHA-256-tarkisteet.\n- {s}: liitteiden SHA-256-tarkisteet polkuineen, jotka niillä on {z}-tiedoston avaamisen jälkeen.\n\nTarkistus: pura paketti ja aja sen kansiossa komento sha256sum -c {h}. Liitteet tarkistetaan samoin, kun {z} on purettu omaan kansioonsa ja komento ajetaan siellä: sha256sum -c ../{s}.\n\nPaketissa ei ole tuloslaskelmaa eikä lomaketta 5, koska ne lasketaan koko vuodesta. Ne ovat vuoden säilytyspaketissa.\n\nTarkisteet paljastavat vahingossa muuttuneen tai vioittuneen tiedoston. Ne eivät todista mitään sille, joka muuttaa tiedoston tarkoituksella ja laskee tarkisteen uudelleen.\n{e}",
    "Audit package, {a}\n\nThis package is for an audit of the books, for example at the request of the Tax Administration or an auditor. It covers the vouchers dated in {a}.\n\nContents:\n- {r}/: the journal, general ledger, account list and the VAT returns, with their vouchers, whose period lies wholly in this range, as PDF files.\n- {z}: the bookkeeping for the range as a ZIP. It holds the vouchers as CSV and the attachments in the folder {d}/.\n- {h}: SHA-256 hashes of the files in the package.\n- {s}: SHA-256 hashes of the attachments, with the paths they have once {z} is unpacked.\n\nTo check: unpack the package and run sha256sum -c {h} in its folder. Check the attachments the same way: unpack {z} into a folder of its own and run sha256sum -c ../{s} there.\n\nThe package has no income statement or Form 5, because they are worked out for a whole year. They are in the year's retention package.\n\nThe hashes reveal a file that changed by accident or is damaged. They prove nothing against someone who changes a file on purpose and recomputes the hash.\n{e}",
  ],
  "file.audit": ["Tarkastuspaketti", "Audit package"],
  "io.auditTitle": ["Tarkastuspaketti", "Audit package"],
  "io.auditIntro": [
    "Tositteet, päiväkirja, pääkirja, tililuettelo ja liitteet valitulta väliltä yhtenä ZIP-tiedostona. Tositteet valitaan päiväyksen mukaan.",
    "The vouchers, journal, general ledger, account list and attachments for a range of days in one ZIP. Vouchers are chosen by their date.",
  ],
  "io.auditFrom": ["Alkaa", "From"],
  "io.auditTo": ["Päättyy", "To"],
  "io.auditQuick": ["Pikavalinta", "Quick pick"],
  "io.auditThisYear": ["Tämä vuosi", "This year"],
  "io.auditLastYear": ["Viime vuosi", "Last year"],
  "io.auditLastQuarter": ["Edellinen neljännes", "Last quarter"],
  "io.auditCount": ["Välillä on {n} tositetta.", "{n} vouchers in this range."],
  "io.auditNone": [
    "Välillä ei ole tositteita.",
    "There are no vouchers in this range.",
  ],
  "io.auditInvalid": [
    "Alkupäivä on loppupäivän jälkeen.",
    "The start is after the end.",
  ],
  "io.auditNote": [
    "Mukana ovat ALV-ilmoitukset, joiden kausi on kokonaan välillä. Tuloslaskelma ja lomake 5 kuuluvat vuoden säilytyspakettiin, koska ne lasketaan koko vuodesta.",
    "VAT returns are included when their period lies wholly in the range. The income statement and Form 5 belong to the year's retention package, because they are worked out for a whole year.",
  ],
  "io.auditMake": ["Lataa paketti", "Download package"],
  "io.auditDone": [
    "Tarkastuspaketti ladattu: {f}.",
    "Audit package downloaded: {f}.",
  ],
  "io.auditFailed": [
    "Tarkastuspaketin teko epäonnistui. Kirjanpito ei muuttunut.",
    "Making the audit package failed. Your book is unchanged.",
  ],
  "confirm.auditBlockedTitle": [
    "Tarkastuspakettia ei voi tehdä",
    "Can’t make the audit package",
  ],
  "confirm.archivePackConfirm": [
    "Arkistoi ja tee säilytyspaketti",
    "Archive and make a retention package",
  ],
  "confirm.packEncryptedTitle": [
    "Raportit tulevat salaamattomina",
    "The reports will not be encrypted",
  ],
  "confirm.packEncryptedMessage": [
    "Kirjanpidon ZIP on salattu ja pysyy salattuna paketin sisällä. Raportti-PDF:t ja tarkistetiedostot eivät ole salattuja, ja niistä näkyy vuoden luvut. Säilytä paketti sen mukaan.",
    "The book ZIP is encrypted and stays encrypted inside the package. The report PDFs and hash lists are not, and they show the year’s figures. Store the package accordingly.",
  ],
  "confirm.packConfirm": ["Tee paketti", "Make the package"],
  "confirm.packBlockedTitle": [
    "Säilytyspakettia {y} ei voi tehdä",
    "Can’t make the retention package for {y}",
  ],
  "io.packDone": [
    "Säilytyspaketti {y} ladattu: {f}.",
    "Retention package {y} downloaded: {f}.",
  ],
  "io.packFailed": [
    "Säilytyspaketin teko epäonnistui. Kirjanpito ei muuttunut.",
    "Making the retention package failed. Your book is unchanged.",
  ],
  "app.archiveBanner": ["Arkisto {y}: vain luku", "Archive {y}: read-only"],
  "app.archiveClose": ["Sulje arkisto", "Close archive"],
  "settings.archivesTitle": ["Arkistoidut vuodet", "Archived years"],
  "settings.archivesDesc": [
    "Nämä vuodet ovat omissa ZIP-tiedostoissaan. Avaa arkisto Avaa tiedosto -toiminnolla, niin se avautuu vain luettavana.",
    "These years live in ZIP files of their own. Open one with Open file and it opens read-only.",
  ],
  "settings.archivesRow": [
    "{y}: {f}, tositteita {n}, arkistoitu {d}",
    "{y}: {f}, {n} vouchers, archived {d}",
  ],
  "io.saveFailed": ["Tallennus epäonnistui.", "Couldn’t save the file."],
  "io.autosaveRetry": [
    "Automaattinen tallennus epäonnistui. Yritetään uudelleen.",
    "Autosave failed. Trying again.",
  ],
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
  "io.passwordTitle": [
    "Kirjanpito on salattu",
    "This bookkeeping is encrypted",
  ],
  "io.passwordOpenMessage": [
    "Anna tiedoston {f} salasana.",
    "Enter the password for {f}.",
  ],
  "io.passwordLabel": ["Salasana", "Password"],
  "io.passwordOpen": ["Avaa", "Open"],
  "io.passwordWrong": [
    "Salasana ei avaa tiedostoa.",
    "That password doesn’t open the file.",
  ],
  "io.passwordSaveTitle": [
    "Anna salasana tallennusta varten",
    "Enter the password to save",
  ],
  "io.passwordSaveMessage": [
    "Kirjanpito on salattu. Salasanaa ei säilytetä selaimessa, joten se kysytään kerran jokaisella käyttökerralla. Anna tiedoston nykyinen salasana.",
    "This bookkeeping is encrypted. The browser doesn’t keep the password, so it is asked once per session. Enter the file’s current password.",
  ],
  "io.passwordSave": ["Tallenna", "Save"],

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

  // --- Bank statement import (§8.16) ---

  "bank.import": ["Tuo tiliote", "Import statement"],
  "bank.title": ["Tuo tiliote", "Import bank statement"],
  "bank.fileHint": [
    "{file}: {n} tapahtumaa. Tarkista jokainen rivi. Mitään ei kirjata ennen kuin vahvistat.",
    "{file}: {n} transactions. Check every row. Nothing is booked until you confirm.",
  ],
  "bank.fileEmpty": ["Tiedostossa ei ole rivejä.", "The file has no rows."],
  "bank.readError": [
    "Tiedostoa ei voitu lukea.",
    "The file could not be read.",
  ],
  "bank.mapTitle": ["Valitse sarakkeet", "Choose the columns"],
  "bank.mapHint": [
    "Tiedoston rakennetta ei tunnistettu. Kerro, mistä sarakkeesta kukin tieto löytyy. Päivä ja summa (tai veloitus ja hyvitys) vaaditaan.",
    "The layout was not recognised. Say which column holds each field. A date and an amount (or a debit and a credit) are required.",
  ],
  "bank.fieldDate": ["Kirjauspäivä", "Booking date"],
  "bank.fieldAmount": ["Summa", "Amount"],
  "bank.fieldDebit": ["Veloitus", "Debit"],
  "bank.fieldCredit": ["Hyvitys", "Credit"],
  "bank.fieldCounterparty": ["Saaja tai maksaja", "Payee or payer"],
  "bank.fieldMessage": ["Viesti", "Message"],
  "bank.fieldReference": ["Viite", "Reference"],
  "bank.noColumn": ["Ei saraketta", "No column"],
  "bank.useMapping": ["Käytä näitä sarakkeita", "Use these columns"],
  "bank.skippedRows": [
    pl(
      "1 rivi ohitettiin, koska sitä ei voitu lukea.",
      "{n} riviä ohitettiin, koska niitä ei voitu lukea."
    ),
    pl(
      "1 row could not be read and was skipped.",
      "{n} rows could not be read and were skipped."
    ),
  ],
  "bank.colDate": ["Pvm", "Date"],
  "bank.colParty": ["Vastapuoli", "Counterparty"],
  "bank.colAmount": ["Summa", "Amount"],
  "bank.colAction": ["Toiminto", "Action"],
  "bank.colCategory": ["Luokka", "Category"],
  "bank.actionSkip": ["Ohita", "Skip"],
  "bank.actionNew": ["Uusi tosite", "New voucher"],
  "bank.actionPaid": ["Maksettu: {v}", "Paid: {v}"],
  "bank.statusLikely": ["Sopii avoimeen tositteeseen", "Fits an open voucher"],
  "bank.statusAmount": [
    "Summa sopii avoimeen tositteeseen",
    "The amount fits an open voucher",
  ],
  "bank.statusAmbiguous": [
    "Useampi avoin tosite sopii. Valitse yksi.",
    "Several open vouchers fit. Choose one.",
  ],
  "bank.statusBooked": [
    "Näyttää jo kirjatulta: {v}",
    "Looks already booked: {v}",
  ],
  "bank.statusSuggested": [
    "Luokka aiemmista tositteista",
    "Category from earlier vouchers",
  ],
  "bank.statusNoCategory": ["Valitse luokka", "Choose a category"],
  "bank.pickCategory": ["Valitse luokka", "Choose a category"],
  "bank.needCategory": [
    pl(
      "1 uudelta tositteelta puuttuu luokka.",
      "{n} uudelta tositteelta puuttuu luokka."
    ),
    pl("1 new voucher has no category.", "{n} new vouchers have no category."),
  ],
  "bank.claimedTwice": [
    "Sama avoin tosite on valittu kahdelle riville.",
    "The same open voucher is chosen for two rows.",
  ],
  "bank.confirm": [
    "Kirjaa ({paid} maksua, {added} uutta)",
    "Book ({paid} payments, {added} new)",
  ],
  "bank.booked": [
    "Kirjattu: {paid} maksua, {added} uutta tositetta.",
    "Booked: {paid} payments, {added} new vouchers.",
  ],
  "bank.needBook": [
    "Tämä on tiliote, ei kirjanpitotiedosto. Avaa tai aloita ensin kirjanpito ja käytä Kirjanpito-näkymän Tuo tiliote -painiketta.",
    "This is a bank statement, not a bookkeeping file. Open or start a bookkeeping first, then use Import statement on the ledger.",
  ],
  "bank.undone": ["Tiliotteen kirjaus peruttu.", "Statement booking undone."],
  "bank.paidInFiledYear": [
    "Maksupäivä osuisi vuoteen, jonka lomake 5 on merkitty ilmoitetuksi.",
    "A payment date would fall in a year whose Form 5 is marked as filed.",
  ],
  // --- Tax calendar (§8.22) ---
  "calendar.subtitle": [
    "Verojen ja maksujen eräpäivät vuonna {y}.",
    "Tax and payment due dates in {y}.",
  ],
  "calendar.export": ["Vie kalenteriin", "Export to calendar"],
  "calendar.icsName": [
    "Kirjanpito: verokalenteri {y}",
    "Kirjanpito: tax calendar {y}",
  ],
  "calendar.icsFile": ["verokalenteri-{y}.ics", "tax-calendar-{y}.ics"],
  "calendar.empty": [
    "Tälle vuodelle ei ole eräpäiviä. ALV-päivät tulevat näkyviin, kun kirjanpidolla on aloituskuukausi tai ensimmäinen tosite.",
    "There are no due dates for this year. VAT dates appear once the book has a start month or a first voucher.",
  ],
  "calendar.vat": ["ALV-ilmoitus, {p}", "VAT return, {p}"],
  "calendar.ec": ["Yhteenvetoilmoitus, {m}", "EC Sales List, {m}"],
  "calendar.form5": ["Lomake 5, verovuosi {y}", "Form 5, tax year {y}"],
  "calendar.yel": ["YEL-maksu", "YEL contribution"],
  "calendar.advanceTax": ["Ennakkovero", "Advance tax"],
  "calendar.done": ["Ilmoitettu", "Filed"],
  "calendar.today": ["Tänään", "Today"],
  "calendar.inDays": ["{n} pv päästä", "in {n} days"],
  "calendar.daysAgo": ["{n} pv sitten", "{n} days ago"],
  "calendar.setMonths": [
    "Valitse YEL-maksun ja ennakkoveron kuukaudet asetuksissa.",
    "Pick the YEL and advance tax months in settings.",
  ],
  "calendar.noMonths": ["Ei valittu", "None chosen"],
  "calendar.payIntro": [
    "YEL-maksun ja ennakkoveron kuukaudet riippuvat eläkeyhtiön laskusta ja OmaVeron ennakkoveropäätöksestä, joten valitse ne itse. YEL erääntyy yleensä kuun 20. päivänä ja ennakkovero 23. päivänä. Viikonloppuna tai pyhänä päivä siirtyy seuraavaan arkipäivään.",
    "The months of the YEL contribution and advance tax depend on your pension company's invoice and your advance tax decision in OmaVero, so pick them yourself. YEL usually falls due on the 20th and advance tax on the 23rd. On a weekend or holiday the date moves to the next working day.",
  ],
  "calendar.yelMonths": ["YEL-maksun kuukaudet", "YEL months"],
  "calendar.taxMonths": ["Ennakkoveron kuukaudet", "Advance tax months"],
  "calendar.note": [
    "Päivät ovat ohjeellisia. Tarkista ne OmaVerosta ja eläkeyhtiöltäsi.",
    "The dates are a guide. Check them in OmaVero and with your pension company.",
  ],
  "calendar.paid": ["Maksettu", "Paid"],
  "calendar.book": ["Kirjaa maksetuksi", "Book as paid"],
  "calendar.booked": ["Ennakkovero kirjattu", "Advance tax booked"],
  "calendar.bookDescription": ["Ennakkovero, {m}", "Advance tax, {m}"],
  "calendar.decisionTitle": [
    "Ennakkoveropäätös {y}",
    "Advance tax decision {y}",
  ],
  "calendar.decisionAmount": [
    "Ennakkovero vuodelta, yhteensä (€)",
    "Advance tax for the year, total (€)",
  ],
  "calendar.decisionRate": [
    "Veroprosentti arviota varten (%)",
    "Tax rate for the estimate (%)",
  ],
  "calendar.decisionHint": [
    "Kirjoita summa OmaVeron ennakkoveropäätöksestä. Kalenteri jakaa sen tasan valittujen kuukausien kesken. Veroprosentti on sinun oma arviosi koko tulon veroasteesta. Jätä kenttä tyhjäksi, jos et halua arviota.",
    "Enter the amount from your advance tax decision in OmaVero. The calendar splits it evenly over the chosen months. The rate is your own guess of the overall share of the income that goes to tax. Leave it empty for no estimate.",
  ],
  "calendar.decisionNoRate": ["Ei arviota", "No estimate"],
  "calendar.decisionRateValue": ["Arvio {r} %:lla", "Estimate at {r} %"],
  "calendar.sumTitle": ["Ennakkovero {y}", "Advance tax {y}"],
  "calendar.sumDecision": ["Ennakkoveropäätös", "Advance tax decision"],
  "calendar.sumPaid": ["Kirjattu maksetuksi", "Booked as paid"],
  "calendar.sumLeft": ["Maksamatta", "Left to pay"],
  "calendar.sumEstimate": ["Veroarvio {r} %:lla", "Tax estimate at {r} %"],
  "calendar.sumShort": [
    "Päätös on arviota pienempi",
    "Decision is below the estimate",
  ],
  "calendar.sumOver": [
    "Päätös on arviota suurempi",
    "Decision is above the estimate",
  ],
  "calendar.sumNote": [
    "Arvio on tilikauden voitto (358) kerrottuna omalla veroprosentillasi. Ansiotulon verotus on progressiivista, joten arvio on suuntaa antava. Jos ennakko jää selvästi alle, voit hakea ennakon korotusta OmaVerossa.",
    "The estimate is the year's profit (358) times your own rate. Earned income is taxed on a progressive scale, so the figure is only a guide. If the advance falls well short, you can ask for a higher one in OmaVero.",
  ],

  // --- Check the book (§8.23) ---
  "check.title": ["Tarkista kirjanpito", "Check the book"],
  "check.intro": [
    "Kaikki säännöt käydään läpi koko kirjanpidolle, vuosi kerrallaan. Huomautus ei estä mitään, ja tosite voi olla oikein.",
    "Every rule runs over the whole book, one year at a time. A finding blocks nothing, and the voucher may be right.",
  ],
  "check.summary": [
    "Virheitä {b}, huomautuksia {w}, tiedoksi {i}",
    "{b} errors, {w} warnings, {i} for information",
  ],
  "check.allClear": [
    "Ei huomautettavaa. Yksikään sääntö ei löytänyt mitään.",
    "Nothing to flag. No rule found anything.",
  ],
  "check.book": ["Koko kirjanpito", "The whole book"],
  "check.year": ["Vuosi {y}", "Year {y}"],
  "check.form5": [
    "Lomakkeen 5 luvut eivät täsmää: {codes}",
    "Form 5 figures do not agree: {codes}",
  ],
  "check.form5Sub": [
    "Verohallinnon tarkistus ({source}) ei päde sovelluksen laskemille luvuille. Tarkista luvut OmaVerossa ennen kuin kopioit ne.",
    "Verohallinto's check ({source}) fails for the figures the app worked out. Check the figures in OmaVero before you copy them.",
  ],
} as const satisfies Dict
