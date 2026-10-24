import { pl, type Dict } from "@/lib/i18n/t"

/**
 * Strings used inside the bookkeeping app. Keys the landing page also needs
 * live in `dict/landing.ts` instead — see the note there.
 */
export const APP_DICT = {
  appSub: [
    "Toiminimen yhdenkertainen kirjanpito",
    "Single-entry bookkeeping for sole traders",
  ],
  fiscal: ["Tilikausi", "Financial year"],
  home: ["Etusivu", "Home"],

  v_kirjanpito: ["Kirjanpito", "Bookkeeping"],
  v_tulos: ["Tuloslaskelma", "Income statement"],
  v_yhteenveto: ["Yhteenveto", "Summary"],
  v_asetukset: ["Asetukset", "Settings"],

  noFile: ["Ei avattua tiedostoa", "No file open"],
  clean: ["Kaikki muutokset viety", "All changes exported"],
  exportCsv: ["Vie tiedosto", "Export file"],
  importShort: ["Avaa", "Open"],
  exportShort: ["Vie", "Export"],
  closeShort: ["Sulje", "Close"],
  closeFile: ["Sulje tiedosto", "Close file"],
  closed: ["Tiedosto suljettu.", "File closed."],

  // --- Confirmations (§8.11) ---
  closeT: ["Suljetaanko tiedosto?", "Close the file?"],
  closeMsg: [
    "Kirjanpidossa on muutoksia, joita ei ole viety CSV-tiedostoon. Jos suljet tiedoston, ne menetetään.",
    "There are changes that haven’t been exported to CSV. If you close the file, they’ll be lost.",
  ],
  closeAnyway: ["Sulje viemättä", "Close without exporting"],
  delT: ["Poistetaanko kirjaus?", "Delete this entry?"],
  delMsg: ["Kirjaus ”{x}” poistetaan.", "The entry “{x}” will be deleted."],
  replaceT: ["Korvataanko avoin kirjanpito?", "Replace the open bookkeeping?"],
  replaceMsg: [
    "Avoimessa kirjanpidossa on muutoksia, joita ei ole viety. Tuotava tiedosto korvaa ne.",
    "The open bookkeeping has changes that haven’t been exported. The imported file will replace them.",
  ],
  replaceYes: ["Korvaa", "Replace"],
  clearT: ["Tyhjennetäänkö kirjaukset?", "Clear all entries?"],
  clearMsg: [
    "Kaikki kirjaukset poistetaan tästä selaimesta. Vie ne ensin CSV-tiedostoksi, jos haluat säilyttää ne.",
    "All entries will be removed from this browser. Export them to CSV first if you want to keep them.",
  ],
  clearYes: ["Tyhjennä", "Clear"],
  discardT: ["Hylätäänkö muutokset?", "Discard changes?"],
  discardYes: ["Hylkää muutokset", "Discard changes"],
  keepEditing: ["Jatka muokkausta", "Keep editing"],
  discardEntry: [
    "Kirjauksessa on tallentamattomia muutoksia. Jos suljet ikkunan, ne menetetään.",
    "This entry has unsaved changes. If you close the dialog, they’ll be lost.",
  ],
  discardCat: [
    "Olet täyttänyt uuden luokan tiedot, mutta luokkaa ei ole lisätty. Jos poistut sivulta, tiedot menetetään.",
    "You’ve filled in a new category but haven’t added it. If you leave this page, it will be lost.",
  ],

  // --- Ledger ---
  emptyTitle: ["Ei vielä kirjauksia", "No entries yet"],
  emptyBody: [
    "Lisää ensimmäinen tosite tai tuo aiemmat kirjaukset CSV-tiedostosta.",
    "Add your first receipt or import earlier entries from a CSV file.",
  ],
  startEmpty: ["Aloita tyhjästä", "Start from scratch"],
  newEntry: ["Uusi kirjaus", "New entry"],
  editEntry: ["Muokkaa kirjausta", "Edit entry"],
  copyEntry: ["Kopio kirjaus", "Copied entry"],
  wholeYear: ["Koko vuosi", "Whole year"],
  all: ["Kaikki", "All"],
  incomeNet: ["Tulot, veroton", "Income, excl. VAT"],
  expNet: ["Kulut, veroton", "Expenses, excl. VAT"],
  vatPay: ["Maksettava ALV", "VAT payable"],
  vatRef: ["Palautettava ALV", "VAT refundable"],
  search: ["Hae selitteestä tai luokasta", "Search description or category"],
  c_date: ["Päivämäärä", "Date"],
  c_desc: ["Selite", "Description"],
  c_cat: ["Luokka", "Category"],
  c_net: ["Veroton", "Net"],
  c_gross: ["Verollinen", "Gross"],
  actions: ["Toiminnot", "Actions"],
  noDesc: ["Ei selitettä", "No description"],
  noMatch: [
    "Ei kirjauksia valituilla suodattimilla.",
    "No entries match the filters.",
  ],
  noEntriesFor: ["Ei kirjauksia: {p}.", "No entries: {p}."],
  clearFilters: ["Tyhjennä suodattimet", "Clear filters"],
  tulot: ["Tulot", "Income"],
  kulut: ["Kulut", "Expenses"],
  catAll: ["Kaikki luokat", "All categories"],
  typeFilter: ["Tyyppi", "Type"],
  rowsPerPage: ["Rivejä sivulla", "Rows per page"],
  pageOf: ["Sivu {p} / {n}", "Page {p} of {n}"],
  first: ["Ensimmäinen sivu", "First page"],
  prev: ["Edellinen sivu", "Previous page"],
  next: ["Seuraava sivu", "Next page"],
  last: ["Viimeinen sivu", "Last page"],
  copyAsNew: ["Kopioi uudeksi", "Copy as new"],
  del: ["Poista", "Delete"],
  delEntry: ["Poista kirjaus", "Delete entry"],

  // --- Entry dialog ---
  f_date: ["Päivämäärä", "Date"],
  f_type: ["Tyyppi", "Type"],
  tulo: ["Tulo", "Income"],
  kulu: ["Kulu", "Expense"],
  f_desc: ["Tapahtuman selite", "Description"],
  f_descPh: ["Esim. Lasku 1006 – Asiakas Oy", "E.g. Invoice 1006 – Client Ltd"],
  f_cat: ["Luokka", "Category"],
  f_sum: ["Summa (€)", "Amount (€)"],
  f_vat: ["ALV %", "VAT %"],
  f_mode: ["Summa on", "Amount is"],
  gross: ["Verollinen", "Incl. VAT"],
  net: ["Veroton", "Excl. VAT"],
  cancel: ["Peruuta", "Cancel"],
  saveNew: ["Tallenna ja uusi", "Save and add another"],
  save: ["Tallenna", "Save"],
  r_desc: ["Selite", "Description"],
  r_deduct: ["Vähennetään ostojen verona", "Deducted as VAT on purchases"],
  r_noVat: ["Ei arvonlisäveroa", "No VAT"],
  e_date: ["Anna päivämäärä.", "Enter a date."],
  e_sum: ["Anna summa, esim. 124,50.", "Enter an amount, e.g. 124.50."],
  e_cat: ["Valitse luokka.", "Choose a category."],
  saved: ["Kirjaus tallennettu.", "Entry saved."],
  changesSaved: ["Muutokset tallennettu.", "Changes saved."],
  deleted: ["Kirjaus poistettu.", "Entry deleted."],
  unknownCat: ["Tuntematon luokka", "Unknown category"],

  // --- VAT return ---
  periodMonth: ["Kuukausi", "Month"],
  periodQ: ["Neljännesvuosi", "Quarter"],
  periodY: ["Vuosi", "Year"],
  period: ["Kausi", "Period"],
  yearN: ["Vuosi {y}", "Year {y}"],
  qN: ["{q}. neljännes {y}", "Q{q} {y}"],
  qOpt: ["{q}. neljännes ({a}–{b})", "Q{q} ({a}–{b})"],
  payTitle: ["Maksettava arvonlisävero", "VAT payable"],
  refTitle: ["Palautettava arvonlisävero", "VAT refundable"],
  vatCalc: [
    "Myynnin vero {a} − ostojen vähennettävä vero {b}",
    "VAT on sales {a} − deductible VAT on purchases {b}",
  ],
  salesVat: ["Myynnin arvonlisävero", "VAT on sales"],
  buyVat: ["Ostojen vähennettävä vero", "Deductible VAT on purchases"],
  rate: ["Verokanta", "Rate"],
  tax: ["Vero", "VAT"],
  total: ["Yhteensä", "Total"],
  otherRates: ["Muut verokannat", "Other rates"],
  otherSales: ["Muut ilmoitettavat myynnit", "Other sales to report"],
  euSales: [
    "Tavaroiden ja palveluiden myynti muihin EU-maihin",
    "Sales of goods and services to other EU countries",
  ],
  nonEu: ["Myynti EU:n ulkopuolelle", "Sales outside the EU"],
  rcSales: [
    "Rakentamispalveluiden ja metalliromun myynti (käänteinen verotus)",
    "Construction services and scrap metal sales (reverse charge)",
  ],
  vatNote: [
    "Ostojen 0 %:n kirjaukset (esim. palkat, YEL, pankkikulut) eivät vaikuta arvonlisäveroon, joten niitä ei näytetä vähennyksissä. Tarkista luvut ennen ilmoittamista OmaVerossa.",
    "Purchases at 0% (e.g. wages, YEL, bank fees) don’t affect VAT, so they aren’t shown as deductions. Check the figures before filing in OmaVero.",
  ],
  // An EU, non-EU or reverse-charge sale that carries a VAT rate: the rate is
  // ignored, which the prototype did silently.
  vatOnExemptSale: [
    "Kirjauksessa ”{x}” on verokanta, mutta luokka raportoidaan ilman myynnin veroa. Vero jätetään huomiotta.",
    "The entry “{x}” has a VAT rate, but its category is reported without VAT on sales. The VAT is ignored.",
  ],

  // --- Income statement ---
  isSub: [
    "Elinkeinotoiminnan veroilmoitusta (lomake 5) varten",
    "For the business tax return (form 5)",
  ],
  print: ["Tulosta", "Print"],
  revenue: ["Tuotot", "Revenue"],
  bizExp: ["Elinkeinotoiminnan kulut", "Business expenses"],
  profitLoss: ["Voitto tai tappio", "Profit or loss"],
  revTotal: ["Tuotot yhteensä", "Total revenue"],
  dedTotal: ["Vähennyskelpoiset kulut yhteensä", "Total deductible expenses"],
  loss: ["359 Elinkeinotoiminnan tappio", "359 Business loss"],
  isNote: [
    "Vähennyskelvottomat kulut (365–367, yhteensä {a}) näytetään, mutta niitä ei vähennetä tuloksesta. Summat ovat verottomia.",
    "Non-deductible expenses (365–367, total {a}) are shown but not deducted from the result. Amounts exclude VAT.",
  ],

  // --- Summary ---
  sumSub: [
    "Verottomat summat kuukausittain, {y}",
    "Amounts excl. VAT by month, {y}",
  ],
  incExp: ["Tulot ja kulut", "Income and expenses"],
  sales: ["Myynti", "Sales"],
  expenses: ["Kulut", "Expenses"],
  chartLabel: ["Tulot ja kulut kuukausittain", "Income and expenses by month"],
  mo: ["Kk", "Month"],
  salesTot: ["Myynti yht.", "Sales total"],
  otherInc: ["Muut tulot", "Other income"],
  expTot: ["Kulut yht.", "Expenses total"],
  tot: ["Yht.", "Total"],
  s_fi: ["Suomi {r}", "Finland {r}"],
  s_eu: ["EU", "EU"],
  s_other: ["Muut maat", "Other countries"],
  b_ostot: [
    "Ostot ja ulkopuoliset palvelut",
    "Purchases and external services",
  ],
  b_henk: ["Henkilöstökulut", "Personnel expenses"],
  b_poist: [
    "Poistot, edustuskulut ja vuokrat",
    "Depreciation, entertainment and rent",
  ],
  b_muut: ["Muut vähennyskelpoiset kulut", "Other deductible expenses"],
  b_rah: ["Rahoituskulut", "Financial expenses"],
  b_var: ["Varausten muutokset", "Changes in provisions"],
  b_vk: ["Vähennyskelvottomat kulut", "Non-deductible expenses"],

  // --- Settings ---
  setSub: [
    "Luokat ja oletusverokannat. Asetukset tallentuvat tähän selaimeen.",
    "Categories and default VAT rates. Settings are saved in this browser.",
  ],
  addCat: ["Lisää oma luokka", "Add a category"],
  line: ["Tuloslaskelman rivi", "Income statement line"],
  name: ["Nimi", "Name"],
  namePh: ["Esim. Työkalut", "E.g. Tools"],
  defVat: ["Oletus ALV %", "Default VAT %"],
  add: ["Lisää", "Add"],
  categories: ["Luokat", "Categories"],
  inUse: ["Käytössä", "Active"],
  account: ["Tili", "Account"],
  catSearch: ["Hae luokkia", "Search categories"],
  nCats: [pl("1 luokka", "{n} luokkaa"), pl("1 category", "{n} categories")],
  delCat: ["Poista luokka", "Delete category"],
  isActive: ["{c} käytössä", "{c} active"],
  data: ["Tiedot", "Data"],
  resetCats: ["Palauta oletusluokat", "Restore default categories"],
  clearAll: ["Tyhjennä kirjaukset", "Clear all entries"],
  clearHint: [
    "Vie kirjaukset CSV-tiedostoksi ennen tyhjentämistä.",
    "Export your entries to CSV before clearing them.",
  ],
  cleared: ["Kirjaukset tyhjennetty.", "Entries cleared."],
  catsReset: ["Oletusluokat palautettu.", "Default categories restored."],
  vatUpdated: [
    "Oletus-ALV päivitetty: {c} {r}.",
    "Default VAT updated: {c} {r}.",
  ],
  vatInvalid: [
    "Anna verokanta numerona, esim. 25,5.",
    "Enter the rate as a number, e.g. 25.5.",
  ],
  nameReq: ["Anna luokalle nimi.", "Give the category a name."],
  catAdded: ["Luokka lisätty: {c}.", "Category added: {c}."],

  // --- Import and export ---
  fileEmpty: ["Tiedosto on tyhjä.", "The file is empty."],
  missingCol: [
    "Tiedostosta puuttuu sarake: {c}. Odotettu otsikkorivi: {h}",
    "The file is missing a column: {c}. Expected header row: {h}",
  ],
  noRows: ["Yhtään riviä ei voitu lukea. {e}", "No rows could be read. {e}"],
  imported: [
    pl("Tuotiin 1 kirjaus.", "Tuotiin {n} kirjausta."),
    pl("Imported 1 entry.", "Imported {n} entries."),
  ],
  newCats: [" Uusia luokkia: {n}.", " New categories: {n}."],
  skipped: [
    " Ohitettu tai korjattu: {n} ({e}).",
    " Skipped or corrected: {n} ({e}).",
  ],
  rowErr: ["rivi {n}: {f}", "row {n}: {f}"],
  l_date: ["päivämäärä", "date"],
  l_type: ["tyyppi", "type"],
  l_sum: ["summa", "amount"],
  unknownRow: [
    "rivi {n}: tuntematon luokka ”{c}”, kirjattu luokkaan {d}",
    "row {n}: unknown category “{c}”, booked to {d}",
  ],
  newCatRow: [
    "rivi {n}: uusi luokka ”{c}” luotiin",
    "row {n}: created the new category “{c}”",
  ],
  readFail: ["Tiedoston lukeminen epäonnistui.", "Couldn’t read the file."],
  nothingExport: [
    "Ei vietävää. Lisää ensin kirjauksia.",
    "Nothing to export. Add some entries first.",
  ],
  exported: ["Viety tiedostoon {f}.", "Exported to {f}."],
  expCancel: ["Vienti peruttiin.", "Export cancelled."],
  expFail: [
    "Tiedoston tallennus ei onnistunut tässä näkymässä.",
    "Couldn’t save the file in this view.",
  ],
  demoLoaded: ["Esimerkkiaineisto ladattu.", "Sample data loaded."],
  dropHere: [
    "Pudota CSV- tai ZIP-tiedosto avataksesi sen",
    "Drop a CSV or ZIP file to open it",
  ],
  exportTitle: ["Vie kirjanpito", "Export bookkeeping"],
  fileName: ["Tiedoston nimi", "File name"],
  exportHint: [
    "Tiedosto sisältää kaikkien tilikausien kirjaukset.",
    "The file includes the entries of all financial years.",
  ],
  exportBtn: ["Vie tiedosto", "Export file"],
  expCsvOnly: [
    "Vie vain CSV-tiedosto ilman tositteita",
    "Export only the CSV file, without receipts",
  ],
  // The paths are written either way, so a re-import still knows the
  // receipts existed — it just marks them missing.
  expCsvOnlyHint: [
    "Tositteiden polut säilyvät CSV-tiedostossa, joten ne voi yhdistää myöhemmin uudelleen.",
    "Receipt paths are kept in the CSV, so they can be reconnected later.",
  ],
  expHintZip: [
    pl(
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston ja 1 tositteen kansiossa vuoden ja kuukauden mukaan.",
      "ZIP-tiedosto sisältää kirjanpidon CSV-tiedoston ja {n} tositetta kansioissa vuoden ja kuukauden mukaan."
    ),
    pl(
      "The ZIP file contains the bookkeeping CSV and 1 receipt in a folder by year and month.",
      "The ZIP file contains the bookkeeping CSV and {n} receipts in folders by year and month."
    ),
  ],
  zipFail: ["ZIP-tiedostoa ei voitu lukea.", "Couldn’t read the ZIP file."],
  zipNoCsv: [
    "ZIP-tiedostosta ei löytynyt CSV-tiedostoa.",
    "No CSV file was found in the ZIP file.",
  ],
  attsImported: [" Tositteita: {n}.", " Receipts: {n}."],
  attsMissing: [" Puuttuvia tositteita: {n}.", " Missing receipts: {n}."],
  exporting: ["Pakataan tositteita…", "Packing receipts…"],

  // --- Receipts ---
  att_t: ["Tositteet", "Receipts"],
  att_add: ["Lisää tosite", "Add receipt"],
  att_hint: [
    "Kuva tai PDF. Voit myös raahata tiedoston tähän.",
    "Image or PDF. You can also drag a file here.",
  ],
  att_rm: ["Poista tosite", "Remove receipt"],
  att_open: ["Avaa tosite", "Open receipt"],
  att_missing: ["Tiedosto puuttuu", "File missing"],
  att_n: [pl("1 tosite", "{n} tositetta"), pl("1 receipt", "{n} receipts")],
  att_bad: [
    "Vain kuvia ja PDF-tiedostoja voi liittää.",
    "Only images and PDF files can be attached.",
  ],
  att_noDb: [
    "Tositteiden tallennus ei ole käytettävissä tässä selaimessa.",
    "Saving receipts isn’t available in this browser.",
  ],
  att_dropHint: [
    "Avaa kirjaus, jos haluat liittää siihen tositteen.",
    "Open an entry to attach a receipt to it.",
  ],
  att_drop: [
    "Pudota tosite liittääksesi sen kirjaukseen",
    "Drop a receipt to attach it to the entry",
  ],

  // --- Receipt viewer ---
  v_prev: ["Edellinen tosite", "Previous receipt"],
  v_next: ["Seuraava tosite", "Next receipt"],
  v_pp: ["Edellinen sivu", "Previous page"],
  v_pn: ["Seuraava sivu", "Next page"],
  v_page: ["Sivu {p} / {n}", "Page {p} of {n}"],
  v_zi: ["Suurenna", "Zoom in"],
  v_zo: ["Pienennä", "Zoom out"],
  v_fit: ["Sovita näkymään", "Fit to view"],
  v_rot: ["Käännä", "Rotate"],
  v_dl: ["Tallenna alkuperäinen", "Save original"],
  v_close: ["Sulje", "Close"],
  v_loading: ["Ladataan…", "Loading…"],
  v_noPreview: [
    "Tätä tiedostoa ei voi esikatsella tässä selaimessa. Voit tallentaa alkuperäisen tiedoston.",
    "This file can’t be previewed in this browser. You can save the original file.",
  ],
  v_pdfFail: [
    "PDF-tiedoston avaaminen epäonnistui.",
    "Couldn’t open the PDF file.",
  ],
  v_nOf: ["Tosite {i} / {n}", "Receipt {i} of {n}"],
  saved_f: ["Tallennettu: {f}", "Saved: {f}"],
} as const satisfies Dict
