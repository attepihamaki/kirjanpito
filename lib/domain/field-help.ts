import type { Lang } from "@/lib/domain/types"

type Label = Readonly<Record<Lang, string>>

/** Where an explanation comes from. The pages are Verohallinto's, in Finnish. */
export interface HelpSource {
  url: string
  title: Label
}

/** A short explanation of one figure, with the page it was taken from. */
export interface HelpTopic {
  text: Label
  /** Absent only for a figure that is the app's own, such as the bank estimate. */
  source?: HelpSource
}

const VAT_RETURN: HelpSource = {
  url: "https://www.vero.fi/yritykset-ja-yhteisot/tietoa-yritysverotuksesta/arvonlisaverotus/milloin-ilmoitan-ja-maksan/n%C3%A4in-annat-arvonlis%C3%A4veroilmoituksen-omaverossa/",
  title: {
    fi: "vero.fi: Näin annat arvonlisäveroilmoituksen OmaVerossa",
    en: "vero.fi: How to file the VAT return in MyTax (in Finnish)",
  },
}

const FORM5: HelpSource = {
  url: "https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/liikkeen-tai-ammatinharjoittaja/veroilmoitus/veroilmoituksen-t%C3%A4ytt%C3%B6ohje/",
  title: {
    fi: "vero.fi: Veroilmoituksen täyttöohje, liikkeen- ja ammatinharjoittaja",
    en: "vero.fi: Filling instructions for the business tax return (in Finnish)",
  },
}

const salesByRate: HelpTopic = {
  text: {
    fi: "Kotimaan myynnin arvonlisävero verokannoittain. Yleinen verokanta on 25,5 % ja alennetut 13,5 % ja 10 %. Vanhat 24 % ja 14 % ilmoitetaan samoissa kentissä.",
    en: "The VAT on domestic sales by rate. The general rate is 25.5% and the reduced rates are 13.5% and 10%. The old 24% and 14% go in the same fields.",
  },
  source: VAT_RETURN,
}

