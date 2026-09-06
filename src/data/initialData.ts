import { IndkomstAar, Job, Fradrag, Investering, OpsparingsTracker } from '../types';

export const INITIAL_INDKOMSTAAR: IndkomstAar[] = [
  {
    id: 'aar-2026',
    aar: 2026,
    hjemmeadresse: 'Vesterbrogade 42, 1620 København V',
    kommune: 'København',
    kommuneSkatteprocent: 23.50,
    kirkeskatteprocent: 0.80,
    forventetAIndkomst: 80000,
    forventetPensionSUDagpenge: 0,
    forventedeFradragAIndkomst: 0,
    medlemFolkekirken: true,
    enligForsoerger: false,
    laast: false,
  },
  {
    id: 'aar-2025',
    aar: 2025,
    hjemmeadresse: 'Vesterbrogade 42, 1620 København V',
    kommune: 'København',
    kommuneSkatteprocent: 23.50,
    kirkeskatteprocent: 0.80,
    forventetAIndkomst: 60000,
    forventetPensionSUDagpenge: 0,
    forventedeFradragAIndkomst: 0,
    medlemFolkekirken: true,
    enligForsoerger: false,
    laast: true,
  },
];

export const INITIAL_JOBS: Job[] = [
  {
    id: 'job-1',
    indkomstAarId: 'aar-2026',
    hvervgiver: 'Vega Musikhus',
    honorar: 12500,
    startDato: '2026-03-14',
    slutDato: '2026-03-14',
    betalingsDato: '2026-03-31',
    transportmiddel: 'OWN_CAR_MC',
    antalKm: 28,
    antalTure: 1,
    destinationAdresse: 'Enghavevej 40, 1674 København V',
    koerselsFradrag: 106, // 28 km * 3.79
    amBidragFritaget: false,
    timerJob: 4.5,
    timerTransportForberedelse: 3,
    type: 'Musik & Koncert',
    bilagNavne: ['Vega_honorar_aftale_2026.pdf'],
    noter: 'Spillejob med kvartet.',
  },
  {
    id: 'job-2',
    indkomstAarId: 'aar-2026',
    hvervgiver: 'Aarhus Universitet',
    honorar: 8000,
    startDato: '2026-04-20',
    slutDato: '2026-04-20',
    betalingsDato: '2026-04-30',
    transportmiddel: 'OWN_CAR_MC',
    antalKm: 310,
    antalTure: 1,
    destinationAdresse: 'Nordre Ringgade 1, 8000 Aarhus C',
    koerselsFradrag: 1175, // 310 km * 3.79
    amBidragFritaget: false,
    timerJob: 3,
    timerTransportForberedelse: 5,
    type: 'Foredrag',
    bilagNavne: ['AU_gaesteforelaesning.pdf'],
    noter: 'Gæsteforelæsning om kreativ branche.',
  },
  {
    id: 'job-3',
    indkomstAarId: 'aar-2026',
    hvervgiver: 'Statens Kunstfond (Legat)',
    honorar: 15000,
    startDato: '2026-05-01',
    slutDato: '2026-05-01',
    betalingsDato: '2026-05-15',
    transportmiddel: 'NONE',
    antalKm: 0,
    antalTure: 0,
    koerselsFradrag: 0,
    amBidragFritaget: true, // Fritaget for AM-bidrag ifølge skatteregler
    type: 'Legat & Priser',
    bilagNavne: ['Kunstfonden_tilsagn.pdf'],
    noter: 'Arbejdslegat til komposition. Fritaget for AM-bidrag.',
  },
];

export const INITIAL_FRADRAG: Fradrag[] = [
  {
    id: 'fradrag-1',
    indkomstAarId: 'aar-2026',
    beskrivelse: 'Storebæltsbroen - tur/retur Aarhus foredrag',
    typeKategori: 'Broafgift',
    fakturaDato: '2026-04-20',
    fakturaBeloeb: 550,
    fradragsProcent: 100,
    fradragIDKK: 550,
    bilagNavne: ['BroBizz_faktura_april.pdf'],
    revisorNotat: 'Fuld fradragsret i rubrik 29 for dokumenteret broafgift i forbindelse med honorarjob.',
  },
  {
    id: 'fradrag-2',
    indkomstAarId: 'aar-2026',
    beskrivelse: 'Parkering ved musikhus & spillested',
    typeKategori: 'Parkering',
    fakturaDato: '2026-03-14',
    fakturaBeloeb: 145,
    fradragsProcent: 100,
    fradragIDKK: 145,
    bilagNavne: ['EasyPark_kvittering_14marts.pdf'],
    revisorNotat: 'Parkering i forbindelse med job er 100% fradragsberettiget.',
  },
  {
    id: 'fradrag-3',
    indkomstAarId: 'aar-2026',
    beskrivelse: 'Studio monitor højttalere (blandet brug)',
    typeKategori: 'Udstyr',
    fakturaDato: '2026-02-10',
    fakturaBeloeb: 2400,
    fradragsProcent: 50,
    fradragIDKK: 1200,
    bilagNavne: ['Thomann_faktura_monitors.pdf'],
    revisorNotat: '50% erhvervsmæssig andel vurderet på grund af privat lytning.',
  },
];

export const INITIAL_INVESTERINGER: Investering[] = [
  {
    id: 'inv-1',
    indkomstAarId: 'aar-2026',
    titel: 'Apple MacBook Pro M3 Max - studiecomputer',
    beloeb: 19500,
    fakturaDato: '2026-01-15',
    bilagNavne: ['Apple_Store_faktura.pdf'],
  },
];

export const INITIAL_OPSPARING: Record<string, OpsparingsTracker> = {
  'aar-2026': {
    indbetaltTilSkat: 4500,
    opsparetPrivat: 5000,
  },
};
