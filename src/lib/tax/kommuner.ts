/**
 * Officielle kommunale skatteprocenter for alle 98 kommuner.
 *
 * Kilde: Skatte- og Vækstministeriets årsregneark "Kommuneskattesatser" for
 * 2025 og 2026. Data er gemt lokalt og versionsopdelt, så en beregning aldrig
 * afhænger af et generativt AI-svar eller af, at myndighedens hjemmeside er
 * tilgængelig i det øjeblik, brugeren vælger kommune.
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

export const KOMMUNE_SATS_KILDE = {
  navn: 'Skatte- og Vækstministeriet',
  url: 'https://svmn.dk/tal-og-metode/satser/statistik-i-kommunerne/kommuneskatteprocenter-siden-1977',
  hentet: '2026-09-12',
} as const;

/** [kommuneskat 2025, kirkeskat 2025, kommuneskat 2026, kirkeskat 2026] */
const OFFICIELLE_SATSRAEKKER: Record<string, readonly [number, number, number, number]> = {
  'Aabenraa': [25.6, 0.95, 25.6, 0.95],
  'Aalborg': [25.6, 0.98, 25.6, 0.98],
  'Aarhus': [24.52, 0.74, 24.52, 0.74],
  'Albertslund': [25.6, 0.8, 25.6, 0.8],
  'Allerød': [25.3, 0.58, 25.3, 0.58],
  'Assens': [26.1, 0.98, 26.1, 0.98],
  'Ballerup': [25.5, 0.75, 25.5, 0.75],
  'Billund': [24, 0.89, 24, 0.89],
  'Bornholm': [26.2, 0.93, 26.2, 0.93],
  'Brøndby': [24.3, 0.8, 24.3, 0.8],
  'Brønderslev': [26.3, 1.06, 26.3, 1.06],
  'Dragør': [24.8, 0.61, 24.8, 0.61],
  'Egedal': [25.7, 0.76, 25.7, 0.76],
  'Esbjerg': [26.1, 0.81, 26.1, 0.81],
  'Faaborg-Midtfyn': [26.1, 1.05, 26.1, 1.05],
  'Fanø': [26.1, 1.14, 26.1, 1.14],
  'Favrskov': [25.7, 0.96, 25.7, 0.96],
  'Faxe': [25.8, 1.08, 25.8, 1.08],
  'Fredensborg': [25.3, 0.62, 25.3, 0.64],
  'Fredericia': [25.5, 0.88, 25.5, 0.88],
  'Frederiksberg': [24.57, 0.5, 24.5, 0.5],
  'Frederikshavn': [26.2, 1.03, 26.2, 1.03],
  'Frederikssund': [25.7, 0.96, 25.6, 0.96],
  'Furesø': [24.88, 0.65, 24.88, 0.7],
  'Gentofte': [24.24, 0.39, 24.14, 0.38],
  'Gladsaxe': [23.6, 0.75, 23.6, 0.75],
  'Glostrup': [24.6, 0.8, 24.6, 0.8],
  'Greve': [24.59, 0.81, 24.59, 0.81],
  'Gribskov': [25.4, 0.85, 25.4, 0.85],
  'Guldborgsund': [25.8, 1.16, 25.8, 1.16],
  'Haderslev': [26.3, 0.95, 26.3, 0.95],
  'Halsnæs': [25.7, 0.85, 25.7, 0.85],
  'Hedensted': [25.52, 0.98, 25.52, 0.98],
  'Helsingør': [25.82, 0.63, 25.82, 0.63],
  'Herlev': [23.7, 0.75, 23.7, 0.8],
  'Herning': [25.4, 0.99, 25.4, 0.99],
  'Hillerød': [25.6, 0.69, 25.6, 0.69],
  'Hjørring': [26.21, 1.19, 26.21, 1.19],
  'Holbæk': [25.3, 0.96, 25.3, 0.96],
  'Holstebro': [25.5, 1.08, 25.5, 1.08],
  'Horsens': [25.69, 0.79, 25.69, 0.79],
  'Hvidovre': [25.4, 0.72, 25.4, 0.72],
  'Høje-Taastrup': [24.6, 0.8, 24.6, 0.8],
  'Hørsholm': [23.7, 0.62, 23.7, 0.62],
  'Ikast-Brande': [25.1, 0.97, 25.1, 0.97],
  'Ishøj': [25, 0.9, 25, 0.9],
  'Jammerbugt': [25.7, 1.2, 25.7, 1.2],
  'Kalundborg': [24.2, 1.01, 24.2, 1.01],
  'Kerteminde': [26.1, 0.98, 26.1, 0.98],
  'Kolding': [25.5, 0.92, 25.5, 0.92],
  'København': [23.5, 0.8, 23.39, 0.8],
  'Køge': [25.26, 0.87, 25.26, 0.87],
  'Langeland': [26.3, 1.14, 26.3, 1.14],
  'Lejre': [25.31, 1.05, 25.31, 1.05],
  'Lemvig': [25.7, 1.27, 25.7, 1.27],
  'Lolland': [26.3, 1.23, 26.3, 1.23],
  'Lyngby-Taarbæk': [24.38, 0.6, 24.38, 0.6],
  'Læsø': [26.3, 1.3, 26.3, 1.3],
  'Mariagerfjord': [25.9, 1.15, 25.9, 1.15],
  'Middelfart': [25.8, 0.9, 25.8, 0.9],
  'Morsø': [25.8, 1.2, 25.8, 1.2],
  'Norddjurs': [26, 1, 26, 1],
  'Nordfyns': [26, 1.04, 26, 1.04],
  'Nyborg': [26.3, 1, 26.3, 1],
  'Næstved': [25, 0.98, 25, 0.98],
  'Odder': [25.1, 0.95, 25.1, 0.95],
  'Odense': [25.5, 0.68, 25.5, 0.68],
  'Odsherred': [26.3, 0.98, 26.3, 0.98],
  'Randers': [26, 0.89, 26, 0.89],
  'Rebild': [25.83, 1.2, 25.83, 1.2],
  'Ringkøbing-Skjern': [25, 1.05, 25, 1.05],
  'Ringsted': [26.1, 0.95, 26.1, 0.95],
  'Roskilde': [25.2, 0.84, 25.2, 0.84],
  'Rudersdal': [23.52, 0.57, 23.47, 0.57],
  'Rødovre': [25.7, 0.72, 25.7, 0.72],
  'Samsø': [25.9, 1.2, 25.9, 1.2],
  'Silkeborg': [25.5, 0.95, 25.5, 0.94],
  'Skanderborg': [26, 0.86, 26, 0.86],
  'Skive': [25.5, 1.09, 25.5, 1.09],
  'Slagelse': [26.1, 0.96, 26.1, 0.96],
  'Solrød': [24.99, 0.89, 24.99, 0.84],
  'Sorø': [26.3, 0.95, 26.3, 0.95],
  'Stevns': [26, 1.1, 26, 1.1],
  'Struer': [25.3, 1.2, 25.3, 1.2],
  'Svendborg': [26.3, 1.02, 26.3, 1.02],
  'Syddjurs': [25.9, 0.98, 25.9, 0.98],
  'Sønderborg': [25.7, 0.91, 25.7, 0.91],
  'Thisted': [25.5, 1.27, 25.5, 1.27],
  'Tårnby': [24.1, 0.61, 24.1, 0.61],
  'Tønder': [25.3, 1.16, 25.3, 1.16],
  'Vallensbæk': [25.6, 0.8, 25.6, 0.8],
  'Varde': [25.1, 0.95, 25.1, 0.95],
  'Vejen': [25.8, 1.06, 25.8, 1.06],
  'Vejle': [23.4, 0.89, 23.4, 0.89],
  'Vesthimmerland': [26.3, 1.18, 26.3, 1.18],
  'Viborg': [25.5, 0.93, 25.5, 0.93],
  'Vordingborg': [26.3, 1.02, 26.3, 1.02],
  'Ærø': [26.1, 1.05, 26.1, 1.07],
};

const BEKRAEFTEDE_SATSER: Record<number, Record<string, KommuneSatser>> = {
  2025: Object.fromEntries(
    Object.entries(OFFICIELLE_SATSRAEKKER).map(([kommune, [kommuneskat, kirkeskat]]) => [
      kommune,
      { kommuneskat, kirkeskat },
    ]),
  ),
  2026: Object.fromEntries(
    Object.entries(OFFICIELLE_SATSRAEKKER).map(
      ([kommune, [, , kommuneskat, kirkeskat]]) => [kommune, { kommuneskat, kirkeskat }],
    ),
  ),
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
