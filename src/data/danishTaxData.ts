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

export const SKATTESATSER = {
  amBidragProcent: 8.0,
  bundskatProcent: 12.06,
  topskatProcent: 15.0,
  topskatGraense2026: 588900,
  personfradrag2026: 51600,
  skatteloftProcent: 52.07,
  // Statens takster for befordring/kørsel
  takstBilMCPrKm: 3.79, // B-indkomst erhvervsmæssig kørsel i egen bil/MC (Rubrik 29)
  takstCykelPrKm: 0.63, // Egen cykel/knallert (Rubrik 29)
  takstPassagerPrKm: 2.23 // Ligningsmæssigt passager (Rubrik 51)
};
