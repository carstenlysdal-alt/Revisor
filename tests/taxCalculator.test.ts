import assert from 'node:assert/strict';
import test from 'node:test';
import type { Fradrag, IndkomstAar, Job } from '../src/types';
import { calculateDanishTaxes } from '../src/utils/taxCalculator';

function year(overrides: Partial<IndkomstAar> = {}): IndkomstAar {
  return {
    id: 'aar-2026', aar: 2026, hjemmeadresse: '', kommune: 'København',
    kommuneSkatteprocent: 23.5, kirkeskatteprocent: 0.8,
    forventetAIndkomst: 0, forventetPensionSUDagpenge: 0,
    forventedeFradragAIndkomst: 0, medlemFolkekirken: false,
    enligForsoerger: false, laast: false, ...overrides,
  };
}

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1', indkomstAarId: 'aar-2026', hvervgiver: 'Kunde', honorar: 100_000,
    startDato: '2026-01-01', slutDato: '2026-01-01', betalingsDato: '2026-01-15',
    transportmiddel: 'NONE', antalKm: 0, antalTure: 0, koerselsFradrag: 0,
    amBidragFritaget: false, rubrik: 12, status: 'BETALT', ...overrides,
  };
}

test('holder rubrik 12 og 17 adskilt og ser bort fra aflyste jobs', () => {
  const result = calculateDanishTaxes(year(), [
    job(),
    job({ id: 'job-2', honorar: 20_000, rubrik: 17 }),
    job({ id: 'job-3', honorar: 99_000, status: 'AFLYST' }),
  ], []);
  assert.equal(result.honorarerAlt, 100_000);
  assert.equal(result.rubrik17Indkomst, 20_000);
  assert.equal(result.amBidrag, 9_600);
});

test('uudnyttede A-fradrag reducerer den skattepligtige del af B-indkomsten', () => {
  const result = calculateDanishTaxes(
    year({ forventedeFradragAIndkomst: 70_000 }),
    [job({ honorar: 100_000, amBidragFritaget: true })],
    [],
  );
  assert.equal(result.skattepligtigIndkomst, 30_000);
  assert.equal(result.kommuneskat, 0);
  assert.equal(result.bundskat, 5_513);
});

test('2026-progression beregnes som mer-skat for B-indkomsten', () => {
  const result = calculateDanishTaxes(
    year({ forventetAIndkomst: 800_000 }),
    [job({ honorar: 100_000 })],
    [],
  );
  assert.ok(result.mellemskat > 0);
  assert.ok(result.topskat > 0);
  assert.equal(result.toptopskat, 0);
  assert.equal(result.regelAar, 2026);
});

test('rubrik 29 begrænses til honorar efter AM-bidrag', () => {
  const fradrag: Fradrag = {
    id: 'f-1', indkomstAarId: 'aar-2026', beskrivelse: 'Dokumenteret udgift',
    typeKategori: 'Andet', fakturaDato: '2026-01-01', fakturaBeloeb: 2_000,
    fradragsProcent: 100, fradragIDKK: 2_000,
  };
  const result = calculateDanishTaxes(year(), [job({ honorar: 1_000 })], [fradrag]);
  assert.equal(result.amBidrag, 80);
  assert.equal(result.anvendtFradragRubrik29, 920);
  assert.equal(result.overskydendeFradrag, 1_080);
  assert.equal(result.rubrik29LoftOverskredet, true);
});

test('2025 og 2026 anvender forskellige progressionstrin', () => {
  const result2025 = calculateDanishTaxes(
    { ...year({ forventetAIndkomst: 700_000 }), id: 'aar-2025', aar: 2025 },
    [],
    [],
  );
  const result2026 = calculateDanishTaxes(year({ forventetAIndkomst: 700_000 }), [], []);
  assert.equal(result2025.regelAar, 2025);
  assert.equal(result2025.topskat > 0, false);
  assert.equal(result2026.mellemskat > 0, false);

  const withB2025 = calculateDanishTaxes(
    { ...year({ forventetAIndkomst: 700_000 }), id: 'aar-2025', aar: 2025 },
    [job({ indkomstAarId: 'aar-2025', honorar: 100_000 })],
    [],
  );
  assert.ok(withB2025.topskat > 0);
  assert.equal(withB2025.mellemskat, 0);
});
