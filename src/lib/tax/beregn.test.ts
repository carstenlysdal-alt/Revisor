import { describe, it, expect } from 'vitest';
import {
  beregnSkat,
  beregnIndkomstskat,
  indkomstAarForJob,
  betalingKrydserAarsskifte,
  IndkomstAarInput,
  JobInput,
} from './beregn';
import { getSatser, UkendtIndkomstAarError } from './satser';
import { beregnAaretsKoersel, beregnBefordringPrDag } from './koersel';
import { erKommuneBekraeftet } from './kommuner';

const aar = (over: Partial<IndkomstAarInput> = {}): IndkomstAarInput => ({
  aar: 2026,
  kommuneSkatteprocent: 25.0,
  kirkeskatteprocent: 0.87,
  medlemFolkekirken: false,
  forventetAIndkomst: 0,
  forventetPensionSUDagpenge: 0,
  forventedeFradragAIndkomst: 0,
  ...over,
});

const job = (over: Partial<JobInput> = {}): JobInput => ({
  id: 'job-1',
  honorar: 10_000,
  amBidragFritaget: false,
  transportmiddel: 'NONE',
  antalKm: 0,
  antalTure: 0,
  startDato: '2026-03-14',
  ...over,
});

describe('satser', () => {
  it('kaster på et år uden vedtagne satser i stedet for at låne et andet års tal', () => {
    expect(() => getSatser(2027)).toThrow(UkendtIndkomstAarError);
  });

  it('holder årene adskilt', () => {
    expect(getSatser(2025).personfradrag).toBe(51_600);
    expect(getSatser(2026).personfradrag).toBe(54_100);
    expect(getSatser(2025).erhvervsKoersel.bilMcFoerste20000).toBe(3.81);
    expect(getSatser(2026).erhvervsKoersel.bilMcFoerste20000).toBe(3.94);
  });

  it('kender 2026-progressionen med mellemskat og top-topskat', () => {
    expect(getSatser(2025).progressiveSkatter.map((p) => p.id)).toEqual(['topskat']);
    expect(getSatser(2026).progressiveSkatter.map((p) => p.id)).toEqual([
      'mellemskat',
      'topskat',
      'topTopskat',
    ]);
  });

  it('regner samme indkomst forskelligt i 2025 og 2026', () => {
    const jobs = [job({ honorar: 300_000 })];
    const a = beregnSkat(aar({ aar: 2025 }), jobs, []);
    const b = beregnSkat(aar({ aar: 2026 }), jobs, []);
    expect(a.beregnetSkatIAlt).not.toBe(b.beregnetSkatIAlt);
  });
});

describe('AC-01 — kørsel i egen bil lander i rubrik 29', () => {
  const beregning = beregnSkat(
    aar(),
    [
      job({
        honorar: 4_000,
        transportmiddel: 'OWN_CAR_MC',
        antalKm: 42,
        antalTure: 2,
      }),
    ],
    []
  );

  it('beregner fradraget efter Skatterådets sats for erhvervsmæssig kørsel', () => {
    expect(beregning.koerselsFradragRubrik29).toBe(Math.round(84 * 3.94));
  });

  it('lægger intet i rubrik 51', () => {
    expect(beregning.befordringsFradragRubrik51).toBe(0);
  });

  it('tæller kørslen med i rubrik 29', () => {
    expect(beregning.oevrigeFradragRubrik29).toBe(beregning.koerselsFradragRubrik29);
  });
});

describe('AC-02 — passager lander i rubrik 51', () => {
  const beregning = beregnSkat(
    aar(),
    [
      job({
        honorar: 20_000,
        transportmiddel: 'PASSENGER',
        antalKm: 100,
        antalTure: 2,
      }),
    ],
    []
  );

  it('lægger intet i rubrik 29', () => {
    expect(beregning.koerselsFradragRubrik29).toBe(0);
  });

  it('bruger befordringssatsen med bundfradrag på 24 km', () => {
    expect(beregning.befordringsFradragRubrik51).toBe(Math.round((100 - 24) * 3.17 * 2));
  });
});

