/**
 * Årsversionerede danske skattesatser.
 *
 * Satserne fastsættes af Folketinget år for år. Hardkod dem aldrig ét sted i
 * beregningskoden: alt hentes herfra gennem getSatser(), som kaster, hvis året
 * ikke findes. Det er bevidst. Et manglende år skal stoppe beregningen, ikke
 * stiltiende låne et andet års tal.
 *
 * Alle grænser for de progressive skatter er angivet EFTER AM-bidrag, fordi det
 * er sådan skatten faktisk beregnes. Ser man et højere tal i pressen, er det
 * som regel den samme grænse før AM-bidrag (grænse / 0,92).
 */

/** De progressive lag, der findes. Beregningen har en post for hvert af dem. */
export type ProgressivSkatId = 'mellemskat' | 'topskat' | 'topTopskat';

export interface ProgressivSkat {
  /** Nøgle brugt i beregning og visning. */
  id: ProgressivSkatId;
  navn: string;
  procent: number;
  /** Grænse målt på personlig indkomst EFTER AM-bidrag. */
  graenseEfterAM: number;
}

export interface Satser {
  aar: number;
  amBidragProcent: number;
  bundskatProcent: number;
  /** Loftet for bundskat, kommuneskat og første progressive skattelag. */
  skatteloftPersonligIndkomstProcent: number;
  personfradrag: number;
  /** Sorteret stigende efter grænse. */
  progressiveSkatter: ProgressivSkat[];
  beskaeftigelsesfradrag: { procent: number; maksimum: number };
  ekstraBeskFradragEnlig: { procent: number; maksimum: number };
  ekstraBeskFradragSenior: { procent: number; maksimum: number } | null;
  jobfradrag: { procent: number; bundgraense: number; maksimum: number };
  /** Erhvervsmæssig kørsel, Skatterådets satser. Rubrik 29. */
  erhvervsKoersel: {
    bilMcFoerste20000: number;
    bilMcOver20000: number;
    cykelKnallert: number;
    /** Km-grænsen er årlig pr. hvervgiver. */
    kmGraense: number;
  };
  /** Befordringsfradrag mellem hjem og arbejde. Rubrik 51. */
  befordring: {
    /** Ingen fradrag for de første 24 km af den daglige transport. */
    bundfradragKm: number;
    sats25til120: number;
    satsOver120: number;
    /** Forhøjet sats for alle kilometer over 24 i yderkommuner og på småøer. */
    yderkommuneSats: number;
    graenseKm: number;
  };
  /** Automatisk tillæg til befordringsfradraget ved lav indkomst. */
  lavindkomstBefordring: {
    procent: number;
    maksimum: number;
    fuldtTilIndkomst: number;
    bortfalderVedIndkomst: number;
  };
  /** Satser der ikke er bekræftet mod en kilde. Vises for brugeren. */
  uverificerede: string[];
}

const SATSER_2025: Satser = {
  aar: 2025,
  amBidragProcent: 8,
  bundskatProcent: 12.01,
  skatteloftPersonligIndkomstProcent: 52.07,
  personfradrag: 51_600,
  progressiveSkatter: [
    {
      id: 'topskat',
      navn: 'Topskat',
      procent: 15,
      graenseEfterAM: 611_800,
    },
  ],
  beskaeftigelsesfradrag: { procent: 12.3, maksimum: 55_600 },
  ekstraBeskFradragEnlig: { procent: 11.5, maksimum: 48_300 },
  ekstraBeskFradragSenior: null,
  jobfradrag: { procent: 4.5, bundgraense: 224_500, maksimum: 2_900 },
  erhvervsKoersel: {
    bilMcFoerste20000: 3.81,
    bilMcOver20000: 2.23,
    cykelKnallert: 0.63,
    kmGraense: 20_000,
  },
  befordring: {
    bundfradragKm: 24,
    sats25til120: 2.23,
    satsOver120: 1.12,
    yderkommuneSats: 2.47,
    graenseKm: 120,
  },
  lavindkomstBefordring: {
    procent: 64,
    maksimum: 15_400,
    fuldtTilIndkomst: 325_800,
    bortfalderVedIndkomst: 375_800,
  },
  uverificerede: [],
};

const SATSER_2026: Satser = {
  aar: 2026,
  amBidragProcent: 8,
  bundskatProcent: 12.01,
  skatteloftPersonligIndkomstProcent: 44.57,
  personfradrag: 54_100,
  // 2026 er første år med den nye trestrengede progression fra
  // personskattereformen: mellemskat, topskat og top-topskat.
  progressiveSkatter: [
    {
      id: 'mellemskat',
      navn: 'Mellemskat',
      procent: 7.5,
      graenseEfterAM: 641_200,
    },
    {
      id: 'topskat',
      navn: 'Topskat',
      procent: 7.5,
      graenseEfterAM: 777_900,
    },
    {
      id: 'topTopskat',
      navn: 'Top-topskat',
      procent: 5,
      graenseEfterAM: 2_592_700,
    },
  ],
  beskaeftigelsesfradrag: { procent: 12.75, maksimum: 63_300 },
  ekstraBeskFradragEnlig: { procent: 11.5, maksimum: 50_600 },
  ekstraBeskFradragSenior: { procent: 1.4, maksimum: 6_100 },
  jobfradrag: { procent: 4.5, bundgraense: 235_200, maksimum: 3_100 },
  erhvervsKoersel: {
    bilMcFoerste20000: 3.94,
    bilMcOver20000: 2.28,
    cykelKnallert: 0.64,
    kmGraense: 20_000,
  },
  befordring: {
    bundfradragKm: 24,
    // Midlertidigt og tilbagevirkende forhøjet i juni 2026: den oprindelige
    // sats var 2,28 kr., men Skatterådets reviderede udmelding hæver den til
    // 3,17 kr. for hele 2026. Se kommentaren ovenfor.
    sats25til120: 3.17,
    // Tilsvarende forhøjet fra 1,14 kr. til 1,59 kr.
    satsOver120: 1.59,
    yderkommuneSats: 3.51,
    graenseKm: 120,
  },
  lavindkomstBefordring: {
    procent: 64,
    maksimum: 30_800,
    fuldtTilIndkomst: 341_500,
    bortfalderVedIndkomst: 391_500,
  },
  uverificerede: [],
};

export const SATSER_PR_AAR: Record<number, Satser> = {
  2025: SATSER_2025,
  2026: SATSER_2026,
};

export const TILGAENGELIGE_AAR: number[] = Object.keys(SATSER_PR_AAR)
  .map(Number)
  .sort((a, b) => a - b);

export class UkendtIndkomstAarError extends Error {
  constructor(public readonly aar: number) {
    super(
      `Der findes ingen skattesatser for ${aar}. ` +
        `Satserne vedtages år for år, og appen kender kun ${TILGAENGELIGE_AAR.join(', ')}.`
    );
    this.name = 'UkendtIndkomstAarError';
  }
}

export function getSatser(aar: number): Satser {
  const satser = SATSER_PR_AAR[aar];
  if (!satser) throw new UkendtIndkomstAarError(aar);
  return satser;
}

export function harSatser(aar: number): boolean {
  return Boolean(SATSER_PR_AAR[aar]);
}
