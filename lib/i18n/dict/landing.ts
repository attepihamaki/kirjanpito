import { pl, type Dict } from "@/lib/i18n/t"

/**
 * Strings the landing page renders.
 *
 * Kept separate from the app dictionary because a flat `key: [fi, en]` object
 * cannot be tree-shaken: one combined module would ship both languages of all
 * ~300 keys into the statically rendered, SEO-critical landing bundle. Every
 * key lives in exactly one of the two modules; the app imports both.
 */
export const LANDING_DICT = {
  appName: ["Kirjanpito", "Bookkeeping"],
  language: ["Kieli", "Language"],
  theme: ["Teema", "Theme"],
  th_system: ["Järjestelmän teema", "System theme"],
  th_light: ["Vaalea teema", "Light theme"],
  th_dark: ["Tumma teema", "Dark theme"],
  // Deliberately inverted: in a Finnish UI the button offers English.
  switchLang: ["Switch to English", "Vaihda suomeksi"],
  importCsv: ["Avaa tiedosto", "Open file"],
  newBook: ["Uusi kirjanpito", "New bookkeeping"],
  dirty: ["Muutoksia, joita ei ole viety", "Changes not exported yet"],
  nEntries: [pl("1 kirjaus", "{n} kirjausta"), pl("1 entry", "{n} entries")],

  lp_title: [
    "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon.",
    "Sole trader bookkeeping that fits in a single file.",
  ],
  lp_lead: [
    "Kirjaa tulot ja kulut kuukausittain. Kirjanpito laskee arvonlisäveron ja tuloslaskelman valmiiksi veroilmoitusta varten, ja tiedot pysyvät omalla koneellasi CSV-tiedostossa.",
    "Record income and expenses month by month. The app works out your VAT and income statement for the tax return, and your data stays on your own computer in a CSV file.",
  ],
  lp_start: ["Aloita uusi kirjanpito", "Start new bookkeeping"],
  lp_open: ["Avaa tiedosto", "Open a file"],
  lp_continue: ["Jatka kirjanpitoa", "Continue bookkeeping"],
  lp_toApp: ["Avaa kirjanpito", "Open bookkeeping"],
  lp_drop: [
    "Pudota CSV- tai ZIP-tiedosto tähän tai valitse se koneeltasi",
    "Drop a CSV or ZIP file here or choose it from your computer",
  ],
  lp_dropSub: [
    "Avaa aiemmin viety kirjanpito ja jatka siitä, mihin jäit.",
    "Open bookkeeping you exported earlier and pick up where you left off.",
  ],

  lp_salesTax: ["Myynnin vero", "VAT on sales"],
  lp_buyTax: ["Ostojen vero", "VAT on purchases"],
  lp_due: ["Maksettava", "Payable"],

  lp_howT: [
    "Tositteesta veroilmoitukseen neljässä vaiheessa",
    "From receipt to tax return in four steps",
  ],
  lp_s1t: ["Avaa tai aloita", "Open or start"],
  lp_s1: [
    "Tuo edellinen CSV-tiedosto tai aloita tyhjästä. Tiliä tai rekisteröitymistä ei tarvita.",
    "Import your previous CSV file or start from scratch. No account or sign-up needed.",
  ],
  lp_s2t: ["Kirjaa tositteet", "Record receipts"],
  lp_s2: [
    "Syötä päivämäärä, summa ja luokka, ja liitä kuitti kuvana tai PDF:nä. ALV-osuus lasketaan heti.",
    "Enter the date, amount and category, and attach the receipt as an image or PDF. The VAT is worked out immediately.",
  ],
  lp_s3t: ["Tarkista luvut", "Check the figures"],
  lp_s3: [
    "ALV-laskelma kuukaudelle, neljännekselle tai vuodelle ja tuloslaskelma lomakkeen 5 rivijaolla.",
    "VAT return for a month, quarter or year, and an income statement laid out like form 5.",
  ],
  lp_s4t: ["Vie CSV-tiedostoksi", "Export to CSV"],
  lp_s4: [
    "Tallenna kirjanpito koneellesi. Tositteet pakataan samaan ZIP-tiedostoon vuoden ja kuukauden mukaan.",
    "Save your bookkeeping to your computer. Receipts are packed into the same ZIP file by year and month.",
  ],

  lp_featT: ["Mitä kirjanpito laskee puolestasi", "What it works out for you"],
  lp_f1t: ["Arvonlisävero", "VAT"],
  lp_f1: [
    "Myynnin ja ostojen vero verokannoittain sekä maksettava tai palautettava määrä. EU-myynnit ja käänteinen verotus omilla riveillään.",
    "VAT on sales and purchases by rate, and the amount payable or refundable. EU sales and reverse charge on their own lines.",
  ],
  lp_f2t: ["Tuloslaskelma", "Income statement"],
  lp_f2: [
    "Tuotot ja kulut veroilmoituksen tilinumeroilla 300–367 sekä elinkeinotoiminnan tulos tai tappio.",
    "Revenue and expenses using the tax return’s account numbers 300–367, and the business profit or loss.",
  ],
  lp_f3t: ["Kuukausiyhteenveto", "Monthly summary"],
  lp_f3: [
    "Tulot ja kulut kuukausittain kaaviona ja taulukkona, myynti verokannoittain ja kulut ryhmittäin.",
    "Income and expenses by month as a chart and tables, sales by VAT rate and expenses by group.",
  ],

  lp_privT: ["Ei tiliä, ei tietokantaa", "No account, no database"],
  lp_priv1: [
    "Kirjaukset tallentuvat vain tähän selaimeen ja siihen CSV-tiedostoon, jonka viet. Mitään ei lähetetä palvelimelle.",
    "Entries are stored only in this browser and in the CSV file you export. Nothing is sent to a server.",
  ],
  lp_priv2: [
    "Kirjaukset ovat tavallisessa CSV-tiedostossa, jonka voit avata Excelissä. Tositteet kulkevat sen mukana samassa ZIP-tiedostossa kansioissa vuoden ja kuukauden mukaan.",
    "Entries are in a plain CSV file you can open in Excel. Receipts travel with it in the same ZIP file, in folders by year and month.",
  ],

  lp_faqT: ["Kysyttyä", "Questions"],
  lp_q1: ["Kenelle kirjanpito on tarkoitettu?", "Who is it for?"],
  lp_a1: [
    "Toiminimiyrittäjälle, joka pitää yhdenkertaista kirjanpitoa ja ilmoittaa arvonlisäveron ja elinkeinotoiminnan tuloksen itse OmaVerossa.",
    "Sole traders who keep single-entry books and file their VAT and business income themselves in OmaVero.",
  ],
  lp_q2: [
    "Lähettääkö sovellus ilmoitukset Verohallinnolle?",
    "Does the app file returns with the Tax Administration?",
  ],
  lp_a2: [
    "Ei. Sovellus laskee luvut, jotka ilmoitat itse OmaVerossa. Tarkista ne ennen ilmoittamista.",
    "No. The app works out the figures, and you file them yourself in OmaVero. Check them before filing.",
  ],
  lp_q3: [
    "Voinko siirtää vanhan Excel-kirjanpitoni?",
    "Can I move my old Excel bookkeeping over?",
  ],
  lp_a3: [
    "Kyllä. Tallenna kirjaukset CSV-tiedostoksi sarakkeilla pvm, selite, tyyppi, tili, luokka, summa, alv ja syotto, ja tuo tiedosto. Sarake tosite on valinnainen.",
    "Yes. Save your entries as a CSV file with the columns pvm, selite, tyyppi, tili, luokka, summa, alv and syotto, then import it. The tosite column is optional.",
  ],
  lp_q4: [
    "Mitä tapahtuu, jos suljen selaimen?",
    "What happens if I close the browser?",
  ],
  lp_a4: [
    "Kirjaukset säilyvät tässä selaimessa, kunnes suljet tiedoston tai tyhjennät selaimen tiedot. Vie CSV-tiedosto säännöllisesti, niin kirjanpitosi on aina tallessa.",
    "Entries stay in this browser until you close the file or clear your browser data. Export the CSV regularly so your bookkeeping is always safe.",
  ],

  lp_endT: [
    "Aloita tämän kuun tositteista.",
    "Start with this month’s receipts.",
  ],
  lp_foot: [
    "Laskelmat eivät ole vero- tai kirjanpitoneuvontaa.",
    "The calculations are not tax or accounting advice.",
  ],

  // 404. Lives here rather than in the app dictionary: the page is served for
  // every unmatched URL, including ones outside /app.
  nf_badge: ["VIRHE", "ERROR"],
  nf_title: ["Tätä sivua ei löytynyt.", "This page could not be found."],
  nf_lead: [
    "Osoite ei vastaa mitään kirjanpidon sivua. Linkki voi olla vanha tai osoitteessa voi olla kirjoitusvirhe. Kirjauksesi ovat tallessa tässä selaimessa – pääset niihin etusivun kautta.",
    "That address doesn’t match any page in the app. The link may be old, or the address mistyped. Your entries are safe in this browser — you can get back to them from the home page.",
  ],
  nf_home: ["Takaisin etusivulle", "Back to the home page"],

  // Also used by the hero's decorative receipt and the mini statement.
  v_vat: ["ALV-laskelma", "VAT return"],
  r_income: ["TULO", "INCOME"],
  r_expense: ["KULU", "EXPENSE"],
  r_net: ["Veroton", "Net"],
  r_total: ["Yhteensä", "Total"],
  r_salesTax: ["Kasvattaa myynnin veroa", "Adds to VAT on sales"],
  c_vat: ["ALV", "VAT"],
  profit: ["358 Elinkeinotoiminnan tulos", "358 Business profit"],
  s_rc: ["Käänteinen", "Reverse charge"],
} as const satisfies Dict
