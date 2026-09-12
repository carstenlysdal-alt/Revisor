import type { AiExtractionResult } from '../types';

export function isCompleteAiSuggestion(result: AiExtractionResult | null): result is AiExtractionResult {
  if (!result) return false;
  if (result.classification === 'JOB') {
    return Boolean(result.job?.hvervgiver && Number(result.job.honorar) > 0 && result.job.startDato
      && Number(result.job.antalKm ?? 0) >= 0 && Number(result.job.antalTure ?? 1) >= 0);
  }
  if (result.classification === 'FRADRAG') {
    return Boolean(result.fradrag?.beskrivelse && Number(result.fradrag.fakturaBeloeb) > 0
      && Number(result.fradrag.fradragsProcent) >= 0 && Number(result.fradrag.fradragsProcent) <= 100);
  }
  if (result.classification === 'INVESTERING') {
    return Boolean(result.investering?.titel && Number(result.investering.beloeb) > 0 && result.investering.fakturaDato);
  }
  return false;
}

export function getAiSuggestionYear(result: AiExtractionResult): number | undefined {
  const date = result.job?.startDato ?? result.fradrag?.fakturaDato ?? result.investering?.fakturaDato;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) ? year : undefined;
}
