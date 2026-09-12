import { describe, expect, it } from 'vitest';
import { KOMMUNENAVNE, erKommuneBekraeftet, getKommuneSatser } from './kommuner';

describe('kommunale skattesatser', () => {
  it('har én entydig post for hver af Danmarks 98 kommuner', () => {
    expect(KOMMUNENAVNE).toHaveLength(98);
    expect(new Set(KOMMUNENAVNE).size).toBe(98);
  });

  it.each([2025, 2026])('har kommune- og kirkeskat for alle kommuner i %s', (aar) => {
    for (const kommune of KOMMUNENAVNE) {
      const satser = getKommuneSatser(kommune, aar);
      expect(satser.kommuneskat, `${kommune} mangler kommuneskat`).not.toBeNull();
      expect(satser.kirkeskat, `${kommune} mangler kirkeskat`).not.toBeNull();
      expect(erKommuneBekraeftet(kommune, aar)).toBe(true);
    }
  });

  it('holder ændrede satser adskilt mellem årene', () => {
    expect(getKommuneSatser('København', 2025)).toEqual({
      kommuneskat: 23.5,
      kirkeskat: 0.8,
    });
    expect(getKommuneSatser('København', 2026)).toEqual({
      kommuneskat: 23.39,
      kirkeskat: 0.8,
    });
    expect(getKommuneSatser('Gentofte', 2025)).toEqual({
      kommuneskat: 24.24,
      kirkeskat: 0.39,
    });
    expect(getKommuneSatser('Gentofte', 2026)).toEqual({
      kommuneskat: 24.14,
      kirkeskat: 0.38,
    });
  });

  it('returnerer tomme satser for et år uden officielle data', () => {
    expect(getKommuneSatser('København', 2027)).toEqual({
      kommuneskat: null,
      kirkeskat: null,
    });
  });
});
