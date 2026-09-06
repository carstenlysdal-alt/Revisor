import { IndkomstAar, Job, Fradrag, SkatteBeregningResultat } from '../types';
import { SKATTESATSER } from '../data/danishTaxData';

export function calculateDanishTaxes(
  indkomstAar: IndkomstAar,
  jobs: Job[],
  fradragList: Fradrag[]
): SkatteBeregningResultat {
  // 1. Honorarer (Rubrik 12)
  const honorarerAlt = jobs.reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const rubrik17Indkomst = 0; // Standard 0 medmindre specificeret

  // 2. AM-bidragspligtig indkomst
  const amPligtigeJobs = jobs.filter((j) => !j.amBidragFritaget);
  const amPligtigBIndkomst = amPligtigeJobs.reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const amBidrag = Math.round(amPligtigBIndkomst * (SKATTESATSER.amBidragProcent / 100));

  // 3. Rubrik 29: Øvrige fradrag i personlig indkomst
  // Består af:
  // a) Driftsomkostninger fra Fradrag-modulet
  const fradragKatalogSum = fradragList.reduce((sum, f) => sum + (Number(f.fradragIDKK) || 0), 0);

  // b) Kørselsfradrag for Egen bil/MC og Egen cykel
  const koerselsFradragRubrik29 = jobs
    .filter((j) => j.transportmiddel === 'OWN_CAR_MC' || j.transportmiddel === 'OWN_BIKE')
    .reduce((sum, j) => sum + (Number(j.koerselsFradrag) || 0), 0);

  const oevrigeFradragRubrik29 = fradragKatalogSum + koerselsFradragRubrik29;

  // 4. Rubrik 51: Befordringsfradrag (kun passager)
  const befordringsFradragRubrik51 = jobs
    .filter((j) => j.transportmiddel === 'PASSENGER')
    .reduce((sum, j) => sum + (Number(j.koerselsFradrag) || 0), 0);

  // 5. Lovbestemt grænse for Rubrik 29
  // Fradrag i rubrik 29 må IKKE overstige B-indkomst efter AM-bidrag
  const maksTilladtFradragRubrik29 = Math.max(0, honorarerAlt + rubrik17Indkomst - amBidrag);
  const rubrik29LoftOverskredet = oevrigeFradragRubrik29 > maksTilladtFradragRubrik29;
  const overskydendeFradrag = Math.max(0, oevrigeFradragRubrik29 - maksTilladtFradragRubrik29);

  // Det fradragsbeløb der må modregnes i personlig indkomst
  const gaeldendeFradragRubrik29 = Math.min(oevrigeFradragRubrik29, maksTilladtFradragRubrik29);

  // 6. Personlig indkomst
  // Honorarer + Rubrik 17 - Rubrik 29 - AM-bidrag
  const personligIndkomst = Math.max(
    0,
    honorarerAlt + rubrik17Indkomst - gaeldendeFradragRubrik29 - amBidrag
  );

  // 7. Skattepligtig indkomst
  // Personlig indkomst fratrukket ligningsmæssige fradrag (Rubrik 51 samt andre fradrag)
  const ligningsmaessigeFradrag = befordringsFradragRubrik51 + (indkomstAar.forventedeFradragAIndkomst || 0);
  const skattepligtigIndkomst = Math.max(0, personligIndkomst - ligningsmaessigeFradrag);

  // 8. Skatteberegning
  const kommunePct = indkomstAar.kommuneSkatteprocent || 24.5;
  const kirkePct = indkomstAar.medlemFolkekirken ? (indkomstAar.kirkeskatteprocent || 0.8) : 0;
  const bundskatPct = SKATTESATSER.bundskatProcent; // 12.06%

  const bundskat = Math.round(personligIndkomst * (bundskatPct / 100));
  const kommuneskat = Math.round(skattepligtigIndkomst * (kommunePct / 100));
  const kirkeskat = Math.round(skattepligtigIndkomst * (kirkePct / 100));

  // Topskat (15% på indkomst over grænsen, f.eks. 588.900 kr.)
  const samletGrundlagForTopskat = personligIndkomst + (indkomstAar.forventetAIndkomst || 0);
  let topskat = 0;
  if (samletGrundlagForTopskat > SKATTESATSER.topskatGraense2026) {
    const samletTopskatGrundlag = samletGrundlagForTopskat - SKATTESATSER.topskatGraense2026;
    // Andel af topskat der tilhører B-indkomsten
    const bIndkomstAndel = personligIndkomst / Math.max(1, samletGrundlagForTopskat);
    topskat = Math.round(samletTopskatGrundlag * (SKATTESATSER.topskatProcent / 100) * bIndkomstAndel);
  }

  // 9. Personfradrag modregning
  // Hvis A-indkomst er f.eks. 0, bruger B-indkomsten fuldt personfradrag
  // Hvis A-indkomst > personfradrag, er personfradraget allerede brugt på A-indkomsten
  const brugtPersonfradragA = Math.min(SKATTESATSER.personfradrag2026, indkomstAar.forventetAIndkomst || 0);
  const resterendePersonfradrag = Math.max(0, SKATTESATSER.personfradrag2026 - brugtPersonfradragA);
  const anvendtPersonfradrag = Math.min(resterendePersonfradrag, personligIndkomst);

  // Skatteværdi af personfradrag = personfradrag * (bundskat + kommune + kirke)
  const personfradragSkattevaerdi = Math.round(
    anvendtPersonfradrag * ((bundskatPct + kommunePct + kirkePct) / 100)
  );

  // 10. Samlet beregnet skat
  const bruttoSkat = bundskat + kommuneskat + kirkeskat + topskat;
  const beregnetSkatAlt = Math.max(0, bruttoSkat - personfradragSkattevaerdi);
  const samletSkatOgAM = amBidrag + beregnetSkatAlt;
  const indtaegtEfterSkat = honorarerAlt - samletSkatOgAM;

  const effektivSkatteprocent = honorarerAlt > 0
    ? Math.round((samletSkatOgAM / honorarerAlt) * 1000) / 10
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
    kirkeskat,
    personfradragSkattevaerdi,
    beregnetSkatAlt,
    samletSkatOgAM,
    indtaegtEfterSkat,
    effektivSkatteprocent,
    rubrik29LoftOverskredet,
    maksTilladtFradragRubrik29,
    overskydendeFradrag,
  };
}

export const calculateSkatOgFradrag = calculateDanishTaxes;
