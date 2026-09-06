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
 * Bekræftede satser pr. år. Kilde: Skatteministeriet, gengivet af skatteguiden.dk
 * og skm.dk's oversigt over kommuneskatteændringer (hentet september 2026).
 * Kirkeskat er ikke bekræftet pr. kommune for nogen af årene.
 */
const BEKRAEFTEDE_SATSER: Record<number, Record<string, KommuneSatser>> = {
  2025: {},
  2026: {
    'København': { kommuneskat: 23.39, kirkeskat: null },
    'Vejle': { kommuneskat: 23.4, kirkeskat: null },
    'Rudersdal': { kommuneskat: 23.47, kirkeskat: null },
    'Lolland': { kommuneskat: 26.3, kirkeskat: null },
    'Læsø': { kommuneskat: 26.3, kirkeskat: null },
    'Odsherred': { kommuneskat: 26.3, kirkeskat: null },
    'Sorø': { kommuneskat: 26.3, kirkeskat: null },
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
