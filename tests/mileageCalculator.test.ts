import assert from 'node:assert/strict';
import test from 'node:test';
import type { Job } from '../src/types';
import {
  calculateAaretsKoerselsfradrag,
  calculateBefordringsfradrag,
} from '../src/utils/mileageCalculator';

function carJob(id: string, hvervgiver: string, km: number): Job {
  return {
    id,
    indkomstAarId: 'aar-2026',
    hvervgiver,
    honorar: 10_000,
    startDato: '2026-01-01',
    slutDato: '2026-01-01',
    betalingsDato: '2026-01-15',
    transportmiddel: 'OWN_CAR_MC',
    antalKm: km,
    antalTure: 1,
    koerselsFradrag: 0,
    amBidragFritaget: false,
  };
}

test('befordringsfradrag anvender daglige 2026-grænser', () => {
  assert.equal(calculateBefordringsfradrag(2026, 24), 0);
  assert.equal(calculateBefordringsfradrag(2026, 25), 3);
  assert.equal(calculateBefordringsfradrag(2026, 121), 306);
});

test('20.000 km-grænsen opgøres pr. hvervgiver', () => {
  const sammeHvervgiver = calculateAaretsKoerselsfradrag(2026, [
    carJob('1', 'Kunde A', 20_000),
    carJob('2', 'Kunde A', 1),
  ]);
  assert.equal(sammeHvervgiver.rubrik29, 78_802);

  const forskelligeHvervgivere = calculateAaretsKoerselsfradrag(2026, [
    carJob('1', 'Kunde A', 20_000),
    carJob('2', 'Kunde B', 1),
  ]);
  assert.equal(forskelligeHvervgivere.rubrik29, 78_804);
});

test('aflyste jobs indgår ikke', () => {
  assert.deepEqual(
    calculateAaretsKoerselsfradrag(2026, [{ ...carJob('1', 'Kunde', 100), status: 'AFLYST' }]),
    { rubrik29: 0, rubrik51: 0 },
  );
});
