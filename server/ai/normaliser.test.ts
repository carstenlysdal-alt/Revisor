import { describe, it, expect } from 'vitest';
import { rensAnalyse, rensPosteringForslag } from './normaliser';
import { BilagsAnalyseSkema, PosteringForslagSkema } from './skema';

describe('rensPosteringForslag', () => {
  it('fjerner markdown og omsluttende anførselstegn fra tekstfelter', () => {
    const raa = PosteringForslagSkema.parse({
      klassifikation: 'JOB',
      besked: '"Opretter et job for **Vega Musikhus**"',
      job: {
        hvervgiver: { vaerdi: '**Vega Musikhus**', sikkerhed: 0.9 },
        type: { vaerdi: '"Koncert"', sikkerhed: 0.6 },
      },
    });

    const rent = rensPosteringForslag(raa);

    expect(rent.besked).toBe('Opretter et job for **Vega Musikhus**');
    expect(rent.job?.hvervgiver.vaerdi).toBe('Vega Musikhus');
    expect(rent.job?.type.vaerdi).toBe('Koncert');
  });

  it('bevarer null-værdier i stedet for at gætte en tom streng ind som noget', () => {
    const raa = PosteringForslagSkema.parse({
      klassifikation: 'FRADRAG',
      besked: 'Et fradrag',
      fradrag: {
        beskrivelse: { vaerdi: 'Parkering', sikkerhed: 0.9 },
        fakturaDato: { vaerdi: null, sikkerhed: 0 },
      },
    });

    const rent = rensPosteringForslag(raa);
    expect(rent.fradrag?.fakturaDato.vaerdi).toBeNull();
  });

  it('lader tal og booleans stå urørt', () => {
    const raa = PosteringForslagSkema.parse({
      klassifikation: 'JOB',
      besked: 'x',
      job: {
        honorar: { vaerdi: 5000, sikkerhed: 0.9 },
        amBidragFritaget: { vaerdi: true, sikkerhed: 0.9 },
      },
    });

    const rent = rensPosteringForslag(raa);
    expect(rent.job?.honorar.vaerdi).toBe(5000);
    expect(rent.job?.amBidragFritaget.vaerdi).toBe(true);
  });
});

describe('rensAnalyse (regression — uændret af de nye tilføjelser)', () => {
  it('renser stadig et almindeligt bilagsudtræk', () => {
    const raa = BilagsAnalyseSkema.parse({
      klassifikation: 'FRADRAG',
      sikkerhed: 0.9,
      resume: 'En kvittering',
      revisorNotat: '"Fuldt fradrag i rubrik 29."',
      fradrag: { beskrivelse: { vaerdi: '**Parkering**', sikkerhed: 0.9 } },
    });

    const rent = rensAnalyse(raa);
    expect(rent.revisorNotat).toBe('Fuldt fradrag i rubrik 29.');
    expect(rent.fradrag?.beskrivelse.vaerdi).toBe('Parkering');
  });
});