describe('befordringsfradragets trin', () => {
  const satser = getSatser(2026);

  it('giver intet fradrag under 24 km', () => {
    expect(beregnBefordringPrDag(24, satser)).toBe(0);
    expect(beregnBefordringPrDag(10, satser)).toBe(0);
  });

  it('giver halv sats over 120 km', () => {
    const km = 200;
    const forventet = (120 - 24) * 3.17 + (km - 120) * 1.59;
    expect(beregnBefordringPrDag(km, satser)).toBeCloseTo(forventet, 6);
  });
});

describe('AC-03 — rubrik 29 må ikke give underskud i personlig indkomst', () => {
  const beregning = beregnSkat(
    aar(),
    [job({ honorar: 10_000 })],
    [{ fradragIDKK: 12_000 }]
  );

  it('sætter loftet til B-indkomsten efter AM-bidrag', () => {
    expect(beregning.amBidrag).toBe(800);
    expect(beregning.maksTilladtFradragRubrik29).toBe(9_200);
  });

  it('markerer at loftet er overskredet og med hvor meget', () => {
    expect(beregning.rubrik29LoftOverskredet).toBe(true);
    expect(beregning.overskydendeFradrag).toBe(2_800);
  });

  it('anvender kun fradraget op til loftet, så personlig indkomst ikke bliver negativ', () => {
    expect(beregning.anvendtFradragRubrik29).toBe(9_200);
    expect(beregning.personligIndkomst).toBe(0);
  });

  it('giver en advarsel, der kan vises for brugeren', () => {
    expect(beregning.advarsler.map((a) => a.kode)).toContain('RUBRIK_29_LOFT');
  });

  it('rører ikke loftet, når fradragene holder sig under', () => {
    const ok = beregnSkat(aar(), [job({ honorar: 10_000 })], [{ fradragIDKK: 9_200 }]);
    expect(ok.rubrik29LoftOverskredet).toBe(false);
    expect(ok.overskydendeFradrag).toBe(0);
  });
});

describe('AC-06 — et job hører til året, arbejdet er udført i', () => {
  const nytaarsjob = { startDato: '2025-12-30', betalingsDato: '2026-01-15' };

  it('allokerer efter startdato, ikke betalingsdato', () => {
    expect(indkomstAarForJob(nytaarsjob)).toBe(2025);
  });

  it('kan oplyse, at betalingen falder i et andet år', () => {
    expect(betalingKrydserAarsskifte(nytaarsjob)).toBe(true);
    expect(
      betalingKrydserAarsskifte({ startDato: '2026-03-14', betalingsDato: '2026-03-31' })
    ).toBe(false);
  });
});

describe('AM-bidrag', () => {
  it('holder fritagne honorarer uden for grundlaget, men med i rubrik 12', () => {
    const beregning = beregnSkat(
      aar(),
      [
        job({ id: 'a', honorar: 10_000, amBidragFritaget: false }),
        job({ id: 'b', honorar: 15_000, amBidragFritaget: true }),
      ],
      []
    );
    expect(beregning.honorarerRubrik12).toBe(25_000);
    expect(beregning.amPligtigBIndkomst).toBe(10_000);
    expect(beregning.amBidrag).toBe(800);
  });
});

describe('den årlige 20.000 km-grænse for erhvervsmæssig kørsel', () => {
  it('bruger den lave sats på årets kilometer over grænsen', () => {
    const satser = getSatser(2026);
    const resultat = beregnAaretsKoersel(
      [
        { id: 'a', transportmiddel: 'OWN_CAR_MC', antalKm: 15_000, antalTure: 1, startDato: '2026-02-01' },
        { id: 'b', transportmiddel: 'OWN_CAR_MC', antalKm: 10_000, antalTure: 1, startDato: '2026-09-01' },
      ],
      satser
    );

    expect(resultat.linjer[0].fradrag).toBe(Math.round(15_000 * 3.94));
    expect(resultat.linjer[1].fradrag).toBe(Math.round(5_000 * 3.94 + 5_000 * 2.28));
    expect(resultat.linjer[1].kmOverAarsgraense).toBe(5_000);
  });

  it('anvender grænsen i datorækkefølge, ikke i indtastningsrækkefølge', () => {
    const satser = getSatser(2026);
    const omvendt = beregnAaretsKoersel(
      [
        { id: 'sen', transportmiddel: 'OWN_CAR_MC', antalKm: 10_000, antalTure: 1, startDato: '2026-09-01' },
        { id: 'tidlig', transportmiddel: 'OWN_CAR_MC', antalKm: 15_000, antalTure: 1, startDato: '2026-02-01' },
      ],
      satser
    );
    expect(omvendt.linjer.find((l) => l.jobId === 'tidlig')!.kmOverAarsgraense).toBe(0);
    expect(omvendt.linjer.find((l) => l.jobId === 'sen')!.kmOverAarsgraense).toBe(5_000);
  });
});

