/**
 * Ruteberegning via OpenRouteService — EU-baseret, gratis niveau (2.500
 * kald/dag, 40.000/måned), intet betalingskort. Bruges kun til at FORESLÅ en
 * afstand ved siden af km-feltet; brugeren kan altid rette eller ignorere
 * forslaget og taste selv, som hidtil.
 *
 * Geocoding er Pelias-baseret og returnerer en almindelig GeoJSON
 * FeatureCollection. Directions bruges i sin simple GET-form til et enkelt
 * start-slut-par, hvilket er alt appen har brug for her.
 */

const BASIS_URL = 'https://api.openrouteservice.org';

export class OpenRouteServiceFejl extends Error {
  constructor(
    message: string,
    public readonly kode: 'MANGLER_NOEGLE' | 'IKKE_GEOKODET' | 'TJENESTE_FEJL'
  ) {
    super(message);
    this.name = 'OpenRouteServiceFejl';
  }
}

export function harOpenRouteServiceNoegle(): boolean {
  return Boolean(process.env.OPENROUTESERVICE_API_KEY);
}

export interface Koordinat {
  lon: number;
  lat: number;
  adresse?: string;
}

export type Placering = Koordinat;

async function kald(sti: string): Promise<Response> {
  const noegle = process.env.OPENROUTESERVICE_API_KEY;
  if (!noegle) {
    throw new OpenRouteServiceFejl(
      'Der er ikke sat en OpenRouteService-nøgle på serveren.',
      'MANGLER_NOEGLE'
    );
  }

  let svar: Response;
  try {
    svar = await fetch(`${BASIS_URL}${sti}`, {
      headers: { Authorization: noegle },
    });
  } catch {
    throw new OpenRouteServiceFejl(
      'Der er ikke forbindelse til OpenRouteService. Prøv igen om lidt.',
      'TJENESTE_FEJL'
    );
  }

  if (!svar.ok) {
    throw new OpenRouteServiceFejl(
      `OpenRouteService svarede med fejl ${svar.status}.`,
      'TJENESTE_FEJL'
    );
  }

  return svar;
}

/**
 * Slår en adresse op via OpenRouteService.
 * Returnerer null, hvis adressen ikke kan genkendes.
 */
export async function geokod(adresse: string): Promise<Koordinat | null> {
  const rentAdresse = adresse.trim();
  if (!rentAdresse) return null;

  const soegning = new URLSearchParams({
    text: rentAdresse,
    'boundary.country': 'DK',
    size: '1',
  });

  const svar = await kald(`/geocode/search?${soegning.toString()}`);
  const data = (await svar.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { label?: string };
    }[];
  };

  const feat = data.features?.[0];
  const koordinat = feat?.geometry?.coordinates;
  if (!koordinat) return null;

  return { lon: koordinat[0], lat: koordinat[1], adresse: feat.properties?.label };
}

/**
 * Slår en adresse op via DAWA (Danmarks Adressers Web API).
 * Gratis, offentlig dansk tjeneste uden krav om API-nøgle.
 */
export async function geokodDawa(adresse: string): Promise<Placering | null> {
  const rent = adresse.trim();
  if (!rent) return null;

  try {
    const res = await fetch(
      `https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(rent)}&per_side=1`
    );
    if (res && res.ok) {
      const data = (await res.json()) as {
        adressebetegnelse?: string;
        adgangsadresse?: { adgangspunkt?: { koordinater?: [number, number] } };
      }[];
      const coords = data?.[0]?.adgangsadresse?.adgangspunkt?.koordinater;
      if (coords && coords.length === 2) {
        return { lon: coords[0], lat: coords[1], adresse: data[0].adressebetegnelse };
      }
    }

    const adgRes = await fetch(
      `https://api.dataforsyningen.dk/adgangsadresser?q=${encodeURIComponent(rent)}&per_side=1`
    );
    if (adgRes && adgRes.ok) {
      const adgData = (await adgRes.json()) as {
        adressebetegnelse?: string;
        adgangspunkt?: { koordinater?: [number, number] };
      }[];
      const coords = adgData?.[0]?.adgangspunkt?.koordinater;
      if (coords && coords.length === 2) {
        return { lon: coords[0], lat: coords[1], adresse: adgData[0].adressebetegnelse };
      }
    }
  } catch {
    // Ignorer og gå videre
  }

  return null;
}

/**
 * Slår spillesteder, biblioteker og lokationer op via OpenStreetMap Nominatim.
 */
