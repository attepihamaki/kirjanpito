import type { Cents } from "@/lib/domain/types"

/**
 * The fields of Form 5 (5 Elinkeinotoiminnan veroilmoitus liikkeen- tai
 * ammatinharjoittaja) from section 7 of Verohallinto's data file
 * specification for 2026, version 1.0 of 22.9.2026, kept in
 * `docs/specs/verohallinto_tietuekuvaus_2026_5.pdf`. The tax return's header
 * fields (000 to 044) are left out, since the book holds none of them.
 *
 * `fi` is the specification's own wording, so a code and its label always
 * agree with what OmaVero shows. A money field is `G13,2` or `R13,2`, and the
 * book holds it as cents.
 */
export interface Form5Field {
  code: number
  /** The specification's label. */
  fi: string
  /** The specification's format: `G13,2`, `R13,2`, `N1`, `+D3,2` and so on. */
  format: string
  /** The specification marks the field with an asterisk. */
  required: boolean
}

function f(
  code: number,
  fi: string,
  format: string,
  required: boolean
): Form5Field {
  return { code, fi, format, required }
}

export const FORM5_FIELDS: readonly Form5Field[] = [
  f(300, "Liikevaihto", "G13,2", true),
  f(318, "Saadut avustukset ja tuet", "G13,2", true),
  f(301, "Liiketoiminnan muut tuotot", "G13,2", true),
  f(
    313,
    "Auton yksityiskäyttö (erittely tunnuksilla 271, 273–275, 379–382 ja 396)",
    "G13,2",
    true
  ),
  f(314, "Tavaroiden yksityiskäyttö", "G13,2", true),
  f(315, "Muu yksityiskäyttö", "G13,2", true),
  f(319, "Osingot julkisesti noteeratuista yhtiöistä", "G13,2", false),
  f(320, "Veronalainen osuus", "G13,2", true),
  f(
    321,
    "Osingot muista kuin julkisesti noteeratuista yhtiöistä",
    "G13,2",
    false
  ),
  f(322, "Veronalainen osuus", "G13,2", false),
  f(
    325,
    "Ylijäämät julkisesti noteeratuista osuuskunnista Suomesta, muista EU/ETA-maista ja sellaisista ETAn ulkopuolisista maista, joiden kanssa Suomella on verosopimus",
    "G13,2",
    false
  ),
  f(326, "Veronalainen osuus", "G13,2", true),
  f(
    327,
    "Ylijäämät muista kuin julkisesti noteeratuista osuuskunnista Suomesta, EU/ETA-maista ja ETAn ulkopuolisista maista",
    "G13,2",
    false
  ),
  f(328, "Veronalainen osuus", "G13,2", true),
  f(323, "Korkotuotot ja muut rahoitustuotot", "G13,2", true),
  f(312, "Varausten vähennys", "G13,2", true),
  f(
    324,
    "Muut veronalaiset tuotot (ei tilikauden tuloslaskelmalle)",
    "G13,2",
    true
  ),
  f(316, "Elinkeinotoiminnan veronalaiset tuotot yhteensä", "G13,2", true),
  f(317, "Tuloslaskelman verovapaat tuotot", "G13,2", false),
  f(333, "Ostot ja varastojen muutokset", "G13,2", true),
  f(334, "Ulkopuoliset palvelut", "G13,2", true),
  f(335, "Palkat ja palkkiot", "G13,2", true),
  f(336, "Eläke- ja henkilösivukulut", "G13,2", true),
  f(337, "Poistot (erittely tunnuksilla 800–802 ja 804–806)", "G13,2", false),
  f(338, "Vähennyskelpoinen osuus (EVL 24, 30–34, 36–41 §)", "G13,2", true),
  f(341, "Edustuskulut", "G13,2", true),
  f(342, "Vähennyskelpoinen osuus 50 % (EVL 8 § 8 kohta)", "G13,2", true),
  f(343, "Vuokrat", "G13,2", true),
  f(344, "Muut vähennyskelpoiset kulut", "G13,2", true),
  f(346, "Korkokulut", "G13,2", false),
  f(
    347,
    "Vähennyskelpoinen osuus (tunnuksella 383 laskettu korko ei ole vähennyskelpoinen)",
    "G13,2",
    true
  ),
  f(349, "Muut rahoituskulut", "G13,2", true),
  f(353, "Varausten lisäykset", "G13,2", true),
  f(
    364,
    "Lisävähennykset (erittely tunnuksilla 387–392, 401–411, 413–416 ja 419–420)",
    "R13,2",
    true
  ),
  f(354, "Kirjanpidon ulkopuoliset vähennyskelpoiset kulut", "G13,2", true),
  f(
    355,
    "ELINKEINOTOIMINNAN VEROTUKSESSA VÄHENNYSKELPOISET KULUT YHTEENSÄ",
    "G13,2",
    true
  ),
  f(365, "Välittömät verot", "G13,2", false),
  f(366, "Sakot ja muut rangaistusmaksut", "G13,2", false),
  f(367, "Muut vähennyskelvottomat kulut", "G13,2", false),
  f(
    358,
    "ELINKEINOTOIMINNAN TULOS (kohtien 316 ja 355 erotuksen ollessa positiivinen)",
    "R13,2",
    true
  ),
  f(
    359,
    "ELINKEINOTOIMINNAN TAPPIO (kohtien 316 ja 355 erotuksen ollessa negatiivinen)",
    "R13,2",
    true
  ),
  f(
    373,
    "Pääomatuloista vähennettävän elinkeinotoiminnan tappion määrä",
    "R13,2",
    false
  ),
  f(
    369,
    "Yrittäjän osuus elinkeinotoiminnan nettovarallisuudesta (prosenttiosuus)",
    "+D3,2",
    true
  ),
  f(
    370,
    "Yrittäjäpuolison osuus elinkeinotoiminnan nettovarallisuudesta (prosenttiosuus)",
    "+D3,2",
    true
  ),
  f(371, "Yrittäjän työskentely liikkeessä (prosenttiosuus)", "+D3,2", true),
  f(
    372,
    "Yrittäjäpuolison työskentely liikkeessä (prosenttiosuus)",
    "+D3,2",
    true
  ),
  f(
    800,
    "Verotuksessa jäljellä oleva menojäännös verovuoden alussa",
    "R13,2",
    false
  ),
  f(801, "Lisäys verovuoden aikana", "R13,2", false),
  f(802, "Luovutushinnat ja vakuutuskorvaukset", "R13,2", true),
  f(804, "Verovuoden poistot", "R13,2", true),
  f(805, "Lisäpoisto (EVL 32 §)", "R13,2", true),
  f(
    806,
    "Verotuksessa jäljellä oleva menojäännös verovuoden lopussa",
    "R13,2",
    true
  ),
  f(
    379,
    "Käyttöomaisuuteen sisältyy 1=henkilöauto(ja) 2=pakettiauto(ja) 3=henkilöauto (ja) ja pakettiauto(ja) 4=muita kulkuneuvoja",
    "N1",
    false
  ),
  f(271, "Elinkeinotoiminnan ajot (km)", "+N8", true),
  f(273, "Yksityisajot (km)", "+N8", true),
  f(274, "Kokonaiskilometrimäärä", "+N8", false),
  f(
    381,
    "Kulut yhteensä (varsinaiset kulut+poisto tai leasing-vuokra)",
    "R13,2",
    true
  ),
  f(
    275,
    "Kulut keskimäärin/km (kulut yhteensä jaettuna kokonaiskilometrimäärällä)",
    "R13,2",
    false
  ),
  f(
    382,
    "Yksityisajojen osuus kuluista (km x kulut keskimäärin)",
    "R13,2",
    true
  ),
  f(
    380,
    "Auton käyttötiedot perustuvat 1=ajopäiväkirjaan, 2=muuhun käyttöselvitykseen",
    "N1",
    false
  ),
  f(
    396,
    "Yksityisajojen kulut 1=on vähennetty kirjanpidossa, 2=ei ole vähennetty",
    "N1",
    true
  ),
  f(384, "Rahan nostot kalenterivuonna 2026", "R13,2", false),
  f(385, "Sijoitukset rahana kalenterivuonna 2026", "R13,2", false),
  f(431, "Koko asunnon pinta-ala", "+D3,2", false),
  f(432, "Asunnosta oman elinkeinotoiminnan käytössä", "+D3,2", false),
  f(
    433,
    "Koko asunnon vuokra, vastike tai kiinteistön käyttökulut",
    "R13,2",
    false
  ),
  f(
    386,
    "Oman elinkeinotoiminnan käytössä olevan osan osuus kuluista",
    "R13,2",
    false
  ),
  f(401, "Yli 10h kestäneiden matkojen matkapäivien määrä", "N3", false),
  f(
    402,
    "Enimmäismäärä/matkapäivä yli 10h:n matkoilla (VH:n päätös verovapaista matkakustannusten korvauksista vuonna 2026)",
    "R13,2",
    false
  ),
  f(403, "Enimmäiskustannusmäärä yhteensä yli 10h:n matkoissa", "R13,2", false),
  f(404, "Kirjanpidossa vähennetty yli 10h:n matkoista", "R13,2", false),
  f(405, "Lisävähennys yli 10h:n matkoista", "R13,2", false),
  f(406, "Yli 6h kestäneiden matkojen matkapäivien määrä", "N3", false),
  f(
    407,
    "Enimmäismäärä/matkapäivä yli 6h:n matkoilla (VH:n päätös verovapaista matkakustannusten korvauksista vuonna 2026)",
    "R13,2",
    false
  ),
  f(408, "Enimmäismäärä yhteensä yli 6h:n matkoissa", "R13,2", false),
  f(409, "Kirjanpidossa vähennetty yli 6h:n matkoista", "R13,2", false),
  f(410, "Lisävähennys yli 6h:n matkoista", "R13,2", false),
  f(411, "Ulkomaan matkojen matkapäivien määrä", "N3", false),
  f(413, "Enimmäismäärä yhteensä ulkomaanmatkoilla", "R13,2", false),
  f(414, "Kirjanpidossa vähennetty ulkomaan matkoista", "R13,2", false),
  f(415, "Lisävähennys ulkomaan matkoista", "R13,2", false),
  f(387, "Kirjanpidossa vähennetty yhteensä", "R13,2", false),
  f(
    388,
    "Lisävähennykset tilapäisistä työmatkoista aiheutuneista lisääntyneistä elantokustannuksista yhteensä",
    "R13,2",
    false
  ),
  f(
    416,
    "Yksityisvaroihin kuuluvan auton käyttöselvityksen tiedot perustuvat 1=ajopäiväkirjaan 2=muuhun selvitykseen",
    "N1",
    false
  ),
  f(
    389,
    "Yksityisvaroihin kuuluvan auton käytön kokonaiskilometrimäärä",
    "+N8",
    false
  ),
  f(
    390,
    "Yksityisvaroihin kuuluvan auton elinkeinotoiminnan ajot/km",
    "+N8",
    true
  ),
  f(
    419,
    "Enimmäismäärä/km yksityisvaroihin kuuluvan auton käytöstä (VH:n päätös verovapaista matkakustannusten korvauksista vuonna 2026)",
    "R13,2",
    false
  ),
  f(
    420,
    "Enimmäismäärä yhteensä yksityisvaroihin kuuluvan auton käytöstä",
    "R13,2",
    false
  ),
  f(
    391,
    "Kirjanpidossa vähennetty yksityisvaroihin kuuluvan auton käytöstä",
    "R13,2",
    false
  ),
  f(
    392,
    "Lisävähennys yksityisvaroihin kuuluvan auton käytöstä.",
    "R13,2",
    false
  ),
  f(
    659,
    "Taseen mukainen negatiivinen oma pääoma (ilman etumerkkiä)",
    "R13,2",
    false
  ),
  f(677, "Omaan pääomaan sisältyvät arvonkorotukset", "R13,2", false),
  f(650, "Tilikauden tappio", "R13,2", false),
  f(
    651,
    "Aikaisempien tilikausien tappiot, joiden kattamiseen ei ole kertynyt voittovaroja",
    "R13,2",
    false
  ),
  f(652, "Oikaistu negatiivinen oma pääoma", "R13,2", true),
  f(653, "Peruskorko + 1%", "D2,2", false),
  f(
    383,
    "Korot, jotka eivät ole vähennyskelpoisia elinkeinotoiminnan tulolähteen tulosta",
    "R13,2",
    false
  ),
  f(
    703,
    "Kiinteistöt, rakennukset ja rakennelmat (erittely lomakkeella 18B)",
    "R13,2",
    true
  ),
  f(704, "Koneet ja kalusto", "R13,2", true),
  f(705, "Käyttöomaisuusarvopaperit (erittely lomakkeella 8B)", "R13,2", true),
  f(706, "Muu käyttöomaisuus", "R13,2", true),
  f(708, "Tavarat", "R13,2", true),
  f(709, "Muu vaihto-omaisuus", "R13,2", true),
  f(711, "Myyntisaamiset", "G13,2", true),
  f(714, "Rahat (käteisvarat, ei pankkitalletuksia)", "G13,2", true),
  f(
    745,
    "Rahoitusomaisuusarvopaperit (erittely lomakkeella 8B)",
    "G13,2",
    true
  ),
  f(716, "Muu rahoitusomaisuus (ei pankkitalletuksia)", "G13,2", true),
  f(718, "Elinkeinotoiminnan varat yhteensä", "G13,2", true),
  f(749, "Lyhytaikaiset velat", "R13,2", false),
  f(750, "Pitkäaikaiset velat", "R13,2", false),
  f(747, "Oikaistu negatiivinen oma pääoma", "R13,2", false),
  f(725, "Elinkeinotoiminnan velat yhteensä", "R13,2", true),
  f(733, "ELINKEINOTOIMINNAN POSITIIVINEN NETTOVARALLISUUS", "R13,2", true),
  f(734, "ELINKEINOTOIMINNAN NEGATIIVINEN NETTOVARALLISUUS", "R13,2", true),
  f(748, "Oma pääoma tilikauden alussa", "G13,2", false),
  f(741, "Yksityisnostot/-sijoitukset", "G13,2", false),
  f(742, "Tilikauden voitto/tappio (kirjanpito)", "G13,2", false),
  f(743, "Oma pääoma tilikauden lopussa", "G13,2", true),
  f(871, "Verovuoden 2026 toimintavaraus", "R13,2", false),
  f(
    394,
    "Verovuoden 2026 päättymistä edeltäneiden 12 kuukauden aikana maksetut ennakonpidätyksen alaiset palkat",
    "R13,2",
    false
  ),
  f(
    393,
    "Elinkeinotoiminnan käytössä olevien arvopapereiden ja kiinteistöjen luovutusvoitot yhteensä (siltä osin kuin niistä ei ole muodostettu jälleenhankintavarausta)",
    "R13,2",
    false
  ),
  f(
    395,
    "Vaatimus jaettavasta yritystulosta 1=Pääomatulon enimmäismäärä on 10 % nettovarallisuudesta, 2=Jaettava yritystulo on kokonaan ansiotuloa (Jos vaatimusta ei esitetä, pääomatulon enimmäismäärä on 20 % nettovarallisuudesta.)",
    "N1",
    false
  ),
]

const BY_CODE: ReadonlyMap<number, Form5Field> = new Map(
  FORM5_FIELDS.map((field) => [field.code, field])
)

/** The field for a code. A code outside the specification is a programming error. */
export function form5Field(code: number): Form5Field {
  const field = BY_CODE.get(code)
  if (!field) throw new Error(`Form 5 has no field ${code}`)
  return field
}

/** Whether a field holds money, as opposed to a count, a percentage or a choice. */
export function isMoneyField(field: Form5Field): boolean {
  return field.format.startsWith("G") || field.format.startsWith("R")
}

/**
 * The label as the checklist prints it. The specification writes some totals
 * in capitals and explains 358 and 359 in a trailing clause, neither of which
 * reads well beside the other fields.
 */
export function form5Label(code: number): string {
  let label = form5Field(code).fi
  if (label.endsWith(".")) label = label.slice(0, -1)
  if (code === 358 || code === 359) label = label.replace(/\s*\(.*\)$/, "")
  if (label === label.toUpperCase()) {
    label = label.charAt(0) + label.slice(1).toLowerCase()
  }
  return label
}

/** The value of a field by code, in cents; a field the form leaves empty is 0. */
export type Form5Values = (code: number) => Cents
