/**
 * Danske kommuner og deres skatteprocenter.
 *
 * Skatteministeriet udstiller kun de fulde tabeller gennem et interaktivt
 * værktøj, så listen her indeholder alle 98 kommuner ved navn, men kun de
 * satser der er bekræftet mod en kilde. Resten står som null.
 *
 * Det er med vilje. En kommuneskatteprocent, der er gættet eller lånt fra et
 * andet år, ser rigtig ud i beregningen og er umulig at opdage bagefter. Står
 * satsen som null, beder appen i stedet om at få den indtastet fra
 * forskudsopgørelsen, som under alle omstændigheder er den autoritative kilde
 * for den enkeltes egen sats.
 */

export interface KommuneSatser {
  /** null betyder: ikke bekræftet, brugeren skal selv indtaste. */
  kommuneskat: number | null;
  kirkeskat: number | null;
}

/** Alle 98 kommuner, alfabetisk efter dansk sortering. */
export const KOMMUNENAVNE: string[] = [
  'Albertslund', 'Allerød', 'Assens', 'Ballerup', 'Billund', 'Bornholm',
  'Brøndby', 'Brønderslev', 'Dragør', 'Egedal', 'Esbjerg', 'Fanø', 'Favrskov',
  'Faxe', 'Fredensborg', 'Fredericia', 'Frederiksberg', 'Frederikshavn',
  'Frederikssund', 'Furesø', 'Faaborg-Midtfyn', 'Gentofte', 'Gladsaxe',
  'Glostrup', 'Greve', 'Gribskov', 'Guldborgsund', 'Haderslev', 'Halsnæs',
  'Hedensted', 'Helsingør', 'Herlev', 'Herning', 'Hillerød', 'Hjørring',
  'Holbæk', 'Holstebro', 'Horsens', 'Hvidovre', 'Høje-Taastrup', 'Hørsholm',
  'Ikast-Brande', 'Ishøj', 'Jammerbugt', 'Kalundborg', 'Kerteminde', 'Kolding',
  'København', 'Køge', 'Langeland', 'Lejre', 'Lemvig', 'Lolland',
  'Lyngby-Taarbæk', 'Læsø', 'Mariagerfjord', 'Middelfart', 'Morsø',
  'Norddjurs', 'Nordfyns', 'Nyborg', 'Næstved', 'Odder', 'Odense', 'Odsherred',
  'Randers', 'Rebild', 'Ringkøbing-Skjern', 'Ringsted', 'Roskilde', 'Rudersdal',
  'Rødovre', 'Samsø', 'Silkeborg', 'Skanderborg', 'Skive', 'Slagelse', 'Solrød',
  'Sorø', 'Stevns', 'Struer', 'Svendborg', 'Syddjurs', 'Sønderborg', 'Thisted',
  'Tønder', 'Tårnby', 'Vallensbæk', 'Varde', 'Vejen', 'Vejle', 'Vesthimmerland',
  'Viborg', 'Vordingborg', 'Ærø', 'Aabenraa', 'Aalborg', 'Aarhus',
];

/**
 * Bekræftede satser pr. år. Kilde: Skatteministeriets 'Statistik i kommunerne',
 * krydstjekket via skatteguiden.dk, skm.dk og en dedikeret gennemgang af
 * ministeriets A-H- og Top 20-delpublikationer for 2026 (september 2026).
 * De resterende ~58 kommuner for 2026 og ~97 for 2025 er ikke bekræftet, fordi
 * den fulde konsoliderede tabel kun findes bag et interaktivt værktøj hos
 * Skatteministeriet uden en downloadbar fuld liste for begge år på
 * research-tidspunktet.
 */
