import { describe, it, expect } from 'vitest';
import { rensFelt, rensProsa, fjernOmsluttendeAnfoerselstegn } from './rens';

describe('rensFelt', () => {
  it('fjerner fed skrift fra et hvervgivernavn', () => {
    expect(rensFelt('**Musikhuset Aarhus**')).toBe('Musikhuset Aarhus');
  });

  it('fjerner anførselstegn, der pakker hele feltet ind', () => {
    expect(rensFelt('"Parkering ved spillested"')).toBe('Parkering ved spillested');
    expect(rensFelt('“Vega Musikhus”')).toBe('Vega Musikhus');
  });

  it('lader citater midt i en sætning stå', () => {
    const tekst = 'Aftalen kalder det en "engagementsaftale" i teksten';
    expect(rensFelt(tekst)).toBe(tekst);
  });

  it('fjerner markdown-links, men beholder teksten', () => {
    expect(rensFelt('[Vega](https://vega.dk)')).toBe('Vega');
  });

  it('fjerner html', () => {
    expect(rensFelt('<b>Kolding Teater</b>')).toBe('Kolding Teater');
  });

  it('klarer manglende og forkerte værdier uden at kaste', () => {
    expect(rensFelt(null)).toBe('');
    expect(rensFelt(undefined)).toBe('');
    expect(rensFelt(42)).toBe('');
  });
});

describe('rensProsa', () => {
  it('beholder markdown, fordi prosa renderes som markdown', () => {
    expect(rensProsa('Husk **rubrik 29**')).toBe('Husk **rubrik 29**');
  });

  it('fjerner den omsluttende citation om hele svaret', () => {
    expect(rensProsa('"Fradraget hører til i rubrik 29."')).toBe(
      'Fradraget hører til i rubrik 29.'
    );
  });
});

describe('fjernOmsluttendeAnfoerselstegn', () => {
  it('rører ikke tekst uden anførselstegn', () => {
    expect(fjernOmsluttendeAnfoerselstegn('Broafgift')).toBe('Broafgift');
  });

  it('fjerner ikke, når kun den ene ende har et tegn', () => {
    expect(fjernOmsluttendeAnfoerselstegn('"Broafgift')).toBe('"Broafgift');
  });
});
