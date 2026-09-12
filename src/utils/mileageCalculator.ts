import { getSkatteRegler } from '../data/danishTaxData';
import type { Job, TransportMiddel } from '../types';

const MAX_HOEJ_BILTAKST_KM = 20000;

function normaliserKm(km: number, ture: number): { kmPerTur: number; antalTure: number } {
  return {
    kmPerTur: Math.max(0, Number(km) || 0),
    antalTure: Math.max(0, Math.floor(Number(ture) || 0)),
  };
}

export function calculateBefordringsfradrag(aar: number, kmPerDag: number, dage = 1): number {
  const regler = getSkatteRegler(aar);
  const { kmPerTur, antalTure } = normaliserKm(kmPerDag, dage);
  const mellemKm = Math.max(
    0,
    Math.min(kmPerTur, regler.befordringMellemGraenseKm) - regler.befordringBundgraenseKm,
  );
  const hoejeKm = Math.max(0, kmPerTur - regler.befordringMellemGraenseKm);
  return Math.round(
    (mellemKm * regler.befordringMellemTakst + hoejeKm * regler.befordringHoejTakst) * antalTure,
  );
}

export function calculateJobKoerselsfradrag(
  aar: number,
  transportmiddel: TransportMiddel,
  km: number,
  ture: number,
): number {
  const regler = getSkatteRegler(aar);
  const { kmPerTur, antalTure } = normaliserKm(km, ture);
  const totalKm = kmPerTur * antalTure;

  if (transportmiddel === 'OWN_CAR_MC') {
    return Math.round(totalKm * regler.takstBilMCFoerste20k);
  }
  if (transportmiddel === 'OWN_BIKE') {
    return Math.round(totalKm * regler.takstCykelPrKm);
  }
  if (transportmiddel === 'PASSENGER') {
    return calculateBefordringsfradrag(aar, kmPerTur, antalTure);
  }
  return 0;
}

export function calculateAaretsKoerselsfradrag(
  aar: number,
  jobs: Job[],
): { rubrik29: number; rubrik51: number } {
  const resultat = calculateAaretsKoerselsfradragMedPoster(aar, jobs);
  return { rubrik29: resultat.rubrik29, rubrik51: resultat.rubrik51 };
}

export function calculateAaretsKoerselsfradragMedPoster(
  aar: number,
  jobs: Job[],
): { rubrik29: number; rubrik51: number; prJob: Record<string, number> } {
  const regler = getSkatteRegler(aar);
  const bilKmPrHvervgiver = new Map<string, number>();
  let rubrik29 = 0;
  let rubrik51 = 0;
  const prJob: Record<string, number> = {};

  const sorteredeJobs = [...jobs].sort((a, b) => a.startDato.localeCompare(b.startDato));
  for (const job of sorteredeJobs) {
    if (job.status === 'AFLYST') {
      prJob[job.id] = 0;
      continue;
    }
    const { kmPerTur, antalTure } = normaliserKm(job.antalKm, job.antalTure);
    const totalKm = kmPerTur * antalTure;

    if (job.transportmiddel === 'OWN_CAR_MC') {
      const hvervgiverKey = job.hvervgiver.trim().toLocaleLowerCase('da-DK') || job.id;
      const bilKmBrugt = bilKmPrHvervgiver.get(hvervgiverKey) ?? 0;
      const kmPaaHoejTakst = Math.max(0, Math.min(totalKm, MAX_HOEJ_BILTAKST_KM - bilKmBrugt));
      const kmPaaLavTakst = Math.max(0, totalKm - kmPaaHoejTakst);
      const fradrag = Math.round(
        kmPaaHoejTakst * regler.takstBilMCFoerste20k + kmPaaLavTakst * regler.takstBilMCOver20k,
      );
      rubrik29 += fradrag;
      prJob[job.id] = fradrag;
      bilKmPrHvervgiver.set(hvervgiverKey, bilKmBrugt + totalKm);
    } else if (job.transportmiddel === 'OWN_BIKE') {
      const fradrag = Math.round(totalKm * regler.takstCykelPrKm);
      rubrik29 += fradrag;
      prJob[job.id] = fradrag;
    } else if (job.transportmiddel === 'PASSENGER') {
      const fradrag = calculateBefordringsfradrag(aar, kmPerTur, antalTure);
      rubrik51 += fradrag;
      prJob[job.id] = fradrag;
    } else {
      prJob[job.id] = 0;
    }
  }

  return { rubrik29, rubrik51, prJob };
}