const BEKRAEFTEDE_SATSER: Record<number, Record<string, KommuneSatser>> = {
  2025: {
    'Læsø': { kommuneskat: 26.30, kirkeskat: 1.30 },
  },
  2026: {
    'København': { kommuneskat: 23.39, kirkeskat: null },
    'Vejle': { kommuneskat: 23.4, kirkeskat: null },
    'Rudersdal': { kommuneskat: 23.47, kirkeskat: null },
    'Lolland': { kommuneskat: 26.3, kirkeskat: null },
    'Læsø': { kommuneskat: 26.3, kirkeskat: null },
    'Odsherred': { kommuneskat: 26.3, kirkeskat: null },
    'Sorø': { kommuneskat: 26.3, kirkeskat: null },
    // Nedenstående ~40 kommuner er tilføjet fra Skatteministeriets
    // A-H-oversigt for 2026 (deep research, september 2026).
    'Albertslund': { kommuneskat: 25.60, kirkeskat: 0.80 },
    'Allerød': { kommuneskat: 25.30, kirkeskat: 0.58 },
    'Assens': { kommuneskat: 26.10, kirkeskat: 0.98 },
    'Ballerup': { kommuneskat: 25.50, kirkeskat: 0.75 },
    'Billund': { kommuneskat: 24.00, kirkeskat: 0.89 },
    'Bornholm': { kommuneskat: 26.20, kirkeskat: 0.93 },
    'Brøndby': { kommuneskat: 24.30, kirkeskat: 0.80 },
    'Brønderslev': { kommuneskat: 26.30, kirkeskat: 1.06 },
    'Dragør': { kommuneskat: 24.80, kirkeskat: 0.61 },
    'Egedal': { kommuneskat: 25.70, kirkeskat: 0.76 },
    'Esbjerg': { kommuneskat: 26.10, kirkeskat: 0.81 },
    'Faaborg-Midtfyn': { kommuneskat: 26.10, kirkeskat: 1.05 },
    'Fanø': { kommuneskat: 26.10, kirkeskat: 1.14 },
    'Favrskov': { kommuneskat: 25.70, kirkeskat: 0.96 },
    'Faxe': { kommuneskat: 25.80, kirkeskat: 1.08 },
    'Fredensborg': { kommuneskat: 25.30, kirkeskat: 0.64 },
    'Fredericia': { kommuneskat: 25.50, kirkeskat: 0.88 },
    'Frederiksberg': { kommuneskat: 24.50, kirkeskat: 0.50 },
    'Frederikshavn': { kommuneskat: 26.20, kirkeskat: 1.03 },
    'Frederikssund': { kommuneskat: 25.60, kirkeskat: 0.96 },
    'Furesø': { kommuneskat: 24.88, kirkeskat: 0.70 },
    'Gentofte': { kommuneskat: 24.14, kirkeskat: 0.38 },
    'Gladsaxe': { kommuneskat: 23.60, kirkeskat: 0.75 },
    'Glostrup': { kommuneskat: 24.60, kirkeskat: 0.80 },
    'Greve': { kommuneskat: 24.59, kirkeskat: 0.81 },
    'Gribskov': { kommuneskat: 25.40, kirkeskat: 0.85 },
    'Guldborgsund': { kommuneskat: 25.80, kirkeskat: 1.16 },
    'Haderslev': { kommuneskat: 26.30, kirkeskat: 0.95 },
    'Halsnæs': { kommuneskat: 25.70, kirkeskat: 0.85 },
    'Hedensted': { kommuneskat: 25.52, kirkeskat: 0.98 },
    'Helsingør': { kommuneskat: 25.82, kirkeskat: 0.63 },
    'Herlev': { kommuneskat: 23.70, kirkeskat: 0.80 },
    'Herning': { kommuneskat: 25.40, kirkeskat: 0.99 },
    'Hillerød': { kommuneskat: 25.60, kirkeskat: 0.69 },
    'Hjørring': { kommuneskat: 26.21, kirkeskat: 1.19 },
    'Holbæk': { kommuneskat: 25.30, kirkeskat: 0.96 },
    'Holstebro': { kommuneskat: 25.50, kirkeskat: 1.08 },
    'Horsens': { kommuneskat: 25.69, kirkeskat: 0.79 },
    'Hvidovre': { kommuneskat: 25.40, kirkeskat: 0.72 },
    'Høje-Taastrup': { kommuneskat: 24.60, kirkeskat: 0.80 },
  },
};

/** Landsgennemsnit, kun til at vise en størrelsesorden. Aldrig til beregning. */
export const GENNEMSNIT: Record<number, { kommuneskat: number; kirkeskat: number }> = {
  2025: { kommuneskat: 25.07, kirkeskat: 0.87 },
  2026: { kommuneskat: 25.05, kirkeskat: 0.867 },
};

export function getKommuneSatser(kommune: string, aar: number): KommuneSatser {
  return BEKRAEFTEDE_SATSER[aar]?.[kommune] ?? { kommuneskat: null, kirkeskat: null };
}

export function erKommuneBekraeftet(kommune: string, aar: number): boolean {
  return getKommuneSatser(kommune, aar).kommuneskat !== null;
}
