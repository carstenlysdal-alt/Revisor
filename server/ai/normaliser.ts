import type { BilagsAnalyse } from '../../src/types';
import type { RaaBilagsAnalyse } from './skema';
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
