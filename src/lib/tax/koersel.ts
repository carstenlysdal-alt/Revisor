import { Satser } from './satser';

export type TransportMiddel = 'NONE' | 'OWN_CAR_MC' | 'OWN_BIKE' | 'PASSENGER';

/**
 * Kørsel knyttet til ét job.
 *
 * antalKm er strækningen for én tur, som den faktisk køres. Køres der frem og
 * tilbage samme dag, er det den samlede distance for dagen. antalTure er antal
 * gange strækningen er kørt.
 */
export interface KoerselsInput {
  id: string;
  transportmiddel: TransportMiddel;
  antalKm: number;
  antalTure: number;
  /** YYYY-MM-DD. Bruges kun til at afgøre rækkefølgen for 20.000 km-grænsen. */
  startDato: string;
}

export interface KoerselsLinje {
  jobId: string;
  kmIAlt: number;
  fradrag: number;
  /** Hvilken rubrik fradraget lander i. null når der ikke er kørsel. */
  rubrik: 29 | 51 | null;
  /** Sat når en del af strækningen faldt over den årlige 20.000 km-grænse. */
  kmOverAarsgraense: number;
}

export interface AaretsKoersel {
  linjer: KoerselsLinje[];
  fradragRubrik29: number;
  fradragRubrik51: number;
  erhvervsKmIAlt: number;
}

const rubrikFor = (t: TransportMiddel): 29 | 51 | null => {
  if (t === 'OWN_CAR_MC' || t === 'OWN_BIKE') return 29;
  if (t === 'PASSENGER') return 51;
  return null;
};

/**
 * Befordringsfradrag for én dags transport, jf. de trinvise satser.
 * De første 24 km giver intet fradrag, 25-120 km giver fuld sats, og alt
 * derover giver halv sats.
 */
export function beregnBefordringPrDag(kmPrDag: number, satser: Satser): number {
  const { bundfradragKm, sats25til120, satsOver120, graenseKm } = satser.befordring;
  if (kmPrDag <= bundfradragKm) return 0;

  const kmTilFuldSats = Math.min(kmPrDag, graenseKm) - bundfradragKm;
  const kmTilHalvSats = Math.max(0, kmPrDag - graenseKm);

  return kmTilFuldSats * sats25til120 + kmTilHalvSats * satsOver120;
}

/**
 * Beregner årets kørselsfradrag samlet.
 *
 * Grænsen på 20.000 km for erhvervsmæssig kørsel i egen bil er årlig, ikke pr.
 * job, så den kan kun beregnes på hele året under ét. Jobs behandles i
 * datorækkefølge, så den lavere sats rammer årets sidste kilometer.
 *
 * Grænsen anvendes her på tværs af samtlige hvervgivere. Reglen er formuleret
 * pr. arbejdsgiver, men med mange hvervgivere er den samlede opgørelse den
 * forsigtige læsning, og den giver aldrig et for højt fradrag.
 */
export function beregnAaretsKoersel(jobs: KoerselsInput[], satser: Satser): AaretsKoersel {
  const { bilMcFoerste20000, bilMcOver20000, cykelKnallert, kmGraense } =
    satser.erhvervsKoersel;

  const sorteret = [...jobs].sort((a, b) => a.startDato.localeCompare(b.startDato));
  let erhvervsKmBrugt = 0;

  const linjer: KoerselsLinje[] = sorteret.map((job) => {
    const rubrik = rubrikFor(job.transportmiddel);
    const km = Math.max(0, Number(job.antalKm) || 0);
    const ture = Math.max(0, Number(job.antalTure) || 0);
    const kmIAlt = km * ture;

    if (!rubrik || kmIAlt === 0) {
      return { jobId: job.id, kmIAlt: 0, fradrag: 0, rubrik, kmOverAarsgraense: 0 };
    }

    if (job.transportmiddel === 'OWN_CAR_MC') {
      const kmTilHoejSats = Math.max(0, Math.min(kmIAlt, kmGraense - erhvervsKmBrugt));
      const kmTilLavSats = kmIAlt - kmTilHoejSats;
      erhvervsKmBrugt += kmIAlt;

      return {
        jobId: job.id,
        kmIAlt,
        fradrag: Math.round(
          kmTilHoejSats * bilMcFoerste20000 + kmTilLavSats * bilMcOver20000
        ),
        rubrik,
        kmOverAarsgraense: kmTilLavSats,
      };
    }

    if (job.transportmiddel === 'OWN_BIKE') {
      erhvervsKmBrugt += kmIAlt;
      return {
        jobId: job.id,
        kmIAlt,
        fradrag: Math.round(kmIAlt * cykelKnallert),
        rubrik,
        kmOverAarsgraense: 0,
      };
    }

    // PASSENGER: befordringsfradrag, beregnet pr. dag og lagt sammen.
    return {
      jobId: job.id,
      kmIAlt,
      fradrag: Math.round(beregnBefordringPrDag(km, satser) * ture),
      rubrik,
      kmOverAarsgraense: 0,
    };
  });

  return {
    linjer,
    fradragRubrik29: linjer
      .filter((l) => l.rubrik === 29)
      .reduce((sum, l) => sum + l.fradrag, 0),
    fradragRubrik51: linjer
      .filter((l) => l.rubrik === 51)
      .reduce((sum, l) => sum + l.fradrag, 0),
    erhvervsKmIAlt: erhvervsKmBrugt,
  };
}

/**
 * Fradraget for ét enkelt job, uden hensyn til årets øvrige kørsel.
 * Bruges i formularen til at vise et tal, mens brugeren taster. Det endelige
 * fradrag kommer altid fra beregnAaretsKoersel().
 */
export function beregnKoerselForJob(job: KoerselsInput, satser: Satser): number {
  return beregnAaretsKoersel([job], satser).linjer[0]?.fradrag ?? 0;
}
