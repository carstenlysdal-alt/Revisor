import assert from 'node:assert/strict';
import test from 'node:test';
import type { Job } from '../src/types';
import { createGoogleCalendarUrl, createIcsContent } from '../src/utils/calendarExport';

const job: Job = {
  id: 'job;1', indkomstAarId: 'aar-2026', hvervgiver: 'Kunde, A', honorar: 1000,
  startDato: '2026-09-12', slutDato: '2026-09-12', betalingsDato: '2026-09-20',
  transportmiddel: 'NONE', antalKm: 0, antalTure: 0, koerselsFradrag: 0,
  amBidragFritaget: false,
};

test('kalenderlinks bruger eksklusiv slutdato dagen efter', () => {
  const url = new URL(createGoogleCalendarUrl(job));
  assert.equal(url.searchParams.get('dates'), '20260912/20260913');
});

test('ICS undslipper tekst og bruger eksklusiv slutdato', () => {
  const ics = createIcsContent(job, new Date('2026-09-12T10:00:00Z'));
  assert.match(ics, /DTEND;VALUE=DATE:20260913/);
  assert.match(ics, /SUMMARY:Honorarjob - Kunde\\, A/);
  assert.match(ics, /UID:job-job\\;1@revisor-ai\.local/);
});
