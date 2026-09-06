import { describe, it, expect } from 'vitest';
import { PosteringForslagSkema } from './skema';

describe('PosteringForslagSkema', () => {
  it('parser et gyldigt job-forslag', () => {
    const raa = {
      klassifikation: 'JOB',
      besked: 'Opretter et job for Vega Musikhus på 5.000 kr.',
      job: {
        hvervgiver: { vaerdi: 'Vega Musikhus', sikkerhed: 0.95 },
        honorar: { vaerdi: 5000, sikkerhed: 0.95 },
        startDato: { vaerdi: '2026-03-14', sikkerhed: 0.9 },
        slutDato: { vaerdi: null, sikkerhed: 0 },
        betalingsDato: { vaerdi: null, sikkerhed: 0 },
        destinationAdresse: { vaerdi: null, sikkerhed: 0 },
        transportmiddel: { vaerdi: 'OWN_CAR_MC', sikkerhed: 0.8 },
        antalKm: { vaerdi: 40, sikkerhed: 0.7 },
        antalTure: { vaerdi: 1, sikkerhed: 0.6 },
        amBidragFritaget: { vaerdi: false, sikkerhed: 0.9 },
        erRubrik17: { vaerdi: false, sikkerhed: 0.9 },
        type: { vaerdi: null, sikkerhed: 0 },
        timerJob: { vaerdi: null, sikkerhed: 0 },
        timerTransportForberedelse: { vaerdi: null, sikkerhed: 0 },
      },
    };

    const parset = PosteringForslagSkema.parse(raa);
    expect(parset.klassifikation).toBe('JOB');
    expect(parset.job?.hvervgiver.vaerdi).toBe('Vega Musikhus');
    expect(parset.job?.honorar.vaerdi).toBe(5000);
    expect(parset.job?.slutDato.vaerdi).toBeNull();
    expect(parset.fradrag).toBeUndefined();
    expect(parset.investering).toBeUndefined();
  });

  it('parser et fradrag uden job/investering, og manglende sikkerhed defaulter til 0', () => {
    const parset = PosteringForslagSkema.parse({
      klassifikation: 'FRADRAG',
      besked: 'Parkering på 145 kr.',
      fradrag: {
        beskrivelse: { vaerdi: 'Parkering' },
        typeKategori: { vaerdi: 'Parkering', sikkerhed: 0.8 },
        fakturaDato: { vaerdi: '2026-03-14', sikkerhed: 0.9 },
        fakturaBeloeb: { vaerdi: 145, sikkerhed: 0.9 },
        fradragsProcent: { vaerdi: 100, sikkerhed: 0.5 },
      },
    });

    expect(parset.klassifikation).toBe('FRADRAG');
    expect(parset.fradrag?.beskrivelse.sikkerhed).toBe(0);
    expect(parset.job).toBeUndefined();
  });

  it('afviser en klassifikation uden for JOB/FRADRAG/INVESTERING — UKENDT er ikke gyldig her', () => {
    expect(() =>
      PosteringForslagSkema.parse({ klassifikation: 'UKENDT', besked: 'noget' })
    ).toThrow();
  });

  it('sætter besked til tom streng, hvis den mangler, i stedet for at kaste', () => {
    const parset = PosteringForslagSkema.parse({ klassifikation: 'INVESTERING' });
    expect(parset.besked).toBe('');
    expect(parset.investering).toBeUndefined();
  });

  it('klemmer en sikkerhed uden for [0,1] ind i intervallet', () => {
    const parset = PosteringForslagSkema.parse({
      klassifikation: 'JOB',
      besked: 'x',
      job: {
        hvervgiver: { vaerdi: 'X', sikkerhed: 5 },
        honorar: { vaerdi: -3, sikkerhed: -1 },
      },
    });
    expect(parset.job?.hvervgiver.sikkerhed).toBe(1);
    expect(parset.job?.honorar.sikkerhed).toBe(0);
  });
});
