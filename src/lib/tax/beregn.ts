import { Satser, getSatser } from './satser';
import { KoerselsInput, beregnAaretsKoersel, AaretsKoersel } from './koersel';

export interface IndkomstAarInput {
  aar: number;
  kommuneSkatteprocent: number;
  kirkeskatteprocent: number;
  medlemFolkekirken: boolean;
  /** Brutto A-indkomst for hele året, før AM-bidrag. */
  forventetAIndkomst: number;
  /** Pension, SU og dagpenge. Ikke AM-pligtigt. */
  forventetPensionSUDagpenge: number;
  /** Fradrag i den personlige A-indkomst. Ikke B-indkomstfradrag. */
  forventedeFradragAIndkomst: number;
}

export interface JobInput extends KoerselsInput {
  honorar: number;
  amBidragFritaget: boolean;
  /** Rubrik 17 i stedet for rubrik 12: legater, gruppeliv, visse personalegoder. */
  erRubrik17?: boolean;
}

export interface FradragInput {
  fradragIDKK: number;
}

export interface SkattelinjeSaet {
  bundskat: number;
  kommuneskat: number;
  kirkeskat: number;
  mellemskat: number;
  topskat: number;
  topTopskat: number;
  skatteloftNedslag: number;
  personfradragVaerdi: number;
  beskaeftigelsesfradrag: number;
  jobfradrag: number;
  skattepligtigIndkomst: number;
  ialt: number;
}

export type AdvarselKode =
  | 'RUBRIK_29_LOFT'
  | 'KOMMUNESATS_MANGLER'
  | 'UVERIFICEREDE_SATSER';

export interface Advarsel {
  kode: AdvarselKode;
  tekst: string;
}

export interface SkatteBeregning {
  aar: number;
  satser: Satser;

  // Rubrikker
  honorarerRubrik12: number;
  rubrik17Indkomst: number;
  fradragKatalogSum: number;
  koerselsFradragRubrik29: number;
  oevrigeFradragRubrik29: number;
  befordringsFradragRubrik51: number;

  // AM-bidrag
  amPligtigBIndkomst: number;
  amBidrag: number;

  // Rubrik 29-loftet
  maksTilladtFradragRubrik29: number;
  rubrik29LoftOverskredet: boolean;
  overskydendeFradrag: number;
  anvendtFradragRubrik29: number;

  // Indkomstopgørelse for B-delen
  personligIndkomst: number;
  skattepligtigIndkomst: number;

  // Skat, opgjort som B-indkomstens marginale bidrag
  skat: SkattelinjeSaet;
  beregnetSkatIAlt: number;
  samletSkatOgAM: number;
  indtaegtEfterSkat: number;
  effektivSkatteprocent: number;
  /** Marginalskatten på den næste krone honorar. Bruges til opsparingsraten. */
  marginalskatProcent: number;

  koersel: AaretsKoersel;
  advarsler: Advarsel[];
}

/**
 * Beregner indkomstskatten af et givet grundlag.
 *
 * Funktionen er ren og kender intet til A- og B-indkomst. Fordelingen mellem
 * de to sker ved at kalde den to gange, med og uden B-indkomsten, og trække
 * resultaterne fra hinanden. Personfradrag, progressionsgrænser,
 * beskæftigelsesfradrag og skatteloft fordeler sig dermed korrekt af sig selv,
 * i stedet for gennem en skønnet andelsbrøk.
 */