export async function geokodOsm(adresse: string): Promise<Placering | null> {
  const rent = adresse.trim();
  if (!rent) return null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=dk&limit=1&q=${encodeURIComponent(rent)}`,
      {
        headers: {
          'User-Agent': 'RevisorApp/1.0 (https://revis.up.railway.app)',
        },
      }
    );
    if (res && res.ok) {
      const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
      if (data?.[0]?.lat && data[0]?.lon) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          adresse: data[0].display_name,
        };
      }
    }
  } catch {
    // Ignorer
  }

  return null;
}

/**
 * Finder koordinater og adresse for enten en gadeadresse eller et stednavn
 * (f.eks. "Kolding Bibliotek", "Vega", "Vestergade 10, Aarhus").
 */
export async function findAdresse(adresse: string): Promise<Placering | null> {
  const rent = adresse.trim();
  if (!rent) return null;

  if (harOpenRouteServiceNoegle()) {
    try {
      const g = await geokod(rent);
      if (g) return g;
    } catch (err) {
      if (!(err instanceof OpenRouteServiceFejl && err.kode === 'MANGLER_NOEGLE')) {
        // Ved andre ORS-fejl lader vi den fortsætte til DAWA/OSM
      }
    }
  }

  const dawa = await geokodDawa(rent);
  if (dawa) return dawa;

  const osm = await geokodOsm(rent);
  if (osm) return osm;

  return null;
}

/** Haversine fugleflugt med 1.28 dansk vejnet-faktor. */
export function haversineAfstandKm(fra: Koordinat, til: Koordinat): number {
  const R = 6371;
  const dLat = ((til.lat - fra.lat) * Math.PI) / 180;
  const dLon = ((til.lon - fra.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fra.lat * Math.PI) / 180) *
      Math.cos((til.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.28 * 10) / 10;
}

/** Køreafstand i kilometer mellem to koordinater via OpenRouteService. */
export async function beregnAfstandKm(fra: Koordinat, til: Koordinat): Promise<number> {
  const parametre = new URLSearchParams({
    start: `${fra.lon},${fra.lat}`,
    end: `${til.lon},${til.lat}`,
  });

  const svar = await kald(`/v2/directions/driving-car?${parametre.toString()}`);
  const data = (await svar.json()) as {
    routes?: { summary?: { distance?: number } }[];
  };

  const meter = data.routes?.[0]?.summary?.distance;
  if (typeof meter !== 'number') {
    throw new OpenRouteServiceFejl('Ruten kunne ikke beregnes mellem de to adresser.', 'TJENESTE_FEJL');
  }

  return Math.round((meter / 1000) * 10) / 10;
}

export interface RuteValg {
  mellemstationer?: string[];
  turRetur?: boolean;
}

export interface RuteResultat {
  km: number;
  enkeltTurKm: number;
  turRetur: boolean;
  fundetAdresse?: string;
  fraAdresse?: string;
  mellemstationer?: string[];
}

export interface AdresseForslag {
  tekst: string;
  type: 'adresse' | 'sted';
}

/**
 * Søger efter adresser og spillesteder/stednavne i Danmark via DAWA og OSM.
 */
export async function soegAdresse(q: string): Promise<AdresseForslag[]> {
  const soeg = q.trim();
  if (soeg.length < 2) return [];
  const forslag: AdresseForslag[] = [];
  const set = new Set<string>();

  // 1. DAWA autocomplete (officielle adresser i Danmark)
  try {
    const res = await fetch(
      `https://api.dataforsyningen.dk/autocomplete?q=${encodeURIComponent(soeg)}&per_side=5`
    );
    if (res && res.ok) {
      const data = (await res.json()) as { forslagstekst?: string; tekst?: string }[];
      for (const item of data) {
        const t = (item.forslagstekst || item.tekst || '').trim();
        if (t && !set.has(t)) {
          set.add(t);
          forslag.push({ tekst: t, type: 'adresse' });
        }
      }
    }
  } catch {
    // Ignorer netværksfejl
  }

  // 2. OpenStreetMap Nominatim (spillesteder, kulturinstitutioner mv.)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=dk&limit=5&q=${encodeURIComponent(soeg)}`,
      {
        headers: {
          'User-Agent': 'RevisorApp/1.0 (https://revis.up.railway.app)',
        },
      }
    );
    if (res && res.ok) {
      const data = (await res.json()) as { display_name?: string }[];
      for (const item of data) {
        const t = (item.display_name || '').trim();
        if (t && !set.has(t)) {
          set.add(t);
          forslag.push({ tekst: t, type: 'sted' });
        }
      }
    }
  } catch {
    // Ignorer netværksfejl
  }

  return forslag.slice(0, 8);
}

/**
 * Beregner køreafstand med OSRM som primær/fallback kørerute,
 * og Haversine som fejlsikker backup.
 */
