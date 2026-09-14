import type { BilagsAnalyse, PosteringForslag } from '../../src/types';
import type { RaaBilagsAnalyse, RaaPosteringForslag } from './skema';
import { rensFelt, rensProsa } from './rens';

/**
 * Renser et validt udtræk, før det når grænsefladen.
 *
 * Reglen gælder alle felter, ikke kun dem der vises som prosa. Modellen
 * formaterer et hvervgivernavn lige så upålideligt som et afsnit brødtekst,
 * og et felt med fed skrift eller anførselstegn omkring hele værdien skal
 * ellers rettes manuelt hver eneste gang.
 */
const rensGruppe = <T>(gruppe: T | undefined): T | undefined => {
  if (!gruppe) return undefined;
  const ud: Record<string, { vaerdi: unknown; sikkerhed: number }> = {};

  for (const [navn, felt] of Object.entries(
    gruppe as Record<string, { vaerdi: unknown; sikkerhed: number }>
  )) {
    const vaerdi =
      typeof felt?.vaerdi === 'string' ? rensFelt(felt.vaerdi) || null : felt?.vaerdi ?? null;
    ud[navn] = { vaerdi, sikkerhed: felt?.sikkerhed ?? 0 };
  }

  return ud as T;
};

export function rensAnalyse(raa: RaaBilagsAnalyse): BilagsAnalyse {
  return {
    klassifikation: raa.klassifikation,
    sikkerhed: raa.sikkerhed,
    resume: rensProsa(raa.resume),
    revisorNotat: rensProsa(raa.revisorNotat),
    job: rensGruppe(raa.job),
    fradrag: rensGruppe(raa.fradrag),
    investering: rensGruppe(raa.investering),
  } as BilagsAnalyse;
}

export function rensPosteringForslag(raa: RaaPosteringForslag): PosteringForslag {
  return {
    klassifikation: raa.klassifikation,
    besked: rensProsa(raa.besked),
    job: rensGruppe(raa.job),
    fradrag: rensGruppe(raa.fradrag),
    investering: rensGruppe(raa.investering),
  } as PosteringForslag;
}

/**
 * Fletter et nyt forslag ind over et eksisterende aktivt forslag.
 * Hvis modellen kun returnerer de felter, brugeren lige har rettet/tilføjet,
 * bevares de eksisterende felter (fx hvervgiver og honorar).
 */
export function fletForslag(
  eksisterende: PosteringForslag | null | undefined,
  nyt: PosteringForslag
): PosteringForslag {
  if (!eksisterende || eksisterende.klassifikation !== nyt.klassifikation) {
    return nyt;
  }

  const fletGruppe = <
    T extends Record<string, { vaerdi: unknown; sikkerhed: number } | undefined>
  >(
    gamle?: T,
    nye?: T
  ): T | undefined => {
    if (!gamle) return nye;
    if (!nye) return gamle;
    const resultat = { ...gamle } as Record<string, { vaerdi: unknown; sikkerhed: number }>;
    for (const [felt, nyV] of Object.entries(nye)) {
      if (nyV && nyV.vaerdi !== null && nyV.vaerdi !== undefined && nyV.vaerdi !== '') {
        resultat[felt] = nyV;
      }
    }
    return resultat as T;
  };

  return {
    klassifikation: nyt.klassifikation,
    besked: nyt.besked || eksisterende.besked,
    job: fletGruppe(eksisterende.job, nyt.job),
    fradrag: fletGruppe(eksisterende.fradrag, nyt.fradrag),
    investering: fletGruppe(eksisterende.investering, nyt.investering),
  };
}

/**
 * Beriger et forslag til et honorarjob med automatisk beregnet afstand tur/retur,
 * hvis transportmiddel er sat og bopæl/destination er kendt.
 */
export async function enrichForslagMedAfstand(
  forslag: PosteringForslag,
  beregningKontekst: unknown
): Promise<PosteringForslag> {
  if (forslag.klassifikation !== 'JOB' || !forslag.job) {
    return forslag;
  }

  const transport = forslag.job.transportmiddel?.vaerdi;
  if (!transport || transport === 'NONE') {
    return forslag;
  }

  const bopael =
    (beregningKontekst as Record<string, unknown>)?.hjemmeadresse ||
    (beregningKontekst as Record<string, unknown>)?.bopaelsadresse;
  const destination =
    forslag.job.destinationAdresse?.vaerdi || forslag.job.hvervgiver?.vaerdi;

  if (!bopael || typeof bopael !== 'string' || !destination || typeof destination !== 'string') {
    return forslag;
  }

  const nuvaerendeKm = Number(forslag.job.antalKm?.vaerdi);
  if (!nuvaerendeKm || nuvaerendeKm <= 0) {
    try {
      const { beregnRuteDetaljer } = await import('../integrations/openrouteservice');
      const rute = await beregnRuteDetaljer(bopael, destination, { turRetur: true });
      if (rute.km > 0) {
        forslag.job.antalKm = { vaerdi: rute.km, sikkerhed: 0.95 };
        if (rute.fundetAdresse && !forslag.job.destinationAdresse?.vaerdi) {
          forslag.job.destinationAdresse = { vaerdi: rute.fundetAdresse, sikkerhed: 0.9 };
        } else if (!forslag.job.destinationAdresse?.vaerdi) {
          forslag.job.destinationAdresse = { vaerdi: destination, sikkerhed: 0.8 };
        }
        if (!forslag.job.antalTure?.vaerdi) {
          forslag.job.antalTure = { vaerdi: 1, sikkerhed: 0.9 };
        }
      }
    } catch {
      // Ignorer fejl så chat-svar aldrig blokeres
    }
  }

  return forslag;
}
