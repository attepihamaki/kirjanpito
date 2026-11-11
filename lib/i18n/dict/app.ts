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
  "app.errorTitle": ["Jokin meni vikaan", "Something went wrong"],
  "app.errorSafe": [
    "Sivua ei voitu näyttää. Kirjanpitosi on silti tallessa: selain säilyttää tositteet ja kuitit, eikä virhe koskenut niihin.",
    "The page couldn’t be shown. Your bookkeeping is still safe: the browser keeps the vouchers and receipts, and the error didn’t touch them.",
  ],
  "app.errorUnsaved": [
    "Selaimessa on muutoksia, joita ei ole vielä tallennettu tiedostoon. Lataa kopio ennen kuin jatkat.",
    "The browser holds changes that aren’t saved to a file yet. Download a copy before you go on.",
  ],
  "app.errorSaved": [
    "Kaikki muutokset on tallennettu tiedostoon {f}.",
    "Every change is saved to {f}.",
  ],
  "app.errorInBrowser": [
    "Muutokset ovat selaimessa. Lataa kopio, niin ne ovat myös tiedostossa.",
    "The changes are in the browser. Download a copy to have them in a file too.",
  ],
  "app.errorNoBook": [
    "Kirjanpitoa ei ole auki, joten mitään ei ole vaarassa.",
    "No books are open, so nothing is at risk.",
  ],
  "app.errorRetry": ["Yritä uudelleen", "Try again"],
  "app.errorDownload": ["Lataa kopio kirjanpidosta", "Download a copy"],
  "app.errorReload": ["Lataa sivu uudelleen", "Reload the page"],
  "app.errorDetails": ["Virheen tiedot", "Error details"],
  "app.errorRawData": [
    "Lataa selaimeen tallennetut tiedot (JSON, vikailmoitusta varten)",
    "Download the browser’s stored data (JSON, for a bug report)",
  ],
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
    "Your changes exist only on this page. Save or download the books before you close it.",
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
  "file.messagesUnread": [
    pl("Viestit, 1 lukematon", "Viestit, {n} lukematonta"),
    pl("Messages, 1 unread", "Messages, {n} unread"),
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
      "1 liitettä ei löydy selaimesta eikä tiedostosta {f}. Tallennus jättää sen pois, ja jos se on tiedostossa toisella nimellä, se katoaa sieltä.",
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
    "Replace the open books?",
  ],
  "confirm.replaceMessage": [
    "Avoimessa kirjanpidossa on muutoksia, joita ei ole tallennettu. Avattava tiedosto korvaa ne.",
    "The open books have changes that haven’t been saved. The file you open will replace them.",
  ],
  "confirm.replaceConfirm": ["Korvaa", "Replace"],
  "confirm.deleteBookTitle": ["Poistetaanko kirjanpito?", "Delete the books?"],
  "confirm.deleteBookMessage": [
    "Tositteet, liitteet ja asetukset poistetaan tästä selaimesta pysyvästi, eikä poistoa voi perua. Lataa kirjanpito tiedostoksi ensin, jos haluat säilyttää sen.",
    "The vouchers, attachments and settings are removed from this browser for good, and there is no undoing it. Download the books as a file first if you want to keep it.",
  ],
  "confirm.deleteBookConfirm": ["Poista kirjanpito", "Delete books"],
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
  "common.everyMonth": ["Joka kuukausi", "Every month"],
  "common.everyMonths": ["{n} kk välein", "Every {n} months"],
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
    "Joistakin tositteista lukuun lasketaan vain osa: osingoista verotettavan osuuden, edustuskuluista puolet, osuuskunnan ylijäämästä verotettavan osan ja poistoista enintään rekisterin enimmäismäärän. Tositteet on lueteltu täysinä summina.",
    "The figure counts only part of some vouchers: the taxable share of dividends, half of entertainment, the taxable part of a co-operative surplus and depreciation up to the register's maximum. The vouchers are listed in full.",
  ],
  "common.figureTypedNote": [
    "Luku sisältää myös käsin annettuja velkoja ja lainan alkusaldon, joista ei ole tositetta. Tositteet kattavat vain kirjanpidossa olevan osan.",
    "The figure also includes debts typed in by hand and the loan's opening balance, which no voucher stands behind. The vouchers cover only the part held in the book.",
  ],
  "entry.figuresVat": ["ALV-ilmoitus, {p}", "VAT return, {p}"],
  "entry.figuresForm5": ["Lomake 5, {y}", "Form 5, {y}"],
  /* Group headings in the category picker (§8.5). */
  "entry.categoryMostUsed": ["Eniten käytetyt", "Most used"],
  "entry.categoryAll": ["Kaikki", "All"],
  "entry.figuresHint": [
    "Tallennetun tositteen mukaan. Napsauta kohtaa, niin näet kaikki sen tositteet.",
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
    "Raahaa korttia kahvasta tai siirrä sitä nuolilla. Asettelu tallentuu kirjanpitotiedostoon.",
    "Drag a widget by its handle or move it with the arrows. The layout is saved in the bookkeeping file.",
  ],
  "overview.hidden": ["Piilotetut:", "Hidden:"],
  "overview.allHidden": [
    "Kaikki kortit on piilotettu.",
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
    "Nosta kortti välilyönnillä tai Enterillä, siirrä sitä nuolinäppäimillä ja pudota välilyönnillä tai Enterillä. Escape peruu siirron.",
    "Press Space or Enter to pick up a widget, move it with the arrow keys, and press Space or Enter again to drop it. Escape cancels.",
  ],
  "overview.dndRole": ["siirrettävä kortti", "movable widget"],
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
  "overview.widgetTax": ["Verot ja YEL", "Tax and YEL"],
  "overview.widgetCashflow": ["Kassavirtaennuste", "Cash-flow forecast"],
  "overview.cashflowEnd": [
    "Pankkitilillä arviolta {n} viikon päästä ({d})",
    "Bank account in {n} weeks ({d}), estimated",
  ],
  "overview.cashflowNoBalance": [
    "Pankkitilin saldoa ei ole annettu, joten luku on vain tulevien maksujen erotus. Anna saldo Pankkitili-kortissa.",
    "No bank balance is given, so this is only the difference of the payments ahead. Enter the balance on the Bank account card.",
  ],
  "overview.cashflowToday": ["Tänään", "Today"],
  "overview.cashflowStart": ["Lähtösaldo", "Starting from"],
  "overview.cashflowIn": ["Tulossa", "Coming in"],
  "overview.cashflowOut": ["Lähdössä", "Going out"],
  "overview.cashflowLowest": ["Alimmillaan", "Lowest"],
  "overview.cashflowWeekOf": ["viikolla {d}", "week of {d}"],
  "overview.cashflowOverdue": [
    "Ensimmäisellä viikolla mukana erääntyneitä saatavia {a} ja maksamatta olevia laskuja ja ilmoituksia {b}.",
    "The first week includes overdue receivables of {a} and overdue bills and returns of {b}.",
  ],
  "overview.cashflowWeeks": ["Näytä viikoittain", "Show by week"],
  "overview.cashflowWeek": ["Viikko alkaen", "Week from"],
  "overview.cashflowBalance": ["Saldo", "Balance"],
  "overview.cashflowAdvanceTax": ["Ennakkovero", "Advance tax"],
  "overview.cashflowNote": [
    "Arvio kirjanpidon tiedoista: avoimet laskut ja maksettavat eräpäivinään, toistuvat tositteet ja laskut, ALV-ilmoitukset ja ennakkoverot. YEL ja muut kirjaamattomat maksut eivät ole mukana.",
    "An estimate from the book: open invoices and bills on their due dates, recurring entries and invoices, VAT returns and advance tax. YEL and other payments not in the book are left out.",
  ],

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
    "The period has ended. File it in MyTax.",
  ],
  "overview.periodLate": [
    "Eräpäivä on mennyt. Ilmoita se OmaVerossa.",
    "The due date has passed. File it in MyTax.",
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
    "Verottomat summat. Valitse kuukausi, niin sen tositteet avautuvat.",
    "Net amounts. Pick a month to open its vouchers.",
  ],
  "overview.bestMonth": ["Paras kuukausi", "Best month"],
  "overview.avgIncome": ["Tulot keskimäärin", "Average income"],
  "overview.avgExpenses": ["Kulut keskimäärin", "Average expenses"],
  "overview.perMonth": ["{a} / kk", "{a} / month"],
  "overview.activeMonths": [
    "Kuukausia, joilla on tositteita",
    "Months with vouchers",
  ],

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
    "Yli kymmenkertainen tavalliseen tositteeseen verrattuna. Tarkista desimaalipilkun paikka.",
    "Over ten times a typical voucher. Check where the decimal separator is.",
  ],
  "overview.duplicate": [
    pl("1 mahdollinen kaksoiskirjaus", "{n} mahdollista kaksoiskirjausta"),
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
      "Tavaran omaa käyttöä ilman arvonlisäveroa: 1 tosite",
      "Tavaran omaa käyttöä ilman arvonlisäveroa: {n} tositetta"
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
    "Yli 1 200 euron laite on yleensä kirjattava käyttöomaisuudeksi ja poistettava. Kerralla sen voi vähentää vain, jos käyttöikä on enintään 3 vuotta.",
    "Equipment over 1,200 euros is usually booked as a fixed asset and depreciated. Deducting it at once works only if its useful life is 3 years or less.",
  ],
  "overview.bankEnter": ["Syötä saldo", "Enter the balance"],
  "overview.noSales": ["Ei myyntiä tänä vuonna.", "No sales this year."],
  "overview.billsTitle": ["Laskut maksettavana", "Bills to pay"],
  "overview.billsTotal": ["Yhteensä {s}", "{s} in all"],
  "overview.billsMore": [
    pl("ja 1 muu lasku", "ja {n} muuta laskua"),
    pl("and 1 more bill", "and {n} more bills"),
  ],
  "overview.billsAll": ["Kaikki maksettavat", "All bills to pay"],
  "file.billsOverdue": [
    pl("1 lasku on myöhässä: {s}", "{n} laskua on myöhässä: {s}"),
    pl("1 bill is overdue: {s}", "{n} bills are overdue: {s}"),
  ],
  "file.billsToday": [
    pl("1 lasku erääntyy tänään: {s}", "{n} laskua erääntyy tänään: {s}"),
    pl("1 bill falls due today: {s}", "{n} bills fall due today: {s}"),
  ],
  "file.messagesBills": [
    pl("Viestit, 1 lasku odottaa maksua", "Viestit, {n} laskua odottaa maksua"),
    pl(
      "Messages, 1 bill waiting to be paid",
      "Messages, {n} bills waiting to be paid"
    ),
  ],
  "file.billsOpen": ["Avaa maksettavat", "Open bills to pay"],
  "overview.billsOverdue": [
    pl("1 lasku on myöhässä", "{n} laskua on myöhässä"),
    pl("1 bill is overdue", "{n} bills are overdue"),
  ],
  "overview.billsOverdueSub": [
    "Maksamatta {s}, vanhin eräpäivä {d}.",
    "{s} unpaid, the oldest due on {d}.",
  ],
  "overview.billsDueSoon": [
    pl("1 lasku erääntyy pian", "{n} laskua erääntyy pian"),
    pl("1 bill falls due soon", "{n} bills fall due soon"),
  ],
  "overview.billsDueSoonSub": [
    "Maksettavaa {s}, ensimmäinen eräpäivä {d}.",
    "{s} to pay, the first due on {d}.",
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
    "Valitsemasi ALV-ilmoitusjakso edellyttää, että liikevaihto on enintään {l}. Tarkista verokausi OmaVerosta.",
    "The VAT filing period you chose requires turnover of at most {l}. Check your tax period in MyTax.",
  ],
  "overview.form5Due": [
    "Veroilmoitus (lomake 5) vuodelta {y}",
    "Tax return (Form 5) for {y}",
  ],
  "overview.form5DueOn": [
    "Annettava viimeistään {d}. Tarkista päivä OmaVerosta.",
    "Due by {d}. Check the date in MyTax.",
  ],
  "overview.form5DueUnknown": [
    "Määräpäivä on keväällä. Tarkista se OmaVerosta.",
    "It is due in the spring. Check the date in MyTax.",
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
  "overview.rulesHomeOffice": ["työhuonevähennys", "home office deduction"],
  "overview.rulesIncomeTax": ["veroasteikko", "income tax scale"],
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
  "overview.retentionVouchers": [
    "Vuoden {y} tositteiden säilytysaika on päättynyt",
    "The retention of the {y} vouchers has ended",
  ],
  "overview.retentionVouchersSub": [
    "Tositteet piti säilyttää {v} asti, joten ne saa nyt hävittää. Kirjanpitokirjat (päiväkirja, pääkirja, tilinpäätös) on säilytettävä {b} asti.",
    "The vouchers had to be kept until {v}, so they may now be destroyed. The books (journal, general ledger, financial statements) must be kept until {b}.",
  ],
  "overview.retentionBooks": [
    "Vuoden {y} kirjanpidon säilytysaika on päättynyt",
    "The retention of the {y} books has ended",
  ],
  "overview.retentionBooksSub": [
    "Kirjanpitokirjat piti säilyttää {b} asti, joten vuoden aineiston saa nyt hävittää kokonaan. Sovellus ei poista mitään itse.",
    "The books had to be kept until {b}, so the year's material may now be destroyed entirely. The app deletes nothing by itself.",
  ],
  "overview.retentionNoted": ["Selvä", "Got it"],
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
    "Raja lähestyy. Verovelvollisuus alkaa päivästä, jona {l} ylittyy, joten ilmoittaudu arvonlisäverovelvolliseksi ajoissa.",
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
    "Record your first voucher, or open your earlier books as a CSV or ZIP file. The overview fills in as you go.",
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
    "Viisi askelta ensimmäisestä tositteesta tiedostoon. Esimerkit näyttävät, mitä kenttiin kirjoitetaan. Ne ovat malleja, eivät valmiita tositteita.",
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
    "Esim. Tmi Oma Yritys ja Y-tunnus 0112038-9. Ne näkyvät tuloslaskelman ja kirjojen otsikossa.",
    "E.g. Tmi Oma Yritys and business ID 0112038-9. They show in the heading of the income statement and the books.",
  ],
  "overview.onboardSaleTitle": [
    "Kirjaa ensimmäinen myyntilasku",
    "Record your first sales invoice",
  ],
  "overview.onboardSaleExample": [
    "Esim. Lasku 1001 – Mäkinen Rakennus Oy, 2 510,00 € verollisena, ALV 25,5 %. Kirjaa summa sellaisena kuin se on laskulla.",
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
    "Save the books to a file",
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
    "Tuloslaskelma muodostuu vuoden {y} tositteista. Aloita lisäämällä tosite tai tuomalla tiliote.",
    "The income statement is built from the vouchers of {y}. Add a voucher or import a bank statement to start.",
  ],
  "empty.summaryBody": [
    "Yhteenveto kokoaa vuoden {y} tulot ja kulut. Aloita lisäämällä tosite tai tuomalla tiliote.",
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
    "Hae kuvauksella, luokalla, numerolla tai kuitin tekstillä",
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
  "ledger.bulkEdit": ["Muokkaa valittuja", "Edit selected"],
  "ledger.bulkDate": ["Vaihda päivämäärä", "Change date"],
  "ledger.bulkVat": ["Vaihda ALV-kanta", "Change VAT rate"],
  "ledger.bulkPay": ["Merkitse maksetuksi", "Mark as paid"],
  "ledger.bulkDateLabel": ["Uusi päivämäärä", "New date"],
  "ledger.bulkVatLabel": ["Uusi ALV-kanta", "New VAT rate"],
  "ledger.bulkPayLabel": ["Maksupäivä", "Payment date"],
  "ledger.bulkDateHint": [
    "Päivämäärä pysyy tositteiden omalla tilikaudella, ja jaettu tosite siirtyy kokonaan.",
    "The date stays in the entries' own financial year, and a split receipt moves whole.",
  ],
  "ledger.bulkVatHint": [
    "Kanta vaihtuu jokaiseen valittuun tositteeseen. Summa pysyy, joten bruttona kirjatun veroton osa muuttuu.",
    "Every selected entry takes the rate. The amount stays, so an entry booked gross changes its net part.",
  ],
  "ledger.bulkPayHint": [
    "Jaetun tositteen osat merkitään yhdessä.",
    "The parts of a split receipt are marked together.",
  ],
  "ledger.bulkApply": ["Tallenna", "Apply"],
  "ledger.bulkUndone": ["Muutos kumottu.", "Change undone."],
  "ledger.bulkDateYear": [
    "Päivämäärän on oltava samalla tilikaudella kuin tositteiden.",
    "The date has to be in the same financial year as the entries.",
  ],
  "ledger.bulkVatEu": [
    "EU-ostojen ALV-kanta asetetaan ostolle itselleen, joten niitä ei voi muuttaa tässä.",
    "An EU purchase's rate is set with the purchase itself, so it cannot be changed here.",
  ],
  "ledger.bulkDated": [
    pl(
      "Päivämäärä vaihdettu 1 tositteeseen.",
      "Päivämäärä vaihdettu {n} tositteeseen."
    ),
    pl("Date changed on 1 voucher.", "Date changed on {n} vouchers."),
  ],
  "ledger.bulkVatDone": [
    pl(
      "ALV-kanta vaihdettu 1 tositteeseen.",
      "ALV-kanta vaihdettu {n} tositteeseen."
    ),
    pl("VAT rate changed on 1 voucher.", "VAT rate changed on {n} vouchers."),
  ],
  "ledger.bulkPaid": [
    pl("1 tosite merkitty maksetuksi.", "{n} tositetta merkitty maksetuksi."),
    pl("1 voucher marked as paid.", "{n} vouchers marked as paid."),
  ],
  "ledger.bulkClear": ["Poista valinta", "Clear selection"],
  "ledger.colAccount": ["Tili", "Account"],
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
    "Käteismaksu kirjataan viipymättä ja päivä kerrallaan (kirjanpitolaki 2:4). Kirjanpito huomauttaa, jos käteisellä maksettu tosite kirjataan yli {d} päivää maksun jälkeen. Käteismaksu ei vaikuta pankkitilin arvioon.",
    "A cash payment is booked without delay, day by day (Accounting Act 2:4). The book points it out when a cash voucher is booked more than {d} days after the payment. A cash payment does not move the bank estimate.",
  ],
  "entry.logFieldBuyer": ["Ostajan ALV-numero", "Buyer’s VAT number"],
  "entry.logFieldEuPurchase": ["Vero ilmoitetaan itse", "Self-reported tax"],
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
    "Tuloslaskelman riveillä on täydet summat. Lomake 5 laskee riveillä 319, 321 ja 341 mukaan vain osan.",
    "The income statement’s lines are in full. Form 5 counts part of lines 319, 321 and 341.",
  ],
  "ledger.closingNote": [
    "Jos toiminta loppuu, aineisto säilytetään yhtä kauan. Lopettamisilmoituksessa (Y6-lomake YTJ:ssä) ilmoitetaan, kuka sitä säilyttää ja missä (kirjanpitolaki 2:10).",
    "If the business closes, the material is kept for the same periods. The closure notice (form Y6 in YTJ) names who keeps it and where (Accounting Act 2:10).",
  ],
  "ledger.retention": [
    "Säilytä päiväkirja ja pääkirja vähintään {b} asti (10 vuotta tilikauden päättymisestä) ja tositteet vähintään {v} asti (6 vuotta sen vuoden lopusta, jona tilikausi päättyi). Kirjanpitolaki 2:10.",
    "Keep the journal and the general ledger until at least {b} (10 years from the end of the financial year), and the vouchers until at least {v} (6 years from the end of the year in which it ended). Accounting Act 2:10.",
  ],
  /* The voucher number (tositenumero, §4). */
  "ledger.columns": ["Sarakkeet", "Columns"],
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
  "ledger.filter": ["Suodata", "Filter"],
  "ledger.filterShow": [
    pl("Näytä 1 tosite", "Näytä {n} tositetta"),
    pl("Show 1 voucher", "Show {n} vouchers"),
  ],
  "ledger.allCategories": ["Kaikki luokat", "All categories"],
  "ledger.openItems": ["Avoimet", "Open"],
  "ledger.openPill": ["Avoin", "Open"],
  "ledger.euPill": ["EU-osto", "EU purchase"],
  "ledger.importPill": ["Maahantuonti", "Import"],
  "ledger.reversePill": ["Käännetty ALV", "Reverse charge"],
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
  "ledger.duplicate": ["Mahdollinen kaksoiskirjaus", "Possible duplicate"],
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
    "Tämä tosite on mukana kauden {p} arvonlisäveroilmoituksessa, joka on merkitty ilmoitetuksi {d}. Kirjanpitolaki (2:7) ei salli muuttaa tositetta ilmoituksen jälkeen. Korjaa virhe hyvityksellä (Tee hyvitys). Vain maksupäivän voi vielä merkitä. Jos ilmoitusta ei oikeasti ole annettu, poista merkintä ALV-laskelmasta.",
    "This voucher is on the VAT return for period {p}, marked as filed on {d}. The Accounting Act (2:7) does not allow changing a voucher after a return. Correct it with a credit (Create a credit). Only the payment date can still be set. If the return has not really been filed, remove the mark in the VAT view.",
  ],
  "entry.lockedYear": [
    "Vuosi {p} on merkitty tallessa olevaksi {d}, joten sen tositteet ovat lukittuja. Korjaa virhe hyvityksellä (Tee hyvitys). Vain maksupäivän voi vielä merkitä.",
    "Year {p} was marked as stored on {d}, so its vouchers are locked. Correct it with a credit (Create a credit). Only the payment date can still be set.",
  ],
  "entry.lockedInvoice": [
    "Tosite kuuluu annettuun laskuun {p} (annettu {d}), joten sen summaa, päivää, luokkaa ja verokantaa ei voi muuttaa eikä tositetta poistaa (kirjanpitolaki 2:7). Virhe korjataan hyvityslaskulla Laskut-näkymässä. Vain maksupäivän voi vielä merkitä.",
    "This voucher belongs to issued invoice {p} (issued {d}), so its amount, date, category and VAT rate cannot be changed and it cannot be deleted (Accounting Act 2:7). A mistake is corrected with a credit note in the Invoices view. Only the payment date can still be set.",
  ],
  "entry.lockedForm5Paid": [
    "Tosite on maksettu vuonna {p}, ja sen vuoden veroilmoitus (lomake 5) on merkitty ilmoitetuksi {d}. Ilmoitus luki tositteen maksuvuoden mukaan, joten se on lukittu (kirjanpitolaki 2:7). Korjaa virhe hyvityksellä (Tee hyvitys). Jos ilmoitusta ei oikeasti ole annettu, poista merkintä kohdasta Tuloslaskelma, Lomake 5.",
    "This voucher was paid in {p}, and the tax return (Form 5) for that year was marked as filed on {d}. The return counted it by the year it was paid, so it is locked (Accounting Act 2:7). Correct it with a credit (Create a credit). If the return has not really been filed, remove the mark under Income statement, Form 5.",
  ],
  "entry.lockedForm5": [
    "Vuoden {p} veroilmoitus (lomake 5) on merkitty ilmoitetuksi {d}, joten kaikki sen tositteet ovat lukittuja (kirjanpitolaki 2:7). Korjaa virhe hyvityksellä (Tee hyvitys). Vain maksupäivän voi vielä merkitä, jos se on myöhemmältä vuodelta. Jos ilmoitusta ei oikeasti ole annettu, poista merkintä kohdasta Tuloslaskelma, Lomake 5.",
    "The tax return (Form 5) for {p} was marked as filed on {d}, so all its vouchers are locked (Accounting Act 2:7). Correct it with a credit (Create a credit). Only a payment date in a later year can still be set. If the return has not really been filed, remove the mark under Income statement, Form 5.",
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
    "Tämä vuosi on merkitty tallessa olevaksi. Valitse toinen päivä.",
    "This year is marked as stored. Choose another date.",
  ],
  "entry.correction": ["Tee hyvitys", "Create a credit"],
  "entry.correctionOf": [
    "Hyvitys: tosite {n}, {x}",
    "Credit: voucher {n}, {x}",
  ],
  "entry.creditSettled": [
    "Hyvitys kumosi avoimen tositteen {n}, joten molemmat merkittiin maksetuiksi {d}.",
    "The credit cancels open voucher {n}, so both are marked paid on {d}.",
  ],
  "entry.partyCustomer": ["Asiakas", "Customer"],
  "entry.partySupplier": ["Toimittaja", "Supplier"],
  "entry.partyNoneCustomer": ["Ei asiakasta", "No customer"],
  "entry.partyNoneSupplier": ["Ei toimittajaa", "No supplier"],
  "entry.partySearch": ["Hae nimellä", "Search by name"],
  "entry.partyEmpty": ["Ei osumia", "No matches"],
  "entry.descriptionSuggestions": ["Aiemmat kuvaukset", "Earlier descriptions"],
  "entry.suggestedByHistory": [
    "Ehdotettu: sama kuvaus on kirjattu tähän luokkaan aiemmin.",
    "Suggested: this description was booked to this category before.",
  ],
  "entry.suggestedByRule": [
    "Ehdotettu luokkasäännöstä.",
    "Suggested by a category rule.",
  ],
  "entry.suggestedByParty": [
    "Ehdotettu asiakkaan tai toimittajan oletuksista.",
    "Suggested by the customer's or supplier's defaults.",
  ],
  "entry.partyMore": [
    "{n} muuta, tarkenna hakua",
    "{n} more, narrow the search",
  ],
  "entry.partyInfo": ["Mitä valinta tekee?", "What does picking one do?"],
  "entry.partyHint": [
    "Valinta täyttää asiakkaan tai toimittajan luokan ja verokannan. Asiakkaat ja toimittajat lisätään kohdassa Laskut, Asiakkaat ja toimittajat.",
    "Picking one fills in the customer's or supplier's category and VAT rate. Customers and suppliers are added in Invoices, Customers and suppliers.",
  ],
  "entry.euPurchaseGoods": ["Kyllä, tavara", "Yes, goods"],
  "entry.euPurchaseServices": ["Kyllä, palvelu", "Yes, services"],
  "entry.euPurchaseImport": ["Kyllä, maahantuonti", "Yes, import"],
  "entry.euPurchaseReverse": [
    "Kyllä, käännetty verovelvollisuus",
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
    "Muistuttaa lisäämään samanlaisen tositteen valitulla välillä.",
    "Reminds you to add a similar voucher at the interval you choose.",
  ],
  "entry.paid": ["Maksettu", "Paid"],
  "entry.paidInfo": [
    "Miksi maksupäivää kysytään?",
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
    "Tositteen päivä on toimitus- tai laskupäivä. Arvonlisävero määräytyy sen mukaan.",
    "The voucher’s date is the delivery or invoice date. VAT goes by it.",
  ],
  "entry.period": ["Kattaa ajanjakson", "Covers the period"],
  "entry.periodFrom": ["Jakson ensimmäinen päivä", "First day of the period"],
  "entry.periodTo": ["Jakson viimeinen päivä", "Last day of the period"],
  "entry.periodInfo": ["Mitä jakso tekee?", "What does the period do?"],
  "entry.periodInfoText": [
    "Liikkeenharjoittajan tulos lasketaan suoriteperusteella. Jos kulu tai tulo kattaa useamman vuoden, esimerkiksi marraskuussa maksettu vuoden vakuutus, tulos jakaa verottoman summan vuosille päivien suhteessa. Arvonlisäveroilmoitus ei muutu, se menee edelleen tositteen päivän mukaan. Vähäisen erän voi jättää jaksottamatta (EVL 19 §).",
    "A liikkeenharjoittaja’s result is on accrual basis. When a cost or income covers more than one year, for example a year’s insurance paid in November, the statement splits the amount without VAT across the years by days. The VAT return does not change and still goes by the voucher’s date. An insignificant item can be left unspread (EVL 19 §).",
  ],
  "entry.periodHint": [
    "Täytä vain, kun tosite kattaa vuodenvaihteen yli ulottuvan ajan. Tyhjänä tosite lasketaan tositteen päivälle.",
    "Fill in only when the voucher covers a time across a year-end. Left empty, the voucher counts on its own date.",
  ],
  "entry.periodBad": [
    "Anna jakson molemmat päivät. Loppu ei voi olla ennen alkua.",
    "Give both days of the period. The end cannot be before the start.",
  ],
  "entry.logFieldPeriodFrom": ["Jakso alkaa", "Period starts"],
  "entry.logFieldPeriodTo": ["Jakso päättyy", "Period ends"],
  "entry.due": ["Eräpäivä", "Due date"],
  "entry.iban": ["Saajan tilinumero (IBAN)", "Payee’s account (IBAN)"],
  "entry.reference": ["Viite", "Reference"],
  "entry.ibanBad": [
    "Tilinumero ei ole kelvollinen IBAN. Tarkista se laskusta.",
    "The account number is not a valid IBAN. Check it on the bill.",
  ],
  "entry.referenceBad": [
    "Viite ei ole kelvollinen suomalainen viite tai RF-viite. Tarkista se laskusta.",
    "The reference is not a valid Finnish or RF reference. Check it on the bill.",
  ],
  "entry.barcode": ["Virtuaaliviivakoodi", "Virtual barcode"],
  "entry.barcodeHint": [
    "Liitä laskun 54-numeroinen virtuaaliviivakoodi, niin tilinumero, viite, eräpäivä ja tyhjä summa täyttyvät siitä.",
    "Paste the bill’s 54-digit virtual barcode to fill in the account, the reference, the due date and an empty amount.",
  ],
  "entry.barcodeBad": [
    "Tätä virtuaaliviivakoodia ei voitu lukea. Tarkista, että kaikki 54 numeroa ovat mukana.",
    "This virtual barcode could not be read. Check that all 54 digits are there.",
  ],
  "entry.codeScan": ["Lue koodi liitteestä", "Read the code from the receipt"],
  "entry.codeRead": [
    "Maksutiedot luettiin laskun viivakoodista tai QR-koodista",
    "Payment details read from the bill’s barcode or QR code",
  ],
  "entry.codeNotFound": [
    "Liitteestä ei löytynyt pankkiviivakoodia eikä QR-koodia",
    "No bank barcode or QR code found on the receipt",
  ],
  "entry.barcodeRead": [
    "Maksutiedot luettiin virtuaaliviivakoodista",
    "Payment details read from the virtual barcode",
  ],
  "entry.dueHint": [
    "Laskun eräpäivä. Avoin lasku näkyy Maksettavat-välilehdellä eräpäivän mukaan.",
    "The bill’s due date. An open bill shows under To pay by its due date.",
  ],
  "entry.logFieldDue": ["Eräpäivä", "Due date"],
  "entry.logFieldIban": ["Saajan tilinumero", "Payee’s account"],
  "entry.logFieldReference": ["Viite", "Reference"],
  "entry.logFieldTags": ["Tunnisteet", "Tags"],
  "entry.logFieldAdvance": ["Ennakkomaksu", "Advance payment"],
  "entry.advanceValue": ["Ennakkolasku", "Advance invoice"],
  "ledger.allTags": ["Kaikki tunnisteet", "All tags"],
  "ledger.tagFilter": ["Tunniste", "Tag"],
  "entry.tags": ["Tunnisteet", "Tags"],
  "entry.tagsInfo": ["Mitä tunnisteet ovat?", "What are tags?"],
  "entry.tagsHint": [
    "Vapaita merkintöjä, kuten projekti, työkohde tai tapahtuma. Tositteella voi olla useita. Tunnisteet eivät vaikuta veroihin; Yhteenvedon tunnisteraportti näyttää tulot, menot ja tuloksen tunnisteittain, ja kirjanpidon voi suodattaa tunnisteella.",
    "Free labels such as a project, a job or an event. A voucher can have several. Tags do not affect taxes; the tag report on the summary page shows income, expenses and result per tag, and the ledger can be filtered by tag.",
  ],
  "entry.tagsPlaceholder": [
    "Lisää tunniste ja paina Enter",
    "Add a tag and press Enter",
  ],
  "entry.tagRemove": ["Poista tunniste {tag}", "Remove tag {tag}"],
  "invoice.tagsHint": [
    "Laskun tunnisteet tulevat myyntitositteille, kun lasku lähetetään.",
    "The invoice’s tags go on its sale entries when it is issued.",
  ],
  "entry.restoreAction": ["Palauta tämä versio", "Restore this version"],
  "entry.restoreTitle": ["Palautetaanko tämä versio?", "Restore this version?"],
  "entry.restoreMessage": [
    "Tosite palautetaan sellaiseksi kuin se oli {d}. Myöhemmät muutokset kumotaan, ja tallentamattomat muutokset tässä ikkunassa hylätään. Palautus kirjataan muutoshistoriaan omana muutoksenaan.",
    "The voucher goes back to how it was on {d}. Later changes are undone, and unsaved changes in this window are discarded. The restore is logged as a change of its own.",
  ],
  "entry.restoreKept": [
    "Liitteet ja linkit muihin tositteisiin jäävät ennalleen, koska muutoshistoria tallentaa niistä vain nimen.",
    "Receipts and links to other vouchers stay as they are, since the change log keeps only their names.",
  ],
  "entry.restoreConfirm": ["Palauta", "Restore"],
  "entry.restoreNoCategory": [
    "Versiota ei voi palauttaa, koska sen luokkaa ei enää ole.",
    "The version cannot be restored: its category no longer exists.",
  ],
  "entry.privateUseHint": [
    "Tavaran oma käyttö on arvonlisäverollista, jos ostosta on vähennetty vero, mutta 850 € vuodessa on verotonta. Auton kohdalla asia riippuu siitä, paljonko autosta on vähennetty.",
    "Taking goods into private use carries VAT if the VAT on the purchase was deducted, and the first 850 € a year is free. For a car it depends on how much of the car was deducted.",
  ],
  "entry.payrollHint": [
    "Tämä tosite ei korvaa palkkakirjanpitoa eikä tulorekisteri-ilmoitusta. Hoida ne muualla.",
    "This voucher does not replace payroll records or income register reporting. Handle those elsewhere.",
  ],
  "entry.ownerHint": [
    "Rahan siirto yrityksen ja oman tilisi välillä ei ole tuloa eikä kulua. Se ei vaikuta tulokseen eikä arvonlisäveroon. Liitä tiliote liitteeksi.",
    "Your own money moving between the business and your personal account is neither income nor an expense. It doesn’t affect the result or VAT. Attach the bank statement.",
  ],
  "entry.assetHint": [
    "Ei kulua tuloslaskelmassa. Hankinta ja myynti muodostavat lomakkeen 5 kohdan 704 (Koneet ja kalusto) poistopohjan, ja kulu syntyy poistoina. Katso Tuloslaskelma, Poistot.",
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
    "Lisää tiedosto liitteeksi pudottamalla se tähän",
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
    "Correct the difference on your next return, or file a replacement return for the period in MyTax.",
  ],
  "vat.filedChangeFixReplace": [
    "Anna kaudelle korvaava ilmoitus OmaVerossa.",
    "File a replacement return for the period in MyTax.",
  ],
  "vat.filedChangeSave": ["Tallenna silti", "Save anyway"],
  "vat.overdue": ["Myöhässä", "Overdue"],
  "vat.dueShort": ["Eräp. {d}", "Due {d}"],
  "vat.dueDate": ["Eräpäivä {d}", "Due {d}"],
  "vat.running": ["Kesken", "In progress"],
  "vat.upcoming": ["Tulossa", "Upcoming"],
  "vat.afterEnd": ["Toiminta päättynyt", "Trading stopped"],
  "vat.afterEndHint": [
    "Jakso alkoi vasta, kun toiminta oli päättynyt, joten siitä ei anneta ilmoitusta.",
    "The period began after the business stopped trading, so no return is filed for it.",
  ],
  "vat.finalHint": [
    "Viimeinen ilmoitus: se kattaa ajan {d} asti. Anna se myös, jos jaksolla ei ollut toimintaa.",
    "The last return: it covers up to {d}. File it even if there was no activity in the period.",
  ],
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
    "The day you filed the return in MyTax. Today by default.",
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
    "Copy them from MyTax. They are saved in the book's settings, and the app sends them nowhere.",
  ],
  "vat.payNone": ["Ei tallennettu.", "Not saved."],
  "vat.payCopy": ["Kopioi", "Copy"],
  "vat.downloadPdf": ["Lataa PDF", "Download PDF"],
  "vat.downloadFile": [
    "Lataa Ilmoitin.fi-tiedosto",
    "Download Ilmoitin.fi file",
  ],
  "vat.correctionLabel": [
    "Korvaava ilmoitus: korjauksen syy",
    "Replacement return: reason for the correction",
  ],
  "vat.correctionNone": [
    "Ei korjaus, alkuperäinen ilmoitus",
    "Not a correction, an original return",
  ],
  "vat.correction332": [
    "Laskuvirhe / ilmoituksen täyttövirhe",
    "Calculation or filling-in error",
  ],
  "vat.correction333": [
    "Verotarkastuksessa saatu ohjaus",
    "Guidance given in a tax audit",
  ],
  "vat.correction334": ["Oikeuskäytännön muutos", "Change in case law"],
  "vat.correction335": ["Laintulkintavirhe", "Error in interpreting the law"],
  "vat.correctionHint": [
    "Korvaava ilmoitus antaa kaikki kauden tiedot uudelleen ja korvaa aiemman. Valitse syy vain silloin, kun korjaat jo annettua ilmoitusta.",
    "A replacement return gives all of the period's figures again and replaces the earlier one. Choose a reason only when you are correcting a return already given.",
  ],
  "vat.fileHint": [
    "Lähetä tiedosto itse Ilmoitin.fi-palveluun. Kirjanpito ei lähetä mitään.",
    "You upload the file to Ilmoitin.fi yourself. The app sends nothing.",
  ],
  "vat.fileBlockNotClosed": [
    "Verokausi on vielä kesken.",
    "The tax period has not closed yet.",
  ],
  "vat.fileBlockNoBusinessId": [
    "Lisää Y-tunnus kohdassa Asetukset, Yrityksen tiedot.",
    "Add the business ID under Settings, Business details.",
  ],
  "vat.fileBlockEuUnsplit": [
    "Vanhan luokan Myynti – EU tositteet pitää merkitä tavaroiksi tai palveluiksi.",
    "Vouchers on the old category Sales – EU must be marked as goods or services.",
  ],
  "vat.fileBlockSumMismatch": [
    "Maksettava vero ei täsmää kohtien summaan, esimerkiksi tuntemattoman verokannan takia.",
    "The tax payable does not match the fields, for example because of an unknown tax rate.",
  ],
  "vat.pdfFailed": ["PDF:n luonti epäonnistui.", "Making the PDF failed."],
  "vat.settlementHint": [
    "Kirjanpito ei näe pankkia. Kirjaa maksu tai palautus, kun raha on liikkunut, ja liitä tiliote. Tosite saa tositenumeron, mutta se ei ole tulo eikä kulu eikä muuta ilmoitusta.",
    "The app cannot see your bank. Book the payment or refund once the money has moved, and attach the bank statement. It gets a voucher number, but it is neither income nor an expense and does not change the return.",
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
  "vat.showEmptyRates": [
    "Näytä myös tyhjät verokannat ({x})",
    "Show the empty rates too ({x})",
  ],
  "vat.hideEmptyRates": ["Piilota tyhjät verokannat", "Hide the empty rates"],
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
    "Rakentamispalveluiden ja metalliromun myynti (käännetty verovelvollisuus)",
    "Construction services and scrap metal sales (reverse charge)",
  ],
  "vat.cashNote": [
    "Maksuperuste: kotimaiset myynnit ja ostot ovat tällä kaudella maksupäivänsä mukaan, ja maksamaton myynti tulee mukaan viimeistään 12 kuukauden kuluttua toimituksesta. Maksamattomat ostot odottavat maksua.",
    "Cash basis: domestic sales and purchases are in this period by their payment date, and an unpaid sale is included 12 months after delivery at the latest. Unpaid purchases wait for payment.",
  ],
  "vat.note": [
    "Ostojen 0 %:n tositteet (esim. palkat, YEL, pankkikulut) eivät vaikuta arvonlisäveroon, joten niitä ei näytetä vähennyksissä. Tarkista luvut ennen ilmoittamista OmaVerossa.",
    "Purchases at 0% (e.g. wages, YEL, bank fees) don’t affect VAT, so they aren’t shown as deductions. Check the figures before filing in MyTax.",
  ],
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
    "The app cannot see MyTax. Mark the period as filed once you have sent the return. The mark locks the period’s vouchers, because the Accounting Act (2:7) does not allow changing them after a return.",
  ],
  "vat.returnButton": ["Ilmoita OmaVerossa", "Report in MyTax"],
  "vat.returnViewFiled": ["Näytä ilmoitus", "View return"],
  "vat.returnDialogTitle": ["Arvonlisäveroilmoitus: {p}", "VAT return: {p}"],
  "vat.returnDialogIntro": [
    "Käy läpi tarkistukset, kopioi summat OmaVeroon ja merkitse kausi ilmoitetuksi.",
    "Go through the checks, copy the amounts into MyTax and mark the period as filed.",
  ],
  "vat.returnSteps": ["Vaiheet", "Steps"],
  "vat.returnStepChecks": ["Tarkistukset", "Checks"],
  "vat.returnStepValues": ["Summat", "Amounts"],
  "vat.returnStepFile": ["Merkintä", "Mark"],
  "vat.returnStepGuide": ["OmaVero", "MyTax"],
  "vat.guideIntro": [
    "Ensimmäisen ilmoituksen voi tehdä tämän listan mukaan. Kun olet merkinnyt ensimmäisen kauden ilmoitetuksi, vaihe poistuu.",
    "You can make your first return by following this list. Once you have marked your first period as filed, this step goes away.",
  ],
  "vat.guideLogin": ["Kirjaudu OmaVeroon", "Sign in to MyTax"],
  "vat.guideLoginSub": [
    "Käytä verkkopankkitunnuksia tai mobiilivarmennetta. Toiminimen asiat hoidat omilla tunnuksillasi.",
    "Use your online banking credentials or mobile certificate. You handle a sole trader’s affairs with your own credentials.",
  ],
  "vat.guideStart": ["Aloita arvonlisäveroilmoitus", "Start the VAT return"],
  "vat.guideStartSub": [
    "Valitse kaudeksi {p}. Jos OmaVero ei tarjoa kautta, tarkista, että arvonlisäverovelvollisuutesi on voimassa.",
    "Choose {p} as the period. If MyTax does not offer it, check that your VAT registration is in force.",
  ],
  "vat.guideFill": ["Täytä kohdat", "Fill in the fields"],
  "vat.guideFillSub": [
    "Seuraava vaihe listaa kohdat OmaVeron järjestyksessä. Napsauta summaa ja liitä se samannimiseen kohtaan. Kohdat, joita listassa ei ole, jätä tyhjiksi.",
    "The next step lists the fields in the order MyTax shows them. Click an amount and paste it into the field with the same name. Leave fields that are not in the list empty.",
  ],
  "vat.guideCompare": ["Vertaa maksettavaa veroa", "Compare the tax payable"],
  "vat.guideCompareSub": [
    "OmaVero laskee kohdan 308 itse. Jos se eroaa tämän sovelluksen luvusta, älä lähetä. Etsi ero kohdista ensin.",
    "MyTax works out field 308 itself. If it differs from this app’s figure, do not send. Find the difference in the fields first.",
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
  "statement.sheetTab": ["Laskelma", "Statement"],
  "summary.compareTitle": ["Vertailu vuoteen {y}", "Compared with {y}"],
  "summary.compareIncome": ["Tulot {y}", "Income {y}"],
  "summary.compareExpense": ["Kulut {y}", "Expenses {y}"],
  "summary.compareResult": ["Tulos {y}", "Result {y}"],
  "summary.compareChange": ["Muutos", "Change"],
  "summary.partiesTitle": [
    "Asiakkaat ja toimittajat",
    "Customers and suppliers",
  ],
  "summary.partiesHint": [
    "Vuoden myynti asiakkaittain ja ostot toimittajittain ilman ALV:tä. Tosite lasketaan osapuolelle, joka on valittu tositteella.",
    "The year’s sales per customer and purchases per supplier, without VAT. A voucher counts for the party chosen on it.",
  ],
  "summary.partiesCustomer": ["Asiakas", "Customer"],
  "summary.partiesSupplier": ["Toimittaja", "Supplier"],
  "summary.partiesCount": ["Tositteita", "Vouchers"],
  "summary.partiesSales": ["Myynti", "Sales"],
  "summary.partiesCosts": ["Ostot", "Purchases"],
  "summary.partiesShare": ["Osuus", "Share"],
  "summary.partiesRest": [
    pl("1 muu", "{n} muuta"),
    pl("1 other", "{n} others"),
  ],
  "summary.partiesUnlinked": ["Ei osapuolta", "No party"],
  "summary.partiesNoSales": [
    "Ei myyntiä, jolla on asiakas.",
    "No sales with a customer.",
  ],
  "summary.tagsTitle": ["Tunnisteet", "Tags"],
  "summary.tagsHint": [
    "Vuoden tulot, menot ja tulos tunnisteittain ilman ALV:tä. Tosite, jolla on kaksi tunnistetta, lasketaan kummallekin, joten rivien summa voi poiketa vuoden tuloksesta.",
    "The year’s income, expenses and result per tag, without VAT. A voucher with two tags counts under both, so the lines need not add up to the year’s result.",
  ],
  "summary.tagsTag": ["Tunniste", "Tag"],
  "summary.tagsIncome": ["Tulot", "Income"],
  "summary.tagsExpenses": ["Kulut", "Expenses"],
  "summary.tagsResult": ["Tulos", "Result"],
  "summary.tagsShow": [
    "Näytä tunnisteen {tag} tositteet kirjanpidossa",
    "Show the vouchers tagged {tag} in the ledger",
  ],
  "summary.partiesNoCosts": [
    "Ei ostoja, joilla on toimittaja.",
    "No purchases with a supplier.",
  ],
  "overview.lastYearToDate": [
    "Tulos {y} samaan aikaan",
    "Result {y} to the same date",
  ],
  "overview.lastYearMonth": ["{m} {y}", "{m} {y}"],
  "overview.thisYearMonth": ["(nyt {x})", "(now {x})"],
  "statement.yearEndButton": ["Ilmoita OmaVerossa", "Report in MyTax"],
  "statement.yearEndOpenFiled": ["Vuosi lukittu", "Year locked"],
  "statement.yearEndTitle": [
    "Vuoden {y} ilmoitus OmaVeroon",
    "Reporting {y} in MyTax",
  ],
  "statement.yearEndIntro": [
    "Käy läpi tarkistukset, kopioi summat OmaVeroon ja lukitse vuosi.",
    "Go through the checks, copy the amounts into MyTax and lock the year.",
  ],
  "statement.yearEndSteps": ["Vaiheet", "Steps"],
  "statement.yearEndStepEntries": ["Tositteet", "Vouchers"],
  "statement.yearEndStepVat": ["ALV-ilmoitukset", "VAT returns"],
  "statement.yearEndStepOpen": ["Avoimet ja lainat", "Open and loans"],
  "statement.yearEndStepAssets": ["Käyttöomaisuus", "Fixed assets"],
  "statement.yearEndStepBalance": ["Varat ja velat", "Assets and liabilities"],
  "statement.yearEndProgress": [
    "{n}/{m} aihetta kunnossa. Varoitukset eivät estä lukitsemista, mutta katso ne ennen kuin ilmoitat.",
    "{n} of {m} topics in order. Warnings do not stop the lock, but look at them before you report.",
  ],
  "statement.yearEndTopicClear": ["Ei huomautettavaa.", "Nothing to note."],
  "statement.yearEndTopicEntries": [
    "Vuoden kaikki tositteet on kirjattu, jokaisella on kuitti tai lasku, ja muutokset on tallennettu tiedostoon.",
    "Every voucher of the year is booked, each has its receipt or invoice, and the changes are saved to the file.",
  ],
  "statement.yearEndTopicVat": [
    "Jokainen vuoden ALV-kausi on ilmoitettu OmaVerossa ja merkitty täällä ilmoitetuksi. Vertaa listaa OmaVeron ilmoituksiin.",
    "Every VAT period of the year is filed in MyTax and marked as filed here. Compare the list with the returns in MyTax.",
  ],
  "statement.yearEndTopicOpen": [
    "Mitä oli maksamatta 31.12. Vertaa saatavia ja maksettavia siihen, mitä oikeasti oli auki, ja lainoja pankin lainalaskelmaan.",
    "What was unpaid on 31 December. Compare the receivables and payables with what was really open, and the loans with the bank's loan statement.",
  ],
  "statement.yearEndTopicAssets": [
    "Pitkäikäiset hankinnat ja vuoden poisto. Poisto on enintään 25 % menojäännöksestä (EVL 30 §). Auton yksityiskäyttö lasketaan OmaVerossa.",
    "Long-lived purchases and the year's depreciation. Depreciation is at most 25 % of the undepreciated balance (EVL 30 §). Private use of a car is worked out in MyTax.",
  ],
  "statement.yearEndTopicBalance": [
    "Lomake 5 tarvitsee varat ja velat 31.12, kuten rahavarat ja varaston. Ne kirjoitetaan Varat ja velat -sivulle.",
    "Form 5 needs the assets and liabilities on 31 December, such as cash and stock. They are typed in on the Assets and liabilities page.",
  ],
  "statement.yearEndGoEntries": ["Avaa kirjanpito", "Open bookkeeping"],
  "statement.yearEndGoVat": ["Avaa ALV-laskelma", "Open the VAT return"],
  "statement.yearEndGoOpen": ["Avaa saatavat", "Open receivables"],
  "statement.yearEndGoAssets": ["Avaa poistot", "Open depreciation"],
  "statement.yearEndGoBalance": [
    "Avaa varat ja velat",
    "Open assets and liabilities",
  ],
  "statement.yearEndReceivables": ["Saatavat 31.12.", "Receivables on 31 Dec"],
  "statement.yearEndPayables": ["Maksettavat 31.12.", "Payables on 31 Dec"],
  "statement.yearEndLoans": ["Lainat 31.12.", "Loans on 31 Dec"],
  "statement.yearEndAssetOpening": ["Menojäännös 1.1.", "Balance on 1 Jan"],
  "statement.yearEndAssetAdditions": ["Vuoden hankinnat", "Purchases"],
  "statement.yearEndAssetMaximum": ["Enimmäispoisto", "Most allowed"],
  "statement.yearEndAssetTaken": ["Tehty poisto", "Depreciation taken"],
  "statement.yearEndAssetClosing": ["Menojäännös 31.12.", "Balance on 31 Dec"],
  "statement.yearEndStepValues": ["Summat", "Amounts"],
  "statement.yearEndStepLock": ["Lukitus", "Lock"],
  "statement.yearEndStepPackage": ["Säilytys", "Keep"],
  "statement.yearEndPackageTitle": [
    "Säilytyspaketti {y}",
    "Retention package {y}",
  ],
  "statement.yearEndPackageHint": [
    "Lataa vuoden raportit, kirjanpito ja liitteet yhtenä ZIP-tiedostona säilytettäväksi. Kirjanpitolaki edellyttää aineiston säilyttämistä kymmenen vuotta.",
    "Download the year's reports, books and receipts as one ZIP to keep. The Accounting Act requires the records to be kept for ten years.",
  ],
  "statement.yearEndPackageLockFirst": [
    "Merkitse vuosi ilmoitetuksi ensin, jotta paketti sisältää lopullisen aineiston.",
    "Mark the year as filed first, so the package holds the final records.",
  ],
  "statement.yearEndBack": ["Takaisin", "Back"],
  "statement.yearEndNext": ["Seuraava", "Next"],
  "statement.yearEndOpen": ["Avaa", "Open"],
  "statement.yearEndOngoing": [
    "Vuosi {y} on vielä kesken",
    "{y} is still ongoing",
  ],
  "statement.yearEndOngoingSub": [
    "Vuoden voi lukita vasta, kun se on päättynyt. Summat näkyvät jo nyt.",
    "A year can be locked only once it has ended. The amounts are visible already.",
  ],
  "statement.yearEndNoEntries": [
    "Vuodelta {y} ei ole tositteita",
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
    "MyTax works out field 313 itself from the kilometres and car costs, and the form is not accepted without them. Enter them in MyTax (271, 273, 381 and 396) and check that 313 matches the booked amount.",
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
    pl(
      "1 huomautus on vielä auki. Voit lukita vuoden silti.",
      "{n} huomautusta on vielä auki. Voit lukita vuoden silti."
    ),
    pl(
      "1 flag is still open. You can lock the year anyway.",
      "{n} flags are still open. You can lock the year anyway."
    ),
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
    "Depreciation (337) is deducted up to the maximum on the Depreciation page, so 338 is at most 337. Interest expenses (346) are counted as fully deductible, so 347 is the same amount. If part of the interest is not deductible, change that field in MyTax, and 355 and the result change with it.",
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
    "Once you have filed the return in MyTax, mark it here. That locks every voucher of {y}, because the Accounting Act (2:7) does not allow changing them after a return.",
  ],
  "statement.form5FiledOn": [
    "Merkitty ilmoitetuksi {d}. Vuoden tositteet ovat lukittuja.",
    "Marked as filed on {d}. The year’s vouchers are locked.",
  ],
  "statement.form5Payroll": [
    "Kirjanpito ei sisällä palkkakirjanpitoa eikä tulorekisteri-ilmoituksia.",
    "The app includes no payroll records or income register reporting.",
  ],
  "statement.form5Missing": [
    "Kirjanpito ei täytä julkisesti noteerattujen osuuskuntien ylijäämiä (325, 326), jotka Verohallinnon mukaan puuttuivat vuonna 2026, eikä lomakkeen muita osia, kuten poistoerittelyä ja ajoneuvoja. Ne täytetään OmaVerossa.",
    "The app does not fill surplus from listed co-operatives (325, 326), which the Tax Administration says did not exist in 2026, or the form’s other sections, such as the depreciation breakdown and vehicles. Fill those in MyTax.",
  ],
  "statement.form5Nothing": [
    "Tälle vuodelle ei ole summia, jotka täytetään lomakkeelle.",
    "There are no amounts to enter on the form for this year.",
  ],
  "statement.revenue": ["Tuotot", "Revenue"],
  "statement.expenses": ["Elinkeinotoiminnan kulut", "Business expenses"],
  "statement.profitOrLoss": ["Voitto tai tappio", "Profit or loss"],
  "statement.yearRunning": ["Tilikausi kesken", "Year in progress"],
  "statement.resultFormula": [
    "Tuotot {a} − vähennyskelpoiset kulut {b}",
    "Revenue {a} − deductible expenses {b}",
  ],
  "statement.showEmpty": [
    pl("Näytä myös tyhjä rivi (1)", "Näytä myös tyhjät rivit ({n})"),
    pl("Show the empty line too (1)", "Show the empty lines too ({n})"),
  ],
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
    "Tappio {a} vahvistetaan verotuksessa. Vahvistettu tappio vähennetään elinkeinotoiminnan tuloksesta seuraavien 10 vuoden aikana, vanhin tappio ensin. Verohallinto tekee vähennyksen itse; Tappiot-välilehti seuraa, mitä on jäljellä.",
    "The loss of {a} is confirmed in the tax assessment. A confirmed loss is deducted from business income over the next 10 years, oldest first. Verohallinto makes the deduction itself; the Losses tab follows what is left.",
  ],
  "statement.earlierLossNote": [
    "Verotuksessa tuloksesta vähennetään aiempien vuosien tappioita {a}, vanhin ensin, jolloin verotettavaksi elinkeinotuloksi jää {b}. Verohallinto tekee vähennyksen itse, joten lomakkeelle ilmoitetaan 358 sellaisenaan.",
    "The assessment deducts {a} of earlier years' losses from the result, oldest first, which leaves {b} of taxable business income. Verohallinto makes the deduction itself, so 358 goes on the form as it is.",
  ],
  "overview.lossesLeft": [
    "Aiempia tappioita vähennettävissä {a}.",
    "{a} of earlier losses to deduct.",
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
    "Osuuskuntien ylijäämät {a}, josta veronalaista {b}. Veronalaista on 25 % ensimmäisestä 5 000 eurosta ja 75 % siitä ylittävästä osasta. Huojennuksen saa kerran vuodessa henkilöä kohden, ja se käytetään elinkeinotoimintaan viimeisenä. Jos olet käyttänyt sen jo muussa tulolähteessä, muuta kohtaa 328 OmaVerossa.",
    "Co-operative surplus {a}, of which {b} is taxable. 25% of the first 5,000 euros is taxable and 75% of the rest. The relief is one per person per year and is applied to business income last. If you have used it in another income source, change field 328 in MyTax.",
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
  "recurring.repeat": ["Toista säännöllisesti", "Repeat regularly"],
  "recurring.every": ["Toistuu", "Repeats"],
  "recurring.repeatInfo": [
    "Mitä toistaminen tekee?",
    "What does repeating do?",
  ],
  "recurring.repeatHint": [
    "Tosite jää pohjaksi. Valitse, toistuuko se joka kuukausi vai esimerkiksi neljännesvuosittain (3 kk välein) tai kerran vuodessa (12 kk välein). Mikään ei kirjaudu itsestään: kun kuukaudelta, jolle tosite kuuluu, puuttuu se, Kirjanpito ja Yleiskatsaus muistuttavat siitä, ja voit lisätä sen sieltä. Pohjia voi muokata kohdassa Asetukset, Toistuvat.",
    "The voucher is kept as a template. Choose whether it repeats every month or, say, quarterly (every 3 months) or once a year (every 12 months). Nothing is booked by itself: when a month it belongs to lacks this voucher, the ledger and the overview remind you, and you can add it from there. You can edit templates in Settings, Recurring.",
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
    "Pohja syntyy, kun valitset tositteessa ”Toista säännöllisesti”. Pohja toistuu joka kuukausi tai valitun kuukausimäärän välein alkukuukaudesta lukien. Mikään ei kirjaudu itsestään: tositteet lisätään Kirjanpito-näkymästä. Pohjan muutos tai poisto ei muuta jo tehtyjä tositteita.",
    "A template is made when you choose “Repeat regularly” on a voucher. It repeats every month, or every so many months counted from its first month. Nothing is booked by itself: you add the vouchers in the ledger. Changing or deleting a template leaves existing vouchers as they are.",
  ],
  "recurring.empty": [
    "Ei toistuvia tositteita. Tee ensimmäinen tositteen lomakkeella valitsemalla Toista säännöllisesti.",
    "No recurring vouchers. Make the first one in the voucher form by ticking Repeat regularly.",
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
    "Varat ja velat ratkaisevat, kuinka suuri osa tuloksesta on pääomatuloa. Ilmoita ne OmaVerossa tilikauden lopun tilanteen mukaan.",
    "Assets and liabilities decide how much of the profit counts as capital income. Enter them in MyTax as they stood at the end of the financial year.",
  ],
  "balance.notBank": [
    "Pankkitalletukset eivät kuulu näihin kohtiin.",
    "Bank deposits are in none of these fields.",
  ],
  "balance.missing": [
    "Kiinteistöjä (703) ja arvopapereita (705, 745) kirjanpito ei täytä, koska ne eritellään lomakkeilla 18B ja 8B. Oikaistu negatiivinen oma pääoma (747) täytetään OmaVerossa. Jos sinulla on näitä, kohdat 718, 725 ja nettovarallisuus ovat OmaVerossa eri summat kuin tässä.",
    "The app does not fill real estate (703) or securities (705, 745), which are itemised on Forms 18B and 8B. Adjusted negative equity (747) is entered in MyTax. If you have any of these, fields 718 and 725 and the net worth differ in MyTax from the amounts here.",
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
    "The app cannot know these, so enter them here. An empty field is zero. They are saved in the bookkeeping file, and you copy them into MyTax from the Form 5 tab.",
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
    "The part of the business loans that falls due in the next 12 months. The app works out the loans in full from the vouchers, and this amount moves from non-current to current.",
  ],
  "balance.otherCurrentDebtHelp": [
    "Vuoden sisällä maksettavat velat, jotka eivät ole ostovelkoja tai lainoja. Avoimet ostolaskut tulevat tositteista, joten niitä ei kirjoiteta tähän.",
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
    "Ei sisällä tositteista laskettuja lukuja",
    "Excludes what the vouchers add",
  ],
  "balance.locked": ["Lukittu", "Locked"],
  "balance.stockOpening": ["Varasto vuoden alussa", "Stock at start of year"],
  "balance.stockClosing": ["Varasto vuoden lopussa", "Stock at end of year"],
  "balance.stockCost": ["Kirjattava kulu", "Cost to book"],
  "assets.tab": ["Poistot", "Depreciation"],
  "assets.title": ["Koneet ja kalusto {y}", "Machinery and equipment {y}"],
  "assets.intro": [
    "Yli kolme vuotta käytettävä tai yli 1 200 euron hankinta kirjataan luokkaan ”Koneiden ja kaluston hankinta”. Sen arvonlisävero tulee ALV-ilmoitukselle, mutta kulu vähennetään poistoina. Poisto on enintään 25 % menojäännöksestä, ja 1 200 euron tai pienemmän menojäännöksen voi poistaa kerralla.",
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
    "Myyntihinta on {x} suurempi kuin menojäännös. Ylimenevä osa on veronalaista tuloa, joten kirjaa se myös tuloksi.",
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
    "Hankintatositteet vuoden {y} loppuun asti ja niihin linkitetyt myyntitositteet. Luettelo on muistiinpano: vero lasketaan edelleen yhtenä poistopohjana.",
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
  "assets.calculation": ["Poistopohjan laskenta", "How the base is worked out"],
  "assets.openingTitle": ["Aloitussaldo", "Opening balance"],
  "assets.openingHint": [
    "Jos sinulla on omaisuutta ajalta ennen tätä kirjanpitoa, anna sen menojäännös vuoden {y} alussa. Luku on edellisen vuoden poistoerittelyssä (lomake 62).",
    "If you have assets from before these books, enter their balance at the start of {y}. The figure is on last year’s depreciation schedule (form 62).",
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
  "palette.title": ["Komentopaletti", "Command palette"],
  "palette.description": [
    "Hae toimintoa, sivua, tositetta, laskua tai asiakasta. Valitse nuolinäppäimillä ja Enterillä.",
    "Find an action, a page, an entry, an invoice or a customer. Pick with the arrow keys and Enter.",
  ],
  "palette.open": ["Hae (komentopaletti)", "Search (command palette)"],
  "palette.placeholder": [
    "Hae toimintoa, sivua, tositetta, laskua tai asiakasta…",
    "Find an action, page, entry, invoice or customer…",
  ],
  "palette.placeholderShort": ["Hae…", "Search…"],
  "palette.none": ["Ei osumia.", "Nothing found."],
  "palette.actions": ["Toiminnot", "Actions"],
  "palette.pages": ["Sivut", "Pages"],
  "palette.entries": ["Tositteet", "Entries"],
  "palette.invoices": ["Laskut", "Invoices"],
  "palette.parties": ["Asiakkaat ja toimittajat", "Customers and suppliers"],
  "palette.newEntry": ["Uusi tosite", "New entry"],
  "palette.newInvoice": ["Uusi lasku", "New invoice"],
  "palette.openFile": ["Avaa tiedosto", "Open file"],
  "palette.save": ["Tallenna tiedostoon", "Save to file"],
  "palette.export": ["Lataa kopio", "Download a copy"],
  "palette.checkBook": ["Tarkista kirjanpito", "Check the books"],
  "palette.yearEnd": ["Tilinpäätös", "Year-end"],
  "palette.shortcuts": ["Pikanäppäimet", "Keyboard shortcuts"],
  "palette.noDescription": ["(ei kuvausta)", "(no description)"],
  "palette.draft": ["Luonnos – {c}", "Draft – {c}"],
  "palette.invoice": ["Lasku {n} – {c}", "Invoice {n} – {c}"],
  "palette.shortcutsTitle": ["Pikanäppäimet", "Keyboard shortcuts"],
  "palette.shortcutsDescription": [
    "Kirjaimet toimivat, kun kirjoitus ei ole menossa mihinkään kenttään.",
    "Single letters work when you are not typing into a field.",
  ],
  "palette.keyPalette": ["Komentopaletti", "Command palette"],
  "palette.keyNewEntry": ["Uusi tosite", "New entry"],
  "palette.keyShortcuts": ["Tämä luettelo", "This list"],
  "palette.keyOpen": ["Avaa tiedosto", "Open file"],
  "palette.keySave": ["Tallenna tiedostoon", "Save to file"],
  "palette.keyExport": ["Lataa kopio", "Download a copy"],
  "palette.keyUndo": ["Kumoa", "Undo"],
  "palette.keyRedo": ["Tee uudelleen", "Redo"],
  "palette.keySidebar": [
    "Näytä tai piilota sivupalkki",
    "Show or hide the sidebar",
  ],
  "palette.keySubmit": [
    "Tallenna tosite ikkunassa",
    "Save the entry in its dialog",
  ],
  "palette.keyClose": ["Sulje ikkuna", "Close a dialog"],
  "losses.tab": ["Tappiot", "Losses"],
  "losses.title": ["Vahvistetut tappiot", "Confirmed losses"],
  "losses.description": [
    "Elinkeinotoiminnan tappio vähennetään seuraavien {n} vuoden voitoista, vanhin ensin (TVL 119 §). Verohallinto tekee vähennyksen itse; kirjoita tähän verotuspäätöksessä vahvistettu tappio, niin sovellus seuraa, mitä on jäljellä. Tyhjä kenttä käyttää kirjanpidon lukua.",
    "A business loss is deducted from the profits of the next {n} years, oldest first (Finnish Income Tax Act, section 119). Verohallinto makes the deduction itself; type the loss confirmed in the tax decision here and the app follows what is left. An empty field uses the book's figure.",
  ],
  "losses.none": [
    "Kirjanpidossa ei ole tappiollisia vuosia. Jos tappioita on vahvistettu ennen kirjanpidon alkua, lisää ne alla.",
    "The book has no loss years. If losses were confirmed before the book began, add them below.",
  ],
  "losses.year": ["Vuosi", "Year"],
  "losses.book": ["Kirjanpidon tappio", "Loss in the book"],
  "losses.confirmed": ["Vahvistettu", "Confirmed"],
  "losses.confirmedFor": [
    "Vuoden {y} vahvistettu tappio",
    "Confirmed loss of {y}",
  ],
  "losses.used": ["Vähennetty", "Deducted"],
  "losses.remaining": ["Jäljellä", "Left"],
  "losses.lastYear": ["Viimeinen vähennysvuosi", "Last year to deduct"],
  "losses.expired": ["Vanhentui {a}", "{a} expired"],
  "losses.remove": ["Poista vuoden {y} tappio", "Remove the loss of {y}"],
  "losses.deducted": ["Vähennetään vuonna {y}", "Deducted in {y}"],
  "losses.deductedHint": [
    "Aiempien vuosien tappiot, jotka vuoden voitto kattaa. Verohallinto vähentää ne verotuksessa, ei veroilmoituksella.",
    "The earlier losses the year's profit covers. Verohallinto deducts them in the assessment, not on the return.",
  ],
  "losses.taxable": [
    "Verotettava elinkeinotulo {a}",
    "Taxable business income {a}",
  ],
  "losses.noProfit": [
    "Vuosi ei ole voitollinen, joten tappioita ei vähennetä.",
    "The year has no profit, so no loss is deducted.",
  ],
  "losses.left": ["Jäljellä vuoden {y} jälkeen", "Left after {y}"],
  "losses.expiring": ["Vanhenee vuonna {y}", "Runs out in {y}"],
  "losses.earlierYear": ["Aiempi vuosi", "Earlier year"],
  "losses.earlierAmount": ["Vahvistettu tappio", "Confirmed loss"],
  "losses.addEarlier": ["Lisää tappio", "Add loss"],
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
  "deductions.calculatorsTitle": ["Laske ja kirjaa", "Calculate and book"],
  "deductions.bookedSoFar": [
    pl("Kirjattu {s}, 1 tosite", "Kirjattu {s}, {n} tositetta"),
    pl("{s} booked, 1 voucher", "{s} booked, {n} vouchers"),
  ],
  "deductions.kmTimesRate": ["{k} km × {r}", "{k} km × {r}"],
  "deductions.lessCarCosts": [
    "− jo kirjatut autokulut",
    "− car costs already booked",
  ],
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
    "Koneiden ja kaluston poisto on enintään 25 % poistopohjasta, ja enintään 1 200 euron poistopohjan voi poistaa kokonaan (elinkeinoverolaki 30 §). Hankinnat ja myynnit ovat omina tositteinaan tilillä 1161.",
    "Depreciation of machinery and equipment is at most 25% of the base, and a base of €1,200 or less can be written off in full (Business Income Tax Act 30 §). Purchases and sales are vouchers of their own on account 1161.",
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

  "settings.general": ["Yleiset", "General"],
  /* The dialog a new bookkeeping opens with (§8.3). */
  "settings.setupTitle": ["Uusi kirjanpito", "New books"],
  "settings.setupIntro": [
    "Valitse kirjanpidon asetukset. Voit muuttaa niitä myöhemmin asetuksissa.",
    "Choose the settings for these books. You can change them later in Settings.",
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
    "Käytän autoa yritystoiminnassa (ajoneuvokulut, kilometrivähennys)",
    "I use a car for the business (vehicle costs, mileage)",
  ],
  "settings.featureHomeOffice": [
    "Teen töitä kotona (työhuonevähennys)",
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
    pl("1 numero epäjärjestyksessä", "{n} numeroa epäjärjestyksessä"),
    pl("1 number to renumber", "{n} numbers to renumber"),
  ],
  "settings.vouchersYear": ["Vuosi {year}", "Year {year}"],
  "settings.renumberShort": ["Numeroi", "Renumber"],
  "settings.business": ["Yrityksen tiedot", "Business details"],
  "settings.businessHint": [
    "Nimi ja Y-tunnus näkyvät tuloslaskelman, päiväkirjan, pääkirjan ja tililuettelon otsikossa ja tallentuvat tiedostoon.",
    "The name and business ID show in the heading of the income statement, journal, general ledger and account list, and are saved in the file.",
  ],
  "settings.businessName": ["Yrityksen nimi", "Business name"],
  "settings.businessPhone": [
    "Puhelinnumero (ALV-tiedostoon)",
    "Phone number (for the VAT file)",
  ],
  "settings.businessIdInvalid": [
    "Tarkista Y-tunnus, esim. 1234567-1.",
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
  "settings.vatCash": ["ALV:n tilitysperuste", "VAT accounting basis"],
  "settings.vatCashOff": [
    "Suorite- tai laskutusperuste",
    "Delivery or invoice basis",
  ],
  "settings.vatCashOn": ["Maksuperuste", "Cash basis"],
  "settings.vatCashHint": [
    "Maksuperusteella myynnin ALV ilmoitetaan maksukuukauden kaudella ja oston ALV vähennetään, kun lasku on maksettu. Käytettävissä, kun liikevaihto on enintään 500 000 € vuodessa. Koskee vain kotimaisia myyntejä ja ostoja.",
    "On cash basis a sale's VAT is reported in the period of the month it is paid, and a purchase's VAT is deducted once the bill is paid. Allowed while turnover is at most 500 000 € a year. Covers domestic sales and purchases only.",
  ],
  "settings.vatCashFrom": ["Alkaen", "From"],
  "settings.vatCashFromYear": ["Alkamisvuosi", "From year"],
  "settings.vatCashTo": ["Päättyen", "Until"],
  "settings.vatCashToYear": ["Päättymisvuosi", "Until year"],
  "settings.vatCashToNone": ["Käytössä edelleen", "Still in use"],
  "settings.vatCashFromValue": [
    "Maksuperuste {m} alkaen",
    "Cash basis from {m}",
  ],
  "settings.vatCashRangeValue": ["Maksuperuste {m}–{n}", "Cash basis {m}–{n}"],
  "settings.vatCashNote": [
    "Maksamaton myynti ilmoitetaan viimeistään 12 kuukauden kuluttua",
    "An unpaid sale is reported after 12 months at the latest",
  ],
  "settings.bookEnd": ["Toiminnan päättyminen", "Stopping trading"],
  "settings.bookEndHint": [
    "Kuukausi, jona ALV-rekisteröinti päättyi. Sen verokauden ilmoitus on viimeinen, eikä myöhemmiltä jaksoilta odoteta ilmoitusta. Kalenterivuoden verokausi päättyy tähän kuukauteen, ja ilmoitus on annettava seuraavan toisen kuukauden 12. päivään mennessä.",
    "The month VAT registration ended. The return for its tax period is the last, and no return is expected for later periods. A calendar-year tax period ends with this month, and its return is due by the 12th of the second month after it.",
  ],
  "settings.bookEndMonth": ["Päättymiskuukausi", "Last month"],
  "settings.bookEndYear": ["Päättymisvuosi", "Last year"],
  "settings.bookEndNone": ["Toiminta jatkuu", "Still trading"],
  "settings.bookEndNote": [
    "Viimeinen ALV-ilmoitus tältä kuulta",
    "The last VAT return covers this month",
  ],
  "settings.saving": ["Tallennus", "Saving"],
  "settings.autosave": ["Tallenna automaattisesti", "Save automatically"],
  "settings.autosaveHint": [
    "Kirjanpito tallentuu avattuun tiedostoon muutama sekunti jokaisen muutoksen jälkeen. Poiston ja tositteen muokkauksen voi kumota ilmoituksesta 10 sekunnin ajan, ja palautus tallentuu samalla tavalla. Tiedostoon ei jää aiempia versioita. Jos selain pyytää lupaa, tallennus odottaa, kunnes tallennat kerran itse.",
    "The books are saved to the opened file a few seconds after each change. You can undo a delete or a voucher edit from its notification for 10 seconds, and the restored voucher is saved the same way. The file keeps no earlier versions. If the browser would have to ask anything, autosave waits until you save once yourself.",
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
    "Jos unohdat salasanan, tiedostoa ei voi avata, eikä salasanaa voi palauttaa. Tallenna se salasanaohjelmaan.",
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
    "Sääntö valitsee luokan ja verokannan, kun teksti esiintyy tiliotteen rivillä tai laskussa, kun vastapuolen tilinumero on sama tai kun viite alkaa annetuilla merkeillä. Ensimmäinen osuva sääntö voittaa, joten järjestyksellä on väliä. Säännöt ohittavat tositehistorian ja arvauksen. Ne eivät muuta jo kirjattuja tositteita.",
    "A rule picks the category and VAT rate when its text appears in a bank statement row or an invoice, when the other party's account is the same, or when the reference starts with the given characters. The first matching rule wins, so the order matters. Rules come before the voucher history and the guesses. They do not change vouchers already booked.",
  ],
  "settings.rulesContains": ["Etsittävä", "Look for"],
  "settings.rulesField": ["Mistä etsitään", "Match on"],
  "settings.rulesFieldText": ["Teksti sisältää", "Text contains"],
  "settings.rulesFieldIban": ["Tilinumero on", "Account (IBAN) is"],
  "settings.rulesFieldReference": ["Viite alkaa", "Reference starts with"],
  "settings.rulesPlaceholderIban": [
    "FI00 1234 5600 0007 85",
    "FI00 1234 5600 0007 85",
  ],
  "settings.rulesPlaceholderReference": ["Esim. 1234", "E.g. 1234"],
  "settings.rulesIbanError": [
    "Tilinumero ei ole kelvollinen IBAN.",
    "The account is not a valid IBAN.",
  ],
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
  "settings.vatRowReverse": ["Käännetty verovelvollisuus", "Reverse charge"],
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
  "settings.catLabels": ["Luokkien nimet", "Category names"],
  "settings.showAccounts": [
    "Näytä tilinumero luokan nimen edessä",
    "Show the account number before the category name",
  ],
  "settings.showAccountsHint": [
    "Esimerkiksi ”333 Ostot” tai pelkkä ”Ostot” valikoissa ja listoissa. Tuloslaskelma ja muut raportit näyttävät tilinumerot aina.",
    "For example “333 Purchases” or just “Purchases” in menus and lists. The income statement and other reports always show account numbers.",
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
  "settings.deleteBook": ["Poista kirjanpito", "Delete books"],
  "settings.bookDeleted": ["Kirjanpito poistettu.", "Books deleted."],
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
      " Yksi jaetun kuitin osa jäi ilman muita osia, joten se on nyt tavallinen tosite.",
      " {n} jaetun kuitin osaa jäi ilman muita osia, joten ne ovat nyt tavallisia tositteita."
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
  "entry.logFieldSells": ["Myyty hankinta", "Sells purchase"],
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
    "Hyvitys, hyvityslasku tai oikaisu osoittaa tositteeseen, jonka se kumoaa. Linkki ei muuta laskelmia, joten kirjaa hyvitys silti omana rivinään oikealla summalla ja päivämäärällä. Kumpikin tosite näyttää toisensa. Kun uusi hyvitys kumoaa avoimen tositteen kokonaan, molemmat merkitään maksetuiksi hyvityksen päivänä.",
    "A refund, credit note or correction points at the voucher it reverses. The link changes no calculation, so still book the refund as its own row with the right amount and date. Each voucher shows the other. When a new credit cancels an open voucher in full, both are marked paid on the credit's date.",
  ],
  "entry.reversesNone": ["Ei linkkiä", "No link"],
  "entry.reversesSearch": [
    "Hae numerolla, kuvauksella, päivällä tai summalla",
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
    "The file's checksum does not match. {parts} The books were opened as they are. If you made the change on purpose, save the file to update the checksum. Otherwise check the figures.",
  ],
  "io.editedEntries": [
    "Tositteita (CSV) on muutettu.",
    "The entries (CSV) were changed.",
  ],
  "io.editedSettings": [
    "Asetuksia (settings.json) on muutettu.",
    "The settings (settings.json) were changed.",
  ],
  "io.editedInvoices": [
    "Laskuja (invoices.json) on muutettu.",
    "The invoices (invoices.json) were changed.",
  ],
  "io.editedCustomers": [
    "Asiakasrekisteriä (customers.json) on muutettu.",
    "The customer register (customers.json) was changed.",
  ],
  "io.editedInventory": [
    "Varastolaskentaa (inventory.json) on muutettu.",
    "The stocktake (inventory.json) was changed.",
  ],
  "invoice.problemNoRows": [
    "Laskulla ei ole rivejä.",
    "The invoice has no rows.",
  ],
  "invoice.problemBadRow": [
    "Jokaisella rivillä pitää olla kuvaus, positiivinen määrä ja hinta, ja alennus voi olla 0–100 %.",
    "Every row needs a description, a positive quantity and a price, and a discount from 0 to 100 %.",
  ],
  "invoice.problemNoCustomer": [
    "Laskulta puuttuu asiakkaan nimi.",
    "The customer's name is missing.",
  ],
  "invoice.problemCustomerAddress": [
    "Laskulta puuttuu asiakkaan katuosoite tai postitoimipaikka.",
    "The customer's street address or city is missing.",
  ],
  "invoice.problemSellerName": [
    "Lisää yrityksen nimi asetuksiin.",
    "Add the business name in settings.",
  ],
  "invoice.problemSellerId": [
    "Lisää yrityksen Y-tunnus asetuksiin.",
    "Add the business ID in settings.",
  ],
  "invoice.problemSellerAddress": [
    "Lisää yrityksen osoite laskutusasetuksiin.",
    "Add the business address in the invoice settings.",
  ],
  "invoice.problemSellerIban": [
    "Lisää tilinumero (IBAN) laskutusasetuksiin.",
    "Add the account number (IBAN) in the invoice settings.",
  ],
  "invoice.problemBadCategory": [
    "Laskun rivillä on luokka, jota ei voi käyttää myyntilaskulla. Käytä myyntiluokkaa, esimerkiksi Myynti – Suomi.",
    "A row uses a category that cannot be used on a sales invoice. Use a sales category, such as Sales – Finland.",
  ],
  "invoice.settingsVatRegistered": [
    "Yritys on arvonlisäverorekisterissä",
    "The business is in the VAT register",
  ],
  "invoice.settingsVatRegisteredHint": [
    "Laskuilla näkyy ALV-numero ja arvonlisävero. EU-myynnin, EU:n ulkopuolelle myynnin ja käännetyn verovelvollisuuden laskuille tulostuu lain vaatima merkintä.",
    "Invoices show the VAT number and VAT. Invoices for EU sales, sales outside the EU and reverse charge carry the note the law asks for.",
  ],
  "invoice.settingsVatUnregisteredHint": [
    "Laskuilla ei näy arvonlisäveroa, ja niihin tulostuu merkintä vähäisestä toiminnasta (AVL 3 §). Jo annetut laskut säilyvät ennallaan.",
    "Invoices show no VAT and carry a note that the business is small-scale (Finnish VAT Act, section 3). Invoices already issued stay as they are.",
  ],
  "invoice.vatNotes": [
    "Laskulle tulostuva ALV-merkintä",
    "VAT note printed on the invoice",
  ],
  "invoice.problemZeroRateVat": [
    "EU-myynnin, EU:n ulkopuolelle myynnin ja käännetyn verovelvollisuuden riveillä ALV on 0 %.",
    "Rows for EU sales, sales outside the EU and reverse charge carry 0 % VAT.",
  ],
  "invoice.problemVatUnregistered": [
    "Yritys ei ole ALV-rekisterissä, joten laskun riveillä ALV on 0 % ja luokkana kotimaan myynti. Muuta tätä laskutusasetuksista, jos yritys on rekisterissä.",
    "The business is not in the VAT register, so every row has 0 % VAT and a domestic sales category. Change this in the invoice settings if the business is registered.",
  ],
  "invoice.problemBuyerVatId": [
    "EU-myynti ja käännetty verovelvollisuus vaativat asiakkaan ALV-numeron.",
    "An EU sale or a reverse-charge sale needs the customer's VAT number.",
  ],
  "invoice.problemBuyerCountry": [
    "Myynti ulkomaille vaatii asiakkaan, jonka maa ei ole Suomi.",
    "A sale abroad needs a customer whose country is not Finland.",
  ],
  "invoice.problemNoTotal": [
    "Laskun loppusumma on nolla.",
    "The invoice total is zero.",
  ],
  "invoice.problemDueBeforeDate": [
    "Eräpäivä on ennen laskun päivämäärää.",
    "The due date is before the invoice date.",
  ],
  "invoice.issued": ["Lasku {n} annettu", "Invoice {n} issued"],
  "invoice.issueUndone": [
    "Laskun antaminen peruttu",
    "Issuing the invoice was undone",
  ],
  "invoice.pdfFailed": [
    "Laskun PDF:ää ei voitu tallentaa, joten tositteet kirjattiin ilman liitettä.",
    "The invoice PDF could not be stored, so the vouchers were booked without an attachment.",
  ],
  "nav.sales": ["Myyntilaskut", "Sales invoices"],
  "nav.purchases": ["Ostolaskut", "Bills to pay"],
  "nav.overdueBills": [
    pl("1 lasku myöhässä", "{n} laskua myöhässä"),
    pl("1 bill overdue", "{n} bills overdue"),
  ],
  "payables.subtitle": [
    "Saadut laskut, joita ei ole vielä maksettu, eräpäivän mukaan.",
    "Bills received and not yet paid, by due date.",
  ],
  "invoice.subtitle": [
    "Tee myyntilaskuja. Annettu lasku kirjautuu avoimena tulona ja merkitään maksetuksi, kun maksu tulee.",
    "Make sales invoices. An issued invoice books as open income and closes when it is paid.",
  ],
  "invoice.tabInvoices": ["Laskut", "Invoices"],
  "invoice.new": ["Uusi lasku", "New invoice"],
  "invoice.empty": ["Ei vielä laskuja.", "No invoices yet."],
  "invoice.emptyHint": [
    "Tee ensimmäinen lasku. Ennen sitä lisää yrityksen osoite ja tilinumero Asetusten Laskutus-välilehdellä.",
    "Make your first invoice. Before that, add the business address and account number under Invoicing in settings.",
  ],
  "invoice.colNumber": ["Nro", "No."],
  "invoice.colCustomer": ["Asiakas", "Customer"],
  "invoice.colDate": ["Päivämäärä", "Date"],
  "invoice.colDue": ["Eräpäivä", "Due"],
  "invoice.colAmount": ["Summa", "Amount"],
  "invoice.colStatus": ["Tila", "Status"],
  "invoice.statusDraft": ["Luonnos", "Draft"],
  "invoice.statusOpen": ["Avoin", "Open"],
  "invoice.statusOverdue": ["Erääntynyt", "Overdue"],
  "invoice.statusPaid": ["Maksettu", "Paid"],
  "invoice.open": ["Avaa", "Open"],
  "invoice.view": ["Näytä", "View"],
  "invoice.download": ["Lataa PDF", "Download PDF"],
  "invoice.markPaid": ["Merkitse maksetuksi", "Mark as paid"],
  "invoice.paidOn": ["Maksupäivä", "Paid on"],
  "invoice.paidMarked": [
    "Lasku {n} merkitty maksetuksi",
    "Invoice {n} marked as paid",
  ],
  "invoice.pdfDownloadFailed": [
    "Laskun PDF:ää ei voitu luoda.",
    "The invoice PDF could not be made.",
  ],
  "invoice.deleteDraft": ["Poista luonnos", "Delete draft"],
  "invoice.reopenIssued": ["Avaa muokattavaksi", "Reopen to edit"],
  "invoice.reopenCredited": [
    "Hyvityslaskua tai hyvitettyä laskua ei voi avata muokattavaksi. Korjaa se uudella hyvityksellä.",
    "A credit note, or an invoice that has been credited, cannot be reopened. Correct it with a new credit note instead.",
  ],
  "invoice.reopenConfirmTitle": [
    "Avataanko lasku {n} muokattavaksi?",
    "Reopen invoice {n} to edit?",
  ],
  "invoice.reopenConfirmMessage": [
    "Laskun tositteet poistetaan kirjanpidosta ja lasku muuttuu luonnokseksi, joka säilyttää numeronsa. Kun annat sen uudelleen, se saa saman numeron ja uudet tositteet. Jos olet jo lähettänyt laskun, asiakkaalla on vanha versio. Avaamisen voi kumota.",
    "The invoice's vouchers are removed from the books and it becomes a draft that keeps its number. When you issue it again it takes the same number and new vouchers. If you have already sent it, the customer holds the old version. You can undo this.",
  ],
  "invoice.reopenConfirm": ["Avaa muokattavaksi", "Reopen"],
  "invoice.reopened": [
    "Lasku {n} on nyt luonnos",
    "Invoice {n} is now a draft",
  ],
  "invoice.reopenUndone": [
    "Laskun avaaminen peruttu",
    "Reopening the invoice was undone",
  ],
  "invoice.reopenUndoChanged": [
    "Luonnosta on muutettu, joten avaamista ei voi kumota tästä.",
    "The draft has been changed since, so the reopening cannot be undone from here.",
  ],
  "invoice.reopenedTitle": [
    "Lasku {n} – muokattavana",
    "Invoice {n} – being edited",
  ],
  "invoice.deleteIssued": ["Poista lasku", "Delete invoice"],
  "invoice.deleteCredited": [
    "Hyvityslaskua tai hyvitettyä laskua ei voi poistaa. Poista ensin hyvityslasku tai korjaa uudella hyvityksellä.",
    "A credit note, or an invoice that has been credited, cannot be deleted. Correct it with a new credit note instead.",
  ],
  "invoice.deleteConfirmTitle": [
    "Poistetaanko lasku {n}?",
    "Delete invoice {n}?",
  ],
  "invoice.deleteConfirmMessage": [
    "Lasku ja sen tositteet poistetaan. Laskun numeroa ei käytetä uudelleen, joten numerosarjaan jää aukko, ellei lasku ole uusin. Poiston voi kumota.",
    "The invoice and its vouchers are removed. The number is not reused, so the series gets a gap unless this is the newest invoice. You can undo this.",
  ],
  "invoice.deleteConfirm": ["Poista lasku", "Delete invoice"],
  "invoice.deleted": ["Lasku {n} poistettu", "Invoice {n} deleted"],
  "invoice.deleteUndone": [
    "Laskun poisto peruttu",
    "Deleting the invoice was undone",
  ],
  "invoice.draftDeleted": ["Luonnos poistettu", "Draft deleted"],
  "invoice.draftSaved": ["Luonnos tallennettu", "Draft saved"],
  "invoice.draftTitle": ["Laskun luonnos", "Invoice draft"],
  "invoice.viewTitle": ["Lasku {n}", "Invoice {n}"],
  "invoice.customer": ["Asiakas", "Customer"],
  "invoice.customerPick": ["Asiakasrekisteristä", "From the register"],
  "invoice.customerSearch": [
    "Hae asiakasrekisteristä tai täytä tiedot alle",
    "Search the customer register or fill in the details below",
  ],
  "invoice.customerNone": [
    "Yksikään asiakas ei vastaa hakua.",
    "No customer matches.",
  ],
  "invoice.customerClear": ["Tyhjennä asiakkaan valinta", "Clear the customer"],
  "invoice.customerName": ["Nimi", "Name"],
  "invoice.customerStreet": ["Katuosoite", "Street address"],
  "invoice.customerPostcode": ["Postinumero", "Postcode"],
  "invoice.customerCity": ["Postitoimipaikka", "City"],
  "invoice.customerCountry": ["Maa", "Country"],
  "invoice.customerVatId": ["ALV-numero", "VAT number"],
  "invoice.customerEmail": ["Sähköposti", "Email"],
  "invoice.customerLanguage": ["Laskun kieli", "Invoice language"],
  "invoice.customerTerm": ["Maksuaika (pv)", "Payment term (days)"],
  "party.referenceHint": [
    "Uusi lasku tälle asiakkaalle saa tämän Viitteenne-tekstin, esimerkiksi yhteyshenkilön tai kustannuspaikan. Sitä voi muuttaa laskulla.",
    "A new invoice to this customer starts with this Your reference text, such as a contact person or cost centre. It can be changed on the invoice.",
  ],
  "party.supplierTermHint": [
    "Toimittajan laskujen maksuaika. Uuden laskun eräpäivä täytetään tämän verran päiviä laskun päivän jälkeen.",
    "The supplier’s payment term. A new bill’s due date is filled in this many days after the bill’s date.",
  ],
  "party.bothTermHint": [
    "Maksuaika molempiin suuntiin: omien laskujen eräpäivä ja toimittajan laskun eräpäivä. Tyhjä käyttää omissa laskuissa laskutusasetusten maksuaikaa.",
    "The term both ways: the due date of your invoices and of the bills it sends. Empty uses the invoice settings’ term on your own invoices.",
  ],
  "party.iban": ["Tilinumero (IBAN)", "Account (IBAN)"],
  "invoice.customerTermHint": [
    "Tyhjä käyttää laskutusasetusten maksuaikaa.",
    "Empty uses the term from the invoice settings.",
  ],
  "invoice.saveCustomer": [
    "Tallenna asiakasrekisteriin",
    "Save to the customer register",
  ],
  "invoice.language": ["Laskun kieli", "Invoice language"],
  "invoice.date": ["Laskun päivämäärä", "Invoice date"],
  "invoice.dueDate": ["Eräpäivä", "Due date"],
  "invoice.supplyFrom": ["Toimitus alkaa", "Delivery from"],
  "invoice.supplyTo": ["Toimitus päättyy", "Delivery to"],
  "invoice.buyerReference": ["Viitteenne", "Your reference"],
  "invoice.orderNumber": ["Tilausnumero", "Order number"],
  "invoice.buyerRefHint": [
    "Asiakkaan oma viite, kuten yhteyshenkilö, kustannuspaikka tai ostotilauksen numero. Ne tulostuvat laskulle, jos asiakas on niitä pyytänyt.",
    "The customer’s own reference, such as a contact person, cost centre or purchase order number. They are printed on the invoice when the customer has asked for them.",
  ],
  "invoice.supplyHint": [
    "Jätä tyhjäksi, jos toimituspäivä on laskun päivämäärä.",
    "Leave empty if the delivery date is the invoice date.",
  ],
  "invoice.rows": ["Rivit", "Rows"],
  "invoice.rowDescription": ["Kuvaus", "Description"],
  "invoice.rowQuantity": ["Määrä", "Quantity"],
  "invoice.rowUnit": ["Yksikkö", "Unit"],
  "invoice.rowPrice": ["À-hinta (alv 0 %)", "Unit price (excl. VAT)"],
  "invoice.rowPricePlain": ["À-hinta", "Unit price"],
  "invoice.rowVat": ["ALV %", "VAT %"],
  "invoice.rowDiscount": ["Ale %", "Disc. %"],
  "statement.title": ["Tiliote", "Statement"],
  "statement.includePaid": ["Näytä myös maksetut", "Include paid"],
  "statement.from": ["Alkaen", "From"],
  "statement.to": ["Asti", "To"],
  "statement.empty": [
    "Ei laskuja tällä rajauksella.",
    "No invoices with this selection.",
  ],
  "statement.summary": [
    pl("1 lasku, avoinna {o}.", "{n} laskua, avoinna {o}."),
    pl("1 invoice, {o} open.", "{n} invoices, {o} open."),
  ],
  "statement.summaryOverdue": [
    pl(
      "1 lasku, avoinna {o}, josta erääntynyt {d}.",
      "{n} laskua, avoinna {o}, josta erääntynyt {d}."
    ),
    pl(
      "1 invoice, {o} open, of which {d} overdue.",
      "{n} invoices, {o} open, of which {d} overdue."
    ),
  ],
  "statement.download": ["Lataa tiliote (PDF)", "Download statement (PDF)"],
  "invoice.docDiscount": [
    "Alennus koko laskusta, %",
    "Discount on the whole invoice, %",
  ],
  "invoice.discountBad": [
    "Anna alennus prosentteina 0–100, enintään kahdella desimaalilla.",
    "Give the discount as a percent from 0 to 100, with at most two decimals.",
  ],
  "invoice.totalDiscount": ["Alennus {p}", "Discount {p}"],
  "invoice.rowCategory": ["Luokka", "Category"],
  "invoice.rowTotal": ["Yhteensä", "Total"],
  "invoice.addRow": ["Lisää rivi", "Add row"],
  "invoice.removeRow": ["Poista rivi {n}", "Remove row {n}"],
  "invoice.note": ["Viesti asiakkaalle", "Message to the customer"],
  "invoice.totalNet": ["Veroton yhteensä", "Total excl. VAT"],
  "invoice.totalVat": ["Arvonlisävero", "VAT"],
  "invoice.totalGross": ["Maksettava", "Amount due"],
  "invoice.saveDraft": ["Tallenna luonnos", "Save draft"],
  "invoice.issue": ["Anna lasku", "Issue invoice"],
  "invoice.duplicateOf": [
    "Samalle asiakkaalle on jo annettu samanlainen lasku {n} ({d}).",
    "An identical invoice {n} ({d}) has already been issued to this customer.",
  ],
  "invoice.paidAmount": ["Maksettu summa", "Amount paid"],
  "invoice.paidAmountHint": [
    "Avoinna {n}. Pienempi summa kirjataan osamaksuna.",
    "{n} is open. A smaller amount records a part payment.",
  ],
  "invoice.stillOwed": ["Avoinna {n}", "{n} open"],
  "invoice.reminder": ["Maksumuistutus", "Payment reminder"],
  "invoice.reminderMade": [
    "Maksumuistutus laskusta {n} tehty",
    "Payment reminder for invoice {n} made",
  ],
  "invoice.reminderDate": ["Muistutuksen päivä", "Reminder date"],
  "invoice.reminderFee": ["Muistutusmaksu", "Reminder fee"],
  "invoice.reminderRate": [
    "Viivästyskorko, % vuodessa",
    "Late payment interest, % a year",
  ],
  "invoice.reminderNoRate": [
    "Tälle päivälle ei ole tallennettua korkolain mukaista korkoa. Anna korko itse tai aseta se laskutuksen asetuksissa.",
    "There is no stored statutory rate for this date. Enter a rate here or set one in the invoicing settings.",
  ],
  "invoice.reminderSummary": [
    "Avoinna {open} + korko {interest} ({days} pv) + maksu {fee} = {total}. Uusi eräpäivä {due}.",
    "{open} open + interest {interest} ({days} days) + fee {fee} = {total}. New due date {due}.",
  ],
  "invoice.reminderCreate": ["Tee muistutus", "Make reminder"],
  "invoice.reminderBooked": [
    "Korko ja muistutusmaksu kirjataan laskun avoimiksi tuloiksi, jotka kuittautuvat, kun asiakas maksaa.",
    "The interest and the fee are booked as open income on the invoice, settled when the customer pays.",
  ],
  "invoice.waive": ["Luovu muistutuskuluista", "Waive reminder charges"],
  "invoice.waiveTitle": [
    "Luovutaanko laskun {n} muistutuskuluista?",
    "Waive the reminder charges of invoice {n}?",
  ],
  "invoice.waiveMessage": [
    "Maksamattomat korot ja muistutusmaksut ({amount}) poistetaan kirjanpidosta, eikä niitä enää peritä. Muistutukset jäävät laskun tietoihin.",
    "The unpaid interest and reminder fees ({amount}) are removed from the books and no longer collected. The reminders stay on the invoice.",
  ],
  "invoice.waiveConfirm": ["Luovu kuluista", "Waive charges"],
  "invoice.waived": [
    "Laskun {n} muistutuskuluista luovuttiin",
    "Reminder charges of invoice {n} waived",
  ],
  "invoice.remindersSent": [
    "{n} muistutusta, viimeisin {d}",
    "{n} reminders, latest {d}",
  ],
  "invoice.settingsReminderFee": ["Muistutusmaksu, €", "Reminder fee, €"],
  "invoice.settingsInterest": [
    "Viivästyskorko, % (tyhjä = korkolain mukainen)",
    "Late payment interest, % (empty = statutory)",
  ],
  "invoice.tabAging": ["Saatavat", "Receivables"],
  "invoice.tabPayables": ["Maksettavat", "To pay"],
  "invoice.tabRecurring": ["Toistuvat", "Recurring"],
  "invoice.tabProducts": ["Tuotteet", "Products"],
  "quote.tab": ["Tarjoukset", "Quotes"],
  "quote.title": ["Tarjoukset", "Quotes"],
  "quote.listHint": [
    "Tarjous ei kirjaa mitään. Kun asiakas hyväksyy sen, tee siitä lasku, niin rivit ja asiakas siirtyvät laskuluonnokseen.",
    "A quote books nothing. When the customer accepts it, make it an invoice and the rows and customer move to an invoice draft.",
  ],
  "quote.empty": [
    "Ei tarjouksia. Tee ensimmäinen Uusi tarjous -painikkeella.",
    "No quotes yet. Make the first one with the New quote button.",
  ],
  "quote.new": ["Uusi tarjous", "New quote"],
  "quote.newTitle": ["Uusi tarjous", "New quote"],
  "quote.viewTitle": ["Tarjous {n}", "Quote {n}"],
  "quote.date": ["Tarjouksen päivämäärä", "Quote date"],
  "quote.language": ["Tarjouksen kieli", "Quote language"],
  "quote.validUntil": ["Voimassa asti", "Valid until"],
  "quote.colValid": ["Voimassa", "Valid until"],
  "quote.hint": ["Tarjous ei kirjaa mitään.", "A quote books nothing."],
  "quote.invoicedAs": ["Laskutettu laskulla {n}.", "Invoiced as invoice {n}."],
  "quote.invoicedDraft": [
    "Tarjouksesta on tehty laskuluonnos.",
    "An invoice draft has been made from this quote.",
  ],
  "quote.save": ["Tallenna", "Save"],
  "quote.saved": ["Tarjous {n} tallennettu", "Quote {n} saved"],
  "quote.open": ["Avaa tarjous", "Open quote"],
  "quote.toInvoice": ["Tee lasku", "Make invoice"],
  "quote.invoiced": [
    "Tarjouksesta {n} tehtiin laskuluonnos",
    "Invoice draft made from quote {n}",
  ],
  "quote.markAccepted": ["Merkitse hyväksytyksi", "Mark accepted"],
  "quote.markDeclined": ["Merkitse hylätyksi", "Mark declined"],
  "quote.clearOutcome": ["Poista vastaus", "Clear the answer"],
  "quote.delete": ["Poista tarjous", "Delete quote"],
  "quote.deleteTitle": ["Poistetaanko tarjous {n}?", "Delete quote {n}?"],
  "quote.deleteMessage": [
    "Tarjouksesta tehty lasku säilyy. Tarjouksen numeroa ei käytetä uudelleen, ellei se ole viimeisin.",
    "An invoice made from the quote stays. The quote’s number is not used again unless it is the latest.",
  ],
  "quote.deleted": ["Tarjous {n} poistettu", "Quote {n} deleted"],
  "quote.statusOpen": ["Voimassa", "Open"],
  "quote.statusExpired": ["Vanhentunut", "Expired"],
  "quote.statusAccepted": ["Hyväksytty", "Accepted"],
  "quote.statusDeclined": ["Hylätty", "Declined"],
  "quote.statusInvoiced": ["Laskutettu", "Invoiced"],
  "quote.problemValidBeforeDate": [
    "Voimassaolo ei voi päättyä ennen tarjouksen päivää.",
    "The quote cannot stop being valid before its own date.",
  ],
  "invoice.copy": ["Kopioi uudeksi", "Copy as new"],
  "invoice.repeat": ["Tee toistuvaksi", "Repeat invoice"],
  "invoice.fromRecurring": ["Toistuvasta laskusta", "From a recurring invoice"],
  "invoice.recurringTitle": ["Toistuvat laskut", "Recurring invoices"],
  "invoice.recurringHint": [
    "Kun seuraavan laskun päivä tulee, sovellus tekee luonnoksen, kun avaat sen. Tarkista ja lähetä luonnos Laskut-välilehdellä.",
    "When the next date comes, the app makes a draft of the invoice when it opens. Check and issue the draft on the Invoices tab.",
  ],
  "invoice.recurringEmpty": [
    "Ei toistuvia laskuja. Tee sellainen laskulistan Tee toistuvaksi -painikkeella.",
    "No recurring invoices. Make one with the Repeat invoice button in the invoice list.",
  ],
  "invoice.recurringColEvery": ["Toistuu", "Repeats"],
  "invoice.recurringColNext": ["Seuraava lasku", "Next invoice"],
  "invoice.recurringColMade": ["Tehty", "Made"],
  "invoice.recurringUntil": ["Viimeinen päivä", "Last date"],
  "invoice.recurringPaused": ["Keskeytetty", "Paused"],
  "invoice.recurringEnded": ["Päättynyt", "Ended"],
  "invoice.recurringPause": [
    "Keskeytä: ei uusia luonnoksia",
    "Pause: no new drafts",
  ],
  "invoice.recurringEdit": [
    "Muokkaa toistuvaa laskua: {x}",
    "Edit recurring invoice: {x}",
  ],
  "invoice.recurringDelete": [
    "Poista toistuva lasku: {x}",
    "Delete recurring invoice: {x}",
  ],
  "invoice.recurringEditTitle": ["Toistuva lasku", "Recurring invoice"],
  "invoice.recurringDialogHint": [
    "{x}, {n}. Rivit otetaan tästä laskusta, asiakkaan tiedot rekisteristä luonnosta tehtäessä.",
    "{x}, {n}. The rows come from this invoice, the customer’s details from the register when the draft is made.",
  ],
  "invoice.recurringDraftHint": [
    "Luonnos tehdään tuona päivänä. Mitään ei lähetetä itsestään.",
    "The draft is made on that day. Nothing is issued by itself.",
  ],
  "invoice.recurringNowHint": [
    "Päivä on jo tullut, joten luonnos tehdään heti tallennettaessa.",
    "The date has come already, so the draft is made as soon as you save.",
  ],
  "invoice.recurringSaved": [
    "Toistuva lasku tallennettu. Seuraava luonnos {d}.",
    "Recurring invoice saved. Next draft {d}.",
  ],
  "invoice.recurringSavedNow": [
    "Toistuva lasku tallennettu.",
    "Recurring invoice saved.",
  ],
  "invoice.recurringDeleted": [
    "Toistuva lasku poistettu: {x}",
    "Recurring invoice deleted: {x}",
  ],
  "invoice.recurringMade": [
    pl(
      "Toistuvista laskuista tehtiin 1 luonnos.",
      "Toistuvista laskuista tehtiin {n} luonnosta."
    ),
    pl(
      "1 draft made from recurring invoices.",
      "{n} drafts made from recurring invoices."
    ),
  ],
  "invoice.recurringDraftsTitle": [
    pl(
      "1 toistuvan laskun luonnos odottaa",
      "{n} toistuvan laskun luonnosta odottaa"
    ),
    pl(
      "1 recurring invoice draft waiting",
      "{n} recurring invoice drafts waiting"
    ),
  ],
  "invoice.recurringDraftsSub": [
    "Tarkista ja lähetä ne laskulistalla.",
    "Check and issue them in the invoice list.",
  ],
  "product.title": ["Tuotteet ja palvelut", "Products and services"],
  "product.hint": [
    "Laskun rivin voi täyttää tuotteesta yhdellä valinnalla. Muutos tuotteeseen ei muuta jo tehtyjä laskuja.",
    "An invoice row can be filled from a product in one pick. Changing a product leaves the invoices already made alone.",
  ],
  "product.empty": [
    "Ei vielä tuotteita. Lisää tuote tästä tai tallenna laskun rivi tuotteeksi.",
    "No products yet. Add one here, or keep an invoice row as a product.",
  ],
  "product.new": ["Uusi tuote", "New product"],
  "product.newTitle": ["Uusi tuote tai palvelu", "New product or service"],
  "product.editTitle": ["Tuote tai palvelu", "Product or service"],
  "product.name": ["Nimi laskulla", "Name on the invoice"],
  "product.price": ["À-hinta (alv 0 %)", "Unit price (excl. VAT)"],
  "product.needsName": ["Anna nimi.", "Give a name."],
  "product.badPrice": [
    "Hinta ei kelpaa. Anna hinta euroina, esim. 85,00.",
    "The price cannot be read. Give it in euros, e.g. 85.00.",
  ],
  "product.saved": ["Tuote tallennettu: {x}", "Product saved: {x}"],
  "product.deleted": ["Tuote poistettu: {x}", "Product deleted: {x}"],
  "product.edit": ["Muokkaa tuotetta: {x}", "Edit product: {x}"],
  "product.delete": ["Poista tuote: {x}", "Delete product: {x}"],
  "product.pick": ["Lisää tuote…", "Add a product…"],
  "product.keepRow": [
    "Tallenna rivi {n} tuotteeksi",
    "Keep row {n} as a product",
  ],
  "payables.overdue": ["Erääntyneet", "Overdue"],
  "payables.soon": ["Seuraavat 7 pv", "Next 7 days"],
  "payables.later": ["Myöhemmin", "Later"],
  "payables.noDue": ["Ei eräpäivää", "No due date"],
  "payables.total": ["Yhteensä", "Total"],
  "payables.empty": [
    "Ei maksamattomia ostolaskuja. Avoimeksi merkitty kulutosite näkyy täällä.",
    "No unpaid bills. An expense voucher marked open shows here.",
  ],
  "payables.colDue": ["Eräpäivä", "Due date"],
  "payables.colVoucher": ["Tosite", "Voucher"],
  "payables.colDescription": ["Kuvaus", "Description"],
  "payables.colAmount": ["Maksettava", "To pay"],
  "payables.voucher": ["Nro {n} · {d}", "No. {n} · {d}"],
  "payables.iban": ["Tili", "Account"],
  "payables.reference": ["Viite", "Reference"],
  "payables.barcode": ["Virtuaaliviivakoodi", "Virtual barcode"],
  "payables.copy": ["Kopioi: {x}", "Copy: {x}"],
  "payables.copyBarcode": [
    "Kopioi virtuaaliviivakoodi",
    "Copy virtual barcode",
  ],
  "payables.copied": ["Kopioitu: {x}", "Copied: {x}"],
  "payables.daysLate": ["{n} pv myöhässä", pl("1 day late", "{n} days late")],
  "payables.dueToday": ["Erääntyy tänään", "Due today"],
  "payables.dueTomorrow": ["Erääntyy huomenna", "Due tomorrow"],
  "payables.pay": ["Maksa", "Pay"],
  "payables.payTitle": ["Merkitse maksetuksi", "Mark as paid"],
  "payables.payDescription": ["{d}, {n}", "{d}, {n}"],
  "payables.paidOn": ["Maksupäivä", "Payment date"],
  "payables.paid": ["Merkitty maksetuksi.", "Marked as paid."],
  "payables.paidMany": [
    pl("1 lasku merkitty maksetuksi.", "{n} laskua merkitty maksetuksi."),
    pl("1 bill marked as paid.", "{n} bills marked as paid."),
  ],
  "payables.fileOpen": ["Maksuaineisto", "Payment file"],
  "payables.fileChosen": [
    pl("1 lasku valittu", "{n} laskua valittu"),
    pl("1 bill chosen", "{n} bills chosen"),
  ],
  "payables.fileAllWithIban": [
    pl("1 lasku, jolla on tilinumero", "{n} laskua, joilla on tilinumero"),
    pl("1 bill with an account number", "{n} bills with an account number"),
  ],
  "payables.filePickAll": ["Valitse kaikki", "Choose all"],
  "payables.filePick": ["Valitse: {d}", "Choose: {d}"],
  "payables.fileTitle": ["Maksuaineisto pankkiin", "Payment file for the bank"],
  "payables.fileDescription": [
    "SEPA-maksuaineisto (XML), jonka voit lähettää verkkopankin aineistopalveluun. Pankki maksaa laskut, kun hyväksyt aineiston siellä.",
    "A SEPA payment file (XML) to upload in your online bank's file service. The bank pays the bills once you approve the file there.",
  ],
  "payables.filePayer": ["Maksaja", "Payer"],
  "payables.fileAccount": ["Maksajan tili (IBAN)", "Payer's account (IBAN)"],
  "payables.fileBadIban": ["Tarkista tilinumero.", "Check the account number."],
  "payables.fileSameDay": [
    "Maksa kaikki samana päivänä",
    "Pay all on the same day",
  ],
  "payables.fileOnDueDate": [
    "Muuten kukin lasku maksetaan eräpäivänään, ja erääntynyt tai eräpäivätön tänään.",
    "Otherwise each bill is paid on its due date, and one past due or without a due date today.",
  ],
  "payables.fileSameDayOn": [
    "Kaikki laskut maksetaan alla valittuna päivänä.",
    "Every bill is paid on the day chosen below.",
  ],
  "payables.filePayDay": ["Maksupäivä", "Payment day"],
  "payables.fileVersion": ["Aineiston versio", "File version"],
  "payables.fileVersion03": [
    "pain.001.001.03 (useimmat pankit)",
    "pain.001.001.03 (most banks)",
  ],
  "payables.fileVersion09": ["pain.001.001.09", "pain.001.001.09"],
  "payables.fileVersionHint": [
    "Jos pankki ei hyväksy aineistoa, kokeile toista versiota.",
    "If the bank refuses the file, try the other version.",
  ],
  "payables.fileMarkPaid": [
    "Merkitse laskut maksetuiksi maksupäivinään",
    "Mark the bills paid on their payment days",
  ],
  "payables.fileMarkPaidHint": [
    "Jätä valitsematta, jos haluat merkitä ne vasta tiliotteelta.",
    "Leave it unticked to mark them from the bank statement instead.",
  ],
  "payables.fileSummary": [
    pl("1 maksu, yhteensä {a}", "{n} maksua, yhteensä {a}"),
    pl("1 payment, {a} in all", "{n} payments, {a} in all"),
  ],
  "payables.fileSkipped": ["Ei mukana: {d} ({r})", "Left out: {d} ({r})"],
  "payables.fileSkipNoIban": ["ei tilinumeroa", "no account number"],
  "payables.fileSkipNotOwed": ["ei maksettavaa", "nothing to pay"],
  "payables.fileDownload": ["Lataa aineisto", "Download file"],
  "payables.fileFileName": ["maksut", "payments"],
  "invoice.agingEmpty": ["Ei maksamattomia laskuja.", "No unpaid invoices."],
  "invoice.agingNotDue": ["Ei erääntynyt", "Not yet due"],
  "invoice.agingLate14": ["1–14 pv", "1–14 days"],
  "invoice.agingLate30": ["15–30 pv", "15–30 days"],
  "invoice.agingLate60": ["31–60 pv", "31–60 days"],
  "invoice.agingLater": ["Yli 60 pv", "Over 60 days"],
  "invoice.agingTotal": ["Yhteensä", "Total"],
  "invoice.agingItem": ["Lasku {n}, eräpäivä {d}", "Invoice {n}, due {d}"],
  "invoice.issueHint": [
    "Annettua laskua ei voi muokata. Virhe korjataan hyvityslaskulla.",
    "An issued invoice cannot be edited. A mistake is corrected with a credit note.",
  ],
  "invoice.issuedLocked": [
    "Lasku on annettu eikä sitä voi muokata.",
    "The invoice is issued and cannot be edited.",
  ],
  "invoice.settingsTab": ["Laskutus", "Invoicing"],
  "invoice.settingsTitle": ["Laskutusasetukset", "Invoice settings"],
  "invoice.settingsHint": [
    "Nämä tiedot tulevat jokaiseen laskuun. Yrityksen nimi ja Y-tunnus ovat Yleiset-välilehdellä.",
    "These details go on every invoice. The business name and ID are under General.",
  ],
  "invoice.settingsStreet": ["Katuosoite", "Street address"],
  "invoice.lookTitle": ["Laskun ulkoasu", "Invoice appearance"],
  "invoice.lookHint": [
    "Logo, korostusväri ja alatunniste tulevat laskuihin, tarjouksiin, maksumuistutuksiin ja tiliotteisiin. Jo lähetetyn laskun tositteeksi tallennettu PDF säilyy ennallaan.",
    "The logo, accent colour and footer go on invoices, quotes, payment reminders and statements. The PDF stored as an issued invoice’s voucher stays as it was.",
  ],
  "invoice.lookPreview": ["Esikatsele", "Preview"],
  "invoice.lookLogo": ["Logo", "Logo"],
  "invoice.lookLogoAlt": ["Laskujen logo", "Invoice logo"],
  "invoice.lookLogoPick": ["Valitse logo", "Choose a logo"],
  "invoice.lookLogoChange": ["Vaihda logo", "Change logo"],
  "invoice.lookLogoRemove": ["Poista logo", "Remove logo"],
  "invoice.lookLogoBad": [
    "Kuvaa ei voitu lukea. Kokeile PNG- tai JPEG-tiedostoa.",
    "The image could not be read. Try a PNG or JPEG file.",
  ],
  "invoice.lookLogoHint": [
    "PNG, JPEG tai WebP. Kuva pienennetään ja tallennetaan kirjanpitotiedostoon. Läpinäkyvä tausta säilyy PNG-kuvassa.",
    "PNG, JPEG or WebP. The image is scaled down and saved in the bookkeeping file. A PNG keeps its transparent background.",
  ],
  "invoice.lookAccent": ["Korostusväri", "Accent colour"],
  "invoice.lookAccentNone": ["Ei korostusväriä", "No accent colour"],
  "invoice.lookAccentReset": ["Palauta musta", "Back to black"],
  "invoice.lookAccentHint": [
    "Otsikon ja viivojen väri. Valitse tumma sävy, jotta teksti erottuu tulosteessa.",
    "The colour of the heading and the rules. Pick a dark shade so it reads well in print.",
  ],
  "invoice.lookFooter": ["Alatunniste", "Footer"],
  "invoice.lookFooterPlaceholder": [
    "esim. www.yritys.fi · puh. 040 123 4567",
    "e.g. www.example.fi · tel. +358 40 123 4567",
  ],
  "invoice.lookFooterHint": [
    "Teksti jokaisen sivun alareunassa, enintään kaksi riviä.",
    "Text at the foot of every page, at most two lines.",
  ],
  "invoice.lookSampleSeller": ["Yrityksesi", "Your business"],
  "invoice.lookSampleCustomer": ["Esimerkkiasiakas Oy", "Example Customer Ltd"],
  "invoice.lookSampleRow": ["Esimerkkityö", "Example work"],
  "invoice.lookSampleFile": ["Esimerkkilasku.pdf", "Example invoice.pdf"],
  "invoice.settingsPostcode": ["Postinumero", "Postcode"],
  "invoice.settingsCity": ["Postitoimipaikka", "City"],
  "invoice.settingsEmail": ["Sähköposti", "Email"],
  "invoice.settingsIban": ["Tilinumero (IBAN)", "Account number (IBAN)"],
  "invoice.settingsIbanInvalid": [
    "Tilinumero ei ole kelvollinen IBAN.",
    "This is not a valid IBAN.",
  ],
  "invoice.settingsIbanForeign": [
    "Viivakoodi toimii vain suomalaisella tilinumerolla.",
    "The barcode only works with a Finnish account number.",
  ],
  "invoice.settingsTerm": ["Maksuaika (pv)", "Payment term (days)"],
  "invoice.settingsTermsFi": [
    "Lisäteksti suomenkielisiin laskuihin",
    "Extra text on Finnish invoices",
  ],
  "invoice.settingsTermsEn": [
    "Lisäteksti englanninkielisiin laskuihin",
    "Extra text on English invoices",
  ],
  "invoice.settingsFirst": ["Ensimmäinen laskunumero", "First invoice number"],
  "invoice.settingsFirstHint": [
    "Numerosarja jatkuu vuodesta toiseen. Pienin sallittu numero on 100.",
    "The series continues from year to year. The smallest number allowed is 100.",
  ],
  "party.tab": ["Asiakkaat ja toimittajat", "Customers and suppliers"],
  "party.title": ["Asiakkaat ja toimittajat", "Customers and suppliers"],
  "party.hint": [
    "Tositteelle valittu asiakas tai toimittaja täyttää sen luokan ja verokannan. Asiakas täyttää myös laskun vastaanottajan ja EU-myynnin ALV-numeron. Nimeä napsauttamalla näet tositteet.",
    "A customer or supplier picked on a voucher fills in its category and VAT rate. A customer also fills in an invoice's recipient and an EU sale's VAT number. Click a name to see the vouchers.",
  ],
  "party.empty": [
    "Ei vielä asiakkaita eikä toimittajia.",
    "No customers or suppliers yet.",
  ],
  "party.new": ["Lisää asiakas tai toimittaja", "Add customer or supplier"],
  "party.newSupplier": ["Uusi toimittaja", "New supplier"],
  "party.edit": ["Muokkaa tietoja", "Edit details"],
  "party.editSupplier": ["Muokkaa toimittajaa", "Edit supplier"],
  "party.delete": ["Poista {x}", "Delete {x}"],
  "party.deleted": ["{x} poistettu", "{x} deleted"],
  "party.needsName": ["Nimi puuttuu.", "The name is missing."],
  "party.role": ["Rooli", "Role"],
  "party.roleCustomer": ["Asiakas", "Customer"],
  "party.roleSupplier": ["Toimittaja", "Supplier"],
  "party.roleBoth": ["Asiakas ja toimittaja", "Customer and supplier"],
  "party.defaults": ["Oletukset tositteelle", "Defaults for a voucher"],
  "party.defaultsHint": [
    "Täyttyvät tositteelle, kun valitset sille tämän asiakkaan tai toimittajan. Saman maksajan tai saajan pankkitapahtuma saa samat oletukset.",
    "Filled in on a voucher when you pick this customer or supplier for it. A bank row with the same payer or payee gets the same.",
  ],
  "party.incomeCat": ["Myynnin luokka", "Sales category"],
  "party.expenseCat": ["Ostojen luokka", "Purchase category"],
  "party.catNone": ["Ei oletusta", "No default"],
  "party.vatRate": ["Verokanta", "VAT rate"],
  "party.rateFromCategory": ["Luokan oma", "The category's own"],
  "party.vatIdBad": [
    "ALV-numero ei näytä oikealta. Tallennus onnistuu silti.",
    "The VAT number does not look right. It can still be saved.",
  ],
  "party.open": ["Avaa {x}", "Open {x}"],
  "party.vouchers": ["Tositteet {y}", "Vouchers {y}"],
  "party.noVouchers": ["Ei tositteita vuonna {y}.", "No vouchers in {y}."],
  "party.sales": ["Myynti {y}", "Sales {y}"],
  "party.costs": ["Ostot {y}", "Purchases {y}"],
  "party.openNow": ["Avoinna nyt", "Open now"],
  "party.openSub": [
    "Saatavaa {r}, maksettavaa {p}",
    "Receivable {r}, payable {p}",
  ],
  "invoice.newCustomer": ["Uusi asiakas", "New customer"],
  "invoice.editCustomer": ["Muokkaa asiakasta", "Edit customer"],
  "invoice.editOnInvoice": ["Muokkaa tällä laskulla", "Edit on this invoice"],
  "invoice.more": ["Lisätiedot", "More details"],
  "invoice.unsaved": ["Tallentamaton", "Unsaved"],
  "invoice.term": ["Maksuehto", "Payment terms"],
  "invoice.termNet": [
    pl("1 päivä netto", "{n} päivää netto"),
    pl("1 day net", "{n} days net"),
  ],
  "invoice.termNow": ["Heti", "Due on receipt"],
  "invoice.termOther": ["Muu eräpäivä", "Other due date"],
  "invoice.docDiscountShort": [
    "Alennus koko laskusta",
    "Discount on the whole invoice",
  ],
  "invoice.supply": ["Toimitusaika", "Delivery period"],
  "invoice.moreHint": [
    "Ennakkolasku, toimitusaika, asiakkaan viitteet, liitteet ja tunnisteet",
    "Advance invoice, delivery period, customer references, attachments and tags",
  ],
  "invoice.moreHintCredit": [
    "Toimitusaika, asiakkaan viitteet ja tunnisteet",
    "Delivery period, customer references and tags",
  ],
  "invoice.moreFilled": [
    pl("1 kohta täytetty", "{n} kohtaa täytetty"),
    pl("1 item filled in", "{n} items filled in"),
  ],
  "invoice.customerNeedsName": [
    "Asiakkaalla pitää olla nimi.",
    "A customer needs a name.",
  ],
  "invoice.save": ["Tallenna", "Save"],
  "invoice.close": ["Sulje", "Close"],
  "invoice.problemCreditOriginal": [
    "Hyvitettävä lasku puuttuu tai sitä ei ole annettu.",
    "The invoice to credit is missing or not issued.",
  ],
  "invoice.problemCreditTooLarge": [
    "Hyvitys on suurempi kuin laskusta on vielä hyvitettävissä.",
    "The credit is larger than what is left to credit on the invoice.",
  ],
  "invoice.problemAdvanceOnAdvance": [
    "Ennakkolasku ei voi vähentää toista ennakkolaskua.",
    "An advance invoice cannot deduct another advance invoice.",
  ],
  "invoice.problemAdvanceTooLarge": [
    "Ennakkoa vähennetään enemmän kuin siitä on maksettu ja vähentämättä.",
    "More of the advance is deducted than was paid and is left to deduct.",
  ],
  "invoice.problemRebilledTwice": [
    "Sama kulu on jo laskutettu edelleen toisella laskulla tai kahdesti tällä.",
    "The same cost is already billed on by another invoice, or twice on this one.",
  ],
  "invoice.advanceKind": ["Ennakkolasku", "Advance invoice"],
  "invoice.advanceKindHint": [
    "Ennakon arvonlisävero ilmoitetaan sinä kuukautena, jona se maksetaan. Loppulasku vähentää maksetun ennakon.",
    "VAT on an advance is reported in the month it is paid. The final invoice deducts the advance paid.",
  ],
  "invoice.advanceKindDeducting": [
    "Tämä lasku vähentää ennakon, joten se on loppulasku.",
    "This invoice deducts an advance, so it is a final invoice.",
  ],
  "invoice.advanceRow": [
    "Vähentää ennakkolaskusta {n} maksetun osan.",
    "Deducts what was paid of advance invoice {n}.",
  ],
  "invoice.advanceDeduct": [
    "Vähennä ennakkolasku {n} ({m})",
    "Deduct advance invoice {n} ({m})",
  ],
  "invoice.advanceBadge": ["Ennakko", "Advance"],
  "invoice.files": ["Liitteet", "Attachments"],
  "invoice.filesDrop": ["Raahaa tiedostot tähän tai", "Drop files here or"],
  "invoice.filesPick": ["valitse", "choose"],
  "invoice.filesHint": [
    "PDF, PNG tai JPEG, enintään {n} tiedostoa ja 10 Mt kukin. Ne tulostuvat laskun PDF:n perään.",
    "PDF, PNG or JPEG, at most {n} files of 10 MB each. They are printed after the invoice in its PDF.",
  ],
  "invoice.filesOpen": ["Avaa {x}", "Open {x}"],
  "invoice.filesRemove": ["Poista liite {x}", "Remove attachment {x}"],
  "invoice.filesNoStorage": [
    "Selain ei voi tallentaa liitteitä.",
    "This browser cannot store attachments.",
  ],
  "invoice.filesTooMany": [
    "Laskulla voi olla enintään {n} liitettä.",
    "An invoice can have at most {n} attachments.",
  ],
  "invoice.filesBadType": [
    "{x}: liitteeksi käy PDF, PNG tai JPEG.",
    "{x}: an attachment must be a PDF, PNG or JPEG.",
  ],
  "invoice.filesTooLarge": ["{x} on yli 10 Mt.", "{x} is over 10 MB."],
  "invoice.filesUnreadable": [
    "{x} ei aukea, esimerkiksi salasanan vuoksi.",
    "{x} cannot be read, for example because it is password protected.",
  ],
  "invoice.filesFailed": [
    "Liitettä ei voitu tallentaa.",
    "The attachment could not be stored.",
  ],
  "invoice.filesMissing": [
    "Liitettä {x} ei löydy selaimen tallennuksesta.",
    "Attachment {x} is not in the browser's storage.",
  ],
  "invoice.filesSkipped": [
    pl(
      "1 liite jäi pois laskun PDF:stä, koska sitä ei voitu lukea.",
      "{n} liitettä jäi pois laskun PDF:stä, koska niitä ei voitu lukea."
    ),
    pl(
      "1 attachment was left out of the invoice PDF because it could not be read.",
      "{n} attachments were left out of the invoice PDF because they could not be read."
    ),
  ],
  "invoice.rebillOpen": ["Laskuta kuluja edelleen…", "Bill on costs…"],
  "invoice.rebillSearch": ["Hae kuluista", "Search costs"],
  "invoice.rebillMarkup": ["Lisä %", "Markup %"],
  "invoice.rebillMarkupBad": [
    "Lisä on prosentti 0–1000.",
    "The markup is a percent from 0 to 1000.",
  ],
  "invoice.rebillNone": [
    "Kirjanpidossa ei ole kuluja, joita ei olisi jo laskutettu edelleen.",
    "The book has no costs that are not billed on already.",
  ],
  "invoice.rebillNoMatch": ["Haku ei löytänyt kuluja.", "No costs match."],
  "invoice.rebillHint": [
    "Kulu laskutetaan arvonlisäverottomana, lisättynä lisällä, ja rivi saa laskun myyntiluokan ja verokannan, koska edelleenlaskutettu kulu on osa myynnin hintaa. Kulu pysyy kuluna kirjanpidossa.",
    "The cost is billed without VAT plus the markup, and the row takes the invoice's sales category and rate, since a cost billed on is part of the sale's price. The cost stays a cost in the book.",
  ],
  "invoice.rebillAdd": [
    pl("Lisää 1 kulu", "Lisää {n} kulua"),
    pl("Add 1 cost", "Add {n} costs"),
  ],
  "invoice.rebillRowFrom": [
    "Edelleenlaskutettu kulu {d}: {x}, veroton {m}",
    "Cost billed on, {d}: {x}, {m} without VAT",
  ],
  "invoice.rebillRowGone": [
    "Edelleenlaskutettu kulu ei ole enää kirjanpidossa.",
    "The cost billed on is no longer in the book.",
  ],
  "invoice.credit": ["Hyvitä", "Credit"],
  "invoice.creditNote": ["Hyvityslasku", "Credit note"],
  "invoice.creditDraftTitle": ["Hyvityslaskun luonnos", "Credit note draft"],
  "invoice.creditViewTitle": ["Hyvityslasku {n}", "Credit note {n}"],
  "invoice.credits": ["Hyvitettävä lasku {n}", "Credits invoice {n}"],
  "invoice.creditHint": [
    "Poista rivit tai pienennä määriä, jos hyvität vain osan. Määrät ovat miinusmerkkisiä.",
    "Remove rows or shrink the quantities to credit only part. Quantities are negative.",
  ],
  "invoice.creditNothingLeft": [
    "Laskusta ei ole enää hyvitettävää.",
    "There is nothing left to credit on this invoice.",
  ],
  "invoice.creditSettled": [
    "Hyvitys ja alkuperäinen lasku kuitattiin maksetuiksi.",
    "The credit and the original invoice were marked as paid.",
  ],
  "invoice.statusCredit": ["Hyvitys", "Credit"],
  "invoice.statusCredited": ["Hyvitetty", "Credited"],
  "invoice.send": ["Lähetä", "Send"],
  "invoice.sendAttach": [
    "PDF ladattiin. Liitä se avautuneeseen sähköpostiin.",
    "The PDF was downloaded. Attach it to the mail that opened.",
  ],
  "io.skippedRecordsTitle": [
    "Tietueita jäi lukematta",
    "Some records were not read",
  ],
  "io.skippedRecords": [
    "{n} laskua, asiakasta tai varastoriviä tiedostosta ei voitu lukea, joten ne jätettiin pois. Älä tallenna tiedostoa päälle ennen kuin olet tarkistanut invoices.json, customers.json ja inventory.json, sillä tallennus poistaisi ne.",
    "{n} invoices, customers or stock rows in the file could not be read and were left out. Do not save over the file before you check invoices.json, customers.json and inventory.json, because saving would remove them.",
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
    "Avaa CSV- tai ZIP-tiedosto pudottamalla se tähän",
    "Drop a CSV or ZIP file to open it",
  ],
  /* Neutral on purpose: the row that opens this dialog has two names. */
  "io.xlsxFailed": [
    "Excel-taulukon tekeminen epäonnistui. Kirjanpitosi on tallessa.",
    "The spreadsheet could not be made. Your bookkeeping is safe.",
  ],
  "io.exportTitle": ["Lataa kirjanpito", "Download books"],
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
  "io.autosaved": ["Tallennettu automaattisesti.", "Saved automatically."],
  "io.archiveReadOnly": [
    "Arkisto on vain luettavissa. Avaa nykyinen kirjanpitotiedosto, jos haluat tallentaa.",
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
    "Vuodelta {y} ei ole tositteita.",
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
    "Selaimesta puuttuu liitteitä: {n}. Arkistosta puuttuisi tositteita. Avaa kirjanpito uudelleen tiedostosta ja yritä sitten.",
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
    "fields in the order they are entered in MyTax",
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
    "Tarkastuspaketin luonti epäonnistui. Kirjanpito ei muuttunut.",
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
    "Kirjanpidon ZIP on salattu ja pysyy salattuna paketin sisällä. Raportti-PDF:t ja tarkistetiedostot eivät ole salattuja, ja niistä näkyy vuoden luvut. Säilytä paketti turvallisessa paikassa.",
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
    "Säilytyspaketin luonti epäonnistui. Kirjanpito ei muuttunut.",
    "Making the retention package failed. Your book is unchanged.",
  ],
  "app.archiveBanner": ["Arkisto {y}: vain luku", "Archive {y}: read-only"],
  "app.archiveClose": ["Sulje arkisto", "Close archive"],
  "app.vatReminderDue": [
    "{p}: ALV-ilmoitus erääntyy {d}",
    "{p}: VAT return due {d}",
  ],
  "app.vatReminderLate": [
    "{p}: ALV-ilmoitus on myöhässä, eräpäivä oli {d}",
    "{p}: VAT return is overdue, it was due {d}",
  ],
  "app.vatReminderDays": [
    pl("Aikaa jäljellä 1 päivä", "Aikaa jäljellä {n} päivää"),
    pl("1 day left", "{n} days left"),
  ],
  "app.vatReminderToday": ["Eräpäivä on tänään", "It is due today"],
  "app.vatReminderOpen": ["Avaa ilmoitus", "Open the return"],
  "app.vatReminderHide": ["Piilota", "Hide"],
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
    "That file can’t be found any more. Choose where to save the books.",
  ],
  "io.shapeChanged": [
    "Kirjanpito tallennetaan nyt nimellä {f}, koska asetukset ja liitteet eivät mahdu CSV-tiedostoon. Valitse tallennuspaikka.",
    "The books are now saved as {f}, because their settings and attachments don’t fit in a CSV file. Choose where.",
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
  "io.passwordTitle": ["Kirjanpito on salattu", "These books are encrypted"],
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
    "These books are encrypted. The browser doesn’t keep the password, so it is asked once per session. Enter the file’s current password.",
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
  "newYear.assetPool": ["Menojäännös", "Undepreciated balance"],
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
    "Toistuvia tositteita ei ole. Voit tehdä sellaisen valitsemalla tositteella Toista säännöllisesti.",
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
  "bank.syncButton": ["Hae pankista", "Fetch from bank"],
  "bank.syncHint": [
    "Yhdistä pankkitili kerran. Tapahtumat tarkistetaan samassa näkymässä kuin tiliote.",
    "Link the bank account once. Transactions are reviewed in the same view as a statement.",
  ],
  "bank.syncToken": ["Välityspalvelimen tunnus", "Proxy token"],
  "bank.syncNext": ["Hae pankit", "Load banks"],
  "bank.syncConnect": ["Yhdistä pankki", "Connect bank"],
  "bank.syncPersonal": ["Henkilökohtainen tili", "Personal account"],
  "bank.syncFrom": ["Alkaen", "From"],
  "bank.syncFetch": ["Hae tapahtumat", "Fetch transactions"],
  "bank.syncFileName": [
    "Pankista, {n} tapahtumaa",
    "From the bank, {n} transactions",
  ],
  "bank.syncError": [
    "Pankkihaku epäonnistui: {msg}",
    "Bank fetch failed: {msg}",
  ],
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
  "bank.fieldIban": ["Vastapuolen tilinumero", "Other party's account"],
  "bank.makeRuleIban": [
    "Tee sääntö tilinumerolle {x}",
    "Make a rule for account {x}",
  ],
  "bank.makeRuleText": ["Tee sääntö: ”{x}”", "Make a rule: “{x}”"],
  "bank.ruleMade": [
    "Sääntö tehty: {x}. Muokkaa sitä kohdassa Asetukset → Säännöt.",
    "Rule made: {x}. Edit it at Settings → Rules.",
  ],
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
  "bank.colParty": ["Saaja/maksaja", "Counterparty"],
  "bank.colAmount": ["Summa", "Amount"],
  "bank.reconcileTitle": ["Täsmäytys", "Reconciliation"],
  "bank.reconcileAgrees": [
    "Tiliote ja kirjanpito täsmäävät",
    "The statement and the book agree",
  ],
  "bank.reconcileDiffers": ["Erotus {n}", "Difference {n}"],
  "bank.reconcileHint": [
    "Tiliotteen tapahtumat {from}–{to} verrattuna kirjanpidon pankkitilin kautta maksettuihin tositteisiin samoilta päiviltä, kirjattaviksi valitut rivit mukaan luettuina.",
    "The statement’s transactions {from}–{to} against the vouchers the book has paid through the bank on the same days, the rows chosen for booking included.",
  ],
  "bank.reconcileOpening": ["Alkusaldo {d}", "Opening balance {d}"],
  "bank.reconcileRows": ["Tiliotteen tapahtumat", "Statement transactions"],
  "bank.reconcileClosing": ["Loppusaldo {d}", "Closing balance {d}"],
  "bank.reconcileBook": ["Kirjanpidon maksut", "Payments in the book"],
  "bank.reconcileDifference": ["Erotus", "Difference"],
  "bank.reconcileGap": [
    "Alkusaldo ja tapahtumat eivät tuota loppusaldoa, erotus {n}. Tiedostosta puuttuu tapahtumia, tai osa ohitettiin.",
    "The statement’s transactions do not take the opening balance to the closing one: {n} apart. The file lacks transactions, or some were skipped.",
  ],
  "bank.reconcileRowsMissing": [
    pl(
      "1 tiliotteen rivi puuttuu kirjanpidosta eikä sitä ole valittu kirjattavaksi.",
      "{n} tiliotteen riviä puuttuu kirjanpidosta eikä niitä ole valittu kirjattaviksi."
    ),
    pl(
      "1 statement row is not in the book and is not chosen for booking.",
      "{n} statement rows are not in the book and are not chosen for booking."
    ),
  ],
  "bank.reconcileEntriesMissing": [
    "Kirjanpidossa maksettu näinä päivinä, mutta ei tiliotteella. Tarkista maksupäivä, tai oliko maksu käteinen tai toiselta tililtä.",
    "Paid in the book on these days but not on the statement. Check the payment date, or whether it was paid in cash or from another account.",
  ],
  "bank.reconcileEntry": ["Nro {v} · {d} · {s}", "No. {v} · {d} · {s}"],
  "bank.reconcileUseClosing": [
    "Käytä loppusaldoa {n} pankkitilin saldona",
    "Use the closing balance {n} as the bank balance",
  ],
  "bank.reconcileBalanceSet": [
    "Pankkitilin saldo päivitetty.",
    "Bank balance updated.",
  ],
  "bank.colAction": ["Toiminto", "Action"],
  "bank.colCategory": ["Luokka", "Category"],
  "bank.actionSkip": ["Ohita", "Skip"],
  "bank.actionNew": ["Uusi tosite", "New voucher"],
  "bank.actionPaid": ["Maksettu: {v}", "Paid: {v}"],
  "bank.statusPartial": [
    "Osamaksu laskulle: kirjataan vain saatu summa",
    "Part payment of an invoice: only the amount received is recorded",
  ],
  "bank.statusReference": [
    "Viitenumero täsmää laskuun, ja summa on sen avoin määrä.",
    "The reference number matches an invoice and the amount is what it still owes.",
  ],
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
  "bank.statusSeen": [
    "Tämä rivi on tarkistettu aiemmassa tuonnissa",
    "This row was reviewed in an earlier import",
  ],
  "bank.statusSuggested": [
    "Luokka aiemmista tositteista",
    "Category from earlier vouchers",
  ],
  "bank.statusGuessed": [
    "Luokka arvattu nimestä, tarkista",
    "Category guessed from the name, check it",
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
  "bank.readAnnounce": [
    pl(
      "Tiliotteelta luettu 1 rivi: {paid} maksua ja {added} uutta kirjattavaksi.",
      "Tiliotteelta luettu {n} riviä: {paid} maksua ja {added} uutta kirjattavaksi."
    ),
    pl(
      "1 row read from the statement: {paid} payments and {added} new to book.",
      "{n} rows read from the statement: {paid} payments and {added} new to book."
    ),
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
    "This is a bank statement, not a bookkeeping file. Open or start your books first, then use Import statement on the ledger.",
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
  "calendar.retentionVouchers": [
    "Vuoden {y} tositteiden säilytys päättyy",
    "Retention of the {y} vouchers ends",
  ],
  "calendar.bill": ["Lasku erääntyy: {x}", "Bill due: {x}"],
  "calendar.retentionBooks": [
    "Vuoden {y} kirjanpidon säilytys päättyy",
    "Retention of the {y} books ends",
  ],
  "calendar.done": ["Ilmoitettu", "Filed"],
  "calendar.today": ["Tänään", "Today"],
  "calendar.inDays": ["{n} pv:n päästä", "in {n} days"],
  "calendar.daysAgo": ["{n} pv sitten", "{n} days ago"],
  "calendar.setMonths": [
    "Valitse YEL-maksun ja ennakkoveron kuukaudet asetuksissa.",
    "Pick the YEL and advance tax months in settings.",
  ],
  "calendar.noMonths": ["Ei valittu", "None chosen"],
  "calendar.missingYel": [
    "YEL-maksun eräpäivät puuttuvat, koska kuukausia ei ole valittu.",
    "The YEL due dates are missing, because no months are chosen.",
  ],
  "calendar.missingAdvanceTax": [
    "Ennakkoveron eräpäivät puuttuvat, koska kuukausia ei ole valittu.",
    "The advance tax due dates are missing, because no months are chosen.",
  ],
  "calendar.pickMonths": ["Valitse kuukaudet", "Pick the months"],
  "calendar.past": [
    pl("Mennyt päivä (1)", "Menneet päivät ({n})"),
    pl("Past date (1)", "Past dates ({n})"),
  ],
  "calendar.payIntro": [
    "YEL-maksun ja ennakkoveron kuukaudet riippuvat eläkeyhtiön laskusta ja OmaVeron ennakkoveropäätöksestä, joten valitse ne itse. YEL erääntyy yleensä kuun 20. päivänä ja ennakkovero 23. päivänä. Viikonloppuna tai pyhänä päivä siirtyy seuraavaan arkipäivään.",
    "The months of the YEL contribution and advance tax depend on your pension company's invoice and your advance tax decision in MyTax, so pick them yourself. YEL usually falls due on the 20th and advance tax on the 23rd. On a weekend or holiday the date moves to the next working day.",
  ],
  "calendar.yelMonths": ["YEL-maksun kuukaudet", "YEL months"],
  "calendar.taxMonths": ["Ennakkoveron kuukaudet", "Advance tax months"],
  "calendar.note": [
    "Päivät ovat ohjeellisia. Tarkista ne OmaVerosta ja eläkeyhtiöltäsi.",
    "The dates are a guide. Check them in MyTax and with your pension company.",
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
    "Enter the amount from your advance tax decision in MyTax. The calendar splits it evenly over the chosen months. The rate is your own guess of the overall share of the income that goes to tax. Leave it empty for no estimate.",
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
    "The estimate is the year's profit (358) times your own rate. Earned income is taxed on a progressive scale, so the figure is only a guide. If the advance falls well short, you can ask for a higher one in MyTax.",
  ],
  "calendar.profileTitle": ["Veroarvion tiedot", "Tax estimate details"],
  "calendar.profileMunicipal": ["Kunnallisvero (%)", "Municipal tax (%)"],
  "calendar.profileChurch": [
    "Kirkollisvero (%), tyhjä, jos et kuulu kirkkoon",
    "Church tax (%), empty if none",
  ],
  "calendar.profileYel": [
    "Vahvistettu YEL-työtulo (€/v)",
    "Confirmed YEL work income (€/yr)",
  ],
  "calendar.profileStarter": [
    "Aloittavan yrittäjän 22 %:n alennus",
    "First-time entrepreneur’s 22% discount",
  ],
  "calendar.profileOther": [
    "Muut ansiotulot, kuten palkka (€/v)",
    "Other earned income, such as wages (€/yr)",
  ],
  "calendar.profileHint": [
    "Kunnallis- ja kirkollisveron prosentit ovat verokortissasi tai kuntasi sivuilla, YEL-työtulo eläkeyhtiön päätöksessä. Arviossa koko yritystulo verotetaan ansiotulona ja tehdään vain jokaiselle yrittäjälle kuuluvat vähennykset.",
    "The municipal and church tax rates are on your tax card or your municipality’s website, and the YEL work income is in your pension company’s decision. The estimate taxes all of the business income as earned income and makes only the deductions every entrepreneur gets.",
  ],
  "calendar.profileValue": ["Kunnallisvero {r} %", "Municipal tax {r}%"],
  "calendar.profileNote": [
    "Arvio näkyy kalenterissa. Yleiskatsaukseen saat sen kohdasta Muokkaa näkymää.",
    "The estimate shows in the calendar. Add it to the overview from Edit layout.",
  ],
  "calendar.profileNoYear": [
    "Vuoden {y} veroasteikkoa ei ole sovelluksessa.",
    "The app has no tax scale for {y}.",
  ],
  "calendar.sumScale": ["Veroarvio asteikolla", "Tax estimate on the scale"],
  "calendar.sumScaleNote": [
    "Arvio on vuoden {y} veroasteikolla laskettu vero, jonka tähänastinen voitto (358) tuo muiden ansiotulojesi päälle. Se on suuntaa antava. Jos ennakko jää selvästi alle, voit hakea ennakon korotusta OmaVerossa.",
    "The estimate is the tax the profit so far (358) adds on top of your other earned income, on the {y} scale. It is only a guide. If the advance falls well short, you can ask for a higher one in MyTax.",
  ],

  // --- Income tax and YEL estimate (§6.14) ---
  "taxEstimate.setUp": [
    "Lisää kunnallisveroprosentti asetuksissa, niin näet arvion verostasi ja YEL-maksusta.",
    "Add your municipal tax rate in settings to see an estimate of your tax and YEL contribution.",
  ],
  "taxEstimate.setUpAction": ["Lisää tiedot", "Add details"],
  "taxEstimate.noYear": [
    "Vuoden {y} veroasteikkoa ei ole sovelluksessa, joten arviota ei voi laskea.",
    "The app has no tax scale for {y}, so there is no estimate.",
  ],
  "taxEstimate.toDate": [
    "Vero tähänastisesta voitosta",
    "Tax on the profit so far",
  ],
  "taxEstimate.rate": ["{r} voitosta", "{r} of the profit"],
  "taxEstimate.pace": [
    "Koko vuosi samalla tahdilla",
    "Whole year at this pace",
  ],
  "taxEstimate.paid": ["Ennakkoveroa maksettu", "Advance tax paid"],
  "taxEstimate.setAside": ["Varattava vielä", "Still to set aside"],
  "taxEstimate.covered": ["Ennakot riittävät", "Advances cover it"],
  "taxEstimate.yel": ["YEL-maksu", "YEL contribution"],
  "taxEstimate.yelValue": ["{m} / kk · {r}", "{m} / month · {r}"],
  "taxEstimate.yelBelow": [
    "Työtulo on alle YEL-vakuutuksen alarajan {x}.",
    "The work income is below the YEL limit of {x}.",
  ],
  "taxEstimate.note": [
    "Arvio, ei verotuspäätös. Koko yritystulo verotetaan ansiotulona, ja vain perusvähennykset tehdään.",
    "An estimate, not the assessment. All business income is taxed as earned income, and only the basic deductions are made.",
  ],
  "taxEstimate.details": ["Erittely", "Breakdown"],
  "taxEstimate.state": ["Valtion tulovero", "State income tax"],
  "taxEstimate.municipal": ["Kunnallisvero", "Municipal tax"],
  "taxEstimate.church": ["Kirkollisvero", "Church tax"],
  "taxEstimate.health": [
    "Sairaanhoito- ja päivärahamaksu",
    "Health insurance contributions",
  ],
  "taxEstimate.credit": ["Työtulovähennys", "Earned income credit"],
  "taxEstimate.entrepreneur": [
    "Yrittäjävähennys tulosta",
    "Entrepreneur deduction from income",
  ],
  "taxEstimate.other": ["Muiden tulojen osuus", "Share of the other income"],

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
    "Verohallinnon tarkistus ({source}) ei mene läpi sovelluksen laskemilla luvuilla. Tarkista luvut OmaVerossa ennen kuin kopioit ne.",
    "Verohallinto's check ({source}) fails for the figures the app worked out. Check the figures in MyTax before you copy them.",
  ],
  "deductions.detailsTitle": [
    "Veroilmoituksen lisätiedot {y}",
    "Tax return details {y}",
  ],
  "deductions.detailsHint": [
    "Tiedot, joita kirjanpidosta ei voi laskea ja joita lomake 5 kysyy. Ne tallentuvat vuoden mukana.",
    "Details Form 5 asks for that the book cannot work out. They are saved with the year.",
  ],
  "deductions.detailsFiled": [
    "Vuosi on merkitty ilmoitetuksi, joten tietoja ei voi muuttaa.",
    "The year is marked as filed, so these cannot be changed.",
  ],
  "deductions.detailsCard": [
    "Veroilmoituksen lisätiedot",
    "Tax return details",
  ],
  "deductions.detailsCardInfo": [
    "Auton yksityiskäyttö, vähennyskelvoton korko ja lomakkeen valinnat. Näitä tarvitaan, kun lomake 5 viedään Ilmoitin.fi-tiedostona.",
    "Private use of a car, non-deductible interest and the form’s choices. Needed when Form 5 goes in as an Ilmoitin.fi file.",
  ],
  "deductions.detailsOpen": ["Muokkaa tietoja", "Edit details"],
  "deductions.detailsCarTitle": [
    "Auton yksityiskäyttö",
    "Private use of a car",
  ],
  "deductions.detailsCarHint": [
    "Jos auton kulut on vähennetty kirjanpidossa, yksityisajojen osuus tuloutetaan kohtaan 313. Anna ajot ja kulut, niin osuus lasketaan.",
    "If the car’s costs are deducted in the books, the private share is added back as income on 313. Enter the driving and the costs and the share is worked out.",
  ],
  "deductions.detailsKmBusiness": [
    "Elinkeinotoiminnan ajot (km)",
    "Business driving (km)",
  ],
  "deductions.detailsKmPrivate": ["Yksityisajot (km)", "Private driving (km)"],
  "deductions.detailsCarCosts": [
    "Kulut yhteensä (varsinaiset kulut + poisto tai leasing-vuokra)",
    "Total costs (running costs + depreciation or leasing)",
  ],
  "deductions.detailsVehicle": [
    "Käyttöomaisuuteen sisältyy",
    "The fixed assets include",
  ],
  "deductions.detailsVehicle0": ["Ei valintaa", "No choice"],
  "deductions.detailsVehicle1": ["Henkilöauto", "Car"],
  "deductions.detailsVehicle2": ["Pakettiauto", "Van"],
  "deductions.detailsVehicle3": ["Henkilö- ja pakettiauto", "Car and van"],
  "deductions.detailsVehicle4": ["Muita kulkuneuvoja", "Other vehicles"],
  "deductions.detailsBasis": [
    "Käyttötiedot perustuvat",
    "The details are based on",
  ],
  "deductions.detailsBasis0": ["Ei valintaa", "No choice"],
  "deductions.detailsBasis1": ["Ajopäiväkirjaan", "A driving log"],
  "deductions.detailsBasis2": ["Muuhun käyttöselvitykseen", "Other records"],
  "deductions.detailsPerKm": ["Kulut kilometriltä", "Cost per kilometre"],
  "deductions.detailsShare": [
    "Yksityisajojen osuus kuluista",
    "Private share of the costs",
  ],
  "deductions.detailsBookedCar": ["Kirjattu kohtaan 313", "Booked on 313"],
  "deductions.detailsBookCar": ["Kirjaa yksityiskäyttö", "Book private use"],
  "deductions.detailsCarDone": [
    "Auton yksityiskäyttö kirjattu.",
    "Private use of the car booked.",
  ],
  "deductions.detailsCarMismatch": [
    "Kirjattu summa ei vastaa laskettua. Muokkaa tai poista aiempi tosite, niin voit kirjata uudelleen.",
    "The booked amount differs from the calculated one. Edit or delete the earlier voucher to book again.",
  ],
  "deductions.detailsCarEntry": [
    "Auton yksityiskäyttö {y}: {k} km kaikista {t} km",
    "Private use of the car {y}: {k} km of {t} km",
  ],
  "deductions.detailsCarHeading": [
    "Auton yksityiskäyttö {y}",
    "Private use of the car {y}",
  ],
  "deductions.detailsCarRule": [
    "Yksityisajojen osuus on yksityisajot kerrottuna kuluilla kilometriä kohden (lomake 5, kohta 382).",
    "The private share is the private kilometres times the cost per kilometre (Form 5, field 382).",
  ],
  "deductions.detailsTotalKm": ["Kokonaiskilometrit", "Total kilometres"],
  "deductions.detailsInterestTitle": [
    "Vähennyskelvoton korko",
    "Non-deductible interest",
  ],
  "deductions.detailsInterestHint": [
    "Oma pääoma on negatiivinen, joten osa koroista ei ole vähennyskelpoista (EVL 18.2 §). OmaVero laskee summan itse, joten tarkista se sieltä.",
    "Net worth is negative, so part of the interest is not deductible (EVL 18.2 §). MyTax works the sum out itself, so check it there.",
  ],
  "deductions.detailsRate": ["Peruskorko + 1 % (%)", "Base rate + 1 % (%)"],
  "deductions.detailsRevaluations": [
    "Omaan pääomaan sisältyvät arvonkorotukset",
    "Revaluations included in equity",
  ],
  "deductions.detailsYearLoss": ["Tilikauden tappio", "Loss of the year"],
  "deductions.detailsPriorLosses": [
    "Aiempien vuosien tappiot, joiden kattamiseen ei ole voittovaroja",
    "Earlier losses with no profits to cover them",
  ],
  "deductions.detailsNegativeEquity": [
    "Negatiivinen oma pääoma",
    "Negative equity",
  ],
  "deductions.detailsAdjusted": [
    "Oikaistu negatiivinen oma pääoma",
    "Adjusted negative equity",
  ],
  "deductions.detailsDisallowed": [
    "Vähennyskelvoton korko",
    "Non-deductible interest",
  ],
  "deductions.detailsRateMissing": [
    "Anna korkokanta, jotta vähennyskelvoton korko voidaan laskea.",
    "Enter the rate so the non-deductible interest can be worked out.",
  ],
  "deductions.detailsOtherTitle": ["Muut valinnat", "Other choices"],
  "deductions.detailsReserve": ["Toimintavaraus", "Operating reserve"],
  "deductions.detailsLossToCapital": [
    "Tappio vähennettäväksi pääomatuloista",
    "Loss to deduct from capital income",
  ],
  "deductions.detailsSplit": [
    "Vaatimus jaettavasta yritystulosta",
    "Claim for the business income split",
  ],
  "deductions.detailsSplit0": ["Ei vaatimusta (20 %)", "No claim (20 %)"],
  "deductions.detailsSplit1": [
    "Pääomatulon enimmäismäärä 10 % nettovarallisuudesta",
    "Capital income at most 10 % of net worth",
  ],
  "deductions.detailsSplit2": [
    "Koko yritystulo ansiotuloa",
    "All business income as earned income",
  ],
  "deductions.detailsBadNumber": [
    "Anna kokonaisluku.",
    "Enter a whole number.",
  ],
  "deductions.detailsBadRate": [
    "Anna prosentti, esim. 3,15.",
    "Enter a percentage, such as 3.15.",
  ],
  "statement.fileTitle": ["Ilmoitin.fi-tiedosto", "Ilmoitin.fi file"],
  "statement.fileHint": [
    "Lataa lomake 5 tiedostona ja lähetä se Ilmoitin.fi-palvelussa. Kirjanpito ei lähetä mitään. Tarkista luvut tiedoston lataamisen jälkeen palvelun esikatselusta.",
    "Download Form 5 as a file and send it through Ilmoitin.fi. The app sends nothing. Check the figures in the service’s preview after you upload.",
  ],
  "statement.fileId": [
    "Henkilötunnus tai Y-tunnus (kohta 010)",
    "Personal ID or business ID (field 010)",
  ],
  "statement.fileIdHelp": [
    "Toiminimen veroilmoitus annetaan yleensä henkilötunnuksella. Tunnusta ei tallenneta mihinkään.",
    "A sole trader’s return is usually filed under the personal ID. The ID is not saved anywhere.",
  ],
  "statement.fileDownload": [
    "Lataa Ilmoitin.fi-tiedosto",
    "Download Ilmoitin.fi file",
  ],
  "statement.fileBlockNoBusinessId": [
    "Lisää Y-tunnus kohdassa Asetukset, Yrityksen tiedot.",
    "Add the business ID under Settings, Business details.",
  ],
  "statement.fileBlockBadId": [
    "Tunnus ei ole kelvollinen henkilötunnus tai Y-tunnus.",
    "The ID is not a valid personal ID or business ID.",
  ],
  "statement.fileBlockInterestRate": [
    "Anna peruskorko + 1 % Veroilmoituksen lisätiedoissa (Vähennykset-sivu).",
    "Enter the base rate + 1 % in the tax return details (Deductions page).",
  ],
  "statement.fileBlockChecks": [
    "Verohallinnon tarkistus ei mene läpi kohdissa {codes}. Korjaa luvut ennen tiedoston lataamista.",
    "Verohallinto’s check fails for {codes}. Fix the figures before you download the file.",
  ],
  "statement.fileWarnings": [
    "Ilmoitin näyttää nämä huomautukset, mutta ne eivät estä lähettämistä:",
    "Ilmoitin shows these remarks, but they do not stop you from sending:",
  ],
  "statement.fileWarning": [
    "Tarkistus {source}, kohdat {codes}",
    "Check {source}, fields {codes}",
  ],
  "balance.fromStocktake": [
    "Luku tulee varastolaskennasta, joten sitä muutetaan sivulla Varasto.",
    "The figure comes from the stocktake, so it is changed on the Inventory page.",
  ],
  "inventory.tab": ["Varasto", "Inventory"],
  "inventory.intro": [
    "Laske varasto vuoden viimeisenä päivänä ja anna jokaiselle riville määrä ja hankintameno. Summat ovat lomakkeen 5 kohdat 708 ja 709.",
    "Count the stock on the last day of the year and give each row a quantity and a cost. The totals are Form 5 fields 708 and 709.",
  ],
  "inventory.locked": [
    "Lomake 5 on merkitty ilmoitetuksi, joten lista on lukittu.",
    "Form 5 is marked as filed, so the list is locked.",
  ],
  "inventory.method": ["Hankintamenon laskutapa", "Cost method"],
  "inventory.methodAverage": ["Painotettu keskihinta", "Weighted average cost"],
  "inventory.methodFifo": [
    "FIFO, ensin ostettu myydään ensin",
    "FIFO, first bought is sold first",
  ],
  "inventory.methodHelp": [
    "Laskutapa vaikuttaa vain riveihin, joille on annettu ostoeriä. Rivi, jolla on vain yksi yksikköhinta, saa saman arvon kummallakin tavalla. Valitse sama tapa kaikkina vuosina.",
    "The method only matters for rows that have purchases. A row with a single unit cost gets the same value either way. Use the same method every year.",
  ],
  "inventory.goods": ["Tavarat", "Goods"],
  "inventory.materials": ["Aineet ja tarvikkeet", "Materials and supplies"],
  "inventory.statRows": ["Laskettuja rivejä", "Rows counted"],
  "inventory.statCost": ["Hankintameno", "Cost"],
  "inventory.statWriteDown": ["Alaskirjaus", "Write-down"],
  "inventory.statValue": ["Varaston arvo", "Value of the stock"],
  "inventory.statGoods": ["708 Tavarat", "708 Goods"],
  "inventory.statMaterials": [
    "709 Aineet ja tarvikkeet",
    "709 Materials and supplies",
  ],
  "inventory.statHint": [
    "Luku siirtyy automaattisesti sivulle Varat ja velat ja lomakkeelle 5.",
    "The figure carries over to the Assets and liabilities page and to Form 5 by itself.",
  ],
  "inventory.add": ["Lisää rivi", "Add a row"],
  "inventory.import": ["Tuo CSV", "Import CSV"],
  "inventory.export": ["Vie CSV", "Export CSV"],
  "inventory.pdf": ["Lataa inventaariolista", "Download the stocktake list"],
  "inventory.pdfFailed": [
    "Listaa ei voitu luoda.",
    "The list could not be made.",
  ],
  "inventory.startFromLast": [
    "Aloita vuoden {y} listasta",
    "Start from the {y} list",
  ],
  "inventory.clear": ["Tyhjennä lista", "Clear the list"],
  "inventory.clearTitle": [
    "Tyhjennetäänkö vuoden {y} lista?",
    "Clear the {y} list?",
  ],
  "inventory.clearMessage": [
    "Kaikki {n} riviä poistetaan vuoden {y} listasta. Tätä ei voi kumota.",
    "All {n} rows are removed from the {y} list. This cannot be undone.",
  ],
  "inventory.search": ["Hae nimellä tai koodilla", "Search by name or code"],
  "inventory.empty": [
    "Vuodelle {y} ei ole varastolaskentaa",
    "No stocktake for {y}",
  ],
  "inventory.emptyHint": [
    "Lisää rivejä yksi kerrallaan, tuo ne CSV-tiedostosta tai aloita edellisen vuoden listasta.",
    "Add rows one at a time, import them from a CSV file or start from last year's list.",
  ],
  "inventory.noMatch": [
    "Hakua vastaavia rivejä ei ole.",
    "No rows match the search.",
  ],
  "inventory.colName": ["Nimi", "Name"],
  "inventory.colSku": ["Koodi", "Code"],
  "inventory.colUnit": ["Yksikkö", "Unit"],
  "inventory.colKind": ["Tyyppi", "Type"],
  "inventory.colQuantity": ["Määrä", "Quantity"],
  "inventory.colUnitCost": ["Yksikköhinta", "Unit cost"],
  "inventory.colLower": ["Alempi arvo", "Lower value"],
  "inventory.colReason": ["Syy", "Reason"],
  "inventory.colCost": ["Hankintameno", "Cost"],
  "inventory.colWriteDown": ["Alaskirjaus", "Write-down"],
  "inventory.colValue": ["Arvo", "Value"],
  "inventory.kindGoods": ["Tavara", "Goods"],
  "inventory.kindMaterials": ["Aine", "Material"],
  "inventory.layers": ["Ostoerät ({n})", "Purchases ({n})"],
  "inventory.layersTitle": ["Ostoerät: {name}", "Purchases: {name}"],
  "inventory.layersHelp": [
    "Kirjaa ostoerät vanhimmasta uusimpaan. Laskutapa valitsee niistä ne yksiköt, jotka ovat vielä varastossa. Jos erät eivät kata koko määrää, loput lasketaan yksikköhinnalla.",
    "List the purchases from oldest to newest. The cost method picks the units still in stock from them. Units the purchases do not cover are priced at the unit cost.",
  ],
  "inventory.layerDate": ["Päivä", "Date"],
  "inventory.layerQuantity": ["Määrä", "Quantity"],
  "inventory.layerCost": ["Yksikköhinta", "Unit cost"],
  "inventory.addLayer": ["Lisää ostoerä", "Add a purchase"],
  "inventory.removeLayer": ["Poista ostoerä", "Remove the purchase"],
  "inventory.removeRow": ["Poista rivi {name}", "Remove the row {name}"],
  "inventory.newRow": ["Uusi tuote", "New product"],
  "inventory.lowerHelp": [
    "Tuotteen todennäköinen myynti- tai jälleenhankintahinta, kun se on hankintamenoa pienempi. Jätä tyhjäksi, jos arvo ei ole laskenut.",
    "The probable sale or replacement price of one unit when it is below cost. Leave it empty if the value has not fallen.",
  ],
  "inventory.problemNoName": ["Rivillä ei ole nimeä.", "The row has no name."],
  "inventory.problemNoCost": [
    "Rivillä on määrä mutta ei hintaa.",
    "The row has a quantity but no cost.",
  ],
  "inventory.problemLowerReason": [
    "Alemmalle arvolle ei ole annettu syytä.",
    "The lower value has no reason.",
  ],
  "inventory.importDone": ["{n} riviä tuotu", "{n} rows imported"],
  "inventory.importSkipped": [
    "{n} riviä ohitettiin, koska nimi, määrä tai hinta ei ollut luettavissa.",
    "{n} rows were skipped because the name, quantity or cost could not be read.",
  ],
  "inventory.importEmpty": ["Tiedosto on tyhjä.", "The file is empty."],
  "inventory.importColumns": [
    "Tiedostosta ei löytynyt Nimi- ja Määrä-sarakkeita.",
    "The file has no Name and Quantity columns.",
  ],
  "inventory.carried": [
    "{n} riviä siirretty vuoden {y} listasta",
    "{n} rows carried over from the {y} list",
  ],
  "inventory.reportTitle": ["Inventaariolista {y}", "Stocktake list {y}"],
  "inventory.reportDate": ["Varasto {d}", "Stock on {d}"],
  "inventory.reportForm5": ["Lomake 5", "Form 5"],
  "inventory.reportNote": [
    "Varasto arvostetaan hankintamenoon tai sitä alempaan todennäköiseen luovutushintaan tai jälleenhankintahintaan. Säilytä lista vuoden tositteiden kanssa.",
    "The stock is valued at cost or at a lower probable sale or replacement price. Keep the list with the year's vouchers.",
  ],
  "inventory.reportFooter": [
    "Lista on elinkeinonharjoittajan oma laskelma.",
    "The list is the trader's own calculation.",
  ],
  "statement.yearEndStockMissing": [
    "Tavaroita on ostettu {a}, mutta varastoa ei ole kirjattu vuoden lopussa",
    "Goods worth {a} were bought, but no stock is recorded at the year end",
  ],
  "statement.yearEndStockMissingSub": [
    "Jos varasto on tyhjä, tämä on oikein. Muuten laske varasto Varasto-sivulla, sillä se vaikuttaa kohtaan 333 ja lomakkeen 5 kohtiin 708 ja 709.",
    "If the stock is empty this is right. Otherwise count it on the Inventory page, since it changes line 333 and Form 5 fields 708 and 709.",
  ],
  "statement.yearEndStockTooHigh": [
    "Laskettu varasto {a} on suurempi kuin alkuvarasto ja ostot yhteensä, {b}",
    "The counted stock {a} is more than the opening stock and the purchases together, {b}",
  ],
  "statement.yearEndStockTooHighSub": [
    "Varastoa ei voi olla enempää kuin on ostettu. Tarkista määrät ja yksikköhinnat, tai kirjaa puuttuvat ostot.",
    "There cannot be more stock than was bought. Check the quantities and unit costs, or book the missing purchases.",
  ],
  "statement.yearEndStockRows": [
    pl(
      "Varastolistan 1 rivi vaatii huomiota",
      "Varastolistan {n} riviä vaatii huomiota"
    ),
    pl(
      "1 row of the stocktake needs attention",
      "{n} rows of the stocktake need attention"
    ),
  ],
  "statement.yearEndStockRowsSub": [
    "Riviltä puuttuu nimi tai hinta, tai alemmalle arvolle ei ole annettu syytä.",
    "A row has no name or cost, or a lower value has no reason.",
  ],
  "inventory.marginSales": ["Liikevaihto", "Revenue"],
  "inventory.marginPurchases": ["Ostot (333)", "Purchases (333)"],
  "inventory.marginCogs": [
    "Myytyjen tavaroiden hankintameno",
    "Cost of goods sold",
  ],
  "inventory.marginCogsHint": [
    "Alkuvarasto {o} plus ostot {p} miinus loppuvarasto {c}.",
    "Opening stock {o} plus purchases {p} less closing stock {c}.",
  ],
  "inventory.marginGross": ["Myyntikate", "Gross margin"],
  "inventory.marginGrossHint": [
    "Liikevaihto miinus myytyjen tavaroiden hankintameno.",
    "Revenue less the cost of goods sold.",
  ],
  "inventory.marginPercent": [
    "Myyntikate, prosenttia liikevaihdosta",
    "Gross margin as a share of revenue",
  ],
  "inventory.marginDays": ["Varaston riittävyys, päivää", "Days of stock"],
  "inventory.marginDaysHint": [
    "Keskivarasto jaettuna päivän myytyjen tavaroiden hankintamenolla.",
    "Average stock divided by one day of cost of goods sold.",
  ],
  "inventory.bookedChanged": [
    "Kirjattu varaston muutos on {a}, mutta nykyinen lista antaa {b}.",
    "The booked stock change is {a}, but the list now gives {b}.",
  ],
  "inbox.tab": ["Saapuneet", "Inbox"],
  "inbox.tabCount": [
    pl("Saapuneet (1)", "Saapuneet ({n})"),
    pl("Inbox (1)", "Inbox ({n})"),
  ],
  "inbox.boxLabel": ["Saapuneiden pudotuslaatikko", "Inbox drop box"],
  "inbox.boxTitle": ["Pudota kuitit tähän", "Drop receipts here"],
  "inbox.boxHint": [
    "Ne odottavat saapuneissa kirjaamista",
    "They wait in the inbox to be booked",
  ],
  "inbox.subtitle": [
    "Tositteet, jotka odottavat kirjaamista",
    "Receipts waiting to be booked",
  ],
  "inbox.add": ["Lisää tositteita", "Add receipts"],
  "inbox.camera": ["Ota kuva", "Take a photo"],
  "inbox.dropTitle": [
    "Pudota tositteita tähän tai valitse tiedostot",
    "Drop receipts here or choose files",
  ],
  "inbox.dropHint": [
    "Kuvat ja PDF:t odottavat täällä, kunnes kirjaat ne. Ne tallentuvat kirjanpidon tiedostoon.",
    "Images and PDFs wait here until you book them. They are saved in the bookkeeping file.",
  ],
  "inbox.emptyTitle": ["Ei odottavia tositteita", "No receipts waiting"],
  "inbox.emptyHint": [
    "Lisää kuitit ja laskut tänne heti, kun saat ne, ja kirjaa ne myöhemmin.",
    "Add receipts and bills here as they arrive, and book them later.",
  ],
  "inbox.listLabel": [
    pl("1 odottava tosite", "{n} odottavaa tositetta"),
    pl("1 receipt waiting", "{n} receipts waiting"),
  ],
  "inbox.added": [
    pl(
      "1 tosite lisättiin saapuneisiin.",
      "{n} tositetta lisättiin saapuneisiin."
    ),
    pl("1 receipt added to the inbox.", "{n} receipts added to the inbox."),
  ],
  "inbox.addedOn": ["Lisätty {d}", "Added {d}"],
  "inbox.addedUnknown": ["Lisäyspäivä ei tiedossa", "Date added unknown"],
  "inbox.nothingRead": [
    "Tietoja ei luettu. Täytä ne kirjatessa.",
    "Nothing read. Fill in the details when booking.",
  ],
  "inbox.book": ["Kirjaa", "Book"],
  "inbox.photoName": ["Kuva {d}", "Photo {d}"],
  "inbox.storeFailed": [
    "Tositetta ei voitu tallentaa selaimeen.",
    "The receipt could not be stored in the browser.",
  ],
  "inbox.missing": [
    "Tositteen tiedostoa ei löydy tästä selaimesta.",
    "The receipt’s file is not in this browser.",
  ],
  "inbox.deleteTitle": ["Poistetaanko tosite?", "Delete the receipt?"],
  "inbox.deleteMessage": [
    "”{x}” poistetaan saapuneista. Sitä ei ole kirjattu.",
    "“{x}” will be removed from the inbox. It has not been booked.",
  ],
  "inbox.deleteNamed": ["Poista {x}", "Delete {x}"],
  "inbox.deleted": [
    "Tosite poistettiin saapuneista.",
    "Receipt removed from the inbox.",
  ],
  "app.demoTitle": ["Esimerkkikirjanpito", "Demo books"],
  "app.demoHint": [
    "Kaikki luvut ja nimet ovat keksittyjä. Kokeile vapaasti.",
    "Every figure and name is made up. Try anything.",
  ],
  "app.demoStart": ["Aloita oma kirjanpito", "Start your own books"],
  "file.backupDays": [
    pl(
      "Muutoksia ei ole tallennettu tiedostoon 1 päivään.",
      "Muutoksia ei ole tallennettu tiedostoon {n} päivään."
    ),
    pl(
      "Changes have not been saved to a file for 1 day.",
      "Changes have not been saved to a file for {n} days."
    ),
  ],
  "file.backupNoFile": [
    pl(
      "Kirjanpito on ollut vain tässä selaimessa 1 päivän. Tallenna se tiedostoon.",
      "Kirjanpito on ollut vain tässä selaimessa {n} päivää. Tallenna se tiedostoon."
    ),
    pl(
      "The books have only been in this browser for 1 day. Save it to a file.",
      "The books have only been in this browser for {n} days. Save it to a file."
    ),
  ],
  "file.backupSave": ["Tallenna", "Save"],
  "file.backupDownload": ["Lataa kopio", "Download a copy"],
  "file.xlsx": [
    "Lataa vuosi {y} Excel-taulukkona",
    "Download {y} as a spreadsheet",
  ],
  "file.backupLater": ["Muistuta huomenna", "Remind me tomorrow"],
  "file.saves": ["Aiemmat tallennukset", "Earlier saves"],
  "snapshots.title": ["Aiemmat tallennukset", "Earlier saves"],
  "snapshots.hint": [
    "Selain pitää kirjanpidosta kopion aina, kun tiedosto avataan tai tallennetaan: {n} uusinta ja lisäksi kunkin päivän viimeisen {d} päivän ajalta. Palautettu kirjanpito on tallentamaton, kunnes tallennat sen. Kopiot ovat vain tässä selaimessa eivätkä korvaa tiedostoa.",
    "The browser keeps a copy of the books each time a file is opened or saved: the newest {n}, and the last of each day for {d} days. A restored book is unsaved until you save it. The copies live only in this browser and do not replace the file.",
  ],
  "snapshots.empty": [
    "Ei vielä aiempia tallennuksia. Ensimmäinen syntyy, kun avaat tai tallennat tiedoston.",
    "No earlier saves yet. The first is kept when you open or save a file.",
  ],
  "snapshots.colWhen": ["Aika", "When"],
  "snapshots.colWhat": ["Tapahtuma", "Event"],
  "snapshots.colBook": ["Kirjanpito", "Books"],
  "snapshots.colEntries": ["Tositteita", "Vouchers"],
  "snapshots.reasonOpen": ["Avattu", "Opened"],
  "snapshots.reasonSave": ["Tallennettu", "Saved"],
  "snapshots.reasonAutosave": ["Automaattitallennus", "Autosaved"],
  "snapshots.reasonRestore": ["Ennen palautusta", "Before a restore"],
  "snapshots.restore": ["Palauta", "Restore"],
  "snapshots.delete": ["Poista tallennus {d}", "Delete the save of {d}"],
  "snapshots.restoreTitle": [
    "Palautetaanko aiempi tallennus?",
    "Restore an earlier save?",
  ],
  "snapshots.restoreMessage": [
    "Kirjanpito palautetaan tilaan {d}. Nykyinen tila jää listaan, joten palautuksen voi perua.",
    "The books go back to how they were on {d}. The current state stays in the list, so the restore can be undone.",
  ],
  "snapshots.restoreMessageDirty": [
    "Kirjanpito palautetaan tilaan {d}. Tallentamattomat muutokset jäävät listaan nykyisenä tilana, joten palautuksen voi perua.",
    "The books go back to how they were on {d}. Your unsaved changes stay in the list as the current state, so the restore can be undone.",
  ],
  "snapshots.restored": [
    "Aiempi tallennus palautettu. Tallenna, niin se korvaa tiedoston.",
    "Earlier save restored. Save to write it over the file.",
  ],
  "snapshots.missing": [
    "Tallennusta ei löytynyt selaimesta.",
    "The save was not found in this browser.",
  ],
  "snapshots.keepFailed": [
    "Nykyistä kirjanpitoa ei voitu tallentaa selaimeen, joten palautusta ei tehty. Tallenna tai lataa kopio ensin.",
    "The current books could not be kept in the browser, so nothing was restored. Save or download a copy first.",
  ],
  "snapshots.deleteFailed": [
    "Tallennusta ei voitu poistaa.",
    "The save could not be deleted.",
  ],
  "palette.saves": ["Aiemmat tallennukset", "Earlier saves"],
} as const satisfies Dict