export function beregnIndkomstskat(
  personligIndkomst: number,
  arbejdsindkomst: number,
  ekstraLigningsmaessigeFradrag: number,
  satser: Satser,
  kommuneProcent: number,
  kirkeProcent: number
): SkattelinjeSaet {
  const pi = Math.max(0, personligIndkomst);
  const arbejde = Math.max(0, arbejdsindkomst);

  const beskaeftigelsesfradrag = Math.min(
    (arbejde * satser.beskaeftigelsesfradrag.procent) / 100,
    satser.beskaeftigelsesfradrag.maksimum
  );
  const jobfradrag = Math.min(
    (Math.max(0, arbejde - satser.jobfradrag.bundgraense) * satser.jobfradrag.procent) / 100,
    satser.jobfradrag.maksimum
  );

  const ligningsmaessigeFradrag =
    beskaeftigelsesfradrag + jobfradrag + Math.max(0, ekstraLigningsmaessigeFradrag);
  const skattepligtigIndkomst = Math.max(0, pi - ligningsmaessigeFradrag);

  const bundskat = (pi * satser.bundskatProcent) / 100;
  const kommuneskat = (skattepligtigIndkomst * kommuneProcent) / 100;
  const kirkeskat = (skattepligtigIndkomst * kirkeProcent) / 100;

  const progressive: Record<string, number> = {
    mellemskat: 0,
    topskat: 0,
    topTopskat: 0,
  };
  let skatteloftNedslag = 0;
  let akkumuleretProgressivSats = 0;

  for (const lag of satser.progressiveSkatter) {
    akkumuleretProgressivSats += lag.procent;
    const grundlag = Math.max(0, pi - lag.graenseEfterAM);
    if (grundlag === 0) continue;

    progressive[lag.id] = (grundlag * lag.procent) / 100;

    // Skrå skatteloft: den samlede marginale sats i dette lag må ikke
    // overstige loftet. AM-bidrag og kirkeskat tæller ikke med.
    const marginalSats =
      satser.bundskatProcent + kommuneProcent + akkumuleretProgressivSats;
    const overskridelse = marginalSats - lag.skatteloftProcent;
    if (overskridelse > 0) {
      skatteloftNedslag += (grundlag * overskridelse) / 100;
    }
  }

  const bruttoSkat =
    bundskat +
    kommuneskat +
    kirkeskat +
    progressive.mellemskat +
    progressive.topskat +
    progressive.topTopskat;

  // Skatteværdien af personfradraget kan ikke nedsætte skatten til under nul.
  // Den fulde værdi er ens uanset indkomst, så uden loftet her ville linjen
  // altid gå i nul, når resultatet opgøres som forskellen mellem to beregninger.
  const fuldPersonfradragVaerdi =
    (satser.personfradrag * (satser.bundskatProcent + kommuneProcent + kirkeProcent)) / 100;
  const personfradragVaerdi = Math.min(
    fuldPersonfradragVaerdi,
    Math.max(0, bruttoSkat - skatteloftNedslag)
  );

  const ialt = bruttoSkat - skatteloftNedslag - personfradragVaerdi;

  return {
    bundskat,
    kommuneskat,
    kirkeskat,
    mellemskat: progressive.mellemskat,
    topskat: progressive.topskat,
    topTopskat: progressive.topTopskat,
    skatteloftNedslag,
    personfradragVaerdi,
    beskaeftigelsesfradrag,
    jobfradrag,
    skattepligtigIndkomst,
    ialt,
  };
}

const traek = (med: SkattelinjeSaet, uden: SkattelinjeSaet): SkattelinjeSaet => ({
  bundskat: Math.round(med.bundskat - uden.bundskat),
  kommuneskat: Math.round(med.kommuneskat - uden.kommuneskat),
  kirkeskat: Math.round(med.kirkeskat - uden.kirkeskat),
  mellemskat: Math.round(med.mellemskat - uden.mellemskat),
  topskat: Math.round(med.topskat - uden.topskat),
  topTopskat: Math.round(med.topTopskat - uden.topTopskat),
  skatteloftNedslag: Math.round(med.skatteloftNedslag - uden.skatteloftNedslag),
  personfradragVaerdi: Math.round(med.personfradragVaerdi - uden.personfradragVaerdi),
  beskaeftigelsesfradrag: Math.round(
    med.beskaeftigelsesfradrag - uden.beskaeftigelsesfradrag
  ),
  jobfradrag: Math.round(med.jobfradrag - uden.jobfradrag),
  skattepligtigIndkomst: Math.round(med.skattepligtigIndkomst - uden.skattepligtigIndkomst),
  ialt: Math.round(med.ialt - uden.ialt),
});

