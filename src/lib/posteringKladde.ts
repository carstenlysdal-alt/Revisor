import type {
  Bilagsklassifikation,
  Fradrag,
  Investering,
  Job,
  TransportMiddel,
} from '../types';
import { idag, talFraFelt } from './format';

/**
 * Delt kladde-logik mellem bilagsscanneren og chattens kladdekort.
 *
 * Begge steder ender et AI-udtræk i de samme to flade opslagstavler — tekst
 * pr. feltnavn, flag pr. feltnavn — som brugeren retter direkte i, før noget
 * gemmes. Logikken lå tidligere kun i AiBilagScannerModal; den er samlet her,
 * så en rettelse ét sted ikke kan glide fra det andet.
 */
export type KladdeTekst = Record<string, string>;
export type KladdeFlag = Record<string, boolean>;

export interface UdtruktFeltLignende {
  vaerdi: unknown;
  sikkerhed?: number;
}

/** Sikkerheden pr. felt afgør, om feltet skal fremhæves til manuel kontrol. */
export const usikkertFelt = (sikkerhed: number | undefined, taerskel: number): boolean =>
  (sikkerhed ?? 0) < taerskel;

/**
 * Lægger et AI-udtræk (job/fradrag/investering, hver med {vaerdi, sikkerhed}
 * pr. felt) ind i redigerbare tekst-/flag-opslagstavler. Et felt uden værdi
 * bliver tomt — der udfyldes aldrig med et gæt.
 */
export function kladdeFraUdtraek(grupper: {
  job?: Record<string, UdtruktFeltLignende>;
  fradrag?: Record<string, UdtruktFeltLignende>;
  investering?: Record<string, UdtruktFeltLignende>;
  revisorNotat?: string;
}): { tekst: KladdeTekst; flag: KladdeFlag } {
  const tekst: KladdeTekst = {};
  const flag: KladdeFlag = {};

  const læg = (kilde: Record<string, UdtruktFeltLignende> | undefined) => {
    if (!kilde) return;
    for (const [navn, felt] of Object.entries(kilde)) {
      if (typeof felt?.vaerdi === 'boolean') flag[navn] = felt.vaerdi;
      else tekst[navn] = felt?.vaerdi == null ? '' : String(felt.vaerdi);
    }
  };

  læg(grupper.job);
  læg(grupper.fradrag);
  læg(grupper.investering);
  if (grupper.revisorNotat) tekst.revisorNotat = grupper.revisorNotat;

  return { tekst, flag };
}

export const kladdeTal = (tekst: KladdeTekst, navn: string): number =>
  talFraFelt(String(tekst[navn] ?? ''));

export function kanGemmeKladde(
  valgtType: Bilagsklassifikation,
  tekst: KladdeTekst
): boolean {
  if (valgtType === 'JOB') return Boolean(tekst.hvervgiver?.trim());
  if (valgtType === 'FRADRAG') return Boolean(tekst.beskrivelse?.trim());
  if (valgtType === 'INVESTERING') return Boolean(tekst.titel?.trim());
  return false;
}

export function byggJobFraKladde(
  tekst: KladdeTekst,
  flag: KladdeFlag,
  indkomstAarId: string,
  bilagIds: string[]
): Omit<Job, 'id'> {
  const start = tekst.startDato || idag();
  const antalKm = kladdeTal(tekst, 'antalKm');
  return {
    indkomstAarId,
    hvervgiver: tekst.hvervgiver || '',
    honorar: kladdeTal(tekst, 'honorar'),
    startDato: start,
    slutDato: tekst.slutDato || start,
    betalingsDato: tekst.betalingsDato || '',
    transportmiddel: (tekst.transportmiddel as TransportMiddel) || 'NONE',
    antalKm,
    antalTure: Math.max(0, Math.round(kladdeTal(tekst, 'antalTure'))) || (antalKm ? 1 : 0),
    destinationAdresse: tekst.destinationAdresse || '',
    amBidragFritaget: Boolean(flag.amBidragFritaget),
    erRubrik17: Boolean(flag.erRubrik17),
    timerJob: kladdeTal(tekst, 'timerJob') || undefined,
    timerTransportForberedelse: kladdeTal(tekst, 'timerTransportForberedelse') || undefined,
    type: tekst.type || '',
    bilagIds,
    noter: tekst.revisorNotat || '',
  };
}

export function byggFradragFraKladde(
  tekst: KladdeTekst,
  indkomstAarId: string,
  bilagIds: string[]
): Omit<Fradrag, 'id'> {
  const beloeb = kladdeTal(tekst, 'fakturaBeloeb');
  const procent = tekst.fradragsProcent === '' ? 100 : kladdeTal(tekst, 'fradragsProcent');
  return {
    indkomstAarId,
    beskrivelse: tekst.beskrivelse || '',
    typeKategori: tekst.typeKategori || '',
    fakturaDato: tekst.fakturaDato || idag(),
    fakturaBeloeb: beloeb,
    fradragsProcent: procent,
    fradragIDKK: Math.round((beloeb * procent) / 100),
    bilagIds,
    revisorNotat: tekst.revisorNotat || '',
  };
}

export function byggInvesteringFraKladde(
  tekst: KladdeTekst,
  indkomstAarId: string,
  bilagIds: string[]
): Omit<Investering, 'id'> {
  return {
    indkomstAarId,
    titel: tekst.titel || '',
    beloeb: kladdeTal(tekst, 'beloeb'),
    fakturaDato: tekst.fakturaDato || idag(),
    bilagIds,
    noter: tekst.revisorNotat || '',
  };
}
