import { describe, expect, it } from 'vitest';
import { talFraFelt } from './format';

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
