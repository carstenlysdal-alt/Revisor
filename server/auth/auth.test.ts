import { describe, it, expect } from 'vitest';
import { hashKodeord, tjekKodeord } from './kodeord';
import { lavToken, tjekToken, laesCookie } from './session';

describe('kodeord', () => {
  const hash = hashKodeord('et rimeligt langt kodeord');

  it('godkender det rigtige kodeord', () => {
    expect(tjekKodeord('et rimeligt langt kodeord', hash)).toBe(true);
  });

  it('afviser et forkert kodeord', () => {
    expect(tjekKodeord('et rimeligt langt kodeorD', hash)).toBe(false);
    expect(tjekKodeord('', hash)).toBe(false);
  });

  it('giver et nyt salt hver gang, så to ens kodeord ikke får samme hash', () => {
    expect(hashKodeord('abc')).not.toBe(hashKodeord('abc'));
  });

  it('afviser et hash i et format den ikke kender', () => {
    expect(tjekKodeord('abc', 'abc')).toBe(false);
    expect(tjekKodeord('abc', 'md5$salt$hash')).toBe(false);
  });
});

describe('session', () => {
  const hemmelighed = 'en hemmelighed der er lang nok';

  it('godkender sit eget token', () => {
    expect(tjekToken(lavToken(hemmelighed), hemmelighed)).toBe(true);
  });

  it('afviser et token signeret med en anden hemmelighed', () => {
    expect(tjekToken(lavToken('en anden hemmelighed'), hemmelighed)).toBe(false);
  });

  it('afviser et token, hvor udløbstiden er pillet ved', () => {
    const token = lavToken(hemmelighed);
    const [, signatur] = token.split('.');
    const fremtid = String(Date.now() + 10_000_000);
    expect(tjekToken(`${fremtid}.${signatur}`, hemmelighed)).toBe(false);
  });

  it('afviser et udløbet token', () => {
    expect(tjekToken(lavToken(hemmelighed, -10), hemmelighed)).toBe(false);
  });

  it('afviser vrøvl', () => {
    expect(tjekToken(undefined, hemmelighed)).toBe(false);
    expect(tjekToken('', hemmelighed)).toBe(false);
    expect(tjekToken('ingen-prik', hemmelighed)).toBe(false);
  });
});

describe('cookielæsning', () => {
  it('finder den rigtige cookie blandt flere', () => {
    expect(laesCookie('a=1; revisor_session=abc; b=2', 'revisor_session')).toBe('abc');
  });

  it('forveksler ikke et navn med et suffiks af et andet', () => {
    expect(laesCookie('ikke_revisor_session=forkert', 'revisor_session')).toBeUndefined();
  });

  it('klarer en manglende header', () => {
    expect(laesCookie(undefined, 'revisor_session')).toBeUndefined();
  });
});
