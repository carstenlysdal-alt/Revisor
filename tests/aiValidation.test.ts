import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiExtractionResult } from '../src/types';
import { getAiSuggestionYear, isCompleteAiSuggestion } from '../src/utils/aiValidation';

const base = { confidence: 0.8, summary: 'Forslag', revisorNotat: 'Kontrollér.' };

test('afviser UNKNOWN og ufuldstændige økonomiske forslag', () => {
  assert.equal(isCompleteAiSuggestion({ ...base, classification: 'UNKNOWN' }), false);
  assert.equal(isCompleteAiSuggestion({ ...base, classification: 'JOB', job: { hvervgiver: 'Kunde', honorar: 0, startDato: '2026-01-01' } }), false);
});

test('accepterer et redigeret fradragsforslag med 0 procent', () => {
  const result: AiExtractionResult = {
    ...base,
    classification: 'FRADRAG',
    fradrag: { beskrivelse: 'Privat andel', fakturaBeloeb: 100, fradragsProcent: 0 },
  };
  assert.equal(isCompleteAiSuggestion(result), true);
});

test('finder indkomståret fra datoen i agentens placering', () => {
  assert.equal(getAiSuggestionYear({
    ...base,
    classification: 'JOB',
    job: { startDato: '2025-11-14' },
  }), 2025);
  assert.equal(getAiSuggestionYear({
    ...base,
    classification: 'FRADRAG',
    fradrag: { fakturaDato: 'ukendt' },
  }), undefined);
});
