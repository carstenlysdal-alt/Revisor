import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OpenRouteServiceFejl,
  beregnAfstandKm,
  beregnAfstandMellemAdresser,
  geokod,
  harOpenRouteServiceNoegle,
} from './openrouteservice';

const gammelNoegle = process.env.OPENROUTESERVICE_API_KEY;

beforeEach(() => {
  process.env.OPENROUTESERVICE_API_KEY = 'test-noegle';
});

afterEach(() => {
  process.env.OPENROUTESERVICE_API_KEY = gammelNoegle;
  vi.unstubAllGlobals();
});

const jsonSvar = (data: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => data }) as Response;

describe('harOpenRouteServiceNoegle', () => {
  it('afspejler om miljøvariablen er sat', () => {
    expect(harOpenRouteServiceNoegle()).toBe(true);
    delete process.env.OPENROUTESERVICE_API_KEY;
    expect(harOpenRouteServiceNoegle()).toBe(false);
  });
});

describe('geokod', () => {
  it('kalder søgeendpointet med adressen og et land afgrænset til Danmark', async () => {
    const kald = vi.fn().mockResolvedValue(
      jsonSvar({ features: [{ geometry: { coordinates: [12.34, 55.67] } }] })
    );
    vi.stubGlobal('fetch', kald);

    const koordinat = await geokod('Vesterbrogade 42, 1620 København V');

    expect(koordinat).toEqual({ lon: 12.34, lat: 55.67 });
    const [url, init] = kald.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/geocode/search?');
    expect(url).toContain('boundary.country=DK');
    expect(url).toContain(encodeURIComponent('Vesterbrogade 42, 1620 København V').replace(/%20/g, '+'));
    expect((init.headers as Record<string, string>).Authorization).toBe('test-noegle');
  });

  it('returnerer null ved et tomt søgeresultat, i stedet for at kaste', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonSvar({ features: [] })));
    expect(await geokod('en adresse der ikke findes')).toBeNull();
  });

  it('returnerer null for en tom streng uden at slå noget op', async () => {
    const kald = vi.fn();
    vi.stubGlobal('fetch', kald);
    expect(await geokod('   ')).toBeNull();
    expect(kald).not.toHaveBeenCalled();
  });

  it('kaster MANGLER_NOEGLE, når nøglen ikke er sat', async () => {
    delete process.env.OPENROUTESERVICE_API_KEY;
    await expect(geokod('Aarhus')).rejects.toMatchObject({ kode: 'MANGLER_NOEGLE' });
  });

  it('kaster TJENESTE_FEJL ved et ikke-ok svar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonSvar({}, false, 503)));
    await expect(geokod('Aarhus')).rejects.toBeInstanceOf(OpenRouteServiceFejl);
  });
});

describe('beregnAfstandKm', () => {
  it('omregner meter til kilometer med én decimal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonSvar({ routes: [{ summary: { distance: 41372.6 } }] }))
    );
    const km = await beregnAfstandKm({ lon: 12.5, lat: 55.6 }, { lon: 10.2, lat: 56.1 });
    expect(km).toBe(41.4);
  });

  it('kaster, hvis svaret ikke indeholder en distance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonSvar({ routes: [] })));
    await expect(
      beregnAfstandKm({ lon: 0, lat: 0 }, { lon: 1, lat: 1 })
    ).rejects.toBeInstanceOf(OpenRouteServiceFejl);
  });
});

describe('beregnAfstandMellemAdresser', () => {
  it('kaster IKKE_GEOKODET med navnet på den adresse, der ikke kunne genkendes', async () => {
    const kald = vi
      .fn()
      // Hjemmeadressen findes.
      .mockResolvedValueOnce(jsonSvar({ features: [{ geometry: { coordinates: [12, 55] } }] }))
      // Destinationen findes ikke.
      .mockResolvedValueOnce(jsonSvar({ features: [] }));
    vi.stubGlobal('fetch', kald);

    await expect(
      beregnAfstandMellemAdresser('Rigtig adresse', 'Ukendt sted')
    ).rejects.toMatchObject({
      kode: 'IKKE_GEOKODET',
      message: expect.stringContaining('Ukendt sted'),
    });
  });

  it('beregner afstanden, når begge adresser genkendes', async () => {
    const kald = vi
      .fn()
      .mockResolvedValueOnce(jsonSvar({ features: [{ geometry: { coordinates: [12, 55] } }] }))
      .mockResolvedValueOnce(jsonSvar({ features: [{ geometry: { coordinates: [10, 56] } }] }))
      .mockResolvedValueOnce(jsonSvar({ routes: [{ summary: { distance: 15000 } }] }));
    vi.stubGlobal('fetch', kald);

    const km = await beregnAfstandMellemAdresser('Hjemme', 'Spillestedet');
    expect(km).toBe(15);
    expect(kald).toHaveBeenCalledTimes(3);
  });
});
