import { describe, it, expect } from 'vitest';
import { byggIcs, createGoogleCalendarUrl } from './calendarExport';
import type { Job } from '../types';

const job: Job = {
  id: 'job-1',
  indkomstAarId: 'aar-2026',
  hvervgiver: 'Vega Musikhus',
  honorar: 12_500,
  startDato: '2026-03-14',
  slutDato: '2026-03-14',
  betalingsDato: '2026-03-31',
  transportmiddel: 'OWN_CAR_MC',
  antalKm: 28,
  antalTure: 2,
  amBidragFritaget: false,
  bilagIds: [],
};

describe('kalendereksport', () => {
  it('lader en endagsbegivenhed slutte dagen efter, så den ikke bliver nul lang', () => {
    const ics = byggIcs(job);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260314');
    expect(ics).toContain('DTEND;VALUE=DATE:20260315');
  });

  it('håndterer månedsskifte i slutdatoen', () => {
    const ics = byggIcs({ ...job, startDato: '2026-03-31', slutDato: '2026-03-31' });
    expect(ics).toContain('DTEND;VALUE=DATE:20260401');
  });

  it('lægger en påmindelse dagen før ind', () => {
    expect(byggIcs(job)).toContain('TRIGGER:-P1D');
  });

  it('escaper komma og semikolon i tekstfelter', () => {
    const ics = byggIcs({ ...job, hvervgiver: 'Vega, Store Sal; aften' });
    expect(ics).toContain('SUMMARY:Honorarjob: Vega\\, Store Sal\; aften');
  });

  it('skriver opsparingsbeløbet ind, når marginalskatten er kendt', () => {
    expect(byggIcs(job, 40)).toContain('5.000 kr. til side');
  });

  it('bruger samme slutdato i Google-linket', () => {
    expect(createGoogleCalendarUrl(job)).toContain('dates=20260314%2F20260315');
  });
});