/** Fields of the VAT return (§8.7), by code. */
const VAT_FIELDS: Record<string, HelpTopic> = {
  "301": salesByRate,
  "302": salesByRate,
  "303": salesByRate,
  "305": {
    text: {
      fi: "Vero tavaroista, jotka ostit toisen EU-maan arvonlisäverovelvolliselta (yhteisöhankinta). Myyjä ei laskuta Suomen veroa, vaan maksat sen itse.",
      en: "Tax on goods you bought from a VAT-registered seller in another EU country. The seller invoices no Finnish VAT, so you report it yourself.",
    },
    source: VAT_RETURN,
  },
  "306": {
    text: {
      fi: "Vero palveluista, jotka ostit toisen EU-maan arvonlisäverovelvolliselta. Maksat veron itse, ja se on yleensä myös vähennyskelpoinen.",
      en: "Tax on services you bought from a VAT-registered seller in another EU country. You report it yourself, and it is usually deductible too.",
    },
    source: VAT_RETURN,
  },
  "304": {
    text: {
      fi: "Maahantuonnin arvonlisävero eli vero tavaroista, jotka toit EU:n ulkopuolelta.",
      en: "VAT on goods you imported from outside the EU.",
    },
    source: VAT_RETURN,
  },
  "318": {
    text: {
      fi: "Vero rakentamispalvelun ja metalliromun ostoista, joissa ostaja on verovelvollinen (käännetty verovelvollisuus). Myyjä ei lisää laskulle veroa.",
      en: "Tax on purchases of construction services and scrap metal, where the buyer is liable for the tax (reverse charge). The seller adds no VAT to the invoice.",
    },
    source: VAT_RETURN,
  },
  "307": {
    text: {
      fi: "Kaikkien vähennyskelpoisten verojen summa: ostojen vero sekä itse ilmoitetut EU-ostojen, tuonnin ja käännetyn verovelvollisuuden verot.",
      en: "The total of all deductible tax: the VAT on purchases, plus the tax you report yourself on EU purchases, imports and reverse-charge purchases.",
    },
    source: VAT_RETURN,
  },
  "308": {
    text: {
      fi: "Myynnin vero miinus vähennettävä vero. Positiivinen luku maksetaan, negatiivinen palautetaan, ja palautuksen eteen tulee miinus.",
      en: "Tax on sales minus deductible tax. A positive amount is paid, a negative one is refunded and is entered with a minus sign.",
    },
    source: VAT_RETURN,
  },
  "309": {
    text: {
      fi: "Kaikki arvonlisäverottomat myynnit Suomessa ja ulkomailla, esimerkiksi vienti EU:n ulkopuolelle. Terveydenhuollon kaltaisia verottomia myyntejä, joiden ostojen veroa ei saa vähentää, ei lasketa tähän.",
      en: "All sales without VAT, in Finland and abroad, for example exports outside the EU. Exempt sales with no deduction for purchase VAT, such as healthcare, do not belong here.",
    },
    source: VAT_RETURN,
  },
  "311": {
    text: {
      fi: "Tavaramyynnit arvonlisäverovelvollisille ostajille muissa EU-maissa (yhteisömyynti). Lasku tehdään ilman veroa, ja myynnit ilmoitetaan myös yhteenvetoilmoituksella.",
      en: "Sales of goods to VAT-registered buyers in other EU countries. The invoice carries no VAT, and the sales also go on the EC Sales List.",
    },
    source: VAT_RETURN,
  },
  "312": {
    text: {
      fi: "Palvelumyynnit muihin EU-maihin, kun palvelu verotetaan ostajan maassa. Ilmoita myynnit myös yhteenvetoilmoituksella.",
      en: "Sales of services to other EU countries that are taxed in the buyer's country. These also go on the EC Sales List.",
    },
    source: VAT_RETURN,
  },
  "313": {
    text: {
      fi: "Muista EU-maista ostettujen tavaroiden verraton hankintahinta, siis laskun summa ilman veroa.",
      en: "The price without tax of goods bought from other EU countries, which is the invoice total.",
    },
    source: VAT_RETURN,
  },
  "314": {
    text: {
      fi: "Muista EU-maista ostettujen palvelujen yhteismäärä ilman veroa.",
      en: "The total, without tax, of services bought from other EU countries.",
    },
    source: VAT_RETURN,
  },
  "310": {
    text: {
      fi: "EU:n ulkopuolelta tuotujen tavaroiden yhteismäärä eli veron peruste.",
      en: "The total value of goods imported from outside the EU, which is the tax base.",
    },
    source: VAT_RETURN,
  },
  "319": {
    text: {
      fi: "Rakentamispalvelun ja metalliromun myynnit, joissa ostaja maksaa veron (käännetty verovelvollisuus). Laskulla ei ole veroa.",
      en: "Sales of construction services and scrap metal where the buyer pays the tax (reverse charge). The invoice carries no VAT.",
    },
    source: VAT_RETURN,
  },
  "320": {
    text: {
      fi: "Rakentamispalvelun ja metalliromun ostojen hankintahinnat ilman veroa.",
      en: "The purchase prices, without tax, of construction services and scrap metal you bought.",
    },
    source: VAT_RETURN,
  },
}

const dividends: HelpTopic = {
  text: {
    fi: "Julkisesti noteeratun yhtiön osingosta verotetaan 85 % ja muun yhtiön osingosta 75 %. Ilmoita osingot kokonaan. OmaVero laskee veronalaisen osuuden.",
    en: "85% of a dividend from a listed company is taxable, and 75% of one from any other company. Report the dividends in full. MyTax works out the taxable share.",
  },
  source: FORM5,
}

const travel: HelpTopic = {
  text: {
    fi: "Lisävähennys on vuoden verovapaa määrä miinus kirjanpidossa jo vähennetyt matka- tai autokulut. Se on nolla, jos kulut ovat suuremmat.",
    en: "The additional deduction is the year's tax-free amount minus the travel or car costs already deducted in the books. It is zero when the costs are higher.",
  },
  source: FORM5,
}

const nonDeductible: HelpTopic = {
  text: {
    fi: "Kirjattuja kuluja, joita ei saa vähentää verotuksessa, esimerkiksi maksetut verot, sakot ja veronkorotukset. Ne eivät pienennä tulosta.",
    en: "Booked costs that tax does not allow you to deduct, such as taxes paid, fines and tax surcharges. They do not reduce the result.",
  },
  source: FORM5,
}