describe('personfradrag fordelt mellem A- og B-indkomst', () => {
  it('lader B-indkomsten bruge hele personfradraget, når der ingen A-indkomst er', () => {
    const beregning = beregnSkat(aar(), [job({ honorar: 40_000 })], []);
    // 40.000 minus 8 % AM er 36.800, som er under personfradraget på 54.100.
    expect(beregning.skat.ialt).toBe(0);
    expect(beregning.samletSkatOgAM).toBe(beregning.amBidrag);
  });

  it('lader B-indkomsten betale fuld skat, når A-indkomsten allerede har brugt fradraget', () => {
    const uden = beregnSkat(aar({ forventetAIndkomst: 0 }), [job({ honorar: 40_000 })], []);
    const med = beregnSkat(
      aar({ forventetAIndkomst: 400_000 }),
      [job({ honorar: 40_000 })],
      []
    );
    expect(med.beregnetSkatIAlt).toBeGreaterThan(uden.beregnetSkatIAlt);
  });
});

describe('skrå skatteloft', () => {
  const satser = getSatser(2026);

  it('giver nedslag, når kommuneskatten løfter marginalsatsen over loftet', () => {
    // 12,01 + 26,30 + 7,50 = 45,81 mod et mellemskatteloft på 44,57.
    const overGraensen = 700_000;
    const resultat = beregnIndkomstskat(overGraensen, overGraensen, 0, satser, 26.3, 0);
    const grundlag = overGraensen - 641_200;
    expect(resultat.skatteloftNedslag).toBeCloseTo((grundlag * (45.81 - 44.57)) / 100, 4);
  });

  it('giver intet nedslag, når marginalsatsen holder sig under loftet', () => {
    const resultat = beregnIndkomstskat(700_000, 700_000, 0, satser, 24.0, 0);
    expect(resultat.skatteloftNedslag).toBe(0);
  });
});

describe('kirkeskat', () => {
  it('opkræves kun af medlemmer af folkekirken', () => {
    const jobs = [job({ honorar: 300_000 })];
    const medlem = beregnSkat(aar({ medlemFolkekirken: true }), jobs, []);
    const ikkeMedlem = beregnSkat(aar({ medlemFolkekirken: false }), jobs, []);
    expect(medlem.skat.kirkeskat).toBeGreaterThan(0);
    expect(ikkeMedlem.skat.kirkeskat).toBe(0);
    expect(medlem.beregnetSkatIAlt).toBeGreaterThan(ikkeMedlem.beregnetSkatIAlt);
  });
});

describe('tomt indkomstår', () => {
  it('giver nul hele vejen igennem uden at kaste', () => {
    const beregning = beregnSkat(aar(), [], []);
    expect(beregning.honorarerRubrik12).toBe(0);
    expect(beregning.amBidrag).toBe(0);
    expect(beregning.samletSkatOgAM).toBe(0);
    expect(beregning.effektivSkatteprocent).toBe(0);
  });
});