export async function beregnRuteKm(fra: Koordinat, til: Koordinat): Promise<number> {
  if (harOpenRouteServiceNoegle()) {
    try {
      return await beregnAfstandKm(fra, til);
    } catch {
      // Falder tilbage til OSRM
    }
  }

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fra.lon},${fra.lat};${til.lon},${til.lat}?overview=false`
    );
    if (res && res.ok) {
      const data = (await res.json()) as { routes?: { distance?: number }[] };
      const meter = data?.routes?.[0]?.distance;
      if (typeof meter === 'number') {
        return Math.round((meter / 1000) * 10) / 10;
      }
    }
  } catch {
    // Ignorer
  }

  return haversineAfstandKm(fra, til);
}

/**
 * Beregner køreafstand for en rute gennem flere punkter i rækkefølge
 * (f.eks. start -> mellemstationer -> destination [-> retur til start]).
 */
export async function beregnRuteKmFlere(punkter: Koordinat[]): Promise<number> {
  if (punkter.length < 2) return 0;
  if (punkter.length === 2) return beregnRuteKm(punkter[0], punkter[1]);

  try {
    const coordsStr = punkter.map((p) => `${p.lon},${p.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false`
    );
    if (res && res.ok) {
      const data = (await res.json()) as { routes?: { distance?: number }[] };
      const meter = data?.routes?.[0]?.distance;
      if (typeof meter === 'number') {
        return Math.round((meter / 1000) * 10) / 10;
      }
    }
  } catch {
    // Falder tilbage til sum af enkeltstrækninger
  }

  let total = 0;
  for (let i = 0; i < punkter.length - 1; i++) {
    total += await beregnRuteKm(punkter[i], punkter[i + 1]);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Slår bopæl, destination og eventuelle mellemstationer op.
 * Som standard beregnes ruten som TUR/RETUR (turRetur = true).
 */
export async function beregnRuteDetaljer(
  hjemmeadresse: string,
  destinationAdresse: string,
  options?: RuteValg
): Promise<RuteResultat> {
  const turRetur = options?.turRetur ?? true;
  const [fra, til] = await Promise.all([findAdresse(hjemmeadresse), findAdresse(destinationAdresse)]);

  if (!fra) {
    throw new OpenRouteServiceFejl(
      `Hjemmeadressen "${hjemmeadresse}" kunne ikke genkendes.`,
      'IKKE_GEOKODET'
    );
  }
  if (!til) {
    throw new OpenRouteServiceFejl(
      `Adressen "${destinationAdresse}" kunne ikke genkendes.`,
      'IKKE_GEOKODET'
    );
  }

  const raaMellem = (options?.mellemstationer ?? []).map((s) => s.trim()).filter(Boolean);
  const mellemPunkter: Placering[] = [];
  for (const s of raaMellem) {
    const p = await findAdresse(s);
    if (!p) {
      throw new OpenRouteServiceFejl(
        `Mellemstationen "${s}" kunne ikke genkendes.`,
        'IKKE_GEOKODET'
      );
    }
    mellemPunkter.push(p);
  }

  const udturPunkter = [fra, ...mellemPunkter, til];
  const enkeltTurKm = await beregnRuteKmFlere(udturPunkter);

  let samletKm = enkeltTurKm;
  if (turRetur) {
    if (mellemPunkter.length > 0) {
      // Hjem -> Mellemstationer -> Destination -> Mellemstationer (omvendt) -> Hjem
      const returPunkter = [...mellemPunkter].reverse();
      const heleRuten = [...udturPunkter, ...returPunkter, fra];
      samletKm = await beregnRuteKmFlere(heleRuten);
    } else {
      // Direkte tur/retur: præcist dobbelt eller kørsel begge veje
      const returRute = [til, fra];
      const hjemturKm = await beregnRuteKmFlere(returRute);
      samletKm = Math.round((enkeltTurKm + hjemturKm) * 10) / 10;
    }
  }

  return {
    km: samletKm,
    enkeltTurKm,
    turRetur,
    fundetAdresse: til.adresse || destinationAdresse,
    fraAdresse: fra.adresse || hjemmeadresse,
    mellemstationer: mellemPunkter.map((m, idx) => m.adresse || raaMellem[idx]),
  };
}

/**
 * Slår begge adresser op og beregner afstanden imellem dem.
 * For bagudkompatibilitet med eksisterende tests returneres her enkelt-tur (turRetur = false).
 */
export async function beregnAfstandMellemAdresser(
  hjemmeadresse: string,
  destinationAdresse: string
): Promise<number> {
  const rute = await beregnRuteDetaljer(hjemmeadresse, destinationAdresse, { turRetur: false });
  return rute.km;
}