/** Fields of Form 5 (§8.8), by code. */
const FORM5_FIELDS: Record<string, HelpTopic> = {
  "300": {
    text: {
      fi: "Liiketoiminnan myynnit ilman arvonlisäveroa. Vähennä myyntiin perustuvat verot ja asiakkaille annetut alennukset.",
      en: "Sales from the business without VAT. Deduct sales-based taxes and discounts given to customers.",
    },
    source: FORM5,
  },
  "316": {
    text: {
      fi: "Veronalaiset tuotot yhteensä. Verovapaat tuotot (317) ja osinkojen verovapaa osuus eivät kuulu summaan.",
      en: "Total taxable income. Tax-exempt income (317) and the tax-exempt share of dividends are not in it.",
    },
  },
  "317": {
    text: {
      fi: "Tuloslaskelmassa olevat verovapaat tuotot, esimerkiksi palautetut liittymismaksut. Älä laske niitä muihin veronalaisiin tuottoihin.",
      en: "Tax-exempt income in the income statement, such as refunded connection fees. Do not count it in other taxable income.",
    },
    source: FORM5,
  },
  "319": dividends,
  "320": dividends,
  "321": dividends,
  "322": dividends,
  "327": {
    text: {
      fi: "Osuuskunnan ylijäämästä on veronalaista 25 % ensimmäisistä 5 000 eurosta ja 75 % sen ylittävästä osasta. Huojennuksen saa kerran vuodessa henkilöä kohti.",
      en: "25% of a co-operative surplus is taxable up to 5,000 euro, and 75% of the rest. The relief is one per person per year.",
    },
    source: FORM5,
  },
  "335": {
    text: {
      fi: "Palkat ja palkkiot, jotka maksoit yrityksen työntekijöille, sekä eläke- ja sosiaaliturvakulut. Puolisolle ja alle 14-vuotiaalle lapselle maksettua palkkaa ei saa vähentää.",
      en: "Wages and fees paid to the business's employees, plus pension and social security costs. Wages paid to a spouse or a child under 14 are not deductible.",
    },
    source: FORM5,
  },
  "394": {
    text: {
      fi: "Verovuotta edeltäneiden 12 kuukauden aikana maksetut palkat, joista toimitetaan ennakonpidätys. Niistä 30 % lisätään nettovarallisuuteen.",
      en: "Wages with tax withholding paid in the 12 months before the year's end. 30% of them is added to net worth.",
    },
    source: FORM5,
  },
  "337": {
    text: {
      fi: "Poistot kirjanpidossa. Irtaimen omaisuuden menojäännöksestä saa vähentää enintään 25 % vuodessa, ja enintään 1 200 euron menojäännöksen saa poistaa kokonaan.",
      en: "Depreciation in the books. At most 25% of the remaining cost of movable assets may be deducted a year, and a remaining cost of 1,200 euro or less may be written off in full.",
    },
    source: FORM5,
  },
  "338": {
    text: {
      fi: "Poistojen enimmäismäärä, jonka verotus sallii. Kirjanpidon poisto vähennetään tähän määrään asti.",
      en: "The most depreciation that tax allows. The depreciation in the books is deducted up to this amount.",
    },
    source: FORM5,
  },
  "341": {
    text: {
      fi: "Edustuskulut asiakkaille ja yhteistyökumppaneille. Kirjaa koko summa, sillä vähennyskelpoista on vain 50 %.",
      en: "Entertainment costs for clients and partners. Enter the whole amount, since only 50% is deductible.",
    },
    source: FORM5,
  },
  "342": {
    text: {
      fi: "Edustuskulujen vähennyskelpoinen osa, enintään puolet kohdan 341 summasta.",
      en: "The deductible part of entertainment costs, at most half of the amount in 341.",
    },
    source: FORM5,
  },
  "355": {
    text: {
      fi: "Vähennyskelpoiset kulut yhteensä. Vähennyskelvottomat kulut (365, 366 ja 367) eivät kuulu summaan.",
      en: "Total deductible expenses. Non-deductible expenses (365 to 367) are not in it.",
    },
  },
  "358": {
    text: {
      fi: "Elinkeinotoiminnan tulos: veronalaiset tuotot miinus vähennyskelpoiset kulut. Tappion voi vahvistaa elinkeinotoiminnan tappioksi.",
      en: "The business profit: taxable income minus deductible expenses. A loss can be confirmed as a business loss.",
    },
    source: FORM5,
  },
  "359": {
    text: {
      fi: "Elinkeinotoiminnan tappio: kulut ovat suuremmat kuin tuotot. Tappion voi vahvistaa elinkeinotoiminnan tappioksi ja vähentää myöhemmistä tuloista.",
      en: "The business loss: expenses are higher than income. A loss can be confirmed as a business loss and deducted from later income.",
    },
    source: FORM5,
  },
  "364": travel,
  "388": travel,
  "392": travel,
  "365": nonDeductible,
  "366": nonDeductible,
  "367": nonDeductible,
}

