import { describe, expect, it } from 'vitest';
import type { IndkomstAar } from '../types';
import { findIndkomstAarTilKladde } from './posteringKladde';

const aar = (id: string, tal: number): IndkomstAar => ({
  id,
  aar: tal,
  hjemmeadresse: '',
  kommune: '',
  kommuneSkatteprocent: 0,
  kirkeskatteprocent: 0,
  forventetAIndkomst: 0,
  forventetPensionSUDagpenge: 0,
  forventedeFradragAIndkomst: 0,
  medlemFolkekirken: false,
  enligForsoerger: false,
  laast: false,
});

describe('findIndkomstAarTilKladde', () => {
  const liste = [aar('2025', 2025), aar('2026', 2026)];

  it('bruger arbejdsåret for honorarjobs', () => {
    expect(findIndkomstAarTilKladde('JOB', { startDato: '2025-12-18' }, liste, '2026')).toBe(
      '2025'
    );
  });

  it('bruger fakturaåret for fradrag og falder sikkert tilbage uden et kendt år', () => {
    expect(
      findIndkomstAarTilKladde('FRADRAG', { fakturaDato: '2025-01-02' }, liste, '2026')
    ).toBe('2025');
    expect(
      findIndkomstAarTilKladde('INVESTERING', { fakturaDato: '2024-01-02' }, liste, '2026')
    ).toBe('2026');
  });
});
