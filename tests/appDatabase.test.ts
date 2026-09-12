import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppData } from '../src/utils/appDatabase';
import { isAppData } from '../src/utils/appDatabase';
import { mergeYearData } from '../src/utils/yearArchive';

const validData: AppData = {
  activeAarId: 'aar-2026',
  indkomstAarList: [{
    id: 'aar-2026', aar: 2026, hjemmeadresse: '', kommune: 'København',
    kommuneSkatteprocent: 23.5, kirkeskatteprocent: 0.8,
    forventetAIndkomst: 0, forventetPensionSUDagpenge: 0,
    forventedeFradragAIndkomst: 0, medlemFolkekirken: false,
    enligForsoerger: false, laast: false,
  }],
  jobs: [],
  fradragList: [],
  investeringer: [],
  opsparinger: {},
};

test('accepterer et gyldigt databaseøjebliksbillede', () => {
  assert.equal(isAppData(validData), true);
});

test('afviser ukendt indkomstår og manglende aktivt år', () => {
  assert.equal(isAppData({ ...validData, indkomstAarList: [{ ...validData.indkomstAarList[0], aar: 2027 }] }), false);
  assert.equal(isAppData({ ...validData, activeAarId: 'findes-ikke' }), false);
});

test('afviser fradragsprocenter uden for intervallet', () => {
  assert.equal(isAppData({
    ...validData,
    fradragList: [{
      id: 'f-1', indkomstAarId: 'aar-2026', beskrivelse: 'Udgift', typeKategori: 'Andet',
      fakturaDato: '2026-01-01', fakturaBeloeb: 100, fradragsProcent: 101, fradragIDKK: 101,
    }],
  }), false);
});

test('gendanner kun det valgte år og bevarer de øvrige år', () => {
  const year2025 = { ...validData.indkomstAarList[0]!, id: 'lokal-2025', aar: 2025 as const };
  const current: AppData = {
    ...validData,
    indkomstAarList: [...validData.indkomstAarList, year2025],
    jobs: [{
      id: 'job-2025-old', indkomstAarId: year2025.id, hvervgiver: 'Gammel', honorar: 1,
      startDato: '2025-01-01', slutDato: '2025-01-01', betalingsDato: '2025-01-01',
      transportmiddel: 'NONE', antalKm: 0, antalTure: 0, koerselsFradrag: 0, amBidragFritaget: false,
    }, {
      id: 'job-2026', indkomstAarId: 'aar-2026', hvervgiver: 'Bevares', honorar: 2,
      startDato: '2026-01-01', slutDato: '2026-01-01', betalingsDato: '2026-01-01',
      transportmiddel: 'NONE', antalKm: 0, antalTure: 0, koerselsFradrag: 0, amBidragFritaget: false,
    }],
  };
  const importedYearId = 'importeret-2025';
  const source: AppData = {
    ...validData,
    activeAarId: importedYearId,
    indkomstAarList: [{ ...year2025, id: importedYearId }],
    jobs: [{
      id: 'job-2025-new', indkomstAarId: importedYearId, hvervgiver: 'Ny', honorar: 3,
      startDato: '2025-02-01', slutDato: '2025-02-01', betalingsDato: '2025-02-01',
      transportmiddel: 'NONE', antalKm: 0, antalTure: 0, koerselsFradrag: 0, amBidragFritaget: false,
    }],
  };

  const restored = mergeYearData(current, source, importedYearId);

  assert.equal(restored.activeAarId, year2025.id);
  assert.deepEqual(restored.jobs.map((job) => [job.id, job.indkomstAarId]), [
    ['job-2026', 'aar-2026'],
    ['job-2025-new', year2025.id],
  ]);
  assert.equal(restored.indkomstAarList.filter((year) => year.aar === 2025).length, 1);
});
