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
  "app.language": ["Kieli", "Language"],
  "app.theme": ["Teema", "Theme"],
  /*
   * The theme button names the mode it switches *to*. There is no "system"
   * control: next-themes still defaults to the system theme (§11).
   */
  "app.themeLight": ["Vaalea teema", "Light theme"],
  "app.themeDark": ["Tumma teema", "Dark theme"],
  "file.open": ["Avaa tiedosto", "Open file"],
  "file.untitled": ["Uusi kirjanpito", "New bookkeeping"],
  "file.dirty": ["Muutoksia, joita ei ole viety", "Changes not exported yet"],
  "ledger.entryCount": [
    pl("1 kirjaus", "{n} kirjausta"),
    pl("1 entry", "{n} entries"),
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

  "landing.salesTax": ["Myynnin vero", "VAT on sales"],
  "landing.buyTax": ["Ostojen vero", "VAT on purchases"],
  "landing.due": ["Maksettava", "Payable"],

  "landing.howTitle": [
    "Tositteesta veroilmoitukseen neljässä vaiheessa",
    "From receipt to tax return in four steps",
  ],
  "landing.step1Title": ["Avaa tai aloita", "Open or start"],
  "landing.step1": [
    "Tuo edellinen CSV-tiedosto tai aloita tyhjästä. Tiliä tai rekisteröitymistä ei tarvita.",
    "Import your previous CSV file or start from scratch. No account or sign-up needed.",
  ],
  "landing.step2Title": ["Kirjaa tositteet", "Record receipts"],
  "landing.step2": [
    "Syötä päivämäärä, summa ja luokka, ja liitä kuitti kuvana tai PDF:nä. ALV-osuus lasketaan heti.",
    "Enter the date, amount and category, and attach the receipt as an image or PDF. The VAT is worked out immediately.",
  ],
  "landing.step3Title": ["Tarkista luvut", "Check the figures"],
  "landing.step3": [
    "ALV-laskelma kuukaudelle, neljännekselle tai vuodelle ja tuloslaskelma lomakkeen 5 rivijaolla.",
    "VAT return for a month, quarter or year, and an income statement laid out like form 5.",
  ],
  "landing.step4Title": ["Vie CSV-tiedostoksi", "Export to CSV"],
  "landing.step4": [
    "Tallenna kirjanpito koneellesi. Tositteet pakataan samaan ZIP-tiedostoon vuoden ja kuukauden mukaan.",
    "Save your bookkeeping to your computer. Receipts are packed into the same ZIP file by year and month.",
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
    "Kirjaukset tallentuvat vain tähän selaimeen ja siihen CSV-tiedostoon, jonka viet. Mitään ei lähetetä palvelimelle.",
    "Entries are stored only in this browser and in the CSV file you export. Nothing is sent to a server.",
  ],
  "landing.privacy2": [
    "Kirjaukset ovat tavallisessa CSV-tiedostossa, jonka voit avata Excelissä. Tositteet kulkevat sen mukana samassa ZIP-tiedostossa kansioissa vuoden ja kuukauden mukaan.",
    "Entries are in a plain CSV file you can open in Excel. Receipts travel with it in the same ZIP file, in folders by year and month.",
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
    "Kyllä. Tallenna kirjaukset CSV-tiedostoksi sarakkeilla pvm, selite, tyyppi, tili, luokka, summa, alv ja syotto, ja tuo tiedosto. Sarake tosite on valinnainen.",
    "Yes. Save your entries as a CSV file with the columns pvm, selite, tyyppi, tili, luokka, summa, alv and syotto, then import it. The tosite column is optional.",
  ],
  "landing.q4": [
    "Mitä tapahtuu, jos suljen selaimen?",
    "What happens if I close the browser?",
  ],
  "landing.a4": [
    "Kirjaukset säilyvät tässä selaimessa, kunnes suljet tiedoston tai tyhjennät selaimen tiedot. Vie CSV-tiedosto säännöllisesti, niin kirjanpitosi on aina tallessa.",
    "Entries stay in this browser until you close the file or clear your browser data. Export the CSV regularly so your bookkeeping is always safe.",
  ],

  "landing.endTitle": [
    "Aloita tämän kuun tositteista.",
    "Start with this month’s receipts.",
  ],
  "landing.footer": [
    "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa.",
    "The calculations are not tax or accounting advice.",
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
    "Osoite ei vastaa mitään kirjanpidon sivua. Linkki voi olla vanha tai osoitteessa voi olla kirjoitusvirhe. Kirjauksesi ovat tallessa tässä selaimessa – pääset niihin etusivun kautta.",
    "That address doesn’t match any page in the app. The link may be old, or the address mistyped. Your entries are safe in this browser — you can get back to them from the home page.",
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
