export type TransportMiddel = 'NONE' | 'OWN_CAR_MC' | 'OWN_BIKE' | 'PASSENGER';
export type IndkomstRubrik = 12 | 17;
export type JobStatus = 'PLANLAGT' | 'BETALT' | 'AFLYST';

export interface IndkomstAar {
  id: string;
  aar: number;
  hjemmeadresse: string;
  kommune: string;
  kommuneSkatteprocent: number; // f.eks. 24.9
  kirkeskatteprocent: number; // f.eks. 0.75
  forventetAIndkomst: number;
  forventetPensionSUDagpenge: number;
  forventedeFradragAIndkomst: number;
  medlemFolkekirken: boolean;
  enligForsoerger: boolean;
  laast: boolean;
}

export interface Job {
  id: string;
  indkomstAarId: string;
  hvervgiver: string;
  honorar: number;
  startDato: string; // YYYY-MM-DD
  slutDato: string; // YYYY-MM-DD
  betalingsDato: string; // YYYY-MM-DD
  transportmiddel: TransportMiddel;
  antalKm: number;
  antalTure: number;
  destinationAdresse?: string;
  koerselsFradrag: number;
  amBidragFritaget: boolean;
  timerJob?: number;
  timerTransportForberedelse?: number;
  type?: string;
  bilagNavne?: string[];
  bilagIds?: string[];
  kildeTekst?: string;
  noter?: string;
  rubrik?: IndkomstRubrik;
  status?: JobStatus;
}

export interface Fradrag {
  id: string;
  indkomstAarId: string;
  beskrivelse: string;
  typeKategori: string;
  fakturaDato: string;
  fakturaBeloeb: number;
  fradragsProcent: number;
  fradragIDKK: number;
  bilagNavne?: string[];
  bilagIds?: string[];
  kildeTekst?: string;
  revisorNotat?: string;
}

export interface Investering {
  id: string;
  indkomstAarId: string;
  titel: string;
  beloeb: number;
  fakturaDato: string;
  bilagNavne?: string[];
  bilagIds?: string[];
  kildeTekst?: string;
}

export interface OpsparingsTracker {
  indbetaltTilSkat: number;
  opsparetPrivat: number;
}

export interface SkatteBeregningResultat {
  // Blok 1: Indkomst & Fradrag
  honorarerAlt: number; // Rubrik 12
  rubrik17Indkomst: number; // Rubrik 17
  amPligtigBIndkomst: number;
  amBidrag: number; // 8%
  oevrigeFradragRubrik29: number; // Sum af Fradrag + bil/cykelkørsel (Rubrik 29)
  fradragKatalogSum: number;
  koerselsFradragRubrik29: number;
  befordringsFradragRubrik51: number; // Passagerkørsel (Rubrik 51)
  personligIndkomst: number;
  skattepligtigIndkomst: number;

  // Blok 2: Skatteberegning
  bundskat: number;
  kommuneskat: number;
  topskat: number;
  mellemskat: number;
  toptopskat: number;
  kirkeskat: number;
  personfradragSkattevaerdi: number;
  beregnetSkatAlt: number;
  samletSkatOgAM: number;
  indtaegtEfterSkat: number;
  effektivSkatteprocent: number;

  // Valideringer & Sikkerhed
  rubrik29LoftOverskredet: boolean;
  maksTilladtFradragRubrik29: number;
  overskydendeFradrag: number;
  anvendtFradragRubrik29: number;
  regelAar: number;
  erEstimat: true;
}

export interface AiJobSuggestion {
  hvervgiver?: string;
  honorar?: number;
  startDato?: string;
  slutDato?: string;
  betalingsDato?: string;
  destinationAdresse?: string;
  transportmiddel?: TransportMiddel;
  antalKm?: number;
  antalTure?: number;
  amBidragFritaget?: boolean;
  rubrik?: IndkomstRubrik;
  type?: string;
  timerJob?: number;
  timerTransportForberedelse?: number;
}

export interface AiFradragSuggestion {
  beskrivelse?: string;
  typeKategori?: string;
  fakturaDato?: string;
  fakturaBeloeb?: number;
  fradragsProcent?: number;
  begrundelse?: string;
}

export interface AiInvesteringSuggestion {
  titel?: string;
  beloeb?: number;
  fakturaDato?: string;
}

export interface AiExtractionResult {
  classification: 'JOB' | 'FRADRAG' | 'INVESTERING' | 'UNKNOWN';
  confidence: number;
  summary: string;
  job?: AiJobSuggestion;
  fradrag?: AiFradragSuggestion;
  investering?: AiInvesteringSuggestion;
  revisorNotat: string;
}
