import type { IndkomstAar, Job, Fradrag, SkatteBeregningResultat } from '../types';
import { getSkatteRegler, type SkatteRegler } from '../data/danishTaxData';
import { calculateAaretsKoerselsfradrag } from './mileageCalculator';

function beregnProgressivSkat(indkomstEfterAm: number, regler: SkatteRegler) {
  const overGraense = (graense: number) => Math.max(0, indkomstEfterAm - graense);
  return {
    mellemskat: overGraense(regler.mellemskatGraense) * (regler.mellemskatProcent / 100),
    topskat: overGraense(regler.topskatGraense) * (regler.topskatProcent / 100),
    toptopskat: overGraense(regler.toptopskatGraense) * (regler.toptopskatProcent / 100),
  };
}

function rundPositivt(beloeb: number): number {
  return Math.round(Math.max(0, beloeb));
}

export function calculateDanishTaxes(
  indkomstAar: IndkomstAar,
  jobs: Job[],
  fradragList: Fradrag[]
): SkatteBeregningResultat {
  const regler = getSkatteRegler(indkomstAar.aar);
  const aktiveJobs = jobs.filter((job) => job.status !== 'AFLYST');
  const rubrik12Jobs = aktiveJobs.filter((job) => (job.rubrik ?? 12) === 12);
  const rubrik17Jobs = aktiveJobs.filter((job) => job.rubrik === 17);
  const honorarerAlt = rubrik12Jobs.reduce((sum, job) => sum + (Number(job.honorar) || 0), 0);
  const rubrik17Indkomst = rubrik17Jobs.reduce((sum, job) => sum + (Number(job.honorar) || 0), 0);

  // 2. AM-bidragspligtig indkomst
  const amPligtigeJobs = aktiveJobs.filter((job) => !job.amBidragFritaget);
  const amPligtigBIndkomst = amPligtigeJobs.reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const amBidrag = Math.round(amPligtigBIndkomst * (regler.amBidragProcent / 100));

  // 3. Rubrik 29: Øvrige fradrag i personlig indkomst
  // Består af:
  // a) Driftsomkostninger fra Fradrag-modulet
  const fradragKatalogSum = fradragList.reduce((sum, f) => sum + (Number(f.fradragIDKK) || 0), 0);

  // b) Kørselsfradrag for Egen bil/MC og Egen cykel
  const koersel = calculateAaretsKoerselsfradrag(indkomstAar.aar, aktiveJobs);
  const koerselsFradragRubrik29 = koersel.rubrik29;

  const oevrigeFradragRubrik29 = fradragKatalogSum + koerselsFradragRubrik29;

  // 4. Rubrik 51: Befordringsfradrag (kun passager)
  const befordringsFradragRubrik51 = koersel.rubrik51;

  // 5. Nettoindkomstgrænse i appens honorarmodel.
  // Konkrete aktiviteter kan skulle afgrænses særskilt; resultatet er derfor et kontrolestimat.
  const samletBIndkomst = honorarerAlt + rubrik17Indkomst;
  const maksTilladtFradragRubrik29 = Math.max(0, samletBIndkomst - amBidrag);
  const rubrik29LoftOverskredet = oevrigeFradragRubrik29 > maksTilladtFradragRubrik29;
  const overskydendeFradrag = Math.max(0, oevrigeFradragRubrik29 - maksTilladtFradragRubrik29);

  // Det fradragsbeløb der må modregnes i personlig indkomst
  const gaeldendeFradragRubrik29 = Math.min(oevrigeFradragRubrik29, maksTilladtFradragRubrik29);

  // 6. Personlig indkomst
  // Honorarer + Rubrik 17 - Rubrik 29 - AM-bidrag
  const personligBIndkomst = Math.max(0, samletBIndkomst - gaeldendeFradragRubrik29 - amBidrag);
  const aIndkomstEfterAm = Math.max(0, (indkomstAar.forventetAIndkomst || 0) * 0.92);
  const andenPersonligIndkomst = Math.max(0, indkomstAar.forventetPensionSUDagpenge || 0);
  const personligIndkomstUdenB = aIndkomstEfterAm + andenPersonligIndkomst;
  const samletPersonligIndkomst = personligIndkomstUdenB + personligBIndkomst;
  const personligIndkomst = personligBIndkomst;

  // 7. Skattepligtig indkomst
  // Personlig indkomst fratrukket ligningsmæssige fradrag (Rubrik 51 samt andre fradrag)
  const ligningsmaessigeFradrag = befordringsFradragRubrik51 + (indkomstAar.forventedeFradragAIndkomst || 0);
  const skattepligtigIndkomstUdenB = Math.max(
    0,
    personligIndkomstUdenB - (indkomstAar.forventedeFradragAIndkomst || 0),
  );
  const skattepligtigIndkomstMedB = Math.max(
    0,
    samletPersonligIndkomst - ligningsmaessigeFradrag,
  );
  const skattepligtigIndkomst = Math.max(0, skattepligtigIndkomstMedB - skattepligtigIndkomstUdenB);

  // 8. Skatteberegning
  const kommunePct = indkomstAar.kommuneSkatteprocent || 24.5;
  const kirkePct = indkomstAar.medlemFolkekirken ? (indkomstAar.kirkeskatteprocent || 0.8) : 0;
  const bundskatPct = regler.bundskatProcent;
  const bundskatGrundlagUdenB = Math.max(0, personligIndkomstUdenB - regler.personfradrag);
  const bundskatGrundlagMedB = Math.max(0, samletPersonligIndkomst - regler.personfradrag);
  const bundskat = rundPositivt((bundskatGrundlagMedB - bundskatGrundlagUdenB) * (bundskatPct / 100));
  const personfradragSkattevaerdi = 0;
  const kommuneskat = rundPositivt(
    (Math.max(0, skattepligtigIndkomstMedB - regler.personfradrag) -
      Math.max(0, skattepligtigIndkomstUdenB - regler.personfradrag)) *
      (kommunePct / 100),
  );
  const kirkeskat = rundPositivt(
    (Math.max(0, skattepligtigIndkomstMedB - regler.personfradrag) -
      Math.max(0, skattepligtigIndkomstUdenB - regler.personfradrag)) *
      (kirkePct / 100),
  );

  const progressionMedB = beregnProgressivSkat(samletPersonligIndkomst, regler);
  const progressionUdenB = beregnProgressivSkat(personligIndkomstUdenB, regler);
  const mellemskat = rundPositivt(progressionMedB.mellemskat - progressionUdenB.mellemskat);
  const topskat = rundPositivt(progressionMedB.topskat - progressionUdenB.topskat);
  const toptopskat = rundPositivt(progressionMedB.toptopskat - progressionUdenB.toptopskat);

  // 9. Personfradrag modregning
  // Hvis A-indkomst er f.eks. 0, bruger B-indkomsten fuldt personfradrag
  // Hvis A-indkomst > personfradrag, er personfradraget allerede brugt på A-indkomsten
  const beregnetSkatAlt = bundskat + kommuneskat + kirkeskat + mellemskat + topskat + toptopskat;
  const samletSkatOgAM = amBidrag + beregnetSkatAlt;
  const indtaegtEfterSkat = samletBIndkomst - samletSkatOgAM;

  const effektivSkatteprocent = samletBIndkomst > 0
    ? Math.round((samletSkatOgAM / samletBIndkomst) * 1000) / 10
    : 0;

  return {
    honorarerAlt,
    rubrik17Indkomst,
    amPligtigBIndkomst,
    amBidrag,
    oevrigeFradragRubrik29,
    fradragKatalogSum,
    koerselsFradragRubrik29,
    befordringsFradragRubrik51,
    personligIndkomst,
    skattepligtigIndkomst,
    bundskat,
    kommuneskat,
    topskat,
    mellemskat,
    toptopskat,
    kirkeskat,
    personfradragSkattevaerdi,
    beregnetSkatAlt,
    samletSkatOgAM,
    indtaegtEfterSkat,
    effektivSkatteprocent,
    rubrik29LoftOverskredet,
    maksTilladtFradragRubrik29,
    overskydendeFradrag,
    anvendtFradragRubrik29: gaeldendeFradragRubrik29,
    regelAar: regler.aar,
    erEstimat: true,
  };
}

export const calculateSkatOgFradrag = calculateDanishTaxes;
