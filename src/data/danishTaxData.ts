export interface KommuneSkat {
  navn: string;
  kommuneskat: number;
  kirkeskat: number;
}

export const DANSKE_KOMMUNER: KommuneSkat[] = [
  { navn: 'København', kommuneskat: 23.50, kirkeskat: 0.80 },
  { navn: 'Aarhus', kommuneskat: 24.52, kirkeskat: 0.72 },
  { navn: 'Odense', kommuneskat: 24.90, kirkeskat: 0.68 },
  { navn: 'Aalborg', kommuneskat: 25.40, kirkeskat: 0.98 },
  { navn: 'Frederiksberg', kommuneskat: 23.90, kirkeskat: 0.53 },
  { navn: 'Gentofte', kommuneskat: 22.80, kirkeskat: 0.40 },
  { navn: 'Rudersdal', kommuneskat: 23.50, kirkeskat: 0.58 },
  { navn: 'Roskilde', kommuneskat: 25.10, kirkeskat: 0.87 },
  { navn: 'Helsingør', kommuneskat: 25.50, kirkeskat: 0.74 },
  { navn: 'Kolding', kommuneskat: 25.30, kirkeskat: 0.88 },
  { navn: 'Horsens', kommuneskat: 25.60, kirkeskat: 0.86 },
  { navn: 'Vejle', kommuneskat: 24.40, kirkeskat: 0.85 },
  { navn: 'Esbjerg', kommuneskat: 25.70, kirkeskat: 0.88 },
  { navn: 'Randers', kommuneskat: 25.80, kirkeskat: 0.90 },
  { navn: 'Silkeborg', kommuneskat: 25.50, kirkeskat: 0.82 },
  { navn: 'Herning', kommuneskat: 24.90, kirkeskat: 0.95 },
  { navn: 'Hillerød', kommuneskat: 25.20, kirkeskat: 0.77 },
  { navn: 'Næstved', kommuneskat: 25.90, kirkeskat: 0.92 },
  { navn: 'Viborg', kommuneskat: 25.60, kirkeskat: 0.96 },
  { navn: 'Svendborg', kommuneskat: 26.30, kirkeskat: 0.90 },
  { navn: 'Lolland', kommuneskat: 26.30, kirkeskat: 1.15 }
];

export interface SkatteRegler {
  aar: number;
  amBidragProcent: number;
  bundskatProcent: number;
  personfradrag: number;
  mellemskatProcent: number;
  mellemskatGraense: number;
  topskatProcent: number;
  topskatGraense: number;
  toptopskatProcent: number;
  toptopskatGraense: number;
  takstBilMCFoerste20k: number;
  takstBilMCOver20k: number;
  takstCykelPrKm: number;
  befordringBundgraenseKm: number;
  befordringMellemGraenseKm: number;
  befordringMellemTakst: number;
  befordringHoejTakst: number;
  kildeKontrolleret: string;
}

export const SKATTEREGLER: Record<number, SkatteRegler> = {
  2025: {
    aar: 2025,
    amBidragProcent: 8,
    bundskatProcent: 12.01,
    personfradrag: 51600,
    mellemskatProcent: 0,
    mellemskatGraense: Number.POSITIVE_INFINITY,
    topskatProcent: 15,
    topskatGraense: 611800,
    toptopskatProcent: 0,
    toptopskatGraense: Number.POSITIVE_INFINITY,
    takstBilMCFoerste20k: 3.81,
    takstBilMCOver20k: 2.23,
    takstCykelPrKm: 0.63,
    befordringBundgraenseKm: 24,
    befordringMellemGraenseKm: 120,
    befordringMellemTakst: 2.23,
    befordringHoejTakst: 1.12,
    kildeKontrolleret: '2026-09-12',
  },
  2026: {
    aar: 2026,
    amBidragProcent: 8,
    bundskatProcent: 12.01,
    personfradrag: 54100,
    mellemskatProcent: 7.5,
    mellemskatGraense: 641200,
    topskatProcent: 7.5,
    topskatGraense: 777900,
    toptopskatProcent: 5,
    toptopskatGraense: 2592700,
    takstBilMCFoerste20k: 3.94,
    takstBilMCOver20k: 2.28,
    takstCykelPrKm: 0.64,
    befordringBundgraenseKm: 24,
    befordringMellemGraenseKm: 120,
    befordringMellemTakst: 3.17,
    befordringHoejTakst: 1.59,
    kildeKontrolleret: '2026-09-12',
  },
};

export function getSkatteRegler(aar: number): SkatteRegler {
  const regler = SKATTEREGLER[aar];
  if (!regler) {
    throw new Error(`Skatteregler for ${aar} er ikke understøttet.`);
  }
  return regler;
}

const CURRENT_RULES = SKATTEREGLER[2026]!;
export const SKATTESATSER = {
  amBidragProcent: CURRENT_RULES.amBidragProcent,
  bundskatProcent: CURRENT_RULES.bundskatProcent,
  topskatProcent: CURRENT_RULES.topskatProcent,
  topskatGraense2026: CURRENT_RULES.topskatGraense,
  personfradrag2026: CURRENT_RULES.personfradrag,
  skatteloftProcent: 52.07,
  takstBilMCPrKm: CURRENT_RULES.takstBilMCFoerste20k,
  takstCykelPrKm: CURRENT_RULES.takstCykelPrKm,
  takstPassagerPrKm: CURRENT_RULES.befordringMellemTakst,
};
