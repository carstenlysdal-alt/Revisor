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

interface Koordinat {
  lon: number;
  lat: number;
}

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
 * Slår en adresse op og returnerer koordinatet for det bedste match.
 * Returnerer null, hvis adressen ikke kan genkendes — det er ikke en fejl,
 * bare et manglende svar, som brugeren selv skal håndtere.
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
    features?: { geometry?: { coordinates?: [number, number] } }[];
  };

  const koordinat = data.features?.[0]?.geometry?.coordinates;
  if (!koordinat) return null;

  return { lon: koordinat[0], lat: koordinat[1] };
}

/** Køreafstand i kilometer mellem to koordinater, profil driving-car. */
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

/**
 * Slår begge adresser op og beregner afstanden imellem dem i én omgang.
 * Kaster OpenRouteServiceFejl med kode IKKE_GEOKODET og hvilken adresse der
 * fejlede, så brugerfladen kan pege på det rigtige felt.
 */
export async function beregnAfstandMellemAdresser(
  hjemmeadresse: string,
  destinationAdresse: string
): Promise<number> {
  const [fra, til] = await Promise.all([geokod(hjemmeadresse), geokod(destinationAdresse)]);

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

  return beregnAfstandKm(fra, til);
}