export function beregnSkat(
  indkomstAar: IndkomstAarInput,
  jobs: JobInput[],
  fradragListe: FradragInput[]
): SkatteBeregning {
  const satser = getSatser(indkomstAar.aar);
  const advarsler: Advarsel[] = [];

  const kommuneProcent = Number(indkomstAar.kommuneSkatteprocent) || 0;
  const kirkeProcent = indkomstAar.medlemFolkekirken
    ? Number(indkomstAar.kirkeskatteprocent) || 0
    : 0;

  if (kommuneProcent <= 0) {
    advarsler.push({
      kode: 'KOMMUNESATS_MANGLER',
      tekst:
        'Kommuneskatteprocenten mangler, så skatten kan ikke beregnes færdig. ' +
        'Den står på forskudsopgørelsen.',
    });
  }
  if (satser.uverificerede.length > 0) {
    advarsler.push({
      kode: 'UVERIFICEREDE_SATSER',
      tekst: `Følgende satser for ${satser.aar} er ikke bekræftet mod en kilde: ${satser.uverificerede.join(', ')}.`,
    });
  }

  // Rubrik 12 og 17
  const honorarerRubrik12 = jobs
    .filter((j) => !j.erRubrik17)
    .reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const rubrik17Indkomst = jobs
    .filter((j) => j.erRubrik17)
    .reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);

  // AM-bidrag
  const amPligtigBIndkomst = jobs
    .filter((j) => !j.amBidragFritaget)
    .reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const amBidrag = Math.round((amPligtigBIndkomst * satser.amBidragProcent) / 100);

  // Kørsel
  const koersel = beregnAaretsKoersel(jobs, satser);
  const koerselsFradragRubrik29 = koersel.fradragRubrik29;
  const befordringsFradragRubrik51 = koersel.fradragRubrik51;

  // Rubrik 29
  const fradragKatalogSum = fradragListe.reduce(
    (sum, f) => sum + (Number(f.fradragIDKK) || 0),
    0
  );
  const oevrigeFradragRubrik29 = fradragKatalogSum + koerselsFradragRubrik29;

  // Fradrag i rubrik 29 må ikke give underskud i den personlige indkomst.
  const maksTilladtFradragRubrik29 = Math.max(
    0,
    honorarerRubrik12 + rubrik17Indkomst - amBidrag
  );
  const rubrik29LoftOverskredet = oevrigeFradragRubrik29 > maksTilladtFradragRubrik29;
  const overskydendeFradrag = Math.max(
    0,
    oevrigeFradragRubrik29 - maksTilladtFradragRubrik29
  );
  const anvendtFradragRubrik29 = Math.min(
    oevrigeFradragRubrik29,
    maksTilladtFradragRubrik29
  );

  if (rubrik29LoftOverskredet) {
    advarsler.push({
      kode: 'RUBRIK_29_LOFT',
      tekst:
        `Fradragene i rubrik 29 overstiger B-indkomsten efter AM-bidrag med ` +
        `${overskydendeFradrag.toLocaleString('da-DK')} kr. Det overskydende beløb ` +
        `kan ikke fratrækkes, fordi rubrik 29 ikke må give underskud i den personlige indkomst.`,
    });
  }

  // A-indkomstens bidrag, som B-indkomsten lægger sig oven på.
  const aIndkomstEfterAM = Math.max(0, Number(indkomstAar.forventetAIndkomst) || 0) * 0.92;
  const personligIndkomstA = Math.max(
    0,
    aIndkomstEfterAM +
      (Number(indkomstAar.forventetPensionSUDagpenge) || 0) -
      (Number(indkomstAar.forventedeFradragAIndkomst) || 0)
  );

  // B-indkomstens egen opgørelse.
  const personligIndkomstB =
    honorarerRubrik12 + rubrik17Indkomst - amBidrag - anvendtFradragRubrik29;
  const arbejdsindkomstB = Math.max(
    0,
    amPligtigBIndkomst - amBidrag - anvendtFradragRubrik29
  );

  const udenB = beregnIndkomstskat(
    personligIndkomstA,
    aIndkomstEfterAM,
    0,
    satser,
    kommuneProcent,
    kirkeProcent
  );
  const medB = beregnIndkomstskat(
    personligIndkomstA + personligIndkomstB,
    aIndkomstEfterAM + arbejdsindkomstB,
    befordringsFradragRubrik51,
    satser,
    kommuneProcent,
    kirkeProcent
  );

  const skat = traek(medB, udenB);
  const beregnetSkatIAlt = skat.ialt;
  const samletSkatOgAM = amBidrag + beregnetSkatIAlt;
  const bruttoIndtaegt = honorarerRubrik12 + rubrik17Indkomst;
  const indtaegtEfterSkat = bruttoIndtaegt - samletSkatOgAM;

  // Marginalskat: hvad koster de næste 1.000 kr. honorar, inklusive AM-bidrag.
  const proeve = 1000;
  const amAfProeve = (proeve * satser.amBidragProcent) / 100;
  const medProeve = beregnIndkomstskat(
    personligIndkomstA + personligIndkomstB + (proeve - amAfProeve),
    aIndkomstEfterAM + arbejdsindkomstB + (proeve - amAfProeve),
    befordringsFradragRubrik51,
    satser,
    kommuneProcent,
    kirkeProcent
  );
  const marginalskatProcent =
    Math.round(((amAfProeve + medProeve.ialt - medB.ialt) / proeve) * 1000) / 10;

  return {
    aar: indkomstAar.aar,
    satser,
    honorarerRubrik12,
    rubrik17Indkomst,
    fradragKatalogSum,
    koerselsFradragRubrik29,
    oevrigeFradragRubrik29,
    befordringsFradragRubrik51,
    amPligtigBIndkomst,
    amBidrag,
    maksTilladtFradragRubrik29,
    rubrik29LoftOverskredet,
    overskydendeFradrag,
    anvendtFradragRubrik29,
    personligIndkomst: Math.round(personligIndkomstB),
    skattepligtigIndkomst: skat.skattepligtigIndkomst,
    skat,
    beregnetSkatIAlt,
    samletSkatOgAM,
    indtaegtEfterSkat,
    effektivSkatteprocent:
      bruttoIndtaegt > 0
        ? Math.round((samletSkatOgAM / bruttoIndtaegt) * 1000) / 10
        : 0,
    marginalskatProcent,
    koersel,
    advarsler,
  };
}

/**
 * Et job hører til det indkomstår, arbejdet er udført i, ikke det år honoraret
 * bliver udbetalt. Krydser et job årsskiftet, følger det startdatoen.
 */
export function indkomstAarForJob(job: { startDato: string }): number {
  return Number(job.startDato.slice(0, 4));
}

export function betalingKrydserAarsskifte(job: {
  startDato: string;
  betalingsDato?: string;
}): boolean {
  if (!job.betalingsDato) return false;
  return job.betalingsDato.slice(0, 4) !== job.startDato.slice(0, 4);
}
