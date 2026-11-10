import { pl, type Dict } from "@/lib/i18n/t"

/**
 * Strings the landing page renders.
 *
 * Kept separate from the app dictionary because a flat `key: [fi, en]` object
 * cannot be tree-shaken: one combined module would ship both languages of all
 * ~300 keys into the statically rendered, SEO-critical landing bundle. Every
 * key lives in exactly one of the two modules; the app imports both.
 *
 * **Which module a key lives in is a bundling decision, not a naming one.**
 * Keys are `namespace.name` as in `dict/app.ts`, and a namespace may be split
 * across the two files: `nav.vat`, `receipt.*` and `statement.profit` are
 * here because the landing hero's decorative receipt and mini statement need
 * them, not because they belong to the landing page.
 */
export const LANDING_DICT = {
  "app.name": ["Kirjanpito", "Bookkeeping"],
  "app.documentTitle": [
    "Kirjanpito – toiminimen yhdenkertainen kirjanpito",
    "Bookkeeping – single-entry bookkeeping for sole traders",
  ],
  "app.language": ["Kieli", "Language"],
  "app.theme": ["Teema", "Theme"],
  /*
   * The theme button names the mode it switches *to*. There is no "system"
   * control: next-themes still defaults to the system theme (§11).
   */
  "app.themeLight": ["Vaalea teema", "Light theme"],
  "app.themeDark": ["Tumma teema", "Dark theme"],
  "file.open": ["Avaa tiedosto", "Open file"],
  "file.openElsewhere": [
    "Kirjanpito on auki toisessa välilehdessä.",
    "The bookkeeping is open in another tab.",
  ],
  "file.untitled": ["Uusi kirjanpito", "New bookkeeping"],
  "file.dirty": ["Tallentamattomia muutoksia", "Unsaved changes"],
  "ledger.entryCount": [
    pl("1 tosite", "{n} tositetta"),
    pl("1 voucher", "{n} vouchers"),
  ],

  "landing.title": [
    "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon.",
    "Sole trader bookkeeping that fits in a single file.",
  ],
  "landing.lead": [
    "Kirjaa tulot ja kulut kuukausittain. Kirjanpito laskee arvonlisäveron ja tuloslaskelman valmiiksi veroilmoitusta varten, ja tiedot pysyvät omalla koneellasi CSV-tiedostossa.",
    "Record income and expenses month by month. The app works out your VAT and income statement for the tax return, and your data stays on your own computer in a CSV file.",
  ],
  "landing.start": ["Aloita uusi kirjanpito", "Start new bookkeeping"],
  "landing.open": ["Avaa tiedosto", "Open a file"],
  "landing.demoLead": ["Haluatko ensin katsoa?", "Want to look around first?"],
  "landing.demo": ["Avaa esimerkkikirjanpito", "Open the demo bookkeeping"],
  "landing.continue": ["Jatka kirjanpitoa", "Continue bookkeeping"],
  "landing.toApp": ["Avaa kirjanpito", "Open bookkeeping"],
  "landing.drop": [
    "Pudota CSV- tai ZIP-tiedosto tähän tai valitse se koneeltasi",
    "Drop a CSV or ZIP file here or choose it from your computer",
  ],
  "landing.dropSub": [
    "Avaa aiemmin viety kirjanpito ja jatka siitä, mihin jäit.",
    "Open bookkeeping you exported earlier and pick up where you left off.",
  ],

  "landing.dropHere": [
    "Pudota CSV- tai ZIP-tiedosto avataksesi sen",
    "Drop a CSV or ZIP file to open it",
  ],
  "landing.dropNotBook": [
    "Tässä voi avata vain CSV- tai ZIP-tiedoston.",
    "Only a CSV or ZIP file can be opened here.",
  ],

  "landing.salesTax": ["Myynnin vero", "VAT on sales"],
  "landing.buyTax": ["Ostojen vero", "VAT on purchases"],
  "landing.due": ["Maksettava", "Payable"],

  "landing.howTitle": [
    "Tositteesta veroilmoitukseen neljässä vaiheessa",
    "From voucher to tax return in four steps",
  ],
  "landing.step1Title": ["Avaa tai aloita", "Open or start"],
  "landing.step1": [
    "Tuo edellinen CSV-tiedosto tai aloita tyhjästä. Tiliä tai rekisteröitymistä ei tarvita.",
    "Import your previous CSV file or start from scratch. No account or sign-up needed.",
  ],
  "landing.step2Title": ["Kirjaa tositteet", "Record vouchers"],
  "landing.step2": [
    "Syötä päivämäärä, summa ja luokka, ja liitä kuitti kuvana tai PDF:nä. ALV-osuus lasketaan heti.",
    "Enter the date, amount and category, and attach the receipt as an image or PDF. The VAT is worked out immediately.",
  ],
  "landing.step3Title": ["Tarkista luvut", "Check the figures"],
  "landing.step3": [
    "ALV-laskelma kuukaudelle, neljännekselle tai vuodelle ja tuloslaskelma lomakkeen 5 rivijaolla.",
    "VAT return for a month, quarter or year, and an income statement laid out like form 5.",
  ],
  "landing.step4Title": ["Tallenna tiedostoon", "Save to a file"],
  "landing.step4": [
    "Tallenna kirjanpito koneellesi. Liitteet pakataan samaan ZIP-tiedostoon vuoden ja kuukauden mukaan.",
    "Save your bookkeeping to your computer. Attachments are packed into the same ZIP file by year and month.",
  ],

  "landing.featTitle": [
    "Mitä kirjanpito laskee puolestasi",
    "What it works out for you",
  ],
  "landing.feat1Title": ["Arvonlisävero", "VAT"],
  "landing.feat1": [
    "Myynnin ja ostojen vero verokannoittain sekä maksettava tai palautettava määrä. EU-myynnit ja käänteinen verotus omilla riveillään.",
    "VAT on sales and purchases by rate, and the amount payable or refundable. EU sales and reverse charge on their own lines.",
  ],
  "landing.feat2Title": ["Tuloslaskelma", "Income statement"],
  "landing.feat2": [
    "Tuotot ja kulut veroilmoituksen tilinumeroilla 300–367 sekä elinkeinotoiminnan tulos tai tappio.",
    "Revenue and expenses using the tax return’s account numbers 300–367, and the business profit or loss.",
  ],
  "landing.feat3Title": ["Kuukausiyhteenveto", "Monthly summary"],
  "landing.feat3": [
    "Tulot ja kulut kuukausittain kaaviona ja taulukkona, myynti verokannoittain ja kulut ryhmittäin.",
    "Income and expenses by month as a chart and tables, sales by VAT rate and expenses by group.",
  ],

  "landing.privacyTitle": [
    "Ei tiliä, ei tietokantaa",
    "No account, no database",
  ],
  "landing.privacy1": [
    "Tositteet tallentuvat vain tähän selaimeen ja siihen tiedostoon, jonka tallennat. Mitään ei lähetetä palvelimelle.",
    "Vouchers are stored only in this browser and in the file you save. Nothing is sent to a server.",
  ],
  "landing.privacy2": [
    "Tositteet ovat tavallisessa CSV-tiedostossa, jonka voit avata Excelissä. Liitteet kulkevat niiden mukana samassa ZIP-tiedostossa kansioissa vuoden ja kuukauden mukaan.",
    "Vouchers are in a plain CSV file you can open in Excel. Attachments travel with it in the same ZIP file, in folders by year and month.",
  ],

  /*
   * Three rows of a real export, under the header the reader's language is
   * written with. The words follow the language and the numbers never do, so
   * the sample shows the file as it really comes out (§7.1).
   */
  "landing.csvSample": [
    "14;2026-10-10;Osto – K-Rauta – tarvikkeet;kulu;333;Ostot ja varastojen muutokset;100,00;25,5;brutto;liitteet/2026/10/…jpg\n" +
      "15;2026-10-28;Lasku 1005 – Mäkinen Rakennus Oy;tulo;300;Myynti – Suomi;1882,50;25,5;brutto;liitteet/2026/10/…pdf\n" +
      "16;2026-10-30;Pankin palvelumaksut;kulu;349;Muut rahoituskulut;8,50;0;brutto;",
    "14;2026-10-10;Purchase – K-Rauta – supplies;expense;333;Purchases and changes in inventory;100,00;25,5;gross;attachments/2026/10/…jpg\n" +
      "15;2026-10-28;Invoice 1005 – Mäkinen Rakennus Oy;income;300;Sales – Finland;1882,50;25,5;gross;attachments/2026/10/…pdf\n" +
      "16;2026-10-30;Bank service charges;expense;349;Other financial costs;8,50;0;gross;",
  ],

  "landing.faqTitle": ["Kysyttyä", "Questions"],
  "landing.q1": ["Kenelle kirjanpito on tarkoitettu?", "Who is it for?"],
  "landing.a1": [
    "Toiminimiyrittäjälle, joka pitää yhdenkertaista kirjanpitoa ja ilmoittaa arvonlisäveron ja elinkeinotoiminnan tuloksen itse OmaVerossa.",
    "Sole traders who keep single-entry books and file their VAT and business income themselves in OmaVero.",
  ],
  "landing.q2": [
    "Lähettääkö sovellus ilmoitukset Verohallinnolle?",
    "Does the app file returns with the Tax Administration?",
  ],
  "landing.a2": [
    "Ei. Sovellus laskee luvut, jotka ilmoitat itse OmaVerossa. Tarkista ne ennen ilmoittamista.",
    "No. The app works out the figures, and you file them yourself in OmaVero. Check them before filing.",
  ],
  "landing.q3": [
    "Voinko siirtää vanhan Excel-kirjanpitoni?",
    "Can I move my old Excel bookkeeping over?",
  ],
  "landing.a3": [
    "Kyllä. Tallenna tositteet CSV-tiedostoksi sarakkeilla date, description, type, account, category, amount, vat ja mode, ja tuo tiedosto. Sarakkeet voucher, receipts, settles, paid, buyer_vat ja eu_purchase ovat valinnaisia. Ilman tositenumeroita tositteet numeroidaan päivämäärän mukaan. Myös suomenkieliset sarakenimet (päivämäärä, selite ja niin edelleen) käyvät.",
    "Yes. Save your vouchers as a CSV file with the columns date, description, type, account, category, amount, vat and mode, then import it. The voucher, receipts, settles, paid, buyer_vat and eu_purchase columns are optional. Without voucher numbers, the vouchers are numbered by date. The Finnish column names (päivämäärä, selite and so on) work too.",
  ],
  "landing.q4": [
    "Mitä tapahtuu, jos suljen selaimen?",
    "What happens if I close the browser?",
  ],
  "landing.a4": [
    "Tositteet säilyvät tässä selaimessa, kunnes suljet tiedoston tai tyhjennät selaimen tiedot. Tallenna työsi tiedostoon säännöllisesti, niin kirjanpitosi on aina tallessa. Chromessa ja Edgessä sovellus kirjoittaa suoraan avaamaasi tiedostoon; muissa selaimissa lataat kopion. Tiedostoon kulkee myös muutosloki, joka kertoo sovelluksen käytöstä, mutta ei todista, ettei tiedostoa ole muokattu muuten.",
    "Vouchers stay in this browser until you close the file or clear your browser data. Save your work to a file regularly so your bookkeeping is always safe. In Chrome and Edge the app writes straight back to the file you opened; in other browsers you download a copy. The file also carries a change log, which records use of the app but does not prove the file was not edited in other ways.",
  ],
  "landing.q5": [
    "Mitä kirjanpidolle tapahtuu, jos lopetan toiminnan?",
    "What happens to the books if I close the business?",
  ],
  "landing.a5": [
    "Kirjanpito on säilytettävä samat ajat kuin toiminnan aikana: kirjanpidot 10 vuotta ja tositteet 6 vuotta. Lopettamisilmoituksessa (Y6-lomake YTJ:ssä) ilmoitetaan, kuka kirjanpitoaineistoa säilyttää ja missä (kirjanpitolaki 2:10). Tallenna viimeinen tiedosto ja pidä siitä kopio, jota et enää muokkaa.",
    "The books must be kept as long as while trading: the books 10 years and the vouchers 6 years. The closure notice (form Y6 in YTJ) names who keeps the bookkeeping material and where (Accounting Act 2:10). Save the last file and keep a copy of it that you no longer edit.",
  ],

  "landing.endTitle": [
    "Aloita tämän kuun tositteista.",
    "Start with this month’s vouchers.",
  ],
  "landing.footer": [
    "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa.",
    "The calculations are not tax or accounting advice.",
  ],
  "landing.privacyLink": ["Tietosuoja", "Privacy"],

  "privacy.badge": ["TIETOSUOJA", "PRIVACY"],
  "privacy.title": [
    "Kirjanpitosi ei lähde selaimesta",
    "Your books never leave the browser",
  ],
  "privacy.lead": [
    "Kirjanpito ei lähetä tietojasi minnekään. Kaikki tapahtuu tässä selaimessa ja tiedostoissa, jotka itse tallennat.",
    "Kirjanpito sends your data nowhere. Everything happens in this browser and in the files you save yourself.",
  ],
  "privacy.back": ["Takaisin etusivulle", "Back to the home page"],

  "privacy.whoTitle": ["Kuka tietoja pitää hallussaan", "Who holds the data"],
  "privacy.who1": [
    "Sovelluksen tekijä ei saa kirjanpitotietojasi eikä säilytä niistä kopiota. Sovelluksella ei ole tiliä, palvelinta eikä tietokantaa.",
    "The author of the app receives none of your bookkeeping and keeps no copy. There is no account, no server and no database.",
  ],
  "privacy.who2": [
    "Olet siis itse omien tietojesi rekisterinpitäjä. Tiedot ovat sinun koneellasi, ja vastaat myös niiden varmuuskopioista.",
    "You are therefore the controller of your own data. It sits on your machine, and the backups are your job too.",
  ],
  "privacy.who3": [
    "Sivuston tiedostot jaetaan GitHub Pagesista, joka näkee sivujen tavalliset latauspyynnöt. Kirjanpitosi ei kulje sen kautta.",
    "The site's files are served by GitHub Pages, which sees the ordinary requests for the pages. Your books do not pass through it.",
  ],

  "privacy.storeTitle": ["Mitä tallennetaan minne", "What is stored where"],
  "privacy.storeLead": [
    "Tiedot ovat kahdessa paikassa. Selain pitää työkopiota tallennusten välillä, ja varsinainen kopio on tiedosto, jonka tallennat.",
    "The data lives in two places. The browser keeps a working copy between saves, and the real copy is the file you save.",
  ],
  "privacy.lsTitle": ["Selaimen localStorage", "Browser localStorage"],
  "privacy.ls": [
    "Tositteet, kirjanpidon asetukset, yrityksen nimi ja Y-tunnus sekä muutosloki avaimella bookkeeping. Kieli ja teema omilla avaimillaan, lang ja theme. Pelkkä etusivun katsominen ei tallenna kirjanpitoa.",
    "The entries, the book's settings, the business name and ID and the change log under the key bookkeeping. Language and theme under their own keys, lang and theme. Only looking at the home page stores no bookkeeping.",
  ],
  "privacy.idbTitle": ["Selaimen IndexedDB", "Browser IndexedDB"],
  "privacy.idb": [
    "Liitetiedostot (bookkeeping-receipts), liitteistä luettu hakuteksti (bookkeeping-receipt-text) ja avatun tiedoston osoitin (bookkeeping-file). Hakuteksti on välimuisti, jota ei kirjoiteta tiedostoon.",
    "The receipt files (bookkeeping-receipts), the text read from receipts for search (bookkeeping-receipt-text) and the pointer to the opened file (bookkeeping-file). The search text is a cache and is never written to the file.",
  ],
  "privacy.cacheTitle": ["Selaimen välimuisti", "Browser cache"],
  "privacy.cache": [
    "Kun avaat kirjanpidon, selain tallentaa sovelluksen omat tiedostot (sivut, skriptit, fontit ja kuvakkeet), jotta sovellus toimii ilman verkkoyhteyttä ja sen voi asentaa. Välimuistissa ei ole kirjanpitoasi. Pelkkä etusivun katsominen ei tallenna sitäkään.",
    "When you open a bookkeeping, the browser stores the app's own files (pages, scripts, fonts and icons), so that the app works offline and can be installed. The cache holds none of your books. Only looking at the home page does not store it either.",
  ],
  "privacy.fileTitle": ["Tiedosto, jonka tallennat", "The file you save"],
  "privacy.file": [
    "ZIP-tiedosto, jossa on tositteet CSV:nä, asetukset (settings.json) ja liitteet. Valitset itse, minne se tallennetaan. Jos selain sallii, sovellus tallentaa suoraan samaan tiedostoon, ja automaattinen tallennus kirjoittaa sinne ilman kysymistä.",
    "A ZIP file holding the entries as CSV, the settings (settings.json) and the receipts. You choose where it goes. Where the browser allows it, the app saves straight back to the same file, and autosave writes there without asking.",
  ],
  "privacy.noneTitle": ["Mitä ei käytetä", "What is not used"],
  "privacy.none": [
    "Ei evästeitä, ei sessionStoragea, ei analytiikkaa eikä käyttäjäseurantaa.",
    "No cookies, no sessionStorage, no analytics and no tracking.",
  ],

  "privacy.netTitle": ["Verkkoyhteydet", "Network traffic"],
  "privacy.net1": [
    "Sivu ei lähetä kirjanpitoasi millekään palvelimelle. Sisällönsuojauskäytäntö (CSP) sallii yhteydet vain sivuston omaan osoitteeseen (connect-src 'self') eikä lomakkeiden lähetystä (form-action 'none'), joten tämä pätisi, vaikka sivulle pääsisi ulkopuolista koodia.",
    "The page sends your books to no server. The content security policy (CSP) allows connections to the site's own address only (connect-src 'self') and no form submission (form-action 'none'), so this would hold even if outside code got onto the page.",
  ],
  "privacy.net2": [
    "Skriptit, fontit ja kuvat tulevat sivuston omista tiedostoista. Ulkopuolisia CDN-palveluita ei käytetä.",
    "Scripts, fonts and images come from the site's own files. No outside CDN is used.",
  ],

  "privacy.secTitle": [
    "Salaus ja eheysleima",
    "Encryption and the integrity seal",
  ],
  "privacy.enc1": [
    "Tiedoston salaus on valinnainen (Asetukset, Yleiset, Salaus). Salattu ZIP käyttää AES-256-salausta, ja sen avaa myös 7-Zip. Salasanaa ei tallenneta mihinkään, vaan se pysyy muistissa, kunnes suljet tiedoston tai lataat sivun uudelleen. Unohtunutta salasanaa ei voi palauttaa.",
    "Encrypting the file is optional (Settings, General, Encryption). An encrypted ZIP uses AES-256 and opens in 7-Zip too. The password is stored nowhere. It stays in memory until you close the file or reload the page. A forgotten password cannot be recovered.",
  ],
  "privacy.enc2": [
    "Salaus ei peitä tiedostojen nimiä, kokoja eikä päivämääriä. Selaimen työkopio ei ole salattu, joten se ei suojaa sitä vastaan, joka käyttää samaa selainprofiilia.",
    "Encryption does not hide file names, sizes or dates. The browser's working copy is not encrypted, so it does not protect against someone using the same browser profile.",
  ],
  "privacy.seal": [
    "Jokainen tallennus kirjoittaa tiedostoon SHA-256-eheysleiman. Se paljastaa tiedoston vahingossa muuttuneen, mutta ei todista mitään, koska sen voi laskea uudelleen tahallisen muokkauksen jälkeen.",
    "Every save writes a SHA-256 integrity seal into the file. It reveals an accidental change, but proves nothing, because anyone who edits the file on purpose can recompute it.",
  ],

  "privacy.clearTitle": ["Tietojen poistaminen", "Removing the data"],
  "privacy.clear1": [
    "Valinta Sulje tiedosto tyhjentää selaimen työkopion. Voit myös poistaa sivuston tiedot selaimen asetuksista.",
    "Close file empties the browser's working copy. You can also clear the site's data in the browser's settings.",
  ],
  "privacy.clear2": [
    "Tallentamasi tiedosto säilyy omalla levyllä, ja sen poistaminen on sinun asiasi. Tallenna tiedosto ennen kuin tyhjennät selaimen tiedot, koska ennen ensimmäistä tallennusta selaimen työkopio on ainoa kopio.",
    "The file you saved stays on your disk, and deleting it is up to you. Save before you clear the browser's data, because until the first save the working copy is the only copy.",
  ],

  /*
   * 404. Lives here rather than in the app dictionary, because the page is
   * served for every unmatched URL, including ones outside /app.
   */
  "notFound.badge": ["VIRHE", "ERROR"],
  "notFound.title": [
    "Tätä sivua ei löytynyt.",
    "This page could not be found.",
  ],
  "notFound.lead": [
    "Osoite ei vastaa mitään kirjanpidon sivua. Linkki voi olla vanha tai osoitteessa voi olla kirjoitusvirhe. Tositteesi ovat tallessa tässä selaimessa – pääset niihin etusivun kautta.",
    "That address doesn’t match any page in the app. The link may be old, or the address mistyped. Your vouchers are safe in this browser — you can get back to them from the home page.",
  ],
  "notFound.home": ["Takaisin etusivulle", "Back to the home page"],

  // Also used by the hero's decorative receipt and the mini statement.
  "nav.vat": ["ALV-laskelma", "VAT return"],
  "receipt.income": ["TULO", "INCOME"],
  "receipt.expense": ["KULU", "EXPENSE"],
  "receipt.net": ["Veroton", "Net"],
  "receipt.total": ["Yhteensä", "Total"],
  "receipt.salesBadge": ["Kasvattaa myynnin veroa", "Adds to VAT on sales"],
  "ledger.colVat": ["ALV", "VAT"],
  "statement.profit": ["358 Elinkeinotoiminnan tulos", "358 Business profit"],
  "summary.reverseCharge": ["Käänteinen", "Reverse charge"],
} as const satisfies Dict
