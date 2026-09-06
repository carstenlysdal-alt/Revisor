/**
 * Websøgning til revisor-chatten.
 *
 * Ingen af udbyderne får lov at svare på et regelspørgsmål efter hukommelsen.
 * Enten står svaret i den deterministiske beregning, eller også slås det op
 * her, med kilde.
 *
 * Efter chatmodul-standarden: billigste niveau som standard, og altid en
 * fallback, hvis den primære udbyder mangler en nøgle eller fejler. Giver
 * søgningen ingenting, skal assistenten sige det ligeud, og det står i
 * systemprompten.
 */

export interface Kilde {
  titel: string;
  url: string;
  uddrag: string;
}

/** Kun officielle kilder. En skattesats fra et tilfældigt blog er værdiløs. */
const DOMAENER = ['skat.dk', 'retsinformation.dk', 'skm.dk'];

const MAKS_RESULTATER = 4;

const forkort = (tekst: string, tegn = 700) =>
  tekst.replace(/\s+/g, ' ').trim().slice(0, tegn);

async function soegTavily(spoergsmaal: string): Promise<Kilde[]> {
  const svar = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: spoergsmaal,
      // Basic er det billigste niveau. Chat-opslag er et hurtigt tjek,
      // ikke en agentisk researchopgave.
      search_depth: 'basic',
      max_results: MAKS_RESULTATER,
      include_domains: DOMAENER,
    }),
  });

  if (!svar.ok) throw new Error(`Tavily svarede ${svar.status}`);

  const data = (await svar.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };

  return (data.results ?? []).map((r) => ({
    titel: r.title ?? r.url ?? '',
    url: r.url ?? '',
    uddrag: forkort(r.content ?? ''),
  }));
}

/** Fallback uden nøgle. Ikke elegant, men bedre end at lade modellen gætte. */
async function soegDuckDuckGo(spoergsmaal: string): Promise<Kilde[]> {
  const forespoergsel = `${spoergsmaal} ${DOMAENER.map((d) => `site:${d}`).join(' OR ')}`;
  const svar = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(forespoergsel)}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RevisorAI/1.0)' } }
  );

  if (!svar.ok) throw new Error(`DuckDuckGo svarede ${svar.status}`);

  const html = await svar.text();
  const kilder: Kilde[] = [];
  const moenster =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  let fund: RegExpExecArray | null;
  while ((fund = moenster.exec(html)) && kilder.length < MAKS_RESULTATER) {
    const url = decodeURIComponent(
      (fund[1].match(/uddg=([^&]+)/)?.[1] ?? fund[1]) as string
    );
    if (!DOMAENER.some((d) => url.includes(d))) continue;
    kilder.push({
      titel: forkort(fund[2].replace(/<[^>]*>/g, ''), 160),
      url,
      uddrag: forkort(fund[3].replace(/<[^>]*>/g, '')),
    });
  }

  return kilder;
}

/**
 * Slår op og returnerer kilder. Kaster aldrig: en fejlet søgning må ikke
 * vælte chatten, men den må heller ikke se ud som om der blev fundet noget.
 * En tom liste betyder tom liste, og systemprompten siger, hvad modellen så
 * skal svare.
 */
export async function soeg(spoergsmaal: string): Promise<Kilde[]> {
  const udbydere: [string, () => Promise<Kilde[]>][] = [];
  if (process.env.TAVILY_API_KEY) udbydere.push(['Tavily', () => soegTavily(spoergsmaal)]);
  udbydere.push(['DuckDuckGo', () => soegDuckDuckGo(spoergsmaal)]);

  for (const [navn, kør] of udbydere) {
    try {
      const kilder = await kør();
      if (kilder.length > 0) return kilder;
    } catch (err) {
      console.warn(`Søgning via ${navn} fejlede:`, err);
    }
  }

  return [];
}