/** Headings and figures that are not form fields, by id. */
const VIEW_TOPICS: Record<string, HelpTopic> = {
  "vat.sales": {
    text: {
      fi: "Myynnin arvonlisävero verokannoittain. Summa on kenttien 301, 302 ja 303 verot yhteensä.",
      en: "VAT on sales by rate. The total is the tax in fields 301 to 303.",
    },
    source: VAT_RETURN,
  },
  "vat.purchases": {
    text: {
      fi: "Ostojen vähennettävä arvonlisävero. Vero on vähennyskelpoinen vain, jos osto liittyy verolliseen toimintaan. Nollaverokannan ostoissa ei ole veroa.",
      en: "Deductible VAT on purchases. The tax is deductible only when the purchase belongs to taxable activity. Purchases at 0% carry no tax.",
    },
    source: VAT_RETURN,
  },
  "vat.otherSales": {
    text: {
      fi: "Myynnit, joista ei makseta Suomen veroa mutta jotka ilmoitetaan silti: EU-myynnit, myynnit EU:n ulkopuolelle ja käännetyn verovelvollisuuden myynnit.",
      en: "Sales that carry no Finnish VAT but are still reported: EU sales, sales outside the EU and reverse-charge sales.",
    },
    source: VAT_RETURN,
  },
  "vat.euPurchases": {
    text: {
      fi: "Ostot, joiden veron ilmoitat itse: EU-ostot, tuonti EU:n ulkopuolelta ja käännetyn verovelvollisuuden ostot. Vero on yleensä myös vähennyskelpoinen.",
      en: "Purchases whose tax you report yourself: EU purchases, imports from outside the EU and reverse-charge purchases. The tax is usually deductible too.",
    },
    source: VAT_RETURN,
  },
  "overview.result": {
    text: {
      fi: "Tulos on tuotot miinus vähennyskelpoiset kulut ilman arvonlisäveroa. Se on sama luku kuin veroilmoituksen kenttä 358 tai 359.",
      en: "The result is income minus deductible expenses, without VAT. It is the same figure as field 358 or 359 of the tax return.",
    },
    source: FORM5,
  },
  "overview.vat": {
    text: {
      fi: "Seuraava ilmoitus, jota et ole merkinnyt tehdyksi. Ilmoitus tehdään myös silloin, kun verokaudella ei ollut toimintaa (nollailmoitus).",
      en: "The next return you have not marked as filed. A return is filed even when the period had no activity (a nil return).",
    },
    source: VAT_RETURN,
  },
  "overview.bank": {
    text: {
      fi: "Sovellus ei näe pankkiasi. Arvio on kirjoittamasi saldo plus sen jälkeen maksetut tositteet. Kirjaamattomat verot ja muut maksut eivät ole mukana.",
      en: "The app cannot see your bank. The estimate is the balance you typed in plus the vouchers paid since. Taxes and other payments that are not booked are missing.",
    },
  },
  "ledger.net": {
    text: {
      fi: "Veroton hinta eli summa ilman arvonlisäveroa. Tuloslaskelma ja lomake 5 lasketaan tästä summasta.",
      en: "The price without VAT. The income statement and Form 5 are calculated from this amount.",
    },
    source: FORM5,
  },
  "ledger.vat": {
    text: {
      fi: "Tositteen arvonlisävero. Myynnistä se on veroa, jonka tilität Verohallinnolle, ja ostosta veroa, jonka saat yleensä vähentää. Osittain vähennettävässä ostossa vähennys on vain yrityksen osuus.",
      en: "The VAT on the voucher. On a sale it is tax you pay to Verohallinto, and on a purchase it is tax you can usually deduct. On a partly deductible purchase only the business share is deducted.",
    },
    source: VAT_RETURN,
  },
  "ledger.gross": {
    text: {
      fi: "Verollinen hinta eli summa, jonka tositteella maksetaan tai saadaan. Se on veroton summa plus arvonlisävero.",
      en: "The price with VAT, which is the amount paid or received on the voucher. It is the net amount plus VAT.",
    },
  },
  "ledger.category": {
    text: {
      fi: "Luokka päättää, mille tuloslaskelman riville ja ALV-ilmoituksen kentälle tosite kuuluu. Luokkien asetukset löytyvät Asetuksista.",
      en: "The category decides which income statement line and VAT return field the voucher belongs to. Categories are set up in Settings.",
    },
  },
  "entry.vatRate": {
    text: {
      fi: "Tositteen arvonlisäverokanta. Yleinen kanta on 25,5 %, alennetut 13,5 % ja 10 %, ja 0 % kattaa verottomat tapahtumat. Kanta määrää, kuinka suuri osa summasta on veroa.",
      en: "The VAT rate of the voucher. The general rate is 25.5%, the reduced rates are 13.5% and 10%, and 0% covers VAT-free transactions. The rate decides how much of the amount is tax.",
    },
    source: VAT_RETURN,
  },
  "settings.traderType": {
    text: {
      fi: "Ammatinharjoittaja verotetaan maksuperusteisesti ja liikkeenharjoittaja suoriteperusteisesti. Valinta päättää, luetaanko tulot ja menot maksupäivän vai tositteen päivän mukaan.",
      en: "A professional is taxed on payment and a business trader on accrual. The choice decides whether income and costs are read by payment date or by voucher date.",
    },
    source: FORM5,
  },
  "settings.vatPeriod": {
    text: {
      fi: "Verokausi on kuukausi, kolme kuukautta tai vuosi, ja se määräytyy liikevaihdon mukaan. Ilmoitus annetaan jokaiselta kaudelta, vaikka toimintaa ei olisi ollut.",
      en: "The tax period is a month, a quarter or a year, depending on turnover. A return is filed for every period, even one with no activity.",
    },
    source: VAT_RETURN,
  },
  "settings.bookStart": {
    text: {
      fi: "Kuukausi, jona yritystoiminta alkoi. Sitä aiemmilta jaksoilta ei odoteta ALV-ilmoitusta, joten alkamisvuoden alussa ei näy myöhässä olevia ilmoituksia.",
      en: "The month the business began. No VAT return is expected for earlier periods, so the first year does not show overdue returns.",
    },
  },
  "settings.defaultVat": {
    text: {
      fi: "Verokanta, jonka luokka esitäyttää uudelle tositteelle. Yleinen kanta on 25,5 %, alennetut 13,5 % ja 10 %, ja 0 % kattaa verottomat tapahtumat. Jo kirjatut tositteet eivät muutu.",
      en: "The VAT rate a category pre-fills on a new voucher. The general rate is 25.5%, the reduced rates are 13.5% and 10%, and 0% covers VAT-free transactions. Vouchers already booked do not change.",
    },
    source: VAT_RETURN,
  },
}