describe('skattelinjerne skal kunne lægges sammen', () => {
  const linjesum = (b: ReturnType<typeof beregnSkat>) =>
    b.skat.bundskat +
    b.skat.kommuneskat +
    b.skat.kirkeskat +
    b.skat.mellemskat +
    b.skat.topskat +
    b.skat.topTopskat -
    b.skat.skatteloftNedslag -
    b.skat.personfradragVaerdi;

  it('summerer til den beregnede skat uden A-indkomst', () => {
    const b = beregnSkat(aar({ medlemFolkekirken: true }), [job({ honorar: 300_000 })], []);
    expect(Math.abs(linjesum(b) - b.beregnetSkatIAlt)).toBeLessThanOrEqual(3);
  });

  it('summerer til den beregnede skat med A-indkomst', () => {
    const b = beregnSkat(
      aar({ forventetAIndkomst: 400_000, medlemFolkekirken: true }),
      [job({ honorar: 300_000 })],
      []
    );
    expect(Math.abs(linjesum(b) - b.beregnetSkatIAlt)).toBeLessThanOrEqual(3);
  });

  it('viser personfradragets værdi som nul, når A-indkomsten allerede har brugt det', () => {
    const b = beregnSkat(
      aar({ forventetAIndkomst: 400_000 }),
      [job({ honorar: 50_000 })],
      []
    );
    expect(b.skat.personfradragVaerdi).toBe(0);
  });

  it('lader B-indkomsten få personfradragets værdi, når der ingen A-indkomst er', () => {
    const b = beregnSkat(aar(), [job({ honorar: 300_000 })], []);
    expect(b.skat.personfradragVaerdi).toBeGreaterThan(0);
  });

  it('lader aldrig skatten blive negativ ved en meget lille B-indkomst', () => {
    const b = beregnSkat(aar(), [job({ honorar: 5_000 })], []);
    expect(b.beregnetSkatIAlt).toBeGreaterThanOrEqual(0);
  });
});

describe('bekræftede kommunesatser fra den officielle satsopgørelse', () => {
  it('kender flere kommuner for 2026 end blot dem der var kendt før september-opdateringen', () => {
    expect(erKommuneBekraeftet('Herning', 2026)).toBe(true);
    expect(erKommuneBekraeftet('Gentofte', 2026)).toBe(true);
  });

  it('kender nu mindst én kommune for 2025', () => {
    expect(erKommuneBekraeftet('Læsø', 2025)).toBe(true);
  });
});

describe('bestyrelseshverv uden godtgørelse bruger befordringsfradraget, ikke §9B', () => {
  it('lander i rubrik 51 for egen bil, ligesom en passager ville', () => {
    const beregning = beregnSkat(
      aar(),
      [
        job({
          transportmiddel: 'OWN_CAR_MC',
          antalKm: 100,
          antalTure: 1,
          erBestyrelseshverv: true,
        }),
      ],
      []
    );
    expect(beregning.koerselsFradragRubrik29).toBe(0);
    expect(beregning.befordringsFradragRubrik51).toBe(Math.round((100 - 24) * 3.17));
  });

  it('lander stadig i rubrik 29 for en kunstner uden bestyrelsesflaget', () => {
    const beregning = beregnSkat(
      aar(),
      [job({ transportmiddel: 'OWN_CAR_MC', antalKm: 100, antalTure: 1 })],
      []
    );
    expect(beregning.befordringsFradragRubrik51).toBe(0);
    expect(beregning.koerselsFradragRubrik29).toBe(Math.round(100 * 3.94));
  });

  it('gælder også egen cykel', () => {
    const beregning = beregnSkat(
      aar(),
      [
        job({
          transportmiddel: 'OWN_BIKE',
          antalKm: 50,
          antalTure: 1,
          erBestyrelseshverv: true,
        }),
      ],
      []
    );
    expect(beregning.koerselsFradragRubrik29).toBe(0);
    expect(beregning.befordringsFradragRubrik51).toBe(Math.round((50 - 24) * 3.17));
  });

  it('tæller ikke med i den årlige 20.000 km-grænse for erhvervsmæssig kørsel', () => {
    const satser = getSatser(2026);
    const resultat = beregnAaretsKoersel(
      [
        {
          id: 'bestyrelse',
          transportmiddel: 'OWN_CAR_MC',
          antalKm: 25_000,
          antalTure: 1,
          startDato: '2026-01-01',
          erBestyrelseshverv: true,
        },
        {
          id: 'kunstner',
          transportmiddel: 'OWN_CAR_MC',
          antalKm: 5_000,
          antalTure: 1,
          startDato: '2026-06-01',
        },
      ],
      satser
    );
    // Kunstnerens 5.000 km skal stadig ramme den høje sats, fordi
    // bestyrelseskørslen ikke bruger af den fælles 20.000 km-pulje.
    expect(resultat.linjer.find((l) => l.jobId === 'kunstner')!.fradrag).toBe(
      Math.round(5_000 * 3.94)
    );
  });
});
