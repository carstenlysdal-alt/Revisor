import { describe, expect, it } from 'vitest';
import { dato, talFraFelt } from './format';

describe('talFraFelt', () => {
  it('håndterer tomme eller ugyldige strenge som 0', () => {
    expect(talFraFelt('')).toBe(0);
    expect(talFraFelt('   ')).toBe(0);
    expect(talFraFelt('abc')).toBe(0);
  });

  it('håndterer almindelige heltal', () => {
    expect(talFraFelt('100')).toBe(100);
    expect(talFraFelt('260')).toBe(260);
  });

  it('håndterer decimaltal med komma', () => {
    expect(talFraFelt('12,5')).toBe(12.5);
    expect(talFraFelt('41,4')).toBe(41.4);
    expect(talFraFelt('0,5')).toBe(0.5);
  });

  it('håndterer decimaltal med punktum uden at fjerne decimalen', () => {
    expect(talFraFelt('12.5')).toBe(12.5);
    expect(talFraFelt('41.4')).toBe(41.4);
    expect(talFraFelt('0.5')).toBe(0.5);
  });

  it('håndterer danske tusindtalsseparatorer med punktum', () => {
    expect(talFraFelt('1.000')).toBe(1000);
    expect(talFraFelt('25.000')).toBe(25000);
    expect(talFraFelt('1.250,50')).toBe(1250.5);
  });
});

describe('dato', () => {
  it('viser en ren dato på dansk form', () => {
    expect(dato('2026-09-06')).toBe('06.09.2026');
  });

  it('klipper et tidsstempel ned til datoen', () => {
    // Bilag gemmes med et fuldt ISO-tidsstempel. Uden nedklipningen blev
    // dagen til "06T15:18:25.275Z" i bilagsarkivet.
    expect(dato('2026-09-06T15:18:25.275Z')).toBe('06.09.2026');
  });

  it('giver tom streng for ingenting', () => {
    expect(dato(null)).toBe('');
    expect(dato(undefined)).toBe('');
    expect(dato('')).toBe('');
  });

  it('lader en uforståelig værdi stå, frem for at finde på', () => {
    expect(dato('i går')).toBe('i går');
  });
});