/** Statement lines by account number: the lines where a reader needs a rule. */
const LINE_TOPICS: Record<string, string> = {
  "300": "300",
  "317": "317",
  "319": "319",
  "321": "321",
  "327": "327",
  "335": "335",
  "337": "337",
  "341": "341",
  "364": "364",
  "365": "365",
  "366": "366",
  "367": "367",
}

/** The explanation of a VAT return field, or null for one with none. */
export function vatReturnHelp(code: string): HelpTopic | null {
  return VAT_FIELDS[code] ?? null
}

/** The explanation of a Form 5 field, or null for one with none. */
export function form5Help(code: string): HelpTopic | null {
  return FORM5_FIELDS[code] ?? null
}

/** The explanation of a heading or figure outside the two forms. */
export function viewHelp(id: string): HelpTopic | null {
  return VIEW_TOPICS[id] ?? null
}

/** The explanation of an income statement line, by its account number. */
export function lineHelp(account: number): HelpTopic | null {
  const code = LINE_TOPICS[String(account)]
  return code ? (FORM5_FIELDS[code] ?? null) : null
}

/** Every topic, for the test that checks them all. */
export function allHelpTopics(): HelpTopic[] {
  return [
    ...Object.values(VAT_FIELDS),
    ...Object.values(FORM5_FIELDS),
    ...Object.values(VIEW_TOPICS),
  ]
}
